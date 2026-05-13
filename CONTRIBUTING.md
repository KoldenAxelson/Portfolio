# Contributing to Neofolio

Thanks for considering a contribution. Neofolio is an opinionated template
— PRs that broaden it carefully are welcome; PRs that pull it toward a
kitchen sink are not.

## Ground rules

These are load-bearing. If a PR violates one, the review will ask for a
redesign rather than a merge.

1. **No JavaScript above the fold.** Hero is HTML. Stays HTML. Vue
   islands hydrate on interaction or visibility, never on load (unless
   the island IS the page content — see NetworkPanel).
2. **No third-party render-blocking resources.** No Google Fonts via CDN.
   No Font Awesome stylesheet. Self-host or skip.
3. **Static output stays static.** `make build` must produce a `dist/`
   that works on a dumb static host. Cloudflare Functions in `/functions`
   are opt-in.
4. **Lighthouse targets aren't optional.** 90+/100/100/100. PRs that
   drop any score need a justification or a fix.
5. **Two audiences, one site.** Every change should consider both the
   human visitor and the AI scraper. See [docs/seo.md](./docs/seo.md).
6. **No platform-pinned binaries in `dependencies`.** Sharp, Rollup,
   esbuild platform binaries belong in `optionalDependencies` if anywhere
   at all. They break CI.

## Local dev

```bash
git clone https://github.com/KoldenAxelson/neofolio.git
cd neofolio
make setup
make dev
```

Run on port 4321. Hot-reload works for content and components.

## Before opening a PR

```bash
make build       # confirm it builds
make lighthouse  # confirm it doesn't regress
```

If your change touches accessibility (contrast, link styling, ARIA, touch
targets), audit at least `/` and `/projects` for Accessibility = 100.

If your change touches content schemas (`src/content/config.ts`), make
sure the example content in `src/content/` still validates.

If your change touches the build pipeline, verify on both Astro defaults
and the auto-detected `BASE_PATH=/repo` path.

## Reporting issues

Include:

- Node version (`node --version`)
- OS
- `git log -1` (commit you're on)
- Steps to reproduce
- What you expected vs what happened

For Lighthouse regressions, include the Lighthouse report HTML or a
screenshot of the categories panel.

## Areas where contributions are especially welcome

- **`/cv.json`** — JSON Resume format generator. Highest-value AI-
  readability addition not yet shipped. See [roadmap](./docs/roadmap.md).
- **`/projects` filter UX** — current ProjectFilter is functional but
  not keyboard-driven. A real chip-pattern filter would be welcome.
- **CV PDF export** — `scripts/cv-pdf.sh` that uses Puppeteer to print
  `/cv` to a downloadable PDF.
- **More demo cover images** — pre-converted WebP/AVIF in `public/covers/`
  for the example projects + articles.
- **Translations** — the template strings live in components and pages;
  a small i18n layer would be a real contribution.

## Areas where contributions will probably be declined

- **A search bar.** Cmd-F works for static content.
- **Comment systems.** Webmentions yes, comments no.
- **Floating contact buttons.** The Network page and footer email link
  are enough.
- **Per-page analytics.** Add to your fork; not the template.
- **Page transitions (Astro View Transitions).** Adds complexity for
  marginal benefit on a portfolio.
- **A "blog" → "writing" → "articles" rename war.** Already done.
  Articles it is.

## License

By contributing, you agree your contribution is licensed under the MIT
License (see [LICENSE](./LICENSE)).
