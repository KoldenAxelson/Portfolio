// The NumPy figure families: array-grid, axis-sweep, broadcast and view-copy.
// Each is one drawing (the cells engine in cells.ts) and each glossary term picks
// a `highlight` that walks it through a different sequence. The values are the
// ones the captions name, computed here from the same small arrays, so a
// caption and its picture can't disagree.
import type { Figure } from '../def-figures';
import { attrs, centredLabel, svg } from '../figure-kit';
import type { CellState, Place, Tone } from './cells';
import { CELL_H, CELL_W, cellFigure, floatText, rowMajor } from './cells';

const A = Array.from({ length: 12 }, (_, i) => i); // a = np.arange(12).reshape(3, 4)
const grid34 = rowMajor(4);
const at = (r: number, c: number): number => r * 4 + c;
const text = (i: number): string => String(A[i] ?? '');
const base = (caption: string, extra: Partial<CellState> = {}): CellState => ({
  rows: 3, cols: 4, place: grid34, value: text, caption, ...extra,
});
const litWhere = (test: (i: number) => boolean) => (i: number): Tone => (test(i) ? 'lit' : '');

// Keep only the cells `keep` lists, packed row-major into a rows×cols block.
function packed(keep: number[], cols: number): (i: number) => Place | null {
  return (i) => {
    const slot = keep.indexOf(i);
    return slot < 0 ? null : { r: Math.floor(slot / cols), c: slot % cols };
  };
}

const SLICE = [at(1, 0), at(1, 2), at(2, 0), at(2, 2)]; // a[1:, ::2]
const EVENS = A.filter((v) => v % 2 === 0);
const FANCY = [2, 0]; // a[[2, 0]]

type Sequence = { states: CellState[]; still?: number; cellWidth?: number; count?: number };

function arrayGridStates(highlight: string, figure: Figure): Sequence {
  switch (highlight) {
    case 'shape':
      return { states: [
        base('3 rows: axis 0 has length 3', { overlay: 'axis0', tone: litWhere((i) => i % 4 === 0) }),
        base('4 columns: axis 1 has length 4', { overlay: 'axis1', tone: litWhere((i) => i < 4) }),
        base('a.shape → (3, 4)'),
      ], still: 2 };
    case 'axis':
      return { states: [
        base('axis 0 runs down the rows', { overlay: 'axis0', tone: litWhere((i) => i % 4 === 1) }),
        base('axis 1 runs across the columns', { overlay: 'axis1', tone: litWhere((i) => Math.floor(i / 4) === 1) }),
      ] };
    case 'dtype':
      return { states: [
        base('dtype int64: 8 bytes a value'),
        base('a.astype(np.float32): 4 bytes a value', { value: (i) => floatText(i), tone: () => 'lit' }),
      ], cellWidth: 26 };
    case 'np-array':
      return { states: [
        { rows: 1, cols: 3, place: (i) => (i < 3 ? { r: 0, c: i } : null), value: (i) => String(i + 1),
          caption: 'np.array([1, 2, 3]) → shape (3,)' },
        { rows: 2, cols: 3, place: (i) => (i < 6 ? rowMajor(3)(i) : null), value: (i) => String(i + 1),
          caption: 'np.array([[1, 2, 3], [4, 5, 6]]) → (2, 3)' },
      ], still: 1 };
    case 'zeros':
      return { states: [base('np.zeros((3, 4)) → float64 zeros', { value: () => '0.' })] };
    case 'ones':
      return { states: [base('np.ones((3, 4)) → float64 ones', { value: () => '1.' })] };
    case 'full':
      return { states: [base('np.full((3, 4), 7)', { value: () => '7' })] };
    case 'arange':
      return { states: [
        { rows: 1, cols: 12, place: (i) => ({ r: 0, c: i }), value: text, caption: 'np.arange(12) → 0 up to, not including, 12' },
        { rows: 1, cols: 4, place: (i) => (i % 3 === 0 ? { r: 0, c: i / 3 } : null), value: text,
          tone: () => 'lit', caption: 'np.arange(0, 12, 3) → [0, 3, 6, 9]' },
      ], cellWidth: 20 };
    case 'linspace':
      return { states: [
        { rows: 1, cols: 5, place: (i) => (i < 5 ? { r: 0, c: i } : null), value: (i) => floatText(i / 4),
          caption: 'np.linspace(0, 1, 5): both ends, 5 points' },
      ], cellWidth: 36 };
    case 'default-rng': {
      const drawn = (figure.values ?? []).map(String);
      const row = (i: number): Place | null => (i < drawn.length ? { r: 0, c: i } : null);
      const value = (i: number): string => drawn[i] ?? '';
      return { states: [
        { rows: 1, cols: drawn.length, place: row, value, caption: figure.label ?? '' },
        { rows: 1, cols: drawn.length, place: row, value, tone: () => 'lit', caption: 'same seed again → the same numbers' },
      ] };
    }
    case 'torch-tensor':
      return { states: [
        { rows: 1, cols: 3, place: (i) => (i < 3 ? { r: 0, c: i } : null), value: (i) => String(i + 1),
          caption: 'torch.tensor([1, 2, 3]) → torch.Size([3]), int64' },
        { rows: 2, cols: 3, place: (i) => (i < 6 ? rowMajor(3)(i) : null), value: (i) => floatText(i + 1), tone: () => 'lit',
          caption: 'torch.tensor([[1., 2., 3.], [4., 5., 6.]]) → (2, 3), float32' },
      ], still: 1 };
    case 'torch-zeros':
      return { states: [base('torch.zeros(3, 4) → float32 zeros', { value: () => '0.' })] };
    case 'torch-randn': {
      // Values from the glossary entry: a real run, since TypeScript can't replay PyTorch's generator.
      const drawn = (figure.values ?? []).map(String);
      const place = (i: number): Place | null => (i < drawn.length ? rowMajor(4)(i) : null);
      const value = (i: number): string => drawn[i] ?? '';
      const rows = Math.ceil(drawn.length / 4);
      return { states: [
        { rows, cols: 4, place, value, caption: figure.label ?? '' },
        { rows, cols: 4, place, value, tone: () => 'lit', caption: 'the same seed again → the same numbers' },
      ], cellWidth: 36 };
    }
    case 'nn-embedding': {
      // The weight table's values come from the glossary entry, a real run, like torch-randn's.
      const drawn = (figure.values ?? []).map(String);
      const value = (i: number): string => drawn[i] ?? '';
      const picked = (i: number): number => FANCY.indexOf(Math.floor(i / 4));
      return { states: [
        { rows: 3, cols: 4, place: grid34, value, caption: figure.label ?? '' },
        { rows: 3, cols: 4, place: grid34, value, tone: (i) => (picked(i) < 0 ? '' : 'lit'),
          caption: 'emb(torch.tensor([2, 0])): rows 2, then 0' },
        { rows: 2, cols: 4, value, tone: () => 'lit', caption: '→ shape (2, 4), one row per id',
          place: (i) => (picked(i) < 0 ? null : { r: picked(i), c: i % 4 }) },
      ], cellWidth: 36, still: 1 };
    }
    case 'index':
      return { states: [base('a[1, 2] → 6', { tone: litWhere((i) => i === at(1, 2)) })] };
    case 'slicing':
      return { states: [
        base('a[1:, ::2]: rows 1 on, every 2nd column', { tone: litWhere((i) => SLICE.includes(i)) }),
        { rows: 2, cols: 2, place: packed(SLICE, 2), value: text, tone: () => 'lit', caption: '→ shape (2, 2)' },
      ] };
    case 'mask':
      return { states: [
        base('a % 2 == 0 → True where even', { tone: litWhere((i) => i % 2 === 0) }),
        { rows: 1, cols: 6, place: packed(EVENS, 6), value: text, tone: () => 'lit', caption: 'a[a % 2 == 0] → shape (6,)' },
      ] };
    case 'fancy':
      return { states: [
        base('a[[2, 0]]: rows 2, then 0', { tone: litWhere((i) => FANCY.includes(Math.floor(i / 4))) }),
        { rows: 2, cols: 4, value: text, tone: () => 'lit', caption: '→ shape (2, 4), in that order',
          place: (i) => { const r = FANCY.indexOf(Math.floor(i / 4)); return r < 0 ? null : { r, c: i % 4 }; } },
      ] };
    case 'reshape':
      return { states: [
        base('a.shape → (3, 4)'),
        { rows: 2, cols: 6, place: rowMajor(6), value: text, caption: 'a.reshape(2, 6): same 12, new rows' },
        { rows: 4, cols: 3, place: rowMajor(3), value: text, caption: 'a.reshape(4, 3)' },
      ], still: 1 };
    case 'reshape-minus-one':
      return { states: [
        base('a.shape → (3, 4)'),
        { rows: 6, cols: 2, place: rowMajor(2), value: text, tone: () => 'lit', caption: 'a.reshape(6, -1) → 12 / 6 = 2 columns' },
      ], still: 1 };
    case 'ravel':
    case 'flatten':
      return { states: [
        base('a.shape → (3, 4)'),
        { rows: 1, cols: 12, place: rowMajor(12), value: text, tone: () => 'lit',
          caption: highlight === 'ravel' ? 'a.ravel() → (12,), a view when it can' : 'a.flatten() → (12,), always a copy' },
      ], cellWidth: 20, still: 1 };
    case 'transpose':
      return { states: [
        base('a.shape → (3, 4)', { tone: litWhere((i) => i < 4) }),
        { rows: 4, cols: 3, place: (i) => ({ r: i % 4, c: Math.floor(i / 4) }), value: text,
          tone: litWhere((i) => i < 4), caption: 'a.T → shape (4, 3): row 0 is now column 0' },
      ], still: 1 };
    case 'concatenate':
    case 'stack': {
      // Two (2, 3) arrays: a holds 0–5 and b holds 6–11. a lives in cells 6–11
      // and b in cells 0–5 so that a, drawn later, sits in front when stacked:
      // cells paint in index order, and np.stack puts a at index 0.
      const isA = (i: number): boolean => i >= 6;
      const slot = (i: number): number => i % 6; // position within its own array
      const value = (i: number): string => String(isA(i) ? i - 6 : i + 6);
      const tone = (i: number): Tone => (isA(i) ? 'lit' : 'alt');
      const inArray = (i: number): Place => ({ r: Math.floor(slot(i) / 3), c: slot(i) % 3 });
      const apart: CellState = {
        rows: 2, cols: 7, value, tone, caption: 'a and b: shape (2, 3) each',
        place: (i) => ({ r: inArray(i).r, c: inArray(i).c + (isA(i) ? 0 : 4) }),
      };
      if (highlight === 'stack') {
        return { states: [apart, {
          rows: 2, cols: 3, value, tone, caption: 'np.stack([a, b]) → (2, 2, 3): a new axis 0',
          place: (i) => ({ ...inArray(i), layer: isA(i) ? 0 : 1 }),
        }], still: 1 };
      }
      return { states: [apart,
        { rows: 4, cols: 3, value, tone, caption: 'np.concatenate([a, b]) → (4, 3)',
          place: (i) => ({ r: inArray(i).r + (isA(i) ? 0 : 2), c: inArray(i).c }) },
        { rows: 2, cols: 6, value, tone, caption: 'np.concatenate([a, b], axis=1) → (2, 6)',
          place: (i) => ({ r: inArray(i).r, c: inArray(i).c + (isA(i) ? 0 : 3) }) },
      ], still: 1 };
    }
    case 'where':
      return { states: [
        base('a > 5', { tone: litWhere((i) => i > 5) }),
        base('np.where(a > 5, a, 0)', { value: (i) => (i > 5 ? text(i) : '0'), tone: litWhere((i) => i > 5) }),
      ], still: 1 };
    case 'clip':
      return { states: [
        base('a'),
        base('np.clip(a, 3, 8): below 3 → 3, above 8 → 8', {
          value: (i) => String(Math.min(8, Math.max(3, i))), tone: litWhere((i) => i < 3 || i > 8),
        }),
      ], still: 1 };
    default:
      return { states: [base('a = np.arange(12).reshape(3, 4)')] };
  }
}

export function arrayGrid(figure: Figure): HTMLElement {
  const sequence = arrayGridStates(figure.highlight ?? 'ndarray', figure);
  return cellFigure({
    count: sequence.count ?? 12,
    states: sequence.states,
    still: sequence.still,
    cellWidth: sequence.cellWidth,
    label: 'An array drawn as a grid of cells.',
  });
}

/* ── axis-sweep ────────────────────────────────────────────────────────────
   A reduction collapses one axis. The grid's cells slide along that axis into a
   single row (axis 0) or column (axis 1) and the results take their place. The
   values are scrambled so max and argmax have something to find. */

const SWEEP = [3, 7, 1, 4, 9, 2, 8, 5, 6, 0, 11, 10];
const REDUCE: Record<string, (values: number[]) => number> = {
  sum: (v) => v.reduce((a, b) => a + b, 0),
  mean: (v) => v.reduce((a, b) => a + b, 0) / v.length,
  max: (v) => Math.max(...v),
  argmax: (v) => v.indexOf(Math.max(...v)),
};

function reduceAlong(axis: number, op: string): number[] {
  const reduce = REDUCE[op] ?? REDUCE.sum!;
  const lines = axis === 0
    ? [0, 1, 2, 3].map((c) => [0, 1, 2].map((r) => SWEEP[r * 4 + c]!))
    : [0, 1, 2].map((r) => SWEEP.slice(r * 4, r * 4 + 4));
  return lines.map(reduce);
}

export function axisSweep(figure: Figure): HTMLElement {
  if (figure.op === 'matmul') return matmul();
  const axis = figure.axis === 1 ? 1 : 0;
  const op = figure.op ?? 'sum';
  const keep = figure.keepdims === true;
  const results = reduceAlong(axis, op).map((v) => (op === 'mean' ? floatText(v) : String(v)));
  const isSource = (i: number): boolean => i < 12;
  const value = (i: number): string => (isSource(i) ? String(SWEEP[i]) : results[i - 12] ?? '');
  // The result lands past the end of the axis it collapsed: under the grid for
  // axis 0; for axis 1, to the right as a column when keepdims keeps it 2-D,
  // and as a flat row under the grid when it doesn't.
  const resultPlace = (k: number): Place => {
    if (axis === 0) return { r: 4, c: k };
    return keep ? { r: k, c: 5 } : { r: 4, c: k };
  };
  // Before it appears, each result waits (invisible) on the last cell of the
  // line it sums, so it slides out of the grid as it fades in.
  const startPlace = (k: number): Place => (axis === 0 ? { r: 2, c: k, hidden: true } : { r: k, c: 3, hidden: true });
  const shape = axis === 0 ? (keep ? '(1, 4)' : '(4,)') : (keep ? '(3, 1)' : '(3,)');
  const call = `a.${op}(axis=${axis}${keep ? ', keepdims=True' : ''})`;
  const lineOf = (i: number): number => (axis === 0 ? i % 4 : Math.floor(i / 4));
  const states: CellState[] = [
    { rows: 5, cols: 6, value, overlay: axis === 0 ? 'axis0' : 'axis1',
      place: (i) => (isSource(i) ? grid34(i) : startPlace(i - 12)),
      caption: `a, shape (3, 4): reduce along axis ${axis}` },
    ...[0, 1, 2, 3].slice(0, axis === 0 ? 4 : 3).map((line): CellState => ({
      rows: 5, cols: 6, value, holdMs: 700,
      place: (i) => (isSource(i) ? grid34(i) : i - 12 <= line ? resultPlace(i - 12) : startPlace(i - 12)),
      tone: (i) => (isSource(i) ? (lineOf(i) === line ? 'alt' : 'dim') : 'lit'),
      caption: `${call} …`,
    })),
    { rows: 5, cols: 6, value, place: (i) => (isSource(i) ? grid34(i) : resultPlace(i - 12)),
      tone: (i) => (isSource(i) ? 'dim' : 'lit'), caption: `${call} → shape ${shape}` },
  ];
  return cellFigure({ count: 12 + results.length, states, still: states.length - 1,
    cellWidth: op === 'mean' ? 32 : CELL_W, label: 'A grid collapsing along one axis into its result.' });
}

// (2, 3) @ (3, 2): each result cell is one row of A times one column of B,
// multiplied pairwise and summed — a reduction over the shared axis.
function matmul(): HTMLElement {
  const left = [1, 2, 3, 4, 5, 6]; // A, (2, 3)
  const right = [1, 0, 0, 1, 1, 1]; // B, (3, 2)
  const product = [0, 1, 2, 3].map((k) => {
    const r = Math.floor(k / 2);
    const c = k % 2;
    return [0, 1, 2].reduce((sum, j) => sum + left[r * 3 + j]! * right[j * 2 + c]!, 0);
  });
  const value = (i: number): string => {
    if (i < 6) return String(left[i]);
    if (i < 12) return String(right[i - 6]);
    return String(product[i - 12]);
  };
  const place = (i: number): Place => {
    if (i < 6) return { r: 1 + Math.floor(i / 3), c: i % 3 };
    if (i < 12) return { r: Math.floor((i - 6) / 2), c: 4 + ((i - 6) % 2) };
    return { r: 1 + Math.floor((i - 12) / 2), c: 7 + ((i - 12) % 2) };
  };
  const states: CellState[] = [0, 1, 2, 3].map((k) => {
    const r = Math.floor(k / 2);
    const c = k % 2;
    return {
      rows: 3, cols: 9, value, place: (i) => (i >= 12 && i - 12 > k ? null : place(i)),
      tone: (i): Tone => {
        if (i < 6) return Math.floor(i / 3) === r ? 'lit' : '';
        if (i < 12) return (i - 6) % 2 === c ? 'alt' : '';
        return i - 12 === k ? 'lit' : '';
      },
      caption: `A @ B: row ${r} of A · column ${c} of B → ${product[k]}`,
    };
  });
  return cellFigure({ count: 16, states, still: 3,
    label: 'Matrix multiplication: a (2, 3) array times a (3, 2) array gives a (2, 2) array.' });
}

/* ── broadcast ─────────────────────────────────────────────────────────────
   a (3, 4) + b (4,): b's cells stretch (as ghost copies) down every row until
   the shapes match; then the sum lands. `vectorize` and `ufunc` reuse the grid
   for the two ideas broadcasting rests on. */

const ROW = [10, 20, 30, 40]; // b

export function broadcast(figure: Figure): HTMLElement {
  const mode = figure.highlight ?? 'row';
  if (mode === 'vectorize') return vectorize();
  if (mode === 'ufunc') return ufunc();
  // Cells 0–11 are a, 12–23 one ghost of b per cell of a, 24–27 b itself.
  const below = (k: number): Place => ({ r: 4, c: k });
  const value = (i: number): string => {
    if (i < 12) return String(A[i]);
    if (i < 24) return String(ROW[(i - 12) % 4]);
    return String(ROW[i - 24]);
  };
  const sum = (i: number): string => (i < 12 ? String(A[i]! + ROW[i % 4]!) : value(i));
  const states: CellState[] = [
    { rows: 5, cols: 4, value, place: (i) => (i < 12 ? grid34(i) : i < 24 ? below((i - 12) % 4) : below(i - 24)),
      tone: (i) => (i >= 24 ? 'alt' : ''), caption: 'a (3, 4) + b (4,)' },
    { rows: 5, cols: 4, value, place: (i) => (i < 12 ? grid34(i) : i < 24 ? grid34(i - 12) : below(i - 24)),
      tone: (i) => (i < 12 ? 'dim' : i < 24 ? 'ghost' : 'alt'), caption: 'b stretches to (3, 4)' },
    { rows: 5, cols: 4, value: sum, place: (i) => (i < 12 ? grid34(i) : null),
      tone: () => 'lit', caption: 'a + b → shape (3, 4)' },
  ];
  return cellFigure({ count: 28, states, still: 1, cellWidth: 26,
    label: 'Broadcasting: a smaller array stretched to match a larger one.' });
}

// A Python loop touches one value per step; a vectorized expression hands the
// whole array to compiled code in one call.
function vectorize(): HTMLElement {
  const loop: CellState[] = A.map((k) => base('for loop: one value at a time', {
    value: (i) => (i < k ? String(A[i]! * 2) : text(i)), tone: litWhere((i) => i === k), holdMs: 260,
  }));
  const whole = base('a * 2: every value in one call', { value: (i) => String(A[i]! * 2), tone: () => 'lit', holdMs: 2400 });
  const reset = base('a', { holdMs: 1200 });
  return cellFigure({ count: 12, states: [reset, ...loop, whole], still: 13,
    label: 'A loop over each value compared with one vectorized operation.' });
}

function ufunc(): HTMLElement {
  return cellFigure({
    count: 12,
    cellWidth: 26,
    still: 1,
    label: 'A ufunc applied to every value of an array.',
    states: [base('a'), base('np.square(a): each value on its own', { value: (i) => String(A[i]! ** 2), tone: () => 'lit' })],
  });
}

/* ── view-copy ─────────────────────────────────────────────────────────────
   Two names and the memory they point at. A view shares a's cells; a copy gets
   its own. Writing through b shows which one you have. */

function nameTag(canvas: SVGSVGElement, name: string, x: number, y: number, toX: number, toY: number): SVGGElement {
  const group = svg('g');
  group.setAttribute('class', 'fig-py-tag');
  const line = svg('path');
  attrs(line, { d: `M ${x + 8} ${y} L ${toX} ${toY}`, fill: 'none' });
  line.setAttribute('class', 'fig-py-tag__line');
  group.append(line, centredLabel(x, y, 'fig-py-tag__label', name));
  canvas.appendChild(group);
  return group;
}

export function viewCopy(figure: Figure): HTMLElement {
  const mode = figure.highlight ?? 'view';
  const small = [0, 1, 2, 3, 4, 5]; // a = np.arange(6).reshape(2, 3)
  const isCopy = mode !== 'view';
  const top = { x: 110, y: 8 };
  const bottom = { x: 110, y: top.y + 3 * CELL_H };
  const value = (written: boolean) => (i: number): string => {
    if (written && i === 6) return '99';
    if (written && !isCopy && i === 0) return '99';
    return String(small[i % 6]);
  };
  // Cells 0–5 are a's memory; 6–11 are b's own memory, drawn only for a copy.
  const place = (showB: boolean) => (i: number): Place | null => {
    if (i < 6) return { r: Math.floor(i / 3), c: i % 3 };
    if (!isCopy || !showB) return null;
    return { r: 3 + Math.floor((i - 6) / 3), c: (i - 6) % 3 };
  };
  const inB = (i: number): boolean => (isCopy ? i >= 6 : i % 3 < 2);
  const code = mode === 'view' ? 'b = a[:, :2]' : mode === 'copy' ? 'b = a[:, :2].copy()' : 'b = np.load("a.npy")';
  const first = mode === 'save' ? 'np.save("a.npy", a)' : code;
  const states: CellState[] = [
    { rows: 2, cols: 3, origin: top, value: value(false), place: place(false), caption: 'a = np.arange(6).reshape(2, 3)' },
    { rows: 2, cols: 3, origin: top, value: value(false), place: place(true),
      tone: (i) => (inB(i) ? 'alt' : ''), caption: mode === 'save' ? `${first}, then ${code}` : code },
    { rows: 2, cols: 3, origin: top, value: value(true), place: place(true),
      tone: (i) => (i === 0 || i === 6 ? 'lit' : inB(i) ? 'alt' : ''),
      caption: isCopy ? 'b[0, 0] = 99 → a[0, 0] is still 0' : 'b[0, 0] = 99 → a[0, 0] is 99 too' },
  ];
  // b's cells in a copy are packed into two columns, like the slice they copy.
  if (isCopy && mode !== 'save') {
    for (const state of states) {
      const shown = state.place;
      state.place = (i) => (i >= 6 && i % 3 === 2 ? null : shown(i));
    }
  }
  const decorate = (canvas: SVGSVGElement) => {
    nameTag(canvas, 'a', 50, top.y + CELL_H, top.x - 2, top.y + CELL_H);
    const tagB = nameTag(canvas, 'b', 50, bottom.y + CELL_H, isCopy ? bottom.x - 2 : top.x - 2,
      isCopy ? bottom.y + CELL_H : top.y + CELL_H + 8);
    const file = svg('g');
    file.setAttribute('class', 'fig-py-file');
    const sheet = svg('path');
    attrs(sheet, { d: 'M 196 34 h 24 l 9 9 v 27 h -33 z', fill: 'none' });
    file.append(sheet, centredLabel(212, 56, 'fig-py-file__label', 'a.npy'));
    canvas.appendChild(file);
    return (state: number): void => {
      tagB.classList.toggle('is-hidden', state === 0);
      file.classList.toggle('is-hidden', mode !== 'save' || state === 0);
    };
  };
  return cellFigure({ count: 12, states, still: 2, height: 5 * CELL_H + 16,
    label: isCopy ? 'Two names, two separate arrays.' : 'Two names pointing at one array.', decorate });
}
