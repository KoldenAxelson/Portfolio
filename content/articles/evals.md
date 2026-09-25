---
title: 'How Do You Know a Model Got Better?'
description: "Evals, explained for people who ship software: test sets and the leaks that ruin them, why grading language is hard, LLM judges and their biases, and turning all of it into a gate your deploys have to pass."
pubDate: 2026-09-24
tags: ['ml', 'evals', 'mlops', 'explainer']
glossary: "ml"
# In review: builds at its URL but stays off every list, feed and sitemap,
# and is noindexed. Listed at /misc/drafts/. Publish by deleting these lines.
review: true
build:
  list: never
thoughts:
  - "Evals are just tests. Tests where the expected output is 'something good'. That's the hard part."
  - "I trust a model roughly as much as I trust the eval suite behind it."
---

In the [first post of this series](/articles/what-is-ml-infrastructure/), a new model only ships if it gets through the {{< term "eval-gate" >}}eval gate{{< /term >}}: an automatic check that it beats the one already running. I made it sound simple. It's the least simple box in the diagram.

For ordinary code, a test knows the right answer: add 2 and 2, and you must get 4. For a language model, the right answer to "write a polite reply to this angry customer" is *any of a million good replies*. This post is about how teams measure that anyway, and the ways the measuring goes wrong.

## Hold some data back

A basic rule of machine learning: never grade a model on examples it trained on. You keep a {{< term "test-set" >}}test set{{< /term >}} locked away, and its score is your honest estimate of how the model does on data it hasn't seen. Google's [ML Test Score](https://research.google/pubs/the-ml-test-score-a-rubric-for-ml-production-readiness-and-technical-debt-reduction/) rubric treats this kind of testing as a basic requirement for production readiness.

The big threat is {{< term "data-leakage" >}}data leakage{{< /term >}}. Language models train on a large share of the public internet, and public test questions end up on the internet. In 2024, Scale AI researchers had [a fresh set of grade-school math problems](https://arxiv.org/abs/2405.00332) written in the style of a popular {{< term "benchmark" >}}benchmark{{< /term >}}. Several model families scored up to 8% lower on the new questions, a sign they'd partly memorized the old test, though most frontier models showed little drop.

## Grading the ungradeable

Some answers can be checked mechanically: a math result, code that passes its tests, a label from a fixed list. Most can't. Is this summary faithful? Is this reply helpful, correct and in the right tone?

The gold standard is people, and people are slow and expensive. So the field leaned on public benchmarks, until models beat them. By early 2025, top models scored [over 90% on MMLU](https://arxiv.org/abs/2501.14249), a benchmark once considered hard, so researchers built harder ones like Humanity's Last Exam. When everyone optimizes for the same scoreboard it stops telling you much; the economist's version is Goodhart's law, in anthropologist [Marilyn Strathern's phrasing](https://www.cambridge.org/core/product/identifier/S1062798700002660/type/journal_article): "When a measure becomes a target, it ceases to be a good measure."

## Let a model grade it

The cheap alternative is an {{< term "llm-as-judge" >}}LLM-as-judge{{< /term >}}: ask a strong model which of two answers is better. It works surprisingly well. A 2023 study found GPT-4's verdicts [agreed with humans over 80% of the time](https://arxiv.org/abs/2306.05685), about as often as humans agree with each other.

It also has known biases. The same study measured a preference for longer answers, and saw hints, too weak to call, that judges favour their own writing. Another found [position bias](https://arxiv.org/abs/2305.17926): just by changing the order of the answers, a small model beat ChatGPT on 66 of 80 questions, with ChatGPT as the judge. Try being the grader, then hand it to the judge:

{{< ml-judge >}}

The fixes are dull, and most of them work. Ask twice with the order swapped and only count consistent verdicts. Don't trust an instruction to ignore length: in the study that measured the length preference, two of three judges still preferred padded answers anyway. Give it the facts to grade against, like the shop policy in the demo.

And spot-check it against a person, often.

## Bugs you fixed stay fixed

Beyond the headline score, one of the most useful evals is also the most boring: a {{< term "regression-suite" >}}regression suite{{< /term >}}. Every time the model gets something embarrassingly wrong in production, the input and the correct behaviour go into the suite. Every future version must pass all of it.

Anthropic's guidance on evals leans the same way. It says to [mirror your real-world task distribution, and to "prioritize volume over quality"](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests): many automatically graded cases beat a few perfect hand-graded ones. Public leaderboards have their own problems. A 2025 paper argued Chatbot Arena's rankings were skewed because [some providers could test many private variants and publish only the best](https://arxiv.org/abs/2504.20879).

## Evals in CI

Put it together and an eval gate is a CI job. On every change to a prompt, a model version, a {{< term "model-routing" >}}routing{{< /term >}} threshold or a retrieval setting, run the suite, score it with code where you can and a judge where you can't, and fail the build if the score drops. Open-source tools already do this: [promptfoo](https://www.promptfoo.dev/docs/integrations/ci-cd/) plugs into CI pipelines, and the UK AI Security Institute's [Inspect](https://inspect.aisi.org.uk/) is a full evaluation framework. OpenAI [open-sourced its Evals framework](https://openai.com/index/gpt-4-research/) alongside GPT-4 in 2023.

Then keep evaluating after the deploy. {{< term "monitoring" >}}Monitoring{{< /term >}} samples live traffic, grades it the same way, and tells you when quality {{< term "drift" >}}drifts{{< /term >}}.

## So how do you know it got better?

You write down what "better" means before you look. A locked test set that never leaks, a regression suite of every past failure, checks in code wherever an answer can be checked, and a judge you've caught being biased and corrected. None of it is glamorous, but it's the difference between shipping a model you believe improved and shipping one you can show improved. That's what the gate is for.

## References & further reading

The testing basics first, then judges and leaderboards.

{{< ml-references >}}
