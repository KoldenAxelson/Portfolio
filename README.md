# Portfolio — Konrad Wright

My personal portfolio: an AI-readable, Node-free static site built on the
**OX Stack** (Hugo · Tailwind · Go · HTMX · Alpine · TypeScript). Structured for
both human readers and the AI systems that increasingly summarize a developer to
them. Open source — fork it if it's useful to you.

**Live → [wrightfunctions.com](https://wrightfunctions.com/)**

---

## Why

Every page serves two audiences: the human reading it and the model summarizing
it. So all meaningful content is in static HTML, backed by a JSON-LD entity
graph (a single `Person`/`WebSite` identity that every page references by `@id`)
and a build-time [`/llms.txt`](https://wrightfunctions.com/llms.txt). JSON Feed,
robots, and sitemap come for free.

The stack is deliberately lean: two compiled binaries (Hugo + the Tailwind
standalone CLI) and Hugo's built-in esbuild for TypeScript — **no `npm`, no
`node_modules`, no framework runtime** on the static pages. Client interactivity
is a small TypeScript bundle; `hx-boost` adds SPA-style navigation; Alpine.js
is loaded sparsely — only on pages that need reactive state — to keep page
loads fast everywhere else.

## Quick start

The toolchain is two binaries, fetched per-platform — no package manager:

```bash
make setup      # download the Hugo + Tailwind binaries into ./bin (one-time)
make dev        # local server at http://localhost:1313 with live CSS rebuild
make build      # production build to ./public
make typecheck  # type-check the TypeScript with tsgo (native, no Node)
```

Run `make help` for the full list. `make typecheck` fetches `tsgo` (TypeScript's
native Go compiler) as a standalone binary — no npm, no Node — and also runs in
CI before every deploy.

## Where things live

1. **`data/site.yaml`** — identity, links, nav, locale.
2. **`data/cv.yaml`** — work history, education, skills (drives `/cv`, the
   homepage Experience section, and the `Person.hasOccupation` JSON-LD).
3. **`content/`** — projects, articles, and the `now`/`uses` pages as Markdown
   with front matter. **`data/`** — `network/` and `certificates/` as YAML.
4. **`assets/css/site/base.css`** — the five theme tokens (`--c-*`) for light/dark.

## Structure

```
assets/
  css/            main.css (Tailwind entry) · site/ (global) · pages/<feature>/
  scripts/        site/ (the global bundle, grouped by role) · pages/<feature>/
  img/            covers, badges, games, skyrim, … (served from the site root)
  geo/ wasm/ vendor/
content/          Markdown pages; the folder tree is the URL tree
data/             site.yaml, cv.yaml, icons.yaml + one folder per feature
layouts/
  partials/       site/ components/ func/ schema/ head/ + one folder per feature
  shortcodes/     site-wide ones at the root, feature ones in <feature>/
static/           fonts, js/<feature>/, img/ (served from the root), games, vault
scripts/          hand-run tools: maps/ writing/ workbooks/ vault/ ai/
docs/             authoring/ games/ ops/ product.md
services/         ai-proxy/ (Go proxy + context.md) · workers/ (Cloudflare Workers)
workbooks/        Python for ML packets (tested in CI, zipped into static/downloads/)
```

Folder rules (and how to move a file safely) live in the FileStructure skill
(`private/skills/FileStructure.md`, local only).

## Deploying

Pushing to `main` runs `.github/workflows/cloudflare-pages.yml`, which builds
with the Node-free toolchain (`make setup` → Tailwind standalone → `hugo
--minify`) and publishes `public/` to Cloudflare Pages via `wrangler`. The
canonical base URL is `https://wrightfunctions.com/`, set in `hugo.toml`, so
every absolute URL — links, JSON-LD `@id`s, feeds, sitemap — stays consistent.
Requires repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

## License

MIT — see [`LICENSE`](./LICENSE).
