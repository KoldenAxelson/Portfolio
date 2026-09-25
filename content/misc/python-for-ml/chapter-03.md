---
# ── Chapter front matter ──────────────────────────────────────────────
# title       : page heading, banner and card label
# lead        : one-line summary under the banner (falls back to description)
# description : SEO/meta, and the card blurb fallback
# weight      : chapter order (1, 2, 3, …)
# hidden      : true keeps a work-in-progress chapter off the list
# ──────────────────────────────────────────────────────────────────────
title: "Chapter 3: Vectorize Everything"
lead: "Replace loops with whole-array operations, and know when data is shared."
description: "Chapter 3 of Python for ML: vectorization, broadcasting, reductions along an axis, joining arrays, and the difference between a view and a copy."
weight: 3
---

A Python loop over a million numbers is slow, because every pass goes back through the interpreter. NumPy's answer is {{< term "vectorization" >}}vectorization{{< /term >}}: write one expression over whole {{< term "ndarray" >}}arrays{{< /term >}} and let NumPy run the loop in compiled code. Functions like `np.sqrt`, and the ones behind `+` and `*` on {{< term "ndarray" >}}arrays{{< /term >}}, are {{< term "ufunc" >}}ufuncs{{< /term >}}: they work value by value on any {{< term "shape" >}}shape{{< /term >}}. A result that is a single number comes back as a NumPy scalar, which the prompt shows with its type, like `np.int64(…)`.

{{< py-example "ch03/vectorize" >}}

{{< term "broadcasting" >}}Broadcasting{{< /term >}} is how {{< term "ndarray" >}}arrays{{< /term >}} of different {{< term "shape" >}}shapes{{< /term >}} still combine. NumPy lines the {{< term "shape" >}}shapes{{< /term >}} up from the right. Two lengths fit if they are equal or one of them is 1, and an {{< term "axis" >}}axis{{< /term >}} of length 1, or a missing one, is stretched to match.

A (3, 4) {{< term "ndarray" >}}array{{< /term >}} plus a (4,) row adds the row to every row. A (3, 4) plus a (3,) fails, and the error names both {{< term "shape" >}}shapes{{< /term >}}.

{{< py-example "ch03/broadcast" >}}

Here is a line you will write again and again in ML preprocessing: normalizing a batch so each column has {{< term "mean" >}}mean{{< /term >}} 0 and spread 1.

{{< code-stepper "ch03/normalize" >}}

A {{< term "reduction" >}}reduction{{< /term >}} turns many values into fewer: {{< term "sum" >}}sum{{< /term >}}, {{< term "mean" >}}mean{{< /term >}}, {{< term "max" >}}max{{< /term >}}, and {{< term "argmax" >}}argmax{{< /term >}}, which gives the position of the largest value instead of the value. With no {{< term "axis" >}}axis{{< /term >}}, they return one number. With `axis=` they collapse only that {{< term "axis" >}}axis{{< /term >}}, so `axis=0` gives one value per column.

{{< term "keepdims" >}}keepdims=True{{< /term >}} keeps the collapsed {{< term "axis" >}}axis{{< /term >}} with length 1, so the result still lines up with the original. This is where most people slip. To normalize rows instead of columns, the row {{< term "mean" >}}means{{< /term >}} need {{< term "keepdims" >}}keepdims{{< /term >}}: without it they have {{< term "shape" >}}shape{{< /term >}} (rows,), which lines up with the columns, so the subtraction fails or, on a square {{< term "ndarray" >}}array{{< /term >}}, quietly subtracts the wrong numbers.

{{< py-example "ch03/reduce" >}}

{{< term "matmul" >}}@{{< /term >}} multiplies an (n, k) {{< term "ndarray" >}}array{{< /term >}} by a (k, m) one into (n, m): the inner lengths must match, and they disappear. {{< term "dot" >}}np.dot{{< /term >}} gives the same for 2-D {{< term "ndarray" >}}arrays{{< /term >}} and the plain {{< term "dot" >}}dot product{{< /term >}} for 1-D ones, but NumPy's docs prefer {{< term "matmul" >}}@{{< /term >}} for 2-D. {{< term "concatenate" >}}np.concatenate{{< /term >}} joins {{< term "ndarray" >}}arrays{{< /term >}} along an {{< term "axis" >}}axis{{< /term >}} they already have, and {{< term "stack" >}}np.stack{{< /term >}} adds a new one. {{< term "where" >}}np.where{{< /term >}} picks from two {{< term "ndarray" >}}arrays{{< /term >}} by a condition, and {{< term "clip" >}}np.clip{{< /term >}} caps values into a range.

{{< py-example "ch03/combine" >}}

One more trap, and it's quiet. A {{< term "slicing" >}}slice{{< /term >}} is a {{< term "view" >}}view{{< /term >}}: it shares memory with the {{< term "ndarray" >}}array{{< /term >}} it came from, so writing into the {{< term "slicing" >}}slice{{< /term >}} writes into the original. A function that edits a {{< term "slicing" >}}slice{{< /term >}} of its argument changes the caller's data, and nothing warns you. Call `.copy()` when you need a {{< term "copy" >}}copy{{< /term >}} of your own, and ask `np.shares_memory` when you aren't sure.

{{< py-example "ch03/view-copy" >}}

To keep an {{< term "ndarray" >}}array{{< /term >}} between runs, {{< term "save" >}}np.save{{< /term >}} writes it to a `.npy` file and {{< term "load" >}}np.load{{< /term >}} reads it back with its {{< term "dtype" >}}dtype{{< /term >}} and {{< term "shape" >}}shape{{< /term >}}.

{{< py-example "ch03/save-load" >}}

The habit from the last chapter gains two checks. Before you write a loop over an {{< term "ndarray" >}}array{{< /term >}}, look for the one expression that does the same work, and say the {{< term "shape" >}}shape{{< /term >}} it will make. Before you write into an {{< term "ndarray" >}}array{{< /term >}} a function was given, ask whether it is a {{< term "view" >}}view{{< /term >}} of someone else's data.

## Homework

The packet has three parts: predict the {{< term "shape" >}}shapes{{< /term >}} that {{< term "broadcasting" >}}broadcasting{{< /term >}} and {{< term "reduction" >}}reductions{{< /term >}} produce, write five small functions as whole-array expressions with no loop, then fix two bugs: a slow loop (the test times it) and a function that quietly changes its input through a {{< term "view" >}}view{{< /term >}}.

{{< workbook "ch03" >}}
