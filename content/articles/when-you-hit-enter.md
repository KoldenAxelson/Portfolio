---
title: 'What Happens When You Hit Enter?'
description: "From keypress to streaming words: tokens, attention, next-token prediction, temperature, and the two phases of serving (prefill and decode) that decide how fast an answer arrives and what it costs."
pubDate: 2026-09-24
tags: ['ml', 'llm', 'inference', 'explainer']
glossary: "ml"
# In review: builds at its URL but stays off every list, feed and sitemap,
# and is noindexed. Listed at /misc/drafts/ in reviewOrder (the validation
# queue). Publish by deleting these lines.
review: true
reviewOrder: 10
build:
  list: never
thoughts:
  - "Every step in this post is something somebody has to serve, scale and pay for. That's the part I find interesting."
  - "A chatbot doesn't know what it's going to say. It finds out one word at a time, same as you."
---

You type a question into a chatbot and press Enter. A beat later, words start streaming out, a few at a time, like someone typing fast. It feels like one action. It's actually a small pipeline, and each stage explains something you've probably noticed: why the first word takes a moment, why the rest flow quickly, and why the same question gets a different answer twice.

## Text becomes numbers

A model can't read letters. Your message is first chopped into {{< term "token" >}}tokens{{< /term >}}, common chunks of text learned from data with {{< term "byte-pair-encoding" >}}byte-pair encoding{{< /term >}}. As a rule of thumb for English, one token is [about four characters, or three-quarters of a word](https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them). Each token becomes an ID number, and each ID is swapped for an {{< term "embedding" >}}embedding{{< /term >}}, a long list of numbers standing for its meaning.

{{< ml-tokens >}}

## Every word looks back at the words before it

Now the {{< term "transformer" >}}transformer{{< /term >}} does its work. Its key step is {{< term "attention" >}}attention{{< /term >}}, which the 2017 paper [Attention Is All You Need](https://arxiv.org/abs/1706.03762) made the whole design: each token looks back at all the tokens before it and weighs which ones matter. In "we sat on the river bank", *bank* pays attention to *river* and settles on the right meaning. A model repeats this through dozens of layers, each refining every token's meaning a little further.

The output of all that is a single thing: a score for every token in the vocabulary, saying how likely each one is to come *next*. That's all a language model ever produces. One next token.

## The next word is a dice roll

The model doesn't simply take the top-scoring token. It rolls weighted dice, which is {{< term "sampling" >}}sampling{{< /term >}}. {{< term "temperature" >}}Temperature{{< /term >}} reshapes the dice first: low values make the favourite almost certain, high values give long shots a real chance. OpenAI's API documents it as a number from 0 to 2, where ["higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic."](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)

{{< ml-temperature >}}

Many systems also let you trim the unlikely tail before rolling, a trick called [nucleus sampling](https://arxiv.org/abs/1904.09751). And even at temperature 0, answers can differ run to run. In 2025, researchers at Thinking Machines [traced that to the server](https://thinkingmachines.ai/blog/defeating-nondeterminism-in-llm-inference/): how many other users' requests are batched with yours changes the arithmetic very slightly, and one flipped token sends the rest of the answer somewhere new.

## Then it does it again, and again

The chosen token is added to the text, and the whole thing runs again for the next one. That loop is why answers stream in word by word, and it splits serving into two very different phases.

First, {{< term "prefill" >}}prefill{{< /term >}}: the model reads your entire prompt in one parallel pass. That's heavy math on many tokens at once. It's most of the pause before anything appears, measured as {{< term "time-to-first-token" >}}time to first token{{< /term >}}. It's also why a long pasted document slows the start of a reply, even when the reply itself is short.

Then {{< term "decode" >}}decode{{< /term >}}: one token per step, each step reading the entire model from memory to produce a single word. Researchers describe it as ["a compute-intensive prompt computation" phase followed by "a memory-intensive token generation" phase](https://arxiv.org/abs/2311.18677), which is why {{< term "gpu" >}}GPUs{{< /term >}} [spend so much of decoding waiting](/articles/gpus-for-server-people/).

## The cache that makes it cheap

What makes decode affordable is the {{< term "kv-cache" >}}KV cache{{< /term >}}. It keeps each token's attention data, so the model doesn't reprocess the whole conversation for every new word. It isn't small, either: for one 13-billion-weight model, the vLLM paper works out [800 KB per token, and up to 1.6 GB for a single long request](https://arxiv.org/abs/2309.06180). Hit Enter and watch it fill:

{{< ml-decode >}}

That cache is one reason a model's {{< term "context-window" >}}context window{{< /term >}} has a limit, and one reason long conversations cost more. As of September 2026, Anthropic's larger Claude models take [1 million tokens](https://platform.claude.com/docs/en/models/overview), and every one of them needs a slot.

## Making it faster

Almost every serving trick targets one of these phases. {{< term "batching" >}}Batching{{< /term >}} lets many users share each read of the model during decode. {{< term "quantization" >}}Quantization{{< /term >}} makes the model smaller to read.

{{< term "speculative-decoding" >}}Speculative decoding{{< /term >}} lets a small model guess several tokens ahead and has the big one check them in one pass, for [2 to 3 times the speed on the paper's test model, with identical output](https://arxiv.org/abs/2211.17192). Some systems now [run prefill and decode on different GPUs](https://arxiv.org/abs/2401.09670) so the two stop getting in each other's way.

## So what happens when you hit Enter?

Your text becomes tokens, tokens become numbers, and the transformer turns them into odds for one next token. A weighted dice roll picks it, and the whole loop runs again, token after token, until the answer is done. The pause before the first word is prefill; the steady stream after it is decode, one memory-bound step per token. Every stage is something someone has to serve, scale and pay for.

## References & further reading

In the order a request meets them.

{{< ml-references >}}
