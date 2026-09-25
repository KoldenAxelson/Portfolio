---
title: 'How Does a Text Predictor Become an Assistant?'
description: "A freshly trained language model doesn't answer questions; it continues them. Post-training explained: example answers, human preferences, RLHF and DPO, rewards a program can check, written principles, and the ways it all goes wrong."
pubDate: 2026-09-24
tags: ['ml', 'llm', 'post-training', 'explainer']
glossary: "ml"
draft: true
thoughts:
  - "Pretraining gives a model its knowledge. Everything that makes it pleasant, or unbearable, to talk to happens afterwards."
  - "The scariest demo on this blog is the one where you teach a model to flatter you in six clicks."
---

Ask a freshly trained language model "What's the capital of France?" and you might get back something like "What's the capital of Germany? What's the capital of Italy?" It isn't being difficult. It learned from web pages, and on the web, a question is often followed by more questions, like a quiz.

That's a {{< term "base-model" >}}base model{{< /term >}}: the output of {{< term "pretraining" >}}pretraining{{< /term >}}, trained to predict the next {{< term "token" >}}token{{< /term >}} across trillions of words. OpenAI's InstructGPT paper put the gap precisely: predicting the next token on a web page ["is different from the objective 'follow the user's instructions helpfully and safely'"](https://arxiv.org/abs/2203.02155). Closing that gap is {{< term "post-training" >}}post-training{{< /term >}}, and it's where a model gets most of what you'd call its personality.

## Step one: show it good answers

The first move is {{< term "supervised-fine-tuning" >}}supervised fine-tuning{{< /term >}}. People write example conversations, a request and an ideal reply, and the model is trained on them until "assistant answers the question" becomes the most likely continuation. For InstructGPT, OpenAI hired [about 40 contractors](https://arxiv.org/abs/2203.02155) to write and rank this data.

Examples teach the format well, including the chat format itself: whose turn it is, and when to stop talking. They're a poor way to teach judgment, because people are [much better at *recognizing* a good answer](https://arxiv.org/abs/2307.09288) than at writing the perfect one.

## Step two: learn what people prefer

So the next step asks people to compare. Show them two answers to the same prompt; they pick the better one. Collect enough of those picks and you can train a {{< term "reward-model" >}}reward model{{< /term >}} that predicts which answer a person would prefer. Then let the assistant practice, generating answers and nudging itself toward ones the reward model scores highly.

That's {{< term "rlhf" >}}RLHF{{< /term >}}, reinforcement learning from human feedback. The modern recipe comes from [a 2017 paper](https://arxiv.org/abs/1706.03741) that taught simulated robots and game-playing agents from people choosing between short clips.

It worked dramatically. In InstructGPT, people preferred answers from a tuned model with 1.3 billion {{< term "weights" >}}weights{{< /term >}} over the 175-billion-weight GPT-3, ["despite having 100x fewer parameters"](https://arxiv.org/abs/2203.02155). Try being the labeler:

{{< ml-reward >}}

The RL step is fiddly, so in 2023 researchers showed a shortcut. {{< term "dpo" >}}DPO{{< /term >}} learns straight from the preference pairs with ["only a simple classification loss"](https://arxiv.org/abs/2305.18290), no separate reward model or practice loop. It became a common choice for {{< term "open-weights" >}}open-weight{{< /term >}} models: Meta's [Llama 3](https://arxiv.org/abs/2407.21783) and AI2's Tulu 3 both use it.

## Step three: rewards a program can check

Preferences are fuzzy. Some tasks aren't: a math answer is right or wrong, and code passes its tests or doesn't. {{< term "rlvr" >}}RLVR{{< /term >}}, a name the [Tulu 3 team](https://arxiv.org/abs/2411.15124) gave it in 2024, lets the model practice on problems like these and rewards it only when a checker says it succeeded.

It's a big part of how open reasoning models such as DeepSeek-R1 got so good at math and code. DeepSeek trained R1-Zero with reinforcement learning and no example answers at all. Its score on a hard math competition, AIME 2024, rose [from 15.6% to 71.0%](https://arxiv.org/abs/2501.12948v1) as it learned, by its own practice, to write out longer and more careful reasoning.

## Step four: character and principles

The last layer is who the model is: what it refuses, how it handles hard topics, how honest it is about uncertainty. Anthropic's {{< term "constitutional-ai" >}}Constitutional AI{{< /term >}} (2022) had the model critique and revise its own answers against written principles, where ["the only human oversight is provided through a list of rules or principles"](https://arxiv.org/abs/2212.08073). In January 2026, Anthropic published [Claude's full constitution](https://www.anthropic.com/news/claude-new-constitution), and said Claude uses it to create many kinds of its own training data.

## Where it goes wrong

Anything trained to maximize a score learns to maximize the score, whether or not that's what you meant. That's {{< term "reward-hacking" >}}reward hacking{{< /term >}}. OpenAI's classic 2016 example is a boat-racing agent that [found it scored more by circling a lagoon, crashing and catching fire](https://openai.com/index/faulty-reward-functions/) than by finishing the race. In 2025, Anthropic reported that a model that learned to cheat on coding tasks [also got worse in other ways](https://arxiv.org/abs/2511.18397), including sabotaging code.

The quieter failure is {{< term "sycophancy" >}}sycophancy{{< /term >}}. People tend to rate answers that agree with them more highly, and a model trained on those ratings [partly learns to tell people what they want to hear](https://arxiv.org/abs/2310.13548). In April 2025, OpenAI [rolled back a GPT-4o update](https://openai.com/index/sycophancy-in-gpt-4o/) that had become "overly flattering or agreeable", saying it had "focused too much on short-term feedback." If you let the demo learn that you like flattery, you've just rebuilt that bug.

## So how does it become an assistant?

In layers, on top of the knowledge from pretraining: example answers teach the format, preferences teach taste, checkable rewards teach rigor, and written principles shape character. That's how the thing that answered a quiz question with more quiz questions learns to just say "Paris." But every layer points the model at a target someone chose, and it will chase that target harder than you expect. That's why the {{< term "benchmark" >}}benchmarks{{< /term >}} and evals around post-training matter as much as the training itself.

## References & further reading

The methods in the order they appeared, then the failures.

{{< ml-references >}}
