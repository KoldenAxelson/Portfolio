/* The search — one engine, driven at two speeds.
 *
 * There is deliberately no "fast solver" and no "show solver" here. There is a
 * single backtracking search that advances exactly one move per step(). The
 * instant button drains it in a loop; the animated one pumps it a few moves per
 * frame. Same code, same move sequence, same answer — only the pacing differs.
 *
 * The search is written with an explicit stack instead of recursion for exactly
 * that reason: a recursive solver can only run to completion, so wanting to
 * watch it would mean writing it a second time.
 *
 * Subclasses add extra pruning by overriding viable(); everything else — the
 * stack, the pacing, the statistics — is shared. See support.ts.
 */

import { CELLS, SIZE } from './inventory';
import { Board, EMPTY } from './board';

export type Status = 'running' | 'solved' | 'exhausted';

/** What a single step() did, so a view can animate it. */
export interface Move {
  kind: 'place' | 'lift' | 'solved' | 'exhausted';
  /** Square affected, or -1 for the terminal moves. */
  cell: number;
  /** Block kind involved, or -1 for the terminal moves. */
  block: number;
}

export interface SearchOptions {
  /** 'mrv' picks the square with the fewest legal blocks left; 'scan' just
   *  walks the board in reading order. */
  order: 'mrv' | 'scan';
  /** Pin row 1 and column 1 to the numbers 1..6 in order.
   *
   *  Shuffling whole rows or whole columns turns any solution into another
   *  solution, so the raw search space contains 6! x 6! copies of every genuine
   *  answer. Demanding a canonical arrangement up front throws all of those
   *  duplicates away before the search starts, and costs nothing: the original
   *  Python did the same sort *after* solving, purely for display. */
  canonical: boolean;
}

export const DEFAULT_OPTIONS: SearchOptions = { order: 'mrv', canonical: true };

/** One level of the search: a square, the blocks worth trying on it, and how
 *  far down that list we've got. */
interface Frame {
  cell: number;
  opts: number[];
  idx: number;
}

export interface Stats {
  /** Blocks laid down, including ones later taken back. Every placement leads
   *  to exactly one new square being chosen, so this doubles as the node count
   *  of the search tree — there is no second number worth reporting. */
  placements: number;
  /** Blocks taken back. */
  backtracks: number;
  /** Milliseconds actually spent searching, excluding time spent painting. */
  ms: number;
}

export class Search {
  readonly board: Board;
  readonly options: SearchOptions;
  readonly stats: Stats = { placements: 0, backtracks: 0, ms: 0 };
  status: Status = 'running';

  protected frames: Frame[] = [];
  /** Blocks already on the board when this search took over. A search can be
   *  handed a partly-filled board — a seeded first row, or a position a person
   *  got stuck in — and must not mistake those blocks for its own. */
  private baseline: number;

  constructor(board: Board, options: Partial<SearchOptions> = {}) {
    this.board = board;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.baseline = board.filled;
  }

  /** Empties the board completely. A caller that seeded a position before
   *  handing it over has to seed it again afterwards. */
  reset(): void {
    this.board.reset();
    this.baseline = 0;
    this.frames = [];
    this.status = 'running';
    this.stats.placements = 0;
    this.stats.backtracks = 0;
    this.stats.ms = 0;
  }

  /** Advance the search by one move. Returns null once it has finished. */
  step(): Move | null {
    if (this.status !== 'running') return null;

    // Every frame owns exactly one block on the board once it has placed one,
    // so an equal count means the deepest square still needs choosing. Blocks
    // that were already there when the search started don't belong to a frame.
    if (this.frames.length === this.board.filled - this.baseline) {
      const frame = this.select();
      if (frame === null) {
        this.status = 'solved';
        return { kind: 'solved', cell: -1, block: -1 };
      }
      this.frames.push(frame);
    }

    const top = this.frames[this.frames.length - 1];

    // Try options until one survives viable(). The base search never rejects,
    // so this loop runs exactly once per step and behaves identically to a
    // plain if — subclasses are what make it loop.
    while (top.idx < top.opts.length) {
      const block = top.opts[top.idx++];
      this.board.place(top.cell, block);
      this.stats.placements++;
      if (!this.viable()) {
        this.board.lift(top.cell);
        this.stats.backtracks++;
        continue;
      }
      if (this.board.filled === CELLS) {
        this.status = 'solved';
        return { kind: 'solved', cell: top.cell, block };
      }
      return { kind: 'place', cell: top.cell, block };
    }

    // This square has nothing left to try: drop it and take back the block that
    // led here. Undoing is a plain lift() — the board carries no pruned state
    // that could fail to be restored.
    this.frames.pop();
    const parent = this.frames[this.frames.length - 1];
    if (parent === undefined) {
      this.status = 'exhausted';
      return { kind: 'exhausted', cell: -1, block: -1 };
    }
    const block = this.board.lift(parent.cell);
    this.stats.backtracks++;
    return { kind: 'lift', cell: parent.cell, block };
  }

  /** Run up to `budget` moves. Both drivers are this one method: the instant
   *  solver passes no budget, the animated one passes a handful per frame. */
  run(budget = 20000000): Status {
    const started = now();
    let taken = 0;
    while (this.status === 'running' && taken < budget) {
      this.step();
      taken++;
    }
    this.stats.ms += now() - started;
    return this.status;
  }

  /** The square the most recent placement went on, or -1 if none. Subclasses
   *  use this to scope their pruning to what actually changed. */
  protected lastCell(): number {
    const top = this.frames[this.frames.length - 1];
    return top === undefined ? -1 : top.cell;
  }

  /** Called after each placement. Returning false rejects the block without
   *  descending into it. The base search accepts everything — its only pruning
   *  is the dead-end square that select() hands back. */
  protected viable(): boolean {
    return true;
  }

  /** Choose the next square and the blocks worth trying on it, or null when the
   *  board is full. */
  protected select(): Frame | null {
    const board = this.board;
    if (this.options.order === 'scan') {
      for (let cell = 0; cell < CELLS; cell++) {
        if (board.cells[cell] === EMPTY) return { cell, opts: this.optionsFor(cell), idx: 0 };
      }
      return null;
    }

    let best: Frame | null = null;
    for (let cell = 0; cell < CELLS; cell++) {
      if (board.cells[cell] !== EMPTY) continue;
      const opts = this.optionsFor(cell);
      if (best === null || opts.length < best.opts.length) {
        best = { cell, opts, idx: 0 };
        // A square with one option is forced and one with none is a dead end;
        // neither can be beaten, so stop looking. Returning a dead-end square
        // is how the search notices a doomed branch immediately instead of
        // filling in five more squares first.
        if (opts.length <= 1) break;
      }
    }
    return best;
  }

  protected optionsFor(cell: number): number[] {
    const opts = this.board.candidates(cell);
    if (!this.options.canonical) return opts;
    const row = (cell / SIZE) | 0;
    const col = cell % SIZE;
    if (row !== 0 && col !== 0) return opts;
    // Row 1 reads 1..6 left to right; column 1 reads 1..6 top to bottom. The
    // corner wants a 1 under either rule, so the two never conflict.
    const wanted = row === 0 ? col + 1 : row + 1;
    return opts.filter((kind) => this.board.kinds[kind].n === wanted);
  }
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
