/* The loop layer: an additive HDR target the size of the scene that strings.ts and loops.ts draw into each frame
 * (strings, event loops, flare arcades, rain), then shaders/star.ts adds it to the EUV image (.rgb) or, in the
 * coronagraphs, reads its .r as an electron column x1000. sim.ts owns the target and the pass; drawers only
 * record draws into it. */

import type { View } from './views';

export const LAYER_FORMAT: GPUTextureFormat = 'rgba16float';

/** Blend state every layer drawer uses: plain additive. */
export const ADDITIVE: GPUBlendState = {
  color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
  alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
};

export interface LayerFrame {
  /** Target size, render px. */
  readonly width: number;
  readonly height: number;
  /** Star centre in render px, WebGPU pixel coordinates (x right, y DOWN), parallax included. A star-frame point p
   *  maps to view q = rotY(rotation) p and to pixel (starX + q.x * radiusPx, starY - q.y * radiusPx). */
  readonly starX: number;
  readonly starY: number;
  /** One stellar radius in render px (already divided by the C3 wide zoom in that view). */
  readonly radiusPx: number;
  /** Star rotation, rad: view = rotY(rotation) * star frame, rotY(a) v = (c vx + s vz, vy, -s vx + c vz). */
  readonly rotation: number;
  readonly view: View;
  /** Heliosphere clock (star seconds), reduced modulo 1e6 so f32 phases keep their precision. */
  readonly windClockS: number;
  /** Plasma clock, anim units (6660 star s), the one the surface flow and loop plasma run on. */
  readonly animClock: number;
  /** Camera tilt and view direction are fixed: the camera looks down -z from +z. */
}

/** What every layer drawer provides. `draw` records into a pass sim.ts has begun on the layer target. */
export interface LayerDrawer {
  draw(pass: GPURenderPassEncoder, frame: LayerFrame): void;
}
