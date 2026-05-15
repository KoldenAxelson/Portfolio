# AGENTS.md

Orientation for AI coding agents working in this repo. Humans should start at [`README.md`](./README.md).

## What this is

Neofolio — an opinionated Astro 5 + Vue 3 + Tailwind portfolio template. Every load-bearing decision optimizes for two audiences simultaneously: humans browsing and LLMs summarizing them to humans. Static-first build; the JSON-LD entity graph is treated as a first-class output.

## Where to read next

| Task you're being asked to do | Read |
|---|---|
| Walk a user through setting up a fresh fork | [`SETUP_AGENT.md`](./SETUP_AGENT.md) — 11-phase runbook |
| Post-launch AI-readability follow-ups | [`TODO_AI.md`](./TODO_AI.md) |
| Codebase orientation | [`docs/architecture.md`](./docs/architecture.md) |
| Add content (projects / articles / contacts / certificates) | [`docs/content.md`](./docs/content.md) |
| Identity / theming / nav | [`docs/customization.md`](./docs/customization.md) |
| Modify the SEO surface | [`docs/seo.md`](./docs/seo.md) |
| Deploy | [`docs/deploying.md`](./docs/deploying.md) |
| Anything else | [`docs/README.md`](./docs/README.md) |

## Hard invariants

Do not regress these. `make lighthouse` will catch the perf ones; the SEO ones are silent failures.

1. **Static HTML on first paint.** No JS above the fold. Vue islands hydrate `client:visible` or `client:load` only.
2. **JSON-LD entity graph stays coherent.** Per-page schemas reference the canonical `Person` and `WebSite` via `@id` from `@lib/schema`. **Never** redeclare a `Person` inline — use `{ '@id': personId }`. The `@id`s in `lib/schema.ts` are stable contracts; don't rename them.
3. **Base-path safety.** Every internal link goes through `url()` from `@lib/url`. Every absolute schema URL goes through `absolute()` / `articleUrl()` / `projectUrl()` / `credentialId()` from `@lib/schema`. A GitHub Pages project-site deploy (e.g. `/neofolio`) must still emit working URLs.
4. **Lighthouse targets.** `make lighthouse` ≥ 90 / 100 / 100 / 100.
5. **Source-of-truth files.** Identity flows from `src/config.ts`. Work history flows from `src/data/cv.ts`. Don't duplicate either into a page file.

## Source-of-truth map

| To change | Edit |
|---|---|
| Name, role, bio, social links, nav | `src/config.ts` |
| Work history, education, skills | `src/data/cv.ts` |
| Colors, fonts, base styles | `src/styles/global.css`, `tailwind.config.mjs` |
| Content (projects / articles / archive / network / certificates) | `src/content/<collection>/` (schemas in `src/content/config.ts`) |
| Page layout/copy | `src/pages/*.astro` |
| Cache headers (Cloudflare/Netlify) | `public/_headers` |

## Common agent commands

```bash
make build                            # validate content schemas + emit dist/
make lighthouse                       # perf + a11y audit (manual; not CI-gated)
make clean-examples                   # nuke every template example-* file + welcome post
make verify                           # post-customization sanity check
node scripts/clean-examples.mjs --dry-run   # preview what clean-examples would remove
```

`make verify` runs `scripts/verify-setup.mjs` against `dist/` — looks for template placeholder strings, validates every JSON-LD block parses, sanity-checks `llms.txt` and the sitemap. Exit code 1 on hard issues; informational warnings don't fail the run.

## Content-collection cheat sheet

All schemas in `src/content/config.ts`, zod-validated at build.

| Collection | File type | Path |
|---|---|---|
| `projects` | MDX (tier 1) / MD (tier 2) | `src/content/projects/<slug>.{mdx,md}` |
| `posts` | MDX | `src/content/posts/<slug>.mdx` |
| `archive` | MD | `src/content/archive/<slug>.md` |
| `network` | YAML | `src/content/network/<slug>.yaml` |
| `certificates` | YAML | `src/content/certificates/<slug>.yaml` |

Drafts: set `draft: true` in frontmatter. Build skips them.

## Things the agent should not do without asking

- Remove the JSON-LD `@id` linkage helpers in `lib/schema.ts`
- Add a third-party render-blocking resource (Google Fonts CDN, Font Awesome stylesheet, analytics SDK)
- Promote a Vue component from island to global hydration
- Skip the `url()` helper for an internal link
- Add JS above the fold
- Switch the build from `output: 'static'` to anything else
