# Design philosophy

Why Neofolio looks and works the way it does. Less "what," more "why-not."

## The premise

Two audiences per page: the human and the AI that will summarize you to them. Architecture choices follow from this — every load-bearing decision asks "what works for both?"

## Load-bearing choices

| Choice | Why |
|---|---|
| Astro static-first, not SSR | AI scrapers need raw HTML. No-JS clients need raw HTML. Same build serves both. |
| Vue islands (not React) | We already had `@astrojs/vue`. React isn't justified for two components. |
| Tailwind (not UnoCSS) | Familiar, stable, plentiful help. |
| Light mode default | Portfolio is for reading (résumé, articles, project blurbs). Light wins for reading. Dark via `prefers-color-scheme`. |
| Inter, self-hosted | Recognizable, screen-optimized. Self-hosted to avoid third-party render-block. |
| Multi-page (not single-page) | Deferred decision; current default is multi-page. Single-page concentrates SEO; multi-page is conventional in dev space. |
| `<details>` for accordions | Native, accessible, keyboard-friendly, AI-indexable. |
| `mailto:` for contact | Portable across any static host. Cloudflare fork can swap to API endpoint. |
| Plain `<img>` + `public/covers/` (not `astro:assets`) | Avoids Sharp as a dep. SVG works fine as-is. Forkers can opt into `image()` schema if they want raster pipeline. |
| `posts` collection name, `/articles` URL | Rename would break existing slugs. Internal name vs URL is documented; not user-facing. |

## What we said no to

- **A blog with comments.** Webmentions work better; no spam sink.
- **Live API widgets** (Spotify "now playing", etc.). Third-party hop + APIs change.
- **A search bar.** Cmd-F works for static content; not worth the JS weight.
- **A floating contact button.** Network page + footer email handle it.
- **Analytics by default.** Add Plausible/Fathom in your fork if you want.
- **Auto-rotating hero carousel.** Single pane is more honest.

## Aesthetic positions

**Minimalist, opinionated, professional.** Mid-to-senior career; serious without corporate. Neutral palette, one amber accent, no flashy backgrounds.

**Static-first, JS as garnish.** Two islands total. Above the fold is always pure HTML.

**Brittany-influenced sidebar.** Sticky left + scrolling right + line-indicator nav + socials at bottom. Multi-page version of her single-page pattern.

**Underlined links by default** — color-blind users need a non-color affordance. Nav and icon links opt out via `class="no-underline"`.

**Drill-down on mobile Network.** iOS Settings pattern: list → profile → compose. Cleaner than collapsed accordions or modals.

**Magazine-card pattern for project cards.** Image floats left, text flows around. No deadspace from short images.

## When to override

Override consciously, not by accident. Good reasons:

- Specific audience needs something different (designer portfolio = heavier visuals)
- Specific aesthetic vision (anime / cyberpunk / brutalist)
- Feature the template explicitly skipped

Bad reason: "I didn't think about it."
