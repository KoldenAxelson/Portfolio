// @ts-check
import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

import { SITE } from './src/config';

// ---------------------------------------------------------------------------
// Neofolio — Astro config
//
// This config is deploy-target-agnostic. The same `npm run build` produces a
// static `dist/` that works on GitHub Pages, Cloudflare Pages, Netlify, S3 +
// CloudFront, or anywhere else that serves static files.
//
// For GitHub Pages project sites (repo.github.io/neofolio), set BASE_PATH
// in your environment or in `.env`. For a custom domain or Cloudflare Pages,
// leave BASE_PATH unset.
// ---------------------------------------------------------------------------

const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  site: SITE.url,
  base,
  trailingSlash: 'ignore',
  output: 'static',
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  integrations: [
    vue({
      // Vue is for islands only. No SSR; Astro handles routing/static.
      jsx: false,
    }),
    mdx(),
    tailwind({
      applyBaseStyles: false, // we manage base styles in src/styles/global.css
    }),
    sitemap({
      // Exclude pages marked noindex from the sitemap so search engines
      // don't get conflicting signals (sitemap says "index me" while the
      // page says "noindex"). /archive is a redirect stub; /404 isn't
      // meant for indexing either.
      filter: (page) => !/\/(archive|404)\/?$/.test(page),
    }),
  ],
});
