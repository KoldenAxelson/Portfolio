---
# ── Section front matter ─────────────────────────────────────────────────────
# My playing card decks, all on one shelf for now (layouts/misc/decks.html).
# Every page in this folder is one deck, drawn by partials/decks/deck-card.html.
#
# Adding a deck: a new .md here with title, description, `game` and `format`
# (both shown under the title) and `weight` (shelf order). A Magic deck sets
# `deck:` to its data/mtg-deck/<name>.json and the commander's scan becomes
# the cover. Any other deck sets `cover:`, an image slug in assets/img/decks/
# or a path under assets/img/ (a Yu-Gi-Oh! deck points at its mascot,
# "ygo-deck/cards/<slug>", saved by scripts/ygo/build-deck.py). `showcase:`
# lists four card slugs from the deck's data for the /misc card to fan out
# around the cover (partials/misc/live/decks.html).
# ─────────────────────────────────────────────────────────────────────────────
title: "Playing Card Decks"
description: "The decks I play, from a mono-blue Kami of the Crescent Moon Commander deck to a Yu-Gi-Oh! stall burn deck: full lists and how each one wins."
lead: "The decks I play, card by card"
blurb: "My decks from card games, each with its full list and how it wins. A decade-old Commander deck and a Yu-Gi-Oh! burn deck so far."
icon: "rectangle-stack"
group: "tools"
layout: "decks"
---
