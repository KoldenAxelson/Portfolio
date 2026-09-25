"""Checks for the Chapter 1 workbook. Run `pytest` in this folder.

The environment tests pass as soon as the course's virtual environment is set
up; every other test waits for you to write its exercise.
"""
import dataclasses
import importlib
import inspect
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

import exercises

HERE = Path(__file__).resolve().parent
RUNS_CSV = HERE / "data" / "runs.csv"
IMPORT_NAMES = {"scikit-learn": "sklearn"}


def requirements_file():
    """requirements.txt sits beside this file in the downloaded packet; in the
    course's source folder it is one level up, shared by every packet."""
    for folder in (HERE, *HERE.parents):
        if (folder / "requirements.txt").is_file():
            return folder / "requirements.txt"
    return None


def pinned_versions():
    path = requirements_file()
    if path is None:
        return {}
    pins = (line.split("#")[0].strip() for line in path.read_text().splitlines())
    return dict(pin.split("==") for pin in pins if "==" in pin)


PINS = pinned_versions()
SETUP_HINT = (
    "Activate the course's virtual environment (source ~/.venvs/python-for-ml/bin/activate, "
    "or the Windows line in the README) and run pip install -r requirements.txt."
)


def call(function, *args, **kwargs):
    """Run an exercise, turning an unwritten one into a plain failure."""
    try:
        return function(*args, **kwargs)
    except NotImplementedError as todo:
        pytest.fail(f"Not written yet: {todo}")


# ── Environment ──────────────────────────────────────────────────────────

def test_environment_python():
    assert sys.version_info >= (3, 12), (
        f"This is Python {sys.version.split()[0]} ({sys.executable}); the course needs 3.12 or newer. "
        "Make the virtual environment with a newer Python: python3 -m venv, or py -m venv on Windows."
    )


@pytest.mark.parametrize("package", sorted(PINS) or ["requirements.txt"])
def test_environment(package):
    if not PINS:
        pytest.fail("No requirements.txt next to this file: it comes in the downloaded packet.")
    module_name = IMPORT_NAMES.get(package, package)
    try:
        module = importlib.import_module(module_name)
    except ImportError:
        pytest.fail(f"{package} doesn't import in this Python ({sys.executable}). {SETUP_HINT}")
    # A CPU-only torch build reports a local suffix, like 2.14.0+cpu.
    installed = module.__version__.split("+")[0]
    assert installed == PINS[package], (
        f"{package} {installed} is installed, but requirements.txt pins {PINS[package]}. {SETUP_HINT}"
    )


# ── Part 1: read a file into lists, dicts and sets ───────────────────────

def rows():
    return call(exercises.read_rows, RUNS_CSV)


def test_read_rows():
    got = rows()
    if not isinstance(got, list):
        pytest.fail(f"read_rows returned a {type(got).__name__}; expected a list with one dict per data line.")
    assert len(got) == 8, f"read_rows returned {len(got)} rows; runs.csv has a header line and 8 data lines."
    assert isinstance(got[0], dict), f"Each row should be a dict, but the first is a {type(got[0]).__name__}."
    first = {"run": "a", "lr": "0.1", "epochs": "5", "loss": "0.42"}
    assert got[0] == first, (
        f"The first row is {got[0]!r}; expected {first!r}: the header's names as keys, "
        "the first data line's values as strings."
    )
    assert got[-1]["run"] == "h", f"The last row's run is {got[-1].get('run')!r}; expected 'h', the file's last line."


def test_read_rows_takes_any_path(tmp_path):
    other = tmp_path / "other.csv"
    other.write_text("x,y\n1,2\n")
    got = call(exercises.read_rows, other)
    assert got == [{"x": "1", "y": "2"}], (
        f"read_rows on a two-line file with header x,y gave {got!r}; expected [{{'x': '1', 'y': '2'}}]. "
        "Read the path you are given and take the column names from its header."
    )


# The next three tests build their rows here, so they don't depend on read_rows.
ROWS = [
    {"run": "a", "lr": "0.1", "epochs": "5", "loss": "0.42"},
    {"run": "b", "lr": "0.05", "epochs": "5", "loss": "0.31"},
    {"run": "c", "lr": "0.1", "epochs": "10", "loss": "1.12"},
    {"run": "d", "lr": "0.3", "epochs": "5", "loss": "12.5"},
]


def test_runs_below():
    try:
        got = call(exercises.runs_below, ROWS, 0.5)
    except TypeError as error:
        pytest.fail(
            f"runs_below raised TypeError ({error}). The losses in rows are strings, and Python "
            "won't compare a string with a float: convert each loss with float() first."
        )
    assert isinstance(got, list), f"runs_below returned a {type(got).__name__}; expected a list of run names."
    assert got == ["a", "b"], (
        f"runs_below(rows, 0.5) gave {got!r}; expected ['a', 'b']: the losses 0.42 and 0.31 are below 0.5 "
        "and 1.12 and 12.5 aren't. Convert each loss with float() before comparing."
    )
    below_two = call(exercises.runs_below, ROWS, 2.0)
    assert below_two == ["a", "b", "c"], (
        f"runs_below(rows, 2.0) gave {below_two!r}; expected ['a', 'b', 'c']. If 'd' (loss 12.5) is in it, "
        "the losses were compared as strings, where '12.5' sorts before '2.0'."
    )
    at_limit = call(exercises.runs_below, ROWS, 0.42)
    assert at_limit == ["b"], (
        f"runs_below(rows, 0.42) gave {at_limit!r}; expected ['b']: run a's loss is exactly 0.42, "
        "and below means strictly less than, so use < rather than <=."
    )


def test_loss_by_run():
    got = call(exercises.loss_by_run, ROWS)
    assert isinstance(got, dict), f"loss_by_run returned a {type(got).__name__}; expected a dict."
    assert all(isinstance(v, float) for v in got.values()), (
        f"loss_by_run gave {got!r}; the losses should be floats, not strings: convert with float()."
    )
    expected = {"a": 0.42, "b": 0.31, "c": 1.12, "d": 12.5}
    assert got == expected, f"loss_by_run gave {got!r}; expected {expected!r}."


def test_learning_rates():
    got = call(exercises.learning_rates, ROWS)
    assert isinstance(got, set), f"learning_rates returned a {type(got).__name__}; expected a set, which keeps each value once."
    assert got == {0.1, 0.05, 0.3}, (
        f"learning_rates gave {got!r}; expected {{0.1, 0.05, 0.3}}: two runs share lr 0.1, so it appears once, as a float."
    )


# ── Part 2: a dataclass and an f-string ──────────────────────────────────

FIELDS = [("name", str), ("lr", float), ("epochs", int), ("loss", float)]


def require_dataclass():
    if not dataclasses.is_dataclass(exercises.Run):
        pytest.fail("Run isn't a dataclass any more: keep the @dataclass line above class Run.")


def test_run_fields():
    require_dataclass()
    # A field's type is the class itself, or its name as a string under
    # `from __future__ import annotations`; compare names so both pass.
    got = [f"{field.name}: {getattr(field.type, '__name__', field.type)}" for field in dataclasses.fields(exercises.Run)]
    if not got:
        pytest.fail("Run has no fields yet: replace its `...` with name: str, lr: float, epochs: int, loss: float.")
    expected = [f"{name}: {kind.__name__}" for name, kind in FIELDS]
    assert got == expected, f"Run's fields are {', '.join(got)}; expected {', '.join(expected)}, in that order."


def test_to_run():
    require_dataclass()
    if not dataclasses.fields(exercises.Run):
        pytest.fail("Write the Run dataclass's fields first (test_run_fields).")
    got = call(exercises.to_run, ROWS[0])
    assert isinstance(got, exercises.Run), f"to_run returned a {type(got).__name__}; expected a Run."
    wrong = [f"{name} is {getattr(got, name)!r}" for name, kind in FIELDS if type(getattr(got, name)) is not kind]
    assert not wrong, (
        f"to_run(row) has {', '.join(wrong)}; each value should have its field's type. "
        "The dataclass doesn't convert anything, so call float() and int() yourself."
    )
    assert got == exercises.Run("a", 0.1, 5, 0.42), f"to_run gave {got!r}; expected Run(name='a', lr=0.1, epochs=5, loss=0.42)."


def test_describe():
    run = SimpleNamespace(name="e", lr=0.05, epochs=10, loss=0.26)
    got = call(exercises.describe, run)
    expected = "run e: lr=0.05, epochs=10, loss=0.260"
    assert got == expected, (
        f"describe gave {got!r}; expected {expected!r}. The loss needs exactly three decimals: {{run.loss:.3f}}."
    )


# ── Part 3: generators, unpacking, *args and **kwargs ────────────────────

def test_batches():
    got = call(exercises.batches, [1, 2, 3, 4, 5], 2)
    if not inspect.isgenerator(got):
        pytest.fail(
            f"batches returned a {type(got).__name__}; expected a generator. "
            "Use `yield` inside the loop instead of building and returning a list."
        )
    batches = list(got)
    assert batches == [[1, 2], [3, 4], [5]], (
        f"batches([1, 2, 3, 4, 5], 2) yielded {batches!r}; expected [[1, 2], [3, 4], [5]]: pairs, then the one left over."
    )
    assert list(exercises.batches([1, 2, 3, 4], 2)) == [[1, 2], [3, 4]], (
        "batches([1, 2, 3, 4], 2) should yield exactly two batches, with no empty one at the end."
    )


def test_best_and_rest():
    losses = [0.42, 0.26, 0.58, 0.31]
    got = call(exercises.best_and_rest, losses)
    if not (isinstance(got, tuple) and len(got) == 2):
        pytest.fail(f"best_and_rest returned {got!r}; expected a pair, (best, rest).")
    best, rest = got
    assert best == 0.26, f"best is {best!r}; expected 0.26, the lowest loss."
    assert rest == [0.31, 0.42, 0.58], f"rest is {rest!r}; expected [0.31, 0.42, 0.58], the others from lowest to highest, as a list."
    assert losses == [0.42, 0.26, 0.58, 0.31], "best_and_rest changed the caller's list; sort a copy with sorted() instead of .sort()."


def test_mean_loss():
    runs = [SimpleNamespace(loss=loss) for loss in (0.2, 0.4, 0.9)]
    got = call(exercises.mean_loss, *runs)
    assert got == pytest.approx(0.5), f"mean_loss(three runs with losses 0.2, 0.4, 0.9) gave {got!r}; expected 0.5."
    single = call(exercises.mean_loss, runs[0])
    assert single == pytest.approx(0.2), f"mean_loss(one run with loss 0.2) gave {single!r}; expected 0.2."


def test_mean_loss_needs_runs():
    try:
        exercises.mean_loss()
    except NotImplementedError as todo:
        pytest.fail(f"Not written yet: {todo}")
    except ValueError:
        return
    except ZeroDivisionError:
        pytest.fail("mean_loss() with no runs raised ZeroDivisionError; check for no runs first and raise ValueError.")
    pytest.fail("mean_loss() with no runs returned instead of raising ValueError.")


def test_merge_config():
    defaults = {"lr": 0.1, "epochs": 5}
    got = call(exercises.merge_config, defaults, lr=0.01)
    assert got == {"lr": 0.01, "epochs": 5}, f"merge_config(defaults, lr=0.01) gave {got!r}; expected {{'lr': 0.01, 'epochs': 5}}."
    assert defaults == {"lr": 0.1, "epochs": 5}, (
        f"merge_config changed the caller's defaults to {defaults!r}; build a new dict, e.g. {{**defaults, **overrides}}."
    )


def test_merge_config_rejects_typos():
    try:
        exercises.merge_config({"lr": 0.1}, lr_rate=0.01)
    except NotImplementedError as todo:
        pytest.fail(f"Not written yet: {todo}")
    except KeyError:
        return
    except Exception as other:
        pytest.fail(
            f"merge_config raised {type(other).__name__} for the misspelt lr_rate; "
            "expected KeyError, the error a missing dict key raises."
        )
    pytest.fail("merge_config({'lr': 0.1}, lr_rate=0.01) didn't raise KeyError; a misspelt setting should fail loudly.")
