/* The contract every emergent behaviour implements. A behaviour is a parameter
 * group (so the panel and presets handle it for free) plus a few hooks the
 * engine calls each step. To add one, see docs/authoring/emergence.md. */

import type { TrailField } from './field';
import type { NeighborGrid } from './neighbors';
import type { ParamGroup, SpecSet } from './params';
import type { World } from './world';

/** Everything a behaviour may read or write during a step. */
export interface Sim {
  readonly world: World;
  readonly grid: NeighborGrid;
  readonly field: TrailField;
  /** Seconds of simulated time this step covers, already time-scaled. */
  readonly dt: number;
}

/** How much of a behaviour is in the blend. Weight scales everything it does. */
export interface Mix {
  enabled: boolean;
  weight: number;
}

export interface Behavior<S extends SpecSet = SpecSet> extends ParamGroup<S> {
  /** A few words on what it does; shown as the group's tooltip. */
  readonly summary: string;
  readonly mix: Mix;
  /** Largest distance it queries neighbours at, or 0 if it never does. */
  neighborRadius(): number;
  /** Adds into world.ax/ay (and may steer world.vx/vy) before integration. */
  apply(sim: Sim, weight: number): void;
  /** Runs after particles have moved, e.g. to deposit into the trail. */
  afterMove?(sim: Sim, weight: number): void;
  /** The population was rebuilt, possibly with a new species count. */
  reset?(species: number): void;
  /** Re-rolls whatever this behaviour randomises (the Shuffle button). */
  shuffle?(): void;
  /** Extra controls beyond its sliders. Call `changed` after any edit. */
  mountControls?(host: HTMLElement, changed: () => void): ControlsHandle;
}

export interface ControlsHandle {
  /** Re-reads the behaviour's state into the controls (after a preset, say). */
  sync(): void;
}

export const DEFAULT_MIX: Readonly<Mix> = { enabled: true, weight: 1 };
