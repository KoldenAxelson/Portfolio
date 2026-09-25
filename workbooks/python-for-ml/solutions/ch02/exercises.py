"""Chapter 2 workbook: Arrays and Shapes. Solutions.

Three parts. Replace every `None` prediction and every
`raise NotImplementedError`, then run `pytest`.
"""
import numpy as np

# ── Part 1: shape predictor ──────────────────────────────────────────────
# `a` is np.arange(12).reshape(3, 4). For each expression, write the shape it
# produces as a tuple, WITHOUT running it first: (3, 4), (4,), and so on. A
# single value has shape (). Then check yourself with `pytest -k predict_shape`.

PREDICTIONS = {
    "a[2]": (4,),
    "a[2:]": (1, 4),
    "a[:, 0]": (3,),
    "a[:, :1]": (3, 1),
    "a[1, 3]": (),
    "a[a > 7]": (4,),
    "a[[0, 0, 2]]": (3, 4),
    "a.reshape(6, -1)": (6, 2),
    "a.reshape(-1)": (12,),
    "a.T": (4, 3),
    "a.T[1:]": (3, 3),
    "a.ravel()[::4]": (3,),
}


# ── Part 2: write the line ───────────────────────────────────────────────
# Each of these is one line of NumPy. No Python loops.

def make_grid(rows: int, cols: int) -> np.ndarray:
    """The numbers 0 .. rows*cols - 1, laid out as a (rows, cols) grid.

    >>> make_grid(2, 3)
    array([[0, 1, 2],
           [3, 4, 5]])
    """
    return np.arange(rows * cols).reshape(rows, cols)


def evenly_spaced(start: float, stop: float, count: int) -> np.ndarray:
    """`count` evenly spaced points from start to stop, both ends included."""
    return np.linspace(start, stop, count)


def seeded_noise(seed: int, shape: tuple[int, ...]) -> np.ndarray:
    """Random floats in [0, 1) with the given shape, the same every time for
    the same seed. Use a generator from np.random.default_rng."""
    return np.random.default_rng(seed).random(shape)


def last_column(a: np.ndarray) -> np.ndarray:
    """The last column of a 2-D array, as a 1-D array of shape (rows,)."""
    return a[:, -1]


def last_column_2d(a: np.ndarray) -> np.ndarray:
    """The last column of a 2-D array, kept 2-D: shape (rows, 1)."""
    return a[:, -1:]


def every_other_row(a: np.ndarray) -> np.ndarray:
    """Rows 0, 2, 4, … of a 2-D array."""
    return a[::2]


def values_above(a: np.ndarray, threshold: float) -> np.ndarray:
    """Every value of `a` greater than `threshold`, as a 1-D array."""
    return a[a > threshold]


def rows_in_order(a: np.ndarray, order: list[int]) -> np.ndarray:
    """The rows of `a` listed in `order`, in that order (repeats allowed)."""
    return a[order]


def as_rows(v: np.ndarray, width: int) -> np.ndarray:
    """A 1-D array cut into rows of `width` values: shape (len(v) // width, width).
    Let NumPy work out the number of rows."""
    return v.reshape(-1, width)


# ── Part 3: build it ─────────────────────────────────────────────────────

def top_rows(scores: np.ndarray, k: int) -> np.ndarray:
    """The `k` rows of `scores` with the highest totals, highest total first.

    `scores` has one row per student and one column per test. The result has
    shape (k, tests). scores.sum(axis=1) gives each row's total (Chapter 3
    covers sums along an axis). np.argsort(values) returns the positions that
    would sort `values` from smallest to largest; you will want the other end.
    """
    totals = scores.sum(axis=1)
    return scores[np.argsort(totals)[::-1][:k]]
