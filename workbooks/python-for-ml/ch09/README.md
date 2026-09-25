# Python for ML — Chapter 9: Models and the Training Loop

The workbook packet for [Chapter 9](https://wrightfunctions.com/misc/python-for-ml/chapter-09/).
It practises one thing: writing and reading the training loop, and catching the
bugs that let it run without an error. Every exercise runs on the CPU; no GPU is needed.

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

Open `exercises.py`. Fix the three functions marked FIX, and replace each
function body that raises `NotImplementedError`. Then run:

```bash
pytest                       # every exercise (a few seconds)
pytest -k "train_epoch or accuracy or predict"   # just the fixes
pytest -k "build_model or classifier"   # just building, training and loading the model
```

A failing test says what it expected and why. Keep going until everything is
green. The solutions are a separate download on the chapter page, if you get
stuck.

## Exercises

1. **Fix the bugs**: three pieces of one training script, each with one bug.
   - `train_epoch` trains for one epoch, but its steps are wrong from the
     second batch on, and nothing raises.
   - `accuracy` scores a model that uses dropout, and its answer
     is noisy: it can change from call to call, and it isn't the one the model earns. Nothing raises here either.
   - `predict` raises on a NumPy float64 array. On a GPU, the same kind of bug
     is a model on `'cuda'` and a batch left on the CPU. This packet runs on the
     CPU, so a dtype mismatch stands in for the device one; both are fixed by
     moving the input with `.to()`. (Its float32 test passes from the start: the
     bug only shows with float64.)
2. **Build it**: `build_model` makes a small classifier, `train_classifier`
   trains it on 800 points of a checkerboard (class 1 where x1 and x2 share a
   sign), and `load_classifier` reads its saved `state_dict` back. The test
   wants at least 90% accuracy on 400 points the model never saw, in under 30
   seconds. The solution scores about 99% in under a second on a laptop CPU.

## Optional: a GPU

You don't need one. To see the device code run for real, open a notebook in
[Google Colab](https://colab.research.google.com/), choose **Runtime → Change
runtime type**, and pick a GPU. Free GPU access there is limited and the GPU
types vary, per Colab's FAQ, and Colab's own PyTorch version may differ from
this packet's pin. Then move the model and each batch with
`.to('cuda')` and check `next(model.parameters()).device`.

## Data

None: the tests generate their points from a seeded random generator.
