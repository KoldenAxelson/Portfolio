---
title: 'Quantization: A Living History'
description: "How AI models shrank from racks of GPUs toward laptops and phones, one fewer bit at a time. A kept-current timeline of quantization, from 2015's phone models to today's 1-bit LLMs."
pubDate: 2026-09-24
updatedDate: 2026-09-24
tags: ['ml', 'quantization', 'efficiency', 'explainer']
glossary: "ml"
thoughts:
  - "A living article: I add to this one whenever a new trick lands. The changelog at the bottom says what moved."
  - "Ten years of brilliant research, and it's mostly a very expensive argument about rounding."
---

In 2020, OpenAI's [GPT-3](https://arxiv.org/abs/2005.14165) arrived with 175 billion {{< term "weights" >}}weights{{< /term >}}. Stored the normal way, at 16 bits apiece, that's 350 gigabytes before it answers a single question. That isn't a {{< term "model" >}}model{{< /term >}} you download. It's a model you rent a slice of a data center to hold.

Five years later, OpenAI released [a 120-billion-weight model that fits on one GPU, and a 20-billion one that runs in 16 GB of memory](https://openai.com/index/introducing-gpt-oss/). That's laptop territory. The models didn't get simpler. They got *rounder*.

That rounding is {{< term "quantization" >}}quantization{{< /term >}}, the single switch on the cost dial back in [What Is ML Infrastructure?](/articles/what-is-ml-infrastructure/). This post is the story behind the switch: where we started, and every major step since toward making AI smaller, cheaper and less power-hungry. It's a living article, so I'll keep adding to it as new work lands. The changelog at the bottom says what changed and when.

## The one idea: fewer marks on the ruler

Every {{< term "weights" >}}weight{{< /term >}} in a {{< term "model" >}}model{{< /term >}} is just a number, something like 0.0173 or −1.402. How finely a computer writes that number down is its {{< term "precision" >}}precision{{< /term >}}: how many bits it spends on it. Picture a ruler. A 16-bit ruler has 65,536 marks on it. A 4-bit ruler has 16. {{< term "quantization" >}}Quantization{{< /term >}} means measuring with the coarser ruler, so every number gets rounded to the nearest mark it has.

The trade is simple. Half the bits, half the memory. And memory is the hard limit: a model has to fit before it can run at all. Moving numbers around is also most of the time and energy an AI chip spends, so fewer bits means faster, cheaper answers too. The risk is the rounding. Each weight lands a little off, and billions of small errors can add up to a model that's noticeably dumber. Everything below is people finding out how coarse the ruler can get before that happens.

Pick a model size and drag it down the bit widths. GPT-3 is the one on the right.

{{< ml-bits >}}

Look at the 70B model at 4 bits: 35 GB, more than a typical 16–32 GB laptop holds, though a high-end 64 GB one can take it. That gap is where a lot of the action has been. And all that memory lands on the bill, too. Here's the cost toy from the last post. Its switch bundles quantization with {{< term "batching" >}}batching{{< /term >}}, so read it as the direction of the saving, not its exact size.

{{< ml-cost >}}

## The whole story, one dot at a time

Here's the map. Each dot is a milestone: tap one for what changed, how many bits it's about, and a link to the original paper or announcement. The sections after it tell the story in order.

{{< ml-timeline >}}

## Before chatbots: squeezing models onto phones

The first wave had nothing to do with language. In 2015, the problem was image models too big to ship inside a phone app. Song Han, Huizi Mao and Bill Dally's [Deep Compression](https://arxiv.org/abs/1510.00149) attacked it in stages. First {{< term "pruning" >}}pruning{{< /term >}}: cut the weights that barely matter. Then round the survivors from 32 bits down to about 5. The famous AlexNet shrank from 240 MB to 6.9 MB, 35 times smaller, with no loss of accuracy. It won Best Paper at ICLR 2016, and the field took note.

Two years later, a Google team went after speed instead of size. Phone chips are much better at whole-number math than at decimals, so [Jacob et al.](https://arxiv.org/abs/1712.05877) ran entire networks in 8-bit whole numbers ({{< term "int8" >}}INT8{{< /term >}}), with one shared multiplier per group of numbers to map them back to real values. That scheme is the one TensorFlow Lite adopted. Small integers plus a shared scale is still the backbone of almost everything that follows.

## 8 bits, and nothing lost

Then the models got enormous, and the obvious move was to do to {{< term "llm" >}}large language models{{< /term >}} what had worked on phones: round them to {{< term "int8" >}}8 bits{{< /term >}}. It broke. Past a certain size, language models grow {{< term "outlier" >}}outliers{{< /term >}}, a handful of values far bigger than all the rest. Round a group containing one of them and the scale stretches so wide that every small number beside it rounds to zero. Tim Dettmers traced it to a sudden [phase shift at around 6.7 billion weights](https://timdettmers.com/2022/08/17/llm-int8-and-emergent-features/), right where the useful models start.

His fix, [LLM.int8()](https://arxiv.org/abs/2208.07339) in August 2022, is almost cheeky: keep those few {{< term "outlier" >}}outliers{{< /term >}} in 16-bit and round everything else. More than 99.9% of the math still runs in 8-bit, memory halves, and a 175-billion-weight model runs with no loss in quality. Three months later, [SmoothQuant](https://arxiv.org/abs/2211.10438) squeezed the other half of the problem: the in-between numbers a model produces as it runs, not just the stored weights. It shifts the hard-to-round part onto the weights, which handle it better, and gets both down to 8 bits for up to 1.56× the speed at half the memory.

8-bit, it turned out, is nearly free. That's why it's still the safe default today.

## Down to 4 bits, after the fact

8 bits halves the memory. {{< term "int4" >}}4 bits{{< /term >}} quarters it, but a ruler with 16 marks is rough. The breakthrough was learning to round *cleverly* with {{< term "post-training-quantization" >}}post-training quantization{{< /term >}}: take a finished model, show it a little sample data, and choose the rounding carefully, without retraining anything.

[GPTQ](https://arxiv.org/abs/2210.17323), in October 2022, rounds the weights one at a time and nudges the ones it hasn't reached yet to make up for each error it just made. It took a 175-billion-weight model down to 3 or 4 bits in about four GPU hours. A model that had needed a rack now ran on a single GPU, and more than three times faster. Then MIT's [AWQ](https://arxiv.org/abs/2306.00978), in June 2023, noticed that not all weights pull equal weight. About 1% of them, the ones wired to the biggest signals, matter most. Protect those before rounding and 4-bit models keep their accuracy. It was simple enough to become the default in serving tools, and it won Best Paper at MLSys 2024.

By mid-2023, 4-bit was the standard way to serve open models. And people had noticed something: a model that fits in 4 bits fits on a lot more than a server.

## A model on your laptop

In March 2023, a developer named Georgi Gerganov published [llama.cpp](https://github.com/ggml-org/llama.cpp/commit/26c084662903ddaca19bef982831bfb0856e8257): a plain C/C++ program whose stated goal was to run Meta's LLaMA models at 4 bits on a MacBook, using the CPU alone. It worked. Running a model ({{< term "inference" >}}inference{{< /term >}}) stopped needing a data center, or even a graphics card. It's the digit reader from the last post running in your browser, just a few hundred thousand times bigger.

The project exploded, and in August 2023 it switched to a new file format, [GGUF](https://github.com/ggml-org/llama.cpp/pull/2398): one {{< term "gguf" >}}GGUF{{< /term >}} file holds a {{< term "quantization" >}}quantized{{< /term >}} model and everything needed to run it. It's the reason "download a model and use it offline" is something regular people do. Popular apps for running models at home, like Ollama and LM Studio, grew up on llama.cpp and its files.

## Teaching a squeezed model new tricks

Running a squeezed model was solved. Changing one wasn't. {{< term "fine-tuning" >}}Fine-tuning{{< /term >}} a 65-billion-weight model still took more than 780 GB of GPU memory, which means a cluster.

[QLoRA](https://arxiv.org/abs/2305.14314), in May 2023, froze the model in 4-bit and trained only a small {{< term "lora" >}}LoRA{{< /term >}} add-on on top of it. It also brought a new 4-bit format, NF4, with its marks placed where real weights actually cluster instead of evenly. The same 65-billion-weight model now fine-tuned on one 48 GB GPU. The team's Guanaco models reached 99.3% of ChatGPT's score on the Vicuna benchmark after a day of training on a single card. Customizing a big model went from a cluster job to a one-GPU, one-day job.

## The chips catch up

Up to here, most of this was software working around chips built for 16-bit numbers. Then the chips changed. In March 2022, NVIDIA announced the [H100](https://nvidianews.nvidia.com/news/nvidia-announces-hopper-architecture-the-next-generation-of-accelerated-computing) with {{< term "fp8" >}}FP8{{< /term >}} built in, and that September NVIDIA, Arm and Intel published [the FP8 format itself](https://arxiv.org/abs/2209.05433), showing it could train models as well as 16-bit, all the way up to 175 billion weights. Floating point has a quiet advantage over whole numbers here: its marks crowd together near zero, which is exactly where most weights live.

The rest of the industry lined up behind small formats. In October 2023, AMD, Arm, Intel, Meta, Microsoft, NVIDIA and Qualcomm [agreed on the Microscaling (MX) standard](https://www.opencompute.org/blog/amd-arm-intel-meta-microsoft-nvidia-and-qualcomm-standardize-next-generation-narrow-precision-data-formats-for-ai): formats down to 4 bits, where each block of 32 numbers shares one scale. In March 2024, NVIDIA's [Blackwell](https://nvidianews.nvidia.com/news/nvidia-blackwell-platform-arrives-to-power-a-new-era-of-computing) chips added {{< term "fp4" >}}FP4{{< /term >}}, and in 2025 NVIDIA added [NVFP4](https://developer.nvidia.com/blog/introducing-nvfp4-for-efficient-and-accurate-low-precision-inference/), a finer-grained version with a scale for every 16 numbers.

So models started being *born* small instead of being squeezed afterward. [DeepSeek-V3](https://arxiv.org/abs/2412.19437), in December 2024, trained 671 billion weights largely in {{< term "fp8" >}}FP8{{< /term >}}. OpenAI's [gpt-oss](https://openai.com/index/introducing-gpt-oss/) shipped in August 2025 already in 4-bit MXFP4, which is how the 120B model fits in 80 GB. And that September, NVIDIA [trained a 12-billion-weight model on 10 trillion tokens entirely in 4-bit](https://arxiv.org/abs/2509.25149), matching its 8-bit twin. Quantization stopped being something done *to* a model and became the format it's made in.

## Starting small: 1.58 bits

Everything so far starts with a precise model and rounds it off. Microsoft Research asked the opposite question: what if the model never had precision to lose? Train it with the rounding already in place ({{< term "quantization-aware-training" >}}quantization-aware training{{< /term >}}), and let it learn weights that work on the coarsest ruler possible.

[BitNet](https://arxiv.org/abs/2310.11453), in October 2023, trained a language model from scratch with 1-bit weights. [BitNet b1.58](https://arxiv.org/abs/2402.17764), in February 2024, allowed three values instead of two: −1, 0 and +1. Three values need about 1.58 bits, hence the name, and the result matched full-precision models of the same size trained on the same data. This is the {{< term "1-bit-llm" >}}1-bit LLM{{< /term >}}, and memory isn't even the best part. Multiplying by −1, 0 or +1 is just subtracting, skipping or adding, and multiplication is where most of a chip's energy goes. The authors argue it opens the door to hardware designed around adding instead of multiplying.

It's been moving from paper to practice. Microsoft's [bitnet.cpp](https://arxiv.org/abs/2410.16144) runs these models on ordinary CPUs, 2.37 to 6.17 times faster on x86 chips than a standard full-precision setup. In April 2025 came [BitNet b1.58 2B4T](https://arxiv.org/abs/2504.12285), 2 billion weights trained on 4 trillion tokens: the first native 1.58-bit model anyone could download. The whole line is written up in [the journal version of the BitNet work](http://www.jmlr.org/papers/volume26/24-2050/24-2050.pdf). In March 2026, PrismML released [1-bit Bonsai](https://prismml.com/news/bonsai-8b), with an 8-billion-weight model in 1.15 GB (its performance claims are the company's own; [The Register has the coverage](https://www.theregister.com/2026/04/04/prismml_1bit_llm/)). Hobbyists [run these on their own machines now](https://thejeshgn.com/2026/08/25/exploring-1-bit-llms/). The catch: you can't convert an existing model into one. It has to be trained this way from scratch, which is expensive, and so far these models have stayed far smaller than the frontier.

## A different road to cheap

Everything above makes each number cheaper to store. There's another road: have the model do less work. In September 2026, TypeSafe AI [released Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev), a "decision model". Instead of writing text, it takes a question plus the answers you allow and returns the odds for each one. Writing an answer one {{< term "token" >}}token{{< /term >}} at a time is slow and costly, and a model that only has to pick skips nearly all of it. It's a different kind of cheap, and it gets its own post soon.

## Where it stands now

*As of September 2026.* {{< term "int8" >}}8-bit{{< /term >}} is the safe default: about half the memory of {{< term "fp16" >}}FP16{{< /term >}} with no quality lost worth worrying about. {{< term "int4" >}}4-bit{{< /term >}} is the everyday sweet spot. It's how most people run open models on their own hardware, through {{< term "post-training-quantization" >}}post-training quantization{{< /term >}} and {{< term "gguf" >}}GGUF{{< /term >}} files, and how new open models increasingly ship, in {{< term "fp4" >}}FP4{{< /term >}} formats the latest chips run natively. The biggest labs train in {{< term "fp8" >}}FP8{{< /term >}}, and 4-bit training has worked at 12 billion weights. {{< term "1-bit-llm" >}}1-bit LLMs{{< /term >}} are real and downloadable, but small. If you're running a model yourself today, 4-bit is the place to start.

## What to watch next

- **4-bit training at the frontier.** It works at 12 billion weights. Does it become routine for the largest models, the way 8-bit did?
- **Do 1-bit models scale?** Nobody has trained one at frontier size yet, because that means betting a frontier-size budget on it. The first lab to do so will answer the question.
- **The rest of the memory.** Weights aren't the only thing to squeeze. The {{< term "kv-cache" >}}KV cache{{< /term >}} grows with every conversation, and long conversations can make it rival the model itself.
- **Measuring the damage.** A squeezed model can match the original on average and still slip on particular tasks. Better ways to catch that matter more as the bits get fewer.
- **Chips built for adding.** If 1.58-bit models take off, hardware designed for addition instead of multiplication could make them far cheaper still.

## So how did it get to the laptop?

It got there one fewer mark on the ruler at a time. First, phones taught us that small whole numbers plus a shared scale lose almost nothing. Then 8-bit worked for giant language models once someone caught the {{< term "outlier" >}}outliers{{< /term >}}. Clever rounding got us to 4 bits, open-source tools got those 4 bits onto ordinary computers, and the chips learned to speak 8 and 4 bits natively. Now some models skip the rounding entirely and are born at 1.58 bits. The 350 GB that once needed a rack of data-center GPUs was never all necessary. Most of it was precision the model didn't need.

## References & further reading

The original papers and announcements behind every milestone, in the order the story reaches them.

{{< ml-references >}}

## Changelog

- **2026-09-24:** First published. The timeline covers October 2015 to September 2026.
