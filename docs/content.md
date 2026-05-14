# Content authoring

Two paths, same output:

| Scripted | By hand |
|---|---|
| `make project` | `src/content/projects/<slug>.mdx` |
| `make post` | `src/content/posts/<slug>.mdx` |
| `make contact` | `src/content/network/<slug>.yaml` |
| `make archive` | `src/content/archive/<slug>.md` |

**Work history is NOT a content collection.** Edit `src/data/cv.ts` directly — see [customization.md](./customization.md#work-history-srcdatacvts).

Scaffolds prompt for fields, slugify, write the file. Output is editable plain text.

Schemas live in `src/content/config.ts`. Build fails on invalid frontmatter.

## Projects

```yaml
---
title: 'Real-Time Event Pipeline'
tier: 1                                  # 1 = featured case study, 2 = listed
summary: 'One sentence about the project.'
tags: ['backend', 'distributed-systems']
stack: ['Go', 'Kafka', 'Postgres']
role: 'Tech lead'                        # optional
year: '2024'                             # string (allows ranges)
status: 'shipped'                        # shipped | in-progress | abandoned | classified
featured: true                           # Tier-1 only: appears on homepage
draft: false
links:                                   # all optional
  live: 'https://...'
  repo: 'https://github.com/...'
metric:                                  # vanity metric on the card
  label: '★ 612 stars'                   # see "Metric label format" below
  href: 'https://github.com/.../stargazers'
cover: /covers/event-pipeline.svg        # relative to /public
---

(MDX body, Tier 1 only)
```

**Tier semantics:**
- **1** — featured case study. Body required. Generates `/projects/[slug]`. `featured: true` adds it to the homepage.
- **2** — listed only. No body. Card links to `live` or `repo` directly.

Tier-1 body convention: Problem / Constraints / What I did / Outcome / What I'd do differently.

**Metric label format** — `'★ <metric> [@<venue>]'`. Leading `★` (Unicode literal) renders as an inline Heroicons solid-star SVG outside the underlined text. Optional `@<venue>` reads like a handle — no space after `@` — and is italicized inside the underline. Examples: `'★ 612 stars'`, `'★ 1.2k stars'`, `'★ 4.8 @SlackMarketplace'`, `'Read the case study'` (no star — plain link). Legacy `@ Venue` (with a space) auto-normalizes at render time.

**Cover images** — relative to `/public`. SVG passes through unchanged. **Pre-convert raster sources to WebP/AVIF** before committing:

```bash
cwebp -q 80 source.png -o public/covers/foo.webp
avifenc -q 80 source.png public/covers/foo.avif
```

Target ≤30 KB per thumbnail. PNG/JPG ships will tank Lighthouse Performance.

## Articles

```yaml
---
title: '...'
description: '...'                       # shown in /articles index
pubDate: 2026-04-08
updatedDate: 2026-04-15                  # optional
tags: ['portfolio', 'ai']
cover: /covers/foo.svg                   # optional
canonical: 'https://...'                 # if originally syndicated elsewhere
draft: false
---

# Title

Markdown / MDX body.
```

**Syndication:** publish to your site first. Cross-post to dev.to / Medium / Hashnode after, with `rel="canonical"` pointing back. Authority stays at your domain.

## Network contacts

```yaml
name: 'Sarah Chen'
title: 'Distinguished Engineer'
company: 'Stripe'                        # optional
blurb: 'One- to three-sentence bio.'
relationship: 'How you know them.'
link: 'https://...'                      # optional
order: 1                                 # lower = higher in list
```

Owner is always pinned at top. Contacts sorted by `order` then by name.

`relationship` shows as italic under the blurb when a visitor opens the contact's profile — be specific so recruiters can gauge how warm the connection is.

## Archive entries

```yaml
---
title: 'sketchr — collaborative whiteboard'
year: '2021'
reason: 'abandoned'                      # abandoned | superseded | classified | archived
postmortem: 'One sentence: what ended this and what you learned.'
stack: ['React', 'WebRTC', 'Yjs']
---
```

Body unused. Appears in `/projects#archive`.

## Drafts

Set `draft: true` on any project, article, or archive entry. Build skips it.

## Tag vocabulary

Pick 8–12 tags and stick to them. Drift (`dev-tools` vs `developer-tools`) makes the filter on `/projects` ugly. Starter list:

```
backend  frontend  fullstack  cli  data  distributed-systems
developer-tools  reliability  self-hosted  team-tools  ai
postgres  slack  monitoring
```

## Where new content appears

| Content | Appears on |
|---|---|
| Tier-1 project | `/`, `/projects` (Featured), `/projects/[slug]` |
| Tier-2 project | `/projects` (All projects) |
| Article | `/`, `/articles`, `/articles/[slug]`, `/rss.xml`, `/feed.json` |
| Network contact | `/network` |
| Archive entry | `/projects#archive` |

Homepage slices: 4 featured projects, 5 recent articles. Adjust in `src/pages/index.astro`.
