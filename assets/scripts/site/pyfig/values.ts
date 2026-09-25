// The py-values family: Chapter 1's plain Python values drawn with the cells
// engine. One row of boxes, xs, that a list keeps, a set thins out, a
// comprehension maps, a generator hands out one at a time, and unpacking or a
// *args call splits between names. Each glossary term picks a `highlight`.
import type { Figure } from '../def-figures';
import { centredLabel } from '../figure-kit';
import type { CellState, Place, Tone } from './cells';
import { CELL_H, cellFigure, gridOrigin } from './cells';

type Sequence = { states: CellState[]; count: number; still: number; cellWidth: number; label: string; tags?: Tag[] };
/** A name written above a cell, shown from `fromState` on. */
type Tag = { text: string; r: number; c: number; fromState: number };

const XS = [3, 1, 3, 2];
const row = (c: number, r = 0): Place => ({ r, c });
const litOnly = (lit: number[]) => (i: number): Tone => (lit.includes(i) ? 'lit' : '');

function listStates(): Sequence {
  const value = (i: number): string => String([...XS, 5][i]);
  const place = (shown: number) => (i: number): Place => ({ ...row(i), hidden: i >= shown });
  return { count: 5, cellWidth: 26, still: 2, label: 'A list: values in order, repeats kept.', states: [
    { rows: 1, cols: 5, value, place: place(4), caption: 'xs = [3, 1, 3, 2]: in order, repeats kept' },
    { rows: 1, cols: 5, value, place: place(4), tone: litOnly([0]), caption: 'xs[0] → 3' },
    { rows: 1, cols: 5, value, place: place(5), tone: litOnly([4]), caption: 'xs.append(5): xs is now [3, 1, 3, 2, 5]' },
  ] };
}

function setStates(): Sequence {
  const value = (i: number): string => String(XS[i]);
  // set(xs) prints {1, 2, 3}; the repeated 3 (cell 2) fades where the first 3 lands.
  const inSet: Record<number, Place> = { 1: row(0), 3: row(1), 0: row(2), 2: { ...row(2), hidden: true } };
  const asSet = (i: number): Place => inSet[i] ?? row(i);
  return { count: 4, cellWidth: 26, still: 2, label: 'A set: each value kept once.', states: [
    { rows: 1, cols: 4, value, place: row, caption: 'xs = [3, 1, 3, 2]' },
    { rows: 1, cols: 4, value, place: row, tone: (i) => (i === 2 ? 'bad' : ''), caption: 'the second 3 is a repeat' },
    { rows: 1, cols: 4, value, place: asSet, caption: 's = set(xs) → {1, 2, 3}' },
    { rows: 1, cols: 4, value, place: asSet, tone: litOnly([3]), caption: '2 in s → True' },
  ] };
}

function dictStates(): Sequence {
  // Cells 0–2 are keys (column 0), 3–5 their values (column 1).
  const keys = ["'lr'", "'epochs'", "'batch'"];
  const values = ['0.1', '5', '32'];
  const value = (i: number): string => (i < 3 ? keys[i] : values[i - 3]) ?? '';
  const pairOf = (i: number): number => i % 3;
  const place = (pairs: number) => (i: number): Place => ({ r: pairOf(i), c: i < 3 ? 0 : 1, hidden: pairOf(i) >= pairs });
  const tone = (litPair: number) => (i: number): Tone => (pairOf(i) === litPair ? 'lit' : i < 3 ? 'alt' : '');
  return { count: 6, cellWidth: 60, still: 2, label: 'A dict: each key paired with a value.', states: [
    { rows: 3, cols: 2, value, place: place(2), tone: tone(-1), caption: "d = {'lr': 0.1, 'epochs': 5}" },
    { rows: 3, cols: 2, value, place: place(2), tone: tone(0), caption: "d['lr'] → 0.1: looked up by key" },
    { rows: 3, cols: 2, value, place: place(3), tone: tone(2), caption: "d['batch'] = 32 adds a pair" },
  ] };
}

// xs = [1, 2, 3, 4] in cells 0–3; x * x for each in cells 4–7, two rows down.
const SQUARE_XS = [1, 2, 3, 4];
const squareValue = (i: number): string => String(i < 4 ? SQUARE_XS[i] : SQUARE_XS[i - 4]! ** 2);
const waiting = (k: number): Place => ({ r: 0, c: k, hidden: true });
const landed = (k: number): Place => row(k, 2);

function comprehensionStates(): Sequence {
  const done = (made: number) => (i: number): Place => (i < 4 ? row(i) : i - 4 < made ? landed(i - 4) : waiting(i - 4));
  const building = SQUARE_XS.map((x, k): CellState => ({
    rows: 3, cols: 4, value: squareValue, place: done(k + 1), holdMs: 900,
    tone: (i) => (i === k ? 'alt' : i >= 4 ? 'lit' : 'dim'), caption: `x = ${x} → x * x = ${x * x}`,
  }));
  return { count: 8, cellWidth: 26, still: 5, label: 'A comprehension: a new list made from each value of another.', states: [
    { rows: 3, cols: 4, value: squareValue, place: done(0), caption: 'xs = [1, 2, 3, 4]' },
    ...building,
    { rows: 3, cols: 4, value: squareValue, place: done(4), tone: (i) => (i < 4 ? 'dim' : 'lit'),
      caption: '[x * x for x in xs] → [1, 4, 9, 16]' },
  ] };
}

function generatorStates(): Sequence {
  // A value exists only once it is asked for, and a generator keeps none it has handed out.
  const at = (shown: number[], gone: number[]) => (i: number): Place => {
    if (i < 4) return row(i);
    const k = i - 4;
    if (shown.includes(k)) return landed(k);
    return gone.includes(k) ? { ...landed(k), hidden: true } : waiting(k);
  };
  const tone = (read: number[]) => (i: number): Tone => (i >= 4 ? 'lit' : read.includes(i) ? 'alt' : 'dim');
  return { count: 8, cellWidth: 26, still: 2, label: 'A generator: values made one at a time, on request.', states: [
    { rows: 3, cols: 4, value: squareValue, place: at([], []), caption: 'g = (x * x for x in xs): nothing computed yet' },
    { rows: 3, cols: 4, value: squareValue, place: at([0], []), tone: tone([0]), caption: 'next(g) → 1' },
    { rows: 3, cols: 4, value: squareValue, place: at([1], [0]), tone: tone([1]), caption: 'next(g) → 4; the 1 is not kept' },
    { rows: 3, cols: 4, value: squareValue, place: at([2, 3], [0, 1]), tone: tone([2, 3]), caption: 'list(g) → [9, 16]: the rest' },
    { rows: 3, cols: 4, value: squareValue, place: at([], [0, 1, 2, 3]), tone: tone([]), caption: 'list(g) again → []: used up' },
  ] };
}

function unpackingStates(): Sequence {
  const value = (i: number): string => String(XS[i]);
  const split = (i: number): Place => (i === 0 ? row(0, 1) : row(i + 1, 1));
  return { count: 4, cellWidth: 26, still: 1, label: 'Unpacking: one sequence split between names.',
    tags: [{ text: 'first', r: 1, c: 0, fromState: 1 }, { text: '*rest', r: 1, c: 3, fromState: 1 }], states: [
      { rows: 2, cols: 5, value, place: (i) => row(i + 1), caption: 'first, *rest = [3, 1, 3, 2]' },
      { rows: 2, cols: 5, value, place: split, tone: (i) => (i === 0 ? 'lit' : 'alt'), caption: 'first → 3, rest → [1, 3, 2]' },
    ] };
}

function argsStates(): Sequence {
  const inCall = ['1', '2', 'lr=0.1'];
  const inBody = ['1', '2', "'lr': 0.1"];
  const split = (i: number): Place => row(i < 2 ? i : 3, 1);
  return { count: 3, cellWidth: 58, still: 1, label: 'A call’s arguments gathered into *args and **kwargs.',
    tags: [{ text: 'args', r: 1, c: 0.5, fromState: 1 }, { text: 'kwargs', r: 1, c: 3, fromState: 1 }], states: [
      { rows: 2, cols: 4, value: (i) => inCall[i] ?? '', place: (i) => row(i + 0.5), caption: 'def f(*args, **kwargs), called f(1, 2, lr=0.1)' },
      { rows: 2, cols: 4, value: (i) => inBody[i] ?? '', place: split, tone: (i) => (i < 2 ? 'alt' : 'lit'),
        caption: "args → (1, 2), kwargs → {'lr': 0.1}" },
    ] };
}

const SEQUENCES: Record<string, () => Sequence> = {
  list: listStates,
  set: setStates,
  dict: dictStates,
  comprehension: comprehensionStates,
  generator: generatorStates,
  unpacking: unpackingStates,
  args: argsStates,
};

// A name above a cell, fading in with the state that puts cells under it.
function tagPainter(tags: Tag[], states: CellState[], cellWidth: number, height: number) {
  return (canvas: SVGSVGElement) => {
    const labels = tags.map((tag) => {
      const state = states[tag.fromState]!;
      const origin = gridOrigin(state, cellWidth, height);
      const label = centredLabel(origin.x + (tag.c + 0.5) * cellWidth, origin.y + tag.r * CELL_H - 7, 'fig-py-tag__label', tag.text);
      label.classList.add('fig-py-tag');
      canvas.appendChild(label);
      return label;
    });
    return (state: number): void => {
      labels.forEach((label, k) => label.classList.toggle('is-hidden', state < tags[k]!.fromState));
    };
  };
}

export function pyValues(figure: Figure): HTMLElement {
  const sequence = (SEQUENCES[figure.highlight ?? 'list'] ?? listStates)();
  const height = Math.max(...sequence.states.map((s) => s.rows)) * CELL_H + 34;
  return cellFigure({
    count: sequence.count,
    states: sequence.states,
    still: sequence.still,
    cellWidth: sequence.cellWidth,
    height,
    label: sequence.label,
    decorate: sequence.tags && tagPainter(sequence.tags, sequence.states, sequence.cellWidth, height),
  });
}
