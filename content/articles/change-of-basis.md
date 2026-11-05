---
title: 'What Does "Change of Basis" Actually Mean?'
description: "A change of basis describes the same thing with a different set of directions, like giving directions as north and east or as along the river and up the bank. Same information, same number of numbers, and the right choice can make a hard problem easy. With JPEG and neural networks as examples."
pubDate: 2026-11-03
tags: ['math', 'linear-algebra', 'ml', 'explainer']
glossary: "ml"
# In review: builds at its URL but stays off every list, feed and sitemap,
# and is noindexed. Listed at /misc/drafts/. Publish by deleting these lines.
review: true
reviewOrder: 8
build:
  list: never
# Audit note from the writing session: the river example is the writer's own
# (river step = (2, 1), up the bank = (-1, 2), bakery = (3, 4) = 2 along + 1
# up; det 5; inverse (1/5)[[2, 1], [-1, 2]]). The flood stretch in "Why pick a
# different basis?" is 3x along (2, 1), (-1, 2) fixed: diag(3, 1) in the fisher's
# basis, [[2.6, 0.8], [0.8, 1.4]] in east/north.
#
# Demos (both 2D): the key visual, {{< ml/basis-grid >}}, at the end of "The
# translator"; {{< ml/dct-block >}} (made-up blocks, real 8 x 8 DCT) after the JPEG
# section.
thoughts:
  - "I spent a whole semester thinking a basis was something you do to a vector. It's something you pick."
  - "Every fishing town already knows this. They just don't call it linear algebra."
---

Ask two people in a river town how to get to the bakery. One says "three blocks east, four blocks north." The other, who grew up fishing, says "two stretches along the river, then one up the bank." Both are right: same bakery, same starting point, two numbers each.

That's a {{< term "change-of-basis" >}}change of basis{{< /term >}}: the same place, described with a different pair of directions. Nothing moves, only the description changes, and the new description never needs more numbers than the old one. The rest of this post unpacks that sentence and shows why mathematicians and JPEG files both bother with it.

## Coordinates are a recipe

A {{< term "vector" >}}vector{{< /term >}} is an arrow, here from your doorstep to the bakery. To write it down as numbers, you pick some reference arrows, the {{< term "basis-vector" >}}basis vectors{{< /term >}}, and say how many of each to walk. "Three east, four north" means three of the east arrow plus four of the north arrow. Those amounts are the {{< term "vector" >}}vector{{< /term >}}'s {{< term "coordinates" >}}coordinates{{< /term >}}, and the sum they describe is a {{< term "linear-combination" >}}linear combination{{< /term >}}.

East and north are the {{< term "standard-basis" >}}standard basis{{< /term >}}, so familiar that it's easy to forget they're a choice. [3Blue1Brown's lesson on change of basis](https://www.3blue1brown.com/lessons/change-of-basis) makes exactly this point: space doesn't come with a grid, and the grid comes from whichever arrows you picked.

## Swap the arrows

The fisher's arrows differ. The river runs at a slant, so one stretch "along" it is 2 east and 1 north. One step "up the bank" runs square to the river: 1 west and 2 north. Two of the first plus one of the second is 2 × (2, 1) + 1 × (−1, 2) = (3, 4).

Not every pair of arrows works. If both pointed along the river, you could never reach the bakery, or anything off the river's line. With three arrows on flat ground, the bakery would have many valid descriptions. A {{< term "basis" >}}basis{{< /term >}} avoids both problems: its arrows reach everywhere and are {{< term "linear-independence" >}}linearly independent{{< /term >}}, so [every place gets exactly one set of coordinates](https://textbooks.math.gatech.edu/ila/bases-as-coord-systems.html).

Every {{< term "basis" >}}basis{{< /term >}} of the same space [has the same number of arrows](https://textbooks.math.gatech.edu/ila/dimension.html), and that number is the space's {{< term "dimension" >}}dimension{{< /term >}}. So switching costs nothing: a map of this town needs two numbers per place, in either language.

## The translator

Converting takes one multiplication. Write the fisher's arrows in east/north terms as the columns of a {{< term "matrix" >}}matrix{{< /term >}}:

| | along | up the bank |
|---|---|---|
| east | 2 | −1 |
| north | 1 | 2 |

Multiplying it by the fisher's (2, 1) is the sum you already did: 2 of the first column plus 1 of the second, which gives your (3, 4). To go the other way, use its {{< term "inverse-matrix" >}}inverse matrix{{< /term >}}, which turns (3, 4) back into (2, 1). Together they're the {{< term "change-of-basis-matrix" >}}change-of-basis matrix{{< /term >}} and its reverse.

The same matrix can also be read as moving things: take every point in town and stretch and turn it. That reading is a {{< term "linear-transformation" >}}linear transformation{{< /term >}}. Read as a {{< term "change-of-basis" >}}change of basis{{< /term >}}, every point stays put and the matrix only translates what you call it.

{{< ml/basis-grid >}}

## Why pick a different basis?

Some descriptions make the work easy. Say a flood stretches the whole town to three times its length along the river and leaves the up-the-bank direction alone. In east/north numbers that move mixes both coordinates, but in the fisher's it's just "triple the first number." Directions that a transformation only stretches are its [eigenvectors](https://www.3blue1brown.com/lessons/eigenvalues), and described in them, its matrix is {{< term "diagonal-matrix" >}}diagonal{{< /term >}}: each arrow just gets scaled.

## Sixty-four in, sixty-four out

JPEG is the everyday example of a basis picked for the job. It cuts a photo into [8 × 8 blocks](https://www.w3.org/Graphics/JPEG/itu-t81.pdf) and rewrites each block's 64 pixel values as 64 weights on cosine patterns, a {{< term "discrete-cosine-transform" >}}discrete cosine transform{{< /term >}}. It's only a change of basis, so that step [loses nothing](https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/resources/lecture-31-change-of-basis-image-compression/) on its own.

The savings come after. In a smooth patch of sky, the weights on the busy, fine-grained patterns are close to zero, so when JPEG rounds every weight to a coarse step, which is where detail is lost, most of them come out as zero. In Gilbert Strang's MIT lecture, a block goes from 64 numbers worth keeping down to three. The change of basis saved nothing by itself, but it gathered the information into a few weights so the rest could go.

{{< ml/dct-block >}}

## Inside a neural network

In a {{< term "transformer" >}}transformer{{< /term >}}, each {{< term "token" >}}token{{< /term >}} becomes a long list of numbers, an {{< term "embedding" >}}embedding{{< /term >}}. It's tempting to ask what number 214 in that list means, and often it means nothing on its own. Anthropic's [framework for transformer circuits](https://transformer-circuits.pub/2021/framework/index.html) notes that the {{< term "residual-stream" >}}residual stream{{< /term >}}, the main channel those lists travel through, has no {{< term "privileged-basis" >}}privileged basis{{< /term >}}: you "could rotate it by rotating all the matrices interacting with it, without changing model behavior."

So the meaning lives in directions through the space, and any basis can describe them. The same paper names the parts that do have a {{< term "privileged-basis" >}}privileged basis{{< /term >}}, such as the activations of a network's neurons, where each neuron's function works on one number at a time, which pushes features to line up with the axes. Those are the places where reading one {{< term "coordinates" >}}coordinate{{< /term >}} at a time can tell you something.

## So what does "change of basis" actually mean?

It means keeping the thing and changing the directions you describe it with. The bakery doesn't move when the fisher gives directions: you hear "two along, one up" instead of "three east, four north," and one matrix translates between them. Pick directions that suit the job, the river for a fisher or cosine patterns for a photo, and the hard part often gets easier without costing a single extra number.

## References & further reading

In the order the post reaches them: the intuition and textbook definitions, then JPEG and neural networks.

{{< ml/references >}}
