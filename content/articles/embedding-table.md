---
title: 'What Is an Embedding Table?'
description: "Before a language model does anything clever, it turns your text into row numbers and copies those rows out of a big table of learned numbers. How GPT-2's 50,257-row table works, where its numbers come from, and why the same table turns up again at the very end."
pubDate: 2026-11-03
tags: ['ml', 'llm', 'explainer']
glossary: "ml"
# In review: builds at its URL but stays off every list, feed and sitemap,
# and is noindexed. Listed at /misc/drafts/. Publish by deleting these lines.
review: true
reviewOrder: 7
build:
  list: never
# Audit note from the writing session: every GPT-2 number not in the paper
# (token IDs, row 3797's values, the nearest neighbours, the 124.4M count) was computed from the released weights
# (openai-community/gpt2 on Hugging Face) and tiktoken 0.14's gpt2 encoding.
# private/ideas/blog/embedding-table-numbers.py reproduces all of them.
#
# Demos: the key visual, {{< ml/embedding-table >}} (Three.js, real GPT-2
# rows), sits after "One row per token". ml/token-ids (real GPT-2 tokens and
# row numbers) and ml/nearest-rows (real cosine scores) are 2D.
thoughts:
  - "The fanciest part of a chatbot starts with something a spreadsheet intern could do."
  - "I pulled GPT-2's real table for this. Nobody taught it a calendar, and it still files Monday next to Tuesday."
---

Type "The cat sat on the mat." into a chatbot and, before anything impressive, it does something a spreadsheet intern could do: it looks your words up in a table.

A {{< term "model" >}}model{{< /term >}} can't do math on letters, so it needs numbers. One number per word isn't enough: calling "cat" 7 tells the {{< term "model" >}}model{{< /term >}} nothing about cats. So it keeps a list of numbers for every piece of text it knows, one per row, and that stack of rows is the {{< term "embedding-table" >}}embedding table{{< /term >}}. Here's a toy one:

| Row | Token | Its numbers (made up) |
|---|---|---|
| 0 | the | 0.12, −0.40, 0.03, 0.88 |
| 1 | a | 0.10, −0.35, 0.07, 0.80 |
| 2 | dog | −0.61, 0.22, 0.95, −0.14 |
| 3 | cat | −0.58, 0.30, 0.91, −0.09 |
| 4 | sat | 0.44, 0.71, −0.26, 0.05 |

"Cat" is row 3, so the {{< term "model" >}}model{{< /term >}} goes to row 3 and copies what's there. The rest of this post does it with GPT-2's real, released {{< term "weights" >}}weights{{< /term >}}.

## Text becomes row numbers

First, a {{< term "tokenizer" >}}tokenizer{{< /term >}} chops your text into {{< term "token" >}}tokens{{< /term >}} and swaps each one for its {{< term "token-id" >}}token ID{{< /term >}}, which is its row number. GPT-2's {{< term "tokenizer" >}}tokenizer{{< /term >}} learned its splits with {{< term "byte-pair-encoding" >}}byte-pair encoding{{< /term >}}, starting from the [256 possible bytes](https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf) and merging common pairs until its {{< term "vocabulary" >}}vocabulary{{< /term >}}, with one special end-of-text token added, reached 50,257 entries.

Run "The cat sat on the mat." through it with OpenAI's [tiktoken](https://github.com/openai/tiktoken) and you get seven {{< term "token-id" >}}token IDs{{< /term >}}: 464, 3797, 3332, 319, 262, 2603 and 13. Common words get a row to themselves. Rarer ones get split, so " embedding" comes out as " embed" plus "ding".

The space is part of the token, too. " cat" with a space in front is row 3797, "cat" without one is 9246, and " Cat" is 5181. As far as the table knows, those are three different things.

{{< ml/token-ids >}}

## One row per token

GPT-2's table has 50,257 rows, and in the smallest version each row holds [768 numbers](https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf). Row 3797, the " cat" row, starts 0.010, 0.037, 0.164, −0.219 and keeps going for another 764 that no person typed in. The row is that token's {{< term "embedding" >}}embedding{{< /term >}}, and each number in it is one of the {{< term "model" >}}model{{< /term >}}'s {{< term "weights" >}}weights{{< /term >}}, set during {{< term "training" >}}training{{< /term >}}.

The lookup really is "go to row 3797". In [GPT-2's own code](https://github.com/openai/gpt-2/blob/master/src/model.py) it's a single `tf.gather` call that picks rows out of the table by number. PyTorch's version, `nn.Embedding`, [calls itself](https://docs.pytorch.org/docs/2.15/generated/torch.nn.Embedding.html) "a simple lookup table." The idea is older than either: in 2003, [Bengio and colleagues](https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf) gave each word its own learned list of numbers and kept them all in one matrix.

{{< ml/embedding-table >}}

## Where the numbers come from

The table starts as noise. [GPT-2's code](https://github.com/openai/gpt-2/blob/master/src/model.py) fills it with small random numbers, drawn from a normal distribution with a standard deviation of 0.02. Then {{< term "gradient-descent" >}}gradient descent{{< /term >}} nudges it: every time a {{< term "token" >}}token{{< /term >}} shows up in the {{< term "training" >}}training{{< /term >}} text, its row moves a little toward whatever would have helped predict the word that came next.

Tokens that turn up in the same kinds of sentences end up with similar rows. I checked GPT-2's table with {{< term "cosine-similarity" >}}cosine similarity{{< /term >}}: the six rows closest to " Monday" are the other six days of the week, and the four closest to " seven" are " six", " eight", " five" and " nine". Nobody told it about calendars or counting.

{{< ml/nearest-rows >}}

## Tokens that barely showed up

The flip side is a {{< term "token" >}}token{{< /term >}} that almost never came up. In 2023, Jessica Rumbelow and Matthew Watkins [found tokens like " SolidGoldMagikarp"](https://www.lesswrong.com/posts/aPeJE8bSo6rAFoLqg/solidgoldmagikarp-plus-prompt-generation) that GPT-3, which shares this {{< term "vocabulary" >}}vocabulary{{< /term >}}, couldn't repeat back: asked to, one version said "distribute". Their best guess was that those tokens barely took part in {{< term "training" >}}training{{< /term >}}. If so, their rows were hardly nudged from the random numbers they started as, and the {{< term "model" >}}model{{< /term >}} never learned what to do with them.

## A second table for order

A token's row says nothing about where it sits in the sentence. The {{< term "transformer" >}}Transformer{{< /term >}}, the design GPT-2 is built on, doesn't read tokens one after another, so its paper [adds position information](https://arxiv.org/html/1706.03762v7): without it, the {{< term "model" >}}model{{< /term >}} has no way to use word order. So GPT-2 keeps a second, smaller table with one row per position, 1,024 of them, and adds the position's row to the token's row before anything else happens.

That second table holds the {{< term "positional-embedding" >}}positional embeddings{{< /term >}}, and it's the same lookup with "which slot" in place of "which token". " cat" near the start of a sentence and " cat" in slot 900 enter the model as different lists.

## The same table, read backwards

At the far end, the model has to turn its final list of 768 numbers back into a choice of next token. GPT-2 reuses the {{< term "embedding-table" >}}embedding table{{< /term >}} for that too. It scores the final list against every row, and those scores are the model's {{< term "logits" >}}logits{{< /term >}}, one per token. The best match is the likeliest next token.

Using one table at both ends is called {{< term "weight-tying" >}}weight tying{{< /term >}}. [Press and Wolf](https://aclanthology.org/E17-2025/) recommended it for language models in 2017, and the original {{< term "transformer" >}}Transformer{{< /term >}} paper [shares its table](https://arxiv.org/html/1706.03762v7) the same way. For GPT-2, that's 38.6 million numbers stored once instead of twice.

## How big is it?

In the smallest GPT-2, those 38.6 million numbers are a big share of the whole. The released {{< term "weights" >}}weights{{< /term >}} hold 124.4 million learned numbers in all by my count, so the table is about 31% of the model.

The largest GPT-2 has 1,600 numbers per row, which makes its table 80.4 million numbers. The 48 layers above it grew much faster, though, so the table is only about 5% of that model's roughly 1.5 billion.

## So what is an embedding table?

It's a spreadsheet with one row per token, where every cell was learned instead of typed. The {{< term "tokenizer" >}}tokenizer{{< /term >}} turns your text into row numbers, the model copies those rows out, and from there on it's all math on lists of numbers. The intern's lookup is the plainest step in the whole model, and it's where each token first gets a meaning: a row of numbers that ended up near the rows of its friends.

## References & further reading

The GPT-2 paper and code first, then the lookup itself, its history, and the two later tricks.

{{< ml/references >}}
