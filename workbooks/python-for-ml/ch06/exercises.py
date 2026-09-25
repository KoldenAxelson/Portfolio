"""Chapter 6 workbook: Seeing the Data.

Three parts. Replace every `raise NotImplementedError`, and fix the function
marked FIX, then run `pytest`.
"""
from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd
from matplotlib.figure import Figure

DATA = Path(__file__).parent / "data"


# ── Part 1: plot a training log ──────────────────────────────────────────

def plot_log(log_path: Path, out_path: Path) -> Figure:
    """Plot the training log at `log_path` (a CSV like data/training-log.csv,
    with columns epoch, train_loss and val_loss), save the plot to `out_path`
    as a PNG, and return the Figure.

    The plot needs:
    - one line for train_loss and one for val_loss, against the epoch
      numbers from the file (1, 2, 3…);
    - axis labels: 'epoch' along the bottom and 'loss' up the side;
    - a title;
    - a legend naming both lines (train and validation, or the column names).
    """
    raise NotImplementedError("plot_log: read the CSV, plot both losses against epoch, label, title, legend, savefig")


# ── Part 2: read three loss curves ───────────────────────────────────────

LABELS = ("overfitting", "learning rate too high", "underfitting")


def load_runs(path: Path = DATA / "runs.csv") -> dict[str, pd.DataFrame]:
    """Provided. The three training runs in data/runs.csv as {'a': …, 'b': …,
    'c': …}, each a table indexed by epoch with columns train and val."""
    wide = pd.read_csv(path, index_col="epoch")
    return {
        run: wide[[f"{run}_train", f"{run}_val"]].set_axis(["train", "val"], axis=1)
        for run in ("a", "b", "c")
    }


def diagnose() -> dict[str, str]:
    """Label each run in data/runs.csv with one of LABELS, as
    {'a': …, 'b': …, 'c': …}. Each label fits exactly one run.

    Look before you decide: plot each run's train and val loss (load_runs()
    gives you the tables, and plt.subplots(1, 3) gives you three Axes side by
    side), or read the numbers with print(load_runs()['a'])."""
    raise NotImplementedError("diagnose: plot the three runs, then label each one")


# ── Part 3: fix the bug ──────────────────────────────────────────────────

def compare_scales(log: pd.DataFrame, scales: tuple[str, str] = ("linear", "log")) -> Figure:
    """FIX: two Axes side by side, each showing the train loss by epoch, one
    per scale in `scales`, left to right, each titled with its scale's name:
    by default the left one linear and titled 'linear', the right one log and
    titled 'log'. Return the Figure.

    This version draws both lines, but the left Axes comes out with no title,
    and only the right one is ever changed."""
    fig, axs = plt.subplots(1, 2, figsize=(8, 3))
    for ax, scale in zip(axs, scales):
        ax.plot(log["epoch"], log["train_loss"])
        plt.yscale(scale)
        plt.title(scale)
    return fig
