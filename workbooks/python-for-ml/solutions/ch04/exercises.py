"""Chapter 4 workbook: Tables. Solutions."""
from pathlib import Path

import numpy as np
import pandas as pd

# ── Part 1: write the line ───────────────────────────────────────────────

def label_block(df: pd.DataFrame) -> pd.DataFrame:
    """The rows labelled r2 through r4, both included, and only the columns
    model and lr, selected by label."""
    return df.loc["r2":"r4", ["model", "lr"]]


def first_and_last(df: pd.DataFrame) -> pd.DataFrame:
    """The first and the last row, with every column, selected by position."""
    return df.iloc[[0, -1]]


def missing_per_column(df: pd.DataFrame) -> pd.Series:
    """How many values are missing in each column: a Series with one count
    per column name."""
    return df.isna().sum()


def model_counts(df: pd.DataFrame) -> pd.Series:
    """How many runs used each model, most common first: a Series indexed by
    the model names."""
    return df["model"].value_counts()


def feature_matrix(df: pd.DataFrame) -> np.ndarray:
    """The lr and epochs columns, in that order, as a NumPy array of shape
    (rows, 2), ready to hand to a model."""
    return df[["lr", "epochs"]].to_numpy()


# ── Part 2: clean the CSV ────────────────────────────────────────────────

def clean_runs(path: Path) -> pd.DataFrame:
    """Load data/runs.csv (passed in as `path`) and clean it: the run column
    as the index, '?' read as missing, only model, lr, epochs and accuracy,
    no runs without an accuracy, missing epochs filled with 10 and made int64,
    and a steps column of epochs × 100."""
    df = pd.read_csv(path, index_col="run", na_values=["?"])
    df = df[["model", "lr", "epochs", "accuracy"]]
    df = df.dropna(subset=["accuracy"])
    df = df.fillna({"epochs": 10}).astype({"epochs": "int64"})
    return df.assign(steps=df["epochs"] * 100)


# ── Part 3: fix the bugs ─────────────────────────────────────────────────

def split_by_accuracy(df: pd.DataFrame, threshold: float) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Split the runs into (passed, failed); a run with no accuracy fails.

    NaN >= threshold is False, and so is NaN < threshold, so the old version
    put a missing accuracy in neither table. Negating one mask keeps every
    run in exactly one of the two."""
    passes = df["accuracy"] >= threshold
    return df[passes], df[~passes]


def with_accuracy(df: pd.DataFrame, run: str, value: float) -> pd.DataFrame:
    """A copy of df with the accuracy of `run` set to `value`.

    result["accuracy"][run] = value was chained assignment: under
    copy-on-write the middle step is a copy, so the write went nowhere. One
    loc call writes into result itself."""
    result = df.copy()
    result.loc[run, "accuracy"] = value
    return result
