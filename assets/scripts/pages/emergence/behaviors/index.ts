/* The registry. A new behaviour is one file in this folder plus one line here;
 * the panel, the mix controls and presets pick it up from this object. Order
 * is panel order. */

import { createBoids } from './boids';
import { createParticleLife } from './particle-life';
import { createSlime } from './slime';

export function createBehaviors() {
  return {
    boids: createBoids(),
    particleLife: createParticleLife(),
    slime: createSlime(),
  };
}

export type BehaviorSet = ReturnType<typeof createBehaviors>;
export type BehaviorId = keyof BehaviorSet;
