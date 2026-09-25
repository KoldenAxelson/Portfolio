"""Checks for the Chapter 4 workbook. Run `pytest` in this folder."""
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

import exercises

RUNS_CSV = Path(__file__).parent / "data" / "runs.csv"


def runs():
    """The small table Parts 1 and 3 work on: two runs miss epochs, one misses accuracy."""
    return pd.DataFrame(
        {
            "model": ["cnn", "mlp", "mlp", "rnn", "mlp", "cnn"],
            "lr": [0.1, 0.01, 0.05, 0.1, 0.05, 0.01],
            "epochs": [10.0, np.nan, 20.0, 5.0, 20.0, np.nan],
            "accuracy": [0.91, 0.82, np.nan, 0.71, 0.88, 0.95],
        },
        index=pd.Index(["r1", "r2", "r3", "r4", "r5", "r6"], name="run"),
    )


# What an error means in a given exercise, so a crash fails with a reason.
SLIP_HINTS = {
    ("label_block", TypeError): "loc takes labels ('r2':'r4'), not positions; positions need iloc.",
    ("first_and_last", KeyError): "loc looks up labels, and this index holds 'r1'…'r6'. Positions need iloc.",
    ("clean_runs", pd.errors.IntCastingNaNError): "An int64 column can't hold NaN: fill the missing epochs with 10 before astype({'epochs': 'int64'}).",
    ("split_by_accuracy", TypeError): "When you combine masks with | or &, put each comparison in brackets: (df['accuracy'] < threshold) | df['accuracy'].isna().",
    ("split_by_accuracy", ValueError): "and, or and not can't combine masks; use &, | and ~.",
    ("with_accuracy", TypeError): "Set one cell by its run name and column name in a single loc: result.loc[run, 'accuracy'] = value (iloc takes positions, not names).",
    ("with_accuracy", IndexError): "Set one cell by its run name and column name in a single loc: result.loc[run, 'accuracy'] = value (iloc takes positions, not names).",
}

# What the same error means in any exercise.
GENERAL_HINTS = {
    KeyError: "A KeyError names a label that isn't in the table: check the spelling, and put several column names in a list, df[['lr', 'epochs']].",
    IndexError: "Positions run from 0 to len(df) - 1, and -1 is the last row.",
    pd.errors.IndexingError: "loc and iloc take rows, then columns: to pick several columns, put them in a list, df.loc[rows, ['model', 'lr']].",
}


def slip_hint(name, error):
    """The most specific hint for this error in this exercise, or ''."""
    kinds = type(error).__mro__
    specific = [SLIP_HINTS[name, kind] for kind in kinds if (name, kind) in SLIP_HINTS]
    general = [GENERAL_HINTS[kind] for kind in kinds if kind in GENERAL_HINTS]
    return (specific + general + [""])[0]


def call(function, *args):
    """Run an exercise, turning an unwritten one, or one that raises, into a plain failure."""
    name = function.__name__
    try:
        return function(*args)
    except NotImplementedError as todo:
        pytest.fail(f"Not written yet: {todo}")
    except (KeyError, IndexError, TypeError, ValueError, pd.errors.IndexingError, pd.errors.InvalidIndexError) as error:
        pytest.fail(f"{name} raised {type(error).__name__}: {str(error).rstrip('.')}. {slip_hint(name, error)}".rstrip())


def expect_type(value, kind, name):
    if not isinstance(value, kind):
        wanted = "NumPy array (np.ndarray)" if kind is np.ndarray else kind.__name__
        pytest.fail(f"{name} returned {type(value).__name__}, not a {wanted}.")


# ── Part 1 ───────────────────────────────────────────────────────────────

def test_label_block():
    got = call(exercises.label_block, runs())
    expect_type(got, pd.DataFrame, "label_block")
    assert list(got.columns) == ["model", "lr"], (
        f"label_block has columns {list(got.columns)}; expected ['model', 'lr']: give loc the columns too, df.loc[rows, columns]."
    )
    assert list(got.index) == ["r2", "r3", "r4"], (
        f"label_block has rows {list(got.index)}; expected r2, r3 and r4. A label slice in loc includes its end."
    )
    extra_on_top = pd.concat([runs().iloc[[0]].rename(index={"r1": "r0"}), runs()])
    moved = call(exercises.label_block, extra_on_top)
    assert list(moved.index) == ["r2", "r3", "r4"], (
        f"On a table with one more run, r0, on top, label_block gave rows {list(moved.index)}. "
        "Select by label with loc, so the answer follows the labels rather than the positions."
    )


def test_first_and_last():
    got = call(exercises.first_and_last, runs())
    expect_type(got, pd.DataFrame, "first_and_last")
    assert list(got.index) == ["r1", "r6"], f"first_and_last has rows {list(got.index)}; expected the first and last, r1 and r6."
    assert list(got.columns) == list(runs().columns), f"first_and_last has columns {list(got.columns)}; expected all four."
    longer = pd.concat([runs(), runs().iloc[:2].rename(index={"r1": "r7", "r2": "r8"})])
    moved = call(exercises.first_and_last, longer)
    expect_type(moved, pd.DataFrame, "first_and_last")
    assert list(moved.index) == ["r1", "r8"], (
        f"On a table of 8 runs, first_and_last gave rows {list(moved.index)}; expected r1 and r8. "
        "Count the last row from the end, -1, so the answer holds for a table of any length."
    )


def test_missing_per_column():
    got = call(exercises.missing_per_column, runs())
    expect_type(got, pd.Series, "missing_per_column")
    expected = {"model": 0, "lr": 0, "epochs": 2, "accuracy": 1}
    assert got.to_dict() == expected, (
        f"missing_per_column gave {got.to_dict()}; expected {expected}. "
        "isna() marks each gap True, and sum() counts the Trues in each column (count() counts the values that are there)."
    )


def test_model_counts():
    got = call(exercises.model_counts, runs())
    expect_type(got, pd.Series, "model_counts")
    assert got.to_dict() == {"mlp": 3, "cnn": 2, "rnn": 1}, (
        f"model_counts gave {got.to_dict()}; expected mlp 3, cnn 2, rnn 1: one count per model name."
    )
    assert list(got.index) == ["mlp", "cnn", "rnn"], (
        f"model_counts is in the order {list(got.index)}; expected most common first, mlp, cnn, rnn, "
        "not alphabetical or in the order the models first appear."
    )


def test_feature_matrix():
    got = call(exercises.feature_matrix, runs())
    expect_type(got, np.ndarray, "feature_matrix")
    assert got.shape == (6, 2), f"feature_matrix has shape {got.shape}; expected (6, 2): one row per run, lr then epochs."
    expected = runs()[["lr", "epochs"]].to_numpy()
    wrong = [i for i in range(len(expected)) if not np.array_equal(got[i], expected[i], equal_nan=True)]
    if wrong:
        row = wrong[0]
        pytest.fail(
            f"feature_matrix's row {row} is {got[row].tolist()}; expected {expected[row].tolist()}: "
            "lr then epochs, straight from the table, with the gaps left as nan."
        )


# ── Part 2 ───────────────────────────────────────────────────────────────

EXPECTED = pd.DataFrame(
    {
        "model": ["cnn", "cnn", "mlp", "cnn", "rnn", "cnn", "mlp"],
        "lr": [0.1, 0.01, 0.1, 0.05, 0.1, 0.01, 0.05],
        "epochs": [10, 20, 10, 10, 5, 30, 10],
        "accuracy": [0.91, 0.94, 0.82, 0.93, 0.71, 0.95, 0.79],
        "steps": [1000, 2000, 1000, 1000, 500, 3000, 1000],
    },
    index=pd.Index(["r1", "r2", "r3", "r5", "r6", "r8", "r10"], name="run"),
)

DTYPE_HINTS = {
    "accuracy": "a '?' in the file makes pandas read the whole column as text. Pass na_values=['?'] to read_csv",
    "epochs": "fill the missing epochs with 10 first, then astype({'epochs': 'int64'})",
    "steps": "work it out from epochs after epochs is int64, so the product is whole numbers too",
    "lr": "it should come straight from the file",
    "model": "it should come straight from the file",
}


def raw_file():
    """The CSV as written, every field as text, so the test can say why a row matters."""
    return pd.read_csv(RUNS_CSV, index_col="run", dtype=str, keep_default_na=False)


def row_differences(got):
    raw = raw_file()
    notes = []
    for run in [r for r in got.index if r not in EXPECTED.index]:
        accuracy = raw.loc[run, "accuracy"] if run in raw.index else None
        if accuracy in ("", "?"):
            shown = "an empty field" if accuracy == "" else "'?'"
            notes.append(f"Row {run} should be gone: its accuracy is {shown} in the file, so it has none (dropna(subset=['accuracy'])).")
        else:
            notes.append(f"Row {run} isn't a run in the file.")
    for run in [r for r in EXPECTED.index if r not in got.index]:
        reason = "its epochs is missing, which should be filled with 10, not dropped" if raw.loc[run, "epochs"] == "" else "it has an accuracy"
        notes.append(f"Row {run} is missing: {reason}. Only the runs with no accuracy go.")
    same_rows = set(got.index) == set(EXPECTED.index)
    if same_rows and list(got.index) != list(EXPECTED.index):
        notes.append(f"The rows are in the order {list(got.index)}; keep the file's order, {list(EXPECTED.index)}.")
    return notes


def column_differences(got):
    notes = []
    if "run" in got.columns:
        notes.append("run is a column; it should be the index: pd.read_csv(path, index_col='run').")
    for column in [c for c in got.columns if c not in EXPECTED.columns and c != "run"]:
        notes.append(f"There is an extra column {column}; keep only model, lr, epochs and accuracy, then add steps.")
    for column in [c for c in EXPECTED.columns if c not in got.columns]:
        how = "add it with assign(steps=…)" if column == "steps" else "it comes from the file"
        notes.append(f"Column {column} is missing: {how}.")
    shared = [c for c in got.columns if c in EXPECTED.columns]
    if shared != [c for c in EXPECTED.columns if c in got.columns]:
        notes.append(f"The columns are in the order {list(got.columns)}; expected {list(EXPECTED.columns)}.")
    return notes


def value_differences(got):
    notes = []
    rows = [r for r in EXPECTED.index if r in got.index]
    for column in [c for c in EXPECTED.columns if c in got.columns]:
        expected_dtype = EXPECTED[column].dtype
        if got[column].dtype != expected_dtype:
            notes.append(f"Column {column} has dtype {got[column].dtype}; expected {expected_dtype}: {DTYPE_HINTS[column]}.")
            continue
        wrong = [r for r in rows if got.loc[r, column] != EXPECTED.loc[r, column]]
        for run in wrong[:3]:
            notes.append(f"{column} for {run} is {got.loc[run, column]}; expected {EXPECTED.loc[run, column]}.")
        if column == "epochs" and wrong:
            notes.append("A missing epochs means the default of 10.")
        if column == "steps" and wrong:
            notes.append("steps is epochs × 100.")
    return notes


def test_clean_runs():
    got = call(exercises.clean_runs, RUNS_CSV)
    expect_type(got, pd.DataFrame, "clean_runs")
    notes = column_differences(got)
    if got.index.name != "run":
        notes.append(f"The index is named {got.index.name!r} and holds {list(got.index)[:3]}…; pass index_col='run' to read_csv so the run names label the rows.")
    else:
        notes += row_differences(got) + value_differences(got)
    if notes:
        pytest.fail("clean_runs doesn't match the expected table yet:\n- " + "\n- ".join(notes))
    try:
        pd.testing.assert_frame_equal(got, EXPECTED)
    except AssertionError as difference:
        pytest.fail(f"clean_runs is close, but pandas still finds a difference: {difference}")


# ── Part 3 ───────────────────────────────────────────────────────────────

THRESHOLD = 0.88


def split():
    result = call(exercises.split_by_accuracy, runs(), THRESHOLD)
    if not (isinstance(result, tuple) and len(result) == 2):
        pytest.fail(f"split_by_accuracy returned {type(result).__name__}; expected a tuple (passed, failed).")
    passed, failed = result
    expect_type(passed, pd.DataFrame, "split_by_accuracy's passed")
    expect_type(failed, pd.DataFrame, "split_by_accuracy's failed")
    return passed, failed


def test_split_by_accuracy_keeps_every_run():
    passed, failed = split()
    accuracy = runs()["accuracy"]
    lost = [r for r in runs().index if r not in passed.index and r not in failed.index]
    lost_gaps = [r for r in lost if pd.isna(accuracy[r])]
    assert not lost_gaps, (
        f"{', '.join(lost_gaps)} landed in neither table. With no accuracy, the value is NaN, and "
        f"NaN >= {THRESHOLD} and NaN < {THRESHOLD} are both False, so each filter dropped it without a word. "
        "Build one mask and use it and its opposite (~mask), or add the missing runs to failed with isna()."
    )
    assert not lost, f"{', '.join(lost)} landed in neither table, though each has an accuracy; every run belongs in one."
    both = [r for r in passed.index if r in failed.index]
    assert not both, f"{', '.join(both)} landed in both tables; each run belongs in exactly one."


def test_split_by_accuracy_values():
    passed, failed = split()
    assert sorted(passed.index) == ["r1", "r5", "r6"], (
        f"passed holds {sorted(passed.index)}; expected r1, r5 and r6, the runs with accuracy >= {THRESHOLD} "
        f"(r5's is exactly {THRESHOLD}, and >= lets it pass)."
    )
    assert sorted(failed.index) == ["r2", "r3", "r4"], (
        f"failed holds {sorted(failed.index)}; expected r2 and r4 (below {THRESHOLD}) and r3 (no accuracy)."
    )


def test_with_accuracy_sets_value():
    got = call(exercises.with_accuracy, runs(), "r3", 0.9)
    expect_type(got, pd.DataFrame, "with_accuracy")
    value = got.loc["r3", "accuracy"]
    assert value == 0.9, (
        f"with_accuracy(df, 'r3', 0.9) left r3's accuracy at {value}. If it still says result['accuracy'][run] = value, that is "
        "chained assignment: under copy-on-write result['accuracy'] is a copy, so the write never reaches result "
        "(pandas warns ChainedAssignmentError). Write it in one step: result.loc[run, 'accuracy'] = value."
    )
    others = got["accuracy"].drop("r3")
    expected_others = runs()["accuracy"].drop("r3")
    assert others.equals(expected_others), (
        f"with_accuracy changed other runs too: their accuracies are {others.tolist()}, "
        f"expected {expected_others.tolist()}. Set the one cell, df.loc[run, 'accuracy']."
    )
    again = call(exercises.with_accuracy, runs(), "r5", 0.5)
    expect_type(again, pd.DataFrame, "with_accuracy")
    changed = [r for r in runs().index if not np.array_equal(
        again.loc[r, "accuracy"], 0.5 if r == "r5" else runs().loc[r, "accuracy"], equal_nan=True)]
    assert not changed, (
        f"with_accuracy(df, 'r5', 0.5) gave accuracies {again['accuracy'].tolist()}; expected only r5's to become 0.5. "
        "Find the cell by the run and column names, result.loc[run, 'accuracy'] = value, so it works for any run."
    )


def test_with_accuracy_leaves_input_alone():
    df = runs()
    call(exercises.with_accuracy, df, "r3", 0.9)
    assert pd.isna(df.loc["r3", "accuracy"]), (
        f"with_accuracy changed the caller's table too: r3's accuracy is now {df.loc['r3', 'accuracy']}. "
        "Copy it (df.copy()) and write into the copy."
    )
