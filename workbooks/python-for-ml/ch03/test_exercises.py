"""Checks for the Chapter 3 workbook. Run `pytest` in this folder."""
import time

import numpy as np
import pytest

import exercises

NAMES = {
    "np": np,
    "a": np.arange(12).reshape(3, 4),
    "row": np.arange(4),
    "col": np.arange(3).reshape(3, 1),
    "v": np.arange(3),
}

WHY = {
    "a + row": "(3, 4) and (4,): the row is stretched down all 3 rows",
    "a + col": "(3, 4) and (3, 1): the column is stretched across all 4 columns",
    "col + row": "(3, 1) and (4,): each is stretched along the other's axis, giving a 3×4 grid",
    "a + v": "lined up from the right, 4 meets 3 and neither is 1, so NumPy raises ValueError",
    "a.sum()": "with no axis a reduction gives one value, shape ()",
    "a.sum(axis=0)": "axis 0 collapses the rows, leaving one total per column",
    "a.mean(axis=1)": "axis 1 collapses the columns, leaving one mean per row",
    "a.max(axis=1, keepdims=True)": "keepdims keeps the collapsed axis with length 1",
    "a.argmax(axis=0)": "one position per column",
    "a @ a.T": "(3, 4) @ (4, 3): the inner 4s match and disappear",
    "a @ a": "(3, 4) @ (3, 4): the inner lengths are 4 and 3, so matmul raises ValueError",
    "np.stack([a, a])": "stack adds a new axis 0 of length 2",
    "np.concatenate([a, a], axis=1)": "joined along the columns: 4 + 4",
    "np.where(a > 5, a, 0)": "the condition, a and 0 broadcast to (3, 4)",
}


def call(function, *args):
    """Run an exercise, turning an unwritten one into a plain failure."""
    try:
        return function(*args)
    except NotImplementedError as todo:
        pytest.fail(f"Not written yet: {todo}")


def actual_shape(expression):
    try:
        return np.shape(eval(expression, dict(NAMES)))
    except ValueError:
        return "error"


@pytest.mark.parametrize("expression", list(exercises.PREDICTIONS))
def test_predict_shape(expression):
    guess = exercises.PREDICTIONS[expression]
    if guess is None:
        pytest.fail(f'Predict {expression} in PREDICTIONS: a shape tuple like (3, 4), or "error".')
    if not (isinstance(guess, tuple) or guess == "error"):
        pytest.fail(f'{expression}: write a tuple like (3, 4) or the string "error", not {guess!r}.')
    actual = actual_shape(expression)
    assert guess == actual, f"{expression}: you predicted {guess!r}, but it is {actual!r}: {WHY[expression]}."


BATCH = np.array([[1.0, 2.0, 30.0], [3.0, 4.0, 10.0], [5.0, 6.0, 20.0], [7.0, 8.0, 40.0]])


def test_normalize_columns():
    got = call(exercises.normalize_columns, BATCH)
    assert got.shape == BATCH.shape, f"normalize_columns changed the shape to {got.shape}; it should stay {BATCH.shape}."
    assert np.allclose(got.mean(axis=0), 0), (
        f"Column means are {np.round(got.mean(axis=0), 3).tolist()}; each should be 0: subtract X.mean(axis=0)."
    )
    assert np.allclose(got.std(axis=0), 1), (
        f"Column standard deviations are {np.round(got.std(axis=0), 3).tolist()}; each should be 1: divide by X.std(axis=0)."
    )


def test_normalize_rows():
    got = call(exercises.normalize_rows, BATCH)
    assert got.shape == BATCH.shape, f"normalize_rows changed the shape to {got.shape}; it should stay {BATCH.shape}."
    assert np.allclose(got.mean(axis=1), 0), (
        f"Row means are {np.round(got.mean(axis=1), 3).tolist()}; each should be 0. "
        "Reduce along axis 1 with keepdims=True so the (4, 1) result broadcasts against (4, 3)."
    )
    assert np.allclose(got.std(axis=1), 1), f"Row standard deviations are {np.round(got.std(axis=1), 3).tolist()}; each should be 1."


def test_relu():
    x = np.array([[-2.0, 0.5], [3.0, -0.1]])
    got = call(exercises.relu, x)
    assert got.tolist() == [[0.0, 0.5], [3.0, 0.0]], f"relu gave {got.tolist()}; negatives should become 0 and the rest stay."
    assert x.tolist() == [[-2.0, 0.5], [3.0, -0.1]], "relu changed its input; return a new array instead."


def test_predict_classes():
    scores = np.array([[0.1, 0.7, 0.2], [0.9, 0.05, 0.05], [0.2, 0.2, 0.6]])
    got = call(exercises.predict_classes, scores)
    assert got.shape == (3,), f"predict_classes gave shape {got.shape}; expected one class per row, (3,)."
    assert got.tolist() == [1, 0, 2], f"predict_classes gave {got.tolist()}; expected [1, 0, 2], the column of each row's highest score."


def test_pairwise_scores():
    queries = np.arange(6.0).reshape(2, 3)
    keys = np.arange(12.0).reshape(4, 3)
    got = call(exercises.pairwise_scores, queries, keys)
    assert got.shape == (2, 4), f"pairwise_scores gave shape {got.shape}; expected (2, 4), one score per query-key pair. Try queries @ keys.T."
    assert got[1, 2] == queries[1] @ keys[2], f"pairwise_scores[1, 2] is {got[1, 2]}; expected queries[1] · keys[2] = {queries[1] @ keys[2]}."


def reference_row_norms(X):
    norms = np.empty(len(X))
    for i in range(len(X)):
        total = 0.0
        for value in X[i]:
            total += value * value
        norms[i] = total ** 0.5
    return norms


def fastest_seconds(function, X, repeats=3):
    best = float("inf")
    for _ in range(repeats):
        start = time.perf_counter()
        function(X)
        best = min(best, time.perf_counter() - start)
    return best


def test_row_norms():
    X = np.random.default_rng(0).normal(size=(4000, 50))
    got = call(exercises.row_norms, X)
    assert got.shape == (4000,), f"row_norms gave shape {got.shape}; expected one length per row, (4000,)."
    assert np.allclose(got, np.sqrt((X ** 2).sum(axis=1))), "row_norms gives the wrong lengths: square, sum along axis 1, then square root."
    loop = fastest_seconds(reference_row_norms, X)
    yours = fastest_seconds(exercises.row_norms, X)
    assert yours * 10 <= loop, (
        f"row_norms took {yours * 1000:.1f} ms against the loop's {loop * 1000:.1f} ms; "
        "it needs to be at least 10× faster. Replace both loops with one expression over the whole array."
    )


def test_scaled_head_values():
    x = np.arange(6.0)
    got = exercises.scaled_head(x, 3, 10.0)
    assert got.tolist() == [0.0, 10.0, 20.0], f"scaled_head(x, 3, 10) gave {got.tolist()}; expected [0, 10, 20]."


def test_scaled_head_leaves_input_alone():
    x = np.arange(6.0)
    exercises.scaled_head(x, 3, 10.0)
    assert x.tolist() == [0.0, 1.0, 2.0, 3.0, 4.0, 5.0], (
        f"After scaled_head(x, 3, 10) the caller's x is {x.tolist()}. x[:n] is a view, so *= wrote "
        "into x itself. Multiply into a new array (x[:n] * factor) or take a .copy() first."
    )
