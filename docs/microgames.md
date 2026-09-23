# Microgames — building and embedding small 2D games on the site

How a browser game lives in this repo. Digital Pet Place (`/games/digital-pet-place/`,
project page `/projects/digital-pet-place/`) is the reference build; its design
is `docs/digital-pet-place.md`.

The site's constraints drive everything here (see `/colophon`): a Node-free
build (Hugo + Tailwind standalone + Hugo's esbuild), static output on Cloudflare
Pages, `hx-boost` navigation that swaps `<body>` in place, a ~400 KB per-page
budget with TBT 0 ms / CLS 0 targets, and vendored, pinned dependencies rather
than CDN links.

## Stack

**Phaser 4 + TypeScript.** Phaser is vendored at
`static/vendor/phaser/<version>/phaser-arcade-physics.min.js` (the build without
Matter physics — ~1.27 MB raw, ~300 KB over the wire with brotli) and loaded as
a plain global by the standalone page. The game code is ordinary page TypeScript
under `assets/scripts/pages/<game>/`, compiled and fingerprinted by Hugo's
esbuild like every other page script. Phaser's type declarations are 8 MB of
generated `.d.ts`, so `make typecheck` fetches them into `bin/phaser-types/`
(gitignored, like `tsgo`) from the same pinned npm tarball; `tsconfig.json`
includes them from there. Bump `PHASER_VERSION` in the Makefile and the script
path in `layouts/games/single.html` together.

For a game that needs none of Phaser (no tweens, physics, input plumbing),
vanilla `<canvas>` + TypeScript is the lighter fallback — the agar-clone page is
one of those.

## Layout

```
content/games/_index.md                 section stub; render: never (no /games/ index)
content/games/<game>/index.md           the standalone page (noindex, sitemap disabled)
layouts/games/single.html               full document for it: no baseof, no site chrome
content/projects/<game>/index.md        the project page (tier 1, types: [game])
layouts/projects/<game>.html            header + {{ partial "game-embed.html" }}
layouts/partials/game-embed.html        poster + Play button (click-to-play)
assets/scripts/site/game-embed.ts       swaps the poster for a lazy iframe on click
assets/scripts/pages/<game>/main.ts     game entry + scenes/, core/, art/ …
assets/covers/<game>.webp               poster + card thumbnail source (build-time webp)
static/covers/<game>.webp               stable copy for og:image (see func/cover.html)
static/vendor/phaser/<version>/…        the runtime
```

The standalone page must work opened directly, not only in the iframe — it is
linked as "Open full page" from the project page.

A game built outside this repo (SpaceScape: Odin + raylib → emscripten) skips
the `content/games/` pair and lands as static files in `static/games/<game>/`
(committed like the other wasm pieces, so `make build` needs no Odin or emsdk;
`make spacescape` rebuilds them). Same `/games/<game>/` URL, same
`_headers` rule, same embed.

## Keyboard games and fullscreen

Space and the arrow keys page-scroll whatever document holds focus, so a
keyboard game must `preventDefault()` them in its own document and take focus
on load and on click (SpaceScape's `web/shell.html` does both). The embed
focuses the iframe once it loads. A project layout can add a
`<button data-game-fullscreen>` inside a `data-game-frame` wrapper around the
embed; `game-embed.ts` mounts the game if needed, fullscreens the embed box
(the UA `:fullscreen` rules size it, the game letterboxes inside) and focuses
the frame. Note ESC leaves browser fullscreen; a game that binds ESC can
`navigator.keyboard.lock(['Escape'])` while fullscreen where supported.

## Why an iframe, and what that required

The project page fetches nothing of the game until the visitor clicks Play: the
poster is stamped with `width`/`height` inside an `aspect-ratio` box (CLS 0), and
only then does the site bundle create `<iframe loading="lazy">`. A fresh
document per load means `hx-boost` body swaps can never leak game state or
double-initialise a loop, and the game's CSS never meets Tailwind's preflight.

Two repo-specific consequences:

- `static/_headers` sends `X-Frame-Options: DENY` on `/*`. A `/games/*` rule
  detaches that (`! X-Frame-Options`) and sets `SAMEORIGIN` instead. Without it
  the embed is a blank box in production while working fine on `make dev`.
- The standalone document is rendered by Hugo (a content page with its own
  layout) rather than dropped into `static/`, so its TypeScript goes through
  esbuild and fingerprinting. The section's `_index.md` has `build: render:
  never` so no `/games/` listing page exists, and the game page sets
  `sitemap: disable: true` — the project page is the one search engines see.

## Game page requirements

- Phaser `Scale.FIT` + `CENTER_BOTH` on a fixed logical size (DPP: 960×720) so
  the canvas fits the iframe box and the full-page viewport alike.
- Pause when unseen: Phaser stops the loop on `visibilitychange`; the entry
  script also sleeps it on window `blur` (clicking back out of the iframe) and
  wakes it on `focus`.
- Touch and pointer input both; hit areas sized for fingers.
- All assets local to the game; DPP has none at all — every texture is drawn
  procedurally at boot. Per-game budget beyond Phaser: under 200 KB.
- Storage is best-effort: `localStorage` when it works, in-memory otherwise, and
  the game must still play without it (DPP exports/imports plain JSON saves).
- Idle work is replayed, never ticked: DPP's mine stores `{startedAt, seed}` in
  the save and re-simulates deterministically on collection, capped at 12 h, so
  a closed tab costs nothing and a hand-edited save cannot hang the page.
- Fonts: the page declares the site's Inter `@font-face` and the entry script
  waits (briefly) for it so canvas text is right from the first frame.

## Definition of done

- Playable standalone at `/games/<game>/` and via the click-to-play embed with no CLS.
- Host page Lighthouse mobile performance unchanged before vs. after the embed.
- `make build` and `make typecheck` pass; no Node tooling introduced.
- Phaser vendored and pinned; no CDN references anywhere in the repo.
