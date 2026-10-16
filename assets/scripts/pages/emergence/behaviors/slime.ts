/* Slime mold (Physarum, after Jeff Jones): each particle smells the trail at
 * three sensors ahead of it, left, forward and right, turns toward the
 * strongest, and leaves trail behind it. Heading comes from velocity, so it
 * needs no state of its own and blends with the other behaviours.
 *
 * Coupling is how the turn reaches the particle, the open question in the
 * video this page grew from: rotate the velocity outright, add a sideways
 * force that the other behaviours can fight, or pull toward the scent. */

import { DEFAULT_MIX } from '../behavior';
import type { Behavior } from '../behavior';
import { choice, createGroup, range } from '../params';

const PULL_GAIN = 40;
const RADIANS_PER_DEGREE = Math.PI / 180;

const specs = {
  coupling: choice('Coupling', [
    { value: 'steer', label: 'Steer' },
    { value: 'force', label: 'Force' },
    { value: 'pull', label: 'Pull' },
  ], 'steer'),
  sensorReach: range('Sensor reach', 4, 120, 1, 26),
  sensorAngle: range('Sensor angle', 5, 90, 1, 35),
  turnRate: range('Turn rate', 0, 40, 0.5, 6),
  deposit: range('Deposit', 0, 10, 0.1, 1),
};

/** -1 turn left, +1 turn right, 0 hold course. */
function chooseTurn(left: number, forward: number, right: number): number {
  if (forward >= left && forward >= right) return 0;
  if (forward < left && forward < right && left === right) return Math.random() < 0.5 ? -1 : 1;
  return right > left ? 1 : -1;
}

export function createSlime(): Behavior<typeof specs> {
  const group = createGroup('Slime Mold', specs);
  const values = group.values;

  return {
    ...group,
    summary: 'Follow and lay a chemical trail',
    mix: { ...DEFAULT_MIX },
    neighborRadius: () => 0,

    apply({ world, field, dt }, weight) {
      const reach = values.sensorReach;
      const spread = values.sensorAngle * RADIANS_PER_DEGREE;
      const rate = values.turnRate * weight;
      for (let i = 0; i < world.count; i++) {
        const vx = world.vx[i];
        const vy = world.vy[i];
        const speed = Math.hypot(vx, vy);
        if (speed < 1e-3) continue;
        const heading = Math.atan2(vy, vx);
        const x = world.x[i];
        const y = world.y[i];
        const left = field.sample(x + Math.cos(heading - spread) * reach, y + Math.sin(heading - spread) * reach);
        const forward = field.sample(x + Math.cos(heading) * reach, y + Math.sin(heading) * reach);
        const right = field.sample(x + Math.cos(heading + spread) * reach, y + Math.sin(heading + spread) * reach);
        const turn = chooseTurn(left, forward, right);
        if (turn === 0) continue;

        if (values.coupling === 'steer') {
          const angle = turn * rate * dt;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          world.vx[i] = vx * cos - vy * sin;
          world.vy[i] = vx * sin + vy * cos;
          continue;
        }
        if (values.coupling === 'force') {
          // Centripetal acceleration for turning at `rate` rad/s at this speed.
          world.ax[i] -= vy * turn * rate;
          world.ay[i] += vx * turn * rate;
          continue;
        }
        const target = heading + turn * spread;
        world.ax[i] += Math.cos(target) * rate * PULL_GAIN;
        world.ay[i] += Math.sin(target) * rate * PULL_GAIN;
      }
    },

    afterMove({ world, field, dt }, weight) {
      // Scaled by dt so the trail's density doesn't depend on the Speed slider.
      const amount = values.deposit * weight * dt * 60;
      for (let i = 0; i < world.count; i++) field.deposit(world.x[i], world.y[i], amount);
    },
  };
}
