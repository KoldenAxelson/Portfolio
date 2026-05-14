# SETUP_AGENT.md — agent runbook for customizing a fresh Neofolio fork

You are an AI assistant helping a user turn a freshly-cloned Neofolio template
into their personal portfolio. This document is a **procedural runbook** — work
through the phases in order, ask the user the questions in each phase, and edit
the listed files. Do not skip ahead. Do not bulk-ask everything up front: each
phase's edits depend on the previous phase's answers.

The user has already run `make setup` (or `bash setup.sh`). Dependencies are
installed. The site builds. Your job is to fill in real data and remove the
template's placeholder content.

> **Tone.** This is the user's portfolio. Push back on generic answers. Ask
> follow-ups when something sounds like a résumé cliché. Specifics get cited
> by AIs and remembered by humans.

---

## Phase 0 — Pre-flight (no questions yet)

1. Confirm the working directory is the project root (`package.json` present).
2. Run `npm run build` once to confirm the template builds clean before you
   start editing. If it fails, stop and surface the error.
3. Read `src/config.ts` so you know the field names you'll be filling.
4. Read `docs/customization.md`, `docs/content.md`, and `docs/seo.md` once
   for context — but do not paste them at the user.

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

**Delete every `example-*` file** in `src/content/projects/` and
`src/content/archive/` first. Same for `public/covers/example-*`.

Then run `make project` (interactive) for each real project the user wants
to feature, OR write the MDX files by hand following `docs/content.md`.

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

**Cover images** — optional. If provided, pre-convert to WebP/AVIF
(`cwebp -q 80`) and drop in `public/covers/`. Target ≤30 KB each. Do not
ship PNG/JPG.

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

**Delete every `example-*` and the placeholder `welcome-to-neofolio` post.**

Articles are MDX with frontmatter — `docs/content.md` has the schema.
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

## Phase 5 — Network contacts (`src/content/network/`) — optional

**Delete every `example-*.yaml`** in `src/content/network/`.

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

## Phase 6 — `/uses` and `/now`

These are short, opinionated pages.

- **`/uses`** (`src/pages/uses.astro`) — tools/stack/hardware list. Edit
  the page directly; the structure is a few collapsible accordions. Easy.
- **`/now`** (`src/pages/now.astro`) — what the user is focused on this
  season. 4–6 bullets. Date-stamped. Tell them they should plan to update
  it quarterly; dead `/now` pages get demoted by AI summarizers.

---

## Phase 7 — `humans.txt`, favicon, OG image

- **`public/humans.txt`** — small credit page for the curious. Edit to
  reflect the user's name, role, and any thanks they want to include.
- **`public/favicon.svg`** — currently an amber tile with letter "N".
  If the user has a personal mark, swap it. Otherwise change the letter
  inside the SVG to their initial.
- **`public/og-default.png`** — 1200×630 PNG. The user must provide this.
  Until they do, OG cards skip the image (better than 404). Once it's
  in place, set `DEFAULT_OG_IMAGE = '/og-default.png'` in `src/config.ts`.

---

## Phase 8 — Deployment

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

## Phase 9 — Verification (do not skip)

Run these and surface results to the user:

```bash
npm run build                      # must pass clean
npm run preview &                  # serve dist on :4321
sleep 2

# 1. Real bio is in the HTML (not "A few sentences about who you are…")
curl -s http://localhost:4321/ | grep -o '<p[^>]*>[^<]\+</p>' | head

# 2. JSON-LD parses on /cv
curl -s http://localhost:4321/cv | grep -oE '<script type="application/ld\+json">[^<]+'

# 3. llms.txt renders
curl -s http://localhost:4321/llms.txt | head -40

# 4. robots.txt has the right base URL
curl -s http://localhost:4321/robots.txt

# 5. Sitemap has real URLs (not example.com)
curl -s http://localhost:4321/sitemap-index.xml
```

Then run `make lighthouse` (or `bash scripts/lighthouse.sh`) and confirm
all four scores are ≥ 90/100/100/100.

---

## Phase 10 — Final hand-off checklist

Confirm with the user, point by point:

- [ ] No `example-*` files anywhere in `src/content/`
- [ ] No "Your Name" / "Example Corp" / "you@example.com" anywhere in the
  build output (`grep -ri "your name\|example corp\|you@example" dist/`
  should return nothing)
- [ ] `SITE.url` points at the real domain
- [ ] `og-default.png` exists OR `DEFAULT_OG_IMAGE` is `undefined`
- [ ] At least one real article published (or a tracked TODO to write one)
- [ ] CV page reflects their actual experience
- [ ] Lighthouse passes
- [ ] Domain DNS points at the deploy target
- [ ] `git commit && git push`

If any item is unchecked, name it explicitly in your wrap-up message.
Don't let the user "ship it tomorrow" — tomorrow becomes never.

See `TODO_AI.md` for the post-launch AI-readability follow-ups (directory
submissions, reciprocal `rel="me"` links, flagship article).
