# Python for ML — Chapter 3: Vectorize Everything

The workbook packet for [Chapter 3](https://wrightfunctions.com/misc/python-for-ml/chapter-03/).
It practises one thing: replacing loops with whole-array operations, and knowing when two arrays share memory.

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

Open `exercises.py`. Fill in each `None` prediction, replace each function
body that raises `NotImplementedError`, and fix the two functions marked FIX.
Then run:

```bash
pytest                    # every exercise
pytest -k predict_shape   # just the shape predictions
```

A failing test says what it expected and why. Keep going until everything is
green. The solutions are a separate download on the chapter page, if you get
stuck.

## Exercises

1. **Shape predictor, broadcasting edition** (`PREDICTIONS`): fourteen
   expressions. Write each shape as a tuple, or `"error"` where NumPy refuses.
2. **Write it without a loop**: `normalize_columns`, `normalize_rows` (needs
   keepdims), `relu`, `predict_classes`, `pairwise_scores`.
3. **Fix the bugs**: `row_norms` is right but slow; the test times your
   version against the loop and wants it 10× faster. `scaled_head` returns the
   right values but changes its input through a view.

## Data

None: every exercise builds its own small arrays.
