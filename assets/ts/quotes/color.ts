// Colour plumbing shared by the lattice and the solver.
//
// Both read their palette out of the stylesheet so the theme (including the
// dark-mode swap) stays the single source of truth, and the stylesheet answers
// in two different shapes: `color` comes back as "rgb(24, 24, 27)" while a
// custom property comes back as the bare triple "3 119 55". Pulling the numbers
// out with a regex handles either without caring which it got.

export type Rgb = [number, number, number];

export function parseRgb(css: string): Rgb {
  const parts = css.match(/-?[\d.]+/g);
  if (!parts || parts.length < 3) return [0, 0, 0];
  return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
}

export function mixRgb(from: Rgb, to: Rgb, amount: number): Rgb {
  return [
    from[0] + (to[0] - from[0]) * amount,
    from[1] + (to[1] - from[1]) * amount,
    from[2] + (to[2] - from[2]) * amount,
  ];
}

export const rgbCss = (rgb: Rgb): string =>
  `rgb(${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(rgb[2])})`;
