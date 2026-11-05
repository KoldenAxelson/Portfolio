---
title: 'How Do You Get the Total of Any Region Instantly?'
description: "Add everything up once, keeping a running total as you go, and the total of any stretch, or any rectangle, takes a few lookups instead of a long sum. The trick behind summed-area tables, fast face detection and Fenwick trees."
pubDate: 2026-11-03
tags: ['computing', 'math', 'algorithms', 'explainer']
glossary: "ml"
# In review: builds at its URL but stays off every list, feed and sitemap,
# and is noindexed. Listed at /misc/drafts/. Publish by deleting these lines.
review: true
reviewOrder: 13
build:
  list: never
# Audit note from the writing session: the sales row, its running totals and
# the 4 × 4 rectangle example (86 from 136 − 44 − 14 + 8) and the 28-bit
# figure for a 1,024 × 1,024 8-bit image were checked in Python. The numbers are made up. Viola & Jones figures are from the CVPR 2001
# PDF (abstract, Sections 1, 2, 2.1, 3 and 5) and the 160,000 count from
# IJCV 2004 Section 2; Fenwick's from the 1994 paper.
#
# Demos (both 2D, made-up numbers, real arithmetic): the key visual,
# {{< ml/summed-area >}}, closes "The same trick in two dimensions";
# {{< ml/fenwick >}} closes "When the numbers keep changing". Both work out their first
# state in the template too, so they read with JS off.
thoughts:
  - "My favourite kind of speed-up: do the slow work once, then never again."
  - "Four lookups for any rectangle, however big. It still feels like cheating."
---

Say you sold 3, 1, 4, 1, 5, 9, 2 and 6 things on eight days, and someone asks how many you sold on days 3 to 6. You add 4, 1, 5 and 9 and say 19. Easy.

Now say the list is a year long, and they'll ask a million questions like that, about any stretch of days. Adding up each stretch from scratch gets slow fast. With one pass of work up front, every answer takes two lookups and a subtraction, however long the stretch is.

## Keep a running total

Go along the list once, writing down the total so far at each day: 3, 4, 8, 9, 14, 23, 25, 31. That's a {{< term "prefix-sum" >}}prefix sum{{< /term >}}: each entry is everything up to and including that day. The last one, 31, is the total for the whole list.

The total for days 3 to 6 is now everything up to day 6 minus everything up to day 2: 23 − 4 = 19. Same answer, and it costs the same whether the stretch is four days or four hundred. You pay once, up front, by walking the list a single time.

## The same trick in two dimensions

A grid works the same way. In a {{< term "summed-area-table" >}}summed-area table{{< /term >}}, each cell holds the total of everything above it and to its left, itself included. You build it in one pass, too.

To total any rectangle, take the corner cell at its bottom right. That's too much: it includes the strip above the rectangle and the strip to its left. Subtract both, using the cell just above the top-right corner and the cell just left of the bottom-left corner, then add back the cell diagonally above and to the left, since that block was in both strips. For the 4 × 4 block in the demo below, that's 136 − 44 − 14 + 8 = 86.

{{< ml/summed-area >}}

## Averaging textures

Franklin Crow introduced {{< term "summed-area-table" >}}summed-area tables{{< /term >}} to computer graphics in [1984](https://doi.org/10.1145/800031.808600), for {{< term "texture-mapping" >}}texture mapping{{< /term >}}. A far-away patch of floor covers many texture pixels, and a good renderer averages them. With the table, averaging any rectangle of texture costs the same few lookups, however big the rectangle is.

The table has a cost: its totals get big, so it needs more {{< term "bit" >}}bits{{< /term >}} per entry than the image it was built from. For a 1,024 × 1,024 image of 8-bit pixels, the biggest total is 255 × 1,048,576, which takes 28 bits.

## How it found faces

In 2001, Paul Viola and Michael Jones built a face detector out of rectangles. Their {{< term "feature" >}}features{{< /term >}} compare the brightness of neighbouring boxes, such as eyes against cheeks, and a 24 × 24 window has [more than 160,000](https://doi.org/10.1023/B:VISI.0000013087.49260.fb) of them. They renamed the {{< term "summed-area-table" >}}summed-area table{{< /term >}} the "integral image", for its use in analysing pictures. With it, ["any rectangular sum can be computed in four array references"](https://www.cs.ubc.ca/~lowe/425/violaJones01.pdf).

Two boxes side by side share an edge, so comparing them takes six lookups, not eight. The detector found faces in 384 × 288 images at 15 frames a second, on a 700 MHz Pentium III.

## When the numbers keep changing

{{< term "prefix-sum" >}}Running totals{{< /term >}} are fast to read and slow to change. If day 1's number goes up by one, every running total from that day on goes up by one too. In a list of a million, one edit can mean a million updates.

That's the case Peter Fenwick wrote about in [1994](https://doi.org/10.1002/spe.4380240306). Data compressors keep counts of how often each symbol appears, and they need {{< term "prefix-sum" >}}running totals{{< /term >}} of those counts while the counts keep changing. His fix, now called a {{< term "fenwick-tree" >}}Fenwick tree{{< /term >}}, stores totals of blocks whose sizes are powers of two, chosen by the binary digits of each position. A running total is a few blocks added together, the way 13 is 8 + 4 + 1, and an edit touches only the blocks that contain it.

{{< ml/fenwick >}}

## Reading versus changing

For a table of 256 counts, Fenwick's paper predicts eight references to update an entry and five, on average, to read a running total. Both grow slowly with the size of the table: for a million counts, neither visits more than 20 blocks.

The plain running total still reads faster: one lookup per running total, against a handful of blocks. Use the plain total when the numbers stay put, as in an image or last year's sales, and the tree when they keep changing.

## So how do you get the total of any region instantly?

Do the adding once. Store a running total at every position, and the total of any stretch is the difference of two of them; in a grid, any rectangle is four lookups. If the numbers keep changing, a {{< term "fenwick-tree" >}}Fenwick tree{{< /term >}} trades a few more lookups for cheap edits. For last year's sales, you walk the list once, and every one of the million questions after that is a single subtraction.

## References & further reading

The papers in the order they appear, then a gentler introduction.

{{< ml/references >}}
