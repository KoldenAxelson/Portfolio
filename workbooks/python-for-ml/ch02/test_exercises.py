"""Checks for the Chapter 2 workbook. Run `pytest` in this folder."""
import numpy as np
import pytest

import exercises

a = np.arange(12).reshape(3, 4)

# Why each shape is what it is, shown when a prediction is wrong.
WHY = {
    "a[2]": "a single index drops its axis, leaving one row of 4",
    "a[2:]": "a slice keeps its axis, even when it keeps only one row",
    "a[:, 0]": "a single index on axis 1 drops that axis, leaving one value per row",
    "a[:, :1]": "a slice on axis 1 keeps the axis, so the column stays 2-D",
    "a[1, 3]": "one position per axis picks a single value, whose shape is ()",
    "a[a > 7]": "a boolean mask the same shape as a gives back 1-D; 8, 9, 10 and 11 pass",
    "a[[0, 0, 2]]": "fancy indexing returns one row per listed position, repeats included",
    "a.reshape(6, -1)": "12 values in 6 rows leaves 2 columns",
    "a.reshape(-1)": "-1 alone means 'all of it in one axis'",
    "a.T": "transpose reverses the axes, so (3, 4) becomes (4, 3)",
    "a.T[1:]": "a.T is (4, 3); the slice drops its first row",
    "a.ravel()[::4]": "ravel gives 12 values; every 4th is 0, 4 and 8",
}


def call(function, *args):
    """Run an exercise, turning an unwritten one into a plain failure."""
    try:
        return function(*args)
    except NotImplementedError as todo:
        pytest.fail(f"Not written yet: {todo}")


@pytest.mark.parametrize("expression", list(exercises.PREDICTIONS))
def test_predict_shape(expression):
    guess = exercises.PREDICTIONS[expression]
    if guess is None:
        pytest.fail(f"Predict the shape of {expression} in PREDICTIONS (a tuple, e.g. (3, 4)).")
    if not isinstance(guess, tuple):
        pytest.fail(f"{expression}: write the shape as a tuple, like (4,) or (3, 4), not {guess!r}.")
    actual = np.shape(eval(expression, {"a": a, "np": np}))
    assert guess == actual, f"{expression}: you predicted {guess}, but it is {actual}: {WHY[expression]}."


def test_make_grid():
    got = call(exercises.make_grid, 2, 3)
    assert isinstance(got, np.ndarray), "make_grid should return an ndarray."
    assert got.shape == (2, 3), f"make_grid(2, 3) has shape {got.shape}; expected (2, 3)."
    assert got.tolist() == [[0, 1, 2], [3, 4, 5]], (
        f"make_grid(2, 3) is {got.tolist()}; expected 0..5 in reading order, [[0, 1, 2], [3, 4, 5]]."
    )


def test_evenly_spaced():
    got = call(exercises.evenly_spaced, 0.0, 1.0, 5)
    expected = [0.0, 0.25, 0.5, 0.75, 1.0]
    assert np.shape(got) == (5,), (
        f"evenly_spaced(0, 1, 5) has shape {np.shape(got)}; expected (5,): exactly `count` points, both ends included."
    )
    assert np.allclose(got, expected), (
        f"evenly_spaced(0, 1, 5) is {np.round(got, 3).tolist()}; expected {expected}: "
        "five points, both ends included."
    )


def test_seeded_noise():
    first = call(exercises.seeded_noise, 7, (2, 3))
    again = call(exercises.seeded_noise, 7, (2, 3))
    other = call(exercises.seeded_noise, 8, (2, 3))
    assert np.shape(first) == (2, 3), (
        f"seeded_noise(7, (2, 3)) has shape {np.shape(first)}; expected (2, 3): pass the shape to the random method."
    )
    assert np.array_equal(first, again), "The same seed gave different numbers: make a fresh generator from the seed on every call."
    assert not np.array_equal(first, other), "Seeds 7 and 8 gave the same numbers: pass the seed to np.random.default_rng."
    assert ((first >= 0) & (first < 1)).all(), "Values should be floats in [0, 1): use the generator's random method."


def test_last_column():
    got = call(exercises.last_column, a)
    assert got.shape == (3,), f"last_column(a) has shape {got.shape}; expected (3,): a single index drops the axis."
    assert got.tolist() == [3, 7, 11], f"last_column(a) is {got.tolist()}; expected the last column, [3, 7, 11]."


def test_last_column_2d():
    got = call(exercises.last_column_2d, a)
    assert got.shape == (3, 1), (
        f"last_column_2d(a) has shape {got.shape}; expected (3, 1): slice the column (-1:) so the axis stays."
    )
    assert got.ravel().tolist() == [3, 7, 11], f"last_column_2d(a) holds {got.ravel().tolist()}; expected 3, 7 and 11."


def test_every_other_row():
    tall = np.arange(20).reshape(5, 4)
    got = call(exercises.every_other_row, tall)
    assert got.shape == (3, 4), f"every_other_row on 5 rows has shape {got.shape}; expected rows 0, 2 and 4, shape (3, 4)."
    assert got[:, 0].tolist() == [0, 8, 16], f"Its rows start {got[:, 0].tolist()}; expected rows 0, 2 and 4, starting 0, 8 and 16."


def test_values_above():
    got = call(exercises.values_above, a, 8)
    assert isinstance(got, np.ndarray), "values_above should return an ndarray: index a with a mask, a[a > threshold]."
    assert got.ndim == 1, f"values_above returned {got.ndim}-D; a mask the same shape as a gives back 1-D."
    assert got.tolist() == [9, 10, 11], f"values_above(a, 8) is {got.tolist()}; expected [9, 10, 11], the values greater than 8."


def test_rows_in_order():
    got = call(exercises.rows_in_order, a, [2, 0, 2])
    assert got.shape == (3, 4), f"rows_in_order(a, [2, 0, 2]) has shape {got.shape}; expected one row per position, (3, 4)."
    assert got[:, 0].tolist() == [8, 0, 8], f"Its rows start {got[:, 0].tolist()}; expected rows 2, 0, 2, which start 8, 0, 8."


def test_as_rows():
    got = call(exercises.as_rows, np.arange(12), 3)
    assert got.shape == (4, 3), f"as_rows(np.arange(12), 3) has shape {got.shape}; expected (4, 3): 12 values, 3 per row."
    assert got[1].tolist() == [3, 4, 5], f"Its row 1 is {got[1].tolist()}; expected [3, 4, 5]: values stay in reading order."


def test_top_rows():
    scores = np.array([
        [70, 80, 90],   # 240
        [95, 99, 91],   # 285
        [50, 60, 55],   # 165
        [88, 85, 90],   # 263
    ])
    got = call(exercises.top_rows, scores, 2)
    assert got.shape == (2, 3), f"top_rows(scores, 2) has shape {got.shape}; expected (2, 3), two whole rows."
    assert got.tolist() == [[95, 99, 91], [88, 85, 90]], (
        f"top_rows(scores, 2) is {got.tolist()}; expected the rows totalling 285 and then 263, "
        "highest first."
    )
