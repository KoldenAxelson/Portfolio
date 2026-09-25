# Python for ML — Chapter NN: Title

The workbook packet for [Chapter NN](https://wrightfunctions.com/misc/python-for-ml/chapter-NN/).
It practises one thing: <the chapter's core skill, in one line>.

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

Open `exercises.py`. Each function has a docstring saying what it should do and
a body that raises `NotImplementedError`. Replace the body, then run:

```bash
pytest                    # every exercise
pytest -k first_exercise  # just one
```

A failing test says what it expected and why. Keep going until everything is
green. The solutions are a separate download on the chapter page, if you get
stuck.

## Exercises

1. `first_exercise` — <what it practises>.

## Data

<Where each file in data/ came from, or "None.">
