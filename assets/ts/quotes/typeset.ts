// Turning a quote into lattice points: wrap it, size it, rasterise it, sample it.

const MAX_FONT_PX = 96;
const MIN_FONT_PX = 18;
const FONT_STEP = 2;
export const LINE_HEIGHT = 1.16;
const MAX_LINES = 4;
export const WIDTH_RATIO = 0.92; // of the canvas box
export const HEIGHT_RATIO = 0.9;

const MAX_DOTS = 6000;
const ALPHA_HIT = 128;

export type FontAt = (px: number) => string;

export interface Fitted {
  size: number;
  lines: string[][];
}

export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    // The empty-line case forces at least one word per line, so a single
    // unbreakable word overflows instead of looping forever.
    if (!line || ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
      continue;
    }
    lines.push(line);
    line = word;
  }
  if (line) lines.push(line);
  return lines;
}

// One size for the whole deck, chosen for the quote that needs the most room, so
// a transition never reads as a zoom and dot density stays constant across it.
export function fitFont(
  ctx: CanvasRenderingContext2D,
  texts: string[],
  fontAt: FontAt,
  maxWidth: number,
  maxHeight: number,
): Fitted {
  for (let size = MAX_FONT_PX; size >= MIN_FONT_PX; size -= FONT_STEP) {
    ctx.font = fontAt(size);
    const lines = texts.map((text) => wrapText(ctx, text, maxWidth));
    if (allFit(ctx, lines, size, maxWidth, maxHeight)) return { size, lines };
  }
  ctx.font = fontAt(MIN_FONT_PX);
  return { size: MIN_FONT_PX, lines: texts.map((text) => wrapText(ctx, text, maxWidth)) };
}

function allFit(
  ctx: CanvasRenderingContext2D,
  lines: string[][],
  size: number,
  maxWidth: number,
  maxHeight: number,
): boolean {
  return lines.every(
    (quote) =>
      quote.length <= MAX_LINES &&
      quote.length * size * LINE_HEIGHT <= maxHeight &&
      quote.every((line) => ctx.measureText(line).width <= maxWidth),
  );
}

// Sample rasterised text on a grid and return [x0, y0, x1, y1, …] sorted by x
// (then y). The sort is what makes a transition legible: paired against the
// dot pool in the same order, points stay in their column and the line reflows
// in place instead of every dot taking a random diagonal across the box.
export function samplePoints(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  gap: number,
): Float32Array {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let y = 0; y < height; y += gap) {
    const rowStart = Math.min(height - 1, Math.round(y)) * width;
    for (let x = 0; x < width; x += gap) {
      const at = (rowStart + Math.min(width - 1, Math.round(x))) * 4 + 3;
      if (pixels[at] <= ALPHA_HIT) continue;
      xs.push(x);
      ys.push(y);
    }
  }

  const stride = Math.ceil(xs.length / MAX_DOTS) || 1;
  const kept: number[] = [];
  for (let i = 0; i < xs.length; i += stride) kept.push(i);
  kept.sort((a, b) => xs[a] - xs[b] || ys[a] - ys[b]);

  const points = new Float32Array(kept.length * 2);
  for (let i = 0; i < kept.length; i++) {
    points[i * 2] = xs[kept[i]];
    points[i * 2 + 1] = ys[kept[i]];
  }
  return points;
}
