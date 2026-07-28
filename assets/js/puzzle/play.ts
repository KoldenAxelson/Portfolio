/* Playing it yourself.
 *
 * Selection, placement and swapping for the main widget. The solver and this
 * share one Board and neither knows about the other: a position built by hand
 * can be handed to the solver to finish, and a position the solver produced can
 * be picked apart by hand.
 *
 * The rules, in full:
 *   click a block in the box   -> pick it up
 *   click a square with a block in hand -> put it down (anything already there
 *                                          goes back to the box)
 *   click an occupied square with nothing in hand -> pick that square up
 *   click a second square      -> swap the two, empty or not
 *   click the square you just picked up -> send its block back to the box
 *
 * No timing anywhere: clicking the same thing twice is two ordinary clicks, so
 * a slow one behaves exactly like a quick one.
 *
 * Illegal placements are allowed on purpose. Being told what you have broken is
 * more use than being prevented from breaking it.
 */

import { CELLS, kindKey } from './inventory';
import { Board, EMPTY } from './board';

type Held =
  | { from: 'box'; kind: number; chip: number }
  | { from: 'square'; cell: number }
  | null;

export class PlayController {
  private readonly root: HTMLElement;
  private readonly board: Board;
  private readonly byKey = new Map<number, number>();
  private held: Held = null;

  constructor(root: HTMLElement, board: Board) {
    this.root = root;
    this.board = board;
    board.kinds.forEach((kind, i) => this.byKey.set(kindKey(kind.c, kind.n), i));
  }

  /** True if the click changed the board or the selection. */
  click(target: HTMLElement): boolean {
    const chip = target.closest<HTMLElement>('[data-block]');
    if (chip && this.root.contains(chip)) return this.takeFromBox(chip);
    const square = target.closest<HTMLElement>('[data-cell]');
    if (square && this.root.contains(square)) return this.useSquare(Number(square.getAttribute('data-cell')));
    return false;
  }

  clear(): void {
    this.held = null;
  }

  /** What is picked up, for the view to mark. `chip` is the position of the
   *  exact block clicked among all the blocks in the box — the one the reader
   *  pointed at, not the first identical one. */
  selection(): { cell: number; chip: number } {
    if (this.held === null) return { cell: -1, chip: -1 };
    return this.held.from === 'square'
      ? { cell: this.held.cell, chip: -1 }
      : { cell: -1, chip: this.held.chip };
  }

  private takeFromBox(chip: HTMLElement): boolean {
    const n = Number(chip.getAttribute('data-block'));
    const c = Number(chip.getAttribute('data-color-index'));
    const kind = this.byKey.get(kindKey(c, n));
    if (kind === undefined || this.board.remaining[kind] <= 0) return false;
    const all = Array.from(this.root.querySelectorAll<HTMLElement>('[data-block]'));
    const index = all.indexOf(chip);
    this.held = this.held?.from === 'box' && this.held.chip === index
      ? null
      : { from: 'box', kind, chip: index };
    return true;
  }

  private useSquare(cell: number): boolean {
    if (!Number.isInteger(cell) || cell < 0 || cell >= CELLS) return false;

    if (this.held?.from === 'box') {
      if (this.board.cells[cell] !== EMPTY) this.board.lift(cell);
      this.board.place(cell, this.held.kind);
      this.held = null;
      return true;
    }

    if (this.held?.from === 'square') {
      const from = this.held.cell;
      this.held = null;
      // Clicking the square you just picked up puts that block back in the box.
      if (from === cell) {
        if (this.board.cells[cell] === EMPTY) return true;
        this.board.lift(cell);
        return true;
      }
      const fromKind = this.board.cells[from];
      const toKind = this.board.cells[cell];
      // Lift both before placing either: the two blocks may share a row or a
      // column, and placing into a square the other still occupies would be
      // rejected by the board's own rules.
      if (fromKind !== EMPTY) this.board.lift(from);
      if (toKind !== EMPTY) this.board.lift(cell);
      if (fromKind !== EMPTY) this.board.place(cell, fromKind);
      if (toKind !== EMPTY) this.board.place(from, toKind);
      return true;
    }

    if (this.board.cells[cell] === EMPTY) return false;
    this.held = { from: 'square', cell };
    return true;
  }
}
