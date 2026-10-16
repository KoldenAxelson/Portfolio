---
# ── Page front matter ────────────────────────────────────────────────────────
# Was /misc/web-dev-sites/ ("Cool Web Dev Sites"); renamed when it grew past web
# dev. `aliases` keeps the old URL as a redirect so existing links land here.
#
# Every card is an entry in data/cool-sites/sites.yaml, rendered with its filter
# by shortcodes/cool-sites/grid.html. Add a site there, not here. The canvas
# previews are partials/cool-sites/previews/ + static/js/cool-sites/, shipped by
# partials/cool-sites/assets.html.
# ─────────────────────────────────────────────────────────────────────────────
title: "Cool Sites"
description: "Sites worth a bookmark: web dev craft to study, tools I use, and places to learn, research and think, filterable by kind."
aliases: ["/misc/web-dev-sites/"]
# Blank by default — uncomment to put a line under the H1 in the banner.
#lead: "Sites worth a bookmark."
blurb: "Sites worth a bookmark: web dev craft to study, useful tools, and places to learn, research and think. Filter by kind."
icon: "globe"
container: "wide"
---

<p class="wds-intro">Sites I keep coming back to: some for the craft, some to see how they built the thing, and some just to learn something. Filter by what you're after.</p>

{{< cool-sites/grid >}}

<p class="wds-intro wds-source">The learning, research and ideas picks started as a list from the Hyperlink channel's video <a href="https://youtu.be/940uRWYPgQw">The Internet's Hidden Brain: 15 Elite Sites You've Never Seen</a>. I checked each one loads and rewrote the descriptions in my own words.</p>
