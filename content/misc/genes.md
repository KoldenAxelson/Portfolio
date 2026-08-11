---
# ── Page front matter ────────────────────────────────────────────────────────
# icon / blurb : what the card on /misc/ shows.
# prose true   : Tailwind Typography, for the one caption the map carries. The
#                widget roots all carry `not-prose` so it keeps its hands off them.
#
# No `updated:` — misc/single.html only prints the "Last updated" line when that
# key exists, and this page has no update cadence to advertise.
#
# The body is two widgets and nothing else, deliberately. Everything this page
# has to say, it says by being looked at; the caveats that used to sit here as
# prose live in the comments at the top of data/genes.yaml, where they belong to
# whoever edits the numbers rather than to whoever reads them.
# ─────────────────────────────────────────────────────────────────────────────
title: "Genes"
description: "My 23andMe ancestry composition — where it comes from, how rare it is, and when it happened."
# Blank by default — uncomment to put a line under the H1 in the banner.
#lead: "What I am, according to a spit tube"
blurb: "The answer to \"what's your ethnic background\", mapped and rated for rarity."
icon: "globe"
prose: true
---

{{< ancestry-map >}}

{{< ancestry >}}
