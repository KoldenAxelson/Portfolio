# Contributing

PRs welcome. Six ground rules:

1. **No JS above the fold.** Hero is HTML. Islands hydrate on interaction or visibility (except where the island IS the page content, e.g. NetworkPanel).
2. **No third-party render-blocking resources.** No Google Fonts CDN, no Font Awesome stylesheet. Self-host or skip.
3. **Static output stays static.** `make build` must produce a `dist/` that works on a dumb host. Cloudflare Functions are opt-in.
4. **Lighthouse targets aren't optional.** 90+/100/100/100. PRs that drop any score need a justification.
5. **Two audiences, one site.** Consider the AI scraper alongside the human visitor. See [docs/seo.md](./docs/seo.md).
6. **No platform-pinned binaries in `dependencies`.** Sharp / Rollup native binaries belong in `optionalDependencies` if anywhere. They break CI.

## Local dev

```bash
git clone https://github.com/KoldenAxelson/neofolio.git
cd neofolio
make setup
make dev
```

## Before opening a PR

```bash
make build       # confirm it builds
make lighthouse  # confirm no regressions
```

A11y-touching change → audit `/` and `/projects` for Accessibility = 100.
Schema-touching change → confirm example content still validates.

## Welcome

- `/cv.json` (JSON Resume) generator
- Keyboard-driven chip filter for `/projects`
- `scripts/cv-pdf.sh` Puppeteer print of `/cv`
- More pre-WebP demo covers
- i18n layer

## Will be declined

- Search bar (Cmd-F works)
- Comments (use webmentions)
- Floating contact buttons (Network + footer suffice)
- Per-page analytics
- Astro View Transitions (marginal benefit on a portfolio)
- Renaming "Articles" back to "Writing" (settled)

## Issue reports

Include: Node version, OS, `git log -1`, repro steps, expected vs actual. For Lighthouse regressions, include the report HTML or category screenshot.

## License

MIT. Contributions licensed under same.
