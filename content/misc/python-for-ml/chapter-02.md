---
# ── Chapter front matter ──────────────────────────────────────────────
# title       : page heading, banner and card label
# lead        : one-line summary under the banner (falls back to description)
# description : SEO/meta, and the card blurb fallback
# weight      : chapter order (1, 2, 3, …)
# hidden      : true keeps a work-in-progress chapter off the list
# ──────────────────────────────────────────────────────────────────────
title: "Chapter 2: Arrays and Shapes"
lead: "Think in shapes, not loops."
description: "Chapter 2 of Python for ML: NumPy arrays, their shape and dtype, and how to pick out and rearrange the values in them."
weight: 2
---

Every ML library you will touch keeps its numbers in NumPy's {{< term "ndarray" >}}ndarray{{< /term >}} or something built like it. An image, a batch of token ids and a layer's weights are all {{< term "ndarray" >}}arrays{{< /term >}}. Many bugs in ML code aren't wrong math but the wrong {{< term "shape" >}}shape{{< /term >}}: a (32, 10) where the code expected (10, 32). This chapter is about reading {{< term "shape" >}}shapes{{< /term >}}.

An {{< term "ndarray" >}}array{{< /term >}} is its values, its {{< term "shape" >}}shape{{< /term >}}, and its {{< term "dtype" >}}dtype{{< /term >}}. Make one from a list with {{< term "np-array" >}}np.array{{< /term >}}, or from nothing with {{< term "zeros" >}}np.zeros{{< /term >}}, {{< term "ones" >}}np.ones{{< /term >}} and {{< term "full" >}}np.full{{< /term >}}. {{< term "arange" >}}np.arange{{< /term >}} counts in steps, and {{< term "linspace" >}}np.linspace{{< /term >}} spaces a set number of points between two ends. Random values come from a generator that {{< term "default-rng" >}}np.random.default_rng{{< /term >}} makes; give it a seed and a run can be repeated.

{{< py-example "ch02/making" >}}

To read part of an {{< term "ndarray" >}}array{{< /term >}}, use {{< term "indexing" >}}indexing{{< /term >}} for one value and {{< term "slicing" >}}slicing{{< /term >}} for a range, one position per {{< term "axis" >}}axis{{< /term >}}. A {{< term "boolean-mask" >}}boolean mask{{< /term >}} picks the values where a condition holds. {{< term "fancy-indexing" >}}Fancy indexing{{< /term >}} picks rows by a list of positions, in any order. {{< term "reshape" >}}Reshape{{< /term >}} reads the same values into a new {{< term "shape" >}}shape{{< /term >}}, and {{< term "reshape-minus-one" >}}-1{{< /term >}} tells it to work out one length for you.

{{< code-stepper "ch02/array-tour" >}}

Read a {{< term "shape" >}}shape{{< /term >}} one {{< term "axis" >}}axis{{< /term >}} at a time. {{< term "axis" >}}Axis{{< /term >}} 0 is the first number, the rows of a 2-D {{< term "ndarray" >}}array{{< /term >}}; {{< term "axis" >}}axis{{< /term >}} 1 is the second, the columns. A {{< term "slicing" >}}slice{{< /term >}} keeps the {{< term "axis" >}}axis{{< /term >}} it {{< term "slicing" >}}slices{{< /term >}}, so `a[1:2]` is still 2-D.

A single {{< term "indexing" >}}index{{< /term >}} drops its {{< term "axis" >}}axis{{< /term >}}: `a[1]` is one row with {{< term "shape" >}}shape{{< /term >}} (4,). This is where most people slip, because `a[1]` and `a[1:2]` print the same numbers, one pair of brackets apart, and the next line breaks. A {{< term "boolean-mask" >}}mask{{< /term >}} the same {{< term "shape" >}}shape{{< /term >}} as the {{< term "ndarray" >}}array{{< /term >}} gives back 1-D, since the values it picks no longer form a grid; a {{< term "boolean-mask" >}}mask{{< /term >}} over the rows alone, `a[a[:, 0] > 2]`, keeps whole rows.

{{< py-example "ch02/dropping-axes" >}}

{{< term "ravel" >}}Ravel{{< /term >}} and {{< term "flatten" >}}flatten{{< /term >}} both lay an {{< term "ndarray" >}}array{{< /term >}} out in one line. {{< term "ravel" >}}Ravel{{< /term >}} hands back the same memory when it can; {{< term "flatten" >}}flatten{{< /term >}} always {{< term "copy" >}}copies{{< /term >}}. Chapter 3 shows why sharing memory bites. {{< term "transpose" >}}Transpose{{< /term >}}, written `.T`, reverses the {{< term "axis" >}}axes{{< /term >}}, so a (2, 3) {{< term "ndarray" >}}array{{< /term >}} becomes (3, 2) and its rows become columns.

{{< py-example "ch02/flat" >}}

The habit to build is small: before you run a line, say the {{< term "shape" >}}shape{{< /term >}} it will make. When you're wrong, print `.shape` and find out why. A model is a long chain of such lines, and a {{< term "shape" >}}shape{{< /term >}} error caught in your head costs nothing.

## Homework

The packet drills that habit: predict the {{< term "shape" >}}shape{{< /term >}} of each line, then write the lines yourself. It ends with a small build, pulling the top-scoring rows out of a score matrix.

{{< workbook "ch02" >}}
