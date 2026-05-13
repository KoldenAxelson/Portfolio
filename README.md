# Neofolio

> An opinionated, AI-readable portfolio template for developers in the AI age.
> Astro + Vue islands + Tailwind + MDX. Ships to GitHub Pages or Cloudflare
> Pages with one push.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Most portfolio templates are built for one audience: humans who land on your
site. Neofolio is built for two — humans, and the AI systems that will
increasingly summarize you to those humans before they ever click through.

## What it gives you

- **AI-readable by architecture.** Every meaningful sentence is in static HTML,
  not rendered by JS. Schema.org JSON-LD on every page (`Person`, `WebSite`,
  `BlogPosting`, `CreativeWork`). Semantic elements throughout.
- **Fast by default.** Astro static-first build. No JavaScript above the fold.
  Vue islands hydrate on interaction only. Targets: Lighthouse 90 / 100 / 100 / 100.
- **Forkable in minutes.** All your identity lives in one file (`src/config.ts`).
  Content lives in MDX you can edit anywhere. Theme is five CSS variables.
- **Deploy anywhere.** Ships with GitHub Pages AND Cloudflare Pages workflows.
  Pick one (or both).
- **Full project catalogue.** Three-tier structure: Featured case studies,
  Listed catalogue, Archive with honest post-mortems.

## Quickstart

```bash
git clone https://github.com/your-username/neofolio.git my-portfolio
cd my-portfolio
bash setup.sh
npm run dev
```

Open <http://localhost:4321>. You'll see a working demo populated with
example content.

Then read [HUMAN.md](./HUMAN.md) for the steps a script can't do for you
(edit your name, pick a domain, hook up deploys).

## Layout

```
/                   Hero + About (pure HTML, no JS on initial paint)
/work               Filterable project catalogue (Vue island, hydrates on scroll)
/work/[slug]        Tier-1 case studies (MDX)
/writing            Blog index (canonical home for all articles)
/writing/[slug]     Individual posts (MDX)
/uses               Stack, tools, hardware
/archive            Abandoned and post-mortem projects
/cv                 Structured HTML résumé
/api/contact        Cloudflare Worker (contact form — CF Pages only)
```

## Stack

| Layer       | Tool                | Why                                            |
| ----------- | ------------------- | ---------------------------------------------- |
| Framework   | Astro 5             | Static-first, partial hydration, great Lighthouse |
| Islands     | Vue 3.5             | For the few interactive components             |
| Styling     | Tailwind 3          | Utility-first, purges unused CSS               |
| Content     | MDX                 | Git-native, indexable, your canonical source   |
| Deploy A    | GitHub Pages        | Free, simple, static                           |
| Deploy B    | Cloudflare Pages    | First-class Astro adapter, Workers for API     |
| Tooling     | TypeScript, Prettier | Standard stuff                                |

## Deploy

Both paths are ready to go. Pick one.

### GitHub Pages

Push to `main`. `.github/workflows/github-pages.yml` handles the rest. For
project sites (`user.github.io/repo`), set the `BASE_PATH` repository
variable to `/repo`.

### Cloudflare Pages

Either connect the repo in the Cloudflare dashboard (build command:
`npm run build`, output: `dist`), or use the workflow at
`.github/workflows/cloudflare-pages.yml` for CI-controlled deploys.
The contact form at `/api/contact` only works on Cloudflare — on GitHub
Pages, the template falls back to a `mailto:` link.

Full deploy walkthrough in [HUMAN.md](./HUMAN.md#5-deploy--pick-one).

## Sanity check

```bash
npm run lighthouse              # audit the root
npm run lighthouse /work /cv    # audit specific paths
```

Reports land in `.lighthouse/`. This is a manual tool — not a CI gate — so
you can hammer the targets when you actually care about them and skip when
you don't.

## Customization

| Want to change           | Edit                                          |
| ------------------------ | --------------------------------------------- |
| Name, bio, links         | `src/config.ts`                               |
| Colors                   | `src/styles/global.css` (5 CSS variables)     |
| Fonts                    | `tailwind.config.mjs` + `src/layouts/BaseLayout.astro` |
| Experience / CV          | `src/pages/cv.astro`                          |
| Tools & hardware         | `src/pages/uses.astro`                        |
| Projects                 | Add `.mdx` to `src/content/projects/`         |
| Blog posts               | Add `.mdx` to `src/content/posts/`            |
| Archive entries          | Add `.md` to `src/content/archive/`           |
| Nav items                | `src/config.ts` → `SITE.nav`                  |

## Philosophy

Read [STRATEGY.md](./STRATEGY.md) for the underlying thesis on what a
developer portfolio needs to do in 2026. (Coming soon — currently lives in
the reference implementation site, [wrightfunctions.com](https://wrightfunctions.com).)

## Contributing

PRs welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT. Attribution appreciated, not required.
