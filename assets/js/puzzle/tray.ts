/* The tray — what is still in the box.
 *
 * Watching the board alone is unreadable: numbers appear and vanish with no
 * sense of where they come from or what is left. The tray is the other half of
 * that picture. It lists the box exactly as it sits in real life — six blocks
 * per color — and dims each one as it goes onto the board.
 *
 * Chips never move or reorder. A block leaving the box dims in place, so the
 * eye can track "the second green 5 just went down" instead of re-reading a
 * shuffled list every frame.
 *
 * Like BoardView, this is a view over a Board and knows nothing about how the
 * board came to be in that state.
 */

import { Board } from './board';
import { kindKey } from './inventory';
import type { Kind } from './inventory';

interface Chip {
  el: HTMLElement;
  /** Index into board.kinds. */
  kind: number;
  /** Which copy of that kind this chip is: 0 is the first. */
  ordinal: number;
}

export class TrayView {
  private readonly chips: Chip[] = [];
  /** Last painted state per chip: 1 placed, 0 in the box, -1 never painted. */
  private readonly shown: Int8Array;

  constructor(root: ParentNode, kinds: readonly Kind[]) {
    const byKey = new Map<number, number>();
    kinds.forEach((kind, index) => byKey.set(kindKey(kind.c, kind.n), index));

    const seen = new Map<number, number>();
    root.querySelectorAll<HTMLElement>('[data-block]').forEach((el) => {
      const n = Number(el.getAttribute('data-block'));
      const c = Number(el.getAttribute('data-color-index'));
      const key = kindKey(c, n);
      const kind = byKey.get(key);
      // A chip with no matching kind means the tray markup and the box data
      // disagree; skip it rather than mispainting the rest.
      if (kind === undefined) return;
      const ordinal = seen.get(key) ?? 0;
      seen.set(key, ordinal + 1);
      this.chips.push({ el, kind, ordinal });
    });

    this.shown = new Int8Array(this.chips.length).fill(-1);
  }

  /** Dim the blocks that are on the board, leave the rest bright. */
  sync(board: Board): void {
    for (let i = 0; i < this.chips.length; i++) {
      const chip = this.chips[i];
      // The first `remaining` copies of a kind are the ones still in the box.
      const placed = chip.ordinal >= board.remaining[chip.kind] ? 1 : 0;
      if (this.shown[i] === placed) continue;
      this.shown[i] = placed;
      chip.el.toggleAttribute('data-placed', placed === 1);
    }
  }

  reset(): void {
    // 0, not the -1 the array starts at: -1 means "never painted", and after
    // this loop every chip *has* been painted — the attribute is gone and the
    // block is in the box. Writing -1 here would force a redundant repaint of
    // all 36 chips on the next sync.
    for (let i = 0; i < this.chips.length; i++) {
      this.shown[i] = 0;
      this.chips[i].el.removeAttribute('data-placed');
    }
  }
}
