"""Chapter 10 workbook: Putting It Together.

The whole pipeline on one dataset, one stage per function: load and clean the
table (pandas), turn it into scaled arrays (NumPy), fit a baseline
(scikit-learn), train a small model (PyTorch) and save a comparison plot
(Matplotlib). The last function runs them all in a row.

Replace every `raise NotImplementedError`, then run `pytest`. Each stage's
tests hand it correct inputs of their own, so you can write the stages in any
order. Everything runs on the CPU in a few seconds.

The data, data/oom.csv, is 400 made-up training jobs: the GPU's memory
(mem_gb), the batch_size and seq_len, and whether the job ran out of memory
(oom, "yes" or "no"). Some rows have no seq_len.
"""
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import torch
from matplotlib.figure import Figure
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from torch import nn

FEATURES = ["mem_gb", "batch_size", "seq_len"]
LABEL = "oom"


# ── Stage 1: pandas, load and clean ──────────────────────────────────────

def load_jobs(path: Path) -> pd.DataFrame:
    """Read the CSV at `path`, drop every row with a missing value, and turn
    the `oom` column into integers: 1 for "yes", 0 for "no". Return the
    cleaned DataFrame, with the same four columns."""
    jobs = pd.read_csv(path).dropna()
    jobs[LABEL] = (jobs[LABEL] == "yes").astype(int)
    return jobs


# ── Stage 2: NumPy, arrays and shapes ────────────────────────────────────

def to_arrays(jobs: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
    """Return (X, y): X the FEATURES columns, in that order, as a float32
    array of shape (n, 3); y the oom column as an int64 array of shape (n,),
    one label per row. Check the shapes with assert before you return."""
    X = jobs[FEATURES].to_numpy(dtype=np.float32)
    y = jobs[LABEL].to_numpy(dtype=np.int64)
    assert X.shape == (len(jobs), len(FEATURES)), X.shape
    assert y.shape == (len(jobs),), y.shape
    return X, y


def standardize(X_train: np.ndarray, X_test: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Scale each column to mean 0 and standard deviation 1, using the mean
    and standard deviation of the TRAINING rows for both arrays, so nothing
    about the test rows leaks in. Return (X_train_scaled, X_test_scaled),
    still float32 and the same shapes."""
    mean, std = X_train.mean(axis=0), X_train.std(axis=0)
    return (X_train - mean) / std, (X_test - mean) / std


# ── Stage 3: scikit-learn, the baseline ──────────────────────────────────

def fit_baseline(X_train: np.ndarray, y_train: np.ndarray):
    """Fit a baseline classifier, such as LogisticRegression, on the training
    rows and return the fitted estimator (not its score). The tests want at
    least 80% accuracy on held-out rows."""
    return LogisticRegression().fit(X_train, y_train)


# ── Stage 4: PyTorch, a small model ──────────────────────────────────────

def train_model(X_train: np.ndarray, y_train: np.ndarray) -> nn.Module:
    """Train a small classifier on the training rows (float32 X of shape
    (n, 3), int64 y of shape (n,)) and return it: 3 features in, 2 raw scores
    out, with a hidden layer and a ReLU.

    Seed it first, with torch.manual_seed, so two calls return the same model.
    The tests want at least 93% accuracy on held-out rows, in under 15 s.
    """
    torch.manual_seed(0)
    X, y = torch.from_numpy(X_train), torch.from_numpy(y_train)
    model = nn.Sequential(nn.Linear(3, 16), nn.ReLU(), nn.Linear(16, 2))
    loss_fn = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=0.05)
    model.train()
    for _ in range(300):  # a few hundred rows: every epoch is one full batch
        optimizer.zero_grad()
        loss = loss_fn(model(X), y)
        loss.backward()
        optimizer.step()
    return model.eval()


# ── Stage 5: Matplotlib, the comparison ──────────────────────────────────

def plot_scores(scores: dict[str, float], out_path: Path) -> Figure:
    """Draw a bar chart with one bar per entry of `scores` (name → accuracy),
    in the dict's order, named by its key; label the accuracy axis; save the
    figure as a PNG to `out_path`, and return the Figure."""
    fig, ax = plt.subplots(figsize=(5, 3), layout="constrained")
    bars = ax.bar(list(scores), list(scores.values()))
    ax.bar_label(bars, fmt="%.3f")
    ax.set_ylim(0, 1.1)
    ax.set_ylabel("test accuracy")
    ax.set_title("Baseline vs model")
    fig.savefig(out_path)
    return fig


# ── All together ─────────────────────────────────────────────────────────

def run_pipeline(csv_path: Path, plot_path: Path) -> dict[str, float]:
    """Run every stage in order on the CSV at `csv_path`: load_jobs,
    to_arrays, then train_test_split(X, y, test_size=0.25, random_state=0),
    standardize, fit_baseline and train_model on the training rows. Score both
    on the test rows, save plot_scores to `plot_path`, and return
    {"baseline": its accuracy, "model": its accuracy}, as plain floats."""
    X, y = to_arrays(load_jobs(csv_path))
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=0)
    X_train, X_test = standardize(X_train, X_test)
    baseline = fit_baseline(X_train, y_train)
    model = train_model(X_train, y_train)
    model.eval()
    with torch.no_grad():
        predicted = model(torch.from_numpy(X_test)).argmax(dim=1).numpy()
    scores = {
        "baseline": float(baseline.score(X_test, y_test)),
        "model": float((predicted == y_test).mean()),
    }
    plt.close(plot_scores(scores, plot_path))
    return scores
