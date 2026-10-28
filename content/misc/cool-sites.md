---
# ── Page front matter ────────────────────────────────────────────────────────
# Was /misc/web-dev-sites/ ("Cool Web Dev Sites"); renamed when it grew past web
# dev. `aliases` keeps the old URL as a redirect so existing links land here.
#
# Every card is an entry in data/cool-sites/sites.yaml, rendered by
# shortcodes/cool-sites/grid.html. Add a site there, not here. The canvas
# previews are partials/cool-sites/previews/ + static/js/cool-sites/, shipped by
# partials/cool-sites/assets.html.
# ─────────────────────────────────────────────────────────────────────────────
title: "Cool Sites"
description: "Sites worth a bookmark: web dev craft to study, tools I use, and places to learn, research and think, filterable by kind."
aliases: ["/misc/web-dev-sites/"]
# Blank by default — uncomment to put a line under the H1 in the banner.
#lead: "Sites worth a bookmark."
blurb: "Sites worth a bookmark: web dev craft to study, useful tools, and places to learn, research and think. Filter by kind."
icon: "link"
group: "reference"
container: "wide"
---

{{< cool-sites/grid >}}
