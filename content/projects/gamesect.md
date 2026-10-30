---
title: 'Gamesect'
tier: 1
summary: 'A video game tracking site and a game-data API that share one catalog of nearly 394,000 games. Players track, rate, review and list what they play; developers get the same catalog as clean, schema.org-tagged JSON. Pre-alpha: it runs end to end on my Mac, and the production servers come next.'
tags: ['games', 'catalog', 'api', 'community']
types: ['web', 'cloud']
stack: ['Go', 'PostgreSQL', 'pgvector', 'HTMX', 'Hugo', 'Alpine.js', 'TypeScript', 'Tailwind', 'Cloudflare Pages', 'Docker', 'Swift']
role: 'Founder · engineer'
year: '2026'
status: 'in-progress'
cover: '/covers/gamesect.svg'
featured: false
thoughts:
  - 'Every page I pull from IGDB is saved to disk before it touches the database. When I fix how a field is read, I reload 390,000 games from disk instead of scraping them again.'
  - 'I filled the dev site with AI personas so it would feel lived-in. The server refuses to start in production while any of them still exist.'
  - 'Writing tests for sign-in turned up that linking a second account had never worked. Both routes answered 404 the whole time.'
  - 'I asked for sacred geometry and got it in about 30 places. The newest ticket is mostly about taking it out.'
---

## Problem

Game trackers tend to stop where their data source stops. If a game isn't in the big catalog, you can't log it, and the big catalogs skip a lot: ROM hacks, itch.io releases, fan games, regional variants. Developers who need game data run into the same wall from the other side, and what they do get usually comes raw, with images at the wrong size and metadata they have to clean up themselves.

Gamesect's bet is that data depth beats feature breadth. One catalog, kept clean and complete, serves two products at once. The community site is where people track what they play. The data API sells that same catalog to developers, and the API is meant to pay for the servers while the community keeps the data growing.

## Constraints

- **I own the catalog.** It's seeded from third parties, but production never calls IGDB at runtime. Everything is imported, merged and stored on my side, so an outage or a rate limit somewhere else can't take a game page down.
- **Scale from the first import.** The full IGDB backfill is about 380,000 games, and every query, sitemap and shelf has to stay fast at that size.
- **Covers are big.** The full catalog's original cover art is more than 200 GB, so covers are processed most-popular-first and only where a visitor could actually see them.
- **Three renderers, strict jobs.** Hugo builds the static pages, Go's `html/template` renders anything that comes from the database, HTMX does every server interaction, and Alpine only handles visual state. The nav and footer exist in both Hugo and Go, and a CI check fails if the two copies differ by a byte.
- **Privacy and safety by default.** Pages for anonymous visitors set no cookies. Games flagged 18+ stay out of search, the homepage, the sitemap and API listings unless someone opts in.

## How it works

You sign in with Google, Discord or Steam. Steam can import your whole library at once: games you've launched land as played and the rest as backlog. Each game gets a status (played, playing, backlog, wishlist), a half-star rating, an optional review, and a spot on any lists you make.

Game pages carry the catalog record, reviews, related games and a community tab: who's playing it right now, the lists it's on, its most-liked reviews and its forum threads. Forum replies arrive live while you're reading. You can follow people and get an activity feed. A news page collects Steam news for the games people track, and a weekly spotlight picks out standout reviews and lists.

Developers make a free API key from their settings page and query `/public/v1` for games, platforms and search, filtered by type, platform, genre and update date.

## What I've built

- **The catalog pipeline.** IGDB is the main source, with itch.io and Wikidata filling in what it misses. Each source saves raw pages to disk first, maps them to one shared record and merges by provenance, then Steam app id, then exact title and year. Pages I've edited by hand keep their title, prose and credits through every re-import. The catalog holds 393,761 games, and at that size search answers in 54 ms at the median and 101 ms at the 95th percentile, cold. A full sitemap rebuild takes 4 seconds.
- **A Go server** on chi and pgx over two Postgres databases, one for the catalog and one for user data, with 21 migrations. It's about 17,000 lines of Go plus 8,000 lines of tests, and the integration suite builds throwaway databases, applies the real migrations and drives the production router over HTTP.
- **Forums with live threads.** New posts reach every open viewer over Server-Sent Events as ready-made HTML, with caps on streams per IP and per process. A test posts a reply on one connection and checks it arrives on another, and another posts `<script>` and checks it comes back escaped.
- **Self-serve API keys.** Each key holds 192 random bits and is shown once, then stored only as a hash. The free tier allows 1,000 calls a day and three keys per account. One test runs all 240 combinations of the public API's filters against an oracle written separately.
- **Security as a gate.** `govulncheck` runs on every check. Its first run found 55 reachable vulnerabilities in the Go toolchain and older modules, and upgrading cleared all of them. Another test fails if any security header or Content Security Policy directive goes missing, or if the policy ever allows `unsafe-` anything.
- **Browser and Lighthouse passes.** A headless smoke test covers the main pages in Chromium, WebKit and Firefox, signed in and out, at phone and desktop widths. Lighthouse gives 100 for accessibility, best practices and SEO on the home, search, game, profile and forum pages, with mobile performance between 96 and 99.
- **AI enrichment.** A pass tags games with moods from a vocabulary of twenty and writes schema.org objects for the most popular titles. On the first run, Claude classified 3,740 games in nine minutes.
- **A Mac app for demo data.** A small SwiftUI app manages AI reviewer personas that write reviews and forum threads for the dev site. Every one is flagged in the database and labelled "Demo persona" wherever it appears.

The work runs from written tickets, each with a "Done when" list that decides whether it's finished. Anything that needs my Mac goes into a script I run by hand.

## Current state

Fifty tickets are done and fourteen are open. Nearly all of the open ones are mine to do: creating the image bucket and domain, turning on the real sign-in credentials, standing up the production servers and the edge firewall rules. Browsing by mood is the next ticket ready to build.

Today the Go API and Postgres run locally in Docker, the same way they will on the server. It's pre-alpha: no public launch, no users, no date.

## What I'd do differently

Go easier on the ornament. The first design pass put sacred geometry behind nearly everything, and most of it carried no information. The bug in the logo, the one thing people might remember, showed up twice. I'd start from the rule I'm now applying: decoration only where something is happening or missing.

I'd also measure before trusting a cost estimate. My estimate for the AI pass was off by about 25 times, because I priced it from the API rate card and ignored the overhead each call carries.
