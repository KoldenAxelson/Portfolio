---
title: 'How Do You Train One Model on 16,000 GPUs?'
description: "Training a frontier model is a distributed-systems problem with a very expensive failure mode. How the work is split across thousands of GPUs, how they talk, what breaks, and how labs measure the waste."
pubDate: 2026-09-24
tags: ['ml', 'training', 'distributed-systems', 'explainer']
glossary: "ml"
# In review: builds at its URL but stays off every list, feed and sitemap,
# and is noindexed. Listed at /misc/drafts/. Publish by deleting these lines.
review: true
build:
  list: never
thoughts:
  - "Most of what keeps any cluster alive applies here. The pager just costs a lot more per minute."
  - "Something in the cluster breaks every few hours and the job has to shrug it off. That's the whole post, really."
---

Meta trained its Llama 3 405B model on [up to 16,000 H100 GPUs](https://arxiv.org/abs/2407.21783) at once. In one 54-day stretch, the job was interrupted 466 times, 419 of them by surprise. That's a failure about every three hours, for weeks. And the training still made progress more than 90% of the time.

How that works is less about AI than about distributed systems. A {{< term "model" >}}model{{< /term >}} too big for any one machine has to be split across thousands of them. Those machines have to stay in lockstep over a network.

And when one dies, which is constantly, the thousands of others can't lose the week. This is the tour.

## Everyone gets a copy

{{< term "training" >}}Training{{< /term >}} is a loop: show the model a batch of examples, measure how wrong it was, and use {{< term "gradient-descent" >}}gradient descent{{< /term >}} to nudge every {{< term "weights" >}}weight{{< /term >}} a little. The simplest way to use more {{< term "gpu" >}}GPUs{{< /term >}} is {{< term "data-parallelism" >}}data parallelism{{< /term >}}: every GPU holds a full copy of the model and works on a different slice of the batch. After each step, they average their nudges so every copy stays identical.

That averaging is an {{< term "all-reduce" >}}all-reduce{{< /term >}}, and it happens every step, across every GPU. NVIDIA's {{< term "nccl" >}}NCCL{{< /term >}} library does it, and the classic trick is to [pass pieces around a ring](https://andrew.gibiansky.com/blog/machine-learning/baidu-allreduce/), so each GPU sends about the same amount of data however many GPUs join.

## When the model doesn't fit

Data parallelism breaks the moment the model is bigger than one GPU's memory, and for the frontier, it always is. Training needs far more memory than the weights alone: the nudges and the optimizer's bookkeeping take several times as much. So labs split the model itself:

- {{< term "fsdp" >}}FSDP{{< /term >}} (PyTorch's take on Microsoft's [ZeRO](https://arxiv.org/abs/1910.02054)) is data parallelism where each GPU stores only a slice and borrows the rest just in time.
- {{< term "tensor-parallelism" >}}Tensor parallelism{{< /term >}}, as in NVIDIA's [Megatron-LM](https://arxiv.org/abs/1909.08053), splits every layer across GPUs, which talk constantly.
- {{< term "pipeline-parallelism" >}}Pipeline parallelism{{< /term >}} gives each GPU a run of layers and passes data down the line. Google's [GPipe](https://arxiv.org/abs/1811.06965) named its cost, the "bubble" while the line fills and drains.

{{< ml-parallel >}}

Real runs stack them. Llama 3 used [four kinds of parallelism at once](https://arxiv.org/abs/2407.21783). The art is placing each one where the network can carry it: the chatty tensor parallelism inside a server over {{< term "nvlink" >}}NVLink{{< /term >}}, the lighter traffic across the slower links between servers.

## Things break, constantly

At this scale, hardware failure isn't an incident. It's the weather.

In Meta's 54-day snapshot, about 78% of the unexpected interruptions were confirmed or suspected hardware problems, and faulty GPUs were the biggest single cause. And because all GPUs move in lockstep, one failure stops the whole job. Automation has to do the recovering: Meta reports that significant manual intervention was needed only three times in those 54 days.

The defence is the {{< term "checkpoint" >}}checkpoint{{< /term >}}: a periodic save of the model and its training state. When a machine dies, you swap it out, reload the last checkpoint, and carry on. Anything done since that save is lost.

Save too often and you waste time saving. Save too rarely and every failure throws away hours. There's a classic formula for the balance, the [Young–Daly interval](https://dl.acm.org/doi/10.1145/361147.361115), which says to save about every √(2 × save time × time between failures).

{{< ml-checkpoint >}}

Try the background-save option. That's why labs work so hard on fast, asynchronous checkpoints. PyTorch reported cutting checkpoint pauses [by 10 to 20 times](https://pytorch.org/blog/reducing-checkpointing-times/) that way. Meta's paper says it aimed to "increase checkpoint frequency to reduce the amount of lost work after a recovery."

## Measuring the waste

All this machinery leaks efficiency, so labs track one number: {{< term "mfu" >}}MFU{{< /term >}}, the share of the hardware's peak math that went into actual training. Google [introduced the metric](https://arxiv.org/abs/2204.02311) in 2022, when PaLM hit 46.2% on 6,144 {{< term "tpu" >}}TPU{{< /term >}} chips. Llama 3 reached 38–43%. In 2021, NVIDIA ran a trillion-weight model on 3,072 GPUs at [52% of peak](https://arxiv.org/abs/2104.04473), though that count includes recomputed work that MFU leaves out.

Leaving around half the silicon idle is normal, because the rest of the time goes to waiting on memory, the network and each other.

Efficiency is also why a run's cost is hard to state. DeepSeek said its V3 model's final training took [2.788 million GPU hours](https://arxiv.org/abs/2412.19437), about $5.6 million at $2 an hour, on 2,048 GPUs. The same paper notes that figure excludes "prior research and ablation experiments." The final run is the tip of the budget.

## So how do you train on 16,000 GPUs?

Like any big distributed system, with more at stake. Split the work so each piece fits, route the chattiest traffic over the fastest links, expect a machine to die every few hours, and checkpoint so that a death costs minutes, not days. Then measure how much of the hardware you're really using, and fight for every percent. If you'd like to try the smallest version yourself, Kaggle's free notebooks offer [two T4 GPUs](https://www.kaggle.com/docs/notebooks) (as of September 2026), enough for a real, if tiny, data-parallel run.

## References & further reading

In the order the article reaches them.

{{< ml-references >}}
