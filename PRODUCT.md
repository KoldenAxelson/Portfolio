# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary — recruiters and hiring managers**, arriving cold at the homepage,
usually from a link Konrad sent or from a search for his name. Their job is to
decide within a minute or two whether he is worth a conversation. They read the
homepage, the projects, and the CV; success is that they email
KonradWright@Protonmail.com or download the résumé.

**Second, and growing — visitors of `/misc`**: Konrad himself, his friends, and
strangers who found a specific reference page (Skyrim tools, the Viva Piñata
cheat sheet, the Basic Logic chapters, Father's Puzzle). Their job is to *use*
the widget in front of them — look something up, work a problem, track a
collection. They are not evaluating Konrad; they came for the tool and it must
be good on its own terms.

The two audiences share a site but not a job. Homepage and career surfaces are
evaluated; `/misc` is used.

## Product Purpose

Konrad Wright's personal site and home on the web (wrightfunctions.com). It does
two things:

1. Represents Konrad to people deciding whether to hire or work with him —
   projects, work history, CV, certifications, articles.
2. Hosts a durable, growing personal play area at `/misc`: interactive reference
   tools and puzzles that real people use repeatedly.

It has drifted from "portfolio template demo" toward "a personal site" — a place
that is his, where the misc corner is a first-class part of the product rather
than a footnote.

## Positioning

Built for two readers at once: the human and the model summarizing the site to
them. All meaningful content ships as static HTML, backed by a JSON-LD entity
graph (one `Person`/`WebSite` identity every page references by `@id`), a
build-time `/llms.txt`, and a JSON Feed. The site also runs its own chat
assistant on a self-hosted open-weights model (Ollama behind a Cloudflare Worker
and Tunnel) reading [CONTEXT.md](CONTEXT.md) — end-to-end ownership from model
proxy to on-page widget.

The `/misc` widgets are the second, less-stated position: hand-built interactive
tools that are actually used, not portfolio props.

## Operating Context

- Recruiters land on `/` and move to `/projects`, `/cv`, or email. Nav is
  deliberately small: Projects, About, Email, CV.
- `/misc` visitors usually arrive directly at one page and stay on it. Pages are
  long, tool-shaped, and returned to — the Skyrim page uses jump-to-section
  navigation (desktop FAB, mobile navbar list) because it is worked through, not
  read once.
- Several misc tools carry local state the visitor expects to persist: the Viva
  Piñata collection checklist saves and reloads.
- `/misc/skyrim-check` is a development-only assertion page — hidden, excluded
  from the sitemap, not a visitor surface.

## Capabilities and Constraints

- **Stack:** Hugo (static site generator), Tailwind CSS v4, HTMX (`hx-boost` for
  SPA-style navigation), Alpine.js loaded only on pages that need reactive
  state, and TypeScript compiled by Hugo's built-in esbuild.
- **Deliberately Node-free.** No `npm`, no `node_modules`, no framework runtime
  on static pages. Toolchain is two pinned binaries (Hugo + Tailwind standalone)
  fetched into `./bin`, plus `tsgo` for type-checking. `make dev` serves
  `http://localhost:1313` with live CSS rebuild; `make build` produces `public/`;
  `make typecheck` gates CI. **This constraint is load-bearing — future work must
  not introduce a Node dependency.**
- **Hosting:** Cloudflare Pages via GitHub Actions on push to `main`; a few
  Cloudflare Workers for dynamic pieces (the AI chat endpoint at
  `ai.wrightfunctions.com/chat`).
- **Content sources:** `data/site.yaml` (identity, links, nav, locale),
  `data/cv.yaml` (work history, education, skills), `content/` markdown, and
  YAML data sets under `data/` (skyrim, puzzle, argsets, glossary, network,
  certificates, archive). Interactive widgets are Hugo shortcodes in
  `layouts/shortcodes/`. Editing identity anywhere other than `data/site.yaml`
  is a violation of the project's own rule.
- **Neofolio is being retired as a frame.** The site began as the reference build
  of Konrad's MIT-licensed Hugo template and has since diverged substantially.
  There is no portability obligation: this site is free to become bespoke, and
  future work should reference Neofolio less or not at all. Neofolio remains a
  real shipped project in the project list — it is no longer the site's identity.
  *(Note: [README.md](README.md) and [CONTEXT.md](CONTEXT.md) still lead with the
  Neofolio framing and have not been updated to match this decision.)*
- **Known quality gap, stated by Konrad:** the `/misc` widgets do not meet the
  bar of the rest of the site. The Skyrim page's widgets are the worst offender
  and the agreed starting point.

## Brand Commitments

- **Name and identity:** Konrad Wright, `@KoldenAxelson`, Lead Software Engineer,
  Paso Robles, CA. Canonical domain `wrightfunctions.com`.
- **Voice:** first-person, warm, self-deprecating, unpolished on purpose — "your
  local tech bro," "I'm either working hard or hopelessly addicted to Sudoku."
  The CV voice is separate and professional. Both are confirmed and written down
  in `data/site.yaml`; do not flatten the personal voice into corporate register.
- **Assets on hand:** self-hosted Inter and JetBrains Mono, logo green `#037737`,
  favicon, OG image, badges, textures, covers under `static/`.
- **Phone is intentionally unlisted.** Email is the only direct channel.
- **The chat assistant never speaks for Konrad** and never makes commitments on
  his behalf; anything outside `CONTEXT.md` gets a pointer to his email.

## Evidence on Hand

Real, verifiable, and safe to use:

- **Shipped products:** VisorPlate (visorplate-us.com, live and selling),
  BigHammerGarage (bighammergarage.com, delivered contract), Neofolio (MIT,
  public repo), Crunchy (public repo).
- **In progress:** Widda (widda.club), private development, pre-launch.
- **Employment history:** 2010–2025 across Neurotopia/SenseLabs, Cumulus,
  Draftboard (acquired by DraftKings 2019), UNCOMN LLC. Concrete claim on record:
  1,000+ Fortify-flagged vulnerabilities resolved on the CPA project.
- **Certification:** CompTIA Security+, issued July 2023, expires July 2026.
- **Writing:** "Community as Infrastructure" (May 2026), also on dev.to.
- **Résumé downloads:** `/resume.pdf`, `/resume.docx`.

**Absences that must not be fabricated:** there are no testimonials, no customer
logos, no user counts, no revenue figures, no press coverage, no case studies,
and no performance benchmarks. Konrad's degree-level education is general college
coursework at Cuesta College — do not upgrade it. Widda has not launched; do not
imply it has.

## Product Principles

1. **Two readers, one page.** Every meaningful thing is in static HTML that a
   human and a model can both read. Content behind a runtime is content that
   didn't ship.
2. **Own the whole stack.** Node-free build, self-hosted fonts, self-hosted
   model. If a dependency can be removed, it gets removed.
3. **The homepage is evaluated; `/misc` is used.** Career surfaces earn a
   decision in under two minutes. Misc surfaces earn a return visit by being
   genuinely good tools.
4. **This is a personal site, not a product demo.** Personality is a feature.
   Divergence from any template is progress, not drift.
5. **Nothing invented.** Only real projects, real numbers, real credentials —
   the evidence list above is the ceiling.

## Accessibility & Inclusion

No external standard has been contractually committed, but the codebase treats
these as a floor and future work must not regress them: WCAG AA text contrast in
both themes (the `--c-*` tokens are annotated with their measured ratios),
`prefers-reduced-motion` honored, visible `:focus-visible` states, `sr-only`
labels, and `aria-live` regions on dynamic widgets. Light and dark themes are
both first-class.
