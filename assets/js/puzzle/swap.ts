/* The swap explorer.
 *
 * No tray, no solver, no search. A finished board is handed in precomputed;
 * this only rearranges it and re-checks it from scratch each time.
 *
 * The point being demonstrated: any permutation of whole rows composed with any
 * permutation of whole columns turns a solution into another solution. Rows keep
 * their contents, so row constraints cannot break; each column receives the same
 * six blocks in a different order, so column constraints cannot either.
 *
 * The verdict is not faked. Every rearrangement is re-verified against the rules
 * and the box by Board.problems(), the same check the solver uses on its own
 * output. Individual blocks are selectable too, and swapping two of those is
 * emphatically not a row or column move — which is how a reader can see the
 * check is real rather than a tick that is always green.
 */

import { SIZE, CELLS } from './inventory';
import type { Kind } from './inventory';
import { Board, ROWS, COLS, lineCell } from './board';
import { BoardView } from './render';
import { buildMirror, mountBoxWidgets } from './boxdata';
import type { Mirror } from './boxdata';

type Axis = 'row' | 'col' | 'cell';

export class SwapWidget {
  private readonly root: HTMLElement;
  private readonly view: BoardView;
  private readonly board: Board;
  private readonly start: number[];
  private cells: number[];
  private armed: { axis: Axis; index: number } | null = null;
  private readonly verdict: HTMLElement | null;

  private readonly mirror: number[] | null;

  constructor(root: HTMLElement, kinds: Kind[], palette: string[], solution: number[], mirror?: Mirror) {
    this.root = root;
    this.board = new Board(kinds);
    this.mirror = mirror ? buildMirror(kinds, palette, mirror) : null;
    this.view = new BoardView(root, palette);
    this.start = solution.slice();
    this.cells = solution.slice();
    this.verdict = root.querySelector<HTMLElement>('[data-swap-verdict]');

    root.addEventListener('click', (event) => {
      const target = (event.target as Element | null)
        ?.closest<HTMLElement>('[data-swap-handle], [data-swap-action], [data-cell]');
      if (!target || !root.contains(target)) return;
      const action = target.getAttribute('data-swap-action');
      if (action) return this.act(action);
      const handle = target.getAttribute('data-swap-handle');
      if (handle) return this.pick(handle as Axis, Number(target.getAttribute('data-swap-index')));
      this.pick('cell', Number(target.getAttribute('data-cell')));
    });

    // Squares are focusable, so they have to answer the keyboard too.
    root.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const cell = (event.target as Element | null)?.closest<HTMLElement>('[data-cell]');
      if (!cell || !root.contains(cell)) return;
      event.preventDefault();
      this.pick('cell', Number(cell.getAttribute('data-cell')));
    });

    for (const el of root.querySelectorAll('[data-swap-controls]')) el.removeAttribute('hidden');
    // A mirror button with no mirror in the data would be a lie.
    if (!this.mirror) {
      for (const el of root.querySelectorAll('[data-swap-action="mirror"]')) el.remove();
    }
    this.paint(false);
  }

  private act(action: string): void {
    if (action === 'reset') {
      this.cells = this.start.slice();
      this.disarm();
      this.paint(true);
      return;
    }
    if (action === 'mirror' && this.mirror) {
      // Every block becomes the block it maps to. Applying it twice is the
      // identity, so the button is its own undo.
      this.cells = this.cells.map((kind) => this.mirror![kind]);
      this.disarm();
      this.paint(true);
    }
  }

  private pick(axis: Axis, index: number): void {
    const limit = axis === 'cell' ? CELLS : SIZE;
    if (!Number.isInteger(index) || index < 0 || index >= limit) return;
    if (this.armed && this.armed.axis === axis) {
      if (this.armed.index === index) return this.disarm();
      this.swap(axis, this.armed.index, index);
      this.disarm();
      this.paint(true);
      return;
    }
    this.armed = { axis, index };
    this.markArmed();
  }

  private swap(axis: Axis, a: number, b: number): void {
    if (axis === 'cell') {
      const held = this.cells[a];
      this.cells[a] = this.cells[b];
      this.cells[b] = held;
      return;
    }
    const lineAxis = axis === 'row' ? ROWS : COLS;
    for (let offset = 0; offset < SIZE; offset++) {
      const cellA = lineCell(a, offset, lineAxis);
      const cellB = lineCell(b, offset, lineAxis);
      const held = this.cells[cellA];
      this.cells[cellA] = this.cells[cellB];
      this.cells[cellB] = held;
    }
  }

  /** Re-verify from scratch — no memory of how the board got this way. */
  private problemsOf(cells: number[]): string[] {
    this.board.reset();
    for (let cell = 0; cell < CELLS; cell++) this.board.place(cell, cells[cell]);
    return this.board.problems();
  }

  private disarm(): void {
    this.armed = null;
    this.markArmed();
  }

  private markArmed(): void {
    for (const el of this.root.querySelectorAll<HTMLElement>('[data-swap-handle]')) {
      const on = this.armed !== null
        && el.getAttribute('data-swap-handle') === this.armed.axis
        && Number(el.getAttribute('data-swap-index')) === this.armed.index;
      el.toggleAttribute('data-armed', on);
      el.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    for (const el of this.root.querySelectorAll<HTMLElement>('[data-cell]')) {
      const on = this.armed !== null && this.armed.axis === 'cell'
        && Number(el.getAttribute('data-cell')) === this.armed.index;
      el.toggleAttribute('data-armed', on);
      el.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }

  private paint(flash: boolean): void {
    const problems = this.problemsOf(this.cells);
    this.view.sync(this.board, flash);

    // Ring every square taking part in a repeat — the same mark the main module
    // uses on a part-built board. A row or column move never lights one, and a
    // single-block swap lights four, which is the distinction this widget
    // exists to show. Read off the placed blocks, not the bitmasks, so a board
    // holding duplicates still reports them all.
    const broken = new Set(this.board.conflictCells());
    for (const el of this.root.querySelectorAll<HTMLElement>('[data-cell]')) {
      el.toggleAttribute('data-conflict', broken.has(Number(el.getAttribute('data-cell'))));
    }

    // The tick or cross is the whole readout. Screen readers get the sentence
    // the sighted reader no longer needs.
    if (this.verdict) {
      this.verdict.textContent = problems.length === 0
        ? 'Valid solution.'
        : `Not a solution: ${problems[0]}.`;
    }
    this.root.setAttribute('data-state', problems.length === 0 ? 'solved' : 'error');
  }
}

export function mountSwaps(): void {
  mountBoxWidgets('[data-puzzle-swap]', 'swapMounted', (node, { box, kinds, palette, solution }) => {
    new SwapWidget(node, kinds, palette, solution, box.mirror);
  });
}
