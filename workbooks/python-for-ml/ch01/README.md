# Python for ML — Chapter 1: Python for People Who Already Code

The workbook packet for [Chapter 1](https://wrightfunctions.com/misc/python-for-ml/chapter-01/).
It practises one thing: writing idiomatic Python for data work.

## Set up once

You need Python 3.12 or newer. Make one virtual environment for the whole
course and reuse it for every packet:

```bash
python3 -m venv ~/.venvs/python-for-ml
source ~/.venvs/python-for-ml/bin/activate
pip install -r requirements.txt
```

On Windows, use these lines instead: `source` is a bash command, and cmd and PowerShell before 7.6 don't expand `~`. In PowerShell:

```powershell
py -m venv "$env:USERPROFILE\.venvs\python-for-ml"
& "$env:USERPROFILE\.venvs\python-for-ml\Scripts\Activate.ps1"
pip install -r requirements.txt
```

If PowerShell refuses to run `Activate.ps1`, run
`Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` once, then
try again. In cmd, make it with `py -m venv "%USERPROFILE%\.venvs\python-for-ml"`
and activate with `"%USERPROFILE%\.venvs\python-for-ml\Scripts\activate.bat"`.
(`py` is the Python launcher for Windows; use `python` if you don't have it.)

`requirements.txt` pins the exact versions the chapters were written against.
On a Linux machine without a GPU, add
`--extra-index-url https://download.pytorch.org/whl/cpu` to skip the multi-gigabyte
CUDA build of PyTorch.

Then check the set-up before you write anything:

```bash
pytest -k environment
```

Those tests pass as soon as the environment is right: Python 3.12 or newer,
and every package in `requirements.txt` importing at its pinned version. If
one fails, it says what it found instead: the Python version, a package that
doesn't import, or the version that is installed.

## Work through it

Open `exercises.py`. Fill in the `Run` dataclass's fields and replace each
function body that raises `NotImplementedError`. Then run:

```bash
pytest                    # every exercise
pytest -k read_rows       # just one
```

A failing test says what it expected and why. Keep going until everything is
green. The solutions are a separate download on the chapter page, if you get
stuck.

## Exercises

First, **Environment** (`test_environment_python`, `test_environment`): nothing to
write; these pass once the set-up above is done. Then:

1. **Lists, dicts and sets from a file**: `read_rows` reads `data/runs.csv`
   with `pathlib`, a `with` block, unpacking and a comprehension; then
   `runs_below` (a list comprehension with a filter), `loss_by_run` (a dict
   comprehension) and `learning_rates` (a set comprehension).
2. **A dataclass and an f-string**: the `Run` dataclass's fields, `to_run`
   (the type hints convert nothing, so you do), and `describe` (a log line with
   a format spec).
3. **Generators, unpacking, `*args` and `**kwargs`**: `batches` (a generator
   of fixed-size batches), `best_and_rest` (starred unpacking), `mean_loss`
   (any number of runs as `*runs`) and `merge_config` (`**overrides`, rejecting
   misspelt keys).

## Data

`data/runs.csv`: eight made-up training runs (name, learning rate, epochs,
final loss), written for this packet.
