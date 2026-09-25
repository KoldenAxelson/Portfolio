"""Checks for the Chapter 6 workbook. Run `pytest` in this folder."""
from pathlib import Path

import matplotlib

# Agg draws to files only: no window opens while the tests run.
matplotlib.use("Agg")

import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
import pytest  # noqa: E402
from matplotlib.axes import Axes  # noqa: E402
from matplotlib.figure import Figure  # noqa: E402

import exercises  # noqa: E402

DATA = Path(__file__).parent / "data"
TRAINING_LOG = DATA / "training-log.csv"
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
NO_LINES = "plot_log drew no lines. ax.plot(x, y) draws a line through the points (scatter draws only dots)."

# What an error means, found from its message, so a crash fails with a reason.
MESSAGE_HINTS = [
    ("'Text' object is not callable", "ax.title is the title's Text object, not a function; set it with ax.set_title('…')."),
    ("has no attribute 'xlabel'", "On an Axes the method is set_xlabel (plt.xlabel is the pyplot version)."),
    ("has no attribute 'ylabel'", "On an Axes the method is set_ylabel (plt.ylabel is the pyplot version)."),
    ("has no attribute 'yscale'", "On an Axes the method is set_yscale (plt.yscale is the pyplot version)."),
    ("has no attribute 'title'", "Title an Axes with ax.set_title('…')."),
    ("has no attribute 'savefig'", "savefig belongs to the Figure: fig.savefig(out_path), or ax.figure.savefig(out_path)."),
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
    except (KeyError, IndexError, TypeError, ValueError, AttributeError, FileNotFoundError) as error:
        first_line = (str(error).strip().splitlines() or [""])[0].rstrip(".")
        pytest.fail(f"{function.__name__} raised {type(error).__name__}: {first_line}. {slip_hint(error)}".rstrip())


def expect_figure(value, name):
    if isinstance(value, Figure):
        return value
    hints = {
        Axes: "That's an Axes; return the Figure it sits in, fig (or ax.figure).",
        tuple: "Return just the Figure, fig, not (fig, ax).",
        type(None): "End the function with return fig.",
    }
    hint = next((text for kind, text in hints.items() if isinstance(value, kind)), "")
    pytest.fail(f"{name} returned {type(value).__name__}, not a matplotlib Figure. {hint}".rstrip())


@pytest.fixture(autouse=True)
def close_figures():
    yield
    plt.close("all")


# ── Part 1 ───────────────────────────────────────────────────────────────

def plotted_lines(fig, log):
    """(train line, val line) from the figure, found by their y values."""
    lines = [line for ax in fig.axes for line in ax.get_lines()]
    assert lines, NO_LINES

    def find(column):
        wanted = log[column].to_numpy()
        for line in lines:
            ys = np.asarray(line.get_ydata(), dtype=float)
            if ys.shape == wanted.shape and np.allclose(ys, wanted):
                return line
        pytest.fail(
            f"No line in the figure has the {column} values from the file ({len(wanted)} points, starting "
            f"{wanted[:3].tolist()}). Plot both columns, train_loss and val_loss, on the same Axes."
        )

    return find("train_loss"), find("val_loss")


def check_plot(fig, log, out_path):
    assert out_path.exists(), (
        f"Nothing was written to {out_path.name}. Save the figure to the path you were given: fig.savefig(out_path)."
    )
    head = out_path.read_bytes()[:8]
    assert head == PNG_SIGNATURE, (
        f"{out_path.name} isn't a PNG (it starts {head!r}). savefig picks the format from the extension: "
        "save to out_path as given, without format='svg' or another extension."
    )
    train, val = plotted_lines(fig, log)
    ax = train.axes
    assert val.axes is ax, "The two lines are on different Axes; draw both on the same one so they can be compared."
    xs = np.asarray(train.get_xdata(), dtype=float)
    epochs = log["epoch"].to_numpy()
    assert np.array_equal(xs, epochs), (
        f"The train line's x values start {xs[:3].tolist()}; expected the epochs from the file, starting "
        f"{epochs[:3].tolist()}. "
        "Given only y, ax.plot counts from 0: pass the epochs as x, ax.plot(log['epoch'], log['train_loss'])."
    )
    assert "epoch" in ax.get_xlabel().lower(), (
        f"The x label is {ax.get_xlabel()!r}; expected 'epoch'. Label it with ax.set_xlabel('epoch')."
    )
    assert "loss" in ax.get_ylabel().lower(), (
        f"The y label is {ax.get_ylabel()!r}; expected 'loss'. Label it with ax.set_ylabel('loss')."
    )
    suptitle = fig.get_suptitle()
    assert ax.get_title().strip() or suptitle.strip(), "The plot has no title. Give it one with ax.set_title('…')."
    legend = ax.get_legend()
    assert legend is not None, (
        "The Axes has no legend. Give each line a label= when you plot it, then call ax.legend()."
    )
    names = [text.get_text() for text in legend.get_texts()]
    assert any("train" in name.lower() for name in names) and any("val" in name.lower() for name in names), (
        f"The legend reads {names}; expected one entry for train and one for validation. "
        "legend() uses each line's label=, so call it after both ax.plot calls."
    )


def test_plot_log(tmp_path):
    out_path = tmp_path / "loss.png"
    fig = expect_figure(call(exercises.plot_log, TRAINING_LOG, out_path), "plot_log")
    check_plot(fig, pd.read_csv(TRAINING_LOG), out_path)


def test_plot_log_reads_the_path_it_is_given(tmp_path):
    shorter = pd.read_csv(TRAINING_LOG).iloc[:8]
    log_path = tmp_path / "eight-epochs.csv"
    shorter.to_csv(log_path, index=False)
    out_path = tmp_path / "short.png"
    fig = expect_figure(call(exercises.plot_log, log_path, out_path), "plot_log")
    lines = [line for ax in fig.axes for line in ax.get_lines()]
    assert lines, NO_LINES
    longest = max(len(line.get_ydata()) for line in lines)
    assert longest == len(shorter), (
        f"Given an 8-epoch log, plot_log drew {longest} points per line. Read the file at log_path, "
        "not data/training-log.csv."
    )
    check_plot(fig, shorter, out_path)


# ── Part 2 ───────────────────────────────────────────────────────────────

def describe(table):
    """Why each run gets its label, in numbers read from data/runs.csv."""
    train, val = table["train"], table["val"]
    best = int(val.idxmin())
    return {
        "underfitting": (
            f"both losses stop falling early, near {train.iloc[-1]:.2f} and {val.iloc[-1]:.2f}, and stay close "
            "together: the model can't fit even the training data. A bigger model would help; more epochs of the same won't"),
        "overfitting": (
            f"train loss keeps falling, to {train.iloc[-1]:.2f}, but validation is lowest at epoch {best} "
            f"({val.min():.2f}) and climbs to {val.iloc[-1]:.2f} after it: the model is fitting the training "
            "examples themselves"),
        "learning rate too high": (
            f"the loss jumps up and down from epoch to epoch and ends higher than it started "
            f"({train.iloc[0]:.2f} → {train.iloc[-1]:.2f}): each step overshoots. A smaller learning rate settles it"),
    }


EXPECTED = {"a": "underfitting", "b": "overfitting", "c": "learning rate too high"}


@pytest.mark.parametrize("run", ["a", "b", "c"])
def test_diagnose(run):
    got = call(exercises.diagnose)
    assert isinstance(got, dict), f"diagnose returned {type(got).__name__}; expected a dict like {{'a': 'underfitting', …}}."
    assert run in got, f"diagnose has no entry for run {run!r}; expected keys 'a', 'b' and 'c'."
    label = got[run]
    assert isinstance(label, str) and label.strip().lower() in exercises.LABELS, (
        f"Run {run} is labelled {label!r}; pick one of LABELS: {', '.join(repr(name) for name in exercises.LABELS)}."
    )
    expected = EXPECTED[run]
    table = exercises.load_runs()[run]
    why = describe(table)[expected]
    assert label.strip().lower() == expected, f"You labelled run {run} {label!r}, but it's {expected}: {why}."


# ── Part 3 ───────────────────────────────────────────────────────────────

@pytest.mark.parametrize("scales", [("linear", "log"), ("log", "linear")])
def test_compare_scales(scales):
    log = pd.read_csv(TRAINING_LOG)
    fig = expect_figure(call(exercises.compare_scales, log, scales), "compare_scales")
    assert len(fig.axes) == 2, f"The figure has {len(fig.axes)} Axes; expected 2, side by side: plt.subplots(1, 2)."
    left, right = fig.axes
    left_box, right_box = left.get_position(), right.get_position()
    assert left_box.y0 == right_box.y0 and left_box.x0 < right_box.x0, (
        "The two Axes should sit side by side, left then right, in one row: plt.subplots(1, 2)."
    )
    for side, ax in (("left", left), ("right", right)):
        assert ax.get_lines(), f"The {side} Axes has no line; plot the train loss on both."
    titles = [left.get_title(), right.get_title()]
    wanted = list(scales)
    got = [left.get_yscale(), right.get_yscale()]
    assert titles == wanted and got == wanted, (
        f"With scales={scales}, the left Axes has title {titles[0]!r} and a {got[0]} scale, the right one "
        f"{titles[1]!r} and {got[1]}; expected {wanted[0]!r} and {wanted[0]}, then {wanted[1]!r} and {wanted[1]}. "
        "Call ax.set_title(scale) and ax.set_yscale(scale) on the Axes the loop is on (plt.title and plt.yscale "
        "change the current Axes, the last one plt.subplots made)."
    )
