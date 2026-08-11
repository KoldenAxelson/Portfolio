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
// However short the machine is, below this the dots stop being dots.
const ABSOLUTE_MIN_SCALE = 0.5;

// A single multiplier over both budgets, turned down by the frame governor in
// index.ts when the frames actually landing say this machine cannot afford the
// pixels. It only ever goes down and only so far — a page that visibly
// oscillates between quality levels is worse than one that settles low.
let qualityScale = 1;
const MIN_QUALITY = 0.45;

export function reduceQuality(): boolean {
  if (qualityScale <= MIN_QUALITY) return false;
  qualityScale = Math.max(MIN_QUALITY, qualityScale * 0.6);
  return true;
}

export const getQuality = (): number => qualityScale;

// Device pixels per CSS pixel, capped so area stays inside the budget. Returns
// a scale rather than dimensions so the caller keeps its own rounding.
// `quality` is passed in rather than read off the module state above, because
// this file is compiled into both bundles and each one gets its own copy of that
// state. The solver's copy is never turned down — it reads the real figure off
// the bridge and hands it in here.
export function backingScale(
  cssWidth: number,
  cssHeight: number,
  budgetPx: number,
  minScale = 1,
  quality = 1,
): number {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const area = cssWidth * cssHeight * dpr * dpr;
  const fitted = area <= budgetPx ? dpr : Math.max(minScale, dpr * Math.sqrt(budgetPx / area));
  // The quality knob scales the answer rather than the budget. Trimming the
  // budget does nothing to a canvas that was already inside it — which is the
  // usual case, since the module is a fixed 720x416 at any window size, and it
  // is the machine that is short, not the pixel count.
  return Math.max(ABSOLUTE_MIN_SCALE, fitted * quality);
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
