"""Chapter 7 workbook: The Estimator Pattern. Solutions."""
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
    """Split first, then fit the scaler and the model on the training rows only."""
    X_train, X_test, y_train, y_test = train_test_split(X, y, random_state=seed)
    model = Pipeline([("scale", StandardScaler()), ("clf", LogisticRegression())])
    model.fit(X_train, y_train)
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
    """A Pipeline that predicts `failed` from the four FEATURES columns, fit on `train`."""
    prep = ColumnTransformer([
        ("onehot", OneHotEncoder(handle_unknown="ignore"), ["gpu", "framework"]),
        ("scale", StandardScaler(), ["batch_size", "hours"]),
    ])
    model = Pipeline([("prep", prep), ("clf", LogisticRegression())])
    return model.fit(train[FEATURES], train[TARGET])


# ── Part 3: read a confusion matrix ──────────────────────────────────────

def precision_recall(matrix: np.ndarray, positive: int) -> tuple[float, float]:
    """(precision, recall) for class `positive`: rows are the true class, columns the prediction."""
    hits = matrix[positive, positive]
    precision = hits / matrix[:, positive].sum()
    recall = hits / matrix[positive, :].sum()
    return float(precision), float(recall)
