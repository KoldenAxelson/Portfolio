# HUMAN.md

Konrad's punch list. Forkers read [README](./README.md) and [docs/](./docs/README.md).

## Ship the Neofolio demo

- [x] Pages source = GitHub Actions
- [x] Demo loads styled at <https://koldenaxelson.github.io/neofolio/>
- [ ] Real OG image at `public/og-default.png`
- [ ] Tag `v0.1.0`

## Local cleanups

```bash
git rm -rf .astro-stale-* 2>/dev/null
rm -rf node_modules package-lock.json
npm install
make build
```

## Before wf-site fork

- [ ] Eyeball demo end-to-end
- [ ] Read [docs/roadmap.md](./docs/roadmap.md)
- [ ] Confirm `make lighthouse / /projects /articles /cv /uses /network` ≥ 90/100/100/100

## wf-site fork (see [docs/deploying.md](./docs/deploying.md))

- [ ] `gh repo create wf-site --template KoldenAxelson/neofolio --private --clone`
- [ ] In `.github/workflows/cloudflare-pages.yml`, swap `on: workflow_dispatch:` → full `on:` block in header comment
- [ ] Delete `.github/workflows/github-pages.yml`
- [ ] CF Pages: connect repo, build `npm run build`, output `dist`, Node 22
- [ ] DNS → `wrightfunctions.com`
- [ ] `wrangler pages secret put RESEND_API_KEY --project-name=wf-site`
- [ ] `wrangler pages secret put CONTACT_TO_EMAIL --project-name=wf-site`
- [ ] Edit `src/config.ts` (real identity — DoD framing careful, run past anyone needed)
- [ ] Edit `src/pages/cv.astro`, `src/pages/now.astro`, `public/humans.txt`
- [ ] Cover images: pre-WebP/AVIF (`cwebp -q 80` or squoosh.app), drop in `public/covers/`
- [ ] Delete `example-*` in `src/content/` and `public/covers/`
- [ ] External hard drive inventory → Tier 1/2/3
- [ ] Write flagship article: "What a Developer Portfolio Needs to Do in 2026"

## Directory submissions

- [ ] uses.tech → submit `/uses`
- [ ] nownownow.com → submit `/now`
- [ ] github.com/emmabostian/developer-portfolios → PR
- [ ] GitHub profile, LinkedIn About, Bluesky bio → `rel="me"` portfolio link

## Open questions

- Single-page vs multi-page (STRATEGY flagged)
- Tech tag vocabulary (8–12, lock in)
- DoD / classified framing
- Color/typography for wf-site (neutral fine for template, can lean distinctive)

## Reference

- [docs/roadmap.md](./docs/roadmap.md)
- STRATEGY.md + SEO_STRAT.md (in wf-site folder)
