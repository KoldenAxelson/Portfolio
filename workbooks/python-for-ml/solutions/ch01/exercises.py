"""Chapter 1 workbook: Python for People Who Already Code. Solutions.
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
    with path.open() as f:
        header, *lines = f.read().splitlines()
    columns = header.split(",")
    return [dict(zip(columns, line.split(","))) for line in lines]


def runs_below(rows: list[dict[str, str]], limit: float) -> list[str]:
    """The names of the runs whose loss is below `limit`, in file order.

    One list comprehension with an `if`. The losses in `rows` are strings.
    """
    return [row["run"] for row in rows if float(row["loss"]) < limit]


def loss_by_run(rows: list[dict[str, str]]) -> dict[str, float]:
    """Each run's name mapped to its loss as a float: {'a': 0.42, ...}.

    A dict comprehension.
    """
    return {row["run"]: float(row["loss"]) for row in rows}


def learning_rates(rows: list[dict[str, str]]) -> set[float]:
    """The distinct learning rates, as floats. A set comprehension."""
    return {float(row["lr"]) for row in rows}


# ── Part 2: a dataclass and an f-string ──────────────────────────────────

@dataclass
class Run:
    """One training run, with four fields in this order: name (a str), lr (a
    float), epochs (an int) and loss (a float).

    @dataclass writes __init__, __repr__ and __eq__ from the annotated fields.
    """
    name: str
    lr: float
    epochs: int
    loss: float


def to_run(row: dict[str, str]) -> Run:
    """One row from read_rows as a Run, each value converted to its field's type.

    The type hints convert nothing: Run("a", "0.1", "5", "0.42") would quietly
    store four strings.
    """
    return Run(name=row["run"], lr=float(row["lr"]), epochs=int(row["epochs"]), loss=float(row["loss"]))


def describe(run: Run) -> str:
    """One log line for a run, the loss with exactly three decimals:

        run a: lr=0.1, epochs=5, loss=0.420

    One f-string with a format spec.
    """
    return f"run {run.name}: lr={run.lr}, epochs={run.epochs}, loss={run.loss:.3f}"


# ── Part 3: generators, unpacking, *args and **kwargs ────────────────────

def batches(items: list, size: int) -> Iterator[list]:
    """Hand out `items` in consecutive lists of `size`; the last may be shorter.

    Write it as a generator function (use `yield`), so each batch is made only
    when the caller asks for it.

    >>> list(batches([1, 2, 3, 4, 5], 2))
    [[1, 2], [3, 4], [5]]
    """
    for start in range(0, len(items), size):
        yield items[start:start + size]


def best_and_rest(losses: list[float]) -> tuple[float, list[float]]:
    """The lowest loss, and a list of the others from lowest to highest.

    Sort, then unpack: best, *rest = ...
    """
    best, *rest = sorted(losses)
    return best, rest


def mean_loss(*runs: Run) -> float:
    """The mean loss of any number of runs passed as separate arguments:
    mean_loss(a, b, c). A caller holding a list spreads it: mean_loss(*runs).

    Raise ValueError when called with no runs.
    """
    if not runs:
        raise ValueError("mean_loss needs at least one run")
    return sum(run.loss for run in runs) / len(runs)


def merge_config(defaults: dict, **overrides) -> dict:
    """A new config: `defaults` with any keyword arguments replacing their values.

        merge_config({"lr": 0.1, "epochs": 5}, lr=0.01)  ->  {"lr": 0.01, "epochs": 5}

    Leave `defaults` unchanged. Raise KeyError for a keyword that isn't in
    `defaults`, so a typo like lr_rate=0.01 fails loudly instead of being ignored.
    """
    unknown = overrides.keys() - defaults.keys()
    if unknown:
        raise KeyError(f"not in defaults: {', '.join(sorted(unknown))}")
    return {**defaults, **overrides}
