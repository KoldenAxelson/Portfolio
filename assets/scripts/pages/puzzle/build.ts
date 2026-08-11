/* Laying the box out one color at a time.
 *
 * No solver and no search — the board is the precomputed solution, revealed a
 * color at a time. The reason it is worth watching is the claim from earlier in
 * the article: every color is a permutation. Six blocks of one color go down and
 * they land one per row and one per column, every time, without exception.
 *
 * The order is derived, not chosen: colors with the fewest distinct numbers
 * first. For this box that puts orange (three numbers) first and red (five)
 * last, which is the ordering the hand method recommends — it falls out of the
 * box rather than being asserted about it.
 */

import { CELLS } from './inventory';
import type { Kind } from './inventory';
import { Board } from './board';
import { BoardView } from './render';
import { TrayView } from './tray';
import { mountBoxWidgets } from './boxdata';

export class BuildWidget {
  private readonly root: HTMLElement;
  private readonly board: Board;
  private readonly view: BoardView;
  private readonly tray: TrayView;
  private readonly solution: number[];
  /** Palette indices, in the order they get laid down. */
  private readonly order: number[];
  private step = 0;
  private readonly counter: HTMLElement | null;

  constructor(root: HTMLElement, kinds: Kind[], palette: string[], solution: number[]) {
    this.root = root;
    this.board = new Board(kinds);
    this.view = new BoardView(root, palette);
    this.tray = new TrayView(root, kinds);
    this.solution = solution;
    this.counter = root.querySelector<HTMLElement>('[data-build-step]');

    // Fewest distinct numbers first. The `|| a - b` breaks ties explicitly
    // rather than leaning on sort stability, so the order is the same whatever
    // engine runs it.
    const spread = palette.map((_, c) => {
      const seen = new Set<number>();
      for (const kind of kinds) if (kind.c === c) seen.add(kind.n);
      return seen.size;
    });
    this.order = palette.map((_, c) => c).sort((a, b) => spread[a] - spread[b] || a - b);

    root.addEventListener('click', (event) => {
      const button = (event.target as Element | null)?.closest<HTMLElement>('[data-build-action]');
      if (!button || !root.contains(button)) return;
      const action = button.getAttribute('data-build-action');
      this.go(action === 'next' ? this.step + 1 : action === 'prev' ? this.step - 1 : 0);
    });

    for (const el of root.querySelectorAll('[data-build-controls]')) el.removeAttribute('hidden');
    this.go(0);
  }

  private go(step: number): void {
    this.step = Math.max(0, Math.min(this.order.length, step));
    const shown = new Set(this.order.slice(0, this.step));
    this.board.reset();
    for (let cell = 0; cell < CELLS; cell++) {
      const kind = this.solution[cell];
      if (shown.has(this.board.kinds[kind].c)) this.board.place(cell, kind);
    }
    this.view.sync(this.board, true);
    this.tray.sync(this.board);
    if (this.counter) this.counter.textContent = `${this.step} / ${this.order.length}`;
    for (const el of this.root.querySelectorAll<HTMLButtonElement>('[data-build-action]')) {
      const action = el.getAttribute('data-build-action');
      el.disabled = action === 'next' ? this.step === this.order.length : this.step === 0;
    }
    this.root.setAttribute('data-state', this.step === this.order.length ? 'solved' : 'building');
  }
}

export function mountBuilds(): void {
  mountBoxWidgets('[data-puzzle-build]', 'buildMounted', (node, { kinds, palette, solution }) => {
    new BuildWidget(node, kinds, palette, solution);
  });
}
