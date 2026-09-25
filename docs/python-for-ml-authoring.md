# Python for ML — authoring guide

The **Python for ML** course (`/misc/python-for-ml/`) teaches the working 90% of
the ML stack to people who already program. It is a chapter section in the
Basic Logic mould, so read `docs/basic-logic-authoring.md` first: the five rules
(plain prose, almost no headings, the term's wording is the vocabulary, show it
if it can be shown, examples move) apply unchanged. This guide covers what the
course adds: code with real output, the code stepper, figures for arrays and
tables, and workbook packets.

## Where things live

```
content/misc/python-for-ml/
  _index.md               landing; cascades type, `chapters: true`, `glossary: "python"`
  chapter-NN.md           one file per chapter
data/glossary/python.yaml every definition and its figure
data/python/
  course.yaml             GitHub source URL, requirements path, downloads path
  examples/chNN.yaml      GENERATED: code + captured output per example
  steppers/chNN.yaml      GENERATED: code stepper states
workbooks/python-for-ml/
  requirements.txt        the pinned stack (one file for the whole course)
  chNN/                   a packet: README.md, exercises.py, test_exercises.py, data/
  solutions/chNN/         exercises.py solved; tests and data are symlinks to chNN/
  _template/              the packet to copy for a new chapter (+ solutions/_template/)
  examples/
    run.py                runs every example and stepper, writes data/python/
    stepper.py            the Stepper helper stepper files import
    chNN/*.py             the code each chapter page shows
layouts/python-for-ml/    list.html, single.html (thin; bodies are partials/chapters/*)
layouts/shortcodes/       py-example, code-stepper, workbook, python-versions,
                          python-vocab-map (every term, by the chapter that first links it)
assets/css/               code.css (syntax colours, example boxes), code-stepper.css
assets/scripts/pages/     code-stepper.ts
assets/scripts/site/      def-figures-python.ts (the course's figure kinds)
scripts/build-workbooks.py  the zips
```

The chapter menu (desktop FAB and mobile navbar) comes from `chapters: true`
in the cascade, shared with Basic Logic (`partials/chapter-select.html`,
`partials/topnav.html`). Both sections render their bodies through
`partials/chapters/{section-list,chapter-page}.html`.

## The shape of a chapter

```markdown
---
title: "Chapter N: Title"
lead: "One line under the banner."
description: "Chapter N of Python for ML: …"
weight: N
hidden: true        # until the chapter passes its audit
---

Paragraph: why this matters in real ML work. Terms linked.
Paragraph: the functions this chapter adds.

{{</* code-stepper "chNN/name" */>}}

Paragraphs with small examples: the distinction, the hard case, the common
mistake ("This is where most people slip.").

{{</* py-example "chNN/name" */>}}

## Homework

One or two sentences on what the packet practises.

{{</* workbook "chNN" */>}}
```

- **About 600 visible words** in the lesson (`python3 scripts/article-words.py`).
  Code blocks and their output are demos and don't count.
- **Chapter 10 only** ends with a second heading after Homework, `## What you now know`, one sentence and
  `{{</* python-vocab-map */>}}` (PLAN §10). It isn't lesson or practice, so it isn't counted in the 600 words;
  no other chapter adds a heading.
- **Every function in the chapter's outline is a term**, linked by its own name:
  `{{</* term "reshape" */>}}reshape{{</* /term */>}}`. Term text is plain (the
  shortcode's inner text is not Markdown), so write `reshape`, not `` `reshape` ``.
  Put other spellings (`.reshape`, `reshaped`) in the entry's `aliases`.
  `python3 scripts/check-terms.py <chapter>` must print nothing; it reads the
  glossary from the section's cascade.
- Inline code in prose (`` `axis=0` ``) is fine for anything that isn't a term.

## Code on the page: `py-example`

**Never type an output.** Every code block that shows output is a file in
`workbooks/python-for-ml/examples/chNN/`, and the page shows what running it
printed:

```bash
make examples PYTHON=~/.venvs/python-for-ml/bin/python   # rewrite data/python/
make examples-check PYTHON=…                              # CI: fail on any drift
```

`run.py` runs each file a statement at a time, like the Python prompt: an
expression's value is shown the way the REPL shows it, and so is anything
printed. The page splits the code into chunks, each followed by its output.

- Comments directly above a statement are shown with it; a blank line above a
  comment block keeps it private (a maintainer's header).
- `# hide` at the end of a line runs it without showing it (print options,
  seeding a demo that isn't about seeding).
- `# raises` marks a statement that is meant to fail; the page shows the
  exception's last line. An unmarked error, or a marked line that succeeds,
  fails the run.
- A statement whose value is a matplotlib Figure (end a plot with a bare `fig`
  line, as in a notebook) saves that figure as SVG to
  `static/python-for-ml/figures/` and shows it under that chunk; a figure still
  open when the file ends is shown under the last chunk. The shortcode then
  needs `alt="…"`, and since Hugo can't mix positional and named parameters,
  the name too: `{{</* py-example name="ch06/loss-curve" alt="…" */>}}`. `examples-check`
  compares each SVG byte for byte and leaves the saved ones alone. Examples run on the Agg backend, and the SVGs are
  byte-identical run to run (a fixed `svg.hashsalt`, no date). What a drawing
  call returns (`ax.plot`'s list of lines, a Text, a Legend) isn't printed: most of those reprs carry a
  memory address, and none tells the reader more than the figure does. Say so
  in a comment where it matters.
- Each file runs in its own process from its own folder, so `data/…` paths
  resolve beside it and examples can't leak state.

A fenced block with no output (a shell command, a signature) can stay a plain
fenced block in the Markdown.

## The code stepper

`{{</* code-stepper "chNN/name" */>}}` draws a snippet on the left and the
values it made on the right. Each step lights one line and shows its panels,
with the cells that line read or wrote highlighted. Back / Next step through;
the arrow keys work while focus is inside. The first step is server-rendered,
so with JavaScript off the page shows the whole snippet, its first step's line
and data.

A stepper is a Python file, `examples/chNN/name.stepper.py`, run by `make
examples`. Every line really runs, so no panel can show a value the code
wouldn't make:

```python
from stepper import Stepper

s = Stepper(caption='Array Example')
s.line('import numpy as np')                    # part of the snippet, not a step
s.step('a = np.arange(12).reshape(3, 4)', label='ndarray', show=['a'])
s.step('a[1:, ::2]', label='slicing', show=['a', '_'], pick={'a': 'a[1:, ::2]'})
s.step('a[a % 2 == 0]', label='boolean mask', show=['a', '_'], mask={'a': 'a % 2 == 0'})
```

- `label` finishes the caption: "Array Example — slicing". Use the term's name.
- `show` lists expressions to draw; `'_'` is the line's own value, titled with
  the line.
- `pick={name: expr}` lights the cells of `name` that `expr` selects: the
  expression runs with `name` replaced by an array of cell numbers, so slices
  and fancy indexes light exactly what they read. On a DataFrame or Series it
  runs on the value itself and lights its result's rows and columns: a column,
  a row, a block, or the one cell a `loc`/`iloc`/`at` lookup read.
- `mask={name: expr}` lights the cells where `expr` is True. On a DataFrame, a
  boolean Series (one value per row) lights whole rows; a missing value counts
  as False.
- Both can name `'_'` to light cells of the line's own result.
- `note` adds one sentence under the panels.
- `run='…'` is the Python that really runs for a line that can't run on its own: a
  loop header, `for xb, yb in loader:`, is stepped with `run='xb, yb = next(batches)'`.
  An indented line runs dedented, and a step whose code is already in the snippet
  lights that line again, so a loop body can be stepped once per pass (Chapter 9's
  `train-loop`).

Panels draw ndarrays and tensors up to 3-D (grids, or layers of grids; 48 cells
at most), DataFrames and Series as tables, and anything else as text. A
tensor's title line names its torch dtype and says when it requires grad, and a
single-number tensor is drawn as its repr (`tensor(5.5000, grad_fn=<AddBackward0>)`),
the way the prompt shows it. Floats
show two decimals; in a table a float keeps its point (`10.0`) and a missing
value reads `NaN`, as pandas prints them. A named index shows its name in the
table's corner.

### Data format

`data/python/steppers/chNN.yaml` is generated, but it is plain YAML and the
shortcode reads nothing else:

```yaml
array-tour:
  caption: "Array Example"
  code: ["import numpy as np", "a = np.arange(12).reshape(3, 4)", "a[1:, ::2]"]
  steps:
    - line: 2                 # index into code, 0-based
      label: "slicing"
      note: "optional sentence"
      panels:
        - title: "a"
          meta: "shape (3, 4) · int64"
          kind: "grid"        # grid | table | text
          cells: [["0", "1", "2", "3"], ["4", "5", "6", "7"], ["8", "9", "10", "11"]]
          lit: ["1,0", "1,2", "2,0", "2,2"]     # "row,col" ("layer,row,col" for layers)
        - title: "a[1:, ::2]"
          kind: "grid"
          cells: [["4", "6"], ["8", "10"]]
```

A `table` panel has `columns`, `index` and `rows` instead of `cells` (and
`index_name` when the index has a name); a `text` panel has `text`. The panel markup lives twice, in
`layouts/partials/code-stepper-panel.html` (first step) and
`assets/scripts/pages/code-stepper.ts` (every later one); change both together.

Motion: a panel whose values didn't change keeps its element and only moves its
highlight (a CSS transition on the cells); a new or changed panel fades in; the
code line moves by class. Under `prefers-reduced-motion` nothing animates and
every step is still complete. Nothing loops, so there is no timer to clean up.

## Figures

The course's figure kinds live in `assets/scripts/site/def-figures-python.ts`;
`renderFigure` in `def-figures.ts` hands any kind it doesn't know to it. One
drawing per family, highlighted differently per term:

| `kind` | Drawing | Options | Used by |
|---|---|---|---|
| `array-grid` | a 3×4 grid, `a = np.arange(12).reshape(3, 4)` | `highlight` (one per term; see `arrayGridStates` in `pyfig/arrays.ts`), `label`, `values` | Ch 2 array terms; np.concatenate, np.stack, np.where, np.clip; Ch 8: torch.tensor, torch.zeros, torch.randn; Ch 9: nn.Embedding (a row lookup) |
| `axis-sweep` | the grid collapsing along one axis into its result; `op: matmul` draws row × column | `op` (sum, mean, max, argmax, matmul), `axis` (0 or 1), `keepdims` | reduction, sum, mean, max, argmax, keepdims, matmul, np.dot |
| `broadcast` | a smaller array stretching over the 3×4 grid; a loop vs one call; a ufunc | `highlight`: row, vectorize, ufunc | broadcasting, vectorization, ufunc |
| `view-copy` | two names and the memory they point at; a .npy file | `highlight`: view, copy, save | view, copy, np.save, np.load |
| `py-values` | a short row of plain Python values that a list keeps, a set thins, a dict pairs, a comprehension maps, a generator hands out one at a time, and unpacking or a `*args` call splits between names (`pyfig/values.ts`) | `highlight`: list, dict, set, comprehension, generator, unpacking, args | Ch 1: list, dict, set, comprehension, generator, unpacking, *args and **kwargs |
| `frame` | a 4×3 DataFrame, `df` (runs r1–r4; columns model, lr, loss; r2's loss missing), with its column names and index labelled; optionally a dtype row. Rows and columns are selected, dropped, filled, converted or copied out (`pyfig/frame.ts`) | `highlight`: dataframe, series, index, read-csv, read-parquet, head, info, describe, column-selection, loc, iloc, missing-value, isna, fillna, dropna, assign, astype, value-counts, to-numpy, copy-on-write, chained-assignment, sort-values, apply | Ch 4: every table term; Ch 5: sort_values, apply |
| `split-apply-combine` | a request log split into groups (rows regrouped with a gap between groups), each group reduced to one row beside it, the results then combined into their own table; a pivot, its melt back to long form, and the time versions: text → datetime, `.dt.hour`, hour bins, a sliding window (`pyfig/groups.ts`) | `highlight`: groupby, agg, pivot-table, melt, to-datetime, dt, resample, rolling | Ch 5: groupby, agg, pivot_table, melt, pd.to_datetime, .dt, resample, rolling |
| `join` | two tables, counts and owners, zipped on the key endpoint for an inner, a left and an outer merge in turn (unmatched rows fade, NaN fills the gaps); two tables stacked by concat (`pyfig/join.ts`) | `highlight`: merge, concat | Ch 5: merge, pd.concat |
| `plot-anatomy` | a Matplotlib Figure → Axes → ticks, the train and validation curves of Chapter 6's run, axis labels, title and legend; the Axes' contents swap for scatter dots, histogram bins, bars or an imshow grid, the one Axes for a 2×2 or 1×2 subplot grid, and the linear y ticks for log ones (`pyfig/plot.ts`) | `highlight`: figure, axes, subplots, grid, plot, scatter, hist, bar, imshow, labels, title, legend, log-scale, savefig, df-plot, pyplot, oo-style, overfitting | Ch 6: every Matplotlib term, overfitting |
| `estimator` | rows split into train (five stripes, which double as cross-validation folds) and test, an estimator box that fit fills with what it learned (`coef_`, `mean_`), and the arrows fit, predict and transform draw; the box becomes a Pipeline's two steps, a ColumnTransformer's two lanes or GridSearchCV's grid of C values, and a leak arrow carries test rows into fit (`pyfig/estimator.ts`) | `highlight`: estimator, fit, predict, transform, fit-transform, standard-scaler, one-hot-encoder, pipeline, column-transformer, train-test-split, test-set, data-leakage, cross-val-score, grid-search-cv, linear-regression, logistic-regression, random-forest, mean-squared-error | Ch 7: every estimator, method, split and model term |
| `confusion` | Chapter 7's forest's 2×2 confusion matrix (cells engine), with the cells a metric reads lit: the diagonal, class 0's column or its row (`pyfig/estimator.ts`) | `highlight`: confusion-matrix, accuracy, precision, recall | Ch 7: confusion_matrix, accuracy_score, precision, recall |
| `graph-backward` | y = w * x + b as a tiny compute graph (w = 2, x = 3, b = 1): leaves with a `.grad` slot, × and + nodes, y with its `grad_fn`; forward edges build it, dashed backward edges carry the gradients to the leaves that require grad; a detached copy of w, and the same graph with no `grad_fn` under `no_grad` (`pyfig/tensor.ts`) | `highlight`: tensor, requires-grad, autograd, backward, grad, gradient, no-grad, detach, backpropagation | Ch 8: tensor, requires_grad, autograd, backward, .grad, gradient, torch.no_grad, detach, backpropagation |
| `device-move` | a CPU zone and a GPU zone: a tensor copied to the GPU by `.to('cuda')`, and a NumPy array and a tensor sharing one block of CPU memory through `from_numpy` and `.numpy()` (`pyfig/tensor.ts`) | `highlight`: device, gpu, to, from-numpy, numpy | Ch 8: device, GPU, .to(), torch.from_numpy, .numpy() |
| `train-loop` | the training loop as a ring of five steps, zero_grad → forward → loss → backward → step, round a model of three layers (Linear, ReLU, Linear); a DataLoader beside it feeds 16 rows as two batches of 8 (epoch 1, epoch 2), and a model.pt file takes the state_dict (`pyfig/train.ts`, built on `partsFigure` from `pyfig/tensor.ts`) | `highlight`: training-loop, optimizer, zero-grad, optimizer-step, sgd, adamw, learning-rate, loss, cross-entropy-loss, mse-loss, forward, nn-module, nn-sequential, nn-linear, nn-relu, dataset, dataloader, batch, epoch, model-train, model-eval, dropout, state-dict, torch-save, torch-load | Ch 9: every model, loss, optimizer, data and mode term |

Add a row whenever a chapter adds a family. Table figures build on `Sheet`,
`SheetCells`, `layOut` (numbers several sheets one after another) and
`sheetState` in `pyfig/frame.ts`: a sheet is one table whose
parts (names, labels, values, dtypes) are cells numbered from any `first`, so
several tables can share a figure, like a result beside its source or two tables
being joined. A `SheetView` can place rows at chosen `slots` (fractions leave the gap
between groups) and `move` any part to its own place, which is how a result is
drawn from its inputs' cells. Cells paint in index order, so in a
figure with layers (`Place.layer`, 0 in front) give the front layer the higher
cell indices.

## Workbook packets

Each chapter ends with `## Homework`, one or two sentences, and
`{{</* workbook "chNN" */>}}`: a card with the exercises zip, the solutions zip
and the packet's GitHub folder. To add a packet, copy `_template/` to `chNN/`
and `solutions/_template/` to `solutions/chNN/`, then:

- `exercises.py`: one function per exercise, a docstring saying what it should
  do, and a body that raises `NotImplementedError("<what to do>")`.
- `test_exercises.py`: every test catches `NotImplementedError` and fails with
  a sentence, and every assertion message says what was expected and why. The
  unsolved packet must fail cleanly: no import errors, no crashes.
- `solutions/chNN/test_exercises.py` and `solutions/chNN/data` are symlinks to
  the exercise folder's, so the tests exist once.
- Small data only (kilobytes), generated or public domain, source noted in the
  README.

```bash
make workbooks-test PYTHON=…   # every solutions/*/ must pass (CI runs this)
make workbooks PYTHON=…        # zips into static/downloads/ (gitignored)
```

The deploy workflow installs `requirements.txt` on Python 3.12, runs
`workbooks-test` and `examples-check`, then `make workbooks` before Hugo. A
packet whose solutions fail, or a page whose output drifted, stops the deploy.

## Bumping versions

1. Edit `workbooks/python-for-ml/requirements.txt` (versions and the "As of"
   date); the course index table reads it.
2. Reinstall, then `make examples` and read the diff in `data/python/` (and
   `static/python-for-ml/figures/`): every changed output is a changed page.
3. `make workbooks-test`, fix what broke, and re-check any prose that describes
   a default that moved.
4. Add a line to the changelog on the course index.

## Checking your work

```bash
python3 scripts/article-words.py content/misc/python-for-ml/chapter-NN.md
python3 scripts/check-terms.py content/misc/python-for-ml/chapter-NN.md
make typecheck
make css && hugo                 # no new warnings
make examples-check PYTHON=…
make workbooks-test PYTHON=…
cd workbooks/python-for-ml/chNN && pytest   # fails cleanly, no errors
```

Then read the chapter at desktop and phone widths, open several definitions and
a cross-reference, step through the stepper, download the packet, and check JS
off and reduced motion. `/misc/python-for-ml/components-demo/` (never listed)
exercises every component on one page.
