# HUMAN.md

Punch list for Konrad. Not for forkers — they read README.

---

## Right now: ship the Neofolio demo

- [ ] **Enable GitHub Pages.** `Settings → Pages → Source: GitHub Actions`.
      https://github.com/KoldenAxelson/neofolio/settings/pages
- [ ] Push the base-path fix (commit `fix: base-path aware internal links`).
      The workflow now auto-detects `BASE_PATH=/neofolio` from the repo name —
      no manual variable needed. If you already set one, you can leave or delete it.
- [ ] Confirm demo loads styled at <https://koldenaxelson.github.io/neofolio/>.
- [ ] `rm -rf .nm-old-2-stale` if it's still in the folder.

## Before forking to wf-site

- [ ] Eyeball the demo. Does the layout actually feel right? Adjust before
      forking — every change after the fork has to be done twice.
- [ ] Decide if `og-default.png` placeholder is fine for the template demo
      or if you want a real one for Neofolio too.
- [ ] Tag a `v0.1.0` release on the repo so the fork has a clean baseline.

## wf-site fork

- [ ] Fork (or `gh repo create wf-site --template KoldenAxelson/neofolio --private --clone`).
- [ ] Re-enable the Cloudflare workflow: in `.github/workflows/cloudflare-pages.yml`,
      replace `on: workflow_dispatch:` with the full `on:` block in the header comment.
- [ ] Delete `.github/workflows/github-pages.yml` (wf-site doesn't need it).
- [ ] Cloudflare Pages connect: dashboard → Pages → connect repo → build
      command `npm run build`, output `dist`, Node 22.
- [ ] DNS: point `wrightfunctions.com` at the CF Pages project.
- [ ] `wrangler pages secret put RESEND_API_KEY --project-name=wf-site`
- [ ] `wrangler pages secret put CONTACT_TO_EMAIL --project-name=wf-site`
- [ ] Edit `src/config.ts` with real identity.
- [ ] Edit `src/pages/cv.astro` with real history. DoD framing — careful pass.
- [ ] Delete all `example-*` files in `src/content/`.
- [ ] Inventory the external hard drive → Tier 1 / 2 / 3 decisions.
- [ ] Write the flagship article ("What a Developer Portfolio Needs to Do in 2026").
- [ ] `bash scripts/lighthouse.sh / /work /writing /cv` — confirm 90/100/100/100.

## Open questions to resolve before launch

- Single-page vs multi-page (STRATEGY §Site Architecture flagged this).
- Tech tag vocabulary — pick the 8–12 and stick to them.
- Color palette / typography — current is teal+Inter, fine for the template,
  probably want something more distinctive for wf-site.
