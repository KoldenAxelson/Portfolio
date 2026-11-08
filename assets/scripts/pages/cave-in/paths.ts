/* Shortest paths across the cave that may break through up to `maxRocks` rocks.
 * The Python original searched over (cell, set of rocks removed). A shortest
 * path never revisits a cell, so (cell, rocks used so far) finds the same paths
 * without the search blowing up as the player hoards sticks. */

import { ALL_DIRECTIONS, GRID_SIZE, indexOf, isInBounds, pointOf, stepFrom } from './grid';
import type { Point, Tile } from './grid';

export function findPath(tiles: readonly Tile[], start: Point, target: Point, maxRocks: number): Point[] | null {
  const layers = maxRocks + 1;
  const cellCount = GRID_SIZE * GRID_SIZE;
  const parent = new Int32Array(cellCount * layers).fill(-1);
  const startState = indexOf(start) * layers;
  const targetIndex = indexOf(target);
  parent[startState] = startState;

  const queue = [startState];
  for (let head = 0; head < queue.length; head++) {
    const state = queue[head];
    const cell = Math.floor(state / layers);
    if (cell === targetIndex) return tracePath(parent, state, layers);

    const rocksUsed = state % layers;
    const point = pointOf(cell);
    for (const direction of ALL_DIRECTIONS) {
      const next = stepFrom(point, direction);
      if (!isInBounds(next)) continue;
      const nextRocks = rocksUsed + (tiles[indexOf(next)] === 'rock' ? 1 : 0);
      if (nextRocks > maxRocks) continue;
      const nextState = indexOf(next) * layers + nextRocks;
      if (parent[nextState] !== -1) continue;
      parent[nextState] = state;
      queue.push(nextState);
    }
  }
  return null;
}

export function countRocks(tiles: readonly Tile[], path: readonly Point[]): number {
  return path.filter((point) => tiles[indexOf(point)] === 'rock').length;
}

function tracePath(parent: Int32Array, endState: number, layers: number): Point[] {
  const path: Point[] = [];
  let state = endState;
  while (parent[state] !== state) {
    path.push(pointOf(Math.floor(state / layers)));
    state = parent[state];
  }
  path.push(pointOf(Math.floor(state / layers)));
  return path.reverse();
}
