---
title: 'Should You Rent AI or Run Your Own?'
description: "API or your own GPUs? The cost crossover, speed, privacy, quality and who gets paged at 3 a.m., with September 2026 prices and a break-even calculator."
pubDate: 2026-09-24
tags: ['ml', 'inference', 'cost', 'explainer']
glossary: "ml"
draft: true
thoughts:
  - "Every infra team has the build-versus-buy argument eventually. This is the AI edition, with numbers."
  - "Prices in this post will be wrong by Christmas. The shape of the answer won't be."
---

Here's a question every team using AI ends up asking. You can pay per {{< term "token" >}}token{{< /term >}} to use someone else's model through an API. Or you can download an {{< term "open-weights" >}}open-weights{{< /term >}} model and run it yourself, on {{< term "gpu" >}}GPUs{{< /term >}} you rent or buy.

Same question in, an answer out. Which is cheaper, faster, safer?

The honest answer is "it depends", so here's what it depends on. Prices are as of September 2026 and they move fast. Treat the numbers as a snapshot and the reasoning as the point.

## The cost: a meter or a lease

An API is a meter. Anthropic charges [$2 per million input tokens and $10 per million output](https://platform.claude.com/docs/en/about-claude/pricing) for Claude Sonnet 5. Hosted open models are much cheaper: Together AI serves Meta's Llama 3.3 70B for [$1.04 per million](https://www.together.ai/pricing), in or out. You pay for exactly what you use, and nothing when you don't.

{{< term "self-hosting" >}}Self-hosting{{< /term >}} is a lease. Lambda rents H100s from [$4.19 an hour each in a two-GPU machine](https://lambda.ai/pricing), and a 70-billion-weight model at 16 bits needs two of them just to hold its 140 GB of {{< term "weights" >}}weights{{< /term >}}. Leave them on all month and that's about $6,100, whether they answer ten questions or ten million. So the thing that matters is {{< term "gpu-utilization" >}}GPU utilization{{< /term >}}: a GPU earns its keep only while it's busy.

{{< ml-breakeven >}}

That {{< term "break-even" >}}break-even point{{< /term >}} is sobering. Hosted open-model prices are so low that two rented GPUs have to stay busy around the clock to compete. Big, steady workloads can get there, especially with heavy {{< term "batching" >}}batching{{< /term >}} and {{< term "quantization" >}}quantization{{< /term >}}. Many teams can't, and they'd be paying for idle GPUs overnight.

## Buying the box

Owning changes the math: you pay once, plus power. NVIDIA's RTX 5090 launched at [$1,999](https://nvidianews.nvidia.com/news/nvidia-blackwell-geforce-rtx-50-series-opens-new-world-of-ai-computer-graphics) with [32 GB of memory](https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5090/), enough for a 30-billion-weight model at 4 bits. At its full [575 watts](https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5090/) around the clock, and the US average home rate of about 18 cents per kWh in July 2026 ([EIA](https://www.eia.gov/electricity/monthly/epm_table_grapher.php?t=epmt_5_6_a)), the card alone would burn roughly $77 a month in electricity.

For bigger models, Apple's Mac Studio now takes [up to 512 GB of unified memory](https://www.apple.com/mac-studio/specs/), and NVIDIA's DGX Spark packs [128 GB into a desktop box](https://www.nvidia.com/en-us/products/workstations/dgx-spark/). None of these match a data-center GPU's throughput, but for one person or a small team, they don't have to.

## Nobody else's queue

An API's speed is out of your hands. You share the provider's servers, and every account has a {{< term "rate-limit" >}}rate limit{{< /term >}} that rises as you use the service more ([Anthropic's tiers](https://platform.claude.com/docs/en/api/rate-limits) are one example). Your own GPU has no rate limit, only a capacity limit, and at low load it can be very quick: in [NVIDIA's benchmarks](https://docs.nvidia.com/nim/benchmarking/llm/1.0.0/performance.html), a small model on one H100 has a {{< term "time-to-first-token" >}}time to first token{{< /term >}} of about 10 milliseconds for a short prompt with a single user. Load it up and each user waits longer, which is the {{< term "latency" >}}latency{{< /term >}}-versus-{{< term "throughput" >}}throughput{{< /term >}} trade that runs through all of serving.

## It never left the building

This is often the real reason teams self-host. With your own hardware, prompts never leave your network, which may be the only acceptable answer for some data (the [government cloud post](/articles/ai-in-government-cloud/) is all about that).

APIs have closed some of the gap. OpenAI says [API data isn't used to train its models by default](https://developers.openai.com/api/docs/guides/your-data), and Anthropic [says the same for its commercial products](https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training). Some providers also offer {{< term "zero-data-retention" >}}zero data retention{{< /term >}} on request. But "they promised" and "it never left the building" aren't the same thing to an auditor.

## The best models aren't for sale

As of September 2026, the [top of the LMArena text leaderboard](https://arena.ai/leaderboard/text) is all closed models: their weights aren't published, so you can only reach them through someone else's service. Open models have closed much of the distance. OpenAI's own open-weights gpt-oss-120b [runs on a single 80 GB GPU](https://openai.com/index/introducing-gpt-oss/) under the Apache 2.0 license.

For well-defined tasks like classification, extraction and summarizing your own documents, an open model is often enough. For the hardest reasoning, the frontier APIs usually still lead. Either way, test both on a few hundred of your own real questions before deciding. A leaderboard can't tell you that.

## Who gets paged?

The line that never shows up in a price comparison: with an API, when the model is down, the provider's engineers are on it. With your own GPUs, it's you. Drivers, inference-server upgrades, security patches, new model versions, failed hardware and capacity planning are all yours now. That's a real cost, usually measured in engineers, not dollars per hour.

## So, rent or run?

Rent by default. Per-token pricing is cheap, elastic and someone else's pager. Run your own when your data can't leave, when your volume is big and steady enough to keep GPUs busy, or when you need control over the exact model and its latency. Start on the meter; sign the lease when the meter runs all night.

Many teams end up with both: an API for the hard questions and a small self-hosted model for the steady, sensitive, repetitive work. Whichever you pick, re-run the numbers every few months. They won't hold still.

## References & further reading

Prices first (all as of September 2026), then the rest.

{{< ml-references >}}
