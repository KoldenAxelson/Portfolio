# Python for ML — Chapter 5: Reshape and Combine

The workbook packet for [Chapter 5](https://wrightfunctions.com/misc/python-for-ml/chapter-05/).
It practises one thing: combining and grouping tables while knowing, before you run it, how many rows each step should give.

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

Open `exercises.py`. Fill in every `None` in `PREDICTIONS`, replace each
function body that raises `NotImplementedError`, and fix the two functions
marked FIX. Then run:

```bash
pytest                      # every exercise
pytest -k predict_rows      # just the row-count predictions
pytest -k hourly_report     # just the report
```

A failing test says what it expected and why. Keep going until everything is
green. The solutions are a separate download on the chapter page, if you get
stuck.

## Exercises

1. **Predict the rows**: `PREDICTIONS` lists ten lines (inner, left and outer
   merges, a many-to-one and a many-to-many merge, `validate=`, `concat` and
   `groupby`). Write how many rows each gives, or `"error"`, before you run
   anything; `example_tables()` builds the tables so you can check afterwards.
2. **Requests per endpoint per hour**: `requests_per_hour` counts the requests
   in every hour, empty hours included (resample); `hourly_report` loads
   `data/requests.csv` and `data/owners.csv` and counts the requests to each
   endpoint in each hour, with the team that owns it (to_datetime, .dt,
   groupby and agg, merge).
3. **Fix the bugs**: `parse_times` reads day-first dates month first without a
   word; `response_seconds` is right but calls a Python function once per row
   (apply), and the test wants it at least 10× faster than
   `logs['ms'].apply(…)`, the quickest loop.

## Data

`data/requests.csv`: fourteen made-up requests to a web service on one day
(time, endpoint, milliseconds), written for this packet; one endpoint,
`/health`, has no owner. `data/owners.csv`: the team that owns each endpoint,
also made up, including `/billing`, which gets no requests.
