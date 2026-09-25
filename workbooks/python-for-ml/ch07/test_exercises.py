"""Checks for the Chapter 7 workbook. Run `pytest` in this folder."""
import numbers
from pathlib import Path

import numpy as np
import pandas as pd
import pytest
import sklearn.preprocessing
from sklearn.compose import ColumnTransformer
from sklearn.datasets import load_breast_cancer, make_classification
from sklearn.exceptions import NotFittedError
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

import exercises

JOBS_CSV = Path(__file__).parent / "data" / "jobs.csv"
FEATURES = ["gpu", "framework", "batch_size", "hours"]
TARGET = "failed"
TARGET_ACCURACY = 0.78

# What an error means, found from its message, so a crash fails with a reason.
MESSAGE_HINTS = [
    ("Found unknown categories", "The encoder raises on a category it never saw in fit. "
     "OneHotEncoder(handle_unknown='ignore') turns an unseen GPU into all zeros instead."),
    ("feature names should match", "The model was fit on other columns than the four it is asked to predict from. "
     "Fit it on train[FEATURES], all four, and let a ColumnTransformer choose which columns go to which step."),
    ("columns are missing", "The model was fit on columns the test rows don't have. "
     "Fit it on train[FEATURES] and train['failed'] as two arguments: model.fit(train[FEATURES], train[TARGET])."),
    ("could not convert string to float", "A text column reached a step that needs numbers. "
     "Send gpu and framework through a OneHotEncoder inside a ColumnTransformer."),
    ("inconsistent numbers of samples", "X and y must hold one label per row, taken from the same rows: split "
     "them in one call, train_test_split(X, y, random_state=seed), and fit on train[FEATURES] with train[TARGET]."),
    ("y should be a 1d array", "train_test_split(X, y) returns four arrays in the order X_train, X_test, "
     "y_train, y_test; unpack them in that order."),
    ("is not fitted yet", "Fit the Pipeline before you return it: model.fit(train[FEATURES], train[TARGET]) "
     "fits it and returns it."),
    ("out of bounds", "positive is a class number: 0 or 1 for a 2×2 matrix, 0 to 2 for a 3×3. "
     "matrix[positive, positive] is its diagonal cell."),
]


def slip_hint(error):
    message = str(error)
    return next((hint for text, hint in MESSAGE_HINTS if text in message), "")


def call(function, *args):
    """Run an exercise, turning an unwritten one, or one that raises, into a plain failure."""
    try:
        return function(*args)
    except NotImplementedError as todo:
        pytest.fail(f"Not written yet: {todo}")
    except (KeyError, IndexError, TypeError, ValueError, AttributeError, NotFittedError) as error:
        first_line = (str(error).strip().splitlines() or [""])[0].rstrip(".")
        pytest.fail(f"{function.__name__} raised {type(error).__name__}: {first_line}. {slip_hint(error)}".rstrip())


def is_number(value):
    return isinstance(value, numbers.Real) and not isinstance(value, bool)


# ── Part 1 ───────────────────────────────────────────────────────────────

class SpyScaler(StandardScaler):
    """A StandardScaler that notes the rows it was fit on."""

    fitted_on: list[np.ndarray] = []

    def partial_fit(self, X, y=None, sample_weight=None):
        # fit and fit_transform both end up here.
        SpyScaler.fitted_on.append(np.array(X, dtype=float))
        return super().partial_fit(X, y, sample_weight)


@pytest.fixture
def spy(monkeypatch):
    SpyScaler.fitted_on = []
    monkeypatch.setattr(exercises, "StandardScaler", SpyScaler)
    # Also catch sklearn.preprocessing.StandardScaler() and an import inside the function.
    monkeypatch.setattr(sklearn.preprocessing, "StandardScaler", SpyScaler)
    return SpyScaler


def datasets():
    """(name, X, y, seed): the lesson's data, then a generated set, so no number can be hard-coded."""
    cancer_X, cancer_y = load_breast_cancer(return_X_y=True)
    made_X, made_y = make_classification(n_samples=200, n_features=6, random_state=1)
    return [("breast cancer, seed 0", cancer_X, cancer_y, 0), ("generated, seed 3", made_X, made_y, 3)]


def row_set(rows):
    # float32, so a copy of X cast to float32 still matches its own rows.
    return {row.tobytes() for row in np.asarray(rows, dtype=np.float32)}


def leak_message(fitted, X, train_rows, test_rows, seed):
    """Why a scaler fit on `fitted` is wrong, or '' if it saw exactly the training rows."""
    seen = row_set(fitted)
    if seen == row_set(train_rows):
        return ""
    leaked = len(seen & row_set(test_rows))
    if len(fitted) == len(X) and leaked:
        return (f"A StandardScaler was fit on all {len(X)} rows, the {len(test_rows)} test rows included: that is "
                "the leak. Split first, then fit the scaler on the training rows only (a Pipeline does this for you).")
    if leaked == len(fitted):
        return (f"A StandardScaler was fit on the {len(test_rows)} test rows. Transform the test rows with the "
                "scaler fit on the training rows; fitting a new one lets the test rows set their own scaling.")
    return (f"A StandardScaler was fit on {len(fitted)} rows, but they aren't the {len(train_rows)} training rows "
            f"of train_test_split(X, y, random_state={seed}). Pass random_state=seed and nothing else (no test_size, "
            "no stratify), so the split is the one the test checks against.")


def test_split_and_score_fits_scaler_on_training_rows(spy):
    for name, X, y, seed in datasets():
        spy.fitted_on = []
        call(exercises.split_and_score, X, y, seed)
        assert spy.fitted_on, (
            f"On the {name} data, the test saw no StandardScaler being fit. Scale with the StandardScaler "
            "imported at the top of exercises.py, fit on the training rows."
        )
        train_rows, test_rows = train_test_split(X, random_state=seed)
        problems = [leak_message(fitted, X, train_rows, test_rows, seed) for fitted in spy.fitted_on]
        problem = next((text for text in problems if text), "")
        assert not problem, f"On the {name} data: {problem}"


def test_split_and_score_value():
    for name, X, y, seed in datasets():
        got = call(exercises.split_and_score, X, y, seed)
        if not is_number(got):
            pytest.fail(f"split_and_score returned {type(got).__name__}; expected one number, the test accuracy.")
        X_train, X_test, y_train, y_test = train_test_split(X, y, random_state=seed)
        model = Pipeline([("scale", StandardScaler()), ("clf", LogisticRegression())]).fit(X_train, y_train)
        expected = model.score(X_test, y_test)
        if got == pytest.approx(model.score(X_train, y_train)) and got != pytest.approx(expected):
            pytest.fail(f"On the {name} data, split_and_score returned {got:.3f}, the accuracy on the training rows. "
                        "Score the test rows: model.score(X_test, y_test).")
        assert got == pytest.approx(expected), (
            f"On the {name} data, split_and_score returned {got:.3f}; expected {expected:.3f}, the test accuracy of "
            f"a StandardScaler and a LogisticRegression (default settings) fit on the training rows of "
            f"train_test_split(X, y, random_state={seed})."
        )


# ── Part 2 ───────────────────────────────────────────────────────────────

def jobs_split():
    return train_test_split(pd.read_csv(JOBS_CSV), random_state=0)


def trained(train):
    model = call(exercises.train_baseline, train)
    if isinstance(model, Pipeline):
        return model
    hints = {
        ColumnTransformer: "That's the preprocessing alone; put it in a Pipeline with a classifier after it.",
        type(None): "End the function with return model.",
        tuple: "Return just the fitted Pipeline.",
    }
    hint = next((text for kind, text in hints.items() if isinstance(model, kind)), "Wrap the steps in a Pipeline.")
    pytest.fail(f"train_baseline returned {type(model).__name__}, not a Pipeline. {hint}")


def predictions(model, rows):
    try:
        predicted = np.asarray(model.predict(rows))
    except (KeyError, IndexError, TypeError, ValueError, AttributeError) as error:
        first_line = (str(error).strip().splitlines() or [""])[0].rstrip(".")
        pytest.fail(f"model.predict raised {type(error).__name__}: {first_line}. {slip_hint(error)}".rstrip())
    assert predicted.shape == (len(rows),), (
        f"model.predict gave shape {predicted.shape} for {len(rows)} rows; expected ({len(rows)},), one label per row."
    )
    return predicted


def test_train_baseline_accuracy():
    train, test = jobs_split()
    model = trained(train)
    predicted = predictions(model, test[FEATURES])
    accuracy = float(np.mean(predicted == test[TARGET].to_numpy()))
    assert accuracy > TARGET_ACCURACY, (
        f"The baseline is right on {accuracy:.3f} of the test rows; it needs more than {TARGET_ACCURACY}. "
        f"Always predicting 'didn't fail' scores {float(np.mean(test[TARGET] == 0)):.3f} and the two number "
        "columns alone about 0.65: the GPU and the framework carry most of the signal, so one-hot encode them "
        "(a OneHotEncoder in a ColumnTransformer) and scale batch_size and hours."
    )


def test_train_baseline_unseen_gpu():
    train, _ = jobs_split()
    model = trained(train)
    new_job = pd.DataFrame({"gpu": ["b200"], "framework": ["pytorch"], "batch_size": [64], "hours": [3.0]})
    predictions(model, new_job)


def test_train_baseline_learns_from_its_rows():
    train, test = jobs_split()
    flipped = train.assign(**{TARGET: 1 - train[TARGET]})
    model = trained(flipped)
    accuracy = float(np.mean(predictions(model, test[FEATURES]) == test[TARGET].to_numpy()))
    assert accuracy < 0.5, (
        f"Trained on a copy of the training rows with every label flipped, the model still scored {accuracy:.3f}, so "
        "it isn't learning from the table it's given. Fit on `train`, not on the whole CSV: that would put the "
        "test rows into training."
    )


# ── Part 3 ───────────────────────────────────────────────────────────────

# Chapter 7's forest on the breast cancer test rows, and a 3-class matrix.
FOREST = np.array([[52, 1], [3, 87]])
THREE_CLASS = np.array([[50, 3, 2], [4, 40, 6], [1, 8, 30]])


@pytest.mark.parametrize(
    ("matrix", "positive"),
    [(FOREST, 0), (FOREST, 1), (THREE_CLASS, 2)],
    ids=["2x2-class-0", "2x2-class-1", "3x3-class-2"],
)
def test_precision_recall(matrix, positive):
    got = call(exercises.precision_recall, matrix.copy(), positive)
    if not (isinstance(got, tuple) and len(got) == 2 and all(is_number(value) for value in got)):
        pytest.fail(f"precision_recall returned {got!r}; expected a tuple of two numbers: return precision, recall.")
    hits = matrix[positive, positive]
    precision = hits / matrix[:, positive].sum()
    recall = hits / matrix[positive, :].sum()
    shown = f"precision_recall({matrix.tolist()}, positive={positive}) returned ({got[0]:.3f}, {got[1]:.3f})"
    if got == pytest.approx((recall, precision)) and precision != pytest.approx(recall):
        pytest.fail(f"{shown}: precision and recall are swapped. Rows are the true class and columns the "
                    "prediction, so precision divides the diagonal cell by its column, recall by its row.")
    if got == (0, 0):
        pytest.fail(f"{shown}. // is floor division, which rounds every share below 1 down to 0; divide with /.")
    accuracy_like = hits / matrix.sum()
    if accuracy_like in (pytest.approx(got[0]), pytest.approx(got[1])):
        pytest.fail(f"{shown}: {accuracy_like:.3f} divides by every row in the matrix. Precision divides the "
                    "diagonal cell by its column's sum (everything predicted positive), recall by its row's sum.")
    assert got == pytest.approx((precision, recall)), (
        f"{shown}; expected ({precision:.3f}, {recall:.3f}): the cell matrix[{positive}, {positive}] divided by "
        f"its column's sum {matrix[:, positive].sum()} for precision and by its row's sum "
        f"{matrix[positive, :].sum()} for recall."
    )
