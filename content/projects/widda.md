---
title: 'Widda'
tier: 1
summary: 'A monetization tool helping mid-size YouTube creators convert affiliate links more effectively: a Chrome extension that applies a subscribed creator’s promo at checkout, and a creator dashboard behind it. In private development; small launch team committed.'
tags: ['creator-tools', 'extension', 'saas']
types: ['web']
stack: ['Go', 'PostgreSQL', 'TypeScript', 'Chrome Extension', 'Hugo', 'Cloudflare Pages', 'AWS Lightsail']
role: 'Founder · engineer'
year: '2025–present'
status: 'in-progress'
links:
  live: 'https://widda.club/'
featured: true
thoughts:
  - "Reading Amazon's Terms of Service at 3am was a life-changing decision."
  - 'If the first variation of your project gets squashed, learn to peer through the cracks. You might be onto something.'
  - "Surprisingly, it's easy to talk with YouTubers. They're not impossible to reach."
  - 'The whole product is one rule: the creator you ranked highest who has a promo for this site wins, and nothing happens until you click Apply.'
---

## Problem

Mid-size YouTube creators — small dedicated audiences, not viral fame — leak
affiliate revenue because the conversion path between viewer and click is loose.
Existing tooling assumes either pure viral scale or pure single-product affiliate
funnels, and the dedicated-but-niche audience sits in neither bucket.

## Constraints

Two things working against us:

- **Chrome Web Store review.** Google's extension submission process is slow and
  unpredictable. We have to ship something the review team will say yes to on the
  first pass, or lose weeks per iteration.
- **The Honey hangover.** Late 2024's PayPal Honey controversy poisoned the
  category — anything that touches affiliate links in a browser starts with
  reputational trust below zero. Whatever we ship, the opt-in story has to read
  honestly enough to clear that bar.

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

The waitlist site at widda.club came first. Behind it now sits the product:

- A Go API on a single binary — Google sign-in with trustless channel
  verification, opaque hashed sessions, promo CRUD, and a server-authoritative
  events endpoint that decides billability itself (once per viewer per site per
  24 hours; the client can't mark anything billable). Postgres underneath,
  integration tests against a real database.
- The Chrome extension, Manifest V3, TypeScript compiled with a standalone
  esbuild binary. No Node at runtime, no npm anywhere — a supply-chain
  decision made on day one. The extension is MIT-licensed and rebuilds
  deterministically, so anyone can verify what's published.
- A creator dashboard — Hugo, Alpine and HTMX, static on Cloudflare Pages —
  for promos, activation events, billing and profile.

The most recent pass was design. I took the dashboard and the extension's popup
and checkout card off a default look and onto one language derived from
patterns that recur across products on Mobbin: sidebar shell, quiet tables with
status pills, white offer cards at checkout, rank-left/handle-right reorder
lists. It's documented in the repo so the next screen inherits it instead of
reinventing it.

## Current state

Pre-launch. Waitlist open, four creators committed for launch-day promotion.
The backend, dashboard and extension are built and tested locally; what remains
is the wiring with real keys in it — the Stripe billing run that closes a
period and invoices, and the production Google, Stripe, Cloudflare and AWS
setup.

## What I'd do differently

Ask after launch.
