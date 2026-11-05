---
title: 'Why Is the Fast Fourier Transform Fast?'
description: "The fast Fourier transform gets the same answer as the slow way with far less work. The trick is one two-number step, done on pairs, then on pairs of pairs, so shared sums get worked out once instead of over and over."
pubDate: 2026-11-03
tags: ['computing', 'math', 'signal-processing', 'explainer']
glossary: "ml"
# In review: builds at its URL but stays off every list, feed and sitemap,
# and is noindexed. Listed at /misc/drafts/. Publish by deleting these lines.
review: true
reviewOrder: 11
build:
  list: never
# Audit note from the writing session: the [1, 2, 3, 4] stages, the operation
# counts (8 vs 12 at N = 4, 24 vs 56 at N = 8, 10,240 vs 1,047,552 at
# N = 1024) and the even/odd split were checked in Python against
# scipy.linalg.hadamard and numpy.fft.fft. Quotes are from the Cooley & Tukey
# PDF linked below (the scan's OCR renders N as "JV"). The Yates 1937 line was
# cut in the cold-read pass; his paper stays in the references.
#
# Demos (both 2D): the key visual, {{< ml/fwht-butterfly >}}, closes "Pairs,
# then pairs of pairs" (8 made-up inputs, every stage worked out in the
# template and again in fwht-butterfly.ts, outputs checked against the direct
# signed sum); {{< ml/fft-cost >}} closes "Fourier adds a twist" (exact
# N² and N · log₂ N counts; the 1 ns-per-operation times carry a caution note).
thoughts:
  - "The fast Fourier transform is mostly one move, add and subtract, done in the right order. Fourier just adds a turn."
  - "The slow way and the fast way give the same answer. One of them just stops doing the same sum twice."
---

An MP3 encoder [runs a 1,024-point transform](https://www.math.utah.edu/~gustafso/s2012/2270/web-projects/Guckert-audio-compression-svd-mdct-MP3.pdf) on the music to work out which sounds your ear won't miss. The maths behind that is the {{< term "discrete-fourier-transform" >}}discrete Fourier transform{{< /term >}}, and the method [almost everything uses](https://doi.org/10.1007/BF00348431) to compute it is the {{< term "fft" >}}fast Fourier transform{{< /term >}}, or FFT.

The FFT isn't an approximation. It gets the same answer as the slow way, give or take rounding, with a tiny fraction of the work, because it never works out the same sum twice.

## The slow way

A transform of N numbers gives back N numbers. Each output measures how much of one frequency is in the signal, and each is a weighted sum of all N inputs. That's N outputs times N inputs: N² multiply-and-adds.

In Cooley and Tukey's 1965 paper, the straightforward calculation ["would require N² operations"](https://www.ece.ucdavis.edu/~bbaas/281/papers/CooleyTukey.1965.pdf), each one a multiply followed by an add. For 1,024 samples, about 23 milliseconds of CD-quality audio, that's 1,048,576 operations. Double the length and the work goes up four times.

## One two-number step

Here's the step. Take two numbers, a and b, and write down a + b and a − b. That's all.

It's called a {{< term "butterfly" >}}butterfly{{< /term >}} because of how it's drawn: two inputs on the left, two outputs on the right, and two lines crossing between them. On its own it's the smallest {{< term "walsh-hadamard-transform" >}}Walsh–Hadamard transform{{< /term >}}, the simplest transform of this kind, whose weights are only +1 and −1. It's built from the same steps as the FFT but never multiplies, so it's the easiest place to watch the trick work.

## Pairs, then pairs of pairs

Take the four numbers 1, 2, 3, 4. First, do the step on neighbouring pairs: (1, 2) gives 3 and −1, and (3, 4) gives 7 and −1.

Then do it again on pairs of pairs, matching each result with the one two places along. 3 and 7 give 10 and −4. −1 and −1 give −2 and 0. The answer is 10, −2, −4, 0.

Check one the slow way: the second output should be 1 − 2 + 3 − 4, which is −2. It is. Doing all four outputs directly takes 12 additions and subtractions; the two stages took 8.

Each stage costs N steps, and pairs, then fours, then eights reach the full length after log₂ N stages. So the cost is N · log₂ N.

{{< ml/fwht-butterfly >}}

## Why the shortcut works

The direct method keeps working out the same pieces. 10 is (1 + 2) + (3 + 4), and −4 is (1 + 2) − (3 + 4). Both need 1 + 2, but the direct method adds it up twice. The stages work it out once and use it twice.

That reuse is the whole trick: a transform of size N is two transforms of size N/2 followed by one stage of {{< term "butterfly" >}}butterflies{{< /term >}}. At N = 1,024, that's 10,240 steps instead of about a million.

## Fourier adds a twist

The {{< term "discrete-fourier-transform" >}}Fourier transform{{< /term >}}'s weights aren't just +1 and −1. Fourier works with complex numbers, which behave like arrows on a flat page, and its weights are rotations: multiplying by one turns an arrow by a fixed angle. Output k turns its arrows k times as fast as output 1. But the same split works.

Split the input into even and odd positions, and do a half-size transform on each. Call the results E and O. Then each pair of outputs is E + wO and E − wO, where w is a rotation worked out in advance for that pair: a {{< term "twiddle-factor" >}}twiddle factor{{< /term >}}. It's the same a + b and a − b, with b's arrow turned first.

Split the halves again, and again, and you get log₂ N stages of N/2 {{< term "butterfly" >}}butterflies{{< /term >}}. Cooley and Tukey's version gets the result in ["less than 2N log₂ N operations"](https://www.ece.ucdavis.edu/~bbaas/281/papers/CooleyTukey.1965.pdf).

{{< ml/fft-cost >}}

## Gauss got there first

The 1965 paper made the FFT famous, at the moment computers made it matter. But a 1985 history traced the idea back to Gauss, who used it [around 1805](https://doi.org/10.1007/BF00348431) to fit the orbits of asteroids. He never published it. It turned up in his collected works after his death, and few people noticed it there.

## Lengths that won't split

The halving trick needs a length that splits, and powers of two split cleanest. NumPy's FFT, for one, is [most efficient at powers of two](https://numpy.org/doc/stable/reference/generated/numpy.fft.fft.html), and pads a short signal with zeros when you ask for a longer transform. Cooley and Tukey's method also works for any length with small factors, like 1,000. Prime lengths can't be split at all and need other tricks, such as [Rader's algorithm](https://en.wikipedia.org/wiki/Rader%27s_FFT_algorithm).

## So why is the fast Fourier transform fast?

Because every output is built from pieces that other outputs need too. The FFT splits the job in half, solves both halves, and joins them with one stage of two-number steps: a + b and a − b, with a rotation for Fourier. Halving log₂ N times turns N² work into about N · log₂ N, and the gap grows with the length: at a million samples, it's tens of thousands of times less work. That's why an MP3 encoder can afford to do it on every block of sound.

## References & further reading

In the order the article reaches them, with the gentler introductions last.

{{< ml/references >}}
