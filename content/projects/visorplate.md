---
title: 'VisorPlate'
tier: 3
summary: 'A no-drill front-license-plate display for nice cars: the plate rides in a sleeve strapped to the sun visor, and comes off in three seconds for a car show. I designed it, built the store, and shipped it myself.'
tags: ['ecommerce', 'product', 'cloudflare']
types: ['web']
stack: ['Astro', 'Vue', 'TypeScript', 'Cloudflare Workers', 'Stripe', 'ShipStation']
role: 'Founder · designer · engineer · salesperson'
year: '2024–2026'
status: 'on hiatus'
links:
  live: 'https://visorplate-us.com/'
cover: '/covers/visorplate.webp'
featured: false
thoughts:
  - "Don't overcomplicate things with Laravel when Cloudflare Pages does it just as well for free."
  - 'Learned that car salesmen are really easy to talk to. They also like making money.'
  - "Best learning experience of my life. It's a simple business, but it touches every area."

# ── Page furniture, read by the shortcodes in the body ──────────────────────
# carousel.html, photo-steps.html and flow-steps.html each read one keyed block
# below; `src` paths live under assets/ and go through func/cover.html.
carousels:
  product:
    label: 'The product, four photos'
    slides:
      - { src: '/img/visorplate/display.jpg', alt: 'A Texas license plate in front of the clear VisorPlate sleeve.', caption: 'A clear vinyl sleeve, sized for a standard US plate.' }
      - { src: '/img/visorplate/slide.jpg', alt: 'A license plate half slid into the sleeve.', caption: 'The plate slides in from the side. No screws, no brackets.' }
      - { src: '/img/visorplate/front-in.jpg', alt: 'The finished VisorPlate from the front, plate fully inside.', caption: 'Loaded. The plate reads straight through the vinyl.' }
      - { src: '/img/visorplate/back.jpg', alt: 'The back of the VisorPlate: black fabric with two velcro straps.', caption: 'The back: two velcro straps that wrap the sun visor.' }
  road:
    label: 'VisorPlate on nine cars'
    caption: 'Store photography. The plate sits behind the windshield on the passenger side, where the visor is.'
    slides:
      - { src: '/img/visorplate/bugeye.jpg', alt: 'A red bugeye Subaru WRX with a sample plate behind the windshield.', caption: 'Bugeye WRX' }
      - { src: '/img/visorplate/miata.jpg', alt: 'A red NA Miata at sunset with a plate on the passenger visor.', caption: 'NA Miata', position: '50% 60%' }
      - { src: '/img/visorplate/s2000.jpg', alt: 'A silver-blue Honda S2000 with a plate on the visor.', caption: 'Honda S2000' }
      - { src: '/img/visorplate/cayman.jpg', alt: 'An orange Porsche Cayman with a sample plate behind the glass.', caption: 'Porsche Cayman' }
      - { src: '/img/visorplate/240sx.jpg', alt: 'A black Nissan 240SX at a car meet, plate on the visor.', caption: 'Nissan 240SX at a meet — the whole reason it has to come off fast' }
      - { src: '/img/visorplate/mustang.jpg', alt: 'A black Ford Mustang with a plate behind the windshield.', caption: 'Ford Mustang' }
      - { src: '/img/visorplate/amg-gt.jpg', alt: 'A matte grey Mercedes-AMG GT with a sample plate on the visor.', caption: 'Mercedes-AMG GT' }
      - { src: '/img/visorplate/wrx.jpg', alt: 'A white Subaru WRX with a plate on the visor.', caption: 'Subaru WRX' }
      - { src: '/img/visorplate/m4.jpg', alt: 'A red BMW M4 at sunset with a plate on the passenger visor.', caption: 'BMW M4' }

steps:
  install:
    - { src: '/img/visorplate/slide.jpg', alt: 'Sliding a plate into the sleeve.', title: 'Insert the plate', body: 'Slide your front plate into the sleeve.' }
    - { src: '/img/visorplate/install.jpg', alt: 'The VisorPlate strapped to a passenger sun visor.', title: 'Strap it on', body: 'Wrap the velcro around the passenger sun visor and flip it down.' }
    - { src: '/img/visorplate/miata.jpg', alt: 'A Miata with the plate showing through the windshield.', title: 'Drive', body: 'Plate faces forward. Car show? Pull it off and toss it in the glovebox.' }

flows:
  order:
    - { at: 'Browser', what: 'Someone hits **Buy** on a page that was rendered at build time and is served straight from Cloudflare''s edge.' }
    - { at: 'Cloudflare Worker', what: 'Checks a sold-out flag in KV, then opens a Stripe Checkout session. The secret key never leaves the server.' }
    - { at: 'Stripe', what: 'Takes the card, then signs a `checkout.session.completed` webhook back to the Worker.' }
    - { at: 'Cloudflare Worker', what: 'Verifies the signature, creates the order in ShipStation, and sends the confirmation email through Resend.' }
    - { at: 'Mac mini, 8 a.m. weekdays', what: 'A cron job polls the print queue and sends every waiting label to a USB thermal printer on my desk.' }
    - { at: 'Me', what: 'Bag, label, post office. A digest of the last day''s orders is already in my inbox.' }

# Lighthouse, mobile, US West, via a global Lighthouse run (v12.8.2). The bar is
# the same "goodness" scale /colophon uses — 100 minus 83 × value / poor
# threshold, floored at 0 — with the same average and poor markers.
lighthouse:
  default: after
  profiles:
    - id: before
      label: 'Laravel'
      scores:
        - { label: 'Performance', value: 73 }
        - { label: 'Accessibility', value: 82 }
        - { label: 'Best Practices', value: 100 }
        - { label: 'SEO', value: 100 }
      vitals:
        - { label: 'Largest Contentful Paint', num: '12.6', unit: 's', bar: 0, avg: { pos: 48, label: 'Web average ≈ 2.5 s' }, bad: { pos: 17, label: 'Poor > 4.0 s' }, desc: 'When the biggest element finishes loading.' }
        - { label: 'Speed Index', num: '4.0', unit: 's', bar: 43, avg: { pos: 51, label: 'Web average ≈ 3.4 s' }, bad: { pos: 17, label: 'Poor > 5.8 s' }, desc: 'How fast the page looks visually finished.' }
        - { label: 'Transferred Assets', num: '9.36', unit: 'MB', bar: 0, avg: { pos: 54, label: 'Web average ≈ 2.2 MB' }, bad: { pos: 17, label: 'Heavy > 4 MB' }, desc: 'Nineteen requests, most of them full-size product photos.' }
    - id: after
      label: 'Cloudflare'
      scores:
        - { label: 'Performance', value: 99 }
        - { label: 'Accessibility', value: 92 }
        - { label: 'Best Practices', value: 96 }
        - { label: 'SEO', value: 100 }
      vitals:
        - { label: 'Largest Contentful Paint', num: '1.8', unit: 's', bar: 63, avg: { pos: 48, label: 'Web average ≈ 2.5 s' }, bad: { pos: 17, label: 'Poor > 4.0 s' }, desc: 'When the biggest element finishes loading.' }
        - { label: 'Speed Index', num: '2.5', unit: 's', bar: 64, avg: { pos: 51, label: 'Web average ≈ 3.4 s' }, bad: { pos: 17, label: 'Poor > 5.8 s' }, desc: 'How fast the page looks visually finished.' }
        - { label: 'Transferred Assets', num: '114', unit: 'KB', bar: 98, avg: { pos: 54, label: 'Web average ≈ 2.2 MB' }, bad: { pos: 17, label: 'Heavy > 4 MB' }, desc: 'Six requests. AVIF at the size the screen asks for.' }
---

## The problem

People with nice cars hate the front license plate. It breaks the lines of the
bumper, and bolting it on means drilling holes through a front end that cost
more than some people's first car. Most of the country says you need one anyway.

{{< plate-map >}}

That's the market: the lit states, where the choice was drill the bumper, prop
the plate on the dash, or eat the ticket.

## The product

A sleeve for the plate that straps to the sun visor. The plate faces out through
the windshield, and the whole thing comes off in about three seconds when the car
is headed to a show. No tools, no holes, nothing left behind on the car.

{{< carousel "product" >}}

## Sixty seconds to install

{{< photo-steps "install" >}}

## On the road

{{< carousel "road" >}}

## Making it

I did everything except sew. The first batch of bags was made by a seamstress,
the second by my wife. The rest was me: the design, the sourcing, the photos, the
store, inventory, leads, and pitching dealerships on selling them white-labelled
with their own branding.

## The store

The store's job is to take money and get a label on a box without me touching a
keyboard. Here's one order, start to finish:

{{< flow-steps "order" >}}

There's no database of my own anywhere in that. Stripe is the order history,
ShipStation is the fulfilment queue, and KV holds exactly two things: the
sold-out switch and the contact form's rate limits. The fixed cost is the domain.

It didn't start that way. The first version was Laravel on a Forge server,
because Laravel is what I knew. A year in, I rebuilt it as an Astro site on
Cloudflare Workers, with Vue only where something needs to be interactive and
every product photo run through a build-time AVIF pipeline. Same product, same
Stripe history. Same phone, same test:

{{< lighthouse >}}
