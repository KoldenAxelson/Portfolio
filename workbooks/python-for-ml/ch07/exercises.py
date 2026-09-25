"""Chapter 7 workbook: The Estimator Pattern.

Three parts. Fix the function marked FIX, and replace every
`raise NotImplementedError`, then run `pytest`.
"""
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

DATA = Path(__file__).parent / "data"


# ── Part 1: fix the bug ──────────────────────────────────────────────────

def split_and_score(X: np.ndarray, y: np.ndarray, seed: int = 0) -> float:
    """FIX: hold out a test set with train_test_split(X, y, random_state=seed)
    (its default size, a quarter of the rows), scale the features with a
    StandardScaler, fit a LogisticRegression on the training rows, and return
    its accuracy on the test rows.

    This version scales before it splits, so the scaler learns its mean and
    spread from the test rows too: data leakage. Make the scaler learn from
    the training rows only."""
    X_scaled = StandardScaler().fit_transform(X)
    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, random_state=seed)
    model = LogisticRegression().fit(X_train, y_train)
    return model.score(X_test, y_test)


# ── Part 2: build a baseline ─────────────────────────────────────────────

FEATURES = ["gpu", "framework", "batch_size", "hours"]
TARGET = "failed"


def load_jobs(path: Path = DATA / "jobs.csv") -> pd.DataFrame:
    """Provided. 600 made-up training jobs: gpu and framework (text),
    batch_size and hours (numbers), and failed (1 if the job failed)."""
    return pd.read_csv(path)


def split_jobs(jobs: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Provided. The fixed split the test uses: (train, test), 450 and 150 rows."""
    return train_test_split(jobs, random_state=0)


def train_baseline(train: pd.DataFrame) -> Pipeline:
    """Fit and return a Pipeline that predicts `failed` from the four
    FEATURES columns of a table like `train`.

    The text columns, gpu and framework, need a OneHotEncoder and the number
    columns a StandardScaler; a ColumnTransformer sends each list of columns
    to its own one. End the Pipeline with a classifier (LogisticRegression is
    a good start).

    The test fits it on split_jobs(load_jobs())'s train rows, then wants:
    - model.predict(test[FEATURES]) to be right on more than 78% of the test rows;
    - a prediction, not an error, for a GPU the training rows never had."""
    raise NotImplementedError("train_baseline: a ColumnTransformer and a classifier in a Pipeline, fit on train")


# ── Part 3: read a confusion matrix ──────────────────────────────────────

def precision_recall(matrix: np.ndarray, positive: int) -> tuple[float, float]:
    """Return (precision, recall) for class `positive`, read off `matrix`,
    a confusion matrix laid out the way confusion_matrix(y_true, y_pred)
    returns it: row i holds the rows whose true class is i, column j the
    rows predicted as class j.

    precision: of the rows predicted `positive`, the share that truly are.
    recall: of the rows that truly are `positive`, the share predicted so.

    Both as plain floats. Every matrix the test passes has at least one row
    predicted, and one truly, in each class."""
    raise NotImplementedError("precision_recall: read the positive class's cell, its column and its row")
