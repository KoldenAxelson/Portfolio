# TODO_AI.md — deferred AI-readability work

What's already shipped in the template (no user action needed):

- Static HTML on first paint (Astro static build, Vue islands hydrate on
  interaction only)
- Site-wide `WebSite` + `Person` JSON-LD, with stable `@id`s so per-page
  schemas merge into a single entity graph
- `BlogPosting` on articles, including `image`, `inLanguage`, `publisher`,
  `isPartOf` → `WebSite`, `author` → `Person` by `@id`
- `SoftwareApplication` / `SoftwareSourceCode` / `CreativeWork` schema on
  project case studies (most-specific type chosen from `links.live` /
  `links.repo`), `programmingLanguage` from `stack`, `author` by `@id`
- `Person.hasOccupation` on `/cv`, generated from `src/data/cv.ts` so an
  AI can walk employment history structurally
- `/llms.txt` generated at build time from SITE config + content collections
  (llmstxt.org spec)
- `robots.txt` generated at build time, AI-permissive by default with
  explicit allows for GPTBot, ClaudeBot, anthropic-ai, Google-Extended,
  PerplexityBot, CCBot
- RSS + JSON Feed + sitemap, all linked via `<link rel="alternate">`
- `<time datetime>`, semantic landmarks, h-card on the sidebar,
  `rel="me"` on socials in the footer

The rest of this doc is what needs **user data** or **post-launch action**
before the AI-readability story is fully delivered.

---

## Blocking on user data

### Real OG image (`public/og-default.png`)

1200×630 PNG. Until it exists, `og:image` / `twitter:image` meta tags are
omitted (cleaner than 404s). Once added, set
`DEFAULT_OG_IMAGE = '/og-default.png'` in `src/config.ts`. Articles
auto-fall back to this when they don't define their own `cover`.

If the user wants per-article OG images, drop matching files in
`public/covers/` and reference them in the post's `cover:` frontmatter —
the BlogPosting schema picks them up automatically.

### Education `alumniOf` enrichment

`src/data/cv.ts` `education[]` currently feeds `Person.alumniOf` with just
`name` + a description string. If the school has a Wikidata or website URL,
add `url:` and `sameAs:` to the `Degree` interface and the schema emit
in `src/pages/cv.astro`. This is the difference between an AI saying
"State University" vs. linking it to the actual entity.

### Per-role `Organization` enrichment

Same pattern for employers in `src/data/cv.ts`: add an optional `employerUrl`
and emit it as `hiringOrganization.url` in the `hasOccupation` schema. Only
useful for employers with a real web presence.

### Flagship article

`docs/seo.md` recommends "What a Developer Portfolio Needs to Do in 2026"
as a starter. AI summarizers cite specificity. One substantive article
beats five thin ones.

---

## Post-launch (non-code)

These compound over months, not days. Order roughly by ROI.

- [ ] Submit `/uses` to <https://uses.tech>
- [ ] Submit `/now` to <https://nownownow.com>. Form answers prepared:
  - **Motto:** "For the beginning of [wisdom] is the most true desire of discipline; and the care of discipline is love." (Wisdom 6:17)
  - **Location:** Paso Robles, California, U.S.A.
  - **Professional title:** Principal Software Engineer
  - **What do you do?** I solve problems, then scale the solution.
  - **Why do you do it?** I love helping the person in front of me, then playing that smile in my head for each new customer I get.
  - **What should we read?** Chronicles of Narnia. You're never too old to read a good fairytale.
  - **URLs:**
    - <https://wrightfunctions.com>
    - <https://github.com/KoldenAxelson>
    - <https://www.linkedin.com/in/konrad-wright-b53860330/>
    - <https://dev.to/konradwright>
- [ ] PR to <https://github.com/emmabostian/developer-portfolios>
- [ ] Reciprocal `rel="me"` links from GitHub profile README, LinkedIn
      About section, Bluesky bio → portfolio domain. Establishes the
      verified-identity graph.
- [ ] Submit the canonical URL to Google Search Console + Bing Webmaster.
      The sitemap is at `/sitemap-index.xml`.
- [ ] (Optional) Wikidata entry for yourself, with `official website` =
      portfolio URL. Knowledge graphs love a Wikidata anchor.

---

## Worth considering, not urgent

### `FAQPage` schema on `/uses`

`/uses` is structurally Q&A-shaped ("What editor do you use?" "What
keyboard?"). Adding `FAQPage` JSON-LD would make it eligible for
rich-result surfaces and direct AI Q&A citation. Requires restructuring
the page content into a `Question`/`Answer` shape.

### `BreadcrumbList` schema

`/projects/[slug]` and `/articles/[slug]` would benefit. Three nodes:
home → section index → leaf. Useful for AI navigation summaries and
search rich snippets.

### `ItemList` on index pages

`/projects` and `/articles` are list pages. Adding an `ItemList` JSON-LD
that enumerates the entries (with `position` and `url`) makes the index
itself a structured entity. The `docs/seo.md` table mentions this for
`/network`; it should also exist on `/projects` and `/articles`.

### Auto-`dateModified` on `/now` from git

`/now` already emits a `CreativeWork` JSON-LD with `dateModified` set from
an `updated` constant in `src/pages/now.astro` — the constant has to be
bumped by hand when the page changes. Replacing it with the file's actual
last-commit date (read from `git log -1 --format=%cI src/pages/now.astro`
at build time) would make the freshness signal automatic.

### Project `aggregateRating`

When a project has a `metric` field that's a real rating ("4.8 ★ on Slack
Marketplace"), parse it and emit `aggregateRating` on the project's
`SoftwareApplication` schema. Currently the metric is display-only.

### Per-author Network entries with `Person` schema

`src/content/network/*.yaml` entries are people. They could each emit
their own `Person` JSON-LD on the network page, linked via `knows`
relations from the site owner. Would let an AI map the user's
professional network as a graph. Privacy-sensitive — must be opt-in
per contact.

---

## Maintenance signals

The single highest-leverage maintenance habit, in priority order:

1. **Update `/now` quarterly.** Active sites get re-crawled. Dead `/now`
   pages get demoted by AI summarizers as a freshness signal.
2. **Publish one substantive article every 6–8 weeks.** Specificity is
   what gets cited.
3. **Re-check the AI-summary accuracy yearly** by asking ChatGPT, Claude,
   Perplexity, and Gemini "who is [name]?" and comparing against the
   actual portfolio. Fix divergences by adding the missing detail to
   the page the AI should have cited.
