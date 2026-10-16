/* Boids (Reynolds, 1986): steer to match neighbours' heading, drift toward
 * their centre, and keep out of their personal space. */

import { DEFAULT_MIX } from '../behavior';
import type { Behavior } from '../behavior';
import type { NeighborVisit } from '../neighbors';
import { createGroup, range, toggle } from '../params';

// Gains put each rule's acceleration in world units/s² at slider value 1.
const ALIGNMENT_GAIN = 2;
const COHESION_GAIN = 4;
const SEPARATION_GAIN = 160;

const specs = {
  vision: range('Vision', 10, 200, 1, 50),
  personalSpace: range('Personal space', 2, 60, 1, 14),
  alignment: range('Alignment', 0, 5, 0.05, 1.2),
  cohesion: range('Cohesion', 0, 5, 0.05, 0.8),
  separation: range('Separation', 0, 10, 0.1, 3),
  bySpecies: toggle('Flock by species', true),
};

export function createBoids(): Behavior<typeof specs> {
  const group = createGroup('Boids', specs);
  const values = group.values;

  return {
    ...group,
    summary: 'Align, cohere, separate',
    mix: { ...DEFAULT_MIX },
    neighborRadius: () => values.vision,

    apply({ world, grid }, weight) {
      const personalSpace = values.personalSpace;
      const personalSpaceSq = personalSpace * personalSpace;
      let ownKind = 0;
      let flockSize = 0;
      let sumVx = 0;
      let sumVy = 0;
      let sumDx = 0;
      let sumDy = 0;
      let pushX = 0;
      let pushY = 0;

      const visit: NeighborVisit = (j, dx, dy, distanceSq) => {
        if (distanceSq < personalSpaceSq) {
          const distance = Math.sqrt(distanceSq);
          const closeness = 1 - distance / personalSpace;
          pushX -= (dx / distance) * closeness;
          pushY -= (dy / distance) * closeness;
        }
        if (values.bySpecies && world.kind[j] !== ownKind) return;
        flockSize++;
        sumVx += world.vx[j];
        sumVy += world.vy[j];
        sumDx += dx;
        sumDy += dy;
      };

      for (let i = 0; i < world.count; i++) {
        ownKind = world.kind[i];
        flockSize = sumVx = sumVy = sumDx = sumDy = pushX = pushY = 0;
        grid.forEachNeighbor(world, i, values.vision, visit);

        let ax = pushX * values.separation * SEPARATION_GAIN;
        let ay = pushY * values.separation * SEPARATION_GAIN;
        if (flockSize > 0) {
          ax += (sumVx / flockSize - world.vx[i]) * values.alignment * ALIGNMENT_GAIN;
          ay += (sumVy / flockSize - world.vy[i]) * values.alignment * ALIGNMENT_GAIN;
          ax += (sumDx / flockSize) * values.cohesion * COHESION_GAIN;
          ay += (sumDy / flockSize) * values.cohesion * COHESION_GAIN;
        }
        world.ax[i] += ax * weight;
        world.ay[i] += ay * weight;
      }
    },
  };
}
