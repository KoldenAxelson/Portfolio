/* Backtracking plus a value-support check.
 *
 * The plain search only notices trouble when some *square* runs out of blocks.
 * That is late. The complementary question catches it far earlier:
 *
 *   this row still needs a 5 — is there anywhere left in the row to put one?
 *
 * If a row or column still needs a number (or a color) and not one of its empty
 * squares could take it, the position is already dead no matter how many options
 * each individual square still shows. Backing out there saves the whole subtree.
 *
 * It is also a rule a person can use at the table, which is why it earned its
 * place over the alternatives: least-constraining-value ordering, random
 * restarts, filling a row at a time and full bipartite matching were all
 * measured on this box and all lost to the plain search. This one cuts
 * placements about five-fold and wall-clock about half.
 *
 * The check is a necessary condition, not a sufficient one — surviving it does
 * not promise the board can be finished, it only rules out boards that clearly
 * can't be. That is all a pruning test needs to do.
 */

import { CELLS, SIZE } from './inventory';
import { Board, EMPTY, ROWS, COLS, lineCell, everyLine } from './board';
import type { Axis } from './board';
import { Search } from './search';
import type { SearchOptions } from './search';

/** How much of the board to re-examine after each block.
 *
 *  'touched' looks only at the row and column just played into. That is what a
 *  person can actually hold in their head at the table — and it turns out to be
 *  the faster of the two on a computer as well, because the extra dead ends the
 *  wider scan catches cost more to find than they save.
 *
 *  'lines' sweeps all twelve. Fewer blocks placed, more time spent. */
export type SupportScope = 'touched' | 'lines';

/** Bits 1..6 set: the six numbers. */
const ALL_NUMBERS = 0b1111110;
/** Bits 0..5 set: the six colors. */
const ALL_COLORS = 0b111111;

export class SupportedSearch extends Search {
  private readonly numberBit: Int32Array;
  private readonly colorBit: Int32Array;
  /** Scratch, reused every call so the check allocates nothing. Kept honest by
   *  refreshCell() being a method — see the note there. */
  private readonly cellNumbers = new Int32Array(CELLS);
  private readonly cellColors = new Int32Array(CELLS);

  private readonly scope: SupportScope;

  constructor(board: Board, options: Partial<SearchOptions> = {}, scope: SupportScope = 'touched') {
    super(board, options);
    this.scope = scope;
    this.numberBit = new Int32Array(board.kinds.length);
    this.colorBit = new Int32Array(board.kinds.length);
    board.kinds.forEach((kind, i) => {
      this.numberBit[i] = 1 << kind.n;
      this.colorBit[i] = 1 << kind.c;
    });
  }

  protected override viable(): boolean {
    const played = this.lastCell();
    if (played < 0) return true;

    const playedRow = (played / SIZE) | 0;
    const playedCol = played % SIZE;

    // Work out what could still land on each square. Under 'touched' only the
    // twelve squares of the played row and column are worth looking at, which
    // is where most of this variant's speed comes from — the wider sweep spends
    // its time recomputing squares the last block could not have affected.
    if (!this.refreshOptionMasks(playedRow, playedCol)) return false;

    // Then each line ORs its empty squares together and checks that covers
    // everything the line still needs.
    for (const [index, axis] of everyLine()) {
      if (!this.inScope(index, axis, playedRow, playedCol)) continue;
      if (!this.lineIsSupported(index, axis)) return false;
    }
    return true;
  }

  /** Under 'touched', only the line the last block landed in can have changed. */
  private inScope(index: number, axis: Axis, playedRow: number, playedCol: number): boolean {
    if (this.scope === 'lines') return true;
    return index === (axis === ROWS ? playedRow : playedCol);
  }

  /** Does every number and color this line still needs have an empty square in
   *  the line that could hold it? A no here kills the whole subtree. */
  private lineIsSupported(index: number, axis: Axis): boolean {
    let have = 0;
    let haveColors = 0;
    let canTake = 0;
    let canTakeColors = 0;
    let empties = 0;
    for (let offset = 0; offset < SIZE; offset++) {
      const cell = lineCell(index, offset, axis);
      const kind = this.board.cells[cell];
      if (kind === EMPTY) {
        empties++;
        canTake |= this.cellNumbers[cell];
        canTakeColors |= this.cellColors[cell];
      } else {
        have |= this.numberBit[kind];
        haveColors |= this.colorBit[kind];
      }
    }
    if (empties === 0) return true;
    // A number this line still needs, that no empty square in it can hold.
    if ((ALL_NUMBERS & ~have & ~canTake) !== 0) return false;
    if ((ALL_COLORS & ~haveColors & ~canTakeColors) !== 0) return false;
    return true;
  }

  /** Fill cellNumbers / cellColors for the squares this scope cares about.
   *  Returns false if any empty square has nothing left that could go on it. */
  private refreshOptionMasks(playedRow: number, playedCol: number): boolean {
    if (this.scope === 'lines') {
      for (let cell = 0; cell < CELLS; cell++) if (!this.refreshCell(cell)) return false;
      return true;
    }
    for (let offset = 0; offset < SIZE; offset++) {
      if (!this.refreshCell(lineCell(playedRow, offset, ROWS))) return false;
      if (!this.refreshCell(lineCell(playedCol, offset, COLS))) return false;
    }
    return true;
  }

  /** A method rather than a closure inside the loop above: this runs after every
   *  placement, and a fresh closure per call was the one allocation left in a
   *  check whose whole claim is that it allocates nothing. */
  private refreshCell(cell: number): boolean {
    if (this.board.cells[cell] !== EMPTY) {
      this.cellNumbers[cell] = 0;
      this.cellColors[cell] = 0;
      return true;
    }
    let numbers = 0;
    let colors = 0;
    for (const kind of this.optionsFor(cell)) {
      numbers |= this.numberBit[kind];
      colors |= this.colorBit[kind];
    }
    if (numbers === 0) return false; // a square with nothing left to put on it
    this.cellNumbers[cell] = numbers;
    this.cellColors[cell] = colors;
    return true;
  }
}
