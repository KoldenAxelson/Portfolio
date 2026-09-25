# Python for ML — Chapter 2: Arrays and Shapes

The workbook packet for [Chapter 2](https://wrightfunctions.com/misc/python-for-ml/chapter-02/).
It practises one thing: saying the shape a line of NumPy will produce before you run it.

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

Open `exercises.py`. Fill in each `None` prediction, and replace each function
body that raises `NotImplementedError`. Then run:

```bash
pytest                    # every exercise
pytest -k predict_shape   # just the shape predictions
```

A failing test says what it expected and why. Keep going until everything is
green. The solutions are a separate download on the chapter page, if you get
stuck.

## Exercises

1. **Shape predictor** (`PREDICTIONS`): twelve expressions on a 3×4 array.
   Write each one's shape as a tuple before running anything.
2. **Write the line**: `make_grid`, `evenly_spaced`, `seeded_noise`,
   `last_column`, `last_column_2d`, `every_other_row`, `values_above`,
   `rows_in_order`, `as_rows`. One line of NumPy each, no loops.
3. **Build it**: `top_rows` pulls the top-scoring rows out of a score matrix.

## Data

None: every exercise builds its own small arrays.
