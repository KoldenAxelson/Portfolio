---
title: 'How Do Computers Do Math That Wraps Around?'
description: "A 32-bit integer is a clock with 4,294,967,296 positions: count past the top and it wraps back to zero. Negative numbers are the same clock relabelled, and compilers and hash functions rely on which moves around it can be undone."
pubDate: 2026-11-03
tags: ['computing', 'math', 'arithmetic', 'explainer']
glossary: "ml"
# In review: builds at its URL but stays off every list, feed and sitemap,
# and is noindexed. Listed at /misc/drafts/. Publish by deleting these lines.
review: true
reviewOrder: 9
build:
  list: never
# Audit note from the writing session: every number on the 32-bit clock was
# checked in Python (pow(3, -1, 2**32) = 2,863,311,531; 36 x that wraps to 12;
# 35 x that is 1,431,655,777; 2 x 1 and 2 x 2,147,483,649 are both 2). The claim that
# MurmurHash3's fmix32 never sends two inputs to one output is the writer's
# reasoning from its steps (xor-shift right and odd multiplies are each
# undoable); the audit checked an inverse on all 2^32 inputs.
# Knuth's TAOCP vol. 2 isn't cited: it isn't readable online to check against.
#
# Demos (both 2D, sharing clock-face.ts): the key visual, {{< ml/wrap-clock >}},
# closes "Odd multiplies undo, even ones don't"; {{< ml/signed-clock >}} follows
# the Gangnam Style paragraph.
thoughts:
  - "Every computer is secretly doing clock arithmetic. Mine also does it at 3 a.m., apparently."
  - "Multiplying by 3 can be undone by multiplying by 2,863,311,531. I didn't believe it either until I ran it."
---

It's 9 o'clock. Five hours later it's 2, and nobody calls that a mistake: the clock only has twelve positions, so counting past the top starts again from the bottom. Your computer does its whole-number arithmetic the same way, and for a 32-bit number the clock has 4,294,967,296 positions.

That clock explains a lot of strange behaviour: why a number can get bigger and come out negative, why a plane needed a reboot schedule, and why some calculations can be run backwards while others destroy what you started with.

## A clock with four billion positions

A 32-bit {{< term "integer" >}}integer{{< /term >}} is 32 {{< term "bit" >}}bits{{< /term >}}, each a 0 or a 1, so it has 2³² = 4,294,967,296 possible patterns. Read as an {{< term "unsigned-integer" >}}unsigned integer{{< /term >}}, they're the numbers 0 to 4,294,967,295. Add 1 to the top and you're back at 0.

That's {{< term "modular-arithmetic" >}}modular arithmetic{{< /term >}}, and it's on purpose. The C standard says that a computation involving {{< term "unsigned-integer" >}}unsigned{{< /term >}} operands ["can never overflow"](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf): the answer is simply taken around the clock. The hardware agrees: RISC-V, an open instruction set for processors, defines its ADD instruction so that ["overflows are ignored and the low XLEN bits of results are written"](https://docs.riscv.org/reference/isa/v20260120/unpriv/rv32.html), where XLEN is the width of a {{< term "register" >}}register{{< /term >}} in {{< term "bit" >}}bits{{< /term >}}. On a 32-bit machine, whatever spills past the 32nd bit is dropped.

## Negative numbers are the same clock

Computers handle negative numbers without a second clock. {{< term "twos-complement" >}}Two's complement{{< /term >}} keeps all the positions and renames the top half as negatives. One step back from 0 is 4,294,967,295, so that position is called −1, and the halfway point becomes −2,147,483,648. The adding circuit doesn't change at all; only the labels do.

So in a 32-bit {{< term "signed-integer" >}}signed integer{{< /term >}}, one past the largest number, 2,147,483,647, is −2,147,483,648. The [Go language spec](https://go.dev/ref/spec#Integer_overflow) spells this out: {{< term "signed-integer" >}}signed{{< /term >}} arithmetic may {{< term "overflow" >}}overflow{{< /term >}}, and the result is still "deterministically defined" by that representation. When "Gangnam Style" passed 2,147,483,647 views in 2014, YouTube's engineers had [upgraded the counter months earlier](https://www.bbc.co.uk/news/world-asia-30288542), and they added a joke: hover over it and the digits [spun to the negative end](https://www.tubefilter.com/2014/12/03/gangnam-style-breaks-youtube-view-counter/) of the 32-bit range.

{{< ml/signed-clock >}}

## When nobody planned for the wrap

A wrap that nobody expected is an {{< term "overflow" >}}overflow{{< /term >}} bug, and some are serious. In 2015 the FAA ordered regular power-downs for Boeing 787s, because a software counter in the generator control units ["will overflow after 248 days of continuous power"](https://www.govinfo.gov/content/pkg/FR-2015-05-01/html/2015-10066.htm) and could shut off all AC power.

## Turning the clock forward and back

Every operation sends each position on the clock to some position. It can be undone exactly when no two positions land on the same spot, because then every result has a single starting point to walk back to.

Adding always passes that test. Adding 5 turns the whole clock five steps, and subtracting 5 turns it back, even when the first move went past the top. Flipping a fixed set of bits with {{< term "xor" >}}XOR{{< /term >}} passes too: doing it twice gets you back where you started.

## Odd multiplies undo, even ones don't

Multiplying by an odd number shuffles the clock. Two positions collide only if their gap times the multiplier is a whole number of laps. A lap is 2³², nothing but 2s multiplied together, and an odd multiplier adds no 2s. So all 32 of those 2s would have to come from the gap, making it a whole lap, and no two positions are that far apart.

So there's a {{< term "modular-inverse" >}}modular inverse{{< /term >}}, a number that multiplies the shuffle back. On the 32-bit clock, the inverse of 3 is 2,863,311,531: 12 × 3 is 36, and 36 × 2,863,311,531 wraps around to exactly 12.

Multiplying by an even number fails the test. Times 2 sends 1 to 2, and it also sends 2,147,483,649 to 2, so once you're at 2 the clock can't tell you where you came from. Doubling is a one-place {{< term "bit-shift" >}}bit shift{{< /term >}} left: the top bit falls off.

{{< ml/wrap-clock >}}

## Why anyone wants an undo button

Division has long been slow. In Granlund and Montgomery's [1994 paper on dividing by constants](https://gmplib.org/~tege/divcnst-pldi94.pdf), a divide cost several times as much as a multiply. So if a program divides by an odd constant and knows there's no remainder, a {{< term "compiler" >}}compiler{{< /term >}} can multiply by the inverse instead, a trick the two of them built into GCC. With a remainder it fails: on the clock, 35 times 2,863,311,531 is 1,431,655,777, nowhere near 35 ÷ 3.

A {{< term "hash-function" >}}hash function{{< /term >}} wants the undo rule for a different reason. The final mixing step of [MurmurHash3](https://github.com/aappleby/smhasher/blob/master/src/MurmurHash3.cpp) scrambles a 32-bit number with only two kinds of move: {{< term "xor" >}}XOR{{< /term >}} with a copy of itself {{< term "bit-shift" >}}shifted{{< /term >}} right, which leaves the top bits untouched so the rest can be rebuilt, and multiplication by odd constants. Each move can be undone, so the whole step can, which means it never turns two different inputs into the same output.

## So how do computers do math that wraps around?

They do it on a clock. Turning the clock and shuffling it, by adding, XORing or multiplying by an odd number, can always be undone. Squashing it, by multiplying by an even number or shifting bits off the end, can't, because two positions end up in the same place and the clock forgets which one you started from.

## References & further reading

The standards and the processor spec first, then the bugs, then the uses.

{{< ml/references >}}
