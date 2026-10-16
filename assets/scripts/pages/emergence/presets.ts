/* Named starting points. A preset resets every group to its defaults, sets the
 * mix (a behaviour absent from `mix` is switched off), then applies its
 * overrides. Override keys are type-checked against each group's specs. */

import type { BehaviorId, BehaviorSet } from './behaviors';
import type { EngineGroups } from './engine';
import type { createViewGroup } from './render';

type GroupValues =
  { [K in keyof EngineGroups]: EngineGroups[K]['values'] } &
  { view: ReturnType<typeof createViewGroup>['values'] } &
  { [K in BehaviorId]: BehaviorSet[K]['values'] };

export type Overrides = { readonly [K in keyof GroupValues]?: Partial<GroupValues[K]> };

export interface Preset {
  readonly id: string;
  readonly label: string;
  readonly mix: Readonly<Partial<Record<BehaviorId, number>>>;
  readonly params?: Overrides;
  /** Runs after the population is rebuilt, for state that isn't a parameter. */
  readonly prepare?: (behaviors: BehaviorSet) => void;
}

export const PRESETS: readonly Preset[] = [
  {
    id: 'all-three',
    label: 'All three',
    mix: { boids: 0.5, particleLife: 1, slime: 0.6 },
    params: {
      slime: { coupling: 'force' },
    },
  },
  {
    id: 'particle-life',
    label: 'Particle Life',
    mix: { particleLife: 1 },
    params: {
      population: { count: 3200, species: 6 },
      motion: { drag: 10, maxSpeed: 400, jitter: 0 },
      view: { showTrail: false },
    },
  },
  {
    id: 'snakes',
    label: 'Snakes',
    mix: { particleLife: 1 },
    params: {
      population: { species: 6 },
      motion: { drag: 8, maxSpeed: 400, jitter: 0 },
      particleLife: { reach: 60 },
      view: { showTrail: false },
    },
    prepare: (behaviors) => behaviors.particleLife.matrix.seed('chain'),
  },
  {
    id: 'flocks',
    label: 'Flocks',
    mix: { boids: 1 },
    params: {
      population: { count: 1800, species: 3 },
      motion: { drag: 0.3, minSpeed: 70, maxSpeed: 150, jitter: 30 },
      boids: { vision: 70, alignment: 2, cohesion: 0.5 },
      view: { showTrail: false, dotSize: 2 },
    },
  },
  {
    id: 'slime-mold',
    label: 'Slime Mold',
    mix: { slime: 1 },
    params: {
      population: { count: 5000, species: 1 },
      motion: { drag: 0, minSpeed: 60, maxSpeed: 60, jitter: 0 },
      slime: { turnRate: 20, sensorReach: 40, sensorAngle: 40 },
      trail: { diffusion: 0.2, decay: 2.5 },
      view: { showParticles: false },
    },
  },
  {
    id: 'flock-trails',
    label: 'Flock trails',
    mix: { boids: 1, slime: 0.8 },
    params: {
      population: { count: 3000, species: 2 },
      motion: { drag: 0.3, minSpeed: 60, maxSpeed: 140, jitter: 20 },
      slime: { coupling: 'force' },
      view: { ramp: 'ember' },
    },
  },
];
