# Deploying

Two deploy targets ship with Neofolio: GitHub Pages and Cloudflare Pages.
Both produce the same static `dist/` from `make build`. Pick based on
whether you need server-side anything.

| Need | Pick |
|---|---|
| Free, simple, static-only | **GitHub Pages** |
| Free, static + Workers for forms/API + global edge | **Cloudflare Pages** |
| Custom domain, want DNS + CDN under one roof | **Cloudflare Pages** |
| Already on Cloudflare for DNS | **Cloudflare Pages** |

## GitHub Pages

### One-time setup

1. Push the repo to GitHub.
2. **Settings → Pages → Source: GitHub Actions**. (Not "Deploy from a
   branch" — that injects a Jekyll workflow that doesn't understand Astro.)

That's it. Subsequent pushes to `main` trigger
`.github/workflows/github-pages.yml` automatically.

### Base path

GitHub Pages serves project sites at `https://USER.github.io/REPO`, not at
the domain root. Asset URLs need to know the `/REPO` prefix.

The workflow auto-detects this from the repo name:

- **User/org site** (`USER.github.io` repo) → `BASE_PATH=/`
- **Project site** (any other repo name) → `BASE_PATH=/REPO`
- **Custom domain** (`public/CNAME` exists) → `BASE_PATH=/`

Override with a repo variable if you need something custom:
`Settings → Secrets and variables → Actions → Variables → Add` →
`BASE_PATH = /your-path`.

### Custom domain on GitHub Pages

1. Create `public/CNAME` containing your domain (one line, no scheme):
   ```
   wrightfunctions.com
   ```
2. Configure DNS at your registrar: `ALIAS / ANAME / A` records pointing
   at GitHub Pages IPs (Settings → Pages shows the current ones).
3. The workflow auto-sets `BASE_PATH=/` when it sees `public/CNAME`.

### Contact form on GitHub Pages

There's no server. The mailto: fallback in `<Footer>` and the Network
page's compose form work fine — they open the visitor's mail client with
the message pre-filled.

If you want an in-page form that actually POSTs, plug in:

- [Formspree](https://formspree.io) — free, no backend
- [Web3Forms](https://web3forms.com) — free, no backend
- Cloudflare Workers via the Cloudflare Pages path below

---

## Cloudflare Pages

### One-time setup (dashboard path — simplest)

1. Push the repo to GitHub.
2. **Cloudflare Dashboard → Pages → Create → Connect to Git → pick the repo**.
3. Build settings:
   - Framework preset: **Astro** (or "None")
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variables: `NODE_VERSION=22`
4. Save. Subsequent pushes to `main` deploy automatically.

### CI-controlled deploys (optional)

If you want to gate deploys on linting or tests, use the workflow stub at
`.github/workflows/cloudflare-pages.yml`. It ships **disabled by default**
(`on: workflow_dispatch`) so it doesn't fail-spam Neofolio's Actions tab.
Re-enable by replacing the `on:` block with:

```yaml
on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:
```

Then add three GitHub Action secrets:

- `CLOUDFLARE_API_TOKEN` (Pages:Edit + User Details:Read)
- `CLOUDFLARE_ACCOUNT_ID`
- variable `CLOUDFLARE_PROJECT_NAME` (the slug your project uses)

### Custom domain on Cloudflare Pages

Cloudflare Pages → your project → Custom domains → Set up a custom domain.
If your domain is already on Cloudflare DNS, it's a one-click setup.

### Contact form on Cloudflare Pages

`functions/api/contact.ts` is a Cloudflare Pages Function that:

1. Validates the form payload (name, email, message, honeypot)
2. Forwards via [Resend](https://resend.com) to your inbox

Set two secrets:

```bash
wrangler pages secret put RESEND_API_KEY --project-name=YOUR_PROJECT
wrangler pages secret put CONTACT_TO_EMAIL --project-name=YOUR_PROJECT
```

Swap providers (Postmark, SES, Loops) by editing the `fetch` call —
about 5 lines.

Currently the Network compose form opens `mailto:` rather than POSTing.
To switch to API-backed:

```ts
// In NetworkPanel.vue, replace the `mailto` link with:
async function submit() {
  const res = await fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: fromName.value, email: fromEmail.value, message: message.value }),
  });
  if (res.ok) { /* show success */ }
}
```

---

## Switching deploy targets

The default Neofolio repo demo is on GitHub Pages. The wf-site fork will
be on Cloudflare Pages. To swap:

1. Re-enable `.github/workflows/cloudflare-pages.yml` (uncomment the `on:`
   block).
2. Delete `.github/workflows/github-pages.yml` if you don't want both.
3. Configure Cloudflare per the section above.
4. If you had a `public/CNAME` for GitHub Pages, decide whether to keep
   it (the workflow uses its presence to set `BASE_PATH=/`).

---

## Local dev vs production

| Command | Purpose |
|---|---|
| `make dev` | Live-reload dev server on `:4321` |
| `make build` | Production build to `dist/` |
| `make preview` | Serve `dist/` locally for a final eyeball |
| `make lighthouse` | Audit the built site (Perf/A11y/BP/SEO) |

Always run `make build` before pushing if you've changed anything content-
schema-related. The build is the only place schemas get validated.

---

## Troubleshooting

### "Pages build and deployment" workflow keeps failing

You're on the default GitHub Pages source ("Deploy from a branch"). Flip
to **GitHub Actions** in Settings → Pages. The Jekyll workflow disappears
when you do.

### CSS doesn't load — page is raw HTML

`BASE_PATH` is wrong. Check the workflow run logs for the
`Determine base path` step output. If your repo is a project site
(`koldenaxelson/neofolio`), the path should be `/neofolio`. If you have a
custom domain, the path should be `/` (set `public/CNAME` or override the
repo variable).

### `npm ci` fails on CI with EBADPLATFORM

You've got a platform-pinned binary in `dependencies` (e.g.
`@img/sharp-linux-arm64` or `@rollup/rollup-linux-x64-gnu`). Remove it
from `package.json` and delete `package-lock.json`, then `npm install`
locally to regenerate. Platform binaries should be `optionalDependencies`,
never required.

### Lighthouse Performance below 90

See [performance.md](./performance.md). The usual culprits are external
font requests and large images.

### Lighthouse Accessibility below 100

See [performance.md](./performance.md). The usual culprits are insufficient
contrast and links that rely on color alone.
