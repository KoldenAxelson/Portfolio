/* Where the star sits on the stage and how much it glows, shared by the WebGPU renderer (sim.ts, shaders/star.ts)
 * and the WebGL2 fallback (fallback/webgl2.ts), so the two draw the same picture. */

import type { BloomSettings } from '../../site/gpu/bloom';
import type { View } from './views';

/** Disc radius as a fraction of the stage's short side, per kind of view: the disc views frame the limb and
 *  the low corona; the coronagraphs pull back to show ~5 R (C2) and, through their zoom, ~22 R (C3). */
const DISC_FRACTION = 0.33;
const CORONAGRAPH_FRACTION = 0.09;
const C3_HALF_FIELD_R = 22;

/** The pointer's parallax shift of the star, as fractions of the stage height per unit of pointer (x, y). */
export const PARALLAX = [0.030, 0.022] as const;

/** How much of the bloom chain the tone map adds back, and the chain's own settings (site/gpu/bloom.ts). */
export const BLOOM_STRENGTH = 0.12;
export const BLOOM_SETTINGS: BloomSettings = { threshold: 1.0, knee: 0.5, radius: 1.0 };

/** The disc radius (px) and, for the wide coronagraph, how many times more radii it fits on screen. */
export function framing(view: View, width: number, height: number): { radius: number; zoom: number } {
  const short = Math.min(width, height);
  const radius = short * (view.kind === 'coronagraph' ? CORONAGRAPH_FRACTION : DISC_FRACTION);
  return { radius, zoom: view.wide ? Math.max(3.7, C3_HALF_FIELD_R * radius / (0.5 * short)) : 1 };
}
