---
# ── Chapter front matter ──────────────────────────────────────────────
# title       : page heading, banner and card label
# lead        : one-line summary under the banner (falls back to description)
# description : SEO/meta, and the card blurb fallback
# weight      : chapter order (1, 2, 3, …)
# hidden      : true keeps a work-in-progress chapter off the list
# ──────────────────────────────────────────────────────────────────────
title: "Chapter 5: Reshape and Combine"
lead: "Group, join, pivot and bin by time."
description: "Chapter 5 of Python for ML: pandas groupby and agg, merge and concat, pivot_table and melt, apply against vectorized code, and datetimes with to_datetime, resample and rolling."
weight: 5
---

Most questions about a running system need more than one table, or one table seen another way. Which endpoint is slowest, which team owns it, and when did traffic peak? Chapter 4 cleaned a single {{< term "dataframe" >}}DataFrame{{< /term >}}; this chapter asks it questions.

{{< term "groupby" >}}groupby{{< /term >}} splits the rows by a key, runs a {{< term "reduction" >}}reduction{{< /term >}} on each group and combines the results, one row per group; {{< term "agg" >}}agg{{< /term >}} runs several at once. {{< term "sort-values" >}}sort_values{{< /term >}} orders rows, {{< term "merge" >}}merge{{< /term >}} joins two tables on a key, and {{< term "pivot-table" >}}pivot_table{{< /term >}} spreads one key across the columns. For time, {{< term "to-datetime" >}}pd.to_datetime{{< /term >}} turns text into datetimes, {{< term "dt-accessor" >}}.dt{{< /term >}} reads their parts, {{< term "resample" >}}resample{{< /term >}} groups them by the hour and {{< term "rolling" >}}rolling{{< /term >}} slides a window along.

{{< code-stepper "ch05/request-logs" >}}

A {{< term "merge" >}}merge{{< /term >}} has to decide what happens to a key with no partner. The default, inner, drops it. Left keeps every row of the left table and fills the gaps with {{< term "missing-value" >}}NaN{{< /term >}}, and outer keeps every key from both sides. So count the rows: here eight requests become seven, eight or nine.

{{< py-example "ch05/joins" >}}

{{< term "pd-concat" >}}pd.concat{{< /term >}} puts tables with the same columns one under another. It keeps each row's {{< term "df-index" >}}index{{< /term >}} label, so labels can repeat until you pass `ignore_index=True`.

{{< py-example "ch05/concat" >}}

This is where people slip. If a key appears twice in the right table, every left row with that key comes back twice, and nothing warns you: a second owner for /login turns eight requests into twelve. Pass `validate='many_to_one'` to the {{< term "merge" >}}merge{{< /term >}} and pandas raises instead.

{{< py-example "ch05/duplicate-key" >}}

{{< term "resample" >}}resample{{< /term >}} is a {{< term "groupby" >}}groupby{{< /term >}} on time bins, with one difference: it makes a row for every hour, even an hour with no requests. Grouping by the hour from {{< term "dt-accessor" >}}.dt{{< /term >}} leaves 11:00 out, so the quiet hour vanishes instead of showing 0.

{{< py-example "ch05/hourly-bins" >}}

Dates written day first are the other trap. {{< term "to-datetime" >}}pd.to_datetime{{< /term >}} reads 01/09/2026 as 9 January, without a warning, and only complains once a day is over 12. Give it the `format` and it reads what you meant.

{{< py-example "ch05/day-first" >}}

{{< term "pivot-table" >}}pivot_table{{< /term >}} takes the {{< term "mean" >}}mean{{< /term >}} of each cell unless you pass `aggfunc`, and a pair with no rows gets {{< term "missing-value" >}}NaN{{< /term >}}. {{< term "melt" >}}melt{{< /term >}} goes back the other way, to one row per value: the long form that {{< term "groupby" >}}groupby{{< /term >}} and {{< term "merge" >}}merge{{< /term >}} work on.

{{< py-example "ch05/reshape" >}}

{{< term "apply" >}}apply{{< /term >}} calls a Python function once per value. That is a loop, so chapter 3's rule holds: when a {{< term "vectorization" >}}vectorized{{< /term >}} expression exists, it gives the same {{< term "series" >}}Series{{< /term >}} many times faster.

{{< py-example "ch05/apply" >}}

The habit this chapter adds is to count rows around every combine. Before a {{< term "groupby" >}}groupby{{< /term >}}, a {{< term "merge" >}}merge{{< /term >}} or a {{< term "resample" >}}resample{{< /term >}}, say how many rows it should give, then check. A join that doubled some rows without a warning reports wrong numbers.

## Homework

The packet has three parts: predict how many rows ten {{< term "merge" >}}merge{{< /term >}}, {{< term "pd-concat" >}}concat{{< /term >}} and {{< term "groupby" >}}groupby{{< /term >}} lines give; count requests per hour with {{< term "resample" >}}resample{{< /term >}}, then per endpoint per hour, joined to their owners; and fix two bugs, a {{< term "to-datetime" >}}pd.to_datetime{{< /term >}} call that reads day-first dates month first and an {{< term "apply" >}}apply{{< /term >}} that should be one {{< term "vectorization" >}}vectorized{{< /term >}} step.

{{< workbook "ch05" >}}
