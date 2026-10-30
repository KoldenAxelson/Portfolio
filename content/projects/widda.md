---
title: 'Widda'
tier: 1
summary: 'A monetization tool helping mid-size YouTube creators convert affiliate links more effectively: a Chrome extension that offers a subscribed creator’s promo at checkout, and a creator dashboard behind it. Built and deployed; waiting on Google’s review before the Chrome Web Store submission.'
tags: ['creator-tools', 'extension', 'saas']
types: ['web', 'cloud']
stack: ['Go', 'PostgreSQL', 'TypeScript', 'Chrome Extension', 'Stripe', 'Hugo', 'Alpine.js', 'HTMX', 'Cloudflare Pages', 'AWS Lightsail']
role: 'Founder · engineer'
year: '2025–present'
status: 'in-progress'
links:
  live: 'https://widda.club/'
cover: '/covers/widda.svg'
featured: true
thoughts:
  - "Reading Amazon's Terms of Service at 3am was a life-changing decision."
  - 'If the first variation of your project gets squashed, learn to peer through the cracks. You might be onto something.'
  - "Surprisingly, it's easy to talk with YouTubers. They're not impossible to reach."
  - 'The whole product is one rule: the creator you ranked highest who has a promo for this site wins, and nothing happens until you click Apply.'
  - 'Google reviews you twice: once for the data you read, once for the extension that reads it.'
---

## Problem

Mid-size YouTube creators, the ones with small dedicated audiences rather than
viral fame, leak affiliate revenue because the conversion path between viewer
and click is loose. Existing tooling assumes either pure viral scale or pure
single-product affiliate funnels, and the dedicated-but-niche audience sits in
neither bucket.

## Constraints

Three things working against us:

- **Two Google reviews.** The extension reads a viewer's YouTube subscriptions,
  which takes the `youtube.readonly` scope, and Google has to verify any app
  that asks for it before more than 100 test users can sign in. Then the Chrome
  Web Store reviews the extension itself. Both are slow and both can bounce, so
  everything has to be ready to pass on the first try.
- **The Honey hangover.** Late 2024's PayPal Honey controversy poisoned the
  category. Anything that touches affiliate links in a browser starts with
  trust below zero, so the opt-in story has to read honestly enough to clear
  that bar.
- **YouTube's quota.** A project gets 10,000 API units a day by default, shared
  by every user. One sync bug could spend it for everyone before lunch.

## How it works

A viewer installs the extension and signs in with Google. It reads their YouTube
subscriptions, keeps the ones that are Widda creators, and lets them rank those
creators by drag. On a supported site it walks that list in order; the first
creator with a promo for the site gets a small card at checkout. Nothing fires
until the viewer clicks Apply, and the extension never overwrites an affiliate
cookie that's already there. That last rule is the answer to Honey, and it's
written into the code, not the marketing.

Creators sign in with the Google account that owns their channel. The channel
ID comes from the YouTube API, never from a form, so there's nothing to fake.
They add one promo code or affiliate link per supported site and pay five cents
per activation, invoiced monthly.

## What I've built

widda.club started as a throwaway waitlist. It's now the real landing page,
with the privacy policy and terms that Google's reviewers read. Behind it:

- A Go API on a single binary: Google sign-in with trustless channel
  verification, opaque hashed sessions, promo CRUD, and a
  server-authoritative events endpoint that decides billability itself (once
  per viewer per site per 24 hours; the client can't mark anything billable).
  Each event records what happened: applied, shown and ignored, or skipped
  because another affiliate cookie was already there. It also records which
  higher-ranked creators were passed over for having no promo on that site,
  so a creator can see the sales they're missing. Postgres underneath,
  integration tests against a real database.
- Billing on Stripe. A job inside the API invoices each finished month, Stripe's
  hosted page takes the payment, and a signed webhook tracks whether it was
  paid. If an invoice goes overdue, that creator's promos pause until it's
  settled. It runs end to end in Stripe's test mode.
- The data rules YouTube's policies ask for. Rankings built from someone's
  subscriptions are purged after 30 days without a refresh, and viewers and
  creators can delete everything with one button in the popup or dashboard.
- Quota protection. When the API hits YouTube's daily limit, a server-side
  breaker tells every installed extension to stop syncing until the quota
  resets at midnight Pacific, and a notice shows in the popup and dashboard.
- The Chrome extension, Manifest V3, TypeScript compiled with a standalone
  esbuild binary. No Node at runtime, no npm anywhere, a supply-chain
  decision made on day one. The extension is MIT-licensed and rebuilds
  deterministically, so anyone can verify what's published.
- A creator dashboard in Hugo, Alpine and HTMX, static on Cloudflare Pages, for
  promos, activation events, billing and profile. A separate QA console has
  fake checkout pages, so I can run the whole flow from ranking to billable
  event without touching a real store.
- Production: the API on an AWS Lightsail box behind Cloudflare, with daily
  snapshots and a health alarm; the site and dashboard on Cloudflare Pages.

The design pass took the dashboard and the extension's popup and checkout card
off a default look and onto one language derived from patterns that recur
across products on Mobbin: sidebar shell, quiet tables with status pills,
white offer cards at checkout, rank-left/handle-right reorder lists. It's
documented in the repo so the next screen inherits it instead of reinventing
it.

## Current state

Pre-launch, with the product built and deployed. The landing page, creator
dashboard and API are live, and billing works end to end in Stripe's test
mode. Google's verification for the YouTube scope went in on October 30, 2026
and is under review. Next is the Chrome Web Store listing: description,
permission justifications, affiliate disclosure and screenshots. Stripe
switches to live mode before the first real invoice run. Four creators are
committed to promote it on launch day, and the extension goes public once
both Google reviews pass.

## What I'd do differently

Ask after launch.
