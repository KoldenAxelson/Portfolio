---
title: 'Why Pay for the Smartest Model Every Time?'
description: "Most questions don't need your most expensive model. Routing, cascades, distillation and caching: the four ways to send each request to the cheapest model that can handle it, and how to know it's still good enough."
pubDate: 2026-09-25
tags: ['ml', 'inference', 'efficiency', 'cost', 'explainer']
glossary: "ml"
thoughts:
  - "Third in the 'make AI cheap' trio, after quantization and decision models. This one is mostly plumbing, which is why I like it."
  - "Same reason you don't page the principal engineer to reset a password."
---

A restaurant doesn't send every order to the head chef. Toast goes to the line cook. The head chef gets the dish that can go wrong. Plenty of AI apps do the opposite: every request, from "what's your refund policy?" to a thorny legal question, goes to the same big, expensive {{< term "model" >}}model{{< /term >}}.

The price gap is large. As of September 2026, Anthropic's cheapest current model, Claude Haiku 4.5, costs $1 per million input {{< term "token" >}}tokens{{< /term >}}, and its priciest, Claude Fable 5.1, costs $10 ([pricing page](https://platform.claude.com/docs/en/about-claude/pricing)). That's ten times the price for questions the small one could often answer just as well. This post covers the four common ways to stop overpaying, and the one thing that keeps them honest.

## Routing: decide before you ask

{{< term "model-routing" >}}Model routing{{< /term >}} puts a quick decision in front of your models. A small, fast {{< term "classification" >}}classifier{{< /term >}} reads each request and picks who answers: the cheap model, the expensive one, or a person. That classifier can be a {{< term "decision-model" >}}decision model{{< /term >}} like [Jev](/articles/jev-decision-models/), which TypeSafe documents [for exactly this](https://docs.typesafe.ai/patterns/intent-routing).

It works at scale. When OpenAI launched GPT-5 in August 2025, it described it as fast and deeper-thinking models behind ["a real-time router that quickly decides which to use"](https://openai.com/index/introducing-gpt-5/).

Researchers at UC Berkeley and Anyscale built routers that learn from human preference data. Their [RouteLLM project](https://lmsys.org/blog/2024-07-01-routellm/) reported costs cut by more than 85% on one {{< term "benchmark" >}}benchmark{{< /term >}} while keeping 95% of GPT-4's quality. AWS offers a managed router in Bedrock and claims it can cut costs [by up to 30%](https://aws.amazon.com/bedrock/intelligent-prompt-routing/).

## Cascades: try cheap, escalate when unsure

A {{< term "cascade" >}}cascade{{< /term >}} skips the upfront guess. The small model answers every request and says how sure it is. Below a {{< term "confidence-threshold" >}}confidence threshold{{< /term >}}, the request goes up to the big model. The 2023 [FrugalGPT paper](https://arxiv.org/abs/2305.05176) chained models into a cascade, with a small scoring model judging each answer, and matched the best single model "with up to 98% cost reduction" on its tests.

The catch is that escalated requests pay twice, and the whole thing rests on {{< term "calibration" >}}calibration{{< /term >}}: a small model that's confidently wrong never escalates. Drag the threshold:

{{< ml-route >}}

Set it too low and wrong answers slip through cheaply. Set it too high and you're paying for both models on most requests. The sweet spot is where quality stops rising, and you find it by measuring.

## Distillation: teach the small model your job

If the small model is almost good enough, make it better at your specific task. {{< term "distillation" >}}Distillation{{< /term >}} trains a small model on a big model's answers. The name comes from [Hinton and colleagues in 2015](https://arxiv.org/abs/1503.02531), who built on earlier work squeezing big models into small ones.

A famous early result, [DistilBERT](https://arxiv.org/abs/1910.01108), came out 40% smaller and 60% faster while keeping 97% of its teacher's language understanding. In January 2025, DeepSeek released six smaller models, from 1.5 to 70 billion {{< term "weights" >}}weights{{< /term >}}, [distilled from its R1 reasoning model](https://arxiv.org/abs/2501.12948v1).

For your own app, it's the same move: log what the big model answers on your real traffic, then use {{< term "fine-tuning" >}}fine-tuning{{< /term >}} to train a small model on those answers. Your cascade then escalates less often.

## Caching: the cheapest answer is one you already gave

Plenty of requests repeat. A {{< term "semantic-cache" >}}semantic cache{{< /term >}} stores answers and returns one when a new question means the same thing as an old one, matching them by {{< term "embedding" >}}embeddings{{< /term >}} rather than exact text. Open-source tools like [GPTCache](https://github.com/zilliztech/GPTCache) do this.

Providers also offer {{< term "prompt-caching" >}}prompt caching{{< /term >}} for the part of a prompt that never changes, like a long {{< term "system-prompt" >}}system prompt{{< /term >}} or a reference document. On Anthropic's API, a cache hit on most models [costs a tenth of the normal input price](https://platform.claude.com/docs/en/build-with-claude/prompt-caching). Caching stacks with everything above.

## Keeping it honest

Every one of these trades a little quality risk for a lot of money, so the only safe way to run them is with measurement. Keep a {{< term "test-set" >}}test set{{< /term >}} of real requests with known good answers. Run it against the cheap path and the expensive path before any change to thresholds, routes or distilled models goes out. That's the {{< term "eval-gate" >}}eval gate{{< /term >}} from [the first post in this series](/articles/what-is-ml-infrastructure/), applied to cost: a change ships only if quality holds.

Then watch it in production, because routing failures are silent: a misrouted hard question gets a confident, wrong, cheap answer, and nothing crashes.

Traffic also {{< term "drift" >}}drifts{{< /term >}}: a new product launch fills your stream with questions the small model has never seen, and quality slides a percent at a time. Sample escalations and non-escalations, grade them, and track the numbers like any other SLO.

## So why pay for the smartest model every time?

You shouldn't: most of your traffic is toast. Let a line cook handle it, send the hard dishes to the head chef, reuse what you've already cooked, and train the line cook on the chef's recipes. Along with [quantization](/articles/quantization-living-history/) and [decision models](/articles/jev-decision-models/), it's one of the big levers on the AI bill. The one rule is that you can't cut the cost of quality you aren't measuring.

## References & further reading

In the order the post cites them.

{{< ml-references >}}
