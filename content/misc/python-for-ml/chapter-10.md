---
# ── Chapter front matter ──────────────────────────────────────────────
# title       : page heading, banner and card label
# lead        : one line under the banner (falls back to description)
# description : SEO/meta, and the card blurb fallback
# weight      : chapter order (1, 2, 3, …)
# hidden      : true keeps a work-in-progress chapter off the list
# ──────────────────────────────────────────────────────────────────────
title: "Chapter 10: Putting It Together"
lead: "One dataset through five libraries, and the habits that keep the numbers honest."
description: "Chapter 10 of Python for ML: one pipeline from a pandas table to NumPy arrays, a scikit-learn baseline, a PyTorch model and a Matplotlib comparison, with the habits around it: printing and asserting shapes, seeding, timing with time.perf_counter and %timeit, and notebooks against scripts."
weight: 10
---

Each chapter so far took one tool at a time. Real work runs them in a row: pandas loads and cleans a table, NumPy turns it into {{< term "ndarray" >}}arrays{{< /term >}}, scikit-learn sets a baseline, PyTorch tries to beat it, and Matplotlib shows whether it did. This chapter runs that pipeline once, end to end. It adds no new library, only the habits that keep a pipeline's numbers honest.

The data is 400 made-up training jobs: {{< term "gpu" >}}GPU{{< /term >}} memory, {{< term "batch" >}}batch{{< /term >}} size and sequence length, and whether the job ran out of memory. The memory a job needs grows with {{< term "batch" >}}batch{{< /term >}} size times sequence length, a curve no straight line follows. Each panel below is a value its line really made, from the table to the two scores.

{{< code-stepper "ch10/pipeline" >}}

Each stage hands the next one a known {{< term "shape" >}}shape{{< /term >}}. {{< term "read-csv" >}}pd.read_csv{{< /term >}} gives a {{< term "dataframe" >}}DataFrame{{< /term >}}, {{< term "dropna" >}}dropna{{< /term >}} drops the 14 jobs with no sequence length, and {{< term "to-numpy" >}}to_numpy{{< /term >}} makes a float32 {{< term "ndarray" >}}array{{< /term >}}. The {{< term "mean" >}}mean{{< /term >}} and standard deviation come from the training rows alone, and {{< term "broadcasting" >}}broadcasting{{< /term >}} applies them to both halves, so nothing leaks from the {{< term "test-set" >}}test set{{< /term >}}.

{{< term "fit" >}}Fit{{< /term >}} the baseline first. {{< term "logistic-regression" >}}LogisticRegression{{< /term >}} draws one straight boundary and gets 0.866 of the test jobs right, where answering "no" to every job gets 0.577. The small network, {{< term "nn-linear" >}}nn.Linear{{< /term >}}, {{< term "nn-relu" >}}nn.ReLU{{< /term >}} and {{< term "nn-linear" >}}nn.Linear{{< /term >}} again, can bend its boundary, and after 300 {{< term "epoch" >}}epochs{{< /term >}} it gets 0.969 of the same rows right. Without the baseline, 0.969 would be a number with nothing to compare it to.

{{< py-example name="ch10/compare" alt="A horizontal bar chart titled 'Same rows, three answers': accuracy on the 97 test jobs. Always answering no scores 0.577, logistic regression 0.866 and the MLP 0.969." >}}

Print the {{< term "shape" >}}shape{{< /term >}} after every stage: one line shows what the stage did. An {{< term "assert-statement" >}}assert{{< /term >}} goes further and stops the run at the first {{< term "shape" >}}shape{{< /term >}} that's wrong, printing the one it got.

{{< py-example "ch10/shapes" >}}

This is where most people slip. Double brackets make a one-column table, so its {{< term "ndarray" >}}array{{< /term >}} is (386, 1), not (386,), and not every library says so. {{< term "logistic-regression" >}}LogisticRegression{{< /term >}} {{< term "fit" >}}fits{{< /term >}} it with only a warning, {{< term "cross-entropy-loss" >}}nn.CrossEntropyLoss{{< /term >}} raises, and {{< term "mse-loss" >}}nn.MSELoss{{< /term >}} {{< term "broadcasting" >}}broadcasts{{< /term >}} it against a model's 1-D output into a wrong {{< term "loss" >}}loss{{< /term >}} with a warning. The {{< term "assert-statement" >}}assert{{< /term >}} catches it in all three.

Randomness enters in several places: the split, the starting weights, the shuffle. {{< term "seed" >}}Seed{{< /term >}} each one (`random_state=0`, `torch.manual_seed(0)`) and a re-run prints the same numbers, so a change in the score comes from a change in the code. PyTorch doesn't promise the same numbers across releases, platforms, or CPU and {{< term "gpu" >}}GPU{{< /term >}}, and some {{< term "gpu" >}}GPU{{< /term >}} operations vary run to run unless you call `torch.use_deterministic_algorithms(True)`.

{{< py-example "ch10/seeding" >}}

Time a slow stage before you change it. {{< term "perf-counter" >}}time.perf_counter{{< /term >}} reads a clock, and the difference between two readings is the time in between. In a {{< term "jupyter-notebook" >}}notebook{{< /term >}}, {{< term "timeit" >}}%timeit{{< /term >}} runs one line many times and prints the {{< term "mean" >}}mean{{< /term >}} and its spread.

```python
import time

start = time.perf_counter()
model = train_model(X_train, y_train)
print(f'training took {time.perf_counter() - start:.2f} s')
```

Explore in a {{< term "jupyter-notebook" >}}Jupyter notebook{{< /term >}}: run a cell, look, change it. Its cells keep their variables and can run in any order, so it can show a result no top-to-bottom run gives. Once the pipeline works, move it into a {{< term "python-script" >}}script{{< /term >}}: `python pipeline.py` runs top to bottom in a fresh process every time.

The habit this chapter adds: make every run say where it stands, with a baseline to beat, the {{< term "shape" >}}shape{{< /term >}} after each stage, and a {{< term "seed" >}}seed{{< /term >}} so the same code prints the same numbers.

## Homework

The packet is the whole pipeline on this chapter's jobs, one tested stage at a time: load and clean the table, make the {{< term "ndarray" >}}arrays{{< /term >}} with the right {{< term "shape" >}}shapes{{< /term >}} and scale them without a leak, {{< term "fit" >}}fit{{< /term >}} a baseline that must score at least 80%, train a {{< term "seed" >}}seeded{{< /term >}} model that must reach 93%, and save the comparison as a PNG. A last function runs all five in a row, and the model must beat the baseline.

{{< workbook "ch10" >}}

## What you now know

Every term the course has taught, under the chapter that first used it. Select one for its definition.

{{< python-vocab-map >}}
