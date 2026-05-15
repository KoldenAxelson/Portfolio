# Neofolio

> An opinionated, AI-readable portfolio template for developers in the AI age.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Built with Astro](https://img.shields.io/badge/built%20with-Astro-FF5D01.svg)](https://astro.build)

Most portfolio templates optimize for one audience: humans who land on the
site. Neofolio is built for two — humans, and the AI systems that will,
increasingly, summarize you to those humans before they ever click through.

**[Live demo →](https://koldenaxelson.github.io/neofolio/)**

```bash
git clone https://github.com/KoldenAxelson/neofolio.git my-portfolio
cd my-portfolio
make setup && make dev
```

## What you get

- **AI-readable by architecture.** Every meaningful sentence is in the
  static HTML. JSON-LD entity graph on every page — `Person` and `WebSite`
  carry stable `@id`s so per-page schemas (`BlogPosting`,
  `SoftwareApplication`/`SoftwareSourceCode`, `Person.hasOccupation` on
  `/cv`) merge into one entity instead of declaring duplicate records.
  `/llms.txt` (llmstxt.org spec) generated at build time. Semantic
  elements throughout.
- **Fast by default.** Static-first build. Self-hosted Inter font. Vue
  islands hydrate on interaction only. Lighthouse 92+/100/100/100.
- **Forkable in minutes.** Identity in one file (`src/config.ts`). Theme
  in five CSS variables. Content in MDX.
- **Deploys anywhere.** GitHub Pages and Cloudflare Pages workflows
  shipped. Auto-detected base path. mailto: contact form works on any
  static host.
- **Pages, not just a profile.** Featured case studies, project catalogue,
  honest archive, articles with optional covers, structured CV, "now"
  page, **Network page** (your social-proof connections with mailto
  intro requests), and `/uses`.
- **Interactive without being heavy.** Tag filter, scroll-spy section
  nav, autohide top nav, hamburger menu, sidebar typewriter, drill-down
  mobile UX on the Network page.
- **Idempotent tooling.** `make setup`, `make dev`, `make build`,
  `make lighthouse` — plus interactive scaffolds (`make project`,
  `make post`, `make contact`, `make archive`) that prompt for the
  fields and write the file.
- **Agent-friendly setup, if you want it.** [`AGENTS.md`](./AGENTS.md)
  and [`SETUP_AGENT.md`](./SETUP_AGENT.md) let an AI assistant (Claude
  Code, Cowork, etc.) walk you through populating real data after
  `make setup`; `make verify` catches anything you missed. Skip it if
  you'd rather drive the editor yourself — every file is hand-editable.

## Documentation

Full docs in [/docs](./docs/README.md):

- **[Architecture](./docs/architecture.md)** — how the codebase is organized
- **[Customization](./docs/customization.md)** — make it yours
- **[Content](./docs/content.md)** — add projects, articles, contacts, archive
- **[Deploying](./docs/deploying.md)** — GitHub Pages and Cloudflare Pages
- **[Performance](./docs/performance.md)** — Lighthouse targets and optimization
- **[SEO](./docs/seo.md)** — AI-readability, JSON-LD, directory submissions
- **[Roadmap](./docs/roadmap.md)** — what's done, what's planned (read first)
- **[Design philosophy](./docs/design-philosophy.md)** — why we made specific choices

## Pages

```
/                   Hero + About + Experience + Featured projects + Certifications + Recent articles
                    (sticky sidebar with scroll-spy + typewriter bio)
/projects           Filterable project catalogue + honest archive
/projects/[slug]    Tier-1 case studies (MDX)
/articles           Article index (optional cover thumbnails)
/articles/[slug]    Individual posts (MDX)
/certificates       Active + expired professional credentials, with verify links
/network            Two-panel contact selector with mailto: intro compose
/uses               Collapsible tool/stack/hardware accordions
/cv                 Structured HTML résumé
/now                What I'm focused on this season
```

Plus: `/rss.xml`, `/feed.json`, `/sitemap-index.xml`, `/robots.txt`,
`/llms.txt`, `/humans.txt`, plus a `/archive` redirect for any old bookmarks.

## Stack

| Layer | Tool | Why |
|---|---|---|
| Framework | Astro 5 | Static-first, island hydration, Lighthouse-friendly |
| Islands | Vue 3.5 | Two components total — ProjectFilter, NetworkPanel |
| Styling | Tailwind 3 | Utility-first, purges unused CSS |
| Content | MDX + YAML | Git-native, indexable, authoritative |
| Type system | TypeScript strict | Across components, content schemas, scripts |
| Hosting A | GitHub Pages | Free, simple, static |
| Hosting B | Cloudflare Pages | Workers for forms/API, global edge |

## Commands

```bash
make             # show all commands
make setup       # first-time install
make dev         # dev server :4321
make build       # production build to dist/
make preview     # serve dist/ locally
make lighthouse  # audit scores

make contact     # add a network contact (interactive)
make post        # add an article (interactive)
make project     # add a project (interactive)
make archive     # add an archive entry (interactive)

make clean       # wipe dist/, .astro/, .lighthouse/
```

Everything the scaffolds generate is editable by hand afterward —
they save typing, not flexibility.

## Quick customization

Four files to know:

| File | Controls |
|---|---|
| `src/config.ts` | Name, role, bio, links, nav, typewriter messages |
| `src/data/cv.ts` | Work history, education, skills (drives `/cv` + homepage Experience + `Person.hasOccupation` JSON-LD) |
| `src/styles/global.css` | Five color CSS variables (light + dark) |
| `tailwind.config.mjs` | Fonts, custom utilities |

Driving setup with an AI assistant? It starts at [`AGENTS.md`](./AGENTS.md)
and works through [`SETUP_AGENT.md`](./SETUP_AGENT.md), an 11-phase
runbook. `make clean-examples` wipes the template content in one shot;
`make verify` is a post-build sanity check. Deferred AI-readability
follow-ups (directory submissions, optional schema enrichments) live in
[`TODO_AI.md`](./TODO_AI.md).

Three commands to know:

```bash
make dev          # see your changes live
make build        # confirm it ships
make lighthouse   # confirm it's fast + accessible
```

Three docs to read:

1. [Customization](./docs/customization.md) — the rest of the surface
2. [Content](./docs/content.md) — authoring patterns
3. [Deploying](./docs/deploying.md) — getting it live

## Contributing

This template is **fork-and-customize**, not a collaborative codebase. PRs
that change the architecture, add features, or rebrand the defaults will
almost always be declined — please just fork instead. Issues for
reproducible bugs or security concerns are welcome. See
[CONTRIBUTING.md](./CONTRIBUTING.md).

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release history. v1.0.0 is the
first public release.

## License

MIT. Attribution appreciated but not required. If Neofolio was useful to
you, a link in your site footer keeps the open-source flywheel turning.
