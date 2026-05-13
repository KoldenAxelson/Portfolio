# Customization

Make Neofolio yours. Almost everything user-facing comes out of one of
three files.

## The three files that matter

| File | Controls |
|---|---|
| `src/config.ts` | Name, role, bio, social links, nav items, per-section bio messages |
| `src/styles/global.css` | Five color CSS variables (light + dark) |
| `tailwind.config.mjs` | Font family, custom utilities |

## Identity

Edit `src/config.ts`. Everything below is driven from this object:

```ts
export const SITE = {
  url: 'https://example.com',          // Your canonical domain, no trailing slash
  title: 'Neofolio',                   // <title>, OG site name, JSON-LD WebSite name
  description: '...',                  // Meta description, OG, JSON-LD

  author: {
    name: 'Your Name',
    handle: '@yourhandle',
    role: 'Software Engineer',
    location: 'City, Country',
    email: 'you@example.com',
    bio: '...',                        // Short bio for the sidebar
    longBio: '...',                    // Long bio for /cv and JSON-LD Person.description
  },

  bioMessages: {                       // Typewriter messages keyed by section ID
    about: ['...'],
    experience: ['...'],
    projects: ['...'],
    articles: ['...'],
  },

  links: {
    github: 'https://...',
    linkedin: 'https://...',
    twitter: '',                       // Empty string = don't render
    // ...
  },

  nav: [
    { label: 'Projects', href: '/projects', icon: 'folder' as const },
    // ...
  ],

  locale: 'en-US',                     // BCP-47 tag
};
```

This flows into:

- `<title>`, `<meta description>` on every page
- OpenGraph and Twitter Card meta
- JSON-LD `Person` and `WebSite` schemas
- The h-card microformat on the homepage sidebar
- Footer copyright
- Social icon row (only icons for non-empty link values render)
- Top nav (label, route, icon)
- Sidebar typewriter messages (one set per homepage section)

## Colors

Five CSS variables in `src/styles/global.css` drive the entire palette.
Edit the `:root` block for light mode, the `prefers-color-scheme: dark`
block for dark mode.

```css
:root {
  --color-bg: 250 250 247;       /* warm paper white */
  --color-fg: 24 24 27;          /* zinc-900 */
  --color-muted: 82 82 91;       /* zinc-600 */
  --color-accent: 154 52 18;     /* amber-800 */
  --color-border: 228 228 231;   /* zinc-200 */
}
```

Values are `R G B` (no `rgb()`, no commas) — Tailwind treats them as
channels so `rgb(var(--color-fg) / 0.5)` works for alpha.

**Contrast minimums to keep Lighthouse Accessibility happy:**

- `muted` against `bg`: ≥4.5:1 (AA normal text)
- `accent` against `bg`: ≥4.5:1 if you use the accent as link text
- `fg` against `bg`: ≥7:1 (AAA — typical zinc-900/zinc-100 is fine)

Use the WebAIM Contrast Checker if you change colors.

## Typography

Two places:

1. **`tailwind.config.mjs`** — `fontFamily.sans` and `fontFamily.mono`
   define the CSS font stacks.
2. **`src/styles/global.css`** — `@font-face` declarations load the actual
   font files from `/public/fonts/`.

To swap Inter for another font:

1. Drop the WOFF2 file(s) in `public/fonts/`.
2. Update the `@font-face` `src:` URL in `global.css`.
3. Update `fontFamily.sans` in `tailwind.config.mjs`.
4. Update the preload `<link>` in `src/layouts/BaseLayout.astro`.

**Why self-hosted?** External font stylesheets (rsms.me, Google Fonts) add
a render-blocking third-party request to the critical path. Self-hosting
eliminates that and gives the browser same-origin priority. See
[performance.md](./performance.md).

## Nav

Edit `SITE.nav` in `src/config.ts`. Each item:

```ts
{ label: 'Projects', href: '/projects', icon: 'folder' as const }
```

**Available icon keys:** `folder`, `newspaper`, `globe`, `desktop`,
`briefcase`. The icon map lives in `src/components/TopNav.astro` — add new
keys there by pasting Heroicons outline-style SVG paths into the `icons`
object.

`label` shows on hover (desktop) or inline (mobile dropdown).
`href` can mismatch its label — e.g. nav says "Projects" but route is
`/projects` (in our case they match; they don't have to).

## Sidebar typewriter

The sidebar bio paragraph is replaced (post-hydration, desktop only) with
typed-out messages from `SITE.bioMessages`. One array per homepage
section ID:

```ts
bioMessages: {
  about: ['msg1', 'msg2', 'msg3'],
  experience: ['msg1', 'msg2'],
  projects: ['msg1'],
  articles: ['msg1', 'msg2'],
}
```

When the user scrolls into the About section, a random message from
`bioMessages.about` is typed into the sidebar. Section change triggers
backspace + retype.

Mobile (`<lg`) skips the typewriter entirely — the static `SITE.author.bio`
shows instead.

Section IDs are defined in `src/pages/index.astro`. Adding a new homepage
section means: add the `<section id="...">` AND a matching entry in the
sidebar's `sections` array AND a `bioMessages` key.

## Layout variations

Each page picks its own layout via `BaseLayout` props:

```astro
<BaseLayout split sections={[...]}>   <!-- Homepage: sticky sidebar -->
<BaseLayout wide>                      <!-- Network: wider container -->
<BaseLayout>                           <!-- Default: max-w-3xl centered -->
```

For most sub-pages, the default is right. Only `/network` needs `wide`.
Only `/` uses `split`.

## Favicon

Replace `public/favicon.svg`. The current one is an amber tile with the
letter "N" — appropriate for the template, not for your fork.

For browser support, you can also add a fallback `public/favicon.ico` and
reference it from `BaseLayout.astro`.

## OG image

Replace `public/og-default.png.txt` with a real PNG at `public/og-default.png`.
Target: 1200×630, ≤100 KB. Used as the default OpenGraph and Twitter Card
image for every page. Pages can override via the `image` prop on
`BaseLayout`.

## Footer credit

The footer says "Powered by Neofolio" with a link back to the template
repo. Attribution is appreciated but not required (MIT). To remove or
change it, edit `src/components/Footer.astro`.

## What NOT to customize lightly

These are load-bearing:

- The Tailwind theme references CSS variables — keep that indirection
- The h-card classes in `SideBar.astro` — AI scrapers parse them
- `aria-label` attributes on icon-only buttons — accessibility
- `aria-current="page"` on active nav — accessibility
- `loading="lazy"` and explicit `width`/`height` on `<img>` — CLS prevention
- The base-path-aware `url()` helper — GitHub Pages project sites
- JSON-LD schemas in `SEO.astro` and individual pages — SEO + AI

Change them only if you understand what they're for.
