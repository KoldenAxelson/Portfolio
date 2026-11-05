// Shared by wrap-clock.ts and signed-clock.ts: where the positions of a
// 2^bits-position clock sit, and which of them get a number printed beside
// them. Position 0 is at the top and counting goes clockwise, like a clock.

export interface Point {
  x: number;
  y: number;
}

export const FACE = { centre: 180, radius: 126, labelRadius: 152 };

export function positionPoint(index: number, count: number, radius: number = FACE.radius): Point {
  const angle = (index / count) * 2 * Math.PI - Math.PI / 2;
  return { x: FACE.centre + radius * Math.cos(angle), y: FACE.centre + radius * Math.sin(angle) };
}

// Every position is labelled on small clocks; bigger ones label every few, so
// the numbers never overlap.
export function isLabelled(index: number, count: number): boolean {
  const step = count <= 16 ? 1 : count <= 32 ? 2 : count <= 64 ? 4 : 32;
  return index % step === 0;
}

export const formatInteger = (value: number): string => value.toLocaleString('en-US').replace('-', '−');

export const binary = (value: number, bits: number): string => value.toString(2).padStart(bits, '0');
