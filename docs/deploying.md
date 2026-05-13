# Deploying

| Need | Use |
|---|---|
| Free, static-only | GitHub Pages |
| Workers/API, global edge, custom DNS | Cloudflare Pages |

Same `make build` output works for both.

## GitHub Pages

1. Push to GitHub.
2. **Settings → Pages → Source: GitHub Actions** (not "Deploy from a branch" — that runs Jekyll).

Subsequent pushes to `main` auto-deploy via `.github/workflows/github-pages.yml`.

### Base path

Auto-detected from repo name:

| Repo type | `BASE_PATH` |
|---|---|
| `USER.github.io` | `/` |
| `public/CNAME` present | `/` |
| Any other (project site) | `/REPO_NAME` |

Override with `Settings → Variables → BASE_PATH = /custom`.

### Custom domain

1. Create `public/CNAME` with your domain (one line).
2. Configure DNS at your registrar to GitHub Pages IPs (Settings → Pages shows current ones).

### Contact form on GitHub Pages

No server. The `mailto:` link in `SocialIcons.astro` and Network compose form work as-is. For an in-page POST form, plug in [Formspree](https://formspree.io) or [Web3Forms](https://web3forms.com).

## Cloudflare Pages

### Dashboard path (simplest)

1. Push to GitHub.
2. **Cloudflare Dashboard → Pages → Create → Connect to Git → pick repo**.
3. Build: `npm run build`, output: `dist`, env: `NODE_VERSION=22`.

### CI-controlled deploys

The workflow at `.github/workflows/cloudflare-pages.yml` ships disabled (`on: workflow_dispatch`). To enable:

```yaml
on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:
```

Required secrets:
- `CLOUDFLARE_API_TOKEN` (Pages:Edit + User Details:Read)
- `CLOUDFLARE_ACCOUNT_ID`
- Variable `CLOUDFLARE_PROJECT_NAME`

### Contact form on Cloudflare

`functions/api/contact.ts` forwards via Resend. Set secrets:

```bash
wrangler pages secret put RESEND_API_KEY --project-name=YOUR_PROJECT
wrangler pages secret put CONTACT_TO_EMAIL --project-name=YOUR_PROJECT
```

Currently the Network compose form opens `mailto:`. To POST instead, swap the `<a href="mailto:">` for a `fetch('/api/contact')` in `NetworkPanel.vue` (~5 lines).

## Local

```bash
make dev          # live-reload on :4321
make build        # production build to dist/
make preview      # serve dist/ locally
make lighthouse   # audit scores
```

Run `make build` before pushing if you changed any schema — schemas only validate at build time.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `pages-build-deployment` keeps running (and failing) | Pages source is "Deploy from a branch". Flip to "GitHub Actions". |
| CSS doesn't load, page is raw HTML | `BASE_PATH` wrong. Check workflow's `Determine base path` step output. Should be `/REPO` for project sites. |
| `npm ci` EBADPLATFORM on CI | Platform-pinned binary in `dependencies` (Sharp, Rollup). Delete from `package.json` + lockfile, regenerate. |
| Lighthouse Performance < 90 | See [performance.md](./performance.md). Usually external fonts or large images. |
| Lighthouse Accessibility < 100 | See [performance.md](./performance.md). Usually contrast or color-only links. |
