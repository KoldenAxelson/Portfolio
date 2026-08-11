/* Board state — the rules of the puzzle, and nothing else.
 *
 * No DOM, no search strategy, no animation. Everything above this file (the
 * search, the renderer, the widget) leans on these few operations, which is
 * what lets one search engine drive both the instant and the animated solver.
 *
 * Rows and columns are tracked as 6-bit masks rather than Sets, so "has this
 * row already used a 4?" is a single bitwise AND. Placing and lifting a block
 * are exact inverses, which is the property the original Python version got
 * wrong: it pruned candidate values on the way down and never restored them on
 * the way back up, so backtracking quietly destroyed the search space.
 */

import { CELLS, SIZE } from './inventory';
import type { Kind } from './inventory';

/** Sentinel stored in `cells` for a square with no block on it. */
export const EMPTY = -1;

/** A line is a row or a column; ROWS and COLS name the two axes so callers
 *  read as English rather than as `axis === 0`. */
export const ROWS = 0;
export const COLS = 1;
export type Axis = typeof ROWS | typeof COLS;

/** The flat index of the `offset`th square along line `index` of `axis`.
 *
 *  Every rule in this puzzle is a statement about one of twelve lines, so this
 *  one expression is the whole geometry. It used to be open-coded at each call
 *  site, which is how the two nested sweeps below drifted into different shapes
 *  while computing the same thing. */
export function lineCell(index: number, offset: number, axis: Axis): number {
  return axis === ROWS ? index * SIZE + offset : offset * SIZE + index;
}

export class Board {
  readonly kinds: readonly Kind[];
  /** Index into `kinds` for each of the 36 squares, or EMPTY. */
  readonly cells: Int32Array;
  /** How many blocks of each kind are still in the box. */
  readonly remaining: Int32Array;
  /** Squares currently covered. */
  filled = 0;

  private readonly rowNums = new Int32Array(SIZE);
  private readonly colNums = new Int32Array(SIZE);
  private readonly rowColors = new Int32Array(SIZE);
  private readonly colColors = new Int32Array(SIZE);

  constructor(kinds: readonly Kind[]) {
    this.kinds = kinds;
    this.cells = new Int32Array(CELLS);
    this.remaining = new Int32Array(kinds.length);
    this.reset();
  }

  reset(): void {
    this.cells.fill(EMPTY);
    for (let k = 0; k < this.kinds.length; k++) this.remaining[k] = this.kinds[k].count;
    this.rowNums.fill(0);
    this.colNums.fill(0);
    this.rowColors.fill(0);
    this.colColors.fill(0);
    this.filled = 0;
  }

  /** Would this block be legal here, given the board so far and the box? */
  accepts(cell: number, kind: number): boolean {
    if (this.remaining[kind] <= 0) return false;
    const block = this.kinds[kind];
    const row = (cell / SIZE) | 0;
    const col = cell % SIZE;
    const n = 1 << block.n;
    const c = 1 << block.c;
    return (
      (this.rowNums[row] & n) === 0 &&
      (this.colNums[col] & n) === 0 &&
      (this.rowColors[row] & c) === 0 &&
      (this.colColors[col] & c) === 0
    );
  }

  place(cell: number, kind: number): void {
    const block = this.kinds[kind];
    const row = (cell / SIZE) | 0;
    const col = cell % SIZE;
    this.rowNums[row] |= 1 << block.n;
    this.colNums[col] |= 1 << block.n;
    this.rowColors[row] |= 1 << block.c;
    this.colColors[col] |= 1 << block.c;
    this.remaining[kind]--;
    this.cells[cell] = kind;
    this.filled++;
  }

  /** The exact inverse of place(). */
  lift(cell: number): number {
    const kind = this.cells[cell];
    if (kind === EMPTY) return EMPTY;
    const block = this.kinds[kind];
    const row = (cell / SIZE) | 0;
    const col = cell % SIZE;
    this.rowNums[row] &= ~(1 << block.n);
    this.colNums[col] &= ~(1 << block.n);
    this.rowColors[row] &= ~(1 << block.c);
    this.colColors[col] &= ~(1 << block.c);
    this.remaining[kind]++;
    this.cells[cell] = EMPTY;
    this.filled--;
    return kind;
  }

  /** Every block kind that could legally go on this square right now. */
  candidates(cell: number, out: number[] = []): number[] {
    out.length = 0;
    for (let k = 0; k < this.kinds.length; k++) {
      if (this.accepts(cell, k)) out.push(k);
    }
    return out;
  }

  /** What is wrong with the board *so far*, ignoring the squares still empty.
   *  A partly-filled board is not a solution, but it need not be broken either,
   *  and a person laying blocks out wants to know which of the two they are in.
   *  Only reports duplicates among the blocks actually placed. */
  conflicts(): string[] {
    const found: string[] = [];
    for (const [index, axis] of everyLine()) found.push(...this.conflictsInLine(index, axis));
    return found;
  }

  private conflictsInLine(index: number, axis: Axis): string[] {
    const found: string[] = [];
    const where = `${axis === ROWS ? 'row' : 'column'} ${index + 1}`;
    let numbers = 0;
    let colors = 0;
    for (let offset = 0; offset < SIZE; offset++) {
      const kind = this.cells[lineCell(index, offset, axis)];
      if (kind === EMPTY) continue;
      const numberBit = 1 << this.kinds[kind].n;
      const colorBit = 1 << this.kinds[kind].c;
      if (numbers & numberBit) found.push(`${where} repeats a number`);
      if (colors & colorBit) found.push(`${where} repeats a color`);
      numbers |= numberBit;
      colors |= colorBit;
    }
    return found;
  }

  /** The squares taking part in a repeat, so a view can point straight at them.
   *  Both squares holding a duplicated number are marked, not just the later
   *  one — neither is more wrong than the other. */
  conflictCells(): number[] {
    const bad = new Set<number>();
    for (const [index, axis] of everyLine()) this.markRepeatsInLine(index, axis, bad);
    return Array.from(bad).sort((a, b) => a - b);
  }

  private markRepeatsInLine(index: number, axis: Axis, bad: Set<number>): void {
    const byNumber = new Map<number, number[]>();
    const byColor = new Map<number, number[]>();
    for (let offset = 0; offset < SIZE; offset++) {
      const cell = lineCell(index, offset, axis);
      const kind = this.cells[cell];
      if (kind === EMPTY) continue;
      const block = this.kinds[kind];
      groupPush(byNumber, block.n, cell);
      groupPush(byColor, block.c, cell);
    }
    for (const grouped of [byNumber, byColor]) {
      for (const cells of grouped.values()) {
        if (cells.length < 2) continue;
        for (const cell of cells) bad.add(cell);
      }
    }
  }

  /** Re-check a finished board from scratch: rows, columns, and that the blocks
   *  used are exactly the ones in the box. Used by the tests and by the widgets
   *  before either claims to have solved anything. */
  problems(): string[] {
    if (this.filled !== CELLS) return ['board is incomplete'];
    const problems = this.conflicts();
    const tally = new Int32Array(this.kinds.length);
    for (let cell = 0; cell < CELLS; cell++) tally[this.cells[cell]]++;
    for (let k = 0; k < this.kinds.length; k++) {
      if (tally[k] !== this.kinds[k].count) {
        problems.push(`used ${tally[k]} of block kind ${k}, the box holds ${this.kinds[k].count}`);
      }
    }
    return problems;
  }
}

/** The twelve lines of the board, six rows then six columns. */
export function* everyLine(): Generator<[number, Axis]> {
  for (let index = 0; index < SIZE; index++) {
    yield [index, ROWS];
    yield [index, COLS];
  }
}

/** Append to the list under `key`, creating it on first use. Spelled out rather
 *  than folded into one `??`-and-`!` expression, which read worse than the
 *  nesting it was avoiding. */
function groupPush<K>(grouped: Map<K, number[]>, key: K, cell: number): void {
  const cells = grouped.get(key);
  if (cells) cells.push(cell);
  else grouped.set(key, [cell]);
}
