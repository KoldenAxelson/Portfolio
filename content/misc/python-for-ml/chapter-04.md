---
# ── Chapter front matter ──────────────────────────────────────────────
# title       : page heading, banner and card label
# lead        : one-line summary under the banner (falls back to description)
# description : SEO/meta, and the card blurb fallback
# weight      : chapter order (1, 2, 3, …)
# hidden      : true keeps a work-in-progress chapter off the list
# ──────────────────────────────────────────────────────────────────────
title: "Chapter 4: Tables"
lead: "Read, inspect, select and clean a table."
description: "Chapter 4 of Python for ML: pandas DataFrames and Series, reading a CSV, selecting rows and columns by label and by position, cleaning missing values, and pandas 3's copy-on-write."
weight: 4
---

Before a model sees a single {{< term "ndarray" >}}array{{< /term >}}, somebody reads a table: a CSV of training runs, an export of labels, a log. Chapter 1 read one by hand and got strings back. pandas reads it in one call into a {{< term "dataframe" >}}DataFrame{{< /term >}}: named columns, each a {{< term "series" >}}Series{{< /term >}} with its own {{< term "dtype" >}}dtype{{< /term >}}, all sharing one {{< term "df-index" >}}index{{< /term >}} that labels the rows.

{{< term "read-csv" >}}pd.read_csv{{< /term >}} reads a CSV, and {{< term "read-parquet" >}}pd.read_parquet{{< /term >}} reads Parquet, a binary format that stores each column's {{< term "dtype" >}}dtype{{< /term >}}. Then look before you change anything. {{< term "head" >}}head{{< /term >}} shows the first rows, {{< term "info" >}}info{{< /term >}} each column's {{< term "dtype" >}}dtype{{< /term >}} and how many values it really has, and {{< term "describe" >}}describe{{< /term >}} a summary of the numbers.

{{< py-example "ch04/first-look" >}}

Here is that file of eight runs, cleaned a line at a time. {{< term "column-selection" >}}Column selection{{< /term >}} takes a name in brackets; {{< term "loc" >}}loc{{< /term >}} picks rows and columns by label and {{< term "iloc" >}}iloc{{< /term >}} by position; a {{< term "boolean-mask" >}}boolean mask{{< /term >}} keeps the rows where a test is True. Then {{< term "dropna" >}}dropna{{< /term >}}, {{< term "fillna" >}}fillna{{< /term >}} and {{< term "astype" >}}astype{{< /term >}} repair the gaps and the types, and {{< term "assign" >}}assign{{< /term >}} adds a column. {{< term "value-counts" >}}value_counts{{< /term >}} counts, and {{< term "to-numpy" >}}to_numpy{{< /term >}} turns the result into an {{< term "ndarray" >}}array{{< /term >}} for a model.

{{< code-stepper "ch04/clean-runs" >}}

Two of those lines are easy to mix up. {{< term "loc" >}}loc{{< /term >}} reads labels, and a label {{< term "slicing" >}}slice{{< /term >}} includes its end, so `'r3':'r5'` is three rows. {{< term "iloc" >}}iloc{{< /term >}} reads positions and leaves the end out, as NumPy does. After {{< term "dropna" >}}dropna{{< /term >}} the {{< term "df-index" >}}index{{< /term >}} has a gap where r4 was, so position 3 now holds r5.

This is where people slip. A {{< term "missing-value" >}}missing value{{< /term >}} reads as {{< term "missing-value" >}}NaN{{< /term >}}, and comparing {{< term "missing-value" >}}NaN{{< /term >}} with `<`, `>=` or even `==` gives False. So `df[df['val_loss'] < 0.4]` and its opposite, `>= 0.4`, both leave r4 out, and nothing warns you. Count the gaps with {{< term "isna" >}}isna{{< /term >}} before you filter, and check that the rows you kept and the rows you dropped add up.

{{< py-example "ch04/missing" >}}

pandas 3 made {{< term "copy-on-write" >}}copy-on-write{{< /term >}} the rule: anything you take from a {{< term "dataframe" >}}DataFrame{{< /term >}} behaves as a separate {{< term "copy" >}}copy{{< /term >}}. That is the opposite of NumPy, where a {{< term "slicing" >}}slice{{< /term >}} is a {{< term "view" >}}view{{< /term >}} of the original. Changing a {{< term "series" >}}Series{{< /term >}} you selected never changes the table, and neither does a {{< term "chained-assignment" >}}chained assignment{{< /term >}} like `df['epochs']['r3'] = 10`, which pandas warns about. To change a table, change the table itself, in one {{< term "loc" >}}loc{{< /term >}} step.

{{< py-example "ch04/copy-on-write" >}}

A CSV stores only text, so every read guesses the {{< term "dtype" >}}dtypes{{< /term >}} again, and a float32 column comes back float64. {{< term "read-parquet" >}}pd.read_parquet{{< /term >}} gives back the {{< term "dtype" >}}dtypes{{< /term >}} that `to_parquet` wrote.

{{< py-example "ch04/parquet" >}}

The habit this chapter adds is to look after every step. Check the {{< term "dtype" >}}dtypes{{< /term >}} with {{< term "info" >}}info{{< /term >}}, count the gaps with {{< term "isna" >}}isna{{< /term >}}, and compare the number of rows before and after each filter. A table that lost a row without a word trains a model that is wrong without anyone noticing.

## Homework

The packet has three parts: five one-line exercises with {{< term "loc" >}}loc{{< /term >}}, {{< term "iloc" >}}iloc{{< /term >}}, {{< term "isna" >}}isna{{< /term >}}, {{< term "value-counts" >}}value_counts{{< /term >}} and {{< term "to-numpy" >}}to_numpy{{< /term >}}; cleaning a messy CSV into the table the test expects; and two bugs to fix, a filter that loses the runs with no accuracy and a {{< term "chained-assignment" >}}chained assignment{{< /term >}} that changes nothing.

{{< workbook "ch04" >}}
