---
title: 'How Do You Fit a Sentence Into One Vector?'
description: "Holographic reduced representations store who did what to whom in one fixed-length list of numbers: bind roles to words, add the pairs up, and ask questions back with arithmetic. A 1990s idea that's back in a 2023 attention design and in experimental agent memory."
pubDate: 2026-10-31
tags: ['ml', 'hrr', 'explainer']
glossary: "ml"
# In review: builds at its URL but stays off every list, feed and sitemap,
# and is noindexed. Listed at /misc/drafts/. Publish by deleting these lines.
review: true
reviewOrder: 18
build:
  list: never
thoughts:
  - "The whole trick is three operations you could do on paper. Slowly."
  - "It's a memory that gets blurrier the fuller it gets, which feels oddly human."
---

The simplest way to squeeze a sentence into one vector is to add up the {{< term "embedding" >}}embeddings{{< /term >}} of its words. That keeps the meaning and throws away the order: "dog bites man" and "man bites dog" come out as exactly the same vector, even though only one of them would make the paper.

For search that's often good enough, since search mostly wants to know what a text is about. Questions about structure (who did it, to whom, in what order) have usually meant leaving vectors behind for symbols, like a database row or a parse tree.

In the early 1990s, Tony Plate worked out a way to keep both. His [holographic reduced representations](https://doi.org/10.1109/72.377968) ({{< term "holographic-reduced-representation" >}}HRRs{{< /term >}}) keep the structure inside one fixed-length vector, and you get it back out with arithmetic.

## Three moves

Start with random vectors. Every word and every role ("agent", "action", "target") gets its own list of a few hundred random numbers. In that many dimensions, two random vectors are [almost never alike](https://cs.uwaterloo.ca/~jhoey/teaching/cogsci600/papers/Kanerva09.pdf), so each one works as a distinct symbol without any training.

The first move, {{< term "binding" >}}binding{{< /term >}}, pairs a role with its word. In an HRR it's {{< term "circular-convolution" >}}circular convolution{{< /term >}}, which gives a new vector of the same length that looks like neither part. Shrunk to three numbers, it fits in a grid:

{{< ml/convolve >}}

The second, {{< term "superposition" >}}superposition{{< /term >}}, is plain addition: add the three pairs, and one vector holds the whole sentence.

The third asks a question by running it backwards. {{< term "unbinding" >}}Unbinding{{< /term >}} the "agent" role gives back a blurry copy of "dog", smeared with noise from the other two pairs. A {{< term "cleanup-memory" >}}clean-up memory{{< /term >}}, a list of every word the system knows, checks the blur against each one by {{< term "cosine-similarity" >}}cosine similarity{{< /term >}} and picks the closest.

{{< ml/hrr >}}

The line under the sliders compares the two biting sentences. Added up without binding, they're identical. Bound to their roles, they're only somewhat alike, because the verb pair is the one thing they share.

## Why "holographic"

Plate named them after holography, because memories built this way are, as he put it, ["closely related to holographic storage"](https://doi.org/10.1109/72.377968). Each patch of a photograph holds one patch of the scene. Each patch of a hologram holds a little of all of it, so a broken piece can still show the [whole picture, through a narrower window](https://orbi.uliege.be/bitstream/2268/348457/2/Holograms%20broken.pdf).

An HRR behaves the same way. No fact sits in one place; every number carries a bit of every pair. Wipe half the numbers in the demo and the right answer still wins, by a thinner margin. At the starting length of 512, it wins even with 90% wiped.

## A memory that blurs as it fills

Every pair you add is noise for every other pair. Pile "other facts" into the demo and the right answer's lead shrinks until a wrong word wins. The fix is length: Plate found capacity grows roughly in step with the number of dimensions, and you can see it in the demo. At 128 numbers, wrong answers start showing up past 20 extra facts; from 1,024 up, every answer survives all 60.

So you get a fixed-size structure you can query with arithmetic, and you pay for it in answers that come back approximate until the clean-up memory snaps them to a known word. When you need an exact lookup every time, a database is still the better tool.

## Why it's cheap

Circular convolution looks expensive. Done directly, binding two vectors of length n takes n² multiplications. The {{< term "fft" >}}fast Fourier transform{{< /term >}} fixes that: after the transform, convolution becomes pairwise multiplication, so Plate's binding costs about n log n. The sentence demo above binds and unbinds this way, right in your browser.

## Why it's back

For years, HRRs lived mostly in cognitive science, in brain models like Chris Eliasmith's [Spaun](https://doi.org/10.1126/science.1225266), with 2.5 million neurons. Then in 2021, Ashwinkumar Ganesan's team [found a fix](https://proceedings.neurips.cc/paper/2021/hash/d71dd235287466052f1630f31bde7932-Abstract.html) that made HRRs stable enough to train inside {{< term "neural-network" >}}neural networks{{< /term >}}. Two years later, some of the same researchers rebuilt {{< term "attention" >}}attention{{< /term >}} out of HRR operations.

Ordinary attention compares every {{< term "token" >}}token{{< /term >}} with every other, so its cost grows with the square of the input's length. Their Hrrformer binds and adds instead, and [trained up to 280 times faster](https://arxiv.org/abs/2305.19534) on Long Range Arena, a {{< term "benchmark" >}}benchmark{{< /term >}} of very long inputs. They built it for malware detection, where one file can run past 100,000 bytes.

As of November 2026, open-source {{< term "agent" >}}agent{{< /term >}} projects like [Nuggets](https://github.com/NeoVertex1/nuggets) and [holomem](https://github.com/polmanas1998-star/holomem) store an AI assistant's memories in HRR-style vectors. I'd treat them as experiments for now, since the noise and capacity limits above still apply.

## So how do you fit a sentence into one vector?

Give every symbol a random vector, bind each role to its word, and add the pairs. "Dog bites man" and "man bites dog" stop being the same vector, and "who bit whom?" comes back out by unbinding and cleaning up. So HRRs sit between symbols and neural networks: the roles and words are explicit enough to query, and they live in numbers a network can learn and pass around. The price is a memory that gets noisier the more you put in it, which longer vectors push back but never remove.

## References & further reading

In the order the article reaches them.

{{< ml/references >}}
