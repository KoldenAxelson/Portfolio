# Python for ML — Chapter 8: Tensors and Autograd

The workbook packet for [Chapter 8](https://wrightfunctions.com/misc/python-for-ml/chapter-08/).
It practises one thing: knowing what shape a tensor has and where a gradient comes from, and checking it.
Every exercise runs on the CPU; no GPU is needed.

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
body that raises `NotImplementedError`, and fix the function marked FIX. Then
run:

```bash
pytest                       # every exercise
pytest -k predict_shape      # just the shape predictions
pytest -k gradients          # just the gradients, by hand and by autograd
pytest -k descend            # just the fix
```

A failing test says what it expected and why. Keep going until everything is
green. The solutions are a separate download on the chapter page, if you get
stuck.

## Exercises

1. **Shape predictor** (`PREDICTIONS`): twelve expressions, eight on a 3×4 tensor
   and four that make new ones. Write each one's shape as a tuple before running
   anything.
2. **A gradient by hand, then by autograd**: `hand_gradients` works out the
   gradients of a squared error with respect to w and b on paper, in plain
   Python; `autograd_gradients` gets the same two numbers from
   `loss.backward()`. The tests check both on two sets of numbers.
3. **Fix the bug**: `descend` runs gradient descent on one weight, but from
   the second step on its steps are wrong, because the gradients pile up
   across `backward` calls. Make every step use only its own gradient.

## Data

None: every exercise builds its own small tensors.
