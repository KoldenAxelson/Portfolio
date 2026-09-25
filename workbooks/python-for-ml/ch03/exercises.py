"""Chapter 3 workbook: Vectorize Everything.

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
    "a + row": None,
    "a + col": None,
    "col + row": None,
    "a + v": None,
    "a.sum()": None,
    "a.sum(axis=0)": None,
    "a.mean(axis=1)": None,
    "a.max(axis=1, keepdims=True)": None,
    "a.argmax(axis=0)": None,
    "a @ a.T": None,
    "a @ a": None,
    "np.stack([a, a])": None,
    "np.concatenate([a, a], axis=1)": None,
    "np.where(a > 5, a, 0)": None,
}


# ── Part 2: write it without a loop ──────────────────────────────────────

def normalize_columns(X: np.ndarray) -> np.ndarray:
    """Each column of X shifted to mean 0 and scaled to standard deviation 1."""
    raise NotImplementedError("normalize_columns: subtract the column means, divide by the column stds")


def normalize_rows(X: np.ndarray) -> np.ndarray:
    """Each ROW of X shifted to mean 0 and scaled to standard deviation 1."""
    raise NotImplementedError("normalize_rows: like normalize_columns along axis 1, but the shapes need keepdims")


def relu(x: np.ndarray) -> np.ndarray:
    """x with every negative value replaced by 0 (the ReLU activation)."""
    raise NotImplementedError("relu: np.where or np.clip")


def predict_classes(scores: np.ndarray) -> np.ndarray:
    """Given one row of class scores per example, the index of the highest
    score in each row: shape (examples,)."""
    raise NotImplementedError("predict_classes: which reduction gives a position?")


def pairwise_scores(queries: np.ndarray, keys: np.ndarray) -> np.ndarray:
    """Dot product of every query row with every key row.

    queries is (n, d) and keys is (m, d); the result is (n, m), with
    result[i, j] = queries[i] · keys[j].
    """
    raise NotImplementedError("pairwise_scores: one matrix product; mind which axis must match")


# ── Part 3: fix the bugs ─────────────────────────────────────────────────

def row_norms(X: np.ndarray) -> np.ndarray:
    """FIX: correct, but far too slow. The length of each row,
    sqrt(x0² + x1² + …): shape (rows,). Rewrite it with no Python loop; the
    test times it against this loop and wants it at least 10× faster."""
    norms = np.empty(len(X))
    for i in range(len(X)):
        total = 0.0
        for value in X[i]:
            total += value * value
        norms[i] = total ** 0.5
    return norms


def scaled_head(x: np.ndarray, n: int, factor: float) -> np.ndarray:
    """FIX: the first n values of x times `factor`, as a new array. It returns
    the right values but changes the caller's x as well. Make x come out of
    the call untouched."""
    head = x[:n]
    head *= factor
    return head
