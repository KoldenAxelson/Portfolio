---
title: 'How Do You Protect a Model''s Weights?'
description: "Months of compute and a fortune in chips end up as one set of files. Why AI labs treat model weights as crown jewels, how they get stolen, the controls that stop it, and the case for giving them away."
pubDate: 2026-09-24
tags: ['ml', 'security', 'explainer']
glossary: "ml"
draft: true
thoughts:
  - "Almost every control in this post is one any ops team already runs. The file is just a lot more expensive."
  - "The most valuable thing a lab owns is a folder. Guard it accordingly."
---

Meta trained Llama 3.1 405B on H100 {{< term "gpu" >}}GPUs{{< /term >}} for [30.84 million GPU hours](https://github.com/meta-llama/llama-models/blob/main/models/llama3_1/MODEL_CARD.md). All of that work, the data, the electricity, the months of engineering, ends up as 405 billion {{< term "weights" >}}weights{{< /term >}}. At 16 bits apiece, that's about 810 GB. It fits on a single 1 TB consumer SSD.

That's the security problem: a model's weights *are* the product. Whoever holds them can run it, sell it, or use {{< term "fine-tuning" >}}fine-tuning{{< /term >}} to [strip its safety training back out](https://arxiv.org/abs/2310.03693). And unlike a factory, you can copy them in an afternoon. Mark Zuckerberg made the point himself in 2024: ["stealing models that fit on a thumb drive is relatively easy"](https://about.fb.com/news/2024/07/open-source-ai-is-the-path-forward/).

## How weights get out

It's already happened. In February 2023, Meta shared its first LLaMA with approved researchers only. Within about a week, someone [posted it as a torrent on 4chan](https://www.vice.com/en/article/facebooks-powerful-large-language-model-leaks-online-4chan-llama/). Meta sent takedown notices, but couldn't un-leak it.

In January 2026, a jury [convicted a former Google engineer](https://www.justice.gov/opa/pr/former-google-engineer-found-guilty-economic-espionage-and-theft-confidential-ai-technology) of economic espionage and theft of trade secrets. Over about a year, he'd uploaded more than 2,000 pages about Google's AI supercomputers, including its {{< term "tpu" >}}TPU{{< /term >}} chips, to his personal cloud account. That wasn't weights, but it's the textbook {{< term "insider-threat" >}}insider threat{{< /term >}}: legitimate access, used quietly, for a long time.

A thorough map of the problem is RAND's 2024 report, [Securing AI Model Weights](https://www.rand.org/pubs/research_reports/RRA2849-1.html). It counts 38 distinct ways to steal them. RAND groups them into nine families, and most are ones any ops person knows: malicious code on a server, stolen credentials, a {{< term "supply-chain-attack" >}}supply-chain attack{{< /term >}}, insiders and bribes, and physical access to the hardware.

## The controls you already know

Here's the reassuring part: almost every defence is one you've configured before. When Anthropic [raised its security bar in May 2025](https://www.anthropic.com/news/activating-asl3-protections), it said its approach uses more than 100 controls. Among them:

- **Two-person access.** No single employee can touch the weights alone. That's two-party authorization, the rule for nuclear launch keys and bank vaults.
- **Software allowlisting.** Only approved programs run on the machines near the weights.
- **Bandwidth caps.** {{< term "egress" >}}Egress{{< /term >}} from the secure environment is rate-limited. Weights are huge, so a cap that barely touches normal work turns a quick copy into a slow, visible one.

Add the usual suspects: hardware security keys against phishing, and logging that someone actually reads.

## What's new about guarding a model

Anthropic singled out those bandwidth caps as the control most specific to weights. The other new piece is hardware. {{< term "confidential-computing" >}}Confidential computing{{< /term >}} walls data off inside the hardware, even while a chip is working on it, and encrypts whatever leaves. The H100 was [the first GPU to support it](https://developer.nvidia.com/blog/announcing-confidential-computing-general-access-on-nvidia-h100-tensor-core-gpus/); with it switched on, whoever runs the host machine can't simply read the weights out of GPU memory.

The downloaded-model problem has a boring fix too. In 2024, JFrog found [about 100 malicious models on Hugging Face](https://jfrog.com/blog/data-scientists-targeted-by-malicious-hugging-face-ml-models-with-silent-backdoor/) that ran code the moment they were loaded, mostly through the old Python "pickle" format, which can carry programs. {{< term "safetensors" >}}Safetensors{{< /term >}} files [hold only numbers and a short header describing them](https://github.com/huggingface/safetensors), so loading one can't run code.

Try closing the paths yourself:

{{< ml-threats >}}

Notice that no single control closes everything, and logging closes nothing. It only tells you what's happening. RAND's version of that lesson: security "cannot be ensured by implementing a small number of 'silver bullet' security measures."

## How much is enough?

RAND sorts defences into five levels by the attacker they can stop, from SL1 ("hobbyist hackers") through SL3 (cybercrime gangs and insiders) to SL5 ("top-priority operations conducted by the world's most capable nation-states"). The [labs RAND consulted](https://www.rand.org/pubs/research_briefs/RBA2849-1.html) estimated that, if they made it a priority, reaching SL3 would take about a year, SL4 two to three, and SL5 at least five, with help from the national security community. RAND's own verdict on SL5: it "is currently not possible."

The law has started asking too. California's SB 53, [signed in September 2025](https://legiscan.com/CA/text/SB53/id/3271094), requires the largest frontier developers to publish a framework that covers "cybersecurity practices to secure unreleased model weights from unauthorized modification or transfer by internal or external parties."

## The other side: give them away

Not everyone thinks locking weights up is the goal. As of September 2026, Mistral, DeepSeek and Meta all publish {{< term "open-weights" >}}open-weights{{< /term >}} models on purpose, though Meta launched its April 2026 flagship, Muse Spark, closed. Zuckerberg's 2024 argument was that secrecy mostly fails anyway, and openness lets everyone study, fix and build on the models. In July 2024, the US Commerce Department's NTIA [reviewed the question](https://www.ntia.gov/issues/artificial-intelligence/open-model-weights-report) and recommended that the government "actively monitor" the risks rather than restrict open weights for now.

Both positions can be true at once. Publishing a model you've decided is safe to share is a choice. Having an unreleased one taken from you isn't. The security work in this post is about making sure the release is always the lab's decision.

## So how do you protect the weights?

The same way you'd protect any crown-jewel system: few people with access and never one alone, nothing runs that you didn't approve, nothing leaves faster than you can notice, and logs that someone reads. The real difference is the file. It's 810 GB, it cost a fortune, and one copy is enough to lose it for good.

## References & further reading

The incidents, then the frameworks, then the open-weights side.

{{< ml-references >}}
