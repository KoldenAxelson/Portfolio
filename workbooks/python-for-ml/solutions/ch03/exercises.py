"""Chapter 3 workbook: Vectorize Everything. Solutions.

Three parts. Replace every `None` prediction and every
`raise NotImplementedError`, and fix the two functions marked FIX, then run
`pytest`.
"""
import numpy as np

# ── Part 1: shape predictor, broadcasting edition ────────────────────────
#   a   = np.arange(12).reshape(3, 4)     shape (3, 4)
#   row = np.arange(4)                    shape (4,)
#   col = np.arange(3).reshape(3, 1)      shape (3, 1)
#   v   = np.arange(3)                    shape (3,)
# Write each result's shape as a tuple, or the string "error" if NumPy
# refuses. Work it out first, then check with `pytest -k predict_shape`.

PREDICTIONS = {
    "a + row": (3, 4),
    "a + col": (3, 4),
    "col + row": (3, 4),
    "a + v": "error",
    "a.sum()": (),
    "a.sum(axis=0)": (4,),
    "a.mean(axis=1)": (3,),
    "a.max(axis=1, keepdims=True)": (3, 1),
    "a.argmax(axis=0)": (4,),
    "a @ a.T": (3, 3),
    "a @ a": "error",
    "np.stack([a, a])": (2, 3, 4),
    "np.concatenate([a, a], axis=1)": (3, 8),
    "np.where(a > 5, a, 0)": (3, 4),
}


# ── Part 2: write it without a loop ──────────────────────────────────────

def normalize_columns(X: np.ndarray) -> np.ndarray:
    """Each column of X shifted to mean 0 and scaled to standard deviation 1."""
    return (X - X.mean(axis=0)) / X.std(axis=0)


def normalize_rows(X: np.ndarray) -> np.ndarray:
    """Each ROW of X shifted to mean 0 and scaled to standard deviation 1."""
    return (X - X.mean(axis=1, keepdims=True)) / X.std(axis=1, keepdims=True)


def relu(x: np.ndarray) -> np.ndarray:
    """x with every negative value replaced by 0 (the ReLU activation)."""
    return np.where(x > 0, x, 0.0)


def predict_classes(scores: np.ndarray) -> np.ndarray:
    """Given one row of class scores per example, the index of the highest
    score in each row: shape (examples,)."""
    return scores.argmax(axis=1)


def pairwise_scores(queries: np.ndarray, keys: np.ndarray) -> np.ndarray:
    """Dot product of every query row with every key row.

    queries is (n, d) and keys is (m, d); the result is (n, m), with
    result[i, j] = queries[i] · keys[j].
    """
    return queries @ keys.T


# ── Part 3: fix the bugs ─────────────────────────────────────────────────

def row_norms(X: np.ndarray) -> np.ndarray:
    """The length of each row, sqrt(x0² + x1² + …): shape (rows,), with no
    Python loop."""
    return np.sqrt((X * X).sum(axis=1))


def scaled_head(x: np.ndarray, n: int, factor: float) -> np.ndarray:
    """The first n values of x times `factor`, as a new array; x is untouched.
    x[:n] is a view, so the in-place *= wrote into x. Multiplying makes a new
    array instead."""
    return x[:n] * factor
