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

import matplotlib.pyplot as plt  # noqa: F401 (you'll need these)
import numpy as np
import pandas as pd
import torch
from matplotlib.figure import Figure
from sklearn.linear_model import LogisticRegression  # noqa: F401
from sklearn.model_selection import train_test_split  # noqa: F401
from torch import nn

FEATURES = ["mem_gb", "batch_size", "seq_len"]
LABEL = "oom"


# ── Stage 1: pandas, load and clean ──────────────────────────────────────

def load_jobs(path: Path) -> pd.DataFrame:
    """Read the CSV at `path`, drop every row with a missing value, and turn
    the `oom` column into integers: 1 for "yes", 0 for "no". Return the
    cleaned DataFrame, with the same four columns."""
    raise NotImplementedError("load_jobs: pd.read_csv, then dropna, then oom as 1 and 0 (map or == 'yes' and astype(int))")


# ── Stage 2: NumPy, arrays and shapes ────────────────────────────────────

def to_arrays(jobs: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
    """Return (X, y): X the FEATURES columns, in that order, as a float32
    array of shape (n, 3); y the oom column as an int64 array of shape (n,),
    one label per row. Check the shapes with assert before you return."""
    raise NotImplementedError("to_arrays: jobs[FEATURES].to_numpy(dtype=np.float32) and jobs[LABEL].to_numpy()")


def standardize(X_train: np.ndarray, X_test: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Scale each column to mean 0 and standard deviation 1, using the mean
    and standard deviation of the TRAINING rows for both arrays, so nothing
    about the test rows leaks in. Return (X_train_scaled, X_test_scaled),
    still float32 and the same shapes."""
    raise NotImplementedError("standardize: mean and std along axis 0 of X_train, then (X - mean) / std for both")


# ── Stage 3: scikit-learn, the baseline ──────────────────────────────────

def fit_baseline(X_train: np.ndarray, y_train: np.ndarray):
    """Fit a baseline classifier, such as LogisticRegression, on the training
    rows and return the fitted estimator (not its score). The tests want at
    least 80% accuracy on held-out rows."""
    raise NotImplementedError("fit_baseline: LogisticRegression().fit(X_train, y_train), and return it")


# ── Stage 4: PyTorch, a small model ──────────────────────────────────────

def train_model(X_train: np.ndarray, y_train: np.ndarray) -> nn.Module:
    """Train a small classifier on the training rows (float32 X of shape
    (n, 3), int64 y of shape (n,)) and return it: 3 features in, 2 raw scores
    out, with a hidden layer and a ReLU.

    Seed it first, with torch.manual_seed, so two calls return the same model.
    The tests want at least 93% accuracy on held-out rows, in under 15 s.
    """
    raise NotImplementedError("train_model: torch.manual_seed(0), torch.from_numpy, an nn.Sequential, then the training loop")


# ── Stage 5: Matplotlib, the comparison ──────────────────────────────────

def plot_scores(scores: dict[str, float], out_path: Path) -> Figure:
    """Draw a bar chart with one bar per entry of `scores` (name → accuracy),
    in the dict's order, named by its key; label the accuracy axis; save the
    figure as a PNG to `out_path`, and return the Figure."""
    raise NotImplementedError("plot_scores: fig, ax = plt.subplots(), ax.bar (or barh), a label, fig.savefig(out_path)")


# ── All together ─────────────────────────────────────────────────────────

def run_pipeline(csv_path: Path, plot_path: Path) -> dict[str, float]:
    """Run every stage in order on the CSV at `csv_path`: load_jobs,
    to_arrays, then train_test_split(X, y, test_size=0.25, random_state=0),
    standardize, fit_baseline and train_model on the training rows. Score both
    on the test rows, save plot_scores to `plot_path`, and return
    {"baseline": its accuracy, "model": its accuracy}, as plain floats."""
    raise NotImplementedError("run_pipeline: call the five stages in order, score both models on the test rows")
