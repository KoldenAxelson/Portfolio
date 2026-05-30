# OX Stack

> Hugo · Tailwind · Go · HTMX · Alpine · TypeScript — a Node-free,
> Lighthouse-optimized web stack built from compiled binaries and minimal
> script tags.

---

## Philosophy

OX is a deliberate departure from the Node.js application model. Every tool is a
compiled binary or a small script — nothing that requires `npm install` for the
build, nothing that pulls in a tree of transitive dependencies, nothing that
ships a framework runtime to the browser by default.

The result is a stack that is **fast by default, lean by construction, and
cheap to host**: static HTML at the edge, a single Go binary for anything
dynamic, and just enough client JS to make the page feel alive.

A site starts at the static end (Hugo + Tailwind + a little TypeScript) and adds
the dynamic half (Go + HTMX) only when a feature genuinely needs a server.
Nothing is paid for until it's used.

---

## Core Tools

### Hugo — static site generation
- Static site generator written in Go, distributed as a single binary.
- Renders all cacheable content at build time — pages, catalogs, portfolios.
- Go templating with partials, shortcodes, and data files; builds in
  milliseconds at any size.
- Also our asset pipeline: bundles, minifies, and fingerprints CSS and JS
  (the latter via its **built-in esbuild**, so TypeScript compiles with no Node).

### Tailwind v4 — styling (standalone binary)
- Utility-first CSS via the Tailwind v4 standalone CLI: a single Rust-backed
  executable (Oxide engine). No Node, no `node_modules`.
- Scans templates and content for class names; emits only what's used — a
  typical payload is 5–20KB gzipped.
- CSS-first config: `@import "tailwindcss"`, `@source` globs, and an `@theme`
  block. No JavaScript config file.

### Go — dynamic server logic
- One compiled binary for everything dynamic: auth, writes, API endpoints,
  webhook processing.
- `html/template` renders the HTML fragments HTMX consumes — server-rendered,
  no JSON-to-DOM glue.
- Minimal memory footprint and fast cold starts; idle until a request needs it.

### HTMX — server-driven interactivity
- 14KB gzipped script tag, no build step, no virtual DOM.
- Drives interactivity by swapping server-returned HTML fragments into the page
  — it moves the *server* into the DOM.
- Also powers progressive, SPA-style navigation via `hx-boost` (see the pattern
  note below), which works on any static host.

### TypeScript — client-only behavior
- The default for bespoke client behavior that never touches the server:
  scroll-spy, menus, filters, animations.
- Compiled by Hugo's built-in esbuild — typed authoring DX with **no Node, no
  `tsc` step, and no framework runtime shipped**. Typical payload 1–3KB gzipped.
- `tsconfig.json` exists for editor type-checking, not for the build.

### Alpine.js — reactive islands
- For views with genuine client state (multi-field forms, computed values, a
  selection that drives several regions), where a reactive model is clearer than
  imperative DOM code.
- Loaded as a **page-level island — only on the page(s) that need it** (~16KB
  gzipped), so the rest of the site stays framework-free.

---

## Separation of duties

Each layer owns exactly one job. The most-confused pair is HTMX and TypeScript:
**HTMX moves the *server* into the DOM; TypeScript handles behavior that never
leaves the browser.** They are complements, not alternatives.

| Layer | Tool | Owns | Needs a server? |
|---|---|---|---|
| Static HTML | Hugo | Build-time rendering of all cacheable content | No |
| Styling | Tailwind v4 (standalone) | Utility CSS compiled to one static file | No |
| Server logic | Go | Auth, writes, search, webhooks, API | — (is the server) |
| Server → DOM | HTMX | Swaps server-rendered HTML fragments into the page; no client state | Yes (or a pre-rendered static fragment) |
| Client behavior | TypeScript | Client-only interactivity: menus, scroll-spy, animations, filters | No |
| Reactive islands | Alpine.js | Local reactive state, loaded per-page only where needed | No |

A purely static deployment exercises Hugo + Tailwind + TypeScript, with Alpine
on the occasional reactive page. Go + HTMX come online the moment the project
grows a genuinely dynamic, server-backed feature.

---

## Static vs dynamic split

Hugo pre-renders all public, cacheable content at build time; it's served as
flat files from a CDN edge with no server in the path. Only authenticated
actions, writes, and search hit the Go backend. The split is host-agnostic —
the static half can sit on any static host, and the Go binary can run wherever
persistent compute is convenient.

```
Visitor reads a page   → static HTML from the CDN
Visitor takes an action → HTMX request → Go service → HTML fragment back
```

---

## Client navigation: hx-boost ↔ page-level islands

`hx-boost` makes a multi-page static site feel app-like (AJAX navigation, no
full reloads) on any host. It has one contract worth stating, because it shapes
how client JS is organized:

- **hx-boost swaps `<body>` and keeps `<head>` stable** (only the `<title>` is
  merged). Anything a page needs in its `<head>` — page-specific scripts or an
  **island runtime like Alpine** — is not fetched when you navigate *into* that
  page via a boosted swap.
- **So client JS lives in two tiers:**
  1. *Site-wide JS* (the always-on TypeScript bundle) lives in `<head>` to
     survive body swaps, and is **boost-aware**: bind window/document listeners
     once, re-run element-level wiring on `htmx:afterSettle`.
  2. *Per-page island runtimes* (Alpine) can't be added to a stable head
     mid-session, so **an island page opts out of hx-boost**
     (`hx-boost="false"` on links to it) and full-loads, bringing its runtime in
     its own `<head>`. Pair with `x-cloak` + a `<noscript>` fallback.

Boosted pages share one persistent, boot-aware head; island pages are full-load
islands — SPA-smooth navigation for the bulk of the site, with stateful pages
loading exactly the runtime they need and nothing more.

---

## Security posture (structural)

Two protections are baked into the tooling rather than bolted on:

- **SQL injection — `sqlc`.** Queries are written in SQL and compiled to
  type-safe Go functions; string concatenation into queries is removed from the
  workflow entirely.

  ```sql
  -- query.sql
  SELECT * FROM items WHERE id = ?;
  ```

- **CSRF — request headers.** HTMX sends a custom header on every request;
  cross-origin requests can't set custom headers, so the header itself acts as
  the CSRF token with zero library overhead.

  ```html
  <meta name="htmx-config" content='{"defaultHeaders": {"X-Requested-With": "XMLHttpRequest"}}'>
  ```

Authentication is OAuth-only (no password storage), with stateless JWT sessions
so no session database is required. Infrastructure-level hardening (network
firewalls, storage policies, rate limiting, key management) is
deployment-specific — see the deployment companion.

---

## Performance expectations

| Metric | Expected |
|---|---|
| Total first load (typical page) | 60–100KB |
| JS payload | ~1–3KB (TypeScript, per page); +14KB HTMX or +16KB Alpine only on pages that use them |
| CSS payload | 5–25KB gzipped |
| TTFB (static pages) | <50ms from a CDN edge |
| Time to interactive | ~300–500ms |
| Lighthouse (Perf / SEO / Best Practices) | 95–100 |

---

## Development workflow

```bash
# Terminal 1 — Hugo dev server (also compiles TypeScript via built-in esbuild)
hugo server

# Terminal 2 — Tailwind v4 standalone watcher
tailwindcss -i assets/css/main.css -o assets/css/app.css --watch

# Terminal 3 — Go backend (only for projects with dynamic endpoints)
go run ./cmd/server

# Build
tailwindcss -i assets/css/main.css -o assets/css/app.css --minify
hugo --minify        # bundles + minifies TypeScript via esbuild as part of the build
go build -o bin/server ./cmd/server   # only if there's a backend
```

No package manager. No `node_modules`. TypeScript compiles inside Hugo — no
separate `tsc` or watcher.

---

## Deployment

The stack is host-agnostic: the static output ships to any static host, and the
Go binary runs wherever persistent compute is convenient. For a concrete,
cost-optimized path — Cloudflare Pages/Workers/D1/R2/KV + AWS for email and
backups — see **[ox-cloudflare.md](./ox-cloudflare.md)**.
