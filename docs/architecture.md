# Architecture

How the codebase is organized and why. Read this before making structural
changes.

## File layout

```
neofolio/
├── .github/workflows/      GitHub Actions for both deploy targets
├── docs/                   You are here
├── functions/api/          Cloudflare Pages Functions (server-side)
├── public/                 Static assets shipped as-is
│   ├── covers/             Project + article cover images (SVG/WebP/AVIF)
│   ├── fonts/              Self-hosted Inter variable font
│   ├── favicon.svg
│   └── humans.txt          humanstxt.org convention
├── scripts/                Make-target helpers
│   ├── _prompt.mjs         Shared readline helpers (no deps)
│   ├── new-*.mjs           Interactive content scaffolds
│   └── lighthouse.sh       Manual Lighthouse audit
├── src/
│   ├── components/         Astro + Vue components
│   ├── content/            Content collections (MDX/MD/YAML/SVG)
│   │   ├── archive/        Abandoned/superseded project entries
│   │   ├── network/        Connection cards for /network
│   │   ├── posts/          Articles (MDX)
│   │   ├── projects/       Project entries (MDX for tier 1, MD for tier 2)
│   │   └── config.ts       Collection schemas (zod)
│   ├── layouts/            Page-level shells
│   ├── lib/                Reusable utilities (url helper, etc.)
│   ├── pages/              File-based routing
│   ├── styles/             Global CSS + Tailwind entry
│   └── config.ts           Site-wide identity, nav, bio messages
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
├── setup.sh                Idempotent first-time install
├── Makefile                Friendly entry points (make help)
├── HUMAN.md                Maintainer's personal punch list
├── README.md
└── CONTRIBUTING.md
```

## Source of truth

Everything user-facing originates in **one file**:

- `src/config.ts` — name, role, bio, long bio, email, social links, nav,
  per-section bio messages for the typewriter. Edit this first.

Style tokens live in **one file**:

- `src/styles/global.css` — five CSS variables (`--color-bg`, `--color-fg`,
  `--color-muted`, `--color-accent`, `--color-border`) drive everything.
  Tailwind reads them through the config.

## Layout system

`BaseLayout.astro` is the shell every page uses. It accepts three layout-
shaping props:

| Prop | When | What it does |
|---|---|---|
| `split` | Homepage only | Renders sticky `SideBar` (identity + section nav + typewriter) alongside a scrolling right column |
| `wide` | `/network` only | Swaps `max-w-3xl` → `max-w-screen-xl` for app-like content |
| (default) | Every other page | Centered single column at `max-w-3xl` |

Visual chrome (top nav, footer) is the same on every page; only the
content container changes.

## Routing

Astro maps `src/pages/` to URLs file-system-style:

| Path | Source |
|---|---|
| `/` | `src/pages/index.astro` |
| `/projects` | `src/pages/projects/index.astro` |
| `/projects/[slug]` | `src/pages/projects/[slug].astro` (Tier-1 only) |
| `/articles` | `src/pages/articles/index.astro` |
| `/articles/[slug]` | `src/pages/articles/[slug].astro` |
| `/cv` | `src/pages/cv.astro` |
| `/uses` | `src/pages/uses.astro` |
| `/now` | `src/pages/now.astro` |
| `/network` | `src/pages/network.astro` |
| `/archive` | `src/pages/archive.astro` (redirects to `/projects#archive`) |
| `/work/*` | `src/pages/work/*` (meta-refresh to `/projects/*`) |
| `/writing/*` | `src/pages/writing/*` (meta-refresh to `/articles/*`) |
| `/rss.xml` | `src/pages/rss.xml.ts` |
| `/feed.json` | `src/pages/feed.json.ts` |
| `/robots.txt` | `src/pages/robots.txt.ts` (dynamic, reads `SITE.url`) |
| `/404` | `src/pages/404.astro` |

Old routes (`/work`, `/writing`) are preserved as redirects so existing
bookmarks survive. Safe to delete in the wf-site fork.

## Content collections

Schemas live in `src/content/config.ts`. Four collections:

- **`projects`** (`type: 'content'`) — MDX or MD. Schema requires title,
  tier (1|2|3), summary, year. Optional: tags, stack, role, status, links,
  metric, cover, featured, draft.
- **`posts`** (`type: 'content'`) — MDX or MD. Articles. Schema requires
  title, description, pubDate. Optional: updatedDate, tags, cover,
  canonical, draft.
- **`archive`** (`type: 'content'`) — MD. Schema requires title, year,
  reason, postmortem, stack.
- **`network`** (`type: 'data'`) — YAML. Schema requires name, title,
  blurb, relationship. Optional: company, link, avatar, order.

All schemas are validated at build time. Bad data fails the build.

## Components

### Layout

- `BaseLayout.astro` — head, top nav, content container, footer
- `SideBar.astro` — identity + section nav + typewriter (homepage only)
- `TopNav.astro` — sticky autohide nav + mobile hamburger
- `Footer.astro` — copyright, social row

### Content rendering

- `ProjectCard.astro` — used on home + `/projects`. Overlay link covers
  the card. Optional cover image + metric link.
- `ProjectFilter.vue` — Vue island for tag filtering on `/projects`.
  Hydrates `client:visible`.
- `NetworkPanel.vue` — Vue island for the contact selector. Hydrates
  `client:load` (it IS the page content).
- `SocialIcons.astro` — inline SVG icons, only renders configured links.
- `FormattedDate.astro` — `<time datetime>` with short month, `nowrap`.

### Meta

- `SEO.astro` — title, description, canonical, OpenGraph, Twitter,
  JSON-LD. Pages pass props; site-wide schemas inject automatically.

## Data flow

```
src/config.ts
     │
     ├─→ SideBar.astro (identity + bio + section nav)
     ├─→ TopNav.astro (nav items + icons)
     ├─→ Footer.astro (name + year)
     ├─→ SocialIcons.astro (link list)
     └─→ SEO.astro (JSON-LD Person + WebSite)

src/content/projects/*.mdx
     │
     ├─→ /projects/index.astro (list)
     ├─→ /projects/[slug].astro (case study, tier 1 only)
     └─→ /index.astro (featured slice)

src/content/posts/*.mdx
     │
     ├─→ /articles/index.astro (list)
     ├─→ /articles/[slug].astro (post)
     ├─→ /index.astro (recent slice)
     ├─→ /rss.xml.ts (feed)
     └─→ /feed.json.ts (feed)

src/content/network/*.yaml
     │
     └─→ /network.astro → NetworkPanel.vue

src/content/archive/*.md
     │
     └─→ /projects/index.astro (archive section)
```

## Base-path handling

GitHub Pages serves project sites at `/repo`, not `/`. All internal URLs
must be base-aware.

- `src/lib/url.ts` exports `url(path)` — prepends `import.meta.env.BASE_URL`
  to internal paths, passes through external URLs (http/https/mailto/tel)
  and same-page anchors.
- Use `url()` for every internal href and asset path.
- The workflow auto-detects the base from the repo name. Override with
  the `BASE_PATH` repo variable.

## Build pipeline

```
make build
  ↓
astro build
  ↓
1. Content sync — read src/content/, validate schemas
2. Type generation — emit .astro/types.d.ts
3. Static entrypoint build — Vite SSR each page
4. Client island build — Vite bundle Vue components
5. Static route generation — write HTML to dist/
6. @astrojs/sitemap — write sitemap-index.xml
```

Output: `dist/` is a self-contained static site. Drop it on any host.

## Why these choices

See [design-philosophy.md](./design-philosophy.md) for the rationale.
