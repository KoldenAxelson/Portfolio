---
title: 'GrowGo'
tier: 1
summary: 'A hyperlocal marketplace for home-grown food — find backyard growers and farmers-market vendors on a map, pre-order in the app, pick up with a QR code. Abandoned in 2025 when the funding never came; resurrected in 2026 with a working app and backend.'
tags: ['marketplace', 'mobile', 'startup']
types: ['web', 'cloud']
stack: ['Flutter', 'Cloudflare Workers', 'D1', 'TypeScript', 'Stripe']
role: 'Founder · CTO'
year: '2025–present'
status: 'in-progress'
featured: false
thoughts:
  - 'Everyone said they loved it. Nobody funded it. Those turn out to be different sentences.'
  - 'The 2025 plan was Rust and Go microservices for a company with zero customers. The 2026 rebuild is one Worker and a database.'
  - "Turns out 'abandoned' actually meant 'paused until I could build it myself.'"
---

## Problem

Local food is stuck in cash and folding tables. A farmers market runs a few
hours a week — miss the window and both sides lose. Vendors juggle cash boxes
and Venmo with no pre-orders, no inventory visibility, and no way to be found
off-market. Buyers who want fresh, local food have no marketplace built for the
people who actually grow it.

GrowGo is the digital storefront for home-grown goods: buyers discover vendors
and markets on a map, pre-order and pay in-app, then pick up with a QR code.
Vendors get a year-round storefront, messaging, and verified-purchase reviews.

## What happened in 2025

I pitched it for VC funding as the app the farmers-market world was missing.
The love was universal; the checks never came. The plan didn't help — Rust and
Go microservices, native iOS, native Android, *and* a web app, all specced
before a single vendor was onboard. Ambitious enough to swing for the fences on
other people's money, and exactly backwards. I archived it here with an honest
postmortem and moved on.

## The resurrection

Moving on didn't take. In August 2026 I brought it back with the order
inverted: build the working thing first, then talk to investors.

The rebuilt stack is sized for a solo founder instead of a fantasy org chart.
One Flutter codebase covers iOS and Android — every screen of the buyer flow is
clickable, from the vendor map through cart, checkout, and QR pickup. Behind it
sits a Cloudflare Workers + D1 backend carrying the full marketplace schema:
vendors, products, market check-ins, one-vendor-at-a-time orders with
server-side pricing and atomic stock decrements, messaging, and reviews gated
behind a verified purchase. The pitch got the same treatment — rebuilt from
scratch around the working prototype instead of mockups.

## Constraints

Pre-revenue infrastructure has to cost approximately nothing, which is why the
backend is Cloudflare-first with standard `fetch` and standard SQL as the
escape hatch. Marketplace trust has to be structural, not moderated after the
fact — reviews require a real order, and prices are computed server-side.
And spring market season is the real deadline: launch after it starts and the
year is gone.

## Current state

Deliberately not launched. What remains is the wiring with real-world keys in
it: Stripe payments and Connect onboarding, the production Cloudflare deploy,
and image storage. Until those land, the pitch is the public face — it lives on
this site behind a numeric keypad at [/misc/growgo](/misc/growgo). If you're
the kind of person who should see it, [ask me for the
code](mailto:KonradWright@Protonmail.com).

## What I'd do differently

It's what I *am* doing differently: product before pitch. The 2025 version
asked strangers to fund intentions. The 2026 version opens with an app you can
tap through and a backend you can hit with curl, and asks a much smaller
question.
