---
# ── Page front matter ────────────────────────────────────────────────────────
# Cave In, a small puzzle game first written in Python with pygame, ported to
# TypeScript to run on the page. The page is the widget; keep prose to a line.
# The board is layouts/shortcodes/cave-in/game.html, run by
# assets/scripts/pages/cave-in/ (rules in world.ts, the Path Finder AI in
# pathfinder.ts), styled by css/pages/cave-in/cave-in.css. Assets ship from
# layouts/misc/single.html. The Python original: github.com/KoldenAxelson/cave-in.
# ─────────────────────────────────────────────────────────────────────────────
title: "Cave In"
description: "Cave In, a small grid puzzle game: every stick you pick up brings a rock down, and a stick clears a rock. Play it, or watch a pathfinding AI dig through it and see the route it plans."
blurb: "Every stick you grab brings a rock down. Play it, or watch a pathfinding AI dig."
icon: "cave"
group: "play"
---

{{< cave-in/game >}}
