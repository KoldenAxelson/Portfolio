# Python for ML — Chapter 7: The Estimator Pattern

The workbook packet for [Chapter 7](https://wrightfunctions.com/misc/python-for-ml/chapter-07/).
It practises one thing: fitting scikit-learn estimators on the training rows only, and scoring them honestly on rows they never saw.

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

Open `exercises.py`. Fix the function marked FIX, and replace each function
body that raises `NotImplementedError`. Then run:

```bash
pytest                       # every exercise
pytest -k split_and_score    # just the fix
pytest -k train_baseline     # just the baseline
pytest -k precision_recall   # just the confusion matrix
```

A failing test says what it expected and why. Keep going until everything is
green. The solutions are a separate download on the chapter page, if you get
stuck.

## Exercises

1. **Fix the bug**: `split_and_score` scales every row before it splits off
   the test set, so the test rows help set the scaler: data leakage. Make the
   StandardScaler learn from the training rows only. The test watches which
   rows the scaler is fit on, on two datasets, and checks the test accuracy.
2. **Build a baseline**: `train_baseline` fits a Pipeline that predicts
   whether a training job failed, from `data/jobs.csv`: a ColumnTransformer
   (OneHotEncoder for the text columns, StandardScaler for the numbers) and a
   classifier. On the fixed split it must be right on more than 78% of the
   150 test rows, and still give an answer for a GPU it never saw.
3. **Read a confusion matrix**: `precision_recall` returns precision and
   recall for one class, read off a matrix laid out like
   `confusion_matrix(y_true, y_pred)`: rows are the true class, columns the
   prediction.

## Data

`data/jobs.csv`: 600 made-up training jobs (GPU, framework, batch size,
hours) and whether each one failed, generated for this packet by a seeded
script, `workbooks/python-for-ml/examples/ch07/data/make_jobs.py` in the course
repository. Part 1 uses scikit-learn's built-in breast cancer dataset
(`load_breast_cancer`, the Wisconsin Diagnostic Breast Cancer data, which ships
with scikit-learn) and a generated one (`make_classification`).
