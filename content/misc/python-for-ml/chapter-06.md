---
# ── Chapter front matter ──────────────────────────────────────────────
# title       : page heading, banner and card label
# lead        : one-line summary under the banner (falls back to description)
# description : SEO/meta, and the card blurb fallback
# weight      : chapter order (1, 2, 3, …)
# hidden      : true keeps a work-in-progress chapter off the list
# ──────────────────────────────────────────────────────────────────────
title: "Chapter 6: Seeing the Data"
lead: "The handful of plots every ML job needs, and how to read them."
description: "Chapter 6 of Python for ML: Matplotlib's Figure and Axes, line, scatter, histogram, bar and image plots, labels and legends, subplot grids, log scales, savefig and DataFrame.plot, and reading a loss curve for overfitting."
weight: 6
---

A training run prints one loss per epoch, and a column of numbers hides what a picture shows at a glance: whether the model is still learning, has stalled, or has started memorizing. Matplotlib draws that picture. Its {{< term "pyplot" >}}pyplot{{< /term >}} module, imported as `plt`, is the way in.

{{< term "plt-subplots" >}}plt.subplots{{< /term >}} makes a {{< term "figure-object" >}}Figure{{< /term >}}, the whole image, and an {{< term "axes-object" >}}Axes{{< /term >}}, one plot area with its own scales. You then draw by calling methods on the {{< term "axes-object" >}}Axes{{< /term >}}: {{< term "ax-plot" >}}ax.plot{{< /term >}} for lines, {{< term "scatter" >}}scatter{{< /term >}} for points, {{< term "hist" >}}hist{{< /term >}} and {{< term "bar" >}}bar{{< /term >}} for counts, {{< term "imshow" >}}imshow{{< /term >}} for a grid of values. {{< term "axis-labels" >}}set_xlabel{{< /term >}}, {{< term "set-title" >}}set_title{{< /term >}} and {{< term "legend" >}}legend{{< /term >}} tell the reader what they are looking at.

{{< code-stepper "ch06/loss-curve" >}}

The stepper shows what each line changed; here is the picture those lines draw, with a dashed line at the lowest validation loss.

{{< py-example name="ch06/loss-curve" alt="Train and validation loss over 12 epochs. Both fall together at first; validation loss bottoms out at epoch 7, marked by a dashed line, then climbs while train loss keeps falling." >}}

Read it from the left. Both losses fall while the model learns patterns that hold beyond the training data. From epoch 7 the training loss keeps falling, but the validation loss climbs: the model is now fitting the training examples themselves. That is {{< term "overfitting" >}}overfitting{{< /term >}}, and the weights worth keeping come from epoch 7.

Matplotlib offers two ways in. In {{< term "pyplot" >}}pyplot style{{< /term >}}, `plt.plot` and `plt.title` act on the current {{< term "axes-object" >}}Axes{{< /term >}}: the one made last, unless `plt.sca(ax)` picked another. In the {{< term "object-oriented-style" >}}object-oriented style{{< /term >}}, you call the method on the {{< term "axes-object" >}}Axes{{< /term >}} you want, so every line says which plot it changes.

This is where people slip. With two {{< term "axes-object" >}}Axes{{< /term >}}, `plt.title` lands on the second one, with no error. And an {{< term "axes-object" >}}Axes{{< /term >}} spells the same jobs differently: `ax.title` is a Text object, not a function, so calling it raises, and the method is {{< term "set-title" >}}set_title{{< /term >}}.

{{< py-example "ch06/pyplot-slip" >}}

Loss often falls fast, then slowly for a long time, and on a linear scale the slow part looks flat. A {{< term "log-scale" >}}log scale{{< /term >}} gives each tenfold drop the same room, so you can see the model is still improving. Asking for two {{< term "axes-object" >}}Axes{{< /term >}} in one row, `plt.subplots(1, 2)`, makes a {{< term "subplot-grid" >}}subplot grid{{< /term >}} that shows both side by side.

{{< py-example name="ch06/log-scale" alt="The same noisy loss over 500 steps, twice. On the linear scale (left) it drops steeply and then looks flat after about step 100. On the log scale (right) it keeps falling steadily all the way to step 500." >}}

The other plots are one call each. A {{< term "scatter" >}}scatter{{< /term >}} of predictions against targets shows how close they land, a {{< term "hist" >}}histogram{{< /term >}} how the errors spread, a {{< term "bar" >}}bar{{< /term >}} chart the examples per class, and {{< term "imshow" >}}imshow{{< /term >}} a confusion matrix. A 2×2 {{< term "subplot-grid" >}}subplot grid{{< /term >}} returns its {{< term "axes-object" >}}Axes{{< /term >}} as an {{< term "ndarray" >}}array{{< /term >}} of {{< term "shape" >}}shape{{< /term >}} (2, 2), so `axs[1, 0]` is row 1, column 0.

{{< py-example name="ch06/other-plots" alt="Four plots in a 2 by 2 grid: a scatter of predictions against targets hugging the diagonal, a histogram of errors centred on zero, a bar chart of examples per class (cat 120, dog 80, bird 30), and a 3 by 3 confusion matrix drawn as coloured cells, brightest on the diagonal." >}}

pandas can do the drawing for you. {{< term "df-plot" >}}DataFrame.plot{{< /term >}} draws one line per column against the {{< term "df-index" >}}index{{< /term >}}, adds a {{< term "legend" >}}legend{{< /term >}}, labels x with the {{< term "df-index" >}}index{{< /term >}} name and returns the {{< term "axes-object" >}}Axes{{< /term >}}. {{< term "savefig" >}}savefig{{< /term >}} writes the {{< term "figure-object" >}}Figure{{< /term >}} to a file in the format its extension names, so a training script can leave `loss.png` behind for you to open.

{{< py-example name="ch06/df-plot" alt="The training log drawn by DataFrame.plot: lines for train_loss and val_loss over 12 epochs, a legend with both column names, epoch as the x label and loss as the y label." >}}

The habit this chapter adds is to look at the curves before you trust a final number. One loss at the end can't tell learning from memorizing; two curves side by side can. Give every plot {{< term "axis-labels" >}}axis labels{{< /term >}} and a {{< term "legend" >}}legend{{< /term >}}, so a saved plot still makes sense when you open it next week.

## Homework

The packet has three parts: plot a training log with {{< term "axis-labels" >}}axis labels{{< /term >}}, a {{< term "set-title" >}}title{{< /term >}} and a {{< term "legend" >}}legend{{< /term >}}, and {{< term "savefig" >}}savefig{{< /term >}} it as a PNG; label three runs' loss curves as {{< term "overfitting" >}}overfitting{{< /term >}}, underfitting or a learning rate too high; and fix a function whose {{< term "pyplot" >}}pyplot{{< /term >}} calls change the wrong {{< term "axes-object" >}}Axes{{< /term >}}.

{{< workbook "ch06" >}}
