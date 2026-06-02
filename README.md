# Portfolio — Konrad Wright

My personal portfolio: an AI-readable, Node-free static site built on the
**OX Stack** (Hugo · Tailwind · Go · HTMX · Alpine · TypeScript). Structured for
both human readers and the AI systems that increasingly summarize a developer to
them. Forked from and powered by [Neofolio](https://github.com/KoldenAxelson/neofolio).

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
appears only on the one page that needs reactive state (`/network`).

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
4. **`assets/css/base.css`** — the five theme tokens (`--c-*`) for light/dark.

## Structure

```
assets/         CSS (Tailwind entry + base) and TypeScript interactivity
content/        projects, articles, now, uses, network, cv, certificates
data/           site.yaml, cv.yaml, icons, network/, certificates/, archive/
layouts/        Hugo templates (baseof, pages, partials, schema/, JSON-LD)
static/         fonts, textures, covers, badges, favicon, og image
```

## Deploying

Pushing to `main` runs `.github/workflows/cloudflare-pages.yml`, which builds
with the Node-free toolchain (`make setup` → Tailwind standalone → `hugo
--minify`) and publishes `public/` to Cloudflare Pages via `wrangler`. The
canonical base URL is `https://wrightfunctions.com/`, set in `hugo.toml`, so
every absolute URL — links, JSON-LD `@id`s, feeds, sitemap — stays consistent.
Requires repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

## License

MIT — see [`LICENSE`](./LICENSE). Built on the MIT-licensed
[Neofolio](https://github.com/KoldenAxelson/neofolio) template.
