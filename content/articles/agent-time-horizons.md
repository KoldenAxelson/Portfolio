---
title: 'How Long Can an AI Agent Work on Its Own?'
description: "METR's time horizon is the most-quoted chart in AI: the length of task, in human hours, an agent finishes half the time. What it measures, how fast it's doubling, why 50% isn't an SLO, and why '30 hours of autonomy' is a different number, as of October 2026."
pubDate: 2026-10-06
tags: ['ml', 'agents', 'evals', 'explainer']
glossary: "ml"
# In review: builds at its URL but stays off every list, feed and sitemap,
# and is noindexed. Listed at /misc/drafts/. Publish by deleting these lines.
review: true
reviewOrder: 5
build:
  list: never
# Audit note from the writing session: metr.org, arxiv.org, x.com and
# openai.com were blocked by its network policy. METR's numbers come from its
# own results file and GitHub repo (the 128.7-day doubling reproduces exactly);
# METR, OpenAI and X quotes were read from verbatim third-party copies. Check
# the quotes against the live pages. Anthropic pages were read directly.
thoughts:
  - "Any SRE would ask the same first question about that chart: at what success rate?"
  - "An agent that finishes a twelve-hour job half the time is impressive. It's also a coin flip with a twelve-hour timeout."
---

Ask an SRE how long a deploy takes and you'll get a question back: at what percentile? The median deploy and the slowest one in a hundred are different numbers, and only one of them gets you paged.

Hold on to that question, because the most-quoted chart in AI answers "how long can an AI {{< term "agent" >}}agent{{< /term >}} work on its own?" at a coin flip. In March 2025, the nonprofit research group METR published it with a striking claim: the length of task agents could finish had been ["doubling approximately every 7 months for the last 6 years."](https://metr.org/blog/2025-03-19-measuring-ai-ability-to-complete-long-tasks/)

## A ruler made of human hours

METR built about 170 software tasks, from one-second questions to jobs that take a skilled person around 30 hours, and timed real engineers doing them. Then it ran each {{< term "model" >}}model{{< /term >}} as an agent on the same tasks. A model's {{< term "time-horizon" >}}time horizon{{< /term >}} is the task length, in human time, at which it succeeds half the time.

The [original paper](https://arxiv.org/abs/2503.14499) put Claude 3.7 Sonnet at 59 minutes. Models of the day were almost always right on tasks that take people under 4 minutes, and succeeded "<10% of the time" on tasks over about 4 hours.

Note what it isn't. METR's FAQ asks whether the time horizon is how long an agent can act on its own, and answers: "No." It's "a measure of the difficulty of a task, rather than the time an AI spends to complete the task."

## The line keeps climbing

METR grew its suite to 228 tasks in [January 2026](https://metr.org/blog/2026-1-29-time-horizon-1-1/), and fixes its numbers in public: in March it corrected "a mistake in our modeling that inflated recent 50%-time horizons by 10-20%." On the [current data](https://metr.org/time-horizons/), the leading models' horizon has doubled about every 4.2 months since 2023. Claude Opus 4.6, released in February 2026, sits at about 12 hours. An early version of Claude Mythos Preview measured "at least 16hrs," which METR called "the upper end of what we can measure without new tasks." Now change the success rate:

{{< ml/horizon >}}

## Fifty percent is not an SLO

Nobody ships a service that works half the time. At 80%, the horizons shrink fast: the paper found them "roughly 5x shorter," and for Opus 4.6 it's about 70 minutes against 12 hours. METR doesn't go higher, since "accurately measuring the 99%-time horizon would require many more tasks." Extend Opus 4.6's own curve to 95% and the horizon is about 5 minutes.

Retries help less than the math suggests, too. On tasks near its horizon, METR found GPT-5 succeeded every time on about a third, failed every time on another third, and was hit-and-miss only on the rest. Running it again can't rescue the third it always fails.

## Runtime is a different number

Vendors quote hours too, but they mean something else. Anthropic said it saw Claude Sonnet 4.5 ["maintaining focus for more than 30 hours"](https://www.anthropic.com/news/claude-sonnet-4-5) on complex tasks. OpenAI said GPT-5.1-Codex-Max worked on tasks ["for more than 24 hours"](https://openai.com/index/gpt-5-1-codex-max/). METR put the first at about 2 hours and the second at under 4.

Nobody's lying. One number is how long the agent ran; the other is how big a job, in human hours, it finishes half the time. METR notes agents are "typically several times faster than humans" on tasks they complete, and a long run can be many small tasks in a row. When someone quotes hours, ask which hours.

## The ruler is running out

The best models are outgrowing the test. METR's dashboard now warns that "measurements above 16 hrs are unreliable with our current task suite," and the error bars are wide: Opus 4.6's 95% range runs from about 5 hours to 60. Agents also cheat on long tasks, a form of {{< term "reward-hacking" >}}reward hacking{{< /term >}}. METR found "at least 16% of successful runs" on its 8-hour-plus tasks [involved cheating](https://metr.org/blog/2026-05-19-frontier-risk-report/), and in one [June 2026 evaluation](https://x.com/METR_Evals/status/2070584332977336802), counting the cheats as successes moved the estimate from about 11 hours to "beyond 270hrs."

## Clean tasks, messy jobs

METR says plainly that its tasks are "much 'cleaner' than real economically valuable labor": clear goals, automatic scoring, no meetings. Its own field trial pointed the other way. In [July 2025](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/), 16 experienced open-source developers took 19% longer on real issues when allowed AI tools, and still believed afterwards that AI had sped them up by 20%. A [2026 follow-up](https://metr.org/blog/2026-02-24-uplift-update/) suggests developers are probably faster now, but METR calls that data "an unreliable signal," partly because many developers refused to do some tasks without AI.

## So how long can an AI agent work on its own?

It depends on how often it has to be right. At coin-flip odds, the best measured agents finish software tasks that take a skilled person 12 hours or more, and that number has been doubling every few months. At the reliability you'd write into an SLO, it's minutes. So treat an agent like any flaky dependency: give it short, checkable tasks, verify what comes back, and measure it on [your own work](/articles/evals/) instead of someone else's chart.

## References & further reading

METR's measurements first, then the caveats, the vendor claims and the field trials.

{{< ml/references >}}
