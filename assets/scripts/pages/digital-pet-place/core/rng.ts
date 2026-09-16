// rng.ts — seeded PRNG (mulberry32). Seeded so the mine can replay a run
// deterministically; the garden persists its state so reloads don't repeat luck.

export class Rng {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0;
  }

  get state(): number {
    return this.s;
  }

  /** [0, 1) */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [lo, hi] inclusive. */
  int(lo: number, hi: number): number {
    return lo + Math.floor(this.next() * (hi - lo + 1));
  }

  /** Float in [lo, hi). */
  range(lo: number, hi: number): number {
    return lo + this.next() * (hi - lo);
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(list: readonly T[]): T {
    return list[Math.floor(this.next() * list.length)];
  }

  /** Weighted pick over an object of weights; keys with weight ≤ 0 never win. */
  weighted<K extends string>(weights: Record<K, number>): K {
    const keys = Object.keys(weights) as K[];
    let total = 0;
    for (const k of keys) total += Math.max(0, weights[k]);
    let r = this.next() * total;
    for (const k of keys) {
      r -= Math.max(0, weights[k]);
      if (r < 0) return k;
    }
    return keys[keys.length - 1];
  }
}

export function randomSeed(): number {
  return (Math.random() * 4294967296) >>> 0;
}
