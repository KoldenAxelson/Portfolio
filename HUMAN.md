# HUMAN.md

Personal punch list for Konrad. Forkers should read [README](./README.md)
and [docs/](./docs/README.md) instead — the project documentation is
canonical, this file is just my to-do list.

---

## Right now: ship the Neofolio demo

- [x] Enable GitHub Pages with Source = GitHub Actions
- [x] Demo loads styled at <https://koldenaxelson.github.io/neofolio/>
- [ ] Real OG image at `public/og-default.png` (currently placeholder)
- [ ] Tag a `v0.1.0` release so wf-site has a clean fork point

## Local cleanups (when you have a minute)

These are sandbox-side artifacts that snuck into earlier commits:

```bash
git rm -rf .astro-stale-* 2>/dev/null
git rm src/content/posts/ai-readable-html-cover.svg 2>/dev/null
git rm src/content/projects/example-event-pipeline-cover.svg 2>/dev/null
git rm src/content/projects/example-search-engine-cover.svg 2>/dev/null
rm -rf node_modules package-lock.json
npm install
make build
git add -A && git commit -m "chore: clean sandbox artifacts"
git push
```

## Before forking to wf-site

- [ ] Eyeball the demo end-to-end. Anything weird, fix in Neofolio first
      so wf-site inherits the fix.
- [ ] Read [docs/roadmap.md](./docs/roadmap.md) front to back. Update
      any "Planned" items that have moved.
- [ ] Confirm Lighthouse 90+/100/100/100 globally with `make lighthouse
      / /projects /articles /cv /uses /network`.

## wf-site fork (per docs/deploying.md)

- [ ] `gh repo create wf-site --template KoldenAxelson/neofolio --private --clone`
- [ ] In `.github/workflows/cloudflare-pages.yml`, replace `on:
      workflow_dispatch:` with the full `on:` block in the header comment
- [ ] Delete `.github/workflows/github-pages.yml` (wf-site doesn't need it)
- [ ] Cloudflare Pages: dashboard → Pages → connect repo → build command
      `npm run build`, output `dist`, Node 22
- [ ] DNS: point `wrightfunctions.com` at the CF Pages project
- [ ] `wrangler pages secret put RESEND_API_KEY --project-name=wf-site`
- [ ] `wrangler pages secret put CONTACT_TO_EMAIL --project-name=wf-site`
- [ ] Edit `src/config.ts` with real identity (this flows into JSON-LD,
      h-card, robots.txt, sitemap, feed.json, RSS — single source of truth)
- [ ] Edit `src/pages/cv.astro` with real history. **DoD framing —
      careful pass**, run past anyone necessary before publishing.
- [ ] Edit `src/pages/now.astro` with what you're actually focused on
- [ ] Edit `public/humans.txt` with real contact + thanks
- [ ] Cover images: drop into `public/covers/`, pre-convert raster
      sources to WebP/AVIF (`cwebp -q 80` or squoosh.app)
- [ ] Delete all `example-*` files in `src/content/` and `public/covers/`
- [ ] Inventory the external hard drive → Tier 1/2/3 project decisions
- [ ] Write the flagship article: "What a Developer Portfolio Needs to
      Do in 2026" — syndicate to dev.to with `rel=canonical` back
- [ ] (Old `/work` and `/writing` directories were already cleaned up;
      no action needed unless you want to add redirects from them)

## Inbound-link directory submissions (once site is live)

- [ ] Submit `/uses` to <https://uses.tech>
- [ ] Submit `/now` to <https://nownownow.com>
- [ ] PR yourself to <https://github.com/emmabostian/developer-portfolios>
- [ ] Update GitHub profile README — link to portfolio with `rel="me"`
- [ ] Update LinkedIn About section — link to portfolio with `rel="me"`
- [ ] Update Bluesky profile — `rel="me"` link

## Open questions to resolve before launch

- Single-page vs multi-page architecture (STRATEGY §Site Architecture
  flagged this — Brittany-style single-page vs the current multi-page)
- Tech tag vocabulary — pick the 8–12 final tags and stick to them
- DoD / classified framing for the CV
- Color palette / typography for wf-site — current neutral zinc+amber+Inter
  is fine for the template, but wf-site can lean more distinctive

## Reference

- [Roadmap](./docs/roadmap.md) — full done list + planned features
- [STRATEGY.md](../wf-site/STRATEGY.md) — original strategy doc in the
  wf-site folder
- [SEO_STRAT.md](../wf-site/SEO_STRAT.md) — SEO follow-up document
