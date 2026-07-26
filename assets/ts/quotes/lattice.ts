// The lattice. Each quote is rasterised offscreen and sampled on a grid; every
// hit becomes a point that can be drawn as a dot and that contributes to the
// glyph mask the solver reads. A quote change eases every point from where it is
// to where it needs to be, staggered left to right, so the line rewrites itself
// rather than snapping.

import { mixRgb, parseRgb, rgbCss, type Rgb } from './color';
import type { Flow } from './bridge';
import { FONT_STACKS, type Tune } from './knobs';
import {
  fitFont,
  HEIGHT_RATIO,
  LINE_HEIGHT,
  samplePoints,
  WIDTH_RATIO,
  type FontAt,
} from './typeset';
import {
  backingScale,
  createRectCache,
  LATTICE_PIXEL_BUDGET,
  type RectCache,
} from './viewport';

// Sampling grid, tied to the font size so density holds whether the text is set
// at 90px on a desktop or 28px on a phone. A twentieth of the size is where the
// glyphs read cleanly but the grain still reads as dots — coarser goes spindly,
// finer fuses into solid letters. The gap stays fractional on purpose: rounding
// it to whole pixels is what would break the ratio on small type.
const GAP_DIVISOR = 20;
const MIN_GAP_PX = 1.6;
// Radius as a fraction of the gap. Fixing the ratio rather than the radius is
// what keeps the grain identical at every size.
const DOT_RATIO = 0.52;
// Merge mode needs fatter dots or the blurred fields never reach each other and
// the filter simply dissolves them.
const GOO_DOT_SCALE = 1.9;
const OPAQUE_ENOUGH = 0.985; // above this a dot joins the single batched fill
const VISIBLE_ENOUGH = 0.02;

// A spring gets a dot home fast but arrives with no shape to the motion; an
// eased tween ramps up and slows into place. The stagger is keyed to a dot's x,
// and target points arrive x-sorted, so a new line resolves left to right.
const STAGGER_MS = 420;
const STAGGER_JITTER_MS = 120;
const ENTRY_SCATTER = 46; // px of jitter on the first paint, so it assembles

// Cursor interaction rides on top of the tween as a springy offset, so shoving
// the field around never fights the transition or leaves dots off-target.
const CURSOR_RADIUS = 95;
const CURSOR_PUSH = 1.7;
const OFFSET_FRICTION = 0.86;

// The smoke pushes back: each point leans into whatever is passing over it. This
// has to stay small, and not only for legibility — the mask is built from these
// same points, so displacing the lattice moves the illumination, which moves the
// flow, which displaces the lattice again. The spring holds against a gentle
// lean; it cannot hold against one that overwhelms it every frame.
const FLOW_DENSITY_GATE = 0.12; // below this there's no smoke there to push

// Mask resolution. Cell size and blur set the scale the solver can resolve:
// coarse cells with a wide blur smear a whole word into one mound, so a cell is
// roughly a stroke width and the mask follows the letterforms. The column cap
// only bites on very wide viewports, where it stops the per-frame cost growing
// with the window.
const MASK_CELL_PX = 4;
const MASK_MAX_COLS = 400;
const MASK_BLUR_PASSES = 2;
const MASK_NORM_EASE = 0.08; // the normaliser eases, or the mask flickers
const EMIT_GAIN = 0.8; // scales accumulated dots-per-cell into 0..1

const TAU = Math.PI * 2;

interface Dot {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  x: number; // tween output — the dot's base position
  y: number;
  offsetX: number; // cursor and flow lean, springs back to 0
  offsetY: number;
  velocityX: number;
  velocityY: number;
  delay: number;
  alpha: number;
  fromAlpha: number;
  toAlpha: number; // 0 parks a dot the current quote can't use
  emit: number; // 0..1 envelope of the current pulse
  pulseStart: number; // ms timestamp the pulse opened
  pulseNext: number; // and when the next one opens
}

export interface FrameInput {
  now: number;
  previous: number;
  // Canvas-space cursor, or null when the cursor is off or away.
  cursor: { x: number; y: number } | null;
  flow: Flow | null;
  // Whether anything is reading the mask this frame. Building it costs a blur
  // over the whole grid and a texture-sized putImageData, both wasted when the
  // smoke is off.
  emitting: boolean;
}

export interface Lattice {
  mask: HTMLCanvasElement;
  fill: () => string;
  accent: () => string;
  layout: (quoteIndex: number) => void;
  refreshPalette: () => void;
  retarget: (quoteIndex: number) => void;
  update: (input: FrameInput) => void;
  paint: (showDots: boolean, merged: boolean) => void;
  applyFilters: (merged: boolean) => void;
  cursorAt: (event: PointerEvent) => { x: number; y: number };
  startOfFrame: () => void;
}

export function createLattice(
  root: HTMLElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  quotes: string[],
  tune: Tune,
  reduceMotion: boolean,
): Lattice | null {
  const offscreen = document.createElement('canvas');
  const offscreenCtx = offscreen.getContext('2d', { willReadFrequently: true });
  // Drawn at mask resolution and uploaded as-is; the solver samples it with
  // bilinear filtering, which does the smoothing for free.
  const mask = document.createElement('canvas');
  const maskCtx = mask.getContext('2d');
  if (!offscreenCtx || !maskCtx) return null;

  const rect: RectCache = createRectCache(canvas);
  // Zeroing the durations, rather than branching through the draw path, is what
  // makes prefers-reduced-motion a straight cut: the same tween runs, it just
  // completes on its first frame.
  const staggerMs = reduceMotion ? 0 : STAGGER_MS;
  const staggerJitterMs = reduceMotion ? 0 : STAGGER_JITTER_MS;
  const entryScatter = reduceMotion ? 0 : ENTRY_SCATTER;

  let dots: Dot[] = [];
  let pointSets: Float32Array[] = [];
  let dotRadius = 1.6;
  let width = 0;
  let height = 0;

  let fillCss = '#000';
  let accentCss = '#000';
  let fillRgb: Rgb = [0, 0, 0];
  let accentRgb: Rgb = [0, 0, 0];
  let dotCss = '#000';
  let dotTintApplied = -1;

  let field = new Float32Array(0); // smoothed glyph potential
  let emitField = new Float32Array(0); // and the pulsing subset of it
  let scratch = new Float32Array(0);
  let maskPixels: ImageData | null = null;
  let cols = 0;
  let rows = 0;
  let fieldNorm = 0;

  let tweenStart = -1e9; // far enough back that the first frame reads as settled
  let painted = false;
  let wasEmitting = false;

  // ---- painting -----------------------------------------------------------

  // Recomputed only when the tint knob moves: it builds a string, and a string
  // per frame is an allocation per frame for a value that rarely changes.
  const dotColor = (): string => {
    if (tune.dotTint === dotTintApplied) return dotCss;
    dotTintApplied = tune.dotTint;
    dotCss = tune.dotTint <= 0 ? fillCss : rgbCss(mixRgb(fillRgb, accentRgb, tune.dotTint));
    return dotCss;
  };

  const paint = (showDots: boolean, merged: boolean): void => {
    if (!showDots) {
      // Clear once on the way out, then leave the canvas alone. At fullscreen
      // this is several million pixels of clearing and compositing per frame for
      // an empty layer.
      if (painted) ctx.clearRect(0, 0, width, height);
      painted = false;
      return;
    }
    ctx.clearRect(0, 0, width, height);
    painted = true;

    const radius = dotRadius * tune.dotSize * (merged ? GOO_DOT_SCALE : 1);
    ctx.fillStyle = dotColor();
    ctx.globalAlpha = tune.dotOpacity;

    // Fully-opaque dots — the overwhelming majority once a transition settles —
    // go into a single path, because one fill beats a few thousand.
    ctx.beginPath();
    for (const dot of dots) {
      if (dot.alpha <= OPAQUE_ENOUGH) continue;
      const x = dot.x + dot.offsetX;
      const y = dot.y + dot.offsetY;
      ctx.moveTo(x + radius, y);
      ctx.arc(x, y, radius, 0, TAU);
    }
    ctx.fill();

    for (const dot of dots) {
      if (dot.alpha > OPAQUE_ENOUGH || dot.alpha <= VISIBLE_ENOUGH) continue;
      ctx.globalAlpha = dot.alpha * tune.dotOpacity;
      ctx.beginPath();
      ctx.arc(dot.x + dot.offsetX, dot.y + dot.offsetY, radius, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  // Dot blur and merge are composed rather than toggled by class: blur has to
  // work whether or not merge is on, and CSS applies filter functions left to
  // right, so the blur softens the lattice before the goo threshold sees it.
  const applyFilters = (merged: boolean): void => {
    const filters: string[] = [];
    if (tune.dotBlur > 0) filters.push(`blur(${tune.dotBlur}px)`);
    if (merged) filters.push('url(#quotes-goo)');
    canvas.style.filter = filters.join(' ');

    const blurNode = root.querySelector('#quotes-goo feGaussianBlur');
    const matrixNode = root.querySelector('#quotes-goo feColorMatrix');
    blurNode?.setAttribute('stdDeviation', String(tune.gooBlur));
    // The alpha row is the threshold: it multiplies alpha by K and subtracts a
    // constant, so blurred overlaps clear it and thin edges don't.
    const k = tune.gooThreshold;
    matrixNode?.setAttribute(
      'values',
      `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${k} ${-(k * 0.45).toFixed(2)}`,
    );
  };

  // ---- the mask -----------------------------------------------------------

  // Separable box blur, in place, through the shared scratch buffer.
  const boxBlur = (target: Float32Array, passes: number): void => {
    for (let pass = 0; pass < passes; pass++) {
      for (let y = 0; y < rows; y++) {
        const row = y * cols;
        for (let x = 0; x < cols; x++) {
          const left = x > 0 ? target[row + x - 1] : target[row + x];
          const right = x < cols - 1 ? target[row + x + 1] : target[row + x];
          scratch[row + x] = (left + target[row + x] + right) / 3;
        }
      }
      for (let y = 0; y < rows; y++) {
        const row = y * cols;
        const above = y > 0 ? row - cols : row;
        const below = y < rows - 1 ? row + cols : row;
        for (let x = 0; x < cols; x++) {
          target[row + x] = (scratch[above + x] + scratch[row + x] + scratch[below + x]) / 3;
        }
      }
    }
  };

  // R is the glyph field, G the emitter map, alpha pinned at 255. Both have to
  // live in colour channels: canvas pixels are stored premultiplied, so anything
  // parked in a channel is scaled by alpha on upload and a varying alpha would
  // quietly eat the emitter map wherever the glyph field is thin.
  //
  // The emitter map is deliberately not blurred. A box blur spreads a value
  // without conserving it, so one pass over a single lit cell divided its charge
  // by about nine and the pulses reached the solver at a ninth of their strength.
  // The mask is a small texture sampled with linear filtering anyway, so the
  // upscale softens its edge for free.
  const buildMask = (): void => {
    if (!cols || !rows || !maskPixels) return;
    field.fill(0);
    emitField.fill(0);
    const cellPx = width / cols;
    for (const dot of dots) {
      if (dot.alpha < 0.5) continue;
      const col = ((dot.x + dot.offsetX) / cellPx) | 0;
      const row = ((dot.y + dot.offsetY) / cellPx) | 0;
      if (col < 0 || row < 0 || col >= cols || row >= rows) continue;
      const at = row * cols + col;
      field[at] += 1;
      if (dot.emit > 0) emitField[at] += dot.emit;
    }
    boxBlur(field, MASK_BLUR_PASSES);

    let peak = 0;
    for (let i = 0; i < field.length; i++) if (field[i] > peak) peak = field[i];
    fieldNorm = fieldNorm > 0 ? fieldNorm + (peak - fieldNorm) * MASK_NORM_EASE : peak;
    const scale = fieldNorm > 0 ? 1 / fieldNorm : 1;

    const pixels = maskPixels.data;
    for (let i = 0, p = 0; i < field.length; i++, p += 4) {
      pixels[p] = Math.min(1, field[i] * scale) * 255;
      pixels[p + 1] = Math.min(1, emitField[i] * EMIT_GAIN) * 255;
    }
    maskCtx.putImageData(maskPixels, 0, 0);
  };

  // ---- per-frame ----------------------------------------------------------

  const update = ({ now, previous, cursor, flow, emitting }: FrameInput): void => {
    const frameMs = Math.max(1, now - previous);
    const elapsed = now - tweenStart;
    const tweenMs = reduceMotion ? 0 : tune.tweenMs;
    const pulseMs = Math.max(1, tune.pulseMs);

    // Pulses don't advance while nothing is reading them, so every dot would
    // come due at once on the frame the smoke is switched back on. Re-spread
    // them across a cycle instead, the same way a fresh dot is seeded.
    if (emitting && !wasEmitting) {
      for (const dot of dots) dot.pulseNext = now + Math.random() * tune.gapMax;
    }
    wasEmitting = emitting;

    for (const dot of dots) {
      tween(dot, elapsed, tweenMs);
      if (cursor) pushFromCursor(dot, cursor.x, cursor.y);
      if (emitting) pulse(dot, now, previous, frameMs, pulseMs, tune.gapMin, tune.gapMax);
      if (flow) leanIntoFlow(dot, flow, width, height, tune.flowPush);
      settleOffset(dot, tune.snappiness);
    }

    // Rebuilt every frame because the lattice moves: during a transition the
    // solver should light the letters as they re-form, not where they used to be.
    if (emitting) buildMask();
  };

  // ---- layout -------------------------------------------------------------

  // Hand every dot a new destination. Both the pool (by current x) and the target
  // points (by x, from samplePoints) are in the same order, so the pairing is
  // monotone and no dot crosses another's path. When the incoming quote needs
  // fewer points than the pool holds, the surplus doubles up on a target and
  // fades out; it flies back in when a longer quote comes around.
  const retarget = (quoteIndex: number): void => {
    const target = pointSets[quoteIndex];
    if (!target?.length || !dots.length) return;
    const count = target.length / 2;

    const order = dots.map((_, i) => i);
    order.sort((a, b) => dots[a].x - dots[b].x || dots[a].y - dots[b].y);

    let claimed = -1;
    for (let k = 0; k < order.length; k++) {
      const dot = dots[order[k]];
      const index = Math.floor((k * count) / order.length);
      dot.fromX = dot.x;
      dot.fromY = dot.y;
      dot.fromAlpha = dot.alpha;
      dot.toX = target[index * 2];
      dot.toY = target[index * 2 + 1];
      dot.toAlpha = index === claimed ? 0 : 1;
      dot.delay = (k / order.length) * staggerMs + Math.random() * staggerJitterMs;
      claimed = index;
    }
    tweenStart = performance.now();
  };

  const layout = (quoteIndex: number): void => {
    rect.invalidate();
    const box = rect.get();
    if (box.width < 2 || box.height < 2) return;

    width = Math.round(box.width);
    height = Math.round(box.height);
    const scale = backingScale(width, height, LATTICE_PIXEL_BUDGET);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    // Typeface first: it's set inline so getComputedStyle reports it below, and
    // every metric downstream — fitted size, wrap, sampling gap — has to be
    // measured against the face actually being drawn.
    canvas.style.fontFamily = FONT_STACKS[tune.font] || '';

    const style = getComputedStyle(canvas);
    readPalette(style);
    const family = style.fontFamily || 'Inter, system-ui, sans-serif';
    const weight = style.fontWeight || '700';
    const fontAt: FontAt = (px) => `${weight} ${px}px ${family}`;

    offscreen.width = width;
    offscreen.height = height;
    const { size, lines } = fitFont(
      offscreenCtx,
      quotes,
      fontAt,
      width * WIDTH_RATIO,
      height * HEIGHT_RATIO,
    );
    const gap = Math.max(MIN_GAP_PX, size / (GAP_DIVISOR * tune.dotDensity));
    dotRadius = gap * DOT_RATIO;
    pointSets = rasterise(lines, fontAt, size, gap);

    const poolSize = pointSets.reduce((most, set) => Math.max(most, set.length / 2), 0);
    if (!poolSize) return;
    const isFirstLayout = !dots.length;
    growPool(poolSize);
    retarget(quoteIndex);
    if (isFirstLayout) scatterEntry();
    allocateMask();
  };

  const rasterise = (
    lines: string[][],
    fontAt: FontAt,
    size: number,
    gap: number,
  ): Float32Array[] => {
    const lineHeight = size * LINE_HEIGHT;
    offscreenCtx.textAlign = 'center';
    offscreenCtx.textBaseline = 'middle';
    offscreenCtx.font = fontAt(size);
    offscreenCtx.fillStyle = '#fff';
    return lines.map((quoteLines) => {
      offscreenCtx.clearRect(0, 0, width, height);
      const top = height / 2 - ((quoteLines.length - 1) * lineHeight) / 2;
      quoteLines.forEach((line, i) => {
        offscreenCtx.fillText(line, width / 2, top + i * lineHeight);
      });
      const pixels = offscreenCtx.getImageData(0, 0, width, height).data;
      return samplePoints(pixels, width, height, gap);
    });
  };

  // Both the type and the dots follow the stylesheet, so the theme — including
  // the dark-mode palette swap — stays the single source of truth.
  const readPalette = (style: CSSStyleDeclaration): void => {
    fillCss = style.color;
    // Custom properties come back as the raw triple, which is all the solver
    // needs — it parses numbers out of whatever it's handed.
    accentCss = style.getPropertyValue('--c-accent').trim() || fillCss;
    fillRgb = parseRgb(fillCss);
    accentRgb = parseRgb(accentCss);
    dotTintApplied = -1;
  };

  const growPool = (poolSize: number): void => {
    const carried = dots;
    dots = new Array<Dot>(poolSize);
    for (let i = 0; i < poolSize; i++) dots[i] = carried[i] || createDot(tune.gapMax);
  };

  // Scatter the dots around their destinations so the field assembles itself on
  // arrival instead of appearing fully formed.
  const scatterEntry = (): void => {
    for (const dot of dots) {
      dot.fromX = dot.toX + (Math.random() - 0.5) * entryScatter;
      dot.fromY = dot.toY + (Math.random() - 0.5) * entryScatter;
      dot.x = dot.fromX;
      dot.y = dot.fromY;
    }
  };

  const allocateMask = (): void => {
    const cellPx = Math.max(MASK_CELL_PX, Math.ceil(width / MASK_MAX_COLS));
    cols = Math.max(2, Math.ceil(width / cellPx));
    rows = Math.max(2, Math.ceil(height / cellPx));
    field = new Float32Array(cols * rows);
    emitField = new Float32Array(cols * rows);
    scratch = new Float32Array(cols * rows);
    mask.width = cols;
    mask.height = rows;
    maskPixels = maskCtx.createImageData(cols, rows);
    for (let p = 3; p < maskPixels.data.length; p += 4) maskPixels.data[p] = 255;
  };

  return {
    mask,
    fill: () => fillCss,
    accent: () => accentCss,
    layout,
    // A palette change needs no re-measuring — the metrics are the same face at
    // the same size — so it doesn't go through layout.
    refreshPalette: () => readPalette(getComputedStyle(canvas)),
    retarget,
    update,
    paint,
    applyFilters,
    cursorAt: (event) => {
      const box = rect.get();
      return { x: event.clientX - box.left, y: event.clientY - box.top };
    },
    startOfFrame: rect.invalidate,
  };
}

// ---- per-dot steps --------------------------------------------------------

function createDot(gapMax: number): Dot {
  return {
    fromX: 0,
    fromY: 0,
    toX: 0,
    toY: 0,
    x: 0,
    y: 0,
    offsetX: 0,
    offsetY: 0,
    velocityX: 0,
    velocityY: 0,
    delay: 0,
    alpha: 0,
    fromAlpha: 0,
    toAlpha: 1,
    emit: 0,
    pulseStart: -1e9,
    // Spread the first window across a whole cycle, or every point in the quote
    // fires together on the opening frame.
    pulseNext: performance.now() + Math.random() * gapMax,
  };
}

const easeInOut = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

function tween(dot: Dot, elapsed: number, tweenMs: number): void {
  const progress = tweenMs ? Math.min(1, Math.max(0, (elapsed - dot.delay) / tweenMs)) : 1;
  const eased = easeInOut(progress);
  dot.x = dot.fromX + (dot.toX - dot.fromX) * eased;
  dot.y = dot.fromY + (dot.toY - dot.fromY) * eased;
  dot.alpha = dot.fromAlpha + (dot.toAlpha - dot.fromAlpha) * eased;
}

// An independent spring layered on top of the tween, so shoving the field never
// drags a dot off its destination.
function pushFromCursor(dot: Dot, cursorX: number, cursorY: number): void {
  const dx = dot.x + dot.offsetX - cursorX;
  const dy = dot.y + dot.offsetY - cursorY;
  const distance = Math.sqrt(dx * dx + dy * dy) || 0.001;
  if (distance >= CURSOR_RADIUS) return;
  const force = ((CURSOR_RADIUS - distance) / CURSOR_RADIUS) * CURSOR_PUSH;
  dot.velocityX += (dx / distance) * force;
  dot.velocityY += (dy / distance) * force;
}

// What's emitted this frame is the *integral* of the envelope over the frame's
// window, not the envelope sampled at an instant. Point sampling cannot work
// here: a half-second pulse spans thirty frames at 60fps and can open and close
// inside a single frame on a slow machine — sampled once, at whatever phase that
// frame lands on, and often at no phase at all. The overlap form charges the
// same total per pulse at any frame rate, which is also the only reason the rate
// constant means anything on a machine other than the one it was tuned on.
function pulse(
  dot: Dot,
  now: number,
  previous: number,
  frameMs: number,
  pulseMs: number,
  gapMin: number,
  gapMax: number,
): void {
  if (now >= dot.pulseNext) {
    // Backdated to when it was due rather than when it was noticed, so a slow
    // frame doesn't make every pulse late as well as short.
    dot.pulseStart = dot.pulseNext;
    dot.pulseNext = dot.pulseStart + pulseMs + gapMin + Math.random() * Math.max(0, gapMax - gapMin);
  }
  const windowStart = Math.max(dot.pulseStart, previous);
  const windowEnd = Math.min(dot.pulseStart + pulseMs, now);
  if (windowEnd <= windowStart || dot.alpha <= 0.5) {
    dot.emit = 0;
    return;
  }
  const centre = (windowStart + windowEnd) / 2 - dot.pulseStart;
  dot.emit = Math.sin(Math.PI * (centre / pulseMs)) * ((windowEnd - windowStart) / frameMs);
}

// The probe is bottom-up, like the framebuffer it came from, so y flips back.
function leanIntoFlow(dot: Dot, flow: Flow, width: number, height: number, push: number): void {
  const fx = Math.min(flow.width - 1, Math.max(0, ((dot.x / width) * flow.width) | 0));
  const fy = Math.min(flow.height - 1, Math.max(0, ((1 - dot.y / height) * flow.height) | 0));
  const at = (fy * flow.width + fx) * 4;
  const density = flow.data[at + 2] / 255;
  if (density <= FLOW_DENSITY_GATE) return;
  const force = push * density;
  dot.velocityX += (flow.data[at] / 255 - 0.5) * 2 * force;
  dot.velocityY -= (flow.data[at + 1] / 255 - 0.5) * 2 * force;
}

function settleOffset(dot: Dot, spring: number): void {
  dot.velocityX -= dot.offsetX * spring;
  dot.velocityY -= dot.offsetY * spring;
  dot.velocityX *= OFFSET_FRICTION;
  dot.velocityY *= OFFSET_FRICTION;
  dot.offsetX += dot.velocityX;
  dot.offsetY += dot.velocityY;
}
