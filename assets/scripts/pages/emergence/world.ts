/* The particles, stored as parallel typed arrays (one per property) so the
 * hot loops in every behaviour stay cache-friendly and allocation-free.
 * Space is a torus: everything that leaves one edge enters the opposite one. */

export const MAX_SPECIES = 8;

export type Layout = 'scatter' | 'disc' | 'clusters';

export class World {
  width = 1;
  height = 1;
  count = 0;
  species = 1;
  x = new Float32Array(0);
  y = new Float32Array(0);
  vx = new Float32Array(0);
  vy = new Float32Array(0);
  ax = new Float32Array(0);
  ay = new Float32Array(0);
  kind = new Uint8Array(0);

  populate(count: number, species: number, layout: string): void {
    this.count = count;
    this.species = Math.min(MAX_SPECIES, Math.max(1, species));
    this.x = new Float32Array(count);
    this.y = new Float32Array(count);
    this.vx = new Float32Array(count);
    this.vy = new Float32Array(count);
    this.ax = new Float32Array(count);
    this.ay = new Float32Array(count);
    this.kind = new Uint8Array(count);
    const place = PLACERS[layout as Layout] ?? PLACERS.scatter;
    const centers = clusterCenters(this);
    for (let i = 0; i < count; i++) {
      this.kind[i] = i % this.species;
      place(this, i, centers);
      const angle = Math.random() * Math.PI * 2;
      this.vx[i] = Math.cos(angle) * 10;
      this.vy[i] = Math.sin(angle) * 10;
    }
  }

  /** Stretches positions onto the new size, so a resize keeps the picture. */
  resize(width: number, height: number): void {
    const scaleX = width / this.width;
    const scaleY = height / this.height;
    this.width = width;
    this.height = height;
    for (let i = 0; i < this.count; i++) {
      this.x[i] = wrap(this.x[i] * scaleX, width);
      this.y[i] = wrap(this.y[i] * scaleY, height);
    }
  }
}

/** Shortest signed offset between two coordinates on a wrapped axis. */
export function wrapDelta(delta: number, size: number): number {
  if (delta > size * 0.5) return delta - size;
  if (delta < -size * 0.5) return delta + size;
  return delta;
}

export function wrap(value: number, size: number): number {
  const wrapped = value % size;
  return wrapped < 0 ? wrapped + size : wrapped;
}

type Placer = (world: World, i: number, centers: Float32Array) => void;

const PLACERS: Record<Layout, Placer> = {
  scatter(world, i) {
    world.x[i] = Math.random() * world.width;
    world.y[i] = Math.random() * world.height;
  },
  disc(world, i) {
    placeInDisc(world, i, world.width / 2, world.height / 2, Math.min(world.width, world.height) * 0.3);
  },
  clusters(world, i, centers) {
    const kind = world.kind[i];
    placeInDisc(world, i, centers[kind * 2], centers[kind * 2 + 1], Math.min(world.width, world.height) * 0.08);
  },
};

function placeInDisc(world: World, i: number, centerX: number, centerY: number, radius: number): void {
  const angle = Math.random() * Math.PI * 2;
  const distance = Math.sqrt(Math.random()) * radius;
  world.x[i] = wrap(centerX + Math.cos(angle) * distance, world.width);
  world.y[i] = wrap(centerY + Math.sin(angle) * distance, world.height);
}

function clusterCenters(world: World): Float32Array {
  const centers = new Float32Array(MAX_SPECIES * 2);
  for (let s = 0; s < MAX_SPECIES; s++) {
    centers[s * 2] = (0.15 + Math.random() * 0.7) * world.width;
    centers[s * 2 + 1] = (0.15 + Math.random() * 0.7) * world.height;
  }
  return centers;
}
