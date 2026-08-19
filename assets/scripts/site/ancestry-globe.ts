// Ancestry globe — /misc/genes. Earth on a canvas, each subunit shaded by its
// share of the composition, idling with a slow spin and stopping under a pointer.
//
// Everything that makes it a globe — the orthographic projection, the limb
// clipping, the spin and flick, the hit test, the flight to a selection — lives
// in ./globe and is shared with /misc/dagea. What is left here is the part that
// is about ancestry: which regions are painted, how hard, and what the readout
// says.
//
// The percentages arrive as JSON in the markup rather than being walked out of
// data/genes.yaml a second time in TypeScript — layouts/shortcodes/ancestry-map.html
// already resolved which node owns which subunit for the static map, and doing
// that twice invites the two from drifting.
//
// INTENSITY is sqrt-scaled, not linear, for the same reason the flat map's is:
// England at 31.5% is 26x Switzerland at 0.5%, and on a linear ramp everything
// under about 5% collapses into the same barely-there wash.
//
// SELECTION, and why it reaches outside itself. Dagea puts its panel directly
// under its globe, so selecting there is self-contained. Here the thing worth
// reading about England is the England row in the composition below, which
// already exists, already has the note and the rarity ratings, and is already
// the version that works with no JavaScript at all. So this does not build a
// second panel: it opens that row. The globe becomes a way of navigating a list
// that was complete before it arrived, which is the only kind of enhancement
// worth having.
//
// THE JOIN IS THE NAME. `paint` is keyed by subunit code and carries a name;
// the rows carry `data-anc-node` with that same name. Codes would only address
// the rows that have geography — Basque and Ashkenazi Jewish have none and never
// will — and the name is what both sides already hold.

import { createGlobe, litRegion, plainLand } from './globe';
import type { GlobeHandle, GlobeUnit, FrameState, UnitStyle } from './globe';

interface PaintEntry {
  pct: number;
  name: string;
  /** Set by the template on the largest subunit of a multi-polygon population,
   *  so "Irish" flies to Ireland rather than to Northern Ireland. The choice is
   *  the flat map's, made once, rather than made again here from other data.
   *
   *  ABSENT for a population with nothing inside the Europe frame — Indigenous
   *  American paints the United States and Alaska, and a map of Europe has no
   *  opinion about which of those is the bigger one. `measure` below settles
   *  those, and only those. */
  lead?: boolean;
}

/** Rough surface area of a unit, in square degrees corrected for latitude.
 *
 *  The obvious cheap proxy — vertex count — is wrong in exactly the case this
 *  exists for: Alaska's coastline is far more crenellated than the contiguous
 *  United States and carries twice the points at a fifth of the size, so
 *  Indigenous American would have flown to Alaska. Shoelace times cos(latitude)
 *  is still crude near the poles, and still right about this.
 */
function measure(unit: GlobeUnit): number {
  let total = 0;
  for (const ring of unit.rings) {
    let shoelace = 0;
    let lat = 0;
    const n = ring.length / 2;
    for (let i = 0; i < ring.length; i += 2) {
      const j = (i + 2) % ring.length;
      shoelace += ring[i] * ring[j + 1] - ring[j] * ring[i + 1];
      lat += ring[i + 1];
    }
    total += (Math.abs(shoelace) / 2) * Math.cos(((lat / n) * Math.PI) / 180);
  }
  return total;
}

/** How far in a selection flies. Enough that a country fills a useful part of
 *  the disc; short of the point where the horizon stops reading as a globe. */
const ZOOM = 2.2;

let handle: GlobeHandle | null = null;
let detach: (() => void) | null = null;

export function initAncestryGlobe(): void {
  // Idempotent across hx-boost swaps: kill the previous loop and its listeners
  // before looking for a new host, or two rAF loops end up fighting over one
  // canvas and the spin runs at double speed.
  handle?.destroy();
  handle = null;
  detach?.();
  detach = null;

  const host = document.querySelector<HTMLElement>('[data-globe]');
  if (!host) return;
  const canvas = host.querySelector<HTMLCanvasElement>('canvas');
  const readout = host.querySelector<HTMLElement>('[data-globe-readout]');
  const fallback = document.querySelector<HTMLElement>('[data-globe-fallback]');
  const list = document.querySelector<HTMLElement>('[data-ancestry-list]');
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

  // name -> the row that describes it, and name -> the subunit to fly to. The
  // second is only populated for names the map paints, which is what makes the
  // list->globe direction quietly skip Basque and Ashkenazi rather than need a
  // special case for them.
  const rowOf = new Map<string, HTMLDetailsElement>();
  for (const el of Array.from(
    list?.querySelectorAll<HTMLDetailsElement>('details[data-anc-node]') ?? [],
  )) {
    rowOf.set(el.dataset.ancNode || '', el);
  }
  const codeOf = new Map<string, string>();
  for (const [code, entry] of Object.entries(paint)) {
    if (entry.lead) codeOf.set(entry.name, code);
  }

  let selected: string | null = null;
  // Only the rows THIS opened, so closing a selection leaves alone whatever the
  // reader had already opened for themselves.
  let opened: HTMLDetailsElement[] = [];
  let current: HTMLDetailsElement | null = null;

  function collapse(): void {
    for (const el of opened) el.open = false;
    opened = [];
    current?.removeAttribute('data-anc-current');
    current = null;
  }

  /** Open the row for `name`, and every row it sits inside — a child row is not
   *  merely closed but absent until its group is open.
   *
   *  IT DOES NOT SCROLL. It used to, on the reasoning that an entry opening below
   *  the fold is an entry nobody sees. But the click that opens it has already
   *  moved the globe — flying and magnifying it — and yanking the page at the
   *  same moment made one gesture look like three. The reader is looking at the
   *  globe when they click it; the row is there, marked, when they get to it. */
  function reveal(name: string | null): void {
    collapse();
    if (!name) return;
    const el = rowOf.get(name);
    if (!el) return;
    for (let node: HTMLElement | null = el; node;
      node = node.parentElement?.closest('details') ?? null) {
      const row = node as HTMLDetailsElement;
      if (!row.open) {
        row.open = true;
        opened.push(row);
      }
    }
    el.setAttribute('data-anc-current', '');
    current = el;
  }

  /** The readout follows the pointer, and falls back to the selection rather
   *  than to nothing — a globe holding a zoomed-in country with an empty caption
   *  under it looks like it has lost track of what it is showing. */
  function say(hovered: string | null): void {
    if (!readout) return;
    const entry = paint[hovered ?? selected ?? ''];
    readout.textContent = entry ? `${entry.name} · ${entry.pct.toFixed(1)}%` : '';
  }

  handle = createGlobe({
    host,
    canvas,
    src,
    fallback,
    start: { lon: 8, lat: 42 },   // opens on Europe, where the composition is
    zoomOnSelect: ZOOM,
    selectable: (code) => Boolean(paint[code]),
    styleFor(code: string, _unit: GlobeUnit, s: FrameState): UnitStyle {
      const entry = paint[code];
      if (!entry) return plainLand(s.token);
      const lit = s.hovered === code || s.selected === code;
      const share = 0.25 + 0.75 * Math.sqrt(entry.pct / maxPct);
      return litRegion(s.token, lit ? 1 : share);
    },
    onHover(code) {
      say(code);
      canvas.setAttribute(
        'aria-label',
        code
          ? `Globe with ${paint[code].name} highlighted, ${paint[code].pct.toFixed(1)} percent of the composition.`
          : 'Rotatable globe with each region shaded by its share of the ancestry composition. Click a region to open its entry in the breakdown below.',
      );
    },
    onSelect(code) {
      selected = code;
      reveal(code ? paint[code].name : null);
      say(null);
    },
    onReady(data) {
      // Only for names the template could not answer for. A name that has a
      // `lead` keeps it — the flat map's choice wins wherever the flat map has
      // one, so the label and the camera cannot drift apart.
      const biggest = new Map<string, number>();
      for (const [code, entry] of Object.entries(paint)) {
        if (codeOf.has(entry.name) && paint[codeOf.get(entry.name)!]?.lead) continue;
        const unit = data.units[code];
        if (!unit) continue;
        const size = measure(unit);
        if (size > (biggest.get(entry.name) ?? -1)) {
          biggest.set(entry.name, size);
          codeOf.set(entry.name, code);
        }
      }
    },
  });

  // The other direction. Opening a row that owns geography flies the globe to
  // it, so the two halves of the page agree about what is being looked at
  // whichever half the reader touched.
  //
  // This also fires for the rows `reveal` just opened, which is not a loop:
  // the engine's setSelected returns early when the code is already selected,
  // and a parent row opened on the way down has no code to select with.
  const onToggle = (e: Event): void => {
    const el = e.currentTarget as HTMLDetailsElement;
    if (!el.open) return;
    const code = codeOf.get(el.dataset.ancNode || '');
    if (code) handle?.select(code);
  };
  const rows = Array.from(rowOf.values());
  for (const el of rows) el.addEventListener('toggle', onToggle);

  detach = (): void => {
    for (const el of rows) el.removeEventListener('toggle', onToggle);
  };
}
