---
title: 'Why Would Anyone Put Embeddings in Hyperbolic Space?'
description: "Trees branch exponentially, and flat space only grows like a polynomial, so a tree drawn in it runs out of room. Hyperbolic space grows exponentially too, which lets a whole hierarchy fit in a handful of dimensions."
pubDate: 2026-11-03
tags: ['ml', 'math', 'embeddings', 'explainer']
glossary: "ml"
# In review: builds at its URL but stays off every list, feed and sitemap,
# and is noindexed. Listed at /misc/drafts/. Publish by deleting these lines.
review: true
reviewOrder: 16
build:
  list: never
# Audit note from the writing session: the circle and tree figures (2πr,
# 2π sinh r, 2^r) were checked in Python. WordNet numbers from Nickel & Kiela
# (Section 4.1, Table 1); the 2-dimension result and the precision remark from
# Sala et al. (abstract, Sections 1, 3.2 and 5, Table 2).
#
# Demos (both 2D, real arithmetic on made-up complete trees):
# {{< ml/room-on-the-circle >}} closes "Trees run out of room" (b^k against
# 2πr and 2π sinh r); the key visual, {{< ml/poincare-tree >}}, closes "How a
# tree sits in the disk" (flat and Poincaré layouts, distortion and the gap to
# the rim; drawn in the template too via partials/ml/poincare-node.html).
thoughts:
  - "I like that the fix for 'my tree doesn't fit' was to change the shape of space rather than the tree."
  - "Five dimensions beating two hundred still surprises me every time I read the table."
---

An {{< term "embedding" >}}embedding{{< /term >}} puts things at points so that distance means something: close points are related, far ones aren't. That works well for words that blur into each other. In ordinary flat space it works badly for a hierarchy, like animal, then mammal, then dog, then terrier, where what matters is who sits under whom.

No amount of training fixes that, because flat space doesn't have room for a tree. {{< term "hyperbolic-space" >}}Hyperbolic space{{< /term >}} does, and in one test 5 of its {{< term "dimension" >}}dimensions{{< /term >}} beat 200 flat ones.

## Trees run out of room

Take a tree where every node has two children. The top has 1 node, the next level 2, then 4, 8, 16: level k has 2ᵏ.

Now draw it on paper with the root in the middle and each level on a circle one unit further out than the last. A circle of radius r is 2πr long, so it only grows in step with r. At radius 10 the circle is about 63 units long, and it has to hold 1,024 nodes. Nodes from opposite ends of the tree get squeezed next to each other, and distance stops meaning "related".

More dimensions help, but not enough. As Frederic Sala and colleagues point out, [a theorem of Bourgain's](https://arxiv.org/abs/1804.03329) says flat space can't hold every tree without {{< term "distortion" >}}distortion{{< /term >}}, some distances bent out of proportion, however many dimensions it has. For big enough trees, some branches always end up squashed together.

{{< ml/room-on-the-circle >}}

## A space that grows like a tree

The hyperbolic plane is a geometry where, at its standard curvature, a circle of radius r is 2π sinh r long, which grows exponentially. At radius 10 it's about 69,000 units long, plenty for 1,024 nodes. It's why Maximilian Nickel and Douwe Kiela say hyperbolic space ["can be thought of as a continuous version of trees"](https://arxiv.org/abs/1705.08039).

You can't build that plane at full size in our space, but you can draw a map of it. The {{< term "poincare-disk" >}}Poincaré disk{{< /term >}} squeezes the whole infinite plane into a circle. Near the middle the map's scale barely changes from place to place; towards the edge, distances stretch without limit, so [the edge is infinitely far away](https://arxiv.org/abs/1705.08039).

## How a tree sits in the disk

Put the root at the centre and each level further out. Every step outwards lands in a part of the map with more room than the last, so the children of each node fit without crowding, and the leaves end up packed near the edge.

The other useful part is how paths run. Between two points near the edge, the shortest path dips towards the middle and back out, the way the path between two leaves of a tree climbs to a shared ancestor and back down. In fact it's [almost the same as the path through the origin](https://arxiv.org/abs/1804.03329).

{{< ml/poincare-tree >}}

## What it buys

Nickel and Kiela embedded the nouns of WordNet, a database that arranges English words, nearly as a tree, by "is a kind of" links. Its noun hierarchy has 82,115 nouns and 743,241 such links, counting indirect ones. Then they asked each embedding to rebuild the links from distances alone.

In 5 dimensions, their embedding in the {{< term "poincare-disk" >}}Poincaré ball{{< /term >}}, the disk's version in more dimensions, ranked each node's true neighbours about 4.9th on average among the nodes it isn't linked to, where lower is better. Their plain flat embedding, with 200 dimensions, managed 1,157.3. Sala's team later skipped training altogether: they placed the tree with a direct construction and scored a {{< term "mean-average-precision" >}}mean average precision{{< /term >}}, a different measure where 1 is perfect, of 0.989 in just 2 dimensions. Nickel and Kiela's method, also hyperbolic, reached 0.87 using 200.

## Leaves pile up at the rim

The room comes from the edge of the disk, and the edge is where computers struggle. Deep leaves sit a hair's breadth from the boundary, and telling them apart takes many digits of {{< term "precision" >}}precision{{< /term >}}. The 2-dimensional WordNet construction needed [almost 500 bits](https://arxiv.org/abs/1804.03329) per value; using 10 dimensions instead of two cut that to 32 {{< term "bit" >}}bits{{< /term >}}.

Not everything is a tree, either. Even WordNet isn't quite one, since some nouns have more than one parent, and the direct construction scores [lower the less tree-like the data is](https://arxiv.org/abs/1804.03329). [Hyperbolic entailment cones](https://arxiv.org/abs/1804.01882) handle several parents by giving each item a cone as well as a point: whatever sits inside an item's cone counts as a kind of it.

## So why would anyone put embeddings in hyperbolic space?

Because hierarchies branch exponentially and flat space only grows like a power of the radius, so a tree drawn in it gets crushed. Hyperbolic space grows exponentially too: put the root at the centre and the leaves near the edge, and there's room for every branch. That's how a few dimensions can hold what hundreds of flat ones couldn't, as long as you have the precision to tell the leaves apart.

## References & further reading

The papers in the order they appear.

{{< ml/references >}}
