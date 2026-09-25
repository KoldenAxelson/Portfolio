"""Checks for the Chapter NN workbook. Run `pytest` in this folder."""
import pytest

import exercises


def test_first_exercise():
    try:
        got = exercises.first_exercise([1, 2, 3])
    except NotImplementedError:
        pytest.fail("first_exercise isn't written yet: replace its `raise NotImplementedError`.")
    assert got == [1, 4, 9], (
        f"first_exercise([1, 2, 3]) returned {got!r}; expected [1, 4, 9], "
        "each value squared, in the same order."
    )
