# Roadmap & status

Context-save for Neofolio. Skim before starting a new session.

## What it is

Astro static-first portfolio template, Vue islands for two interactive pieces. Designed so humans and LLMs come away with the same accurate picture without running JS.

Template ships as its own GitHub Pages demo. Forkers customize from there.

## Current status

- v0.1.x — feature-complete for intended scope
- Demo live at `koldenaxelson.github.io/neofolio`
- Lighthouse: ~92 Perf (regional CDN variance), AA+ a11y, 100 BP, 100 SEO
- Content: seeded with examples — demo-ready, not real

## Done

### Infrastructure
- Astro 5 + Vue 3.5 + Tailwind 3 + MDX
- TypeScript strict
- Path aliases: `@config`, `@components/*`, `@layouts/*`, `@lib/*`
- Idempotent `setup.sh`, `Makefile` with content scaffolds
- Dual deploy: GitHub Pages (auto-detect `BASE_PATH`) + Cloudflare Pages

### Pages
- `/` (split layout, sidebar + scroll-spy + typewriter)
- `/projects` + `/projects/[slug]`
- `/articles` + `/articles/[slug]` (with optional covers)
- `/cv` (structured + JSON-LD)
- `/uses` (collapsible accordions)
- `/now`
- `/network` (interactive two-panel, mailto: compose)
- `/archive` (redirect → `/projects#archive`)
- `/404`
- `/rss.xml`, `/feed.json`, `/robots.txt` (dynamic), `/sitemap-index.xml`, `/humans.txt`

### Components
- BaseLayout (`split` and `wide` props)
- TopNav (autohide, hamburger, icon-only with hover-expand labels)
- SideBar (h-card, scroll-spy, typewriter)
- ProjectCard (overlay link, floated cover, metric link, hover micro-animation on arrows)
- ProjectFilter.vue (`client:visible`)
- NetworkPanel.vue (`client:load`, drill-down on mobile)
- SocialIcons (inline SVG, 36×36 touch targets)
- SEO (JSON-LD + meta)

### Content collections
- projects, posts, archive, network — all zod-validated

### SEO / AI-readability
- JSON-LD on every page
- Schema.org Person includes addressLocality
- Permissive robots.txt with AI crawlers explicit
- Sitemap excludes noindex pages
- RSS + JSON Feed
- h-card microformat
- `rel="me"` on socials
- theme-color (light + dark)

### Performance
- Self-hosted Inter, `font-display: swap`
- Static HTML on first paint
- Islands hydrate `client:visible` / `client:load` as appropriate
- Lazy images with explicit dims (no CLS)
- Tailwind purges

### Accessibility
- AA contrast both modes
- Underlined links by default; opt-out only on nav/icon
- Touch targets ≥36×36
- aria-labels, aria-current, aria-hidden everywhere needed
- Skip-to-content, focus-visible
- `prefers-reduced-motion` honored

### Polish
- Matte noise (PNGs, light + dark, scroll-with-page no jitter)
- Hover micro-animations on ↗ (up-right) and → (right) arrows
- Floated cover image in cards (text wraps around, no deadspace)

## Planned

### Template
- [ ] Real OG image at `public/og-default.png`
- [ ] `/cv.json` — JSON Resume format (highest-value SEO TODO)
- [ ] Webmention endpoint (opt-in, requires webmention.io sign-up)
- [ ] Densify `/projects`, `/articles`, `/cv` with caption + accordion pattern from `/uses`
- [ ] `scripts/cv-pdf.sh` — Puppeteer headless print of `/cv`
- [ ] Optional dark-mode toggle (not just `prefers-color-scheme`)

### Post-launch directory submissions
- [ ] uses.tech, nownownow.com, emmabostian/developer-portfolios
- [ ] Reciprocal `rel="me"` on GitHub, LinkedIn, Bluesky

## Deferred decisions

- Single-page vs multi-page architecture
- Tech tag vocabulary (pick 8–12, stick to them)

## Known quirks

- `/uses` collapsed by default; click to expand any section
- Typewriter on sidebar only `lg+` (mobile shows static bio)
- Network mobile is drill-down (list → profile → compose)
- Old `/work` and `/writing` URLs return 404 (cleanup post-rename)
- Sandbox builds slow (~30-40s) due to FUSE + Sharp init; local Mac ~5s

## Build / verify

```bash
make setup
make dev
make build
make preview
make lighthouse
make clean
```

CI safety: no platform-pinned binaries in `dependencies` (Sharp / Rollup binaries break `npm ci` on Linux x64 runners).

## Reference

- [README](../README.md) — front door
- [AGENTS.md](../AGENTS.md) — agent orientation
- [SETUP_AGENT.md](../SETUP_AGENT.md) — agent-driven setup runbook
- [TODO_AI.md](../TODO_AI.md) — deferred AI-readability work
- [architecture](./architecture.md), [customization](./customization.md), [content](./content.md), [deploying](./deploying.md), [performance](./performance.md), [seo](./seo.md), [design-philosophy](./design-philosophy.md)
