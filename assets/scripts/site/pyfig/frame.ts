// The frame family: pandas tables drawn with the cells engine. A table is its
// column names, its row labels (the index), its values and, when shown, one
// dtype per column, and every part is a cell, so selecting, dropping, filling
// or converting is the same slide-and-fade motion as the array figures.
//
// The table drawing is reusable: a Sheet is the data, a SheetCells numbers its
// parts from any first cell, and a SheetView says which rows and columns a
// state shows, where, and how they are toned. Several sheets can share one
// figure (a result beside its source, two tables to join) by giving each a
// different `first` and merging them with sheetState.
import type { Figure } from '../def-figures';
import type { CellState, Place, Tone } from './cells';
import { CELL_H, cellFigure } from './cells';

export interface Sheet {
  index: string[];
  columns: string[];
  rows: string[][];
  dtypes?: string[];
}

/** One drawn part of a sheet. `r` and `c` count rows and columns of the data. */
export type Part =
  | { kind: 'column'; c: number }
  | { kind: 'label'; r: number }
  | { kind: 'value'; r: number; c: number }
  | { kind: 'dtype'; c: number };

/** How one state shows a sheet. Rows and columns are drawn in the order
 *  listed; a part left out fades where it last stood. */
export interface SheetView {
  rows?: number[];
  cols?: number[];
  /** Grid slot of the top-left corner, above the row labels. */
  at?: { r: number; c: number };
  /** Grid row of each drawn row, counted from the first; fractions leave
   *  gaps between groups. 0, 1, 2… by default. */
  slots?: number[];
  /** Puts one part at its own place (null hides it); undefined keeps the
   *  table layout. */
  move?: (part: Part) => Place | null | undefined;
  hideIndex?: boolean;
  hideHeader?: boolean;
  showDtypes?: boolean;
  /** Replaces a part's text; undefined keeps the sheet's own. */
  value?: (part: Part) => string | undefined;
  /** A part's tone; undefined keeps the default (names and labels `head`). */
  tone?: (part: Part) => Tone | undefined;
}

const DTYPE_GAP = 0.3;

export class SheetCells {
  readonly sheet: Sheet;
  readonly first: number;
  readonly count: number;
  private readonly nRows: number;
  private readonly nCols: number;

  constructor(sheet: Sheet, first = 0) {
    this.sheet = sheet;
    this.first = first;
    this.nRows = sheet.index.length;
    this.nCols = sheet.columns.length;
    // Names, labels, values, dtypes: in paint order.
    this.count = this.nCols + this.nRows + this.nRows * this.nCols + this.nCols;
  }

  owns(i: number): boolean {
    return i >= this.first && i < this.first + this.count;
  }

  part(i: number): Part {
    let k = i - this.first;
    if (k < this.nCols) return { kind: 'column', c: k };
    k -= this.nCols;
    if (k < this.nRows) return { kind: 'label', r: k };
    k -= this.nRows;
    if (k < this.nRows * this.nCols) return { kind: 'value', r: Math.floor(k / this.nCols), c: k % this.nCols };
    return { kind: 'dtype', c: k - this.nRows * this.nCols };
  }

  text(part: Part): string {
    const { sheet } = this;
    if (part.kind === 'column') return sheet.columns[part.c] ?? '';
    if (part.kind === 'label') return sheet.index[part.r] ?? '';
    if (part.kind === 'value') return sheet.rows[part.r]?.[part.c] ?? '';
    return sheet.dtypes?.[part.c] ?? '';
  }

  place(view: SheetView, i: number): Place | null {
    const part = this.part(i);
    const moved = view.move?.(part);
    if (moved !== undefined) return moved;
    const rows = view.rows ?? this.sheet.index.map((_, r) => r);
    const cols = view.cols ?? this.sheet.columns.map((_, c) => c);
    const at = view.at ?? { r: 0, c: 0 };
    const top = at.r + (view.hideHeader ? 0 : 1);
    const left = at.c + (view.hideIndex ? 0 : 1);
    const drawn = 'r' in part ? rows.indexOf(part.r) : 0;
    const col = 'c' in part ? cols.indexOf(part.c) : 0;
    if (drawn < 0 || col < 0) return null;
    const row = view.slots?.[drawn] ?? drawn;
    switch (part.kind) {
      case 'column':
        return view.hideHeader ? null : { r: at.r, c: left + col };
      case 'label':
        return view.hideIndex ? null : { r: top + row, c: at.c };
      case 'value':
        return { r: top + row, c: left + col };
      case 'dtype':
        return view.showDtypes ? { r: top + rows.length + DTYPE_GAP, c: left + col } : null;
    }
  }

  value(view: SheetView, i: number): string {
    const part = this.part(i);
    return view.value?.(part) ?? this.text(part);
  }

  tone(view: SheetView, i: number): Tone {
    const part = this.part(i);
    const chosen = view.tone?.(part);
    if (chosen !== undefined) return chosen;
    if (part.kind === 'column' || part.kind === 'label') return 'head';
    return part.kind === 'dtype' ? 'alt' : '';
  }
}

/** Cell width of every table figure. */
export const TABLE_CELL_W = 46;

/** Numbers sheets one after another so they can share a figure. */
export function layOut(sheets: Sheet[]): SheetCells[] {
  let first = 0;
  return sheets.map((sheet) => {
    const cells = new SheetCells(sheet, first);
    first += cells.count;
    return cells;
  });
}

/** One engine state from several sheets, each with its own view. */
export function sheetState(
  shown: [SheetCells, SheetView][],
  frame: { rows: number; cols: number; caption: string; holdMs?: number },
): CellState {
  const owner = (i: number): [SheetCells, SheetView] | undefined => shown.find(([cells]) => cells.owns(i));
  return {
    ...frame,
    place: (i) => { const o = owner(i); return o ? o[0].place(o[1], i) : null; },
    value: (i) => { const o = owner(i); return o ? o[0].value(o[1], i) : ''; },
    tone: (i) => { const o = owner(i); return o ? o[0].tone(o[1], i) : ''; },
  };
}

/* ── The figure's table ────────────────────────────────────────────────────
   df = pd.read_csv('runs.csv', index_col='run'): four runs, one of them (r2)
   with no loss. Every caption below was checked against pandas 3.0.6 on this
   table. */

const RUNS: Sheet = {
  index: ['r1', 'r2', 'r3', 'r4'],
  columns: ['model', 'lr', 'loss'],
  rows: [['cnn', '0.1', '0.42'], ['mlp', '0.01', 'NaN'], ['cnn', '0.05', '0.33'], ['rnn', '0.1', '0.71']],
  dtypes: ['str', 'float64', 'float64'],
};
const MODEL = 0;
const LR = 1;
const LOSS = 2;
const R2 = 1;
const isMissing = (part: Part): boolean => part.kind === 'value' && part.r === R2 && part.c === LOSS;

// Tone helpers: light the parts a test picks, and optionally dim the rest.
const lit = (test: (part: Part) => boolean, rest?: Tone) => (part: Part): Tone | undefined =>
  test(part) ? 'lit' : part.kind === 'value' ? rest : undefined;
const inCols = (cols: number[]) => (part: Part): boolean =>
  (part.kind === 'value' || part.kind === 'column') && cols.includes(part.c);
const inRows = (rows: number[]) => (part: Part): boolean =>
  (part.kind === 'value' || part.kind === 'label') && rows.includes(part.r);
const missingBad = (part: Part): Tone | undefined => (isMissing(part) ? 'bad' : undefined);

type Sequence = { states: CellState[]; still: number; count: number };
type Shot = { caption: string; view?: SheetView; extra?: [SheetCells, SheetView][]; holdMs?: number };

const BOX = { rows: 6.3, cols: 5 };

function sequence(shots: Shot[], still: number, extras: SheetCells[] = []): Sequence {
  const main = new SheetCells(RUNS);
  const states = shots.map((shot) => sheetState([[main, shot.view ?? {}], ...(shot.extra ?? [])],
    { ...BOX, caption: shot.caption, holdMs: shot.holdMs }));
  const count = main.count + extras.reduce((total, sheet) => total + sheet.count, 0);
  return { states, still, count };
}

// A second sheet drawn beside the table: a Series, as a column with or
// without its own labels.
function besideSheet(first: number, index: string[], column: string, values: string[]): SheetCells {
  return new SheetCells({ index, columns: [column], rows: values.map((v) => [v]) }, first);
}

const MAIN_COUNT = new SheetCells(RUNS).count;

function frameStates(highlight: string): Sequence {
  switch (highlight) {
    case 'series':
      return sequence([
        { caption: "df['loss']: one column", view: { tone: lit(inCols([LOSS])) } },
        { caption: "df['loss'] → a Series: the values and the index", view: { cols: [LOSS], tone: lit(inCols([LOSS])) } },
      ], 1);
    case 'index':
      return sequence([
        { caption: 'df.index: the row labels r1 … r4', view: { tone: lit((p) => p.kind === 'label') } },
        { caption: "df.loc['r3'] finds a row by its label", view: { tone: lit(inRows([2])) } },
      ], 0);
    case 'read-csv':
      return sequence([
        { caption: "pd.read_csv('runs.csv', index_col='run')", view: { rows: [] }, holdMs: 900 },
        ...[1, 2, 3].map((n): Shot => ({ caption: 'one row per line of the file', view: { rows: [0, 1, 2, 3].slice(0, n) }, holdMs: 500 })),
        { caption: '→ a DataFrame, dtypes worked out; a blank → NaN', view: { showDtypes: true, tone: missingBad } },
      ], 4);
    case 'read-parquet':
      return sequence([
        { caption: "df.to_parquet('runs.parquet') stores the dtypes too", view: { showDtypes: true } },
        { caption: '…', view: { rows: [], cols: [], hideIndex: true, hideHeader: true }, holdMs: 900 },
        { caption: "pd.read_parquet('runs.parquet'): the same table and dtypes",
          view: { showDtypes: true, tone: (p) => (p.kind === 'dtype' ? 'lit' : undefined) } },
      ], 2);
    case 'head':
      return sequence([
        { caption: 'df: 4 rows' },
        { caption: 'df.head(2) → the first 2 rows (5 by default)', view: { tone: lit(inRows([0, 1]), 'dim') } },
      ], 1);
    case 'info':
      return sequence([
        { caption: 'df.info(): each column’s dtype…', view: { showDtypes: true, tone: (p) => (p.kind === 'dtype' ? 'lit' : undefined) } },
        { caption: '…and its non-null count: loss has 3 of 4', view: { showDtypes: true,
          tone: (p) => (isMissing(p) ? 'bad' : lit(inCols([LOSS]))(p)) } },
      ], 1);
    case 'describe': {
      const stats: Record<string, string[]> = { count: ['4', '3'], mean: ['0.065', '0.487'], max: ['0.1', '0.71'] };
      const statNames = Object.keys(stats);
      return sequence([
        { caption: 'df: one text column, two numeric' },
        { caption: 'df.describe(): count, mean, max… of the numeric columns', view: {
          rows: [0, 1, 2], cols: [LR, LOSS],
          value: (p) => {
            if (p.kind === 'label') return statNames[p.r];
            if (p.kind === 'value') return stats[statNames[p.r] ?? '']?.[p.c - LR];
            return undefined;
          },
          tone: (p) => (p.kind === 'value' ? 'lit' : undefined),
        } },
      ], 1);
    }
    case 'column-selection':
      return sequence([
        { caption: "df['loss'] → one column, as a Series", view: { tone: lit(inCols([LOSS])) } },
        { caption: "df[['model', 'loss']] → a DataFrame of two", view: { tone: lit(inCols([MODEL, LOSS])) } },
        { caption: "df[['model', 'loss']] → a DataFrame of two", view: { cols: [MODEL, LOSS], tone: lit(inCols([MODEL, LOSS])) } },
      ], 2);
    case 'loc':
    case 'iloc': {
      const block = (p: Part): boolean => p.kind === 'value' && [1, 2].includes(p.r) && [MODEL, LR].includes(p.c);
      const call = highlight === 'loc'
        ? "df.loc['r2':'r3', 'model':'lr']: labels, both ends in"
        : 'df.iloc[1:3, 0:2]: positions, the end left out';
      return sequence([
        { caption: call, view: { tone: lit(block, 'dim') } },
        { caption: '→ 2 rows × 2 columns', view: { rows: [1, 2], cols: [MODEL, LR], tone: lit(block) } },
      ], 1);
    }
    case 'missing-value':
      return sequence([
        { caption: 'r2 has no loss: NaN marks a missing value', view: { tone: missingBad } },
        { caption: "df['loss'].mean() ≈ 0.487: the NaN is skipped", view: { tone: (p) => (isMissing(p) ? 'dim' : lit(inCols([LOSS]))(p)) } },
      ], 0);
    case 'isna':
      return sequence([
        { caption: 'df', view: { tone: missingBad } },
        { caption: 'df.isna(): True where a value is missing', view: {
          value: (p) => (p.kind === 'value' ? (isMissing(p) ? 'True' : 'False') : undefined),
          tone: (p) => (isMissing(p) ? 'lit' : undefined),
        } },
      ], 1);
    case 'fillna':
      return sequence([
        { caption: 'df', view: { tone: missingBad } },
        { caption: "df.fillna({'loss': 0.5}) → a filled copy", view: {
          value: (p) => (isMissing(p) ? '0.5' : undefined), tone: (p) => (isMissing(p) ? 'lit' : undefined),
        } },
      ], 1);
    case 'dropna':
      return sequence([
        { caption: 'df: r2 has a missing value', view: { tone: (p) => (inRows([R2])(p) && p.kind === 'value' ? 'bad' : undefined) } },
        { caption: 'df.dropna() → r2 gone; r3 keeps its label', view: { rows: [0, 2, 3] } },
      ], 1);
    case 'assign': {
      const good = besideSheet(MAIN_COUNT, RUNS.index, 'good', ['True', 'False', 'True', 'False']);
      const beside: SheetView = { at: { r: 0, c: 4 }, hideIndex: true, tone: (p) => (p.kind === 'column' || p.kind === 'value' ? 'lit' : undefined) };
      return sequence([
        { caption: 'df', extra: [[good, { ...beside, rows: [], hideHeader: true }]] },
        { caption: "df.assign(good=df['loss'] < 0.5) → one more column", extra: [[good, beside]] },
      ], 1, [good]);
    }
    case 'astype':
      return sequence([
        { caption: 'df.dtypes', view: { showDtypes: true } },
        { caption: "df.astype({'lr': 'float32'}): same values, new dtype", view: {
          showDtypes: true,
          value: (p) => (p.kind === 'dtype' && p.c === LR ? 'float32' : undefined),
          tone: (p) => (p.kind === 'dtype' && p.c === LR ? 'lit' : undefined),
        } },
      ], 1);
    case 'value-counts': {
      const counts = besideSheet(MAIN_COUNT, ['cnn', 'mlp', 'rnn'], 'count', ['2', '1', '1']);
      const hidden: SheetView = { at: { r: 0, c: 2.5 }, rows: [], hideHeader: true, hideIndex: true };
      return sequence([
        { caption: "df['model']", view: { tone: lit(inCols([MODEL])) }, extra: [[counts, hidden]] },
        { caption: "df['model'].value_counts(): most common first", view: { cols: [MODEL], tone: lit(inCols([MODEL]), 'dim') },
          extra: [[counts, { at: { r: 0, c: 2.5 }, tone: (p) => (p.kind === 'value' ? 'lit' : undefined) }]] },
      ], 1, [counts]);
    }
    case 'to-numpy':
      return sequence([
        { caption: "df[['lr', 'loss']]", view: { tone: lit(inCols([LR, LOSS])) } },
        { caption: "df[['lr', 'loss']].to_numpy() → a (4, 2) float64 array", view: {
          cols: [LR, LOSS], hideIndex: true, hideHeader: true, at: { r: 1, c: 1 },
          value: (p) => (isMissing(p) ? 'nan' : undefined), tone: () => 'lit',
        } },
      ], 1);
    case 'sort-values':
      return sequence([
        { caption: "df['loss']", view: { tone: lit(inCols([LOSS])) } },
        { caption: "df.sort_values('loss'): smallest first, labels kept, NaN last", view: { rows: [2, 0, 3, 1], tone: (p) => (isMissing(p) ? 'bad' : lit(inCols([LOSS]))(p)) } },
      ], 1);
    case 'apply':
      return applyStates();
    case 'copy-on-write':
    case 'chained-assignment':
      return copyStates(highlight);
    default:
      return sequence([
        { caption: 'df.shape → (4, 3)' },
        { caption: 'df.columns: the column names', view: { tone: (p) => (p.kind === 'column' ? 'lit' : undefined) } },
        { caption: 'df.index: the row labels', view: { tone: (p) => (p.kind === 'label' ? 'lit' : undefined) } },
        { caption: 'each column has one dtype', view: { showDtypes: true, tone: lit(inCols([LR])) } },
      ], 3);
  }
}

// df['lr'].apply(f) calls f once per value, in Python; df['lr'] * 10 gives
// the same Series in one vectorized step.
function applyStates(): Sequence {
  const tens = ['1.0', '0.1', '0.5', '1.0'];
  const result = besideSheet(MAIN_COUNT, RUNS.index, 'lr', tens);
  const beside = (shown: number, current: number): SheetView => ({
    at: { r: 1, c: 4 }, hideIndex: true, hideHeader: true, rows: [0, 1, 2, 3].slice(0, shown),
    tone: (p) => (p.kind === 'value' && (current < 0 || p.r === current) ? 'lit' : undefined),
  });
  const call = (r: number): Shot => ({
    caption: `call ${r + 1} of 4: v = ${RUNS.rows[r]?.[LR] ?? ''} → ${tens[r] ?? ''}`,
    view: { tone: lit((p) => p.kind === 'value' && p.r === r && p.c === LR) },
    extra: [[result, beside(r + 1, r)]],
    holdMs: 1100,
  });
  return sequence([
    { caption: "df['lr'].apply(lambda v: v * 10)", view: { tone: lit(inCols([LR])) }, extra: [[result, beside(0, -1)]] },
    ...[0, 1, 2, 3].map(call),
    { caption: "df['lr'] * 10: the same Series, one vectorized step", view: { tone: lit(inCols([LR])) }, extra: [[result, beside(4, -1)]] },
  ], 5, [result]);
}

// Two names: df, and a Series s drawn beside it. Under copy-on-write, writing
// to s never reaches df, and neither does a chained assignment, whose middle
// step is a Series just like s. Only df.loc writes into df.
function copyStates(highlight: string): Sequence {
  const narrow: SheetView = { cols: [LR, LOSS] };
  const loss = RUNS.rows.map((row) => row[LOSS] ?? '');
  // Headed with the name the caption uses: s, or the unnamed copy a chained
  // assignment writes into.
  const series = besideSheet(MAIN_COUNT, RUNS.index, highlight === 'copy-on-write' ? 's' : 'copy', loss);
  const seriesAt = (written: number, value: string, isShown = true): SheetView => ({
    at: { r: 0, c: 3.5 }, hideIndex: true, rows: isShown ? undefined : [], hideHeader: !isShown,
    value: (p) => (p.kind === 'value' && p.r === written ? value : undefined),
    tone: (p) => (p.kind === 'value' && p.r === written ? 'lit' : p.kind === 'value' ? 'alt' : undefined),
  });
  const plain: Shot = { caption: 'df', view: narrow, extra: [[series, seriesAt(-1, '', false)]] };
  if (highlight === 'copy-on-write') {
    return sequence([
      plain,
      { caption: "s = df['loss']: shares df’s data, for now", view: { ...narrow, tone: lit(inCols([LOSS])) }, extra: [[series, seriesAt(-1, '')]] },
      { caption: 's.iloc[0] = 0.0 → only s changes; df keeps 0.42', view: { ...narrow, tone: lit((p) => p.kind === 'value' && p.r === 0 && p.c === LOSS) },
        extra: [[series, seriesAt(0, '0.0')]] },
    ], 2, [series]);
  }
  const loc = (p: Part): Tone | undefined => (isMissing(p) ? 'lit' : undefined);
  return sequence([
    plain,
    { caption: "df['loss']['r2'] = 0.5 writes to a temporary copy", view: narrow, extra: [[series, seriesAt(R2, '0.5')]] },
    { caption: '…so df is unchanged (pandas warns)', view: { ...narrow, tone: missingBad }, extra: [[series, seriesAt(-1, '', false)]] },
    { caption: "df.loc['r2', 'loss'] = 0.5 writes into df", view: { ...narrow, value: (p) => (isMissing(p) ? '0.5' : undefined), tone: loc },
      extra: [[series, seriesAt(-1, '', false)]] },
  ], 3, [series]);
}

const LABELS: Record<string, string> = {
  series: 'A Series: one column of a DataFrame, with the index.',
  index: 'The index: the labels down the side of a table.',
  'missing-value': 'A table with one missing value, NaN.',
  'copy-on-write': 'A Series taken from a DataFrame, changed without changing the DataFrame.',
  'chained-assignment': 'A chained assignment that changes nothing, then a loc assignment that works.',
  'sort-values': 'A table sorted by its loss column, the missing loss last.',
  apply: 'A function applied to a column one value at a time, then the same result from one vectorized step.',
};

export function frame(figure: Figure): HTMLElement {
  const highlight = figure.highlight ?? 'dataframe';
  const { states, still, count } = frameStates(highlight);
  return cellFigure({
    count,
    states,
    still,
    cellWidth: TABLE_CELL_W,
    height: Math.ceil(BOX.rows * CELL_H) + 12,
    label: LABELS[highlight] ?? 'A small table: row labels down the side, column names across the top.',
  });
}
