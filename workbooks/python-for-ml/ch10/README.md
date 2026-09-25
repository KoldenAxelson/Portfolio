# Python for ML — Chapter 10: Putting It Together

The workbook packet for [Chapter 10](https://wrightfunctions.com/misc/python-for-ml/chapter-10/).
It practises one thing: running a whole ML pipeline, pandas to NumPy to
scikit-learn to PyTorch to Matplotlib, one tested stage at a time. Everything
runs on the CPU; the whole test run takes a few seconds.

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

Open `exercises.py`. Each function is one stage of the pipeline, with a
docstring saying what it should do and a body that raises
`NotImplementedError`. Replace the body, then run:

```bash
pytest                                # every stage (a few seconds)
pytest -k load_jobs                   # stage 1: load and clean
pytest -k "to_arrays or standardize"  # stage 2: arrays and shapes
pytest -k fit_baseline                # stage 3: the scikit-learn baseline
pytest -k train_model                 # stage 4: the PyTorch model
pytest -k plot_scores                 # stage 5: the comparison plot
pytest -k run_pipeline                # all five, in a row
```

Each stage's tests build correct inputs of their own, so you can write the
stages in any order, and a mistake in one can't fail another. A failing test
says what it expected and why. Keep going until everything is green. The
solutions are a separate download on the chapter page, if you get stuck.

## Exercises

1. **Load and clean** (`load_jobs`): read the CSV, drop every row with a
   missing value, and turn the `oom` column's "yes" and "no" into 1 and 0.
2. **Arrays and shapes** (`to_arrays`, `standardize`): the three feature
   columns as a float32 array of shape (n, 3) and the labels as an int64 array
   of shape (n,); then scale every column with the training rows' mean and
   standard deviation, for the test rows too, so nothing leaks.
3. **The baseline** (`fit_baseline`): fit a scikit-learn classifier and return
   it. The test wants at least 80% accuracy on held-out jobs; answering "no"
   every time gets 57.7%.
4. **The model** (`train_model`): train a small PyTorch network, seeded so two
   calls give the same model. The test wants at least 93% accuracy on the same
   held-out jobs, in under 15 seconds. The solution scores 96.9% in well under
   a second.
5. **The comparison** (`plot_scores`): a bar chart of the scores, one named
   bar each, with the accuracy axis labelled, saved as a PNG.
6. **All together** (`run_pipeline`): the five stages in a row on
   `data/oom.csv`, split with `test_size=0.25` and `random_state=0`. It
   returns both scores and saves the plot; the model must beat the baseline.

## Data

`data/oom.csv`: 400 made-up training jobs (GPU memory in GB, batch size,
sequence length) and whether each one ran out of GPU memory, generated for
this packet by a seeded script, `workbooks/python-for-ml/examples/ch10/data/make_oom.py`
in the course repository. A job's memory need grows with batch size times
sequence length, plus some noise; 14 rows have no sequence length, on purpose.
