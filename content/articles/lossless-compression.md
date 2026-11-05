---
title: 'How Does a Picture Get Compressed Without Losing a Single Bit?'
description: "Lossless image compression turns neighbouring pixels into small numbers, and lifting steps do it in a way that can always be undone exactly, rounding included. The trick behind lossless JPEG 2000 and the medical scans stored with it."
pubDate: 2026-11-03
tags: ['computing', 'math', 'compression', 'explainer']
glossary: "ml"
# In review: builds at its URL but stays off every list, feed and sitemap,
# and is noindexed. Listed at /misc/drafts/. Publish by deleting these lines.
review: true
reviewOrder: 10
build:
  list: never
# Audit note from the writing session: the (4, 4) / (4, 5) collision, the
# lifted pair transform and the 5/3 row example were all checked in Python;
# the 5/3 round trip was exact on 50,000 random rows (symmetric extension at
# the edges, as JPEG 2000 does it). The sample row in "Predict, then update"
# is made up; all 16 values are the first row in data/ml/lifting-row.yaml.
#
# Demos (both 2D, sharing lifting.ts): the key visual, {{< ml/lifting-row >}},
# closes "Predict, then update" (made-up rows; real 5/3 lifting and a rounded
# average-and-difference that can't undo); {{< ml/lifting-image >}} (made-up
# picture, caution note) closes "What JPEG 2000 does with it".
thoughts:
  - "The best part of lifting is that you can round however sloppily you like and still get every bit back."
  - "Some medical images don't get to be 'close enough'. Neither do the numbers in this post."
---

A holiday photo can lose a little detail on the way to your phone and nobody minds. A hospital scan can be different: a doctor may want the exact pixels the machine recorded. Compression that hands back every {{< term "bit" >}}bit{{< /term >}} is called {{< term "lossless-compression" >}}lossless compression{{< /term >}}.

The file still has to get smaller, though. The usual move is to rewrite the picture as numbers that are mostly small and store those cheaply, and the obvious way to do it quietly throws a bit away.

## Small numbers are cheap

Neighbouring pixels are usually close in value: a patch of sky is 180, 181, 181, 183. Store the differences instead and you get numbers like 1, 0, 2. A pixel takes 8 {{< term "bit" >}}bits{{< /term >}}, but any number from −8 to 7 fits in 4, and {{< term "entropy-coding" >}}entropy coding{{< /term >}} gives the commonest numbers even shorter codes.

A {{< term "wavelet-transform" >}}wavelet transform{{< /term >}} goes further: it splits a row into a half-size smooth version and the details needed to rebuild the rest, then does the same to the smooth half, and so on. Most details come out near zero. The hard part is doing that with whole numbers and getting every one of them back.

## The rounding trap

The obvious way to split two pixels is their average and half their difference. But pixels are whole numbers, so both have to be rounded. Round down and the pair (4, 4) gives an average of 4 and a half-difference of 0, and so does (4, 5). Two different inputs land on the same output, and no decoder can tell which one it was.

Rounding both numbers throws away one bit, the one that told those two pairs apart. To be {{< term "lossless-compression" >}}lossless{{< /term >}}, every step has to be one you can run backwards exactly.

## Add this to that

The fix is the [lifting scheme](http://cm-bell-labs.github.io/who/wim/papers/lift1.pdf), Wim Sweldens' 1994 way to design {{< term "wavelet-transform" >}}wavelet transforms{{< /term >}}. A {{< term "lifting-step" >}}lifting step{{< /term >}} changes one half of the numbers by adding something worked out from the other half. To undo it, you work out the same thing from the same untouched numbers and subtract it. It doesn't matter what you added, or how roughly you rounded it: [Daubechies and Sweldens show](https://sites.math.duke.edu/~ingrid/publications/J_Four_Anal_Appl_4_p247.pdf) the scheme can always be undone.

For one pair, store the difference, d = b − a. Then store s = a + ⌊d ÷ 2⌋, the rounded-down average, so (4, 4) becomes (4, 0) and (4, 5) becomes (4, 1). To undo it, take d, which the second step left alone, work out ⌊d ÷ 2⌋ again and subtract: from (4, 1), a = 4 − ⌊1 ÷ 2⌋ = 4, then b = a + d = 5. This is the [S transform](http://cm-bell-labs.github.io/who/wim/papers/integer.pdf), and it keeps (4, 4) and (4, 5) apart.

## Predict, then update

A longer row gets two {{< term "lifting-step" >}}lifting steps{{< /term >}}. First split it into even and odd positions. The predict step guesses each odd pixel as the rounded average of its two even neighbours and keeps only the miss, the detail. The update step then nudges each even pixel by a rounded quarter of the details on either side, so the evens become a smooth half-size copy of the row.

Run a made-up row of 16 pixels (52, 55, 61, 66, 70, 61, 64, 73 and so on) through it and the details come out between −6 and 4. Undo the update, then the predict, and the original 16 come back exactly.

{{< ml/lifting-row >}}

## What JPEG 2000 does with it

Those two steps are the reversible 5/3 transform that lossless [JPEG 2000](https://www.itu.int/rec/T-REC-T.800) uses. It runs them down the columns, then along the rows, which leaves a smooth quarter-size picture and three quarters of details. Then it repeats on the smooth quarter. Colour gets the same care: the standard's reversible colour transform mixes red, green and blue with additions, differences and one rounded quarter, so it undoes exactly too.

Nothing gets rounded away after that. The transformed numbers go straight to the {{< term "entropy-coding" >}}entropy coder{{< /term >}}, which is where the file shrinks. Calderbank's team tested the idea on a standard test image called "woman". With nearly the same steps and a good entropy coder, they needed 4.17 {{< term "bit" >}}bits{{< /term >}} per pixel, about half the [8 each pixel started with](https://doi.org/10.1109/83.855427).

{{< ml/lifting-image >}}

## So how does a picture get compressed without losing a single bit?

It gets rewritten as mostly small numbers, using only moves that can be undone exactly. Each lifting step adds something worked out from one half of the numbers to the other half, so subtracting the same thing undoes it, rounding and all. DICOM, the standard hospital scanners and viewers use to store and send images, has an option for exactly this: ["JPEG 2000 (Lossless Only)"](https://dicom.nema.org/medical/dicom/current/output/chtml/part05/sect_8.2.4.html). Run those steps a few times, store the small details with short codes, and the decoder can walk every step back to the exact pixels the scanner recorded.

## References & further reading

The lifting papers first, then the standards.

{{< ml/references >}}
