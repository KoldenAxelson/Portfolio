---
title: 'Can You Add and Subtract Whole Models?'
description: "Subtract a model's starting weights from its fine-tuned ones and you get a task vector: an arrow you can add to teach a skill, or subtract to remove one. Where model arithmetic works, and the shared start it depends on."
pubDate: 2026-11-03
tags: ['ml', 'fine-tuning', 'explainer']
glossary: "ml"
# In review: builds at its URL but stays off every list, feed and sitemap,
# and is noindexed. Listed at /misc/drafts/. Publish by deleting these lines.
review: true
reviewOrder: 12
build:
  list: never
# Demos (both 2D, made-up toy models, real gradient descent): the key visual,
# {{< ml/task-vectors >}}, closes "Adding skills"; {{< ml/merge-symmetry >}}
# sits in "Models that never shared a start". Both train their first scenario in the template
# too, so they read with JS off.
#
# Audit note from the writing session: the negation, addition and soup numbers
# are from Ilharco et al. (Tables 1-2, Section 4.1) and Wortsman et al.
# (Table 1), read from the arXiv PDFs linked below.
thoughts:
  - "I still find it a little strange that you can subtract a skill from a model with a minus sign."
  - "Model arithmetic mostly works on models fine-tuned from the same trained model. Most of the trick is the shared start."
---

A {{< term "fine-tuning" >}}fine-tuned{{< /term >}} model is a long list of numbers, exactly as long as the list it started from. So you can subtract one from the other, number by number.

The difference turns out to be useful. Add it to a model and the model picks up a skill. Subtract it and the model loses one. Average several and you can get a better model than any of them.

## A model is a list of numbers

A {{< term "model" >}}model{{< /term >}}'s {{< term "weights" >}}weights{{< /term >}} are its learned numbers, and there are a lot of them: open language models in 2024 had [from 1 to over 70 billion](https://arxiv.org/abs/2403.13257). {{< term "fine-tuning" >}}Fine-tuning{{< /term >}} starts from a base model, one already trained on a broad pile of data, and nudges its weights a little to make it better at one job.

The architecture doesn't change, so weight number 1,000,000 in the fine-tuned model is the same knob as weight number 1,000,000 in the base model. That's what makes the arithmetic possible: two lists of the same length, lined up knob for knob.

## The task vector

Subtract the base {{< term "weights" >}}weights{{< /term >}} from the fine-tuned ones and you get a list of how far each knob moved. Ilharco and colleagues call it a {{< term "task-vector" >}}task vector{{< /term >}} in [the paper that introduced it](https://arxiv.org/abs/2212.04089): τ = fine-tuned − base.

Think of it as an arrow through {{< term "weights" >}}weight{{< /term >}} space, pointing from the base model toward a model that does the task. To use it, add a scaled copy to a model: base + λτ. The scale λ is a dial, and the paper picks it by checking a {{< term "validation-set" >}}validation set{{< /term >}}.

## Subtracting a skill

The arrow works backwards too. The same team fine-tuned GPT-2 Large on toxic comments, then subtracted that task vector from the base model. The share of its outputs judged toxic went from [4.8% to 0.8%](https://arxiv.org/pdf/2212.04089), while its {{< term "perplexity" >}}perplexity{{< /term >}} on ordinary text barely moved, from 16.4 to 16.9.

Image models can forget too. The team took the image model CLIP ViT-L/14 and subtracted one {{< term "task-vector" >}}task vector{{< /term >}} at a time for eight image tasks. On average, subtracting a task's vector took the base model's accuracy on that task from 64.8%, where it started, down to 19.0%. On ImageNet, which it was meant to keep, accuracy slipped from 75.5% to 72.9%.

## Adding skills

Adding goes the other way. Fine-tune the same base model on eight image tasks, add the {{< term "task-vector" >}}task vectors{{< /term >}} to it, and the result is one model that handles all eight. The best mix of vectors reached 91.2% of the accuracy of eight separate fine-tuned models, averaged over all eight tasks, and the paper notes that the best mix often doesn't use every vector.

Why don't the arrows trample each other? The paper's guess is that they barely overlap: task vectors from different tasks are ["typically close to orthogonal"](https://arxiv.org/pdf/2212.04089), pointing in nearly unrelated directions. Moving along one barely moves you along the others.

{{< ml/task-vectors >}}

The arrows can still collide. Merged models lose accuracy when task vectors [disagree on the sign](https://arxiv.org/abs/2306.01708) of the same weight, one pushing it up, another pushing it down. One fix, TIES-Merging, trims small changes, gives each weight the sign with the most total movement behind it, and averages only the changes that agree.

## Averaging a whole soup

The simplest version of the arithmetic is an average. A 2022 study [fine-tuned one base model many times](https://arxiv.org/abs/2203.05482) with different settings, then averaged the weights into a {{< term "model-soup" >}}model soup{{< /term >}}. Their best soup scored 90.94% on ImageNet, against 90.78% for the best single model in the batch.

The gain is small, but it's free: a soup is still one model, so it runs exactly as fast as each of its ingredients. Averaging the outputs of the same models would cost one full run per model.

## Models that never shared a start

All of this assumes the models started from the same trained base. Two {{< term "neural-network" >}}neural networks{{< /term >}} trained separately can solve the same problem with their {{< term "hidden-unit" >}}hidden units{{< /term >}} in a different order, and shuffling units doesn't change what a network does. Line their weights up knob for knob and you're mixing different knobs.

A shared random start isn't enough. [One study](https://arxiv.org/abs/1912.05671) trained two copies of the same freshly initialised ImageNet network, feeding each the data in a different order. The soups paper reports that averaging the two ["achieves no better than random accuracy"](https://arxiv.org/pdf/2203.05482). A later paper showed that lining the units up first, [shuffling one model to match the other](https://arxiv.org/abs/2209.04836), lets some separately trained models be merged after all.

{{< ml/merge-symmetry >}}

Even so, merging in practice sticks to relatives. [MergeKit](https://arxiv.org/abs/2403.13257), a toolkit that combines published {{< term "open-weights" >}}open-weights{{< /term >}} models without extra training, had been used to merge thousands of models by 2024, its authors say, mostly ones fine-tuned from a shared base.

## So can you add and subtract whole models?

Yes, as long as they share a trained starting point. {{< term "fine-tuning" >}}Fine-tuning{{< /term >}} moves a model's {{< term "weights" >}}weights{{< /term >}} along an arrow, and arrows can be added, reversed and averaged. Models trained separately don't share a coordinate system, so their arrows can't be lined up without extra work.

## References & further reading

The papers first, then the tools.

{{< ml/references >}}
