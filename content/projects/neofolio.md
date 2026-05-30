---
title: 'Neofolio'
tier: 1
summary: 'An opinionated, AI-readable portfolio template for developers in the AI age. MIT-licensed. The template this site runs on.'
tags: ['template', 'open-source', 'hugo', 'ai-readable']
stack: ['Hugo', 'Tailwind', 'HTMX', 'Alpine.js', 'TypeScript']
role: 'Author · designer · documentation'
year: '2026'
status: 'shipped'
links:
  live: 'https://koldenaxelson.github.io/neofolio/'
  repo: 'https://github.com/KoldenAxelson/neofolio'
featured: true
thoughts: []
---

## Problem

Most developer portfolio templates optimize for one audience: humans who land on the site. None of them optimize for the AI systems that — increasingly — summarize the developer to those humans before they ever click through. A template that ships in 2026 has to do both.

## Constraints

A handful of non-negotiables shaped every decision:

- **Static HTML on first paint.** No SSR, no JS above the fold. Every meaningful sentence has to live in the source HTML for AI scrapers to index without rendering JavaScript.
- **One JSON-LD entity graph, not many.** Per-page schemas (BlogPosting, SoftwareApplication, Person.hasOccupation on /cv) reference one canonical `Person` and `WebSite` via stable `@id`s, so knowledge graphs merge them into one record instead of treating each page as a separate entity.
- **Lighthouse 90+/100/100/100.** Self-hosted Inter font, HTMX + Alpine islands that hydrate on interaction only, Tailwind emitted by the standalone binary so only the classes actually used ship.
- **Forkable in minutes.** Identity in one file (`data/site.yaml`). Theme in a handful of CSS variables. Content in plain Markdown, with YAML data files for the structured stuff.
- **Node-free by construction.** `make setup` fetches the Hugo and Tailwind standalone binaries — no `npm install`, no `node_modules`, no framework runtime shipped to the browser. TypeScript compiles through Hugo's built-in esbuild.

## What I did

Built it on Hugo, with HTMX driving SPA-style navigation and Alpine powering the only two pieces that genuinely need client state — the project tag filter and the network compose form. Everything else is static HTML rendered at build time.

The JSON-LD layer is the load-bearing piece. Shared schema partials expose a stable `personId`/`siteId` so every page references the same entities. `Person.hasOccupation` is generated from a single `data/cv.yaml` source of truth, so the homepage Experience block, the `/cv` page, and the structured data all stay coherent. `/llms.txt`, the RSS feed, and the JSON Feed are all emitted at build time — `/llms.txt` per the llmstxt.org spec.

Two deploy targets ship out of the box: GitHub Pages (base path auto-detected from the Actions environment) and Cloudflare Pages (a deploy workflow plus a Pages Function for the contact form). The whole site builds with a single `hugo --minify`, so the same output serves either host.

It started life as an Astro + Vue build; I later rebuilt it on the Node-free Hugo stack. Carrying the same AI-readability contract across two completely different rendering models forced me to articulate decisions I'd otherwise have left implicit — the kind of documentation discipline you write for the next forker that turns out to be good for you too.

## Outcome

MIT-licensed at `github.com/KoldenAxelson/neofolio`. Live demo at `koldenaxelson.github.io/neofolio`. The site you're reading right now is a Neofolio fork — the cleanest possible proof of concept.

## What I'd do differently

The AI-readability angle was the bet I wasn't sure would pay off when I started. It has — and if I were rebuilding today I'd push further, with more aggressive `Person.knowsAbout` enrichment and explicit `mentions` graphs linking articles to projects to people. The architecture supports it; I just didn't take it that far in v1.
