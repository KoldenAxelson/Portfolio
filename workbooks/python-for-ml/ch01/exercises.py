"""Chapter 1 workbook: Python for People Who Already Code.

Run `pytest -k environment` first: it checks your set-up and should pass
before you write anything. Then fill in the Run dataclass, replace every
`raise NotImplementedError`, and run `pytest`.
"""
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path

DATA = Path(__file__).parent / "data"


# ── Part 1: read a file into lists, dicts and sets ───────────────────────

def read_rows(path: Path) -> list[dict[str, str]]:
    """Read a CSV file with a header line into one dict per data line, mapping
    each column name to that line's value. The values stay strings.

    Open the file in a `with` block (or use path.read_text()), split the header
    from the other lines with unpacking (header, *lines = ...), and build the
    rows with a comprehension. No value contains a comma.

    >>> read_rows(DATA / "runs.csv")[0]
    {'run': 'a', 'lr': '0.1', 'epochs': '5', 'loss': '0.42'}
    """
    raise NotImplementedError("read_rows: open the file, unpack the header, one dict per line")


def runs_below(rows: list[dict[str, str]], limit: float) -> list[str]:
    """The names of the runs whose loss is below `limit`, in file order.

    One list comprehension with an `if`. The losses in `rows` are strings.
    """
    raise NotImplementedError("runs_below: [... for row in rows if ...]")


def loss_by_run(rows: list[dict[str, str]]) -> dict[str, float]:
    """Each run's name mapped to its loss as a float: {'a': 0.42, ...}.

    A dict comprehension.
    """
    raise NotImplementedError("loss_by_run: {key: value for row in rows}")


def learning_rates(rows: list[dict[str, str]]) -> set[float]:
    """The distinct learning rates, as floats. A set comprehension."""
    raise NotImplementedError("learning_rates: {... for row in rows}")


# ── Part 2: a dataclass and an f-string ──────────────────────────────────

@dataclass
class Run:
    """One training run, with four fields in this order: name (a str), lr (a
    float), epochs (an int) and loss (a float).

    Replace the `...` below with the four fields, each an annotated class
    attribute (`name: str` and so on); @dataclass writes __init__, __repr__
    and __eq__ from them.
    """
    ...


def to_run(row: dict[str, str]) -> Run:
    """One row from read_rows as a Run, each value converted to its field's type.

    The type hints convert nothing: Run("a", "0.1", "5", "0.42") would quietly
    store four strings.
    """
    raise NotImplementedError("to_run: Run(name=..., lr=float(...), ...)")


def describe(run: Run) -> str:
    """One log line for a run, the loss with exactly three decimals:

        run a: lr=0.1, epochs=5, loss=0.420

    One f-string with a format spec.
    """
    raise NotImplementedError("describe: f'run {run.name}: ...'")


# ── Part 3: generators, unpacking, *args and **kwargs ────────────────────

def batches(items: list, size: int) -> Iterator[list]:
    """Hand out `items` in consecutive lists of `size`; the last may be shorter.

    Write it as a generator function (use `yield`), so each batch is made only
    when the caller asks for it.

    >>> list(batches([1, 2, 3, 4, 5], 2))
    [[1, 2], [3, 4], [5]]
    """
    raise NotImplementedError("batches: a loop that yields items[start:start + size]")


def best_and_rest(losses: list[float]) -> tuple[float, list[float]]:
    """The lowest loss, and a list of the others from lowest to highest.

    Sort, then unpack: best, *rest = ...
    """
    raise NotImplementedError("best_and_rest: best, *rest = sorted(losses)")


def mean_loss(*runs: Run) -> float:
    """The mean loss of any number of runs passed as separate arguments:
    mean_loss(a, b, c). A caller holding a list spreads it: mean_loss(*runs).

    Raise ValueError when called with no runs.
    """
    raise NotImplementedError("mean_loss: runs arrives as a tuple")


def merge_config(defaults: dict, **overrides) -> dict:
    """A new config: `defaults` with any keyword arguments replacing their values.

        merge_config({"lr": 0.1, "epochs": 5}, lr=0.01)  ->  {"lr": 0.01, "epochs": 5}

    Leave `defaults` unchanged. Raise KeyError for a keyword that isn't in
    `defaults`, so a typo like lr_rate=0.01 fails loudly instead of being ignored.
    """
    raise NotImplementedError("merge_config: overrides arrives as a dict")
