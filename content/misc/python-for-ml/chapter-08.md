---
# ── Chapter front matter ──────────────────────────────────────────────
# title       : page heading, banner and card label
# lead        : one line under the banner (falls back to description)
# description : SEO/meta, and the card blurb fallback
# weight      : chapter order (1, 2, 3, …)
# hidden      : true keeps a work-in-progress chapter off the list
# ──────────────────────────────────────────────────────────────────────
title: "Chapter 8: Tensors and Autograd"
lead: "NumPy's arrays, plus a device to run on and gradients for free."
description: "Chapter 8 of Python for ML: PyTorch tensors, torch.tensor, zeros and randn, dtype and device, .to(), from_numpy and .numpy(), requires_grad and autograd, backward and .grad, torch.no_grad and detach, and the gradients that pile up when you forget to clear them."
weight: 8
---

Everything a PyTorch model learns is kept in a {{< term "tensor" >}}tensor{{< /term >}}. A {{< term "tensor" >}}tensor{{< /term >}} is NumPy's {{< term "ndarray" >}}array{{< /term >}} with two additions: it can move to a {{< term "gpu" >}}GPU{{< /term >}}, and it can remember how it was computed. From that record, {{< term "autograd" >}}autograd{{< /term >}} works out the {{< term "gradient" >}}gradient{{< /term >}} of a loss for every weight, which is what training steps on. This chapter is about where a {{< term "gradient" >}}gradient{{< /term >}} comes from, and the quiet way it goes wrong.

{{< term "torch-tensor" >}}torch.tensor{{< /term >}} makes a {{< term "tensor" >}}tensor{{< /term >}} from a {{< term "list" >}}list{{< /term >}}, {{< term "torch-zeros" >}}torch.zeros{{< /term >}} from a {{< term "shape" >}}shape{{< /term >}}, and {{< term "torch-randn" >}}torch.randn{{< /term >}} draws random numbers. Each {{< term "tensor" >}}tensor{{< /term >}} has a {{< term "shape" >}}shape{{< /term >}}, a {{< term "dtype" >}}dtype{{< /term >}} and a {{< term "device" >}}device{{< /term >}}. Python floats become `float32` here; NumPy would make `float64`.

{{< py-example "ch08/making" >}}

Mark a {{< term "tensor" >}}tensor{{< /term >}} with {{< term "requires-grad" >}}requires_grad{{< /term >}}, and {{< term "autograd" >}}autograd{{< /term >}} records every operation computed from it. Call {{< term "backward" >}}backward{{< /term >}} on a single-number result and it walks that record in reverse, which is {{< term "backpropagation" >}}backpropagation{{< /term >}}. It leaves each {{< term "gradient" >}}gradient{{< /term >}} in the {{< term "grad" >}}.grad{{< /term >}} of the {{< term "tensor" >}}tensor{{< /term >}} you marked. The stepper computes y = w·x + b and sends the {{< term "gradient" >}}gradients{{< /term >}} back.

{{< code-stepper "ch08/autograd" >}}

A {{< term "gradient" >}}gradient{{< /term >}} has the {{< term "shape" >}}shape{{< /term >}} of its {{< term "tensor" >}}tensor{{< /term >}}: `w.grad` is (3,), like `w`. Here it equals `x`, because y grows by `x[i]` for each unit added to `w[i]`. Working one out by hand and comparing it with {{< term "grad" >}}.grad{{< /term >}} is the quickest check that the graph is the one you meant.

This is where most people slip. {{< term "backward" >}}backward{{< /term >}} adds to {{< term "grad" >}}.grad{{< /term >}} rather than replacing it, and nothing raises: compute the loss again, call {{< term "backward" >}}backward{{< /term >}} again, and both {{< term "gradient" >}}gradients{{< /term >}} are added together. In a training loop, each step then moves the weights by every earlier {{< term "gradient" >}}gradient{{< /term >}} too. Clear it before each {{< term "backward" >}}backward{{< /term >}} with `w.grad = None`; Chapter 9's `optimizer.zero_grad()` does that for every weight.

{{< py-example "ch08/accumulate" >}}

Stepping a weight isn't part of the model, so {{< term "autograd" >}}autograd{{< /term >}} mustn't record it. Inside {{< term "no-grad" >}}torch.no_grad{{< /term >}} nothing is recorded; outside it, an in-place update of a weight that has {{< term "requires-grad" >}}requires_grad{{< /term >}} raises. {{< term "detach" >}}detach{{< /term >}} gives the same values cut off from the graph.

{{< py-example "ch08/no-grad" >}}

{{< term "from-numpy" >}}torch.from_numpy{{< /term >}} shares a NumPy {{< term "ndarray" >}}array{{< /term >}}'s memory, like a {{< term "view" >}}view{{< /term >}} in Chapter 3, while {{< term "torch-tensor" >}}torch.tensor{{< /term >}} makes a {{< term "copy" >}}copy{{< /term >}}. {{< term "tensor-numpy" >}}.numpy(){{< /term >}} goes the other way, sharing memory too. It refuses a {{< term "tensor" >}}tensor{{< /term >}} that has {{< term "requires-grad" >}}requires_grad{{< /term >}}, so {{< term "detach" >}}detach{{< /term >}} first.

{{< py-example "ch08/numpy-bridge" >}}

A {{< term "tensor" >}}tensor{{< /term >}}'s {{< term "device" >}}device{{< /term >}} is where its values live, and {{< term "tensor-to" >}}.to(){{< /term >}} returns a {{< term "copy" >}}copy{{< /term >}} on another one. On an NVIDIA {{< term "gpu" >}}GPU{{< /term >}} the {{< term "device" >}}device{{< /term >}} is `'cuda'`, and on a Mac's {{< term "gpu" >}}GPU{{< /term >}} it's `'mps'` (macOS 14 or later). A result lands on the {{< term "device" >}}device{{< /term >}} its inputs are on, so a model and its data must be moved to the same {{< term "device" >}}device{{< /term >}}. Every example on this page ran on PyTorch's CPU-only build, so no {{< term "gpu" >}}GPU{{< /term >}} code runs here.

{{< py-example "ch08/devices" >}}

The habit this chapter adds: before you call {{< term "backward" >}}backward{{< /term >}}, know which {{< term "tensor" >}}tensors{{< /term >}} have {{< term "requires-grad" >}}requires_grad{{< /term >}} and that their {{< term "grad" >}}.grad{{< /term >}} is clear. Then check one {{< term "gradient" >}}gradient{{< /term >}} by hand on a tiny case, like the stepper's. Chapter 9 wraps this one step in a training loop.

## Homework

The packet has three parts: write down the {{< term "shape" >}}shape{{< /term >}} of twelve {{< term "tensor" >}}tensor{{< /term >}} expressions before running them; compute two {{< term "gradient" >}}gradients{{< /term >}} by hand, then check them with {{< term "backward" >}}backward{{< /term >}}; and fix a {{< term "gradient" >}}gradient{{< /term >}} descent loop whose {{< term "gradient" >}}gradients{{< /term >}} pile up across {{< term "backward" >}}backward{{< /term >}} calls. Every exercise runs on the CPU.

{{< workbook "ch08" >}}
