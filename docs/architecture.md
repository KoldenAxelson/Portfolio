# Architecture

## Layout

```
neofolio/
├── .github/workflows/      GitHub Actions (deploy targets)
├── docs/                   This directory
├── functions/api/          Cloudflare Pages Functions
├── public/                 Static assets, copied as-is
│   ├── covers/             Project + article cover images
│   ├── fonts/              Self-hosted Inter
│   ├── textures/           Matte noise PNGs (light + dark)
│   ├── favicon.svg
│   └── humans.txt
├── scripts/                Make-target helpers
│   ├── _prompt.mjs         readline helpers
│   ├── _gen-noise.mjs      noise PNG generator
│   ├── new-*.mjs           interactive content scaffolds
│   └── lighthouse.sh       manual audit
├── src/
│   ├── components/         Astro + Vue
│   ├── content/            Collections (MDX/MD/YAML)
│   ├── data/               Typed data files (cv.ts — work history)
│   ├── layouts/            Page shells
│   ├── lib/                Utilities (url, schema entity @ids)
│   ├── pages/              File-based routes
│   ├── styles/             global.css (Tailwind entry)
│   └── config.ts           Site identity, nav, bio messages
├── Makefile
├── setup.sh
└── HUMAN.md                Maintainer's punch list
```

## Source-of-truth files

| File | Owns |
|---|---|
| `src/config.ts` | Identity, nav, bio messages |
| `src/data/cv.ts` | Work history, education, skills (drives `/cv`, homepage Experience, `Person.hasOccupation` JSON-LD) |
| `src/styles/global.css` | All theme variables, noise overlay |
| `tailwind.config.mjs` | Font families |
| `src/content/config.ts` | Collection schemas (zod) |
| `src/lib/schema.ts` | Canonical entity `@id`s (`personId`, `websiteId`) — referenced by every per-page JSON-LD block so parsers merge into one entity |

## Layout props (BaseLayout)

| Prop | Used by | Effect |
|---|---|---|
| `split` | `/` only | Sticky sidebar + scroll-spy + typewriter |
| `wide` | `/network` only | `max-w-screen-xl` instead of `max-w-3xl` |
| _(default)_ | Every other page | Centered single column |

## Routes

| Path | Source |
|---|---|
| `/` | `src/pages/index.astro` |
| `/projects` | `src/pages/projects/index.astro` |
| `/projects/[slug]` | `src/pages/projects/[slug].astro` (Tier 1 only) |
| `/articles` | `src/pages/articles/index.astro` |
| `/articles/[slug]` | `src/pages/articles/[slug].astro` |
| `/cv` | `src/pages/cv.astro` |
| `/uses` | `src/pages/uses.astro` |
| `/now` | `src/pages/now.astro` |
| `/network` | `src/pages/network.astro` |
| `/archive` | redirect → `/projects#archive` |
| `/rss.xml` | dynamic |
| `/feed.json` | dynamic |
| `/robots.txt` | dynamic (reads `SITE.url`) |
| `/llms.txt` | dynamic (llmstxt.org spec — identity + featured projects + articles) |
| `/sitemap-index.xml` | auto via `@astrojs/sitemap` |

The `posts` collection is intentionally kept while the URL is `/articles` — renaming the folder would break existing slugs for forkers upgrading.

## Content collections

All schemas in `src/content/config.ts` (zod, validated at build).

| Collection | Type | Required | Optional |
|---|---|---|---|
| `projects` | content | title, tier, summary, year | tags, stack, role, status, links, metric, cover, featured, draft |
| `posts` | content | title, description, pubDate | updatedDate, tags, cover, canonical, draft |
| `archive` | content | title, year, reason, postmortem | stack |
| `network` | data | name, title, blurb, relationship | company, link, order |

## Components

| Component | Purpose | Hydration |
|---|---|---|
| `BaseLayout` | Page shell | — |
| `SideBar` | Identity + section nav + typewriter (homepage only) | — |
| `TopNav` | Sticky autohide + mobile hamburger | inline JS |
| `Footer` | Copyright + socials | — |
| `SEO` | Meta + JSON-LD | — |
| `ProjectCard` | Card with overlay link + floated cover | — |
| `ProjectFilter.vue` | Tag filter on `/projects` | `client:visible` |
| `NetworkPanel.vue` | `/network` two-panel | `client:load` |
| `SocialIcons` | Inline SVG icons | — |
| `FormattedDate` | `<time datetime>` with `nowrap` | — |

## Base-path

GitHub Pages project sites need a `/repo` prefix on all internal URLs. The `url()` helper in `src/lib/url.ts` reads `import.meta.env.BASE_URL` and prepends it. Always use it for internal hrefs and asset paths.

The deploy workflow auto-detects `BASE_PATH` from repo name; override with a repo variable if needed.

## Build pipeline

```
make build → astro build →
  1. Content sync + schema validation
  2. Type generation (.astro/types.d.ts)
  3. Vite SSR build of pages
  4. Vite bundle of client islands
  5. Static route generation → dist/
  6. @astrojs/sitemap → sitemap-index.xml
```

Output: self-contained `dist/`.

See [design-philosophy.md](./design-philosophy.md) for the why-not behind specific choices.
