// The Father's Puzzle card on /misc (partials/misc/live/fathers-puzzle.html).
// Every few seconds it picks rows or columns at random, picks two of them, and
// slides them past each other into each other's place. Nothing resets: the
// board keeps getting more jumbled, and every arrangement it passes through
// still has 1–6 once in each row and column.
//
// Each tile is positioned by translate from where the server drew it; the
// swapping pair is lifted to the front and nudged sideways mid-move so the two
// lines pass beside each other instead of through each other.

import { isAsleep, mountAll } from './card-kit';

const INTERVAL_MS = 2200;
const MOVE_MS = 900;
// How far the pair steps apart while they pass, so they go beside each other
// rather than through each other. Columns have less room above and below.
const SIDESTEP = { row: 70, col: 30 };

function mount(root: HTMLElement): void {
  const board = root.querySelector<SVGGElement>('[data-board]');
  const cell = Number(root.dataset.cell) || 22;
  if (!board || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const tiles = Array.from(board.querySelectorAll<SVGGElement>('g[data-r]'));
  // slotOf.row[r] = which row slot the line that started as row r sits in now.
  const slotOf = { row: [0, 1, 2, 3, 4, 5], col: [0, 1, 2, 3, 4, 5] };
  let onScreen = false;

  const offset = (tile: SVGGElement): [number, number] => {
    const r = Number(tile.dataset.r);
    const c = Number(tile.dataset.c);
    return [(slotOf.col[c] - c) * cell, (slotOf.row[r] - r) * cell];
  };

  const swap = (): void => {
    const axis = Math.random() < 0.5 ? 'row' : 'col';
    const a = Math.floor(Math.random() * 6);
    let b = Math.floor(Math.random() * 5);
    if (b >= a) b++;
    // The lines currently sitting in slots a and b.
    const lineA = slotOf[axis].indexOf(a);
    const lineB = slotOf[axis].indexOf(b);
    const key = axis === 'row' ? 'r' : 'c';
    const moving = tiles.filter((t) => Number(t.dataset[key]) === lineA || Number(t.dataset[key]) === lineB);
    const before = new Map(moving.map((t) => [t, offset(t)]));
    slotOf[axis][lineA] = b;
    slotOf[axis][lineB] = a;

    for (const tile of moving) {
      board.appendChild(tile); // on top of the lines it passes over
      const [x0, y0] = before.get(tile) ?? [0, 0];
      const [x1, y1] = offset(tile);
      const side = (Number(tile.dataset[key]) === lineA ? -1 : 1) * SIDESTEP[axis];
      const mid = axis === 'row'
        ? [(x0 + x1) / 2 + side, (y0 + y1) / 2]
        : [(x0 + x1) / 2, (y0 + y1) / 2 + side];
      const move = tile.animate(
        [
          { transform: `translate(${x0}px, ${y0}px)` },
          { transform: `translate(${mid[0]}px, ${mid[1]}px)`, offset: 0.5 },
          { transform: `translate(${x1}px, ${y1}px)` },
        ],
        { duration: MOVE_MS, easing: 'cubic-bezier(.6,0,.3,1)', fill: 'forwards' },
      );
      // Settle into a plain style so finished animations don't pile up.
      move.onfinish = () => {
        tile.style.transform = `translate(${x1}px, ${y1}px)`;
        move.cancel();
      };
    }
  };

  const tick = (): void => {
    if (!root.isConnected) return;
    if (onScreen && !document.hidden && !isAsleep(root)) swap();
    window.setTimeout(tick, INTERVAL_MS);
  };

  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
  }).observe(root);
  window.setTimeout(tick, INTERVAL_MS);
}

mountAll('[data-live-puzzle]', mount);
