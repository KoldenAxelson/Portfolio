# Content authoring

How to add projects, articles, network contacts, and archive entries.

## Two paths: scripted or by hand

Both produce the same output. Pick whichever feels right.

### Scripted (recommended for new entries)

```bash
make project    # Add a project
make post       # Add an article
make contact    # Add a network contact
make archive    # Add an archive entry
```

Each command prompts for the fields, validates inputs (URLs, enums),
slugifies the title into a filename, and writes the file to the right
collection directory. Everything the script generates is plain text you
can edit by hand afterward.

### By hand

Drop a new file into one of:

- `src/content/projects/<slug>.mdx` — projects (Tier 1) or `.md` (Tier 2)
- `src/content/posts/<slug>.mdx` — articles
- `src/content/network/<slug>.yaml` — network contacts
- `src/content/archive/<slug>.md` — archive entries

The schema is validated at build time. Missing required fields fails
the build with a clear error.

## Projects

### Schema

```yaml
---
title: 'Real-Time Event Pipeline'
tier: 1                                  # 1 = featured case study, 2 = listed, 3 = archive (use archive collection instead)
summary: 'One sentence about the project.'
tags: ['backend', 'distributed-systems']
stack: ['Go', 'Kafka', 'Postgres']
role: 'Tech lead'                        # Optional
year: '2024'                             # String — allows ranges like "2022–present"
status: 'shipped'                        # shipped | in-progress | abandoned | classified
featured: true                           # Tier-1 only — show on homepage hero strip
draft: false                             # If true, excluded from build

links:                                   # All optional
  live: 'https://...'
  repo: 'https://github.com/...'

metric:                                  # Optional vanity metric on the card
  label: '★ 612 stars'
  href: 'https://github.com/.../stargazers'

cover: /covers/event-pipeline.svg        # Optional, path relative to /public
---

(MDX body for Tier 1 case study — Problem / Constraints / What I did / Outcome)
```

### Tier semantics

- **Tier 1 (`tier: 1`)** — full case study. Body required (the Problem /
  Constraints / What I did / Outcome / What I'd do differently structure).
  Generates `/projects/[slug]`. Featured tier-1 items also appear on the
  homepage.
- **Tier 2 (`tier: 2`)** — listed only. No body. Card links straight to
  the live URL or repo URL. Appears on `/projects` under "All projects".
- **Tier 3 (`tier: 3`)** — don't use the projects collection for these.
  Use the `archive` collection instead (separate schema).

### Cover images

Path is relative to `/public/`. Examples:

- `cover: /covers/foo.svg` → `/public/covers/foo.svg`
- `cover: /covers/foo.webp` → `/public/covers/foo.webp`

**Use SVG when possible** — vector, scales, tiny. SVG passes through the
build pipeline unchanged.

**For raster sources** — pre-convert to WebP or AVIF before committing.
Don't ship PNG/JPG (Lighthouse penalty). Two easy paths:

```bash
# WebP at quality 80 (good balance for thumbnails)
cwebp -q 80 source.png -o public/covers/foo.webp

# AVIF (smaller still, browser support is fine in 2026)
avifenc -q 80 source.png public/covers/foo.avif
```

Or use [squoosh.app](https://squoosh.app) — drag in, pick WebP/AVIF, drag
out. Target ≤30 KB per cover for thumbnail sizes.

## Articles

### Schema

```yaml
---
title: 'AI-Readable HTML: What the Scrapers Actually See'
description: 'One- or two-sentence summary shown in the index.'
pubDate: 2026-04-08
updatedDate: 2026-04-15                  # Optional
tags: ['portfolio', 'ai', 'seo']
cover: /covers/foo.svg                   # Optional
canonical: 'https://...'                 # If syndicated, point to the original
draft: false
---

# Title

Article body in Markdown or MDX.
```

### Syndication pattern

If you cross-post to dev.to / Medium / Hashnode, set `canonical` to the
original Neofolio URL (`https://yoursite.com/articles/foo`). On the
syndicated platform, add `<link rel="canonical" href="...">` to the
syndicated version. Search authority stays at your domain.

## Network contacts

### Schema

```yaml
name: 'Sarah Chen'
title: 'Distinguished Engineer'
company: 'Stripe'                        # Optional
blurb: 'One- to three-sentence bio on why this person is notable.'
relationship: 'How you know them — context for the recruiter.'
link: 'https://...'                      # Optional — their site/LinkedIn/etc
avatar: '/avatars/sarah.webp'            # Optional — path in /public
order: 1                                 # Lower = higher in selector list
```

`relationship` is shown as an italic blockquote under the blurb when a
visitor opens the contact's profile. Be specific — recruiters want to
gauge how warm the connection is.

`order` controls list position. The owner is pinned above all contacts;
contacts are sorted by `order` ascending, then by name.

## Archive entries

### Schema

```yaml
---
title: 'sketchr — collaborative whiteboard'
year: '2021'
reason: 'abandoned'                      # abandoned | superseded | classified | archived
postmortem: 'One-sentence post-mortem — what ended this and what you learned.'
stack: ['React', 'WebRTC', 'Yjs']
---
```

Body is unused. The archive section on `/projects` renders the frontmatter
plus stack as a list.

## Drafts

Add `draft: true` to any project, article, or archive entry. Build will
skip it. Useful for parking work-in-progress that isn't ready to ship.

## Standardizing tags

Pick 8–12 tag values and stick to them. Tag drift (`dev-tools` vs
`developer-tools`) makes the filter on `/projects` ugly fast. Suggested
starter vocabulary:

```
backend     frontend    fullstack    cli         data
distributed-systems     developer-tools          reliability
self-hosted             team-tools               ai
postgres                slack                    monitoring
```

Edit your list in a comment at the top of `src/content/config.ts` if it
helps you remember.

## Where new content shows up

| Content | Appears on |
|---|---|
| Tier-1 project | `/`, `/projects` (Featured), `/projects/[slug]` |
| Tier-2 project | `/projects` (All projects) |
| Article | `/`, `/articles`, `/articles/[slug]`, `/rss.xml`, `/feed.json` |
| Network contact | `/network` |
| Archive entry | `/projects#archive`, `/archive` (legacy redirect) |

The homepage shows the 4 most-recent featured projects and 5 most-recent
articles. Adjust those slice sizes in `src/pages/index.astro` if you want
more or fewer.
