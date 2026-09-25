// Shared SVG plotting helpers for the ML demos (descent, overfit, search), which
// draw on the same 300 × 200 plot; descent and overfit also score fits by mean
// squared error.

export interface Point {
  x: number;
  y: number;
}

export const PLOT_WIDTH = 300;
export const PLOT_HEIGHT = 200;

const SVG_NS = 'http://www.w3.org/2000/svg';

export function svgElement<K extends keyof SVGElementTagNameMap>(tag: K, attributes: Record<string, string | number>): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
  return element;
}

export function meanSquaredError(points: Point[], predict: (x: number) => number): number {
  return points.reduce((sum, p) => sum + (predict(p.x) - p.y) ** 2, 0) / points.length;
}
