/* Reading a box out of the page, for the widgets that are handed a finished
 * board rather than solving for one.
 *
 * The swap explorer and the colour-by-colour build both need the same three
 * things: the box JSON the shortcode embedded, its blocks collapsed into kinds,
 * and its `solution` rows turned into cell indices. Both used to carry their
 * own copy of all three — including a byte-identical copy of kindsFrom() — which
 * is exactly the per-example duplication this codebase is supposed to avoid.
 */

import { CELLS, COLORS, kindKey, kindsFrom } from './inventory';
import type { Box, Kind } from './inventory';

/** The relabelling that maps a box onto itself, as carried in the box data. */
export interface Mirror {
  colors: string[];
  numbers: number[];
}

/** A box plus the optional extras only the static widgets use. */
export type SolvedBox = Box & { solution?: string[]; mirror?: Mirror };

/** Parse the `solution` rows from the box data: "1 orange, 2 yellow, ...". */
export function readSolution(box: Box, rows: string[], kinds: readonly Kind[]): number[] | null {
  const index = new Map<string, number>();
  kinds.forEach((kind, i) => index.set(`${kind.n} ${box.palette[kind.c]}`, i));
  const cells: number[] = [];
  for (const row of rows) {
    for (const token of row.split(',')) {
      const kind = index.get(token.trim());
      if (kind === undefined) return null;
      cells.push(kind);
    }
  }
  return cells.length === CELLS ? cells : null;
}

/** Turn a data-file relabelling into a straight kind -> kind lookup. Returns
 *  null if any mapped block isn't in the box, which would mean the mirror in the
 *  data file is wrong — better to drop the button than to corrupt the board. */
export function buildMirror(kinds: Kind[], palette: string[], mirror: Mirror): number[] | null {
  const index = new Map<number, number>();
  kinds.forEach((kind, i) => index.set(kindKey(kind.c, kind.n), i));
  const mapped: number[] = [];
  for (const kind of kinds) {
    const toColor = palette.indexOf(mirror.colors[kind.c] ?? '');
    const toNumber = mirror.numbers[kind.n - 1];
    const target = index.get(kindKey(toColor, toNumber));
    if (toColor < 0 || target === undefined) return null;
    mapped.push(target);
  }
  return mapped;
}

/** What a widget needs to construct itself, once the page has been read. */
export interface MountedBox {
  box: SolvedBox;
  kinds: Kind[];
  palette: string[];
  solution: number[];
}

/**
 * Mount every element matching `selector` exactly once.
 *
 * Idempotent by design: HTMX swaps the whole body on navigation, so mounting
 * runs again on a page whose widgets may already be live. The `mountedFlag`
 * dataset key is what keeps the second pass from building a duplicate widget on
 * top of a working one.
 *
 * A node whose data is missing or malformed is skipped rather than half-built.
 * The shortcode renders the board server-side, so skipping leaves the reader
 * with a correct static picture instead of a broken interactive one.
 */
export function mountBoxWidgets(
  selector: string,
  mountedFlag: string,
  create: (node: HTMLElement, mounted: MountedBox) => void,
): void {
  for (const node of document.querySelectorAll<HTMLElement>(selector)) {
    if (node.dataset[mountedFlag] === 'true') continue;
    const raw = node.querySelector('script[data-puzzle-box]');
    if (!raw || !raw.textContent) continue;

    let box: SolvedBox;
    try {
      box = JSON.parse(raw.textContent);
    } catch {
      continue;
    }
    if (!Array.isArray(box.solution) || !Array.isArray(box.blocks)) continue;

    const kinds = kindsFrom(box.blocks);
    const palette = box.palette ?? [...COLORS];
    const solution = readSolution(box, box.solution, kinds);
    if (!solution) continue; // data and board disagree; leave the static markup

    node.dataset[mountedFlag] = 'true';
    create(node, { box, kinds, palette, solution });
  }
}
