# SETUP_AGENT.md — agent runbook for customizing a fresh Neofolio fork

You are an AI assistant helping a user turn a freshly-cloned Neofolio template
into their personal portfolio. This document is a **procedural runbook** — work
through the phases in order, ask the user the questions in each phase, and edit
the listed files. Do not skip ahead. Do not bulk-ask everything up front: each
phase's edits depend on the previous phase's answers.

> [`AGENTS.md`](./AGENTS.md) is the shorter orientation doc. Skim it once for the hard invariants (JSON-LD `@id` linkage, base-path safety, no JS above the fold, Lighthouse targets) before starting Phase 1.

The user has already run `make setup` (or `bash setup.sh`). Dependencies are
installed. The site builds. Your job is to fill in real data and remove the
template's placeholder content.

> **Tone.** This is the user's portfolio. Push back on generic answers. Ask
> follow-ups when something sounds like a résumé cliché. Specifics get cited
> by AIs and remembered by humans.

---

## Phase 0 — Pre-flight (no questions yet)

1. Confirm the working directory is the project root (`package.json` present).
2. Run `npm run build` once to confirm the template builds clean before editing. Stop and surface the error if it fails.
3. Read `src/config.ts` and `src/data/cv.ts` once — you'll be filling these in.
4. Read [`AGENTS.md`](./AGENTS.md) for invariants (do not regress JSON-LD `@id` linkage, base-path safety, no JS above the fold, Lighthouse targets).

---

## Phase 1 — Identity (`src/config.ts`)

This is the single most important file. Everything user-facing reads from it.

**Ask, in this order:**

1. **Canonical site URL.** "What URL will this site live at? (e.g.
   `https://yourname.com`, or `https://yourname.github.io/portfolio` for a
   GitHub Pages project site.) No trailing slash."
2. **Site title.** "What should the browser tab and OG cards say? Most people
   use their name; some use a wordmark."
3. **One-line description.** "Tagline / meta description. Under 160 chars,
   reads as a sentence, not keywords."
4. **Author block:**
   - Full name (as it should appear in `Person` JSON-LD and on the page)
   - Handle (`@handle`, used for Twitter card creator)
   - Role (job title — e.g. "Staff Software Engineer")
   - Location ("City, Country" or just "Remote")
   - Email (real, monitored — this is the contact endpoint)
   - **Short bio** (one or two sentences, hero section)
   - **Long bio** (a paragraph, used for `/cv` summary and `Person` schema)
   - **`resume.pdf`** and **`resume.docx`** — public URLs to downloadable
     résumé files. Both render as separate "Download PDF" / "Download
     DOCX" buttons on `/cv`. PDF for human review; DOCX for ATS pipelines
     that prefer editable formats. Defaults: `/resume.pdf` and
     `/resume.docx` — drop the actual files in `/public/` (or update
     paths). Set either to `''` to hide that button; both empty hides
     the row entirely.
5. **Social links.** Ask for GitHub, LinkedIn, Twitter/X, Mastodon, Bluesky.
   **Empty string out anything they don't use** — do not invent placeholders.
6. **Locale.** Default `en-US`. Ask only if they're not in the US.

**Write back into `src/config.ts`.** Edit in place — preserve the comments.

**Then offer to remove or reorder `nav` items.** Default is `Projects /
Articles / Network / Uses / CV`. Some users skip Network or Uses; ask.

---

## Phase 2 — Work history (`src/data/cv.ts`)

This file is the single source of truth for the CV page AND the homepage
experience block. It also drives the `Person.hasOccupation` JSON-LD on /cv.

**For each role**, ask:

- Job title (exact, résumé-style)
- Employer name
- Location (`Remote`, `City, ST`, `Hybrid · City, ST`)
- Start year + end year (or `present`)
- ISO `startDate` / `endDate` if known (improves schema quality — month-day
  granularity is fine, even just `YYYY-01-01` is better than nothing)
- One- to two-sentence summary of the scope
- 2–4 specific highlights — **numbers, not adjectives**. Push back on
  "improved performance" → "cut p99 latency 70%". Push back on
  "led a team" → "owned hiring; closed 4 engineers in 9 months".
- Tech stack (3–6 items, plain names)
- **`thoughts: string[]`** — 1–3 personal asides about this role. Off-resume
  voice: things you'd say in person but not put in a bullet point. Drives
  the chat-bubble indicator on the homepage. Empty array = no indicator.

Most-recent role first. Replace the entire `experience` array — do not
leave any of the example entries in place.

**Education** — ask for school, degree, year, and any honors/thesis worth
naming. One entry is fine.

**Skills** — ask for 3–5 categories (Languages / Systems / Cloud / etc.)
with 4–8 items each. If the user resists categorization, just use
`Languages` and `Other`.

After editing `src/data/cv.ts`, both `/` and `/cv` will reflect the change.
Do not also edit `src/pages/cv.astro` or `src/pages/index.astro`.

---

## Phase 3 — Projects (`src/content/projects/`)

Run `node scripts/clean-examples.mjs` once. It removes every template `example-*` file from `src/content/{projects,archive,network,certificates}` and `public/covers/`, plus the placeholder welcome post. Idempotent.

Then either run `make project` (interactive) for each real project, or write the MDX files by hand following `docs/content.md`.

**Sort projects into tiers BEFORE writing:**

- **Tier 1** — case studies. Get a full `/projects/[slug]` page. Body is
  required and follows: Problem / Constraints / What I did / Outcome /
  What I'd do differently. Limit to 3–5 unless the user has truly that
  many flagship pieces.
- **Tier 2** — listed only. Card on `/projects`, no body. For tools,
  scripts, smaller things with a repo link and a one-line summary.
- **Archive** (separate collection) — projects that didn't make it. Each
  needs a one-sentence honest postmortem. This collection is the template's
  marquee feature; encourage at least 2–3 entries.

**Cover images** — optional but worth pushing for. The cover doubles as the project's `og:image` and Twitter card (`SEO.astro` passes it through), so it's the social-share thumbnail people see when the URL gets posted. Pre-convert raster sources to WebP/AVIF (`cwebp -q 80`) and drop in `public/covers/`. Target ≤30 KB each.

For Tier-1 projects, also ask for the `metric` field (vanity stat —
"★ 612 stars", "↓ 12k downloads") and a link to the source page for that
metric. Skip the field entirely if there's nothing real to point at.

For every project you keep (any tier), ask for **`thoughts: string[]`** —
1–3 personal asides about that specific project. Drives the chat-bubble
indicator on the homepage so a visitor can hear your one-sentence take on
*this exact project*, not a generic projects-section message. Empty array
or omitted = no indicator on that card.

---

## Phase 4 — Articles (`src/content/posts/`)

The `clean-examples` script in Phase 3 already removed the placeholder `welcome-to-neofolio` post.

Articles are MDX with frontmatter — `docs/content.md` has the schema. A post's `cover:` frontmatter also feeds `og:image` and the BlogPosting JSON-LD `image`, so it's worth supplying when one exists.
The user can either:

- **Have existing posts** — paste them in, slugify the filename, fill the
  frontmatter. Set `pubDate` to the original publish date. If syndicated
  from elsewhere, set `canonical:` to the original URL.
- **Have nothing yet** — that's fine. Leave `src/content/posts/` empty.
  The articles section just won't show on the homepage. Encourage them
  to publish ONE flagship post within a month — `docs/seo.md` recommends
  "What a Developer Portfolio Needs to Do in 2026" as a starting topic.

If the user has a half-written draft, set `draft: true` in the frontmatter
and it'll be excluded from the build until they're ready.

For every published article, ask for **`thoughts: string[]`** — 1–3
personal asides about that specific article (why you wrote it, what
surprised you, what reaction it got). Drives the chat-bubble indicator on
the homepage's recent-articles list. Empty array or omitted = no indicator.

---

## Phase 5 — Certifications (`src/content/certificates/`)

`clean-examples` already removed the template entries. For every credential the user holds (or has held — expired ones still
matter), create a YAML file with:

- `name` — exact title as on the credential
- `issuer` — issuing organization (AWS, HashiCorp, Coursera, etc.)
- `issuerUrl` — issuer's homepage (improves AI entity resolution)
- `issueDate` — ISO date when awarded (`YYYY-MM-DD`)
- `expirationDate` — only if applicable; omit for perpetual credentials
- `credentialId` — public ID/serial if the issuer provides one
- `verifyUrl` — public verification page (recruiters click this)
- `description` — one line on what the credential covers
- `skills` — 3–6 competency tags
- `featured: true` — to surface on the homepage Certificates strip
- `thoughts` — 1–3 personal asides for the homepage typewriter

If the user has nothing yet, leave `src/content/certificates/` empty — the
homepage section and `/cv#certifications` will silently skip. The
`/certificates` page will display a stub message.

If the user doesn't want a Certificates page at all, also remove the `Certs`
entry from `nav` in `src/config.ts` and delete `src/pages/certificates.astro`.

---

## Phase 6 — Network contacts (`src/content/network/`) — optional

`clean-examples` already removed the template entries.

This page is a recruiter aid: it lists 4–10 people who'd vouch for the
user, with a `relationship` field describing how they know each other.
The mailto: contact form auto-fills when a visitor selects a contact.

If the user doesn't want this page:
1. Remove the `Network` entry from `nav` in `src/config.ts`.
2. Leave `src/content/network/` empty (the page will render with just the
   owner pinned to the top — fine).
3. Or delete `src/pages/network.astro` entirely.

If they DO want it, ask for 4–10 entries and push for specificity in
`relationship` ("worked with daily for 2 yrs at X" beats "former coworker").

---

## Phase 7 — `/uses` and `/now`

These are short, opinionated pages.

- **`/uses`** (`src/pages/uses.astro`) — tools/stack/hardware list. Edit
  the page directly; the structure is a few collapsible accordions. Easy.
- **`/now`** (`src/pages/now.astro`) — what the user is focused on this
  season. 4–6 bullets. Date-stamped. Tell them they should plan to update
  it quarterly; dead `/now` pages get demoted by AI summarizers.

---

## Phase 8 — `humans.txt`, favicon, OG image

- **`public/humans.txt`** — small credit page for the curious. Edit to
  reflect the user's name, role, and any thanks they want to include.
- **`public/favicon.svg`** — currently an amber tile with letter "N".
  If the user has a personal mark, swap it. Otherwise change the letter
  inside the SVG to their initial.
- **`public/og-default.png`** — 1200×630 PNG. The user must provide this.
  Until they do, OG cards skip the image (better than 404). Once it's
  in place, set `DEFAULT_OG_IMAGE = '/og-default.png'` in `src/config.ts`.

---

## Phase 9 — Deployment

Ask: **GitHub Pages or Cloudflare Pages?**

- **GitHub Pages.** Default path. The repo already has the workflow.
  Set `BASE_PATH=/repo-name` in repo Actions secrets if it's a project
  site (not `username.github.io`). Push to `main`; CI deploys.
- **Cloudflare Pages.** See `docs/deploying.md`. Walk the user through:
  connecting the repo to a CF Pages project, build command (`npm run
  build`), output dir (`dist`), Node 22. If they want the contact form
  Worker, also: `wrangler pages secret put RESEND_API_KEY` and
  `CONTACT_TO_EMAIL`.

Either way: confirm the user updated `SITE.url` in Phase 1 to the actual
final URL — canonicals, JSON-LD, sitemap, llms.txt all derive from it.

---

## Phase 10 — Verification (do not skip)

```bash
npm run build      # must pass clean — schema errors surface here
make verify        # placeholders gone? JSON-LD parses? sitemap real?
make lighthouse    # ≥ 90 / 100 / 100 / 100
```

`make verify` (= `node scripts/verify-setup.mjs`) walks `dist/` looking for any of the template placeholder strings (`Your Name`, `you@example.com`, `Example Corp`, `https://example.com`, `your-username`, `[your name]`), validates every JSON-LD block parses, and confirms `llms.txt` + the sitemap don't reference `example.com`. Exit code 1 on hard issues. Surface the structured report to the user verbatim if anything fails — each issue names the file.

If `make verify` flags placeholders, the agent missed an edit. Find them with `grep -r "<placeholder>" src/`, fix the source, rebuild, re-verify.

---

## Phase 11 — Final hand-off checklist

Confirm with the user, point by point:

- [ ] `make verify` exits clean (covers placeholder + JSON-LD + sitemap checks)
- [ ] `SITE.url` points at the real domain
- [ ] `og-default.png` exists OR `DEFAULT_OG_IMAGE` is `undefined`
- [ ] At least one real article published (or a tracked TODO to write one)
- [ ] CV page reflects actual experience
- [ ] `make lighthouse` passes
- [ ] Domain DNS points at the deploy target
- [ ] `git commit && git push`

If any item is unchecked, name it explicitly in the wrap-up. Don't let the user "ship it tomorrow" — tomorrow becomes never.

See [`TODO_AI.md`](./TODO_AI.md) for post-launch AI-readability follow-ups (directory submissions, reciprocal `rel="me"` links, flagship article).
