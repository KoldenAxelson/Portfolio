---
title: "How Do You Know Your Data Wasn't Corrupted?"
description: "Bits flip in memory, on disks and on the wire. A few extra bits, chosen well, can tell you something changed, and with a little more care, which bit it was. Parity, checksums, CRCs and Hamming codes."
pubDate: 2026-11-03
tags: ['computing', 'math', 'reliability', 'explainer']
glossary: "ml"
# In review: builds at its URL but stays off every list, feed and sitemap,
# and is noindexed. Listed at /misc/drafts/. Publish by deleting these lines.
review: true
reviewOrder: 15
build:
  list: never
# Audit note from the writing session: the Hamming example (data 1011, code
# 0110011, position 6 flipped, checks 2 and 4 fail) and the HELLO/HLELO sums
# (both 372) were checked in Python. Hamming figures from the BSTJ paper
# (Sections 1-3, 5); memory-error figures from Schroeder et al. (abstract,
# Section 3.1).
#
# Demos (both 2D, real arithmetic): {{< ml/error-checks >}} closes "Dividing
# instead" (HELLO under parity, a byte sum and CRC-8; CRC-8 with JS off via
# partials/ml/crc8.html); the key visual, {{< ml/hamming-code >}}, closes
# "Checks that point" (the (7,4) code, flip any bit, plus an overall bit).
thoughts:
  - "A Hamming code is the closest thing I know to a magic trick in computing: the failed checks spell out where the mistake is."
  - "Detecting an error is cheap. Knowing where it is costs only a few bits more."
---

When researchers from Google and the University of Toronto studied memory errors across Google's servers, [about a third of machines](https://www.cs.toronto.edu/~bianca/papers/sigmetrics09.pdf) saw at least one in a year: a {{< term "bit" >}}bit{{< /term >}} or more that read back differently from how it was stored.

Nobody can stop every flip. What you can do is store or send a few extra bits worked out from the data, so that a change shows up. With slightly more care, those bits can also say where the change happened, and then you can undo it.

## One extra bit

The simplest check is a {{< term "parity-bit" >}}parity bit{{< /term >}}. Count the 1s in your data, and add one more bit so the total is even. If any single bit flips on the way, the count comes out odd and you know something went wrong.

It's cheap, and it has two blind spots. It can't tell you which bit flipped. And if two bits flip, the count is even again, and the error slips through. As Richard Hamming noted in his [1950 paper](https://zoo.cs.yale.edu/classes/cs323/doc/Hamming.pdf), the longer the block one parity bit guards, the likelier a double error becomes.

## Adding things up

A {{< term "checksum" >}}checksum{{< /term >}} goes further: add up all the bytes and send the total along. Most corruptions change the total, including many that flip several bits at once.

But a plain sum doesn't care about order. "HELLO" and "HLELO" both add up to 372, so two swapped bytes sail straight through. Some {{< term "checksum" >}}checksums{{< /term >}}, such as [Adler-32](https://www.rfc-editor.org/rfc/rfc1950), also add up the {{< term "prefix-sum" >}}running totals{{< /term >}}, so each byte's position changes the result and the swap shows up.

## Dividing instead

A {{< term "crc" >}}cyclic redundancy check{{< /term >}}, or CRC, treats the data as one long binary number and keeps the remainder after dividing by a fixed number, using a kind of division that has no carries. Ethernet ends [every frame](https://en.wikipedia.org/wiki/Ethernet_frame) with a 32-bit one.

The useful part is bursts. Damage often hits a run of neighbouring bits, not scattered ones: think of a [scratch on a disc](https://en.wikipedia.org/wiki/Burst_error-correcting_code), or lightning near a radio link. A CRC with n check bits [catches any single burst](https://en.wikipedia.org/wiki/Cyclic_redundancy_check) up to n bits long. The divisor is n + 1 bits long, and a burst of n bits or fewer is never an exact multiple of it, wherever it lands, so it always leaves a remainder.

{{< ml/error-checks >}}

## Detecting isn't fixing

Detection is enough when you can ask again. A network card that gets a bad frame [throws it away](https://en.wikipedia.org/wiki/Frame_check_sequence). If the data was sent over TCP, the sending computer notices the missing piece and [sends it again](https://www.rfc-editor.org/rfc/rfc9293#section-2.2).

Sometimes there's no again. Hamming's paper starts with the relay computers Bell Labs built for the Aberdeen Proving Ground, which ran unattended over nights and weekends. Their self-checking caught the errors, but then "frequently the computations came to a halt". He wanted codes that could fix the error and carry on.

## Checks that point

A {{< term "hamming-code" >}}Hamming code{{< /term >}} does it with several {{< term "parity-bit" >}}parity checks{{< /term >}} that overlap. In the seven-bit example Hamming works through, 4 data bits go in positions 3, 5, 6 and 7, and checks go in positions 1, 2 and 4. Each check covers the positions whose number, written in binary, includes it: check 1 covers 1, 3, 5 and 7, check 2 covers 2, 3, 6 and 7, and check 4 covers 4 to 7.

The data 1011 becomes 0110011. Flip the bit in position 6 and checks 2 and 4 fail while check 1 passes. Add up the failed checks, 2 + 4, and you get 6: the failed checks spell out the position in binary.

Flip that bit back and the data is fixed. When every check passes, the sum is 0: no error.

{{< ml/hamming-code >}}

## How far apart

Hamming also gave the general rule. The {{< term "hamming-distance" >}}Hamming distance{{< /term >}} between two code words is the number of positions where they differ. If every pair of valid words is at least 2 apart, a single flip always lands on an invalid word, so it's detected. At 3 apart, the damaged word is still closer to the right one than to any other, so it can be fixed.

At 4 apart, you can fix one flip and detect two. That kind, single-error correcting and double-error detecting, was the usual code in server memory when the Google study was done. Four of the study's six kinds of server used a stronger one, chipkill, which can fix up to 4 neighbouring bits.

## So how do you know your data wasn't corrupted?

You add a few bits worked out from the data, and check them when the data comes back. Make the checks overlap, as Hamming did, and the ones that fail point at a single bit that changed, so it can be flipped back. The memory in those Google servers used codes built on the same idea, so most of its errors were fixed in hardware without the software noticing.

## References & further reading

The papers in the order they appear.

{{< ml/references >}}
