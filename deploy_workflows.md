# Deploy Workflows — Plan

> **Status: GitHub Pages workflow implemented** (`.github/workflows/deploy.yml`).
> Decision taken: NeoGolio replaces the Astro codebase in the existing repo and
> deploys to its GitHub Pages project site; the workflow auto-derives the base
> URL (incl. sub-path) from `actions/configure-pages`, and all absolute URLs
> (links, JSON-LD `@id`s, feeds, sitemap) now derive from Hugo's `baseURL` — so a
> single `--baseURL` drives everything and a fork "just works." Cloudflare (§3)
> remains documented-but-unimplemented. The original plan, targets, and the
> base-path pitfall are retained below for reference.

NeoGolio is both a **portfolio template** (forkable) and a **HUGX stack
showcase**. The deploy story has to serve both: a forker should be able to ship
with near-zero config, and the workflow should demonstrate the stack's
Node-free, binary-driven build.

---

## 1. What the build actually needs

The toolchain is two compiled binaries plus Hugo's built-in esbuild — **no Node,
no `npm`, no `node_modules`**:

| Need | Tool | In CI |
|---|---|---|
| Static HTML | Hugo (extended) | download binary (pinned version) |
| CSS | Tailwind v4 standalone | download binary (pinned version) |
| TypeScript → JS | Hugo's bundled esbuild (`js.Build`) | nothing extra — runs inside `hugo` |

The `Makefile` already encapsulates this: `make setup` downloads both binaries
for the runner's OS/arch into `./bin`, and `make build` runs Tailwind then
`hugo --minify` into `public/`. So in any Linux CI runner the whole build is
effectively:

```bash
make setup     # fetch Hugo + Tailwind binaries (pinned)
make build     # tailwindcss --minify  &&  hugo --minify  → ./public
```

That keeps the supply-chain surface tiny and identical to local dev.

---

## 2. Target A — GitHub Pages (primary)

GitHub Pages is **purely static** (no server), which suits the static subset of
the site (everything except a future Go/HTMX dynamic feature).

- **Mechanism:** a GitHub Actions workflow builds `public/` and publishes it via
  the official Pages actions (`actions/upload-pages-artifact` +
  `actions/deploy-pages`), or `peaceiris/actions-gh-pages` to a `gh-pages`
  branch. The official Pages flow is preferred (no extra branch, native).
- **Trigger:** push to the default branch (+ manual `workflow_dispatch`).
- **Runner:** `ubuntu-latest`; `make setup && make build`; upload `public/`.
- **Base path:** this is the one real subtlety — see §4.

## 3. Target B — Cloudflare Pages (also-easy alternative)

Cloudflare Pages adds **Functions/Workers**, so it's the host of choice if/when
the dynamic half of HUGX (Go-backed HTMX endpoints, a real contact form, search)
comes online. Two ways to wire it:

- **(B1) Connect the Git repo, Cloudflare builds.** Build command
  `make setup && make build`, output dir `public`. Cloudflare's Linux build
  image has `curl`/`make`, so `make setup` can fetch the binaries; Hugo can also
  be pinned via a `HUGO_VERSION` build-env var if we prefer their native Hugo
  support over downloading it. Zero extra infra; preview deploys per PR for free.
- **(B2) Build once in GitHub Actions, deploy the artifact to Cloudflare** via
  `wrangler pages deploy public`. Decouples the build (one place) from two
  deploy targets; better if we want byte-identical output on both hosts.

Recommendation: **B1** for simplicity unless we end up wanting a single
build-once pipeline, in which case **B2**.

---

## 4. Base path & URL consistency (the pitfall)

Two URL settings must agree, or JSON-LD `@id`s won't match canonical URLs:

1. **Hugo `baseURL`** — drives `absURL` (canonical, OpenGraph, sitemap, RSS,
   feed, llms.txt) and `relURL` (all internal links via the `url` partial).
2. **`data/site.yaml` `url`** — drives the JSON-LD entity-graph `@id`s
   (`#person`, `#website`, credential ids).

Keep them equal (modulo trailing slash). Deployment scenarios:

| Scenario | baseURL | Notes |
|---|---|---|
| GH Pages **project site** (`user.github.io/NeoGolio`) | `https://user.github.io/NeoGolio/` | Needs the `/NeoGolio` path prefix. The `url` partial + `relURL` already handle sub-paths; just set `baseURL` (CI can derive it from the repo name) **and** match `data/site.yaml url`. |
| GH Pages **user/org site** (`user.github.io`) | `https://user.github.io/` | Root, no prefix. |
| **Custom domain** (GH Pages or Cloudflare) | `https://example.com/` | Root + a `CNAME` file (GH) or domain binding (CF). |

For the **template** case, the workflow should auto-derive `baseURL` from the
repo (e.g. `https://${owner}.github.io/${repo}/`) so a forker gets a working
project-site deploy with no edits — but `data/site.yaml url` is content the
forker owns, so the docs must tell them to set it to match (or the workflow can
inject it at build time). **Decision needed (see §5).**

---

## 5. Decisions that block implementation

These are the source-code/repo questions to settle first:

1. **Repo identity.** Is this the **public, forkable template repo**, **Konrad's
   personal portfolio**, or **both** (a template repo that Konrad also forks for
   his own site)? This shapes everything below.
2. **Primary Pages target.** Project site (`/NeoGolio` base path), user site
   (root), or custom domain (root)? Determines `baseURL` handling.
3. **Custom domain?** If yes: which host owns DNS, and add `CNAME` (GH) or domain
   binding (CF).
4. **One host or both?** GitHub Pages only, Cloudflare only, or both in parallel
   (and if both, build-once-deploy-twice (B2) or independent (B1)?).
5. **`site.yaml url` strategy for the template.** Document-and-let-forker-edit,
   or inject `baseURL`/`url` at build time from CI env so a fresh fork "just
   works"?
6. **Example content on deploy.** Ship the demo content as the live site, or
   gate deploy behind real content (the template ships examples; a personal site
   wouldn't want them indexed)?

---

## 6. Recommended shape (to build once unblocked)

Assuming "public template repo, GitHub Pages project site primary, Cloudflare as
the documented alternative":

- `.github/workflows/deploy.yml`: on push to default branch → `make setup` →
  `make build` with `--baseURL` auto-derived from the repo → upload `public/` →
  `actions/deploy-pages`. Pin Hugo + Tailwind versions (already pinned in the
  Makefile). Add `workflow_dispatch`.
- A `CNAME`/custom-domain toggle documented for forkers who have one.
- Cloudflare: a short docs section — connect repo, build command
  `make setup && make build`, output `public` (B1). Note Functions as the seam
  for future dynamic features.
- `docs/deploying.md`-style notes covering the `baseURL` ↔ `site.yaml url` rule
  and the project-site vs custom-domain split.

None of this is written yet — it waits on §5.

---

## 7. Open question for later

When the dynamic half of HUGX is wanted (real contact form, search, auth), the
deploy story forks: the static site stays on GH Pages/CF Pages, and the Go
backend deploys separately (Fly.io / Lightsail / Cloudflare Workers per the
stack doc). That's out of scope until a dynamic feature exists, but worth
remembering that "deploy" then becomes "deploy static + deploy backend."
