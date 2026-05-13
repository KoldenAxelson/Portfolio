# SEO & AI-readability

Two audiences per page: the human visitor and the AI that will summarize you to them.

## Already baked in

**Static HTML on first paint.** Every meaningful sentence is in the initial HTML. Verify:

```bash
curl -A "Mozilla/5.0" https://yoursite.com/projects | htmlq -t
```

**JSON-LD** on every page. Site-wide: `WebSite` + `Person`. Per page:

| Page type | Schema |
|---|---|
| `/articles/[slug]` | `BlogPosting` |
| `/projects/[slug]` | `CreativeWork` |
| `/network` | `ItemList` of `Person` |
| `/cv` | expanded `Person` |
| `/now` | `CreativeWork` with `dateModified` |

**Semantic HTML** — `<article>`, `<section>`, `<nav>`, `<time datetime>`.

**h-card microformat** on the homepage sidebar (second identity layer alongside JSON-LD).

**`rel="me"`** on external social links in the footer (verified-identity graph when reciprocal links exist on GitHub/LinkedIn/Bluesky).

**Permissive `robots.txt`** generated dynamically from `SITE.url`. Explicit allow for GPTBot, ClaudeBot, anthropic-ai, Google-Extended, PerplexityBot, CCBot. To opt out of AI training, flip the named user-agents to `Disallow: /` in `src/pages/robots.txt.ts`.

**Sitemap.** `/sitemap-index.xml`, auto-generated, excludes `/archive` and `/404`.

**RSS + JSON Feed.** Both at `/rss.xml` and `/feed.json`. Discoverable via `<link rel="alternate">` in `<head>`.

**`humans.txt`**, `theme-color` meta, OG + Twitter Card meta — all in.

## To do once site is live

| Task | Where |
|---|---|
| Real 1200×630 OG image | `public/og-default.png`, then set `DEFAULT_OG_IMAGE` in `src/config.ts` |
| Submit `/uses` | <https://uses.tech> |
| Submit `/now` | <https://nownownow.com> |
| PR to emmabostian/developer-portfolios | <https://github.com/emmabostian/developer-portfolios> |
| Reciprocal `rel="me"` | GitHub profile README, LinkedIn About, Bluesky bio |
| Flagship article | "What a Developer Portfolio Needs to Do in 2026" — your domain first, syndicate after |

## Syndication

Publish to your domain first. Cross-post to dev.to / Medium / Hashnode with `rel="canonical"` pointing back. Authority stays on your domain.

If a post is originally elsewhere, set `canonical: 'https://...'` in the frontmatter.

## Pre-launch checklist

```bash
# 1. Real bio in HTML
curl -A "Mozilla/5.0" https://yoursite.com/ | grep -oE '<p[^>]*>[^<]+</p>' | head

# 2. JSON-LD parses
curl -A "Mozilla/5.0" https://yoursite.com/cv \
  | grep -oE '<script type="application/ld\+json">[^<]+' \
  | python3 -c "import sys,json,re; [json.loads(re.sub(r'^<script[^>]+>','',l)) for l in sys.stdin]; print('OK')"

# 3. Sitemap correct URLs
curl https://yoursite.com/sitemap-index.xml | grep -oE '<loc>[^<]+</loc>' | head

# 4. RSS works
curl https://yoursite.com/rss.xml | head -20

# 5. robots.txt
curl https://yoursite.com/robots.txt
```

## The longer game

Months, not days. The pattern that compounds:

1. **Own your content.** Portfolio is canonical. Never let SaaS own your authoritative version.
2. **4–6 substantive articles** on specific topics. AI cites specificity.
3. **Submit to directories** once. Backlinks compound.
4. **Update `/now` quarterly.** Active sites get re-crawled, dead ones get demoted.
5. **Open-source the template repo.** Forkers' READMEs link back.

Expect AI-summary accuracy (ChatGPT, Claude, Perplexity) to converge with reality in 3–6 months of all five.
