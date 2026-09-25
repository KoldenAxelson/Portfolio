// The join family: two tables combined. merge zips them on a key column:
// each result row takes a left row and the right row with the same key, and a
// key with no partner either falls off (inner) or keeps its row with NaN in
// the gaps (left, outer). concat stacks tables with the same columns.
//
// Tables are frame.ts sheets; a result is drawn by moving the input cells to
// their places in it, with NaN cells fading in where a partner was missing.
// Every caption was checked against pandas 3.0.6 on these tables.
import type { Figure } from '../def-figures';
import type { CellState, Place, Tone } from './cells';
import { CELL_H, cellFigure } from './cells';
import type { Part, Sheet, SheetCells, SheetView } from './frame';
import { layOut, sheetState, TABLE_CELL_W } from './frame';

/* ── merge ─────────────────────────────────────────────────────────────
   counts.merge(owners, on='endpoint', how=…): /login and /search are in
   both, /upload only in counts, /pay only in owners. */

const COUNTS: Sheet = {
  index: ['0', '1', '2'],
  columns: ['endpoint', 'n'],
  rows: [['/login', '3'], ['/search', '2'], ['/upload', '1']],
};
const OWNERS: Sheet = {
  index: ['0', '1', '2'],
  columns: ['endpoint', 'team'],
  rows: [['/login', 'auth'], ['/search', 'find'], ['/pay', 'fin']],
};
const GAPS: Sheet = { index: ['0', '1'], columns: [''], rows: [['NaN'], ['NaN']] };

const KEY = 0;
const MATCHED = [0, 1];

/** One row of a merge result: which counts row and owners row it came from. */
type Joined = { left?: number; right?: number };
const RESULTS: Record<string, Joined[]> = {
  inner: [{ left: 0, right: 0 }, { left: 1, right: 1 }],
  left: [{ left: 0, right: 0 }, { left: 1, right: 1 }, { left: 2 }],
  outer: [{ left: 0, right: 0 }, { right: 2 }, { left: 1, right: 1 }, { left: 2 }],
};
const CAPTIONS: Record<string, string> = {
  inner: "counts.merge(owners, on='endpoint'): inner, keys in both → 2 rows",
  left: "how='left': every counts row; no owner → NaN (3 rows)",
  outer: "how='outer': every key, sorted; gaps → NaN, and n turns float (4 rows)",
};

// The result's columns, endpoint, n and team, start one column in.
const RESULT_COL = { endpoint: 1, n: 2, team: 3 };

function mergeViews(counts: SheetCells, owners: SheetCells, gaps: SheetCells, how: string): [SheetCells, SheetView][] {
  const rows = RESULTS[how] ?? [];
  const rowOf = (side: 'left' | 'right', r: number): number => rows.findIndex((row) => row[side] === r);
  const isFloat = how === 'outer';
  const left: SheetView = {
    move: (part) => {
      if (part.kind === 'column') return { r: 0, c: RESULT_COL.endpoint + part.c };
      if (part.kind !== 'value') return undefined;
      const k = rowOf('left', part.r);
      return k < 0 ? null : { r: 1 + k, c: RESULT_COL.endpoint + part.c };
    },
    hideIndex: true,
    value: (part) => (isFloat && part.kind === 'value' && part.c === 1 ? `${COUNTS.rows[part.r]?.[1] ?? ''}.0` : undefined),
  };
  // A matched key slides onto the left key and fades there: one key column.
  const right: SheetView = {
    move: (part) => {
      if (part.kind === 'column') return part.c === KEY ? { r: 0, c: RESULT_COL.endpoint, hidden: true } : { r: 0, c: RESULT_COL.team };
      if (part.kind !== 'value') return undefined;
      const k = rowOf('right', part.r);
      if (k < 0) return null;
      if (part.c !== KEY) return { r: 1 + k, c: RESULT_COL.team };
      return { r: 1 + k, c: RESULT_COL.endpoint, hidden: rows[k]?.left !== undefined };
    },
    hideIndex: true,
  };
  const gapPlaces: Place[] = rows.flatMap((row, k) => [
    ...(row.left === undefined ? [{ r: 1 + k, c: RESULT_COL.n }] : []),
    ...(row.right === undefined ? [{ r: 1 + k, c: RESULT_COL.team }] : []),
  ]);
  const gap: SheetView = {
    hideHeader: true,
    hideIndex: true,
    move: (part) => (part.kind === 'value' ? gapPlaces[part.r] ?? null : undefined),
    tone: () => 'bad',
  };
  return [[counts, left], [owners, right], [gaps, gap]];
}

function inputViews(counts: SheetCells, owners: SheetCells, gaps: SheetCells): [SheetCells, SheetView][] {
  const keyTone = (part: Part): Tone | undefined =>
    part.kind === 'value' && part.c === KEY ? (MATCHED.includes(part.r) ? 'lit' : 'bad') : undefined;
  return [
    [counts, { hideIndex: true, tone: keyTone }],
    [owners, { at: { r: 0, c: 3 }, hideIndex: true, tone: keyTone }],
    [gaps, { rows: [], hideHeader: true, hideIndex: true }],
  ];
}

function mergeStates(): { states: CellState[]; count: number; still: number; rows: number } {
  const [counts, owners, gaps] = layOut([COUNTS, OWNERS, GAPS]) as [SheetCells, SheetCells, SheetCells];
  const box = { rows: 5, cols: 5 };
  const inputs = inputViews(counts, owners, gaps);
  const states = ['inner', 'left', 'outer'].flatMap((how) => [
    sheetState(inputs, { ...box, caption: 'counts and owners share the key column endpoint' }),
    sheetState(mergeViews(counts, owners, gaps, how), { ...box, caption: CAPTIONS[how] ?? '' }),
  ]);
  return { states, count: counts.count + owners.count + gaps.count, still: 3, rows: box.rows };
}

/* ── concat ────────────────────────────────────────────────────────────
   pd.concat([web1, web2]): web2's row goes under web1's, label and all. */

const WEB1: Sheet = { index: ['0', '1'], columns: ['endpoint', 'ms'], rows: [['/login', '120'], ['/search', '340']] };
const WEB2: Sheet = { index: ['0'], columns: ['endpoint', 'ms'], rows: [['/login', '95']] };

function concatStates(): { states: CellState[]; count: number; still: number; rows: number } {
  const [web1, web2] = layOut([WEB1, WEB2]) as [SheetCells, SheetCells];
  const box = { rows: 5.5, cols: 5 };
  const at = { r: 0, c: 1 };
  const stacked: SheetView = { at: { r: 3, c: 1 }, hideHeader: true };
  const isLabel = (part: Part): boolean => part.kind === 'label';
  return {
    count: web1.count + web2.count,
    still: 2,
    rows: box.rows,
    states: [
      sheetState([[web1, { at }], [web2, { at: { r: 3.5, c: 1 } }]], { ...box, caption: 'web1 and web2: the same columns' }),
      sheetState([[web1, { at }], [web2, { ...stacked, tone: (part) => (isLabel(part) ? 'bad' : undefined) }]],
        { ...box, caption: 'pd.concat([web1, web2]): rows stacked, labels kept: 0, 1, 0' }),
      sheetState([[web1, { at }], [web2, { ...stacked, value: (part) => (isLabel(part) ? '2' : undefined), tone: (part) => (isLabel(part) ? 'lit' : undefined) }]],
        { ...box, caption: 'ignore_index=True numbers them again: 0, 1, 2' }),
    ],
  };
}

const LABELS: Record<string, string> = {
  merge: 'Two tables joined on a key column: an inner, a left and an outer merge, with NaN where a key has no partner.',
  concat: 'Two tables with the same columns stacked into one, first keeping their row labels, then numbering them again.',
};

export function join(figure: Figure): HTMLElement {
  const highlight = figure.highlight === 'concat' ? 'concat' : 'merge';
  const { states, count, still, rows } = highlight === 'concat' ? concatStates() : mergeStates();
  return cellFigure({
    count,
    states,
    still,
    cellWidth: TABLE_CELL_W,
    height: Math.ceil(rows * CELL_H) + 12,
    label: LABELS[highlight] ?? '',
  });
}
