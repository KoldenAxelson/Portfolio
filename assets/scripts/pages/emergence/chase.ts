/* Rock, paper, scissors for three species: each one chases the next species
 * round the cycle and runs from the one before it. Used by the /misc card
 * (card.ts) on top of the Flocks preset, where species 0, 1 and 2 are drawn
 * red, yellow and green (palette.ts), so:
 *
 *   red chases green and runs from yellow,
 *   yellow chases red and runs from green,
 *   green chases yellow and runs from red.
 *
 * Not registered with the lab's panel (behaviors/index.ts); it's a behaviour
 * in shape only so the engine can blend and integrate it like the others. */

import { DEFAULT_MIX } from './behavior';
import type { Behavior } from './behavior';
import type { NeighborVisit } from './neighbors';
import { createGroup, range } from './params';

const CHASE_GAIN = 70;
const FLEE_GAIN = 120;

const specs = {
  reach: range('Reach', 10, 200, 1, 80),
  chase: range('Chase', 0, 5, 0.05, 1),
  flee: range('Flee', 0, 5, 0.05, 1),
};

/** Species index → the species it hunts. Its hunter is the reverse. */
const preyOf = (kind: number): number => (kind + 2) % 3;
const hunterOf = (kind: number): number => (kind + 1) % 3;

export function createChase(): Behavior<typeof specs> {
  const group = createGroup('Chase', specs);
  const values = group.values;

  return {
    ...group,
    summary: 'Rock, paper, scissors',
    mix: { ...DEFAULT_MIX },
    neighborRadius: () => values.reach,

    apply({ world, grid }, weight) {
      const reach = values.reach;
      let prey = 0;
      let hunter = 0;
      let towardX = 0;
      let towardY = 0;
      let awayX = 0;
      let awayY = 0;

      // Closer matters more: a hunter on your tail outweighs one across the room.
      const visit: NeighborVisit = (j, dx, dy, distanceSq) => {
        const kind = world.kind[j];
        if (kind !== prey && kind !== hunter) return;
        const distance = Math.sqrt(distanceSq);
        const closeness = 1 - distance / reach;
        if (kind === prey) {
          towardX += (dx / distance) * closeness;
          towardY += (dy / distance) * closeness;
        } else {
          awayX -= (dx / distance) * closeness;
          awayY -= (dy / distance) * closeness;
        }
      };

      for (let i = 0; i < world.count; i++) {
        const kind = world.kind[i] % 3;
        prey = preyOf(kind);
        hunter = hunterOf(kind);
        towardX = towardY = awayX = awayY = 0;
        grid.forEachNeighbor(world, i, reach, visit);
        world.ax[i] += (towardX * values.chase * CHASE_GAIN + awayX * values.flee * FLEE_GAIN) * weight;
        world.ay[i] += (towardY * values.chase * CHASE_GAIN + awayY * values.flee * FLEE_GAIN) * weight;
      }
    },
  };
}
