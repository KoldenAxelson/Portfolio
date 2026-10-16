/* One simulation step, and the parameter groups that belong to the world
 * rather than to any behaviour: who exists, how they move, how the trail
 * behaves. Behaviours only produce acceleration; integration lives here so
 * every blend obeys the same drag and speed limits. */

import type { Behavior, Sim } from './behavior';
import { choice, createGroup, range } from './params';
import { MAX_SPECIES, wrap } from './world';

/** Any change in this group rebuilds the population (see lab.ts). */
export const populationSpecs = {
  count: range('Particles', 200, 5000, 100, 2400),
  species: range('Species', 1, MAX_SPECIES, 1, 5),
  layout: choice('Start', [
    { value: 'scatter', label: 'Scatter' },
    { value: 'disc', label: 'Disc' },
    { value: 'clusters', label: 'Clusters' },
  ], 'scatter'),
};

export const motionSpecs = {
  timeScale: range('Speed', 0, 3, 0.05, 1),
  drag: range('Drag', 0, 20, 0.1, 4),
  minSpeed: range('Min speed', 0, 200, 1, 0),
  maxSpeed: range('Max speed', 10, 600, 5, 180),
  jitter: range('Jitter', 0, 300, 1, 10),
};

export const trailSpecs = {
  diffusion: range('Diffusion', 0, 1, 0.01, 0.3),
  decay: range('Evaporation', 0, 5, 0.05, 0.8),
};

export function createEngineGroups() {
  return {
    population: createGroup('Population', populationSpecs),
    motion: createGroup('Motion', motionSpecs),
    trail: createGroup('Trail', trailSpecs),
  };
}

export type EngineGroups = ReturnType<typeof createEngineGroups>;

/** Real seconds per step before time scaling. One step per frame keeps the
 *  sim deterministic per frame; a slow machine just runs it in slow motion. */
export const BASE_DT = 1 / 60;

export function step(sim: Sim, behaviors: readonly Behavior[], groups: EngineGroups): void {
  const { world, grid, field } = sim;
  const active = behaviors.filter((behavior) => behavior.mix.enabled && behavior.mix.weight > 0);

  world.ax.fill(0);
  world.ay.fill(0);
  const radius = Math.max(0, ...active.map((behavior) => behavior.neighborRadius()));
  if (radius > 0) grid.rebuild(world, radius);
  for (const behavior of active) behavior.apply(sim, behavior.mix.weight);

  integrate(sim, groups.motion.values);

  for (const behavior of active) behavior.afterMove?.(sim, behavior.mix.weight);
  field.update(groups.trail.values.diffusion, groups.trail.values.decay, sim.dt);
}

function integrate(sim: Sim, motion: EngineGroups['motion']['values']): void {
  const { world, dt } = sim;
  const keep = Math.exp(-motion.drag * dt);
  const jitter = motion.jitter;
  for (let i = 0; i < world.count; i++) {
    let vx = (world.vx[i] + (world.ax[i] + (Math.random() - 0.5) * 2 * jitter) * dt) * keep;
    let vy = (world.vy[i] + (world.ay[i] + (Math.random() - 0.5) * 2 * jitter) * dt) * keep;
    const speed = Math.hypot(vx, vy);
    const limited = clampSpeed(speed, motion.minSpeed, motion.maxSpeed);
    if (speed > 0 && limited !== speed) {
      vx *= limited / speed;
      vy *= limited / speed;
    }
    world.vx[i] = vx;
    world.vy[i] = vy;
    world.x[i] = wrap(world.x[i] + vx * dt, world.width);
    world.y[i] = wrap(world.y[i] + vy * dt, world.height);
  }
}

function clampSpeed(speed: number, min: number, max: number): number {
  return Math.min(Math.max(speed, Math.min(min, max)), max);
}
