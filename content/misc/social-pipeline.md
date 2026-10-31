---
# ── Page front matter ────────────────────────────────────────────────────────
# The LinkedIn and dev.to posting pipeline, as an animated diagram. Almost no
# prose on purpose. Graph: data/social-pipeline.yaml. Widget:
# layouts/shortcodes/social-pipeline/diagram.html. The pipeline itself:
# scripts/social/, services/workers/social/, private/skills/LinkedInPost.md.
# ─────────────────────────────────────────────────────────────────────────────
title: "Posting Pipeline"
description: "How an article on this site ends up on dev.to and LinkedIn: a Cloudflare Worker, a public queue, a live-page check and one tap to post, drawn as an animated diagram."
blurb: "How my articles reach dev.to and LinkedIn without me remembering to post them, as an animated diagram."
icon: "cloud"
group: "reference"
container: "wide"
---

{{< social-pipeline/diagram >}}
