# Python for ML — Chapter 4: Tables

The workbook packet for [Chapter 4](https://wrightfunctions.com/misc/python-for-ml/chapter-04/).
It practises one thing: loading a messy table and cleaning it, one pandas step at a time, without losing a row by accident.

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

## Work through it

Open `exercises.py`. Replace each function body that raises
`NotImplementedError`, and fix the two functions marked FIX. Then run:

```bash
pytest                    # every exercise
pytest -k clean_runs      # just the CSV clean-up
```

A failing test says what it expected and why. Keep going until everything is
green. The solutions are a separate download on the chapter page, if you get
stuck.

## Exercises

1. **Write the line**: `label_block` (loc), `first_and_last` (iloc),
   `missing_per_column` (isna), `model_counts` (value_counts) and
   `feature_matrix` (to_numpy). Each is one line of pandas.
2. **Clean the CSV** (`clean_runs`): turn `data/runs.csv` into the table the
   test expects. The test lists every difference between yours and the
   expected one, in plain words.
3. **Fix the bugs**: `split_by_accuracy` loses the runs that have no accuracy
   without a word; `with_accuracy` sets a value through chained assignment,
   which changes nothing under pandas 3's copy-on-write.

## Data

`data/runs.csv`: ten made-up training runs (model, learning rate, epochs,
accuracy, a notes column), written for this packet. Some fields are empty and
some hold `?`, on purpose.
