# Python for ML — Chapter 6: Seeing the Data

The workbook packet for [Chapter 6](https://wrightfunctions.com/misc/python-for-ml/chapter-06/).
It practises one thing: drawing a loss plot that reads on its own, and reading what a loss curve says about a training run.

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
`NotImplementedError`, and fix the function marked FIX. Then run:

```bash
pytest                      # every exercise
pytest -k plot_log          # just the plot
pytest -k diagnose          # just the three runs
pytest -k compare_scales    # just the fix
```

A failing test says what it expected and why. Keep going until everything is
green. The solutions are a separate download on the chapter page, if you get
stuck.

The tests draw with Matplotlib's Agg backend, which writes files and never
opens a window, and save into a temporary folder, not this one.

## Exercises

1. **Plot the training log**: `plot_log` reads `data/training-log.csv`, draws
   train and validation loss against the epoch, labels the axes, adds a title
   and a legend, saves the plot as a PNG and returns the Figure. The test
   checks the file and reads the labels, title and legend off the Figure
   (plt.subplots, ax.plot, set_xlabel, set_title, legend, savefig).
2. **Diagnose three runs**: `diagnose` labels the runs in `data/runs.csv`,
   one overfitting, one underfitting and one whose learning rate is too high.
   `load_runs()` loads them; plot them before you decide.
3. **Fix the bug**: `compare_scales` should draw the train loss twice, side by
   side, on a linear and a log scale, but pyplot calls change the wrong Axes
   (the object-oriented style against pyplot).

## Data

`data/training-log.csv`: a made-up training run, 20 epochs of train and
validation loss. `data/runs.csv`: three more made-up runs, 15 epochs each.
Both were generated for this packet by a seeded script,
`workbooks/python-for-ml/examples/ch06/data/make_training_logs.py` in the
course repository: smooth curves plus a little noise.
