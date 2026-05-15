# Content authoring

Two paths, same output:

| Scripted | By hand |
|---|---|
| `make project` | `src/content/projects/<slug>.mdx` |
| `make post` | `src/content/posts/<slug>.mdx` |
| `make contact` | `src/content/network/<slug>.yaml` |
| `make archive` | `src/content/archive/<slug>.md` |
| _by hand_ | `src/content/certificates/<slug>.yaml` |

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
  icon: star                             # 'star' | 'user' | 'download' (optional)
  label: '612 @GitHub'                   # see "Metric format" below
  href: 'https://github.com/.../stargazers'
cover: /covers/event-pipeline.svg        # relative to /public
thoughts:                                # personal asides, see "thoughts" below
  - "Off-resume thought #1 about this project."
  - "Off-resume thought #2 about this project."
---

(MDX body, Tier 1 only)
```

**Tier semantics:**
- **1** — featured case study. Body required. Generates `/projects/[slug]`. `featured: true` adds it to the homepage.
- **2** — listed only. No body. Card links to `live` or `repo` directly.

Tier-1 body convention: Problem / Constraints / What I did / Outcome / What I'd do differently.

**Metric format** — `icon` picks the SVG, `label` is `'<number> @<venue>'`. The icon conveys the metric type so the units stay out of the text. Available icons: `star` (Heroicons solid star), `user` (Heroicons outline user), `download` (Heroicons outline arrow-down-tray). Omit `icon` for a plain underlined link (e.g. `label: 'Read the case study'`). The `@<venue>` portion reads like a handle — no space after `@` — and is italicized inside the underline. Examples:

```yaml
icon: star
label: '612 @GitHub'              # → ★ 612 @GitHub

icon: star
label: '4.8 @SlackMarketplace'    # → ★ 4.8 @SlackMarketplace

icon: user
label: '2.1k @ChromeWebstore'     # → 👤 2.1k @ChromeWebstore

icon: download
label: '24k @GitHubMarketplace'   # → ↓ 24k @GitHubMarketplace
```

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
thoughts:                                # personal asides, see "thoughts" below
  - "Off-resume thought #1 about this article."
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

## `thoughts` — personal asides for the homepage typewriter

Optional `thoughts: string[]` on **roles** (`src/data/cv.ts`), **projects**, and **articles**. Each entry is a one- to three-sentence personal aside in your own voice — off-resume, the kind of thing you'd say in person but not put in a bullet point. The homepage renders a small chat-bubble indicator next to every element; elements with thoughts get an interactive (accent-colored on hover) indicator, elements without get a faded disabled one. Clicking an enabled indicator types one of its thoughts into the sidebar typewriter; scrolling into a section types a random thought from a random element with thoughts in that section.

Aim for 1–3 thoughts per element. The pool is sampled at random, so two are enough for variety.

The About section has no indicator — the sidebar shows the static `author.bio` from `src/config.ts` while you're scrolled there.

## Certificates

```yaml
name: 'AWS Certified Solutions Architect – Associate'
issuer: 'Amazon Web Services'
issuerUrl: 'https://aws.amazon.com/certification/'      # optional, improves entity resolution
issueDate: 2025-04-15                                    # required, ISO date
expirationDate: 2028-04-15                               # optional
credentialId: 'AWS-SAA-C03-XXXXX'                       # optional, public ID
verifyUrl: 'https://www.credly.com/badges/...'          # optional but recommended
badge: '/badges/aws-saa.png'                            # the credential's actual badge image, see "Badges" below
description: 'Designs distributed systems on AWS...'    # optional, one line
skills:
  - VPC design
  - IAM least-privilege
  - Multi-region failover
featured: true                                           # appears on homepage
draft: false
thoughts:
  - "Personal aside #1 about earning this certificate."
```

Each certificate emits as a `EducationalOccupationalCredential` JSON-LD on `/certificates` (inside an `ItemList`) AND on `/cv` (as an entry in `Person.hasCredential`). The two share an `@id` so an AI graph walker resolves them to the same entity. Expired credentials still render on `/certificates#expired` for an honest history.

### Badges

The `badge` field is the credential's actual badge image (the colored mark issuers give you to display — e.g. the CompTIA Security+ circle, the AWS Certified Solutions Architect tile, the Credly artwork). Drop the file into `/public/badges/<slug>.png` and reference it as `/badges/<slug>.png`.

| Property | Recommendation |
|---|---|
| Min dimensions | 600×600 pixels |
| Aspect ratio | Square preferred (most issuers ship square badges) |
| Formats | PNG, WebP, JPEG, SVG |
| Source | Download from the issuer (Credly, Microsoft Learn, AWS Certification dashboard, etc.) |

At build time, Sharp reads the actual pixel dimensions of every badge under `/public/` and emits them as part of the JSON-LD `image` value (a full `ImageObject` with `url`, `width`, `height`). This is what gets a credential properly indexed by Google's Knowledge Graph and surfaces correctly in AI summarizers. It also eliminates Cumulative Layout Shift on the rendered `<img>` tags. No manual width/height needed in YAML.

Absolute URLs (e.g. `https://images.credly.com/...`) also work as badge values — they pass through without local introspection, so dimensions won't be in the JSON-LD for those. Self-hosting under `/public/badges/` gives the best SEO result.

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
| Certificate (active, featured) | `/`, `/certificates#active`, `/cv#certifications` |
| Certificate (active, not featured) | `/certificates#active`, `/cv#certifications` |
| Certificate (expired) | `/certificates#expired` |

Homepage slices: 4 featured projects, 5 recent articles. Adjust in `src/pages/index.astro`.
