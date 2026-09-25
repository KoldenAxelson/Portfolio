---
# ── Chapter front matter ──────────────────────────────────────────────
# title       : page heading, banner and card label
# lead        : one-line summary under the banner (falls back to description)
# description : SEO/meta, and the card blurb fallback
# weight      : chapter order (1, 2, 3, …)
# hidden      : true keeps a work-in-progress chapter off the list
# ──────────────────────────────────────────────────────────────────────
title: "Chapter 7: The Estimator Pattern"
lead: "Fit on the training rows, predict the rest, and score it honestly."
description: "Chapter 7 of Python for ML: scikit-learn's fit, predict and transform, train_test_split, StandardScaler and OneHotEncoder, Pipeline and ColumnTransformer, three models and the metrics that score them, cross_val_score and GridSearchCV, and the data leakage a Pipeline prevents."
weight: 7
---

In scikit-learn, a straight line and a forest of trees are used the same way: {{< term "fit" >}}fit{{< /term >}} to learn, then {{< term "predict" >}}predict{{< /term >}}. One pattern opens up the whole library. The harder part is scoring a model honestly. The easy way to get that wrong raises no error and prints a good number.

An {{< term "estimator" >}}estimator{{< /term >}} learns from data with {{< term "fit" >}}fit{{< /term >}}. A model then has {{< term "predict" >}}predict{{< /term >}}, which labels new rows; a preprocessor such as {{< term "standard-scaler" >}}StandardScaler{{< /term >}} has {{< term "transform" >}}transform{{< /term >}}, which rewrites rows with what it learned, and {{< term "fit-transform" >}}fit_transform{{< /term >}} does both at once. {{< term "train-test-split" >}}train_test_split{{< /term >}} holds rows back as a {{< term "test-set" >}}test set{{< /term >}}, and a {{< term "pipeline" >}}Pipeline{{< /term >}} chains steps into one {{< term "estimator" >}}estimator{{< /term >}}. The stepper builds one baseline twice, wrong and then right.

{{< code-stepper "ch07/baseline" >}}

This is where most people slip. Scaling every row before the split runs without a warning, but the scaler's `mean_` now includes the test rows: that is {{< term "data-leakage" >}}data leakage{{< /term >}}. Here it costs little: the leaky score is 0.965 and the honest one 0.958, one test row of 143. A step that reads the labels leaks far more: on pure noise, where honest {{< term "accuracy-score" >}}accuracy{{< /term >}} is about 0.5, keeping the 20 of 2,000 columns that best match the labels before the split scores 0.74.

{{< py-example "ch07/leak-noise" >}}

Inside a {{< term "pipeline" >}}Pipeline{{< /term >}}, {{< term "fit" >}}fit{{< /term >}} learns every step from the training rows only, and {{< term "predict" >}}predict{{< /term >}} sends new rows through the same {{< term "fit" >}}fitted{{< /term >}} steps. Put every step that learns from data in the {{< term "pipeline" >}}Pipeline{{< /term >}}, and the {{< term "test-set" >}}test set{{< /term >}} stays unseen.

Swapping the model changes one line. {{< term "logistic-regression" >}}LogisticRegression{{< /term >}} and {{< term "random-forest-classifier" >}}RandomForestClassifier{{< /term >}} take the same {{< term "fit" >}}fit{{< /term >}} and {{< term "predict" >}}predict{{< /term >}}. {{< term "linear-regression-class" >}}LinearRegression{{< /term >}} {{< term "predict" >}}predicts{{< /term >}} numbers, and {{< term "mean-squared-error" >}}mean_squared_error{{< /term >}} measures how far they land.

{{< py-example "ch07/models" >}}

{{< term "accuracy-score" >}}Accuracy{{< /term >}} hides which mistakes a model makes. A {{< term "confusion-matrix" >}}confusion matrix{{< /term >}} counts them: rows are the true class, columns the {{< term "predict" >}}predicted{{< /term >}} one. {{< term "precision-score" >}}Precision{{< /term >}} reads down a column (of the tumours {{< term "predict" >}}predicted{{< /term >}} malignant, how many were) and {{< term "recall-score" >}}recall{{< /term >}} along a row (of the malignant tumours, how many were caught). Both score class 1 by default, which here is benign, so pass `pos_label=0`.

{{< py-example "ch07/metrics" >}}

Real tables mix text and numbers. {{< term "one-hot-encoder" >}}OneHotEncoder{{< /term >}} turns a text column into one 0/1 column per category, and {{< term "column-transformer" >}}ColumnTransformer{{< /term >}} sends each {{< term "list" >}}list{{< /term >}} of columns to its own step. A category {{< term "fit" >}}fit{{< /term >}} never saw raises an error by default; `handle_unknown='ignore'` leaves its columns at 0 instead.

{{< py-example "ch07/columns" >}}

One split is one roll of the dice. {{< term "cross-val-score" >}}cross_val_score{{< /term >}} {{< term "fit" >}}fits{{< /term >}} and scores five times, holding out a different fifth of the training rows each time. {{< term "grid-search-cv" >}}GridSearchCV{{< /term >}} does that for every setting in a grid, then refits the best on all the training rows. The {{< term "test-set" >}}test set{{< /term >}} waits until the end and is scored once.

{{< py-example "ch07/tuning" >}}

The habit this chapter adds is to split first, then {{< term "fit" >}}fit{{< /term >}} everything inside a {{< term "pipeline" >}}Pipeline{{< /term >}}, so every score you print was earned on rows the model never saw. [How Does a Model Actually Learn?](/articles/how-a-model-learns/) shows what that held-out score guards against, {{< term "overfitting" >}}overfitting{{< /term >}}. [How Do You Know a Model Got Better?](/articles/evals/) carries the same rule, a {{< term "test-set" >}}test set{{< /term >}} that never leaks, into the gate a model must pass to ship.

## Homework

The packet has three parts: fix a function that {{< term "fit" >}}fits{{< /term >}} its {{< term "standard-scaler" >}}StandardScaler{{< /term >}} before the split; build a {{< term "pipeline" >}}Pipeline{{< /term >}} with a {{< term "column-transformer" >}}ColumnTransformer{{< /term >}} that must be right on more than 78% of a fixed {{< term "test-set" >}}test set{{< /term >}}, and still answer for a GPU it never saw; and read {{< term "precision-score" >}}precision{{< /term >}} and {{< term "recall-score" >}}recall{{< /term >}} off a {{< term "confusion-matrix" >}}confusion matrix{{< /term >}}.

{{< workbook "ch07" >}}
