/* Colours for the stage. The stage is always dark whatever the site theme, so
 * these are fixed rather than read from the --c-* tokens. */

import type { ChoiceOption } from './params';
import { MAX_SPECIES } from './world';

export const SPECIES_COLORS: readonly string[] = [
  '#ff5e5b', '#ffd23f', '#3bceac', '#4cc9f0', '#b388ff', '#ff8fab', '#9ef01a', '#ff9f1c',
];

if (SPECIES_COLORS.length < MAX_SPECIES) throw new Error('emergence: one colour per species');

type Rgb = readonly [number, number, number];

/** Trail colour ramps, dark to bright. Keys are the View group's choice values. */
const RAMPS: Record<string, { label: string; stops: readonly Rgb[] }> = {
  topographic: { label: 'Topographic', stops: [[5, 5, 9], [16, 40, 110], [24, 140, 150], [120, 200, 120], [245, 236, 210]] },
  ember: { label: 'Ember', stops: [[5, 5, 9], [70, 10, 30], [180, 40, 20], [250, 150, 40], [255, 245, 200]] },
  moss: { label: 'Moss', stops: [[5, 5, 9], [10, 40, 25], [30, 110, 50], [160, 210, 80], [240, 255, 210]] },
  mono: { label: 'Mono', stops: [[5, 5, 9], [60, 60, 70], [150, 150, 160], [235, 235, 240]] },
};

export const RAMP_OPTIONS: readonly ChoiceOption[] = Object.entries(RAMPS).map(([value, ramp]) => ({ value, label: ramp.label }));

/** 256 packed pixels for an ImageData Uint32 view (little-endian ABGR). */
export function buildLookup(rampName: string): Uint32Array {
  const stops = (RAMPS[rampName] ?? RAMPS.topographic).stops;
  const lookup = new Uint32Array(256);
  for (let index = 0; index < 256; index++) {
    const position = (index / 255) * (stops.length - 1);
    const lower = Math.min(stops.length - 2, Math.floor(position));
    const blend = position - lower;
    const [r, g, b] = stops[lower].map((channel, c) => Math.round(channel + (stops[lower + 1][c] - channel) * blend));
    lookup[index] = (255 << 24) | (b << 16) | (g << 8) | r;
  }
  return lookup;
}
