/* A uniform grid over the torus, rebuilt every step by counting sort. Cells are
 * at least as wide as the query radius, so a query only reads the 3x3 block of
 * cells around a particle instead of every other particle. */

import { wrapDelta } from './world';
import type { World } from './world';

/** Called once per neighbour; dx/dy point from the particle to the neighbour. */
export type NeighborVisit = (j: number, dx: number, dy: number, distanceSq: number) => void;

export class NeighborGrid {
  private cols = 3;
  private rows = 3;
  private cellWidth = 1;
  private cellHeight = 1;
  private cellStart = new Int32Array(10);
  private cellOf = new Int32Array(0);
  private items = new Int32Array(0);
  private readonly block = new Int32Array(9);
  /** Queries are capped here: past one cell width the 3x3 block would miss
   *  neighbours. Only bites when a radius is over a third of the world. */
  private maxRadius = 0;

  rebuild(world: World, radius: number): void {
    // At least 3 cells per axis, or the wrapped 3x3 block visits a cell twice.
    this.cols = Math.max(3, Math.floor(world.width / radius));
    this.rows = Math.max(3, Math.floor(world.height / radius));
    this.cellWidth = world.width / this.cols;
    this.cellHeight = world.height / this.rows;
    this.maxRadius = Math.min(this.cellWidth, this.cellHeight);

    const cellCount = this.cols * this.rows;
    if (this.cellStart.length < cellCount + 1) this.cellStart = new Int32Array(cellCount + 1);
    if (this.items.length < world.count) {
      this.items = new Int32Array(world.count);
      this.cellOf = new Int32Array(world.count);
    }
    this.cellStart.fill(0, 0, cellCount + 1);

    for (let i = 0; i < world.count; i++) {
      const cell = this.cellAt(world.x[i], world.y[i]);
      this.cellOf[i] = cell;
      this.cellStart[cell + 1]++;
    }
    for (let c = 0; c < cellCount; c++) this.cellStart[c + 1] += this.cellStart[c];
    const cursor = this.cellStart.slice(0, cellCount);
    for (let i = 0; i < world.count; i++) this.items[cursor[this.cellOf[i]]++] = i;
  }

  forEachNeighbor(world: World, i: number, radius: number, visit: NeighborVisit): void {
    const reach = Math.min(radius, this.maxRadius);
    const reachSq = reach * reach;
    const originX = world.x[i];
    const originY = world.y[i];
    this.fillBlock(this.cellOf[i]);
    for (let b = 0; b < 9; b++) {
      const cell = this.block[b];
      for (let k = this.cellStart[cell]; k < this.cellStart[cell + 1]; k++) {
        const j = this.items[k];
        const dx = wrapDelta(world.x[j] - originX, world.width);
        const dy = wrapDelta(world.y[j] - originY, world.height);
        const distanceSq = dx * dx + dy * dy;
        if (j === i || distanceSq > reachSq || distanceSq === 0) continue;
        visit(j, dx, dy, distanceSq);
      }
    }
  }

  private cellAt(x: number, y: number): number {
    const col = Math.min(this.cols - 1, Math.floor(x / this.cellWidth));
    const row = Math.min(this.rows - 1, Math.floor(y / this.cellHeight));
    return row * this.cols + col;
  }

  private fillBlock(cell: number): void {
    const col = cell % this.cols;
    const row = (cell - col) / this.cols;
    let b = 0;
    for (let dy = -1; dy <= 1; dy++) {
      const wrappedRow = (row + dy + this.rows) % this.rows;
      for (let dx = -1; dx <= 1; dx++) this.block[b++] = wrappedRow * this.cols + ((col + dx + this.cols) % this.cols);
    }
  }
}
