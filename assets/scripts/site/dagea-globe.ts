// Dagea globe — /misc/dagea. A hand-drawn world on a canvas, with its regions,
// duchies and islands selectable from the globe or from the chips beneath it.
//
// Everything that makes it a globe lives in ./globe and is shared with
// /misc/genes. What is here is the part that is about Dagea: one flat land
// colour, one highlight, and the wiring between the sphere, the chip row, and
// the description panel.
//
// THREE SOURCES OF HIGHLIGHT, one look. The engine tracks what the pointer is
// over on the canvas; this module separately tracks what the pointer is over in
// the chip row, and what is selected. They are deliberately not merged into the
// engine — the chips are page furniture the engine has no business knowing about
// — so `styleFor` takes the union, and the render loop redraws every frame
// anyway so a change to any of them is picked up without being announced.
//
// THE PANEL IS AN ENHANCEMENT. Every named place ships as a static article in
// the markup; this hides that gazetteer and writes one place at a time into the
// panel instead. With the script off, the page is nineteen readable entries.

import { createGlobe, litRegion, plainLand } from './globe';
import type {
  FrameState, GlobeHandle, GlobeLine, GlobeUnit, LineStyle, UnitStyle,
} from './globe';

interface Place {
  name: string;
  capital: string;
  export: string;
  blurb: string;
}

let handle: GlobeHandle | null = null;
let detach: (() => void) | null = null;

export function initDageaGlobe(): void {
  // Idempotent across hx-boost swaps: kill the previous loop and its listeners
  // before looking for a new host, or two rAF loops fight over one canvas and
  // the spin runs at double speed.
  handle?.destroy();
  handle = null;
  detach?.();
  detach = null;

  const root = document.querySelector<HTMLElement>('[data-dagea]');
  if (!root) return;

  const host = root.querySelector<HTMLElement>('[data-dagea-globe]');
  const canvas = host?.querySelector<HTMLCanvasElement>('canvas');
  const readout = root.querySelector<HTMLElement>('[data-dagea-readout]');
  const fallback = root.querySelector<HTMLElement>('[data-dagea-fallback]');
  const panel = root.querySelector<HTMLElement>('[data-dagea-panel]');
  const gazetteer = root.querySelector<HTMLElement>('[data-dagea-gazetteer]');
  const titleEl = root.querySelector<HTMLElement>('[data-dagea-title]');
  const factsEl = root.querySelector<HTMLElement>('[data-dagea-facts]');
  const blurbEl = root.querySelector<HTMLElement>('[data-dagea-blurb]');
  const src = root.dataset.dageaSrc;
  if (!host || !canvas || !src) return;

  const dataEl = root.querySelector<HTMLScriptElement>('[data-dagea-places]');
  let places: Record<string, Place> = {};
  try {
    places = JSON.parse(dataEl?.textContent || '{}') as Record<string, Place>;
  } catch {
    places = {};
  }

  const chips = Array.from(
    root.querySelectorAll<HTMLButtonElement>('[data-dagea-chip]'),
  );

  let listHover: string | null = null;
  let selected: string | null = null;
  // Which region's internals are showing. Only ever a region that HAS parts —
  // marking a lone island "open" and then drawing open regions via their
  // children made every archipelago vanish the moment it was clicked.
  let openRegion: string | null = null;
  let hasParts: Record<string, boolean> = {};
  let parentOf: Record<string, string | undefined> = {};

  // The static gazetteer is the no-script version of the panel. Swap them the
  // moment the script runs, not when the globe loads — the panel works whether
  // or not the geometry ever arrives.
  if (panel && gazetteer) {
    gazetteer.hidden = true;
    panel.hidden = false;
  }

  function describe(code: string | null): void {
    const p = code ? places[code] : null;
    if (titleEl) titleEl.textContent = p ? p.name : 'Dagea';
    if (blurbEl) {
      blurbEl.textContent = p
        ? p.blurb
        : 'Six regions and forty landmasses. Pick one on the globe, or from the row above.';
    }
    if (!factsEl) return;
    factsEl.textContent = '';
    const rows: [string, string][] = [];
    if (p?.capital) rows.push(['Capital', p.capital]);
    if (p?.export) rows.push(['Main export', p.export]);
    for (const [label, value] of rows) {
      const dt = document.createElement('dt');
      dt.className = 'font-mono text-xs uppercase tracking-wide text-muted';
      dt.textContent = label;
      const dd = document.createElement('dd');
      dd.className = 'm-0 text-sm text-fg';
      dd.textContent = value;
      factsEl.append(dt, dd);
    }
  }

  function say(code: string | null): void {
    if (!readout) return;
    const place = code ? places[code] : null;
    if (!code || !place) { readout.textContent = ''; return; }
    const parent = parentOf[code];
    const within = parent ? places[parent]?.name : null;
    readout.textContent = within ? `${place.name} · in ${within}` : place.name;
  }

  /** Chips for the level we are on: the six regions, or one region's parts. */
  function paintChips(): void {
    const level = openRegion ?? '_';
    for (const chip of chips) {
      const code = chip.dataset.dageaChip || '';
      const chipLevel = chip.dataset.dageaLevel || '_';
      // The "All of Dagea" chip is the way back up and is always available.
      chip.hidden = !(chipLevel === level || code === '');
      chip.setAttribute('aria-pressed', String(code === (selected ?? '')));
    }
  }

  handle = createGlobe({
    host,
    canvas,
    src,
    fallback,
    start: { lon: 0, lat: 22 },
    zoomOnSelect: 1.85,
    selectable: (code, unit) => {
      if (unit.kind === 'lake') return false;
      if (unit.parent) return unit.parent === openRegion;
      return Boolean(places[code]);
    },
    styleFor(code: string, unit: GlobeUnit, s: FrameState): UnitStyle | null {
      // Inland water, painted in the ocean's colour over whatever it sits in, so
      // a lake reads as a hole in the land and not as a very small country.
      if (unit.kind === 'lake') {
        const water = `rgb(${s.token('--c-border')} / 0.55)`;
        return { fill: water, stroke: water, lineWidth: 0.6, layer: 3.2 };
      }

      const hot = code === s.hovered || code === listHover;

      if (unit.parent) {
        // A part exists on the globe only while its region is open. Drawing all
        // fifty at once turns a world map into an atlas index; the point of the
        // drill-down is that the detail arrives when it is asked for.
        if (unit.parent !== openRegion) return null;
        // A TONAL hairline, not a gap of page colour. /misc/genes strokes its
        // countries in --c-bg, which works there because the fills are bright
        // accent on a warm-white page. Here the fills are grey and the page, in
        // dark mode, is nearly black, so the same stroke came out as a heavy
        // dark line drawn ON the land. Stroking in --c-muted keeps the border
        // one step off its own fill whichever way the theme goes. Neighbours
        // both stroke the edge they share, so this width is half what lands.
        const hairline = `rgb(${s.token('--c-muted')} / 0.55)`;
        if (hot || code === s.selected) {
          return {
            fill: `rgb(${s.token('--c-accent')} / ${hot ? 1 : 0.72})`,
            stroke: hairline,
            lineWidth: 0.5,
            layer: 3,
          };
        }
        return {
          fill: `rgb(${s.token('--c-muted')} / 0.38)`,
          stroke: hairline,
          lineWidth: 0.5,
          layer: 2,
        };
      }

      // An OPEN region is not drawn at all: its parts tile it exactly, and
      // drawing the parent underneath achieves nothing except a fringe, since
      // parent and parts are the same pixels simplified independently.
      if (code === openRegion) return null;
      if (!hot && code !== s.selected) return plainLand(s.token);
      return litRegion(s.token, hot ? 1 : 0.7);
    },
    styleForLine(group: string, _line: GlobeLine, s: FrameState): LineStyle | null {
      // Rivers only. They stay visible whatever is selected and cross borders
      // without breaking, because a river does not care whose land it is on —
      // which is most of what makes it read as geography rather than as another
      // border. The geometry is already cut to the coastline in the build.
      if (group !== 'rivers') return null;
      return { stroke: `rgb(${s.token('--c-accent')} / 0.75)`, lineWidth: 1.2, layer: 4 };
    },
    onHover(code, unit) {
      say(code);
      canvas.setAttribute(
        'aria-label',
        code
          ? `Globe of Dagea, showing ${unit?.name ?? code}.`
          : 'Rotatable globe of Dagea. Point at a place to highlight it.',
      );
    },
    onSelect(code, unit) {
      selected = code;
      // Opening and closing the drill-down. Only a region with parts opens; a
      // lone island is simply selected, and selecting a part keeps its region
      // open because the thing being looked at is still that region.
      if (!code) openRegion = null;
      else if (unit?.parent) openRegion = unit.parent;
      else openRegion = hasParts[code] ? code : null;
      paintChips();
      describe(code);
      say(null);
    },
    onReady(data) {
      hasParts = {};
      parentOf = {};
      for (const [code, unit] of Object.entries(data.subunits ?? {})) {
        if (unit.parent) {
          hasParts[unit.parent] = true;
          parentOf[code] = unit.parent;
        }
        // Islands are numbered, not described — fall back to the region's note.
        if (!places[code]) {
          places[code] = {
            name: unit.name,
            capital: '',
            export: '',
            blurb: places[unit.parent ?? '']?.blurb ?? '',
          };
        }
      }
      paintChips();
    },
  });

  const enter = (e: Event): void => {
    listHover = (e.currentTarget as HTMLElement).dataset.dageaChip || null;
    say(listHover);
  };
  const leave = (): void => { listHover = null; say(null); };
  const click = (e: Event): void => {
    const code = (e.currentTarget as HTMLElement).dataset.dageaChip || null;
    handle?.select(code === selected ? null : code);
  };

  for (const c of chips) {
    c.addEventListener('pointerenter', enter);
    c.addEventListener('pointerleave', leave);
    c.addEventListener('focus', enter);
    c.addEventListener('blur', leave);
    c.addEventListener('click', click);
  }

  describe(null);
  paintChips();

  detach = (): void => {
    for (const c of chips) {
      c.removeEventListener('pointerenter', enter);
      c.removeEventListener('pointerleave', leave);
      c.removeEventListener('focus', enter);
      c.removeEventListener('blur', leave);
      c.removeEventListener('click', click);
    }
  };
}
