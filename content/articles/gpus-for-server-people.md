---
title: 'Why Does a GPU Spend Most of Its Time Waiting?'
description: "GPUs for people who run servers: why AI runs on thousands of simple cores, why memory bandwidth matters more than raw speed, and why batching is one of the biggest tricks in serving."
pubDate: 2026-09-24
tags: ['ml', 'hardware', 'inference', 'explainer']
glossary: "ml"
draft: true
thoughts:
  - "On a server you blame the CPU first. On a GPU it almost never is the math."
  - "The fastest chip in the building, and its main job is waiting for the delivery truck."
---

An NVIDIA H100 SXM, a common data-center AI chip, can do about a thousand trillion 16-bit operations every second ([NVIDIA's spec sheet](https://www.nvidia.com/en-us/data-center/h100/), without the sparsity trick). Now ask it to write a reply, one word at a time, for a single user. Run the numbers for an 8-billion-weight model and its math units are busy less than 1% of the time.

The rest of the time, it's waiting. If you've ever tuned a database that was really bottlenecked on disk, you already know the shape of this problem. This post is a tour of AI hardware for server people: what a {{< term "gpu" >}}GPU{{< /term >}} is good at, what it waits on, and why "add more requests" is the answer to so many questions.

## A few fast workers, or thousands of simple ones

A server CPU is a handful of very capable workers. AMD's EPYC 9965 has [192 cores](https://www.amd.com/en/products/processors/server/epyc/9005-series/amd-epyc-9965.html), each one smart enough to juggle branches, caches and a thousand different programs. An H100 SXM has [16,896 CUDA cores](https://developer.nvidia.com/blog/nvidia-hopper-architecture-in-depth/) plus 528 Tensor Cores built only for grid multiplication, each one simple, all doing the same arithmetic on different numbers at once.

That's a bad design for running a web server and a perfect one for AI, because a {{< term "neural-network" >}}neural network{{< /term >}} is mostly one operation: multiply a huge grid of numbers by another one. GPUs were built to do that for pixels. Since NVIDIA released {{< term "cuda" >}}CUDA{{< /term >}} in [2007](https://developer.nvidia.com/cuda-toolkit-archive), anyone can point that power at other math.

## The real limit is memory

Here's the part people miss. Doing arithmetic has become cheap. Moving numbers to where the arithmetic happens hasn't. A 2024 paper charted the gap: over 20 years, peak compute on server hardware [grew about 60,000 times, while memory bandwidth grew about 100 times](https://arxiv.org/abs/2403.14123).

Engineers call this the memory wall, a phrase [coined in the mid-1990s](https://dl.acm.org/doi/10.1145/216585.216588) about CPUs, and it has only gotten taller.

So AI chips spend enormous effort on memory. An H100 SXM carries 80 GB of {{< term "hbm" >}}HBM{{< /term >}}, stacked right beside the processor, with a {{< term "memory-bandwidth" >}}memory bandwidth{{< /term >}} of 3.35 TB per second. That's more than five times the [614 GB per second](https://www.amd.com/en/products/processors/server/epyc/9005-series/amd-epyc-9965.html) of that 192-core EPYC.

As of September 2026, NVIDIA's newer B200 reaches [8 TB per second](https://developer.nvidia.com/blog/inside-nvidia-blackwell-ultra-the-chip-powering-the-ai-factory-era/). The headline number on a chip is its {{< term "flops" >}}FLOPS{{< /term >}}. For {{< term "llm" >}}large language models{{< /term >}}, the bandwidth is often the number that matters.

## Waiting on memory vs. waiting on math

Every job is limited by one of two things. If data can't arrive fast enough, the job is {{< term "memory-bound" >}}memory-bound{{< /term >}}. If the math can't keep up, it's {{< term "compute-bound" >}}compute-bound{{< /term >}}. What decides it is the job's {{< term "arithmetic-intensity" >}}arithmetic intensity{{< /term >}}, the math it does per byte it reads.

The classic picture of this is the [roofline model](https://people.eecs.berkeley.edu/~kubitron/cs252/handouts/papers/RooflineVyNoYellow.pdf) from 2009, and generating text scores terribly on it. To produce each {{< term "token" >}}token{{< /term >}}, a standard (dense) model reads every one of its {{< term "weights" >}}weights{{< /term >}} from memory, uses each for one multiply and one add, and throws it away until the next token. The [vLLM paper](https://arxiv.org/abs/2309.06180) puts it plainly: this sequential generation "makes the workload memory-bound, underutilizing the computation power of GPUs."

The fix is {{< term "batching" >}}batching{{< /term >}}. Read the weights once and use them for many users' requests at the same time. The memory trip costs the same, and the math, which was nearly free, finally gets used:

{{< ml-roofline >}}

At one request, the chip is idle almost the whole step. Around a few hundred, math catches up with memory and the step is as full as it gets. This is why serving systems fight so hard to batch, why {{< term "quantization" >}}quantization{{< /term >}} speeds things up (fewer bytes to read), and why the {{< term "kv-cache" >}}KV cache{{< /term >}} matters: it's more memory to read on every step.

## The zoo

NVIDIA isn't the only option. As of September 2026, the other main {{< term "accelerator" >}}accelerators{{< /term >}} you'll meet are:

- **AMD Instinct.** The MI355X has [288 GB of HBM at 8 TB per second](https://www.amd.com/en/products/accelerators/instinct/mi350/mi355x.html), more memory per chip than an H100 or B200.
- **Google.** Its {{< term "tpu" >}}TPUs{{< /term >}}: the seventh-generation Ironwood became [generally available in March 2026](https://docs.cloud.google.com/tpu/docs/release-notes), with [192 GiB and 7.38 TB per second](https://docs.cloud.google.com/tpu/docs/tpu7x) per chip. Most customers rent them from Google Cloud; only a few giants, such as Anthropic, [buy whole racks](https://rcrtech.com/semiconductor-news/anthropics-broadcom-chip-deal/).
- **AWS Trainium.** Trainium3 launched in [December 2025](https://aws.amazon.com/about-aws/whats-new/2025/12/amazon-ec2-trn3-ultraservers/) with 144 GB at 4.9 TB per second. It's Amazon's own design, available only on AWS.

Notice that every spec starts with memory. For an ops team, "supporting a new accelerator" rarely means racking hardware. It means drivers, a compiler, the {{< term "inference" >}}inference{{< /term >}} software's support for the chip, and finding out which of your models actually run well on it.

## Many GPUs as one

The biggest models don't fit on one chip, so GPUs have to share work, and the connection between them often becomes the bottleneck. Inside a server, {{< term "nvlink" >}}NVLink{{< /term >}} gives each Blackwell GPU [1.8 TB per second](https://www.nvidia.com/en-us/data-center/nvlink/) to its neighbours (900 GB per second each way), about nine times a fast 800 Gb/s network card. NVIDIA's GB200 NVL72 stretches that to [72 GPUs in one rack](https://www.nvidia.com/en-us/data-center/gb200-nvl72/), wired so they can act like one enormous GPU.

Past the rack, it's ordinary (very fast) networking, which is where training on thousands of GPUs gets hard. That's its own post.

## So why is the GPU waiting?

Because arithmetic got cheap and moving data didn't. A GPU can do the math for a language model almost instantly. Getting the numbers to it is the slow part.

That's why so much AI performance work is really data-movement work: batch more requests per read, shrink the bytes with quantization, keep the KV cache tidy, and keep the chips close together. If you've spent a career chasing disk and network bottlenecks, you already know the job. The disk just got a lot faster, and so did everything waiting on it.

## References & further reading

Spec sheets and papers, in the order the post uses them.

{{< ml-references >}}
