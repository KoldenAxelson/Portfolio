"""Checks for the Chapter 10 workbook. Run `pytest` in this folder.

Each stage is tested on its own: its test builds correct inputs itself (with
the reference code below), so a wrong answer in one stage can't fail another.
test_run_pipeline then runs your stages together.
"""
import numbers
import time
from pathlib import Path

import matplotlib

# Agg draws to files only: no window opens while the tests run.
matplotlib.use("Agg")

import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
import pytest  # noqa: E402
import torch  # noqa: E402
from matplotlib.container import BarContainer  # noqa: E402
from matplotlib.figure import Figure  # noqa: E402
from sklearn.model_selection import train_test_split  # noqa: E402
from torch import nn  # noqa: E402

import exercises  # noqa: E402

DATA = Path(__file__).parent / "data" / "oom.csv"
FEATURES = ["mem_gb", "batch_size", "seq_len"]
ROWS, CLEAN_ROWS = 400, 386
BASELINE_TARGET = 0.80
MODEL_TARGET = 0.93
MODEL_TIME_LIMIT_S = 15
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"

# What an error means, found from its message, so a crash fails with a reason.
# (exercise, text in the message, hint); an exercise of None fits any of them.
MESSAGE_HINTS = [
    ("load_jobs", "No such file or directory",
     "Read the path you were given, pd.read_csv(path), not a path of your own."),
    ("to_arrays", "not in index",
     "Select the feature columns by name, jobs[FEATURES], using the names in FEATURES."),
    ("to_arrays", "could not convert string to float",
     "A text column got into X. Select only FEATURES for X; oom goes in y (the tests hand you a cleaned table, oom as 1 and 0)."),
    ("fit_baseline", "Unknown label type",
     "y_train must hold class labels (0 and 1), not measurements: pass it as given."),
    (None, "Input X contains NaN",
     "X has missing values: load_jobs should drop every row that has one, with dropna(), before the arrays are made."),
    (None, "'NoneType' object is not subscriptable",
     "A stage gave back None: check each one ends with return, and that load_jobs doesn't return dropna(inplace=True), which is None."),
    (None, "expected np.ndarray (got DataFrame)",
     "torch.from_numpy takes a NumPy array, not a table: to_arrays should return .to_numpy() arrays."),
    (None, "values to unpack",
     "A stage gave back a different number of values from the ones unpacked: to_arrays returns (X, y), standardize returns "
     "(X_train, X_test), and train_test_split returns four arrays."),
    (None, "object has no attribute 'score'",
     "fit_baseline should return the fitted estimator, which has .score, not a number."),
    (None, "not a tuple",
     "plot_scores should return just the Figure, fig, not (fig, ax)."),
    (None, "must be Tensor, not numpy.ndarray",
     "A PyTorch layer takes tensors: turn the arrays into tensors first, torch.from_numpy(X_train)."),
    (None, "expected m1 and m2 to have the same dtype",
     "The batch's dtype doesn't match the layer's float32 weights: keep X float32 (torch.from_numpy(X_train) does), not .double()."),
    (None, "must have the same dtype",
     "The batch's dtype doesn't match the layer's float32 weights: keep X float32 (torch.from_numpy(X_train) does), not .double()."),
    (None, "expected target dtype to be Long",
     "CrossEntropyLoss wants int64 class indices as targets: torch.from_numpy(y_train) as it comes, not .float()."),
    (None, "Expected floating point type for target with class probabilities",
     "CrossEntropyLoss wants int64 class indices as targets: torch.from_numpy(y_train) as it comes, not .int()."),
    (None, "0D or 1D target tensor expected",
     "CrossEntropyLoss wants targets of shape (n,), one class per row, not (n, 1)."),
    (None, "mat1 and mat2 shapes cannot be multiplied",
     "A layer got the wrong number of features: the first nn.Linear takes 3 inputs, and each layer's out_features must equal the next one's in_features."),
    (None, "optimizer can only optimize Tensors",
     "Give the optimizer the model's weights, not the model: torch.optim.AdamW(model.parameters(), lr=...)."),
    (None, "'method' object is not iterable",
     "Call parameters with its brackets: torch.optim.AdamW(model.parameters(), lr=...)."),
    (None, "does not require grad and does not have a grad_fn",
     "backward found nothing to work out: compute the loss from the model's output, outside torch.no_grad()."),
    (None, "has no attribute 'savefig'",
     "savefig belongs to the Figure: fig.savefig(out_path), or ax.figure.savefig(out_path)."),
    (None, "has no attribute 'xlabel'",
     "On an Axes the method is set_xlabel (plt.xlabel is the pyplot version)."),
    (None, "has no attribute 'ylabel'",
     "On an Axes the method is set_ylabel (plt.ylabel is the pyplot version)."),
    (None, "has no attribute 'predict'",
     "Return the fitted estimator itself (fit returns it), not its score or predictions."),
    (None, "is not fitted yet",
     "Fit the estimator on the training rows before scoring it: model.fit(X_train, y_train) returns it fitted."),
]


def slip_hint(name, error):
    message = str(error)
    return next((hint for exercise, text, hint in MESSAGE_HINTS if exercise in (None, name) and text in message), "")


def call(function, *args):
    """Run an exercise (or something it returned), turning an unwritten one, or one that raises, into a plain failure."""
    name = getattr(function, "__name__", type(function).__name__)
    try:
        return function(*args)
    except NotImplementedError as todo:
        pytest.fail(f"Not written yet: {todo}")
    except AssertionError as error:
        pytest.fail(
            f"An assert in your code failed while {name} ran: {error or '(no message)'}. Your own check caught a wrong "
            "shape or value: compare it with the shapes the docstrings ask for."
        )
    except Exception as error:  # the hint table explains the common ones
        first_line = (str(error).strip().splitlines() or [""])[0].rstrip(".")
        pytest.fail(f"{name} raised {type(error).__name__}: {first_line}. {slip_hint(name, error)}".rstrip())


# ── The reference stages, so each test has correct inputs of its own ─────

def reference_jobs(path=DATA):
    jobs = pd.read_csv(path).dropna()
    jobs["oom"] = (jobs["oom"] == "yes").astype(int)
    return jobs


def reference_split():
    jobs = reference_jobs()
    X = jobs[FEATURES].to_numpy(dtype=np.float32)
    y = jobs["oom"].to_numpy(dtype=np.int64)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=0)
    mean, std = X_train.mean(axis=0), X_train.std(axis=0)
    return (X_train - mean) / std, (X_test - mean) / std, y_train, y_test


def expect_array(value, name, what):
    if isinstance(value, (pd.DataFrame, pd.Series)):
        pytest.fail(f"{name} returned a pandas {type(value).__name__} for {what}; expected a NumPy array: .to_numpy() gives one.")
    if isinstance(value, torch.Tensor):
        pytest.fail(f"{name} returned a tensor for {what}; expected a NumPy array (the model stage turns it into a tensor itself).")
    if not isinstance(value, np.ndarray):
        pytest.fail(f"{name} returned {type(value).__name__} for {what}; expected a NumPy array.")


def expect_pair(value, name, what):
    if not isinstance(value, tuple) or len(value) != 2:
        pytest.fail(f"{name} returned {type(value).__name__}; expected a tuple of two arrays, {what}: return a, b.")
    return value


def accuracy_of_model(model, X_test, y_test):
    model.eval()
    with torch.no_grad():
        scores = call(model, torch.from_numpy(X_test))
    if not isinstance(scores, torch.Tensor) or tuple(scores.shape) != (len(X_test), 2):
        shape = tuple(scores.shape) if isinstance(scores, torch.Tensor) else type(scores).__name__
        pytest.fail(f"The model turned {len(X_test)} test rows into {shape}; expected a tensor of shape ({len(X_test)}, 2), two raw scores per row.")
    return (scores.argmax(dim=1).numpy() == y_test).mean().item()


# ── Stage 1: load_jobs ───────────────────────────────────────────────────

def check_jobs(got, expected, where):
    if got is None:
        pytest.fail("load_jobs returned None. dropna(inplace=True) returns None: write jobs = jobs.dropna() and return jobs.")
    if not isinstance(got, pd.DataFrame):
        pytest.fail(f"load_jobs returned {type(got).__name__}; expected the cleaned DataFrame.")
    if list(got.columns) != list(expected.columns):
        pytest.fail(f"load_jobs's columns are {list(got.columns)}; expected {list(expected.columns)}, the CSV's four, unchanged.")
    if got.isna().any().any():
        pytest.fail(f"load_jobs's table from {where} still has missing values; drop every row that has one with .dropna().")
    if len(got) != len(expected):
        pytest.fail(f"load_jobs kept {len(got)} rows of {where}; expected {len(expected)}: every row with a missing value, in any column, dropped, and no others.")
    oom = got["oom"]
    if not pd.api.types.is_integer_dtype(oom) or pd.api.types.is_bool_dtype(oom):
        hint = {
            "bool": "(df['oom'] == 'yes') gives True and False; add .astype(int) to get 1 and 0.",
            "object": "the column still holds Python objects; replace can leave it that way. Use .map({'yes': 1, 'no': 0}) or (df['oom'] == 'yes').astype(int).",
        }.get(str(oom.dtype), "turn 'yes' into 1 and 'no' into 0, as integers: (df['oom'] == 'yes').astype(int).")
        pytest.fail(f"load_jobs's oom column has dtype {oom.dtype}; expected integers, 1 and 0: {hint}")
    assert oom.tolist() == expected["oom"].tolist(), (
        f"load_jobs's oom column from {where} doesn't match: expected 1 where the CSV says yes and 0 where it says no."
    )


def test_load_jobs():
    check_jobs(call(exercises.load_jobs, DATA), reference_jobs(), "data/oom.csv")


def test_load_jobs_second_file(tmp_path):
    # Missing values in two different columns, so dropping by one column isn't enough.
    path = tmp_path / "small.csv"
    path.write_text(
        "mem_gb,batch_size,seq_len,oom\n"
        "16,8,1024,yes\n"
        "80,,512,no\n"
        "24,4,,no\n"
        "40,64,4096,yes\n"
        "80,16,256,no\n"
    )
    check_jobs(call(exercises.load_jobs, path), reference_jobs(path), "a five-row CSV with two gaps")


# ── Stage 2: to_arrays and standardize ───────────────────────────────────

@pytest.mark.parametrize("rows", [None, [3, 0, 7]], ids=["whole-table", "three-rows"])
def test_to_arrays_shapes(rows):
    jobs = reference_jobs()
    if rows is not None:
        jobs = jobs.iloc[rows]
    X, y = expect_pair(call(exercises.to_arrays, jobs), "to_arrays", "(X, y)")
    expect_array(X, "to_arrays", "X")
    expect_array(y, "to_arrays", "y")
    n = len(jobs)
    assert X.shape == (n, 3), (
        f"to_arrays's X has shape {X.shape}; expected ({n}, 3): one row per job and one column per feature "
        f"({', '.join(FEATURES)}), without oom."
    )
    assert y.shape == (n,), (
        f"to_arrays's y has shape {y.shape}; expected ({n},), one label per row. "
        + ("jobs[['oom']] (double brackets) is a one-column table, so its array is 2-D; jobs['oom'] is a Series, and its array is 1-D."
           if y.shape == (n, 1) else "Take it from the oom column alone.")
    )
    assert X.dtype == np.float32, (
        f"to_arrays's X is {X.dtype}; expected float32, the dtype a PyTorch layer's weights have: to_numpy(dtype=np.float32)."
    )
    assert y.dtype == np.int64, (
        f"to_arrays's y is {y.dtype}; expected int64, the class indices CrossEntropyLoss wants: to_numpy(dtype=np.int64)."
    )
    assert np.array_equal(X, jobs[FEATURES].to_numpy(dtype=np.float32)), (
        f"to_arrays's X has the right shape but not the right values; expected the columns {FEATURES}, in that order."
    )
    assert np.array_equal(y, jobs["oom"].to_numpy()), "to_arrays's y doesn't match the oom column, row for row."


def test_standardize():
    X_train = np.array([[1, 10], [3, 10], [5, 40], [7, 20]], dtype=np.float32)  # means 4, 20; stds √5, √150
    X_test = np.array([[4, 20], [9, 50]], dtype=np.float32)
    got_train, got_test = expect_pair(call(exercises.standardize, X_train, X_test), "standardize", "(X_train_scaled, X_test_scaled)")
    expect_array(got_train, "standardize", "X_train_scaled")
    expect_array(got_test, "standardize", "X_test_scaled")
    mean, std = X_train.mean(axis=0), X_train.std(axis=0)
    want_train, want_test = (X_train - mean) / std, (X_test - mean) / std
    assert got_train.shape == X_train.shape and got_test.shape == X_test.shape, (
        f"standardize returned shapes {got_train.shape} and {got_test.shape}; expected {X_train.shape} and {X_test.shape}, unchanged: "
        "take the mean and std along axis=0, one per column, and let broadcasting apply them to every row."
    )
    assert got_train.dtype == np.float32 and got_test.dtype == np.float32, (
        f"standardize returned {got_train.dtype} and {got_test.dtype}; expected float32, as it came in."
    )
    if np.allclose(got_train, (X_train - X_train.mean(axis=0)) / X_train.std(axis=0, ddof=1), atol=1e-5):
        pytest.fail("standardize divides by the sample std (ddof=1); use the default, X_train.std(axis=0), as StandardScaler does.")
    assert np.allclose(got_train, want_train, atol=1e-5), (
        f"standardize's X_train_scaled is {got_train.round(3).tolist()}; expected {want_train.round(3).tolist()}: "
        "(X_train - mean) / std, with the mean and std of each column (axis=0)."
    )
    test_mean, test_std = X_test.mean(axis=0), X_test.std(axis=0)
    if np.allclose(got_test, (X_test - test_mean) / test_std, atol=1e-5):
        pytest.fail(
            "standardize scaled X_test with X_test's own mean and std. Use the training rows' numbers for both: "
            "the test rows stand for data the model hasn't seen, so nothing may be learned from them."
        )
    assert np.allclose(got_test, want_test, atol=1e-5), (
        f"standardize's X_test_scaled is {got_test.round(3).tolist()}; expected {want_test.round(3).tolist()}: "
        "(X_test - mean) / std with the TRAINING rows' mean and std."
    )


# ── Stage 3: fit_baseline ────────────────────────────────────────────────

def test_fit_baseline():
    X_train, X_test, y_train, y_test = reference_split()
    model = call(exercises.fit_baseline, X_train, y_train)
    if isinstance(model, numbers.Real):
        pytest.fail(f"fit_baseline returned a number, {model}; return the fitted estimator (fit returns it), and let the test score it.")
    if not hasattr(model, "predict"):
        pytest.fail(f"fit_baseline returned {type(model).__name__}; expected a fitted scikit-learn estimator, such as LogisticRegression().fit(X_train, y_train).")
    predicted = np.asarray(call(model.predict, X_test))
    if predicted.shape != y_test.shape:
        pytest.fail(f"The baseline predicted shape {predicted.shape} for {len(X_test)} rows; expected {y_test.shape}.")
    score = (predicted == y_test).mean()
    assert score >= BASELINE_TARGET, (
        f"The baseline got {score:.1%} of the held-out jobs right; the target is {BASELINE_TARGET:.0%} "
        f"(answering 'no' every time gets {np.mean(y_test == 0):.1%}). Fit a classifier such as LogisticRegression on X_train and y_train."
    )


# ── Stage 4: train_model ─────────────────────────────────────────────────

def test_train_model():
    X_train, X_test, y_train, y_test = reference_split()
    start = time.perf_counter()
    model = call(exercises.train_model, X_train, y_train)
    seconds = time.perf_counter() - start
    if not isinstance(model, nn.Module):
        pytest.fail(f"train_model returned {type(model).__name__}; expected the trained model alone, an nn.Module.")
    score = accuracy_of_model(model, X_test, y_test)
    assert score >= MODEL_TARGET, (
        f"The trained model got {score:.1%} of the held-out jobs right; the target is {MODEL_TARGET:.0%}. Check each epoch runs "
        "zero_grad, forward, the loss, backward and step, with a hidden layer and nn.ReLU; then train longer or with a larger lr "
        "(AdamW with lr=0.05 for 300 full-batch epochs is plenty)."
    )
    assert seconds < MODEL_TIME_LIMIT_S, (
        f"train_model took {seconds:.0f} s; keep it under {MODEL_TIME_LIMIT_S} s: fewer epochs, or bigger batches."
    )


def test_train_model_is_seeded():
    X_train, X_test, y_train, _ = reference_split()
    torch.manual_seed(1)  # two different global seeds: only a seed inside train_model can make the runs agree
    first = call(exercises.train_model, X_train, y_train)
    torch.manual_seed(2)
    second = call(exercises.train_model, X_train, y_train)
    if not isinstance(first, nn.Module) or not isinstance(second, nn.Module):
        pytest.fail("train_model must return an nn.Module first (see test_train_model).")
    first.eval()
    second.eval()
    with torch.no_grad():
        same = torch.equal(call(first, torch.from_numpy(X_test)), call(second, torch.from_numpy(X_test)))
    assert same, (
        "Two calls of train_model on the same rows gave different models. Seed it at its start, torch.manual_seed(0), "
        "so the starting weights and any shuffling are the same on every run."
    )


# ── Stage 5: plot_scores ─────────────────────────────────────────────────

@pytest.mark.parametrize("scores", [
    {"baseline": 0.866, "model": 0.969},
    {"always no": 0.577, "logistic": 0.866, "mlp": 0.969},
], ids=["two-bars", "three-bars"])
def test_plot_scores(tmp_path, scores):
    out_path = tmp_path / "scores.png"
    fig = call(exercises.plot_scores, scores, out_path)
    if isinstance(fig, tuple):
        pytest.fail("plot_scores returned a tuple; return just the Figure, fig, not (fig, ax).")
    if not isinstance(fig, Figure):
        pytest.fail(f"plot_scores returned {type(fig).__name__}; expected a matplotlib Figure (end with return fig).")
    try:
        bars = [c for ax in fig.axes for c in ax.containers if isinstance(c, BarContainer)]
        if len(bars) != 1:
            pytest.fail(f"plot_scores's figure has {len(bars)} bar charts; expected one: a single ax.bar (or ax.barh) call with every score.")
        container = bars[0]
        ax = next(ax for ax in fig.axes if container in ax.containers)
        values = list(container.datavalues)
        assert len(values) == len(scores), (
            f"plot_scores drew {len(values)} bars for {len(scores)} scores; expected one bar per score."
        )
        assert np.allclose(values, list(scores.values())), (
            f"plot_scores's bars are {values}; expected {list(scores.values())}, each score as its bar's length, in the dict's order."
        )
        horizontal = container.orientation == "horizontal"
        ticks = ax.get_yticklabels() if horizontal else ax.get_xticklabels()
        names = [t.get_text() for t in ticks]
        assert names == list(scores), (
            f"plot_scores's bars are named {names}; expected {list(scores)}: pass the names as the bars' positions, ax.bar(list(scores), ...)."
        )
        value_label = ax.get_xlabel() if horizontal else ax.get_ylabel()
        other_label = ax.get_ylabel() if horizontal else ax.get_xlabel()
        if not value_label.strip() and other_label.strip():
            pytest.fail(
                f"plot_scores labelled the axis with the names ({other_label!r}), not the one the bars measure along: "
                + ("horizontal bars grow along x, so ax.set_xlabel('test accuracy')." if horizontal
                   else "vertical bars grow along y, so ax.set_ylabel('test accuracy').")
            )
        assert value_label.strip(), (
            "plot_scores left the accuracy axis unlabelled; say what the bars measure: "
            + ("ax.set_xlabel('test accuracy')." if horizontal else "ax.set_ylabel('test accuracy').")
        )
    finally:
        plt.close(fig)
    if not out_path.exists():
        pytest.fail(f"Nothing was written to {out_path.name}. Save the figure to the path you were given: fig.savefig(out_path).")
    head = out_path.read_bytes()[:8]
    assert head == PNG_SIGNATURE, (
        f"{out_path.name} isn't a PNG (it starts {head!r}). savefig picks the format from the extension: fig.savefig(out_path), without format=."
    )


# ── All together ─────────────────────────────────────────────────────────

def test_run_pipeline(tmp_path, monkeypatch):
    plot_path = tmp_path / "comparison.png"
    scaled_rows = []
    standardize = exercises.standardize

    def spy_standardize(X_train, X_test):
        scaled_rows.append((len(X_train), len(X_test)))
        return standardize(X_train, X_test)

    monkeypatch.setattr(exercises, "standardize", spy_standardize)
    scores = call(exercises.run_pipeline, DATA, plot_path)
    plt.close("all")
    if not isinstance(scores, dict) or set(scores) != {"baseline", "model"}:
        got = sorted(scores) if isinstance(scores, dict) else type(scores).__name__
        pytest.fail(f"run_pipeline returned {got}; expected a dict with the keys 'baseline' and 'model'.")
    for name, value in scores.items():
        if isinstance(value, (torch.Tensor, np.ndarray)) or not isinstance(value, numbers.Real):
            pytest.fail(f"run_pipeline's {name!r} score is {value!r} ({type(value).__name__}); expected a plain float: float(...) or .item().")
        if not 0 <= value <= 1:
            pytest.fail(f"run_pipeline's {name!r} score is {value}; expected an accuracy, a share from 0 to 1.")
    X_train, X_test, _, _ = reference_split()
    if scaled_rows and scaled_rows[0] != (len(X_train), len(X_test)):
        pytest.fail(
            f"run_pipeline called standardize on {scaled_rows[0][0]} and {scaled_rows[0][1]} rows; expected the {len(X_train)} "
            f"training and {len(X_test)} test rows: split first, then standardize, so no test row reaches the mean and std."
        )
    if scores["baseline"] >= MODEL_TARGET > scores["model"]:
        pytest.fail(
            f"run_pipeline's baseline scored {scores['baseline']:.3f} and its model {scores['model']:.3f}; that looks the wrong way "
            "round. Check 'baseline' holds the scikit-learn score and 'model' the PyTorch one."
        )
    assert scores["baseline"] >= BASELINE_TARGET, (
        f"run_pipeline's baseline scored {scores['baseline']:.1%}; the target is {BASELINE_TARGET:.0%}. If fit_baseline passes on "
        "its own, check the order: split with test_size=0.25 and random_state=0, then standardize, then fit on the training rows."
    )
    assert scores["model"] >= MODEL_TARGET, (
        f"run_pipeline's model scored {scores['model']:.1%}; the target is {MODEL_TARGET:.0%}. If train_model passes on its own, "
        "check it gets the standardized training rows, and that it's scored on the standardized test rows."
    )
    assert scores["model"] > scores["baseline"], (
        f"run_pipeline's model ({scores['model']:.3f}) didn't beat the baseline ({scores['baseline']:.3f}). Check the two scores "
        "aren't swapped, and keep the baseline a straight-line model such as LogisticRegression: the simple score the network has to beat."
    )
    if not plot_path.exists():
        pytest.fail(f"run_pipeline wrote nothing to {plot_path.name}; pass plot_path on to plot_scores.")
    assert plot_path.read_bytes()[:8] == PNG_SIGNATURE, f"{plot_path.name} isn't a PNG; save it with fig.savefig(plot_path)."
