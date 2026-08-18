// Ancestry globe — /misc/genes. Earth on a canvas, each subunit shaded by its
// share of the composition, idling with a slow spin and stopping under a pointer.
//
// Everything that makes it a globe — the orthographic projection, the limb
// clipping, the spin and flick, the hit test — lives in ./globe and is shared
// with /misc/dagea. What is left here is the part that is about ancestry:
// which regions are painted, how hard, and what the readout says.
//
// The percentages arrive as JSON in the markup rather than being walked out of
// data/genes.yaml a second time in TypeScript — layouts/shortcodes/ancestry-map.html
// already resolved which node owns which subunit for the static map, and doing
// that twice invites the two from drifting.
//
// INTENSITY is sqrt-scaled, not linear, for the same reason the flat map's is:
// England at 31.5% is 26x Switzerland at 0.5%, and on a linear ramp everything
// under about 5% collapses into the same barely-there wash.

import { createGlobe, litRegion, plainLand } from './globe';
import type { GlobeHandle, GlobeUnit, FrameState, UnitStyle } from './globe';

interface PaintEntry {
  pct: number;
  name: string;
}

let handle: GlobeHandle | null = null;

export function initAncestryGlobe(): void {
  // Idempotent across hx-boost swaps: kill the previous loop and its listeners
  // before looking for a new host, or two rAF loops end up fighting over one
  // canvas and the spin runs at double speed.
  handle?.destroy();
  handle = null;

  const host = document.querySelector<HTMLElement>('[data-globe]');
  if (!host) return;
  const canvas = host.querySelector<HTMLCanvasElement>('canvas');
  const readout = host.querySelector<HTMLElement>('[data-globe-readout]');
  const fallback = document.querySelector<HTMLElement>('[data-globe-fallback]');
  const src = host.dataset.globe;
  if (!canvas || !src) return;

  const paintEl = host.querySelector<HTMLScriptElement>('[data-globe-paint]');
  let paint: Record<string, PaintEntry> = {};
  try {
    paint = JSON.parse(paintEl?.textContent || '{}') as Record<string, PaintEntry>;
  } catch {
    paint = {};
  }
  let maxPct = 0;
  for (const k of Object.keys(paint)) maxPct = Math.max(maxPct, paint[k].pct);
  if (maxPct <= 0) maxPct = 1;

  handle = createGlobe({
    host,
    canvas,
    src,
    fallback,
    start: { lon: 8, lat: 42 },   // opens on Europe, where the composition is
    selectable: (code) => Boolean(paint[code]),
    styleFor(code: string, _unit: GlobeUnit, s: FrameState): UnitStyle {
      const entry = paint[code];
      if (!entry) return plainLand(s.token);
      const share = 0.25 + 0.75 * Math.sqrt(entry.pct / maxPct);
      return litRegion(s.token, s.hovered === code ? 1 : share);
    },
    onHover(code) {
      if (!readout) return;
      const e = code ? paint[code] : null;
      readout.textContent = e ? `${e.name} · ${e.pct.toFixed(1)}%` : '';
    },
  });
}
