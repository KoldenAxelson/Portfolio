"""Chapter 6 workbook: Seeing the Data. Solutions."""
from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd
from matplotlib.figure import Figure

DATA = Path(__file__).parent / "data"


# ── Part 1: plot a training log ──────────────────────────────────────────

def plot_log(log_path: Path, out_path: Path) -> Figure:
    """Plot the training log at `log_path` (a CSV like data/training-log.csv,
    with columns epoch, train_loss and val_loss), save the plot to `out_path`
    as a PNG, and return the Figure."""
    log = pd.read_csv(log_path, index_col="epoch")
    fig, ax = plt.subplots()
    ax.plot(log.index, log["train_loss"], label="train")
    ax.plot(log.index, log["val_loss"], label="validation")
    ax.set_xlabel("epoch")
    ax.set_ylabel("loss")
    ax.set_title("Train vs validation loss")
    ax.legend()
    fig.savefig(out_path, dpi=150)
    return fig


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
    """Label each run in data/runs.csv with one of LABELS."""
    # a: both losses flatten early, high and close together.
    # b: train keeps falling; val bottoms out, then climbs.
    # c: the loss jumps up and down and drifts upward.
    return {"a": "underfitting", "b": "overfitting", "c": "learning rate too high"}


# ── Part 3: fix the bug ──────────────────────────────────────────────────

def compare_scales(log: pd.DataFrame, scales: tuple[str, str] = ("linear", "log")) -> Figure:
    """Two Axes side by side, each showing the train loss by epoch, one per
    scale in `scales`, left to right, each titled with its scale's name."""
    fig, axs = plt.subplots(1, 2, figsize=(8, 3))
    for ax, scale in zip(axs, scales):
        ax.plot(log["epoch"], log["train_loss"])
        ax.set_yscale(scale)
        ax.set_title(scale)
    return fig
