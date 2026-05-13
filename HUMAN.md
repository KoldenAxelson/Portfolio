# HUMAN.md

Things a script can't do for you. Work top to bottom. Most steps take 1–5
minutes; nothing here is hard, but each one needs you sitting at a real
machine with real credentials.

If you're a forker reading this for the first time: run `bash setup.sh`
first, then come back here.

---

## 1. Identity — edit `src/config.ts`

This is the single source of truth for who you are on the site. Open it and
replace every `Your Name`, `example.com`, `you@example.com`, etc.

- `SITE.url` — your canonical URL, no trailing slash
- `SITE.author.name` / `bio` / `longBio` / `email` / `handle`
- `SITE.links.*` — drop any platform you don't use (delete the key)

Then edit `src/pages/cv.astro` — that's where your experience, education, and
skills live as plain TypeScript data.

---

## 2. Color & typography

Edit `src/styles/global.css`. There are five CSS variables at the top:

```css
--color-bg
--color-fg
--color-muted
--color-accent
--color-border
```

Light mode is the `:root` block, dark mode is the `prefers-color-scheme: dark`
block. Change the RGB triples and you're rebranded.

For typography, edit `tailwind.config.mjs` (`fontFamily.sans` / `fontFamily.mono`)
AND swap the font CDN in `src/layouts/BaseLayout.astro` (currently loading Inter
from rsms.me).

---

## 3. Real OG image

Replace `public/og-default.png.txt` with a real `public/og-default.png`. Target:
**1200 × 630 px, < 100 KB**. Tools: Figma, Canva, or generate one programmatically.
You can use the same image site-wide or override per page via the `image` prop
on `BaseLayout`.

---

## 4. Domain

Decide whether you're going:

- **GitHub Pages, user site** — `username.github.io`. Repo must be named
  `username.github.io`. `BASE_PATH` stays `/`.
- **GitHub Pages, project site** — `username.github.io/neofolio`. `BASE_PATH`
  must be `/neofolio` (or whatever your repo is called). Set it as a GitHub
  Actions variable: `Settings → Secrets and variables → Actions → Variables →
  New repository variable → BASE_PATH = /neofolio`.
- **Custom domain** — DNS at your registrar. `BASE_PATH` stays `/`. Add a
  `public/CNAME` file with your domain on a single line.
- **Cloudflare Pages** — `BASE_PATH` stays `/`. Custom domain configured in
  the Cloudflare dashboard.

Update `SITE.url` in `src/config.ts` to match.

---

## 5. Deploy — pick one

### Option A — GitHub Pages

1. Push the repo to GitHub.
2. In your repo: `Settings → Pages → Source → GitHub Actions`.
3. Push to `main`. The workflow at `.github/workflows/github-pages.yml`
   takes over.
4. First deploy takes ~2 min. Subsequent deploys ~45 s.

The contact form falls back to `mailto:` on GitHub Pages — there's no server.
The `<Footer>` Email link handles this for you. If you want a real form on
GitHub Pages, plug in [Formspree](https://formspree.io/) or
[Web3Forms](https://web3forms.com/) — both are free and don't need a backend.

### Option B — Cloudflare Pages

1. Push the repo to GitHub.
2. Cloudflare Dashboard → Pages → Create → Connect to Git → pick the repo.
3. Build command: `npm run build`. Build output: `dist`. Node version: `22`.
4. (Optional) For CI-controlled deploys, use the workflow at
   `.github/workflows/cloudflare-pages.yml`. Set GitHub Action secrets:
   - `CLOUDFLARE_API_TOKEN` (Pages:Edit + User Details:Read)
   - `CLOUDFLARE_ACCOUNT_ID`
   And variable `CLOUDFLARE_PROJECT_NAME`.

### Contact form (Cloudflare only)

The contact endpoint at `/api/contact` uses [Resend](https://resend.com) by
default. To wire it up:

```bash
wrangler pages secret put RESEND_API_KEY --project-name=neofolio
wrangler pages secret put CONTACT_TO_EMAIL --project-name=neofolio
```

Swap providers in `functions/api/contact.ts` if you prefer Postmark, SES, or
something else — the function is ~50 lines.

---

## 6. Pick your projects

The template ships with placeholder projects under `src/content/projects/`.
Delete every file starting with `example-` once your own content is in place.

For each real project:

- **Tier 1** (3–5 max): full MDX case study. Frontmatter `tier: 1`, `featured: true`
  if you want it on the homepage. Body should follow the
  problem / constraints / what I did / outcome / what I'd do differently shape.
- **Tier 2** (10–20): one frontmatter block, no body needed. `tier: 2`.
- **Tier 3** (archive): goes in `src/content/archive/` with a one-sentence
  post-mortem in the frontmatter.

Standardize your tag vocabulary BEFORE writing all of them. Pick the 8–12
tags you'll actually use (`backend`, `frontend`, `cli`, `data`, etc.) and
stick to them.

---

## 7. Run the Lighthouse sanity check

Once you have real content:

```bash
bash scripts/lighthouse.sh / /work /writing /cv
```

Targets: Performance ≥ 90, Accessibility 100, Best Practices 100, SEO 100.

Common failures and fixes:

- **Performance < 90** — usually images. Make sure they're WebP, have explicit
  `width`/`height`, and aren't bigger than they need to be on screen.
- **Accessibility < 100** — usually missing `alt` text or low contrast on
  custom colors.
- **SEO < 100** — usually a missing meta description or an unindexable page.
  `noindex` should only be set on `/404`.

---

## 8. Get other people linking to you

Open-sourcing the template is one half of this. The other half:

- Submit your portfolio to galleries: sitebuilderreport.com, Peerlist,
  dev.to portfolio showcase threads.
- Each public GitHub repo you own — give it a real README. Link back to your
  portfolio from each one. Every repo is a backlink.
- Write the flagship article ("What a Developer Portfolio Needs to Do in 2026")
  and syndicate it with `rel="canonical"` pointing here.

---

## 9. Custom CV PDF

There's no `scripts/cv-pdf.sh` yet — the simplest path is `Cmd-P → Save as PDF`
from `/cv`. Print styles are inherited from the base styles and look fine.

If you want a script: install `puppeteer` (`npm i -D puppeteer`) and write a
12-line headless print script. Optional and not blocking.

---

## 10. Tech tag vocabulary

STRATEGY.md flags this: standardize tag names BEFORE building out your
project library. Suggested starter set (override as needed):

```
backend  frontend  fullstack  cli  data  distributed-systems
developer-tools  reliability  self-hosted  team-tools
```

If you start using `dev-tools` and `developer-tools` interchangeably, your
filter UI will get embarrassing fast.
