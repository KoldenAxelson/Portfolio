/* Painting the board.
 *
 * The 6x6 grid is server-rendered by the shortcode, so the page is complete
 * before any JavaScript runs; this only fills squares in. It diffs against what
 * is currently on screen and touches nothing else, which is what lets the same
 * call serve both drivers: the instant solver syncs once at the end, the
 * animated one syncs after every frame's batch of moves. Neither needs to know
 * what the other does.
 */

import { CELLS, SIZE } from './inventory';
import { Board, EMPTY } from './board';

interface CellView {
  root: HTMLElement;
  num: HTMLElement;
}

export class BoardView {
  private readonly cells: CellView[] = [];
  private readonly shown = new Int32Array(CELLS).fill(EMPTY);
  private readonly palette: string[];

  constructor(root: ParentNode, palette: string[]) {
    this.palette = palette;
    const nodes = root.querySelectorAll<HTMLElement>('[data-cell]');
    nodes.forEach((node) => {
      const index = Number(node.getAttribute('data-cell'));
      const num = document.createElement('span');
      num.className = 'pz-num';
      node.append(num);
      this.cells[index] = { root: node, num };
    });
  }

  /** Bring the view in line with the board, flashing whatever moved. */
  sync(board: Board, flash: boolean): void {
    for (let cell = 0; cell < CELLS; cell++) {
      const kind = board.cells[cell];
      if (kind === this.shown[cell]) continue;
      this.shown[cell] = kind;
      this.paint(cell, kind, board, flash);
    }
  }

  reset(): void {
    for (let cell = 0; cell < CELLS; cell++) {
      this.shown[cell] = EMPTY;
      this.paint(cell, EMPTY, null, false);
    }
  }

  private paint(cell: number, kind: number, board: Board | null, flash: boolean): void {
    const view = this.cells[cell];
    if (!view) return;
    const row = ((cell / SIZE) | 0) + 1;
    const col = (cell % SIZE) + 1;

    if (kind === EMPTY || board === null) {
      view.num.textContent = '';
      view.root.removeAttribute('data-color');
      view.root.setAttribute('aria-label', `Row ${row}, column ${col}: empty`);
    } else {
      const block = board.kinds[kind];
      const color = this.palette[block.c] ?? '';
      view.num.textContent = String(block.n);
      view.root.setAttribute('data-color', color);
      // The color is carried visually by the square itself; the label is what
      // a screen reader reads out, and costs nothing on screen.
      view.root.setAttribute('aria-label', `Row ${row}, column ${col}: ${block.n} ${color}`);
    }

    if (!flash) return;
    // Restart the CSS animation on a square that changed twice in quick
    // succession; without the reflow the browser coalesces the two.
    view.root.classList.remove('is-changed');
    void view.root.offsetWidth;
    view.root.classList.add('is-changed');
  }
}
