---
title: "Drafts"
description: "Articles in review, before they're listed on the site."
lead: "Articles in review. Not listed anywhere else yet."
icon: "lock-closed"
layout: "drafts"
blurb: "Articles in review. Passcode required."
# Listed on /misc but sealed: the list and every draft open with the drafts PIN
# (`make seal` → Drafts). Out of the sitemap and noindexed. The drafts carry
# `review: true` and `build.list: never` (see WRITER-HANDOFF).
vault: "drafts"
noindex: true
sitemap:
  disable: true
---

Listed in the order to validate them, top first. Each draft goes through a
fact-check audit before it's published. To publish
one, delete the `review` and `build` lines from its front matter and set its
`pubDate`.
