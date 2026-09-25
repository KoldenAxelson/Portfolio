"""Chapter 4 workbook: Tables.

Three parts. Replace every `raise NotImplementedError` and fix the two
functions marked FIX, then run `pytest`.

Parts 1 and 3 get a small table of training runs like this one, with the run
names as the index:

         model    lr  epochs  accuracy
    run
    r1     cnn  0.10    10.0      0.91
    r2     mlp  0.01     NaN      0.82
    r3     mlp  0.05    20.0       NaN
    ...
"""
from pathlib import Path

import numpy as np
import pandas as pd

# ── Part 1: write the line ───────────────────────────────────────────────
# Each of these is one line of pandas.

def label_block(df: pd.DataFrame) -> pd.DataFrame:
    """The rows labelled r2 through r4, both included, and only the columns
    model and lr, selected by label."""
    raise NotImplementedError("label_block: select by label, rows and columns together")


def first_and_last(df: pd.DataFrame) -> pd.DataFrame:
    """The first and the last row, with every column, selected by position."""
    raise NotImplementedError("first_and_last: select by position")


def missing_per_column(df: pd.DataFrame) -> pd.Series:
    """How many values are missing in each column: a Series with one count
    per column name."""
    raise NotImplementedError("missing_per_column: find the gaps, then add them up")


def model_counts(df: pd.DataFrame) -> pd.Series:
    """How many runs used each model, most common first: a Series indexed by
    the model names."""
    raise NotImplementedError("model_counts: count the distinct values of one column")


def feature_matrix(df: pd.DataFrame) -> np.ndarray:
    """The lr and epochs columns, in that order, as a NumPy array of shape
    (rows, 2), ready to hand to a model."""
    raise NotImplementedError("feature_matrix: select two columns, then leave pandas")


# ── Part 2: clean the CSV ────────────────────────────────────────────────

def clean_runs(path: Path) -> pd.DataFrame:
    """Load data/runs.csv (passed in as `path`) and clean it:

    1. The run column is the index. A '?' in the file means the value is
       missing, just like an empty field (read_csv's na_values= option).
    2. Keep only the columns model, lr, epochs and accuracy, in that order.
    3. Drop the runs with no accuracy: they can't be compared.
    4. A missing epochs means the default of 10. Fill those in, then make
       epochs a whole-number column (int64).
    5. Add a column steps: epochs × 100 (100 batches in every epoch).

    Keep the rows in the order they are in the file. The test compares your
    table with the one it expects and explains every difference.
    """
    raise NotImplementedError("clean_runs: read_csv, select the columns, dropna, fillna, astype, assign")


# ── Part 3: fix the bugs ─────────────────────────────────────────────────

def split_by_accuracy(df: pd.DataFrame, threshold: float) -> tuple[pd.DataFrame, pd.DataFrame]:
    """FIX: split the runs into (passed, failed). passed holds the runs with
    accuracy >= threshold; failed holds every other run, including the ones
    with no accuracy recorded. Every run must land in exactly one of the two,
    but this version loses some, and it doesn't say so."""
    passed = df[df["accuracy"] >= threshold]
    failed = df[df["accuracy"] < threshold]
    return passed, failed


def with_accuracy(df: pd.DataFrame, run: str, value: float) -> pd.DataFrame:
    """FIX: a copy of df with the accuracy of `run` set to `value`, leaving df
    itself unchanged. This version hands back a table in which nothing
    changed (run pytest and read the warning)."""
    result = df.copy()
    result["accuracy"][run] = value
    return result
