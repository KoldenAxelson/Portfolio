---
# ── Page front matter ────────────────────────────────────────────────────────
# icon / blurb : what the card on /misc/ shows.
# prose true   : Tailwind Typography, for the two paragraphs under the H1. The
#                widget root carries `not-prose` so it keeps its hands off it.
#
# No `updated:` — misc/single.html only prints the "Last updated" line when that
# key exists, and this page changes when the map does, which is not a cadence.
#
# The geometry is generated, by hand, once, from the drawing itself:
# scripts/build-dagea-globe.py. Nothing in `make build` regenerates it. See
# that script's header for how a picture becomes polygons.
# ─────────────────────────────────────────────────────────────────────────────
title: "Dagea"
description: "A world I drew by hand, traced off the paper and wrapped around a globe."
lead: "A world I drew by hand, and then put on a sphere"
blurb: "A hand-drawn fantasy world as a globe you can spin — six regions, forty landmasses."
icon: "map-pin"
prose: true
---

I drew this map on paper. Everything on it that is a **shape** — the coastlines,
the black ink — got read back off the picture by a script and wrapped around a
sphere. Everything on it that is a **note** — the rivers, the roads, the towns,
the place names in green — stayed flat, because annotation belongs somewhere you
can read it and not smeared around the curve of a globe.

Six regions, forty landmasses. Point at one to light it up, or use the list
underneath, which works the same and does not require you to hit a four-pixel
islet. The back half of the world is open ocean: I only drew the front.

{{< dagea-globe >}}
