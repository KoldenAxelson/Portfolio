// Canvas sizing, shared by the lattice and the solver.

// How many backing-store pixels each canvas is allowed. A fullscreen 1512×982
// display at devicePixelRatio 2 is 5.9 Mpx, and the solver's display shader runs
// eight texture reads on every one of them — measured on this page, dropping
// from 5.0 Mpx to 1.3 Mpx nearly doubled the frame rate. Nothing is lost by it:
// the smoke is upscaled from a 512-tall dye texture, so the extra pixels were
// only ever resampling detail that was never in the source.
//
// The lattice gets a larger budget and never goes below 1×, because its dots are
// hard-edged and do show the difference.
export const FLUID_PIXEL_BUDGET = 1_400_000;
export const FLUID_MIN_SCALE = 0.6;
export const LATTICE_PIXEL_BUDGET = 2_600_000;

// Device pixels per CSS pixel, capped so area stays inside the budget. Returns
// a scale rather than dimensions so the caller keeps its own rounding.
export function backingScale(
  cssWidth: number,
  cssHeight: number,
  budgetPx: number,
  minScale = 1,
): number {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const area = cssWidth * cssHeight * dpr * dpr;
  if (area <= budgetPx) return dpr;
  return Math.max(minScale, dpr * Math.sqrt(budgetPx / area));
}

// getBoundingClientRect forces a layout, and pointermove can fire several times
// between paints. Holding one rect per frame collapses that to a single
// measurement without needing scroll and resize listeners to stay correct — the
// animation loop drops the cached value at the top of every frame.
export interface RectCache {
  get: () => DOMRect;
  invalidate: () => void;
}

export function createRectCache(element: Element): RectCache {
  let cached: DOMRect | null = null;
  return {
    get: () => (cached ??= element.getBoundingClientRect()),
    invalidate: () => {
      cached = null;
    },
  };
}
