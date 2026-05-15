# Performance & Lighthouse

Targets: **90+ / 100 / 100 / 100**.

Verify:

```bash
make lighthouse              # /
make lighthouse / /projects /articles /cv /uses /network
```

Reports → `.lighthouse/`. Manual tool, not CI-gated.

## What's already optimized

**Performance:**
- Static HTML on first paint. Site works with JS disabled.
- Self-hosted Inter (`public/fonts/InterVariable.woff2`) with `font-display: swap`.
- Vue islands: `client:visible` (ProjectFilter), `client:load` (NetworkPanel — page content).
- Zero JS above the fold anywhere.
- Images: `loading="lazy"`, explicit `width`/`height`, SVG pass-through, raster expected pre-converted to WebP/AVIF.
- Tailwind purges unused utilities at build.
- No layout shift: typewriter has `min-h` reserve, images have explicit dims.

**Accessibility:**
- AA contrast both modes (muted 6.5:1, accent 6.3:1).
- All `<a>` underlined by default; `class="no-underline"` opt-out for nav/icon links.
- Touch targets ≥36×36 (social icons use `-m-2 p-2` trick).
- `aria-label` on icon-only buttons, `aria-current="page"` on active nav, `aria-hidden` on decorative SVGs.
- Skip-to-content link.
- `focus-visible` outlines.
- `prefers-reduced-motion` honored throughout.
- Semantic elements (`<article>`, `<section>`, `<nav>`, `<time datetime>`).

**Best Practices / SEO:**
- HTTPS enforced by host.
- Unique `<title>` + `<meta description>` per page.
- Canonical URL per page.
- OG/Twitter Cards (when `DEFAULT_OG_IMAGE` is set).
- JSON-LD: `WebSite`, `Person` site-wide; `BlogPosting`, `CreativeWork`, `ItemList` per page.
- Sitemap + RSS + JSON Feed.
- Permissive `robots.txt` (incl. GPTBot, ClaudeBot, PerplexityBot, CCBot).
- `public/_headers` ships immutable cache lifetimes for hashed/static assets on Cloudflare and Netlify (GitHub Pages ignores it and uses its own CDN defaults). Addresses the Lighthouse "use efficient cache lifetimes" audit.

## Known constraints

**GitHub Pages CDN.** US-anchored Fastly. APAC/Oceania scores 5-8 points lower than US/Europe. Cloudflare Pages closes most of this gap (330+ POPs).

**Vue island on `/network`** ships ~32 KB gzipped (Vue runtime + component). If score dips below 90, swap `client:load` → `client:idle` in `src/pages/network.astro`. Other pages already lazy.

## How scores drop

| Category | Common culprit | Fix |
|---|---|---|
| Performance | Third-party stylesheet | Self-host everything in `/public` |
| Performance | Heavy raster images | Pre-convert to WebP/AVIF, target ≤30 KB |
| Performance | `client:load` below fold | Use `client:visible` |
| Accessibility | Insufficient contrast on changed color | Re-check against `--color-bg` with WebAIM Contrast Checker |
| Accessibility | New body-prose link without underline | Don't add `no-underline` — that's exactly what Lighthouse flags |
| Accessibility | Icon-only button | Add `aria-label` |
| Accessibility | New small interactive target | `-m-2 p-2` trick to grow click area without layout shift |
| Best Practices | `console.error` at runtime | Open DevTools, find the source |
| Best Practices | Mixed content (HTTP link) | Change to HTTPS |
| SEO | Missing `<meta description>` | Pass `description` to `BaseLayout` |
| SEO | `SITE.url` still `example.com` | Update in `src/config.ts` |
| SEO | Page accidentally `noindex` | Only `/404` and `/archive` should have it |
