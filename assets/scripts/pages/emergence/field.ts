/* The shared chemical trail: a coarse scalar grid laid over the world that
 * particles can write to and read from. It is environment, not a behaviour, so
 * any behaviour may deposit into it or sense it; it diffuses and decays every
 * step whether or not anything is writing. */

import { wrap } from './world';
import type { World } from './world';

const CELL_SIZE = 4;

export class TrailField {
  cols = 1;
  rows = 1;
  values = new Float32Array(1);
  private scratch = new Float32Array(1);
  private width = 1;
  private height = 1;

  resize(world: World): void {
    this.width = world.width;
    this.height = world.height;
    this.cols = Math.max(1, Math.round(world.width / CELL_SIZE));
    this.rows = Math.max(1, Math.round(world.height / CELL_SIZE));
    this.values = new Float32Array(this.cols * this.rows);
    this.scratch = new Float32Array(this.cols * this.rows);
  }

  clear(): void {
    this.values.fill(0);
  }

  deposit(x: number, y: number, amount: number): void {
    this.values[this.indexAt(x, y)] += amount;
  }

  sample(x: number, y: number): number {
    return this.values[this.indexAt(wrap(x, this.width), wrap(y, this.height))];
  }

  /** Blends each cell toward its 3x3 mean by `diffusion`, then decays it. */
  update(diffusion: number, decayPerSecond: number, dt: number): void {
    const { cols, rows, values, scratch } = this;
    const keep = Math.exp(-decayPerSecond * dt);
    for (let row = 0; row < rows; row++) {
      const above = ((row + rows - 1) % rows) * cols;
      const here = row * cols;
      const below = ((row + 1) % rows) * cols;
      for (let col = 0; col < cols; col++) {
        const left = (col + cols - 1) % cols;
        const right = (col + 1) % cols;
        const sum =
          values[above + left] + values[above + col] + values[above + right] +
          values[here + left] + values[here + col] + values[here + right] +
          values[below + left] + values[below + col] + values[below + right];
        const current = values[here + col];
        scratch[here + col] = (current + (sum / 9 - current) * diffusion) * keep;
      }
    }
    this.values = scratch;
    this.scratch = values;
  }

  private indexAt(x: number, y: number): number {
    const col = Math.min(this.cols - 1, Math.floor((x / this.width) * this.cols));
    const row = Math.min(this.rows - 1, Math.floor((y / this.height) * this.rows));
    return row * this.cols + col;
  }
}
