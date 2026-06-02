---
title: 'How this site is built'
description: "How this site is built and why: Node-free, static, ~$12/year on Cloudflare, and engineered for performance, supply-chain safety, and AI-readability."
layout: 'colophon'
updated: 2026-05-29
# bar = our score as % "goodness"; avg/bad dots are Google's good + poor
# thresholds mapped onto the same scale (pos %), shared across profiles.
lighthouse:
  captured: 2026-05-29
  default: mobile
  profiles:
    - id: mobile
      label: Mobile
      icon: device-phone-mobile
      link: 'https://pagespeed.web.dev/analysis/https-wrightfunctions-com/5obdgwcsv4?form_factor=mobile'
      scores:
        - { label: 'Performance', value: 97 }
        - { label: 'Accessibility', value: 100 }
        - { label: 'Best Practices', value: 100 }
        - { label: 'SEO', value: 100 }
      vitals:
        - label: 'First Contentful Paint'
          num: '1.2'
          unit: 's'
          bar: 67
          avg: { pos: 50, label: 'Web average ≈ 1.8 s' }
          bad: { pos: 17, label: 'Poor > 3.0 s' }
          desc: 'How soon the first text or image shows up.'
        - label: 'Largest Contentful Paint'
          num: '2.4'
          unit: 's'
          bar: 50
          avg: { pos: 48, label: 'Web average ≈ 2.5 s' }
          bad: { pos: 17, label: 'Poor > 4.0 s' }
          desc: 'When the biggest element finishes loading.'
        - label: 'Total Blocking Time'
          num: '0'
          unit: 'ms'
          bar: 100
          avg: { pos: 72, label: 'Web average ≈ 200 ms' }
          bad: { pos: 17, label: 'Poor > 600 ms' }
          desc: "Time the page is frozen and won't react to taps."
        - label: 'Cumulative Layout Shift'
          num: '0'
          unit: ''
          bar: 100
          avg: { pos: 67, label: 'Web average ≈ 0.10' }
          bad: { pos: 17, label: 'Poor > 0.25' }
          desc: 'How much the layout jumps around while loading.'
        - label: 'Speed Index'
          num: '2.6'
          unit: 's'
          bar: 63
          avg: { pos: 51, label: 'Web average ≈ 3.4 s' }
          bad: { pos: 17, label: 'Poor > 5.8 s' }
          desc: 'How fast the page looks visually finished.'
        - label: 'Transferred Assets'
          num: '401'
          unit: 'KB'
          bar: 92
          avg: { pos: 54, label: 'Web average ≈ 2.2 MB' }
          bad: { pos: 17, label: 'Heavy > 4 MB' }
          desc: 'Total bytes sent over the wire to load the page.'
    - id: desktop
      label: Desktop
      icon: desktop
      link: 'https://pagespeed.web.dev/analysis/https-wrightfunctions-com/5obdgwcsv4?form_factor=desktop'
      scores:
        - { label: 'Performance', value: 100 }
        - { label: 'Accessibility', value: 100 }
        - { label: 'Best Practices', value: 100 }
        - { label: 'SEO', value: 100 }
      vitals:
        - label: 'First Contentful Paint'
          num: '0.3'
          unit: 's'
          bar: 92
          avg: { pos: 50, label: 'Web average ≈ 1.8 s' }
          bad: { pos: 17, label: 'Poor > 3.0 s' }
          desc: 'How soon the first text or image shows up.'
        - label: 'Largest Contentful Paint'
          num: '0.8'
          unit: 's'
          bar: 83
          avg: { pos: 48, label: 'Web average ≈ 2.5 s' }
          bad: { pos: 17, label: 'Poor > 4.0 s' }
          desc: 'When the biggest element finishes loading.'
        - label: 'Total Blocking Time'
          num: '0'
          unit: 'ms'
          bar: 100
          avg: { pos: 72, label: 'Web average ≈ 200 ms' }
          bad: { pos: 17, label: 'Poor > 600 ms' }
          desc: "Time the page is frozen and won't react to taps."
        - label: 'Cumulative Layout Shift'
          num: '0'
          unit: ''
          bar: 100
          avg: { pos: 67, label: 'Web average ≈ 0.10' }
          bad: { pos: 17, label: 'Poor > 0.25' }
          desc: 'How much the layout jumps around while loading.'
        - label: 'Speed Index'
          num: '0.5'
          unit: 's'
          bar: 93
          avg: { pos: 51, label: 'Web average ≈ 3.4 s' }
          bad: { pos: 17, label: 'Poor > 5.8 s' }
          desc: 'How fast the page looks visually finished.'
        - label: 'Transferred Assets'
          num: '401'
          unit: 'KB'
          bar: 92
          avg: { pos: 54, label: 'Web average ≈ 2.2 MB' }
          bad: { pos: 17, label: 'Heavy > 4 MB' }
          desc: 'Total bytes sent over the wire to load the page.'
    # Global multi-region Lighthouse run — performance score per region, no
    # single-run vitals (the per-region breakdown lives in the linked report).
    - id: global
      label: Worldwide
      icon: globe
      link: 'https://lighthouse-metrics.com/lighthouse/checks/f511a37a-2cf7-48a2-95c2-fcb21c412b94'
      scores:
        - { label: 'US West', value: 100 }
        - { label: 'US East', value: 96 }
        - { label: 'Finland', value: 100 }
        - { label: 'Germany', value: 99 }
        - { label: 'Japan', value: 100 }
        - { label: 'Australia', value: 100 }
decisions:
  - title: 'Node-free by design'
    body: >-
      The whole build is two binaries — Hugo and the Tailwind standalone CLI —
      plus Hugo's built-in esbuild for the TypeScript. No npm, no node_modules,
      no framework runtime shipped to the page. With AI-assisted supply-chain
      attacks climbing through early 2026, the cheapest dependency to secure is
      the one you never install. Fewer moving parts, smaller attack surface.
  - title: 'Static on purpose'
    body: >-
      Every page is static HTML rendered at build time. Client interactivity is
      a small hand-written TypeScript bundle; Alpine.js loads on the single page
      that actually needs reactive state. Knowing exactly which constraints keep
      a site static is what keeps it fast, cheap, and hard to break.
  - title: '~$12 a year to run'
    body: >-
      Hosted on Cloudflare Pages. The only recurring cost is the domain itself —
      hosting, global CDN, and TLS are free at this scale. Infrastructure should
      be sized to the problem, not to the résumé.
  - title: 'Bytes are a budget'
    body: >-
      Fonts are self-hosted and subset down to the glyphs the site actually
      uses — roughly half the original weight cut from what users download. The
      matte background is a 128×128 noise tile. Images are lazy-loaded and
      width/height-stamped so nothing reflows (Cumulative Layout Shift: 0).
  - title: 'Readable by humans and machines'
    body: >-
      A single Person / WebSite JSON-LD entity graph that every page references
      by stable @id, plus a build-time /llms.txt. The site is structured so the
      models that increasingly summarize a developer get an accurate read, not a
      guess.
  - title: 'The stack, composed'
    body: >-
      Hugo · Tailwind · Go · HTMX · Alpine · TypeScript — the "OX Stack." The
      individual tools are off-the-shelf; the Node-free composition is the part
      that's mine. It's packaged as an open template, Neofolio, so anyone can
      run the same setup.
stack:
  - { name: 'Hugo', note: 'static site generator (Go)', link: 'https://gohugo.io' }
  - { name: 'Tailwind CSS', note: 'standalone CLI, no Node', link: 'https://tailwindcss.com' }
  - { name: 'HTMX', note: 'hx-boost SPA-style navigation', link: 'https://htmx.org' }
  - { name: 'Alpine.js', note: 'reactive state on /network only', link: 'https://alpinejs.dev' }
  - { name: 'TypeScript', note: 'compiled via Hugo esbuild + tsgo', link: 'https://www.typescriptlang.org' }
  - { name: 'Cloudflare Pages', note: 'hosting, CDN, TLS', link: 'https://pages.cloudflare.com' }
---
