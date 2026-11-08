/* Drawing shared by the page's board (game.ts) and the /misc card (card.ts). */

import { GRID_SIZE } from './grid';
import type { Direction, Point, Tile } from './grid';

// The original's palette (src/utils/config.py), so the port looks like the
// game. partials/misc/live/cave-in.html repeats it for the card's still.
export const TILE_COLORS: Record<Tile, string> = {
  empty: 'rgb(56 56 56)',
  rock: 'rgb(128 128 128)',
  stick: 'rgb(139 69 19)',
  player: 'rgb(255 0 0)',
};
export const ROUTE_COLOR = 'rgb(252 211 77 / .75)';
const TILE_INSET = 0.1;

export interface Board {
  readonly context: CanvasRenderingContext2D;
  readonly origin: Point;
  readonly cellPx: number;
}

export function centerOf(board: Board, point: Point): Point {
  return { x: board.origin.x + (point.x + 0.5) * board.cellPx, y: board.origin.y + (point.y + 0.5) * board.cellPx };
}

/** Fills one tile, `scale` around its centre and nudged down by `dropPx`. */
export function drawTile(board: Board, index: number, tile: Tile, scale = 1, dropPx = 0): void {
  const center = centerOf(board, { x: index % GRID_SIZE, y: Math.floor(index / GRID_SIZE) });
  const sidePx = board.cellPx * (1 - TILE_INSET * 2) * scale;
  board.context.fillStyle = TILE_COLORS[tile];
  board.context.fillRect(center.x - sidePx / 2, center.y - sidePx / 2 + dropPx, sidePx, sidePx);
}

export function drawFacingDot(board: Board, player: Point, facing: Direction): void {
  const center = centerOf(board, player);
  const { context, cellPx } = board;
  context.fillStyle = '#fff';
  context.beginPath();
  context.arc(center.x + facing.dx * cellPx / 4, center.y + facing.dy * cellPx / 4, Math.max(1.5, cellPx / 10), 0, Math.PI * 2);
  context.fill();
}

/** The AI's planned route from the player, and a ring on its waypoint. */
export function drawRoute(board: Board, route: readonly Point[], waypoint: Point | null, dashOffsetPx?: number): void {
  if (route.length < 2) return;
  const { context, cellPx } = board;
  context.save();
  context.strokeStyle = ROUTE_COLOR;
  context.lineWidth = Math.max(1.5, cellPx / 12);
  context.lineJoin = 'round';
  context.lineCap = 'round';
  if (dashOffsetPx !== undefined) {
    context.setLineDash([cellPx * 0.3, cellPx * 0.22]);
    context.lineDashOffset = dashOffsetPx;
  }
  context.beginPath();
  route.forEach((point, i) => {
    const center = centerOf(board, point);
    if (i === 0) context.moveTo(center.x, center.y);
    else context.lineTo(center.x, center.y);
  });
  context.stroke();
  if (waypoint) {
    const center = centerOf(board, waypoint);
    context.setLineDash([]);
    context.beginPath();
    context.arc(center.x, center.y, cellPx * 0.3, 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();
}
