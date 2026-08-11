// grid.ts — a uniform spatial hash over the (looping) world, used so bots and the
// food-eating pass do a *local* lookup instead of scanning every pellet. Rebuilt
// once per frame from the food array: O(food) to build, then each query touches
// only the buckets near a point. This replaces the old O(entities × food) scans.

import { CONFIG, torusDist2 } from './config';
import type { Food } from './types';

export class FoodGrid {
  private readonly cell: number;
  private readonly cols: number;
  private readonly buckets: Food[][];

  constructor(cell = 150) {
    this.cell = cell;
    this.cols = Math.max(1, Math.ceil(CONFIG.WORLD_SIZE / cell));
    this.buckets = Array.from({ length: this.cols * this.cols }, () => []);
  }

  private coord(v: number): number {
    let c = Math.floor(v / this.cell) % this.cols;
    if (c < 0) c += this.cols;
    return c;
  }

  rebuild(food: Food[]): void {
    for (const b of this.buckets) b.length = 0;
    for (const f of food) {
      if (!f.alive) continue;
      const cx = this.coord(f.x);
      const cy = this.coord(f.y);
      this.buckets[cy * this.cols + cx].push(f);
    }
  }

  // Visit every pellet in the cells within `radius` of (x,y). Cells wrap at the
  // world seam. `rings` is capped at half the grid so we never double-cover.
  forEachNear(x: number, y: number, radius: number, cb: (f: Food) => void): void {
    const rings = Math.min(this.cols >> 1, Math.max(1, Math.ceil(radius / this.cell)));
    const cx = this.coord(x);
    const cy = this.coord(y);
    for (let dy = -rings; dy <= rings; dy++) {
      let gy = (cy + dy) % this.cols;
      if (gy < 0) gy += this.cols;
      for (let dx = -rings; dx <= rings; dx++) {
        let gx = (cx + dx) % this.cols;
        if (gx < 0) gx += this.cols;
        const bucket = this.buckets[gy * this.cols + gx];
        for (const f of bucket) cb(f);
      }
    }
  }

  // Nearest live pellet within `radius`, or null.
  nearest(x: number, y: number, radius: number): Food | null {
    let best: Food | null = null;
    let bestD2 = Infinity;
    this.forEachNear(x, y, radius, (f) => {
      if (!f.alive) return;
      const d2 = torusDist2(x, y, f.x, f.y);
      if (d2 < bestD2) {
        bestD2 = d2;
        best = f;
      }
    });
    return best;
  }
}
