# Contributing to Neofolio

Thanks for considering a contribution. Neofolio is a template — its
contributors include both maintainers and forkers who've improved it for
themselves and want to send fixes upstream.

## Ground rules

1. **Keep it template-shaped.** This is a starting point, not a kitchen sink.
   If your change adds a feature that 80% of forkers will turn off, it
   probably shouldn't ship in core.
2. **Preserve the Lighthouse targets.** PRs that drop Performance below 90 or
   any of the other three below 100 will get a redesign request, not a merge.
3. **No JavaScript above the fold.** The hero is HTML. Stays HTML.
4. **Static output stays static.** Cloudflare Functions in `/functions` are
   opt-in. The core build must still produce a `dist/` that works on a dumb
   static host.

## Local dev

```bash
git clone https://github.com/your-username/neofolio.git
cd neofolio
bash setup.sh
npm run dev
```

## Before opening a PR

```bash
npm run check          # typecheck + Astro diagnostics
npm run format         # Prettier
npm run build          # confirm the build succeeds
bash scripts/lighthouse.sh / /work /writing /cv  # confirm scores
```

## Reporting issues

Include:
- Node version (`node --version`)
- OS
- Steps to reproduce
- What you expected vs. what happened

## License

By contributing, you agree your contribution is licensed under the MIT
License (see [LICENSE](./LICENSE)).
