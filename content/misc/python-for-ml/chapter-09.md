---
# ── Chapter front matter ──────────────────────────────────────────────
# title       : page heading, banner and card label
# lead        : one line under the banner (falls back to description)
# description : SEO/meta, and the card blurb fallback
# weight      : chapter order (1, 2, 3, …)
# hidden      : true keeps a work-in-progress chapter off the list
# ──────────────────────────────────────────────────────────────────────
title: "Chapter 9: Models and the Training Loop"
lead: "Five lines, run once per batch, are how a PyTorch model learns."
description: "Chapter 9 of Python for ML: nn.Module and forward, nn.Linear, nn.ReLU, nn.Sequential and nn.Embedding, CrossEntropyLoss and MSELoss, SGD and AdamW, zero_grad, backward and step, Dataset and DataLoader, batches and epochs, train and eval mode, saving a state_dict, and the bugs that train without an error."
weight: 9
---

Chapter 8 worked out one {{< term "gradient" >}}gradient{{< /term >}} and stepped one weight. A real model has thousands of weights and learns from a {{< term "batch" >}}batch{{< /term >}} of examples at a time, and the code that does it is the {{< term "training-loop" >}}training loop{{< /term >}}. It is five lines long. This chapter is about reading them, and about the bugs that run without an error.

A model is an {{< term "nn-module" >}}nn.Module{{< /term >}}: it makes its layers in `__init__` and uses them in {{< term "forward" >}}forward{{< /term >}}. {{< term "nn-linear" >}}nn.Linear{{< /term >}} multiplies by weights and adds a bias, and {{< term "nn-relu" >}}nn.ReLU{{< /term >}} zeroes the negatives between two of them. {{< term "nn-sequential" >}}nn.Sequential{{< /term >}} chains layers when that's all a model does. {{< term "nn-embedding" >}}nn.Embedding{{< /term >}} turns integer ids, such as a language model's tokens, into rows of learned numbers.

{{< py-example "ch09/model" >}}

A {{< term "loss" >}}loss function{{< /term >}} scores the output. {{< term "cross-entropy-loss" >}}nn.CrossEntropyLoss{{< /term >}} takes raw scores and class indices; softmax the scores first and you get a wrong {{< term "loss" >}}loss{{< /term >}}, not an error. {{< term "mse-loss" >}}nn.MSELoss{{< /term >}} is for predicting numbers. The {{< term "optimizer" >}}optimizer{{< /term >}} holds the model's weights: {{< term "optim-sgd" >}}torch.optim.SGD{{< /term >}} steps each one by the {{< term "learning-rate" >}}learning rate{{< /term >}} times its {{< term "gradient" >}}gradient{{< /term >}}, and {{< term "adamw" >}}torch.optim.AdamW{{< /term >}} sizes the step for each weight.

{{< py-example "ch09/loss" >}}

A {{< term "dataset" >}}Dataset{{< /term >}} hands out one example by index, and a {{< term "dataloader" >}}DataLoader{{< /term >}} groups them into {{< term "batch" >}}batches{{< /term >}}. It keeps their order unless you pass `shuffle=True`, which you want for training. One pass over all of them is an {{< term "epoch" >}}epoch{{< /term >}}.

{{< py-example "ch09/data" >}}

The stepper runs one {{< term "epoch" >}}epoch{{< /term >}} of a tiny classifier: 16 points, two {{< term "batch" >}}batches{{< /term >}} of 8. Each {{< term "batch" >}}batch{{< /term >}} goes round the same five steps: {{< term "zero-grad" >}}zero_grad{{< /term >}}, {{< term "forward" >}}forward{{< /term >}}, the {{< term "loss" >}}loss{{< /term >}}, {{< term "backward" >}}backward{{< /term >}} and {{< term "optimizer-step" >}}optimizer.step(){{< /term >}}. In this run, after each step the same {{< term "batch" >}}batch{{< /term >}} scores a lower {{< term "loss" >}}loss{{< /term >}}.

{{< code-stepper "ch09/train-loop" >}}

This is where most people slip. Leave out {{< term "zero-grad" >}}zero_grad{{< /term >}} and nothing raises: each {{< term "backward" >}}backward{{< /term >}} adds to the {{< term "gradient" >}}gradients{{< /term >}} of every {{< term "batch" >}}batch{{< /term >}} before it, as in Chapter 8. Move it between {{< term "backward" >}}backward{{< /term >}} and {{< term "optimizer-step" >}}optimizer.step(){{< /term >}} and nothing raises either: the step skips every weight whose {{< term "grad" >}}.grad{{< /term >}} is None, so nothing learns. Keep it first in the loop.

{{< term "model-train" >}}model.train(){{< /term >}} and {{< term "model-eval" >}}model.eval(){{< /term >}} switch layers that act differently in training, such as {{< term "dropout" >}}nn.Dropout{{< /term >}}, which zeroes random values. Forget {{< term "model-eval" >}}model.eval(){{< /term >}} before scoring a model with {{< term "dropout" >}}dropout{{< /term >}} and the score is noisy and can change from call to call. It doesn't stop {{< term "autograd" >}}autograd{{< /term >}} recording, so score inside {{< term "no-grad" >}}torch.no_grad{{< /term >}} too.

{{< py-example "ch09/eval-mode" >}}

A model's {{< term "state-dict" >}}state_dict{{< /term >}} is its weights by name. {{< term "torch-save" >}}torch.save{{< /term >}} writes it to a file and {{< term "torch-load" >}}torch.load{{< /term >}} reads it back. Since PyTorch 2.6, {{< term "torch-load" >}}torch.load{{< /term >}} loads only {{< term "tensor" >}}tensors{{< /term >}} and plain Python values by default, so save the {{< term "state-dict" >}}state_dict{{< /term >}}, not the whole model.

{{< py-example "ch09/save-load" >}}

The last bug does raise: a model and a {{< term "batch" >}}batch{{< /term >}} on different {{< term "device" >}}devices{{< /term >}}. An {{< term "nn-module" >}}nn.Module{{< /term >}}'s `.to(device)` moves its weights in place, but every {{< term "batch" >}}batch{{< /term >}} needs its own {{< term "tensor-to" >}}.to(){{< /term >}}. This page runs on the CPU, so a {{< term "dtype" >}}dtype{{< /term >}} mismatch stands in, fixed the same way. On a {{< term "gpu" >}}GPU{{< /term >}}, {{< term "mixed-precision" >}}mixed precision{{< /term >}} runs some of the math in 16-bit floats to save time and memory.

{{< py-example "ch09/devices" >}}

The habit this chapter adds: read a {{< term "training-loop" >}}training loop{{< /term >}} for its five lines in order, {{< term "zero-grad" >}}zero_grad{{< /term >}} first, and switch modes on purpose, {{< term "model-train" >}}model.train(){{< /term >}} to train and {{< term "model-eval" >}}model.eval(){{< /term >}} to score. [How Do You Train One Model on 16,000 GPUs?](/articles/training-on-16000-gpus/) runs this same loop on thousands of {{< term "gpu" >}}GPUs{{< /term >}} at once, splitting the {{< term "batch" >}}batch{{< /term >}} and the model between them.

## Homework

The packet has two parts: fix three bugs in a broken {{< term "training-loop" >}}training loop{{< /term >}} (a missing {{< term "zero-grad" >}}zero_grad{{< /term >}}, a score taken without {{< term "model-eval" >}}model.eval(){{< /term >}}, and a {{< term "dtype" >}}dtype{{< /term >}} mismatch standing in for a {{< term "device" >}}device{{< /term >}} one), then build and train a small classifier to at least 90% {{< term "accuracy-score" >}}accuracy{{< /term >}} on points it never saw, and load its {{< term "state-dict" >}}state_dict{{< /term >}} back. Every exercise runs on the CPU; the README says how to borrow a free {{< term "gpu" >}}GPU{{< /term >}} in Google Colab if you want to try one.

{{< workbook "ch09" >}}
