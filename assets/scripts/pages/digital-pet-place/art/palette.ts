// palette.ts — colour helpers over Phaser's packed 0xRRGGBB ints.

export function mix(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

export const lighten = (c: number, t: number): number => mix(c, 0xffffff, t);
export const darken = (c: number, t: number): number => mix(c, 0x000000, t);

export function hex(c: number): string {
  return `#${c.toString(16).padStart(6, '0')}`;
}

// The garden's own palette — soft, a little storybook. Kept separate from the
// five stat colours, which must stay recognisable everywhere.
export const INK = 0x2a2438;
export const CREAM = 0xf3ead8;
export const SKY_TOP = 0x8fd3f4;
export const SKY_BOTTOM = 0xe8f6ff;
export const HILL_FAR = 0x9ad3a5;
export const HILL_NEAR = 0x6fbf7a;
export const GRASS = 0x5fb56b;
export const GRASS_DARK = 0x4e9e5c;
export const NIGHT_TOP = 0x070a1c;
export const NIGHT_BOTTOM = 0x1b2450;
export const PANEL = 0xfffaf0;
export const PANEL_LINE = 0xd9cdb8;
export const MUTED = 0x8a8194;
export const GOLD = 0xf5c542;
export const VIOLET = 0x7c3aed;
export const PINK = 0xf9a8c9;
