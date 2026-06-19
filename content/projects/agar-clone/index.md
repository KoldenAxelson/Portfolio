---
title: 'Agar.io Clone'
tier: 1
summary: "A pseudo-multiplayer Canvas arena. There's no live server — the other cells are bots, each wearing the name of a previous visitor (logged to Cloudflare Workers KV) or a recruiter-style stand-in. Built with TypeScript."
tags: ['game', 'canvas', 'typescript', 'cloudflare']
stack: ['TypeScript', 'Canvas API', 'Cloudflare Workers', 'Alpine.js']
role: 'Solo build'
year: '2026'
status: 'shipped'
featured: false
layout: 'agar-clone'
container: 'wide'
# Full page load (not an hx-boost AJAX swap) so the page's <head> Alpine + game
# runtime actually executes — same reason /network is linked boost:false.
boost: false
# Set to your deployed names Worker, e.g. https://agar-names.<you>.workers.dev
# Leave empty to run fully offline against the baked-in dummy name list.
agarWorkerBase: ''
---
