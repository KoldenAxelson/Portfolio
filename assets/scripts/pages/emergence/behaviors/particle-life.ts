/* Particle Life: every species pulls or pushes every other species by its own
 * rule, read from an asymmetric matrix. Up close everything repels, so
 * clusters keep a size; past `reach` nothing interacts. Asymmetry (A chases B
 * while B flees A) is what makes it chase, orbit and swim. */

import { DEFAULT_MIX } from '../behavior';
import type { Behavior } from '../behavior';
import type { NeighborVisit } from '../neighbors';
import { createGroup, range } from '../params';
import { mountMatrixEditor } from '../ui/matrix-editor';
import { MAX_SPECIES } from '../world';

export type MatrixSeed = 'random' | 'symmetric' | 'chain' | 'zero';

/** Row = the particle feeling the force, column = the particle causing it. */
export class AttractionMatrix {
  readonly cells = new Float32Array(MAX_SPECIES * MAX_SPECIES);
  species = 1;

  get(row: number, col: number): number {
    return this.cells[row * MAX_SPECIES + col];
  }

  set(row: number, col: number, value: number): void {
    this.cells[row * MAX_SPECIES + col] = Math.max(-1, Math.min(1, value));
  }

  seed(kind: MatrixSeed): void {
    for (let row = 0; row < MAX_SPECIES; row++) {
      for (let col = 0; col < MAX_SPECIES; col++) this.set(row, col, SEEDERS[kind](row, col, this));
    }
  }
}

const SEEDERS: Record<MatrixSeed, (row: number, col: number, matrix: AttractionMatrix) => number> = {
  random: () => Math.random() * 2 - 1,
  // Lower triangle mirrors the upper, which is filled first by the row-major loop.
  symmetric: (row, col, matrix) => (col < row ? matrix.get(col, row) : Math.random() * 2 - 1),
  // Each species likes itself, chases the next and flees the previous: snakes.
  chain: (row, col, matrix) => {
    if (row === col) return 1;
    if (col === (row + 1) % matrix.species) return 0.4;
    if (col === (row + matrix.species - 1) % matrix.species) return -0.3;
    return 0;
  },
  zero: () => 0,
};

/** Force profile in units of reach: a linear repulsion inside `core`, then a
 *  tent of height `attraction` that falls back to zero at r = 1. */
function lifeForce(r: number, attraction: number, core: number): number {
  if (r < core) return r / core - 1;
  if (r < 1) return attraction * (1 - Math.abs(2 * r - 1 - core) / (1 - core));
  return 0;
}

const specs = {
  reach: range('Reach', 20, 200, 1, 80),
  core: range('Core', 0.05, 0.6, 0.01, 0.3),
  strength: range('Strength', 0, 3000, 10, 900),
};

export function createParticleLife(): Behavior<typeof specs> & { readonly matrix: AttractionMatrix } {
  const group = createGroup('Particle Life', specs);
  const values = group.values;
  const matrix = new AttractionMatrix();
  matrix.seed('random');

  return {
    ...group,
    summary: 'Species attract and repel by a matrix',
    mix: { ...DEFAULT_MIX },
    matrix,
    neighborRadius: () => values.reach,

    reset(species) {
      matrix.species = species;
    },

    shuffle() {
      matrix.seed('random');
    },

    apply({ world, grid }, weight) {
      const reach = values.reach;
      const core = values.core;
      let rowOffset = 0;
      let fx = 0;
      let fy = 0;

      const visit: NeighborVisit = (j, dx, dy, distanceSq) => {
        const distance = Math.sqrt(distanceSq);
        const force = lifeForce(distance / reach, matrix.cells[rowOffset + world.kind[j]], core);
        fx += (dx / distance) * force;
        fy += (dy / distance) * force;
      };

      const gain = values.strength * weight;
      for (let i = 0; i < world.count; i++) {
        rowOffset = world.kind[i] * MAX_SPECIES;
        fx = fy = 0;
        grid.forEachNeighbor(world, i, reach, visit);
        world.ax[i] += fx * gain;
        world.ay[i] += fy * gain;
      }
    },

    mountControls(host, changed) {
      return mountMatrixEditor(host, matrix, changed);
    },
  };
}
