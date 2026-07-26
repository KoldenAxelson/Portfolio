// /quotes — the lattice. Each quote is rasterized to an offscreen canvas and
// sampled on a grid, and every hit becomes a lattice point that can be drawn as a
// dot and that contributes to a glyph mask. A quote change eases every point from
// where it is to where it needs to be, staggered left to right, so the line
// rewrites itself rather than snapping.
//
// The smoke is not here. Five attempts at faking it — sprites, buffer feedback,
// gravity wells, differenced noise — all failed the same way, because smoke reads
// as smoke through advection: density carried along a velocity field that curls
// back into itself. That's a fluid solver, and it lives in ts/quotes-fluid.ts as
// its own WebGL bundle. What this file gives it is the mask (see __quotes below),
// which the solver uses to decide where the smoke is lit.
//
// Progressive enhancement: the server-rendered <ul> is the real content. This
// module flags the section .is-live (CSS then hides the list and reveals the
// canvas). The canvas draws plain text — inline Markdown in a quote still
// renders, but only in that list, which is what no-JS and screen readers get.

// Particle grid. GAP_DIVISOR ties the sampling grid to the font size, so density
// holds whether the text is set at 90px on a desktop or 28px on a phone, and the
// particle count stays near-constant across viewports (~4k). /20 is the point
// where the glyphs read cleanly but the grain still reads as dots — coarser goes
// spindly, finer fuses into solid letters. The gap stays fractional: rounding it
// to whole pixels is what would break the ratio on small type.
const GAP_DIVISOR = 20;
const MIN_GAP_PX = 1.6;
const MAX_DOTS = 6000;
// Radius as a fraction of the gap. Fixing the ratio (rather than the radius) is
// what keeps the grain identical at every size — a fixed radius against a
// smaller phone-sized gap fuses the dots into solid letterforms.
const DOT_RATIO = 0.52;

// Transition. A spring gets a particle home fast but arrives with no shape to
// the motion; an eased tween ramps up and slows into place. The stagger is keyed
// to a particle's x, and the target points are x-sorted, so the new line resolves
// left to right instead of everything landing at once.
const STAGGER_MS = 420;
const STAGGER_JITTER_MS = 120;

// Cursor interaction rides on top of the tween as a springy offset, so pushing
// the field around never fights the transition or leaves particles off-target.
const CURSOR_R = 95;
const CURSOR_PUSH = 1.7;
const OFFSET_FRICTION = 0.86;

// The smoke pushes back. ts/quotes-fluid.ts publishes a small RGBA8 readback of
// its velocity field, and each lattice point leans into whatever is passing over
// it — on the same spring as the cursor, so the letterform always recovers.
//
// This has to stay small, and not only for legibility. The mask handed to the
// solver is built from these same points, so it feeds back: displace the lattice
// and the illumination and the obstacle move with it, which displaces the flow,
// which displaces the lattice again. At 26 the words tore into an arc and the
// smoke dutifully followed the arc. The spring holds against a value like this;
// it can't hold against one that overwhelms it every frame.
//
// Sizing: the probe decodes to roughly ±1 at full tilt, and a constant push
// settles at push/spring ≈ 18×, so 0.3 tops out near five pixels of lean. The
// value itself is a knob — see KNOBS below.
const FLOW_DENSITY_GATE = 0.12; // below this there's no smoke there to push

// The glyph mask, handed to the fluid solver. Cell and blur set the scale it can
// resolve: coarse cells with a wide blur smear a whole word into one mound, so
// this is roughly a stroke width and the mask follows the letterforms.
const MASK_CELL = 4; // CSS px per mask cell
const MASK_BLUR = 2; // box-blur passes — softens the mask's edge
const MASK_NORM_EASE = 0.08; // the normaliser eases, or the mask flickers
// The emitter map shares that texture on a second channel, and it isn't blurred
// at all. A box blur spreads a value without conserving it, so one pass over a
// single lit cell divided its charge by about nine — the pulses were arriving at
// the solver at a ninth of their intended strength and the canvas stayed empty.
// The mask is a small texture sampled with linear filtering anyway, so the
// upscale already softens the edge for free.
const EMIT_BLUR = 0;
const EMIT_GAIN = 0.8; // scales accumulated dots-per-cell into 0..1

// Every number worth playing with lives in one table, and the tuning panel is
// generated from it. It's also the single source of truth for the solver: values
// the fluid needs are read from here through the bridge rather than duplicated as
// constants over there, so there's no way for a default and a slider to drift.
//
// `source` is the constant the value belongs to when it's baked back into the
// code — the panel's Copy button prints those lines ready to paste.
interface Knob {
  key: string;
  label: string;
  group: string;
  min: number;
  max: number;
  step: number;
  value: number;
  source: string;
  format?: (v: number) => string;
  // Present ⇒ rendered as a select, and the stored value is the chosen index.
  // Keeping it a number is what lets the whole tune object stay a flat
  // Record<string, number> that persists and crosses the bridge unchanged.
  options?: string[];
}

// Typeface choices for the lattice. Index 0 inherits from the stylesheet, which
// is the site's Inter; the rest are set inline on the canvas and read back out
// through getComputedStyle, so the raster path needs no special case.
const FONT_STACKS = [
  '',
  'Papyrus, "Papyrus MT", fantasy',
  '"Comic Sans MS", "Comic Sans", "Chalkboard SE", cursive',
  '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  'Georgia, "Times New Roman", serif',
];

const KNOBS: Knob[] = [
  // Deck
  { key: 'holdMs', label: 'Auto-advance hold (ms)', group: 'Deck', min: 1500, max: 30000, step: 100, value: 10400,
    source: 'AUTO_HOLD_MS' },

  // Emission. A pulse is a fifth of a second open, then dark for a few seconds:
  // with a few thousand points only a handful of percent are alight at once,
  // which is the only reason this doesn't drown the canvas.
  { key: 'emit', label: 'Smoke emission volume', group: 'Emission', min: 0, max: 3, step: 0.01, value: 1.38,
    source: 'EMIT_RATE (fluid)',
    format: (v) => `const EMIT_RATE: [number, number, number] = [${(0.18 * v).toFixed(3)}, ${(0.11 * v).toFixed(3)}, ${(0.055 * v).toFixed(3)}];` },
  { key: 'pulseMs', label: 'Pulse length (ms)', group: 'Emission', min: 40, max: 1200, step: 10, value: 520, source: 'PULSE_MS' },
  { key: 'gapMin', label: 'Pulse gap min (ms)', group: 'Emission', min: 100, max: 8000, step: 50, value: 1000, source: 'PULSE_GAP_MIN' },
  { key: 'gapMax', label: 'Pulse gap max (ms)', group: 'Emission', min: 200, max: 15000, step: 50, value: 5000, source: 'PULSE_GAP_MAX' },

  // Motion.
  { key: 'buoyancy', label: 'Rise speed', group: 'Motion', min: 0, max: 1200, step: 5, value: 170, source: 'BUOYANCY (fluid)' },
  { key: 'curl', label: 'Swirl', group: 'Motion', min: 0, max: 80, step: 0.5, value: 1, source: 'CURL_STRENGTH (fluid)' },
  { key: 'life', label: 'Smoke lifetime', group: 'Motion', min: 0.1, max: 4, step: 0.05, value: 0.2,
    source: 'DENSITY_DISSIPATION (fluid)',
    format: (v) => `const DENSITY_DISSIPATION: [number, number, number] = [${(0.4 / v).toFixed(3)}, ${(0.24 / v).toFixed(3)}, ${(0.13 / v).toFixed(3)}];` },
  { key: 'sink', label: 'Pull toward text', group: 'Motion', min: 0, max: 300, step: 5, value: 0, source: 'SINK (fluid)' },
  { key: 'pointer', label: 'Cursor swish force', group: 'Motion', min: 0, max: 40, step: 0.5, value: 3, source: 'POINTER_FORCE (fluid)' },
  { key: 'flowPush', label: 'Dots in the draught', group: 'Motion', min: 0, max: 2, step: 0.01, value: 0.3, source: 'FLOW_PUSH' },

  // Dots. The lattice layer, independent of the smoke.
  { key: 'font', label: 'Typeface', group: 'Dots', min: 0, max: FONT_STACKS.length - 1, step: 1, value: 1,
    source: 'canvas font-family',
    options: ['Site default (Inter)', 'Papyrus', 'Comic Sans MS', 'JetBrains Mono', 'Georgia'],
    format: (v) => `/* .quotes__canvas { font-family: ${FONT_STACKS[v] || 'inherit'} } */` },
  { key: 'dotOpacity', label: 'Dot opacity', group: 'Dots', min: 0, max: 1, step: 0.01, value: 0.63, source: 'DOT_OPACITY' },
  { key: 'dotBlur', label: 'Dot blur', group: 'Dots', min: 0, max: 12, step: 0.1, value: 0, source: 'DOT_BLUR' },
  { key: 'dotTint', label: 'Dot tint', group: 'Dots', min: 0, max: 1, step: 0.01, value: 0.54, source: 'DOT_TINT' },
  { key: 'dotSize', label: 'Dot size', group: 'Dots', min: 0.2, max: 2.5, step: 0.05, value: 1,
    source: 'DOT_RATIO', format: (v) => `const DOT_RATIO = ${(0.52 * v).toFixed(3)};` },
  { key: 'dotDensity', label: 'Dot density', group: 'Dots', min: 0.5, max: 2, step: 0.05, value: 2,
    source: 'GAP_DIVISOR', format: (v) => `const GAP_DIVISOR = ${(20 * v).toFixed(1)};` },
  { key: 'snappiness', label: 'Dot snappiness', group: 'Dots', min: 0.01, max: 0.3, step: 0.005, value: 0.01, source: 'OFFSET_SPRING' },
  { key: 'tweenMs', label: 'Transition speed (ms)', group: 'Dots', min: 150, max: 2500, step: 25, value: 900, source: 'TWEEN_MS' },

  // Merge. Blur the lattice and push the alpha through a steep curve: dots close
  // enough that their blurred fields overlap cross the threshold together and
  // fuse into a solid stroke, while a dot knocked clear of its neighbours only
  // clears the threshold on its own and stays a dot. Nothing decides to merge —
  // it falls out of thresholding a summed field, which is why it comes apart
  // again the instant the cursor or the smoke scatters them.
  { key: 'gooBlur', label: 'Merge blur', group: 'Merge', min: 0.5, max: 8, step: 0.1, value: 1.4, source: 'GOO_BLUR' },
  { key: 'gooThreshold', label: 'Merge threshold', group: 'Merge', min: 4, max: 40, step: 0.5, value: 6.5, source: 'GOO_THRESHOLD' },

  // Look.
  { key: 'lit', label: 'Text node illumination', group: 'Look', min: 0, max: 2, step: 0.01, value: 1.59, source: 'LIT (fluid)' },
  { key: 'dim', label: 'Ambient smoke', group: 'Look', min: 0, max: 0.6, step: 0.005, value: 0.15, source: 'DIM (fluid)' },
  { key: 'tint', label: 'Accent tint', group: 'Look', min: 0, max: 1, step: 0.01, value: 0.88, source: 'TINT (fluid)' },
  { key: 'shade', label: 'Volumetric shading', group: 'Look', min: 0, max: 1.5, step: 0.01, value: 0.29, source: 'SHADE (fluid)' },
];

const TUNE_STORE = 'quotes-tune-v2';

// Dots have to be fatter in merge mode or their blurred fields never reach each
// other — at the lattice's natural radius the filter just dissolves them.
const GOO_DOT_SCALE = 1.9;

const ENTRY_SCATTER = 46; // px of jitter on the first paint, so it assembles

// Type-setting.
const MAX_FONT_PX = 96;
const MIN_FONT_PX = 18;
const FONT_STEP = 2;
const LINE_H = 1.16;
const MAX_LINES = 4;
const WIDTH_RATIO = 0.92; // of the canvas box
const HEIGHT_RATIO = 0.9;

const TAU = Math.PI * 2;
const RESHUFFLE_TRIES = 8;
// AUTO_HOLD_MS → tune.holdMs: now a knob, see KNOBS above.

interface Dot {
  sx: number; // tween start
  sy: number;
  tx: number; // tween target
  ty: number;
  x: number; // tween output (the particle's base position)
  y: number;
  ox: number; // cursor offset, springs back to 0
  oy: number;
  vx: number;
  vy: number;
  delay: number;
  a: number; // current alpha
  sa: number; // alpha at the start of this transition
  ta: number; // target alpha — 0 parks a particle the current quote can't use
  emit: number; // 0..1 envelope of the current pulse
  pulseStart: number; // ms timestamp the pulse opened
  pulseNext: number; // and when the next one opens
}

interface Flow {
  data: Uint8Array;
  w: number;
  h: number;
  scale: number;
}

// Numbers out of any CSS colour form — "rgb(24, 24, 27)" or a bare "3 119 55".
function parseRgb(css: string): [number, number, number] {
  const m = css.match(/-?[\d.]+/g);
  if (!m || m.length < 3) return [0, 0, 0];
  return [Number(m[0]), Number(m[1]), Number(m[2])];
}

// Live values, keyed by knob. Shared with ts/quotes-fluid.ts through the bridge.
type Tune = Record<string, number>;

function defaultTune(): Tune {
  const t: Tune = {};
  for (const k of KNOBS) t[k.key] = k.value;
  return t;
}

// Anything stored is merged over the defaults rather than replacing them, so a
// knob added later doesn't come back undefined for anyone who has tuned before.
function loadTune(): Tune {
  const t = defaultTune();
  try {
    const raw = window.localStorage.getItem(TUNE_STORE);
    if (raw) {
      const saved = JSON.parse(raw) as Tune;
      for (const k of KNOBS) {
        const v = saved[k.key];
        if (typeof v === 'number' && isFinite(v)) t[k.key] = Math.min(k.max, Math.max(k.min, v));
      }
    }
  } catch {
    // Private mode, blocked storage: defaults are fine.
  }
  return t;
}

function saveTune(t: Tune): void {
  try {
    window.localStorage.setItem(TUNE_STORE, JSON.stringify(t));
  } catch {
    // Not worth surfacing — the panel still works for this session.
  }
}

// One live instance at a time. hx-boost swaps <body> without a reload, so the
// previous page's rAF loop, timer, and listeners have to be torn down by hand.
let dispose: (() => void) | null = null;

const easeInOut = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

function shuffle(items: number[]): number[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

function wrapText(m: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    // `!line` forces at least one word per line, so a single unbreakable word
    // overflows rather than looping forever.
    if (!line || m.measureText(next).width <= maxW) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// One size for the whole deck: sized to the quote that needs the most room, so
// a transition never reads as a zoom and particle density stays constant.
function fitFont(
  m: CanvasRenderingContext2D,
  texts: string[],
  font: (px: number) => string,
  maxW: number,
  maxH: number,
): { size: number; lines: string[][] } {
  for (let size = MAX_FONT_PX; size >= MIN_FONT_PX; size -= FONT_STEP) {
    m.font = font(size);
    const lines = texts.map((t) => wrapText(m, t, maxW));
    const fits = lines.every(
      (ls) =>
        ls.length <= MAX_LINES &&
        ls.length * size * LINE_H <= maxH &&
        ls.every((l) => m.measureText(l).width <= maxW),
    );
    if (fits) return { size, lines };
  }
  m.font = font(MIN_FONT_PX);
  return { size: MIN_FONT_PX, lines: texts.map((t) => wrapText(m, t, maxW)) };
}

// Sample the rasterized text and return [x0,y0,x1,y1,…] sorted by x (then y).
// The sort is what makes a transition legible: paired against the pool in the
// same order, particles stay in their column and the text reflows in place
// instead of every one taking a random diagonal across the box.
function samplePoints(data: Uint8ClampedArray, w: number, h: number, gap: number): Float32Array {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let y = 0; y < h; y += gap) {
    const row = Math.min(h - 1, Math.round(y)) * w;
    for (let x = 0; x < w; x += gap) {
      if (data[(row + Math.min(w - 1, Math.round(x))) * 4 + 3] > 128) {
        xs.push(x);
        ys.push(y);
      }
    }
  }
  const stride = Math.ceil(xs.length / MAX_DOTS) || 1;
  const order: number[] = [];
  for (let i = 0; i < xs.length; i += stride) order.push(i);
  order.sort((a, b) => xs[a] - xs[b] || ys[a] - ys[b]);

  const out = new Float32Array(order.length * 2);
  for (let i = 0; i < order.length; i++) {
    out[i * 2] = xs[order[i]];
    out[i * 2 + 1] = ys[order[i]];
  }
  return out;
}

// Build the tuning panel from KNOBS. Everything is generated, so adding a knob
// is one row in that table and nothing else.
function buildTuner(root: HTMLElement, tune: Tune, onChange: () => void): void {
  const host = root.querySelector<HTMLElement>('[data-quotes-tuner]');
  if (!host) return;
  host.textContent = '';

  const groups: string[] = [];
  for (const k of KNOBS) if (!groups.includes(k.group)) groups.push(k.group);

  const readouts = new Map<string, HTMLElement>();
  const controls = new Map<string, HTMLInputElement | HTMLSelectElement>();
  for (const group of groups) {
    const section = document.createElement('div');
    section.className = 'quotes__tunegroup';
    const heading = document.createElement('h3');
    heading.textContent = group;
    section.appendChild(heading);

    for (const knob of KNOBS.filter((k) => k.group === group)) {
      const row = document.createElement('label');
      row.className = 'quotes__knob';

      const name = document.createElement('span');
      name.className = 'quotes__knobname';
      name.textContent = knob.label;

      const value = document.createElement('span');
      value.className = 'quotes__knobvalue';
      readouts.set(knob.key, value);

      let control: HTMLInputElement | HTMLSelectElement;
      if (knob.options) {
        const select = document.createElement('select');
        knob.options.forEach((label, i) => {
          const option = document.createElement('option');
          option.value = String(i);
          option.textContent = label;
          select.appendChild(option);
        });
        select.value = String(tune[knob.key]);
        value.textContent = '';
        select.addEventListener('change', () => {
          tune[knob.key] = Number(select.value);
          onChange();
        });
        control = select;
      } else {
        const input = document.createElement('input');
        input.type = 'range';
        input.min = String(knob.min);
        input.max = String(knob.max);
        input.step = String(knob.step);
        input.value = String(tune[knob.key]);
        value.textContent = String(tune[knob.key]);
        input.addEventListener('input', () => {
          tune[knob.key] = Number(input.value);
          value.textContent = input.value;
          onChange();
        });
        control = input;
      }
      controls.set(knob.key, control);

      row.append(name, value, control);
      section.appendChild(row);
    }
    host.appendChild(section);
  }

  const actions = document.createElement('div');
  actions.className = 'quotes__tuneactions';

  const copy = document.createElement('button');
  copy.type = 'button';
  copy.textContent = 'Copy as code';
  copy.addEventListener('click', () => {
    const lines = KNOBS.map((k) =>
      k.format ? k.format(tune[k.key]) : `const ${k.source.replace(' (fluid)', '')} = ${tune[k.key]};`,
    );
    const text = lines.join('\n');
    void navigator.clipboard?.writeText(text).then(
      () => {
        copy.textContent = 'Copied';
        window.setTimeout(() => (copy.textContent = 'Copy as code'), 1400);
      },
      () => {
        copy.textContent = 'Copy failed';
        window.setTimeout(() => (copy.textContent = 'Copy as code'), 1400);
      },
    );
  });

  const reset = document.createElement('button');
  reset.type = 'button';
  reset.textContent = 'Reset';
  reset.addEventListener('click', () => {
    const defaults = defaultTune();
    for (const k of KNOBS) {
      tune[k.key] = defaults[k.key];
      const control = controls.get(k.key);
      if (control) control.value = String(defaults[k.key]);
      const readout = readouts.get(k.key);
      if (readout) readout.textContent = k.options ? '' : String(defaults[k.key]);
    }
    onChange();
  });

  actions.append(copy, reset);
  host.appendChild(actions);
}

export function initQuotes(): void {
  if (dispose) {
    dispose();
    dispose = null;
  }

  const root = document.querySelector<HTMLElement>('[data-quotes]');
  if (!root) return;
  const canvas = root.querySelector<HTMLCanvasElement>('[data-quotes-canvas]');
  const source = root.querySelector<HTMLElement>('[data-quotes-source]');
  const advanceBtn = root.querySelector<HTMLButtonElement>('[data-quotes-advance]');
  if (!canvas || !source || !advanceBtn) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // textContent, not innerHTML: the canvas draws glyphs, not markup.
  const quotes = Array.from(source.querySelectorAll('li'))
    .map((li) => (li.textContent || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  if (!quotes.length) return;

  root.classList.add('is-live');

  const tune = loadTune();
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Zeroing the durations (rather than branching all over the draw path) is what
  // makes prefers-reduced-motion a straight cut between quotes: the same tween
  // runs, it just completes on its first frame.
  const staggerMs = reduceMotion ? 0 : STAGGER_MS;
  const staggerJitterMs = reduceMotion ? 0 : STAGGER_JITTER_MS;
  const entryScatter = reduceMotion ? 0 : ENTRY_SCATTER;

  const offscreen = document.createElement('canvas');
  const octx = offscreen.getContext('2d', { willReadFrequently: true });
  // The glyph mask. It's drawn at field resolution and uploaded as-is; the
  // solver samples it with bilinear filtering, which does the smoothing for free.
  const mask = document.createElement('canvas');
  const mctx = mask.getContext('2d');
  if (!octx || !mctx) return;

  const toggles = new Map<string, HTMLInputElement>();
  root.querySelectorAll<HTMLInputElement>('[data-quotes-toggle]').forEach((el) => {
    const name = el.dataset.quotesToggle;
    if (name) toggles.set(name, el);
  });
  const on = (name: string): boolean => toggles.get(name)?.checked ?? false;

  let dots: Dot[] = [];
  let sets: Float32Array[] = [];
  let deck = shuffle(quotes.map((_, i) => i));
  let step = 0;
  let fill = '#000';
  let accent = '#000';
  let fillRgb: [number, number, number] = [0, 0, 0];
  let accentRgb: [number, number, number] = [0, 0, 0];

  // Dot colour, mixed toward the accent by the tint knob. Recomputed per frame
  // because it's two lerps, which is cheaper than tracking when it changed.
  const dotColor = (): string => {
    const t = tune.dotTint;
    if (t <= 0) return fill;
    const r = Math.round(fillRgb[0] + (accentRgb[0] - fillRgb[0]) * t);
    const g = Math.round(fillRgb[1] + (accentRgb[1] - fillRgb[1]) * t);
    const b = Math.round(fillRgb[2] + (accentRgb[2] - fillRgb[2]) * t);
    return `rgb(${r}, ${g}, ${b})`;
  };
  let dotR = 1.6;
  let field = new Float32Array(0); // smoothed glyph potential
  let emitField = new Float32Array(0); // and the pulsing subset of it
  let scratchField = new Float32Array(0);
  let cols = 0;
  let rows = 0;
  let fieldNorm = 0;
  let maskData: ImageData | null = null;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let tweenStart = -1e9; // far enough back that the first frame reads as settled
  let lastFrame = -1;
  let raf = 0;
  let timer: number | null = null;
  let alive = true;
  const mouse = { x: -9999, y: -9999 };

  // ---- painting -----------------------------------------------------------

  const drawDots = (): void => {
    const goo = on('merge');
    const r = dotR * tune.dotSize * (goo ? GOO_DOT_SCALE : 1);
    ctx.fillStyle = dotColor();
    ctx.globalAlpha = tune.dotOpacity;

    // Fully-opaque particles (the overwhelming majority once a transition
    // settles) go into a single path — one fill beats a few thousand.
    ctx.beginPath();
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      if (d.a > 0.985) {
        const x = d.x + d.ox;
        const y = d.y + d.oy;
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, TAU);
      }
    }
    ctx.fill();

    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      if (d.a <= 0.985 && d.a > 0.02) {
        ctx.globalAlpha = d.a * tune.dotOpacity;
        ctx.beginPath();
        ctx.arc(d.x + d.ox, d.y + d.oy, r, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  };

  // --- smoke ---------------------------------------------------------------

  // Separable box blur, in place, using the shared scratch buffer.
  const blur = (target: Float32Array, passes: number): void => {
    for (let pass = 0; pass < passes; pass++) {
      for (let y = 0; y < rows; y++) {
        const r = y * cols;
        for (let x = 0; x < cols; x++) {
          const l = x > 0 ? target[r + x - 1] : target[r + x];
          const rr = x < cols - 1 ? target[r + x + 1] : target[r + x];
          scratchField[r + x] = (l + target[r + x] + rr) / 3;
        }
      }
      for (let y = 0; y < rows; y++) {
        const r = y * cols;
        const up = y > 0 ? r - cols : r;
        const dn = y < rows - 1 ? r + cols : r;
        for (let x = 0; x < cols; x++) {
          target[r + x] = (scratchField[up + x] + scratchField[r + x] + scratchField[dn + x]) / 3;
        }
      }
    }
  };

  const buildField = (): void => {
    if (!cols || !rows) return;
    field.fill(0);
    emitField.fill(0);
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      if (d.a < 0.5) continue;
      const cx = (d.x + d.ox) / MASK_CELL;
      const cy = (d.y + d.oy) / MASK_CELL;
      if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) continue;
      const at = (cy | 0) * cols + (cx | 0);
      field[at] += 1;
      if (d.emit > 0) emitField[at] += d.emit;
    }
    if (EMIT_BLUR) blur(emitField, EMIT_BLUR);
    blur(field, MASK_BLUR);
    let max = 0;
    for (let i = 0; i < field.length; i++) if (field[i] > max) max = field[i];
    fieldNorm = fieldNorm > 0 ? fieldNorm + (max - fieldNorm) * MASK_NORM_EASE : max;
    if (fieldNorm > 0) for (let i = 0; i < field.length; i++) field[i] /= fieldNorm;
  };

  // Publish the field as an alpha bitmap. This is the only thing the fluid
  // solver reads from this module; it uploads it as a texture and multiplies the
  // dye by it, which is what lights the letters.
  // R is the glyph field, G is the emitter map, and alpha stays pinned at 255.
  // Both have to live in colour channels: canvas pixels are stored premultiplied,
  // so anything parked in a channel gets scaled by alpha on upload and a varying
  // alpha would quietly eat the emitter map wherever the glyph field is thin.
  const updateMask = (): void => {
    if (!maskData) return;
    const pixels = maskData.data;
    for (let i = 0, p = 0; i < field.length; i++, p += 4) {
      pixels[p] = Math.min(1, field[i]) * 255;
      pixels[p + 1] = Math.min(1, emitField[i] * EMIT_GAIN) * 255;
    }
    mctx.putImageData(maskData, 0, 0);
  };

  const paint = (): void => {
    ctx.clearRect(0, 0, width, height);
    if (on('dots')) drawDots();
  };

  const frame = (): void => {
    const now = performance.now();
    const prev = lastFrame < 0 ? now - 16.67 : lastFrame;
    const frameMs = Math.max(1, now - prev);
    lastFrame = now;
    const elapsed = now - tweenStart;
    const cursorOn = on('cursor');
    const bridge = (root as HTMLElement & { __quotes?: { flow?: Flow } }).__quotes;
    const flow = on('smoke') ? bridge?.flow : undefined;
    const tweenMs = reduceMotion ? 0 : tune.tweenMs;
    const spring = tune.snappiness;
    const pulseMs = Math.max(1, tune.pulseMs);
    const gapMin = tune.gapMin;
    const gapMax = tune.gapMax;
    const flowPush = tune.flowPush;

    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];

      // Base position: eased tween from where the particle was to where the
      // current quote wants it.
      const p = tweenMs ? Math.min(1, Math.max(0, (elapsed - d.delay) / tweenMs)) : 1;
      const e = easeInOut(p);
      d.x = d.sx + (d.tx - d.sx) * e;
      d.y = d.sy + (d.ty - d.sy) * e;
      d.a = d.sa + (d.ta - d.sa) * e;

      // Cursor offset: an independent spring layered on top, so shoving the
      // field never drags a particle off its destination.
      if (cursorOn) {
        const dx = d.x + d.ox - mouse.x;
        const dy = d.y + d.oy - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        if (dist < CURSOR_R) {
          const f = ((CURSOR_R - dist) / CURSOR_R) * CURSOR_PUSH;
          d.vx += (dx / dist) * f;
          d.vy += (dy / dist) * f;
        }
      }
      // Pulse: open for PULSE_MS, then dark for a random gap.
      //
      // What's emitted this frame is the *integral* of the envelope over the
      // frame's window, not the envelope sampled at an instant. Point sampling
      // cannot work here: a pulse is 200ms, so on a machine drawing at 60fps it
      // spans twelve frames and on a slow one it can open and close inside a
      // single frame — sampled once, at whatever phase that frame happens to
      // land on, and often at no phase at all. The overlap form charges the same
      // total per pulse at any frame rate, which is also the only reason the
      // rate constant means anything on a machine other than the one it was
      // tuned on.
      if (now >= d.pulseNext) {
        // Backdated to when it was due, not when it was noticed, so a slow frame
        // doesn't make every pulse late as well as short.
        d.pulseStart = d.pulseNext;
        d.pulseNext =
          d.pulseStart + pulseMs + gapMin + Math.random() * Math.max(0, gapMax - gapMin);
      }
      const winStart = Math.max(d.pulseStart, prev);
      const winEnd = Math.min(d.pulseStart + pulseMs, now);
      if (winEnd > winStart && d.a > 0.5) {
        const centre = (winStart + winEnd) / 2 - d.pulseStart;
        d.emit = Math.sin(Math.PI * (centre / pulseMs)) * ((winEnd - winStart) / frameMs);
      } else {
        d.emit = 0;
      }

      // Lean into the flow. The probe is bottom-up like the framebuffer it came
      // from, so y is flipped back here.
      if (flow) {
        const fx = Math.min(flow.w - 1, Math.max(0, ((d.x / width) * flow.w) | 0));
        const fy = Math.min(
          flow.h - 1,
          Math.max(0, ((1 - d.y / height) * flow.h) | 0),
        );
        const i = (fy * flow.w + fx) * 4;
        const density = flow.data[i + 2] / 255;
        if (density > FLOW_DENSITY_GATE) {
          const push = flowPush * density;
          d.vx += (flow.data[i] / 255 - 0.5) * 2 * push;
          d.vy -= (flow.data[i + 1] / 255 - 0.5) * 2 * push;
        }
      }

      d.vx -= d.ox * spring;
      d.vy -= d.oy * spring;
      d.vx *= OFFSET_FRICTION;
      d.vy *= OFFSET_FRICTION;
      d.ox += d.vx;
      d.oy += d.vy;
    }

    // The mask is rebuilt every frame because the lattice moves: during a
    // transition the solver should be lighting the letters as they re-form, not
    // where they used to be.
    buildField();
    updateMask();
    paint();
    raf = requestAnimationFrame(frame);
  };

  // ---- deck ---------------------------------------------------------------

  // Hand every particle a new destination. Both the pool (by current x) and the
  // target points (by x, from samplePoints) are in the same order, so the
  // pairing is monotone — no particle crosses another's path. When the incoming
  // quote needs fewer particles than the pool holds, the surplus doubles up on a
  // target and fades out; it flies back in when a longer quote comes around.
  const retarget = (quoteIndex: number): void => {
    const target = sets[quoteIndex];
    if (!target || !target.length || !dots.length) return;
    const count = target.length / 2;

    const order = dots.map((_, i) => i);
    order.sort((a, b) => dots[a].x - dots[b].x || dots[a].y - dots[b].y);

    let prev = -1;
    for (let k = 0; k < order.length; k++) {
      const d = dots[order[k]];
      const idx = Math.floor((k * count) / order.length);
      d.sx = d.x;
      d.sy = d.y;
      d.sa = d.a;
      d.tx = target[idx * 2];
      d.ty = target[idx * 2 + 1];
      d.ta = idx === prev ? 0 : 1;
      d.delay = (k / order.length) * staggerMs + Math.random() * staggerJitterMs;
      prev = idx;
    }
    tweenStart = performance.now();
  };

  const advance = (): void => {
    step += 1;
    if (step >= deck.length) {
      // Deck spent — reshuffle. Re-roll if the fresh order would open on the
      // quote already on screen, which reads as the click having done nothing.
      const last = deck[deck.length - 1];
      let tries = 0;
      do {
        deck = shuffle(deck);
        tries += 1;
      } while (deck.length > 1 && deck[0] === last && tries < RESHUFFLE_TRIES);
      step = 0;
    }
    retarget(deck[step]);
  };

  const scheduleAuto = (): void => {
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
    if (!on('auto') || quotes.length < 2) return;
    // Read at schedule time, not captured once: moving the slider reschedules,
    // and the next dwell is the new one rather than the one that was live at init.
    timer = window.setTimeout(() => {
      advance();
      scheduleAuto();
    }, Math.max(400, tune.holdMs));
  };

  // ---- layout -------------------------------------------------------------

  const layout = (): void => {
    if (!alive) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;

    width = Math.round(rect.width);
    height = Math.round(rect.height);
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Typeface first: it's set inline so getComputedStyle below reports it, and
    // every metric downstream — the fitted size, the wrap, the sampling gap —
    // has to be measured against the face actually being drawn.
    canvas.style.fontFamily = FONT_STACKS[tune.font] || '';

    // Both the type and the particles follow the stylesheet, so the theme
    // (including the dark-mode palette swap) stays the single source of truth.
    const cs = getComputedStyle(canvas);
    fill = cs.color;
    // Custom properties come back as the raw triple ("3 119 55"), which is all
    // the solver needs — it parses numbers out of whatever it's handed.
    accent = cs.getPropertyValue('--c-accent').trim() || fill;
    fillRgb = parseRgb(fill);
    accentRgb = parseRgb(accent);
    const weight = cs.fontWeight || '700';
    const family = cs.fontFamily || 'Inter, system-ui, sans-serif';
    const font = (px: number): string => `${weight} ${px}px ${family}`;

    offscreen.width = width;
    offscreen.height = height;

    const { size, lines } = fitFont(octx, quotes, font, width * WIDTH_RATIO, height * HEIGHT_RATIO);
    const gap = Math.max(MIN_GAP_PX, size / (GAP_DIVISOR * tune.dotDensity));
    dotR = gap * DOT_RATIO;
    const lineHeight = size * LINE_H;

    octx.textAlign = 'center';
    octx.textBaseline = 'middle';

    sets = lines.map((ls) => {
      octx.clearRect(0, 0, width, height);
      octx.font = font(size);
      octx.fillStyle = '#fff';
      const top = height / 2 - ((ls.length - 1) * lineHeight) / 2;
      for (let i = 0; i < ls.length; i++) octx.fillText(ls[i], width / 2, top + i * lineHeight);
      return samplePoints(octx.getImageData(0, 0, width, height).data, width, height, gap);
    });

    const pool = sets.reduce((max, s) => Math.max(max, s.length / 2), 0);
    if (!pool) return;

    const first = !dots.length;
    const previous = dots;
    dots = new Array(pool);
    for (let i = 0; i < pool; i++) {
      dots[i] =
        previous[i] ||
        ({
          sx: 0,
          sy: 0,
          tx: 0,
          ty: 0,
          x: 0,
          y: 0,
          ox: 0,
          oy: 0,
          vx: 0,
          vy: 0,
          delay: 0,
          a: 0,
          sa: 0,
          ta: 1,
          emit: 0,
          pulseStart: -1e9,
          // Stagger the first window across the whole cycle, or every point in
          // the quote fires together on the opening frame.
          pulseNext: performance.now() + Math.random() * tune.gapMax,
        } as Dot);
    }
    retarget(deck[step]);

    if (first) {
      // Scatter the particles around their destinations so the field assembles
      // itself on arrival instead of appearing fully formed.
      for (const d of dots) {
        d.sx = d.tx + (Math.random() - 0.5) * entryScatter;
        d.sy = d.ty + (Math.random() - 0.5) * entryScatter;
        d.x = d.sx;
        d.y = d.sy;
      }
    }
    cols = Math.max(2, Math.ceil(width / MASK_CELL));
    rows = Math.max(2, Math.ceil(height / MASK_CELL));
    field = new Float32Array(cols * rows);
    emitField = new Float32Array(cols * rows);
    scratchField = new Float32Array(cols * rows);
    mask.width = cols;
    mask.height = rows;
    maskData = mctx.createImageData(cols, rows);
    for (let p = 3; p < maskData.data.length; p += 4) maskData.data[p] = 255;
  };

  // ---- wiring -------------------------------------------------------------

  // Mouse only: a touch drag would otherwise shove the field around while the
  // reader is just trying to scroll past it.
  const onMove = (e: PointerEvent): void => {
    if (e.pointerType !== 'mouse') return;
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  };
  const onLeave = (): void => {
    mouse.x = -9999;
    mouse.y = -9999;
  };
  const onClick = (): void => {
    advance();
    scheduleAuto(); // a manual advance restarts the auto clock rather than racing it
  };

  const onToggle = (e: Event): void => {
    const input = e.target as HTMLInputElement;
    const name = input.dataset.quotesToggle;
    // Never leave the canvas blank: unchecking the last visible layer turns the
    // other one on rather than rendering nothing at all.
    if ((name === 'smoke' || name === 'dots') && !on('smoke') && !on('dots')) {
      const other = toggles.get(name === 'smoke' ? 'dots' : 'smoke');
      if (other) other.checked = true;
    }
    if (name === 'merge') applyFilters();
    if (name === 'cursor' && !input.checked) onLeave();
    if (name === 'auto') scheduleAuto();
  };
  toggles.forEach((el) => el.addEventListener('change', onToggle));

  let resizeTimer: number | null = null;
  const observer = new ResizeObserver(() => {
    if (resizeTimer !== null) window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(layout, 150);
  });

  dispose = (): void => {
    alive = false;
    if (raf) cancelAnimationFrame(raf);
    if (timer !== null) window.clearTimeout(timer);
    if (resizeTimer !== null) window.clearTimeout(resizeTimer);
    if (relayoutTimer !== null) window.clearTimeout(relayoutTimer);
    observer.disconnect();
    document.removeEventListener('fullscreenchange', onFullscreen);
    fsBtn?.removeEventListener('click', onFsClick);
    exitBtn?.removeEventListener('click', onExitClick);
    advanceBtn.removeEventListener('pointermove', onMove);
    advanceBtn.removeEventListener('pointerleave', onLeave);
    advanceBtn.removeEventListener('click', onClick);
    toggles.forEach((el) => el.removeEventListener('change', onToggle));
  };

  // Reduced motion opens on the still rendering: dots rather than a drifting
  // plume, and no cursor scatter. The toggles still work, so a reader who wants
  // the smoke can ask for it — an explicit click is not unsolicited motion.
  if (reduceMotion) {
    const off = ['smoke', 'cursor'];
    off.forEach((n) => {
      const el = toggles.get(n);
      if (el) el.checked = false;
    });
    const dotsToggle = toggles.get('dots');
    if (dotsToggle) dotsToggle.checked = true;
  }

  // The goo filter's primitives are driven from the knobs. The alpha row of the
  // colour matrix is the threshold: it multiplies alpha by K and subtracts a
  // constant, so blurred overlaps clear it and thin edges don't.
  const applyFilters = (): void => {
    // Composed rather than toggled by class: dot blur has to work whether or not
    // merge is on, and CSS applies filter functions left to right, so the blur
    // softens the lattice before the goo threshold sees it.
    const parts: string[] = [];
    if (tune.dotBlur > 0) parts.push(`blur(${tune.dotBlur}px)`);
    if (on('merge')) parts.push('url(#quotes-goo)');
    canvas.style.filter = parts.length ? parts.join(' ') : '';

    const blur = document.querySelector('#quotes-goo feGaussianBlur');
    const matrix = document.querySelector('#quotes-goo feColorMatrix');
    if (blur) blur.setAttribute('stdDeviation', String(tune.gooBlur));
    if (matrix) {
      const k = tune.gooThreshold;
      matrix.setAttribute(
        'values',
        `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${k} ${-(k * 0.45).toFixed(2)}`,
      );
    }
  };

  let relayoutTimer: number | null = null;
  let lastDensity = tune.dotDensity;
  let lastFont = tune.font;
  let lastHold = tune.holdMs;
  buildTuner(root, tune, () => {
    saveTune(tune);
    applyFilters();
    // The pending timeout was armed with the old dwell; restarting the clock is
    // also the only way to feel the new one without waiting out the old.
    if (tune.holdMs !== lastHold) {
      lastHold = tune.holdMs;
      scheduleAuto();
    }
    // Density and typeface both change how the deck is rasterised and re-fitted,
    // so they need a full layout. Debounced, because density fires on every
    // pixel of slider travel.
    if (tune.dotDensity !== lastDensity || tune.font !== lastFont) {
      lastDensity = tune.dotDensity;
      lastFont = tune.font;
      if (relayoutTimer !== null) window.clearTimeout(relayoutTimer);
      relayoutTimer = window.setTimeout(layout, 200);
    }
  });
  applyFilters();

  // Fullscreen. The whole section goes, not just the canvas — the stage button
  // has to come along for click-to-advance to survive — but the CSS strips the
  // chrome down to the quote and an X. Hidden outright where the API isn't
  // available rather than left as a button that does nothing.
  const fsBtn = root.querySelector<HTMLButtonElement>('[data-quotes-fullscreen]');
  const exitBtn = root.querySelector<HTMLButtonElement>('[data-quotes-exit]');
  const fsSupported =
    !!document.fullscreenEnabled ||
    !!(document as Document & { webkitFullscreenEnabled?: boolean }).webkitFullscreenEnabled;
  const syncFullscreen = (): void => {
    if (!fsBtn) return;
    const active = document.fullscreenElement === root;
    fsBtn.textContent = active ? 'Exit fullscreen' : 'Fullscreen';
    fsBtn.setAttribute('aria-pressed', String(active));
  };
  const onFullscreen = (): void => syncFullscreen();
  const onFsClick = (): void => {
    if (document.fullscreenElement) {
      void document.exitFullscreen?.();
      return;
    }
    const el = root as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
    // Rejection just means the browser declined — nothing to recover from, and
    // an unhandled rejection in the console is worse than doing nothing.
    void (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.())?.catch(() => {});
  };
  const onExitClick = (): void => {
    void document.exitFullscreen?.();
  };
  if (fsBtn) {
    if (!fsSupported) fsBtn.hidden = true;
    else {
      fsBtn.addEventListener('click', onFsClick);
      document.addEventListener('fullscreenchange', onFullscreen);
      syncFullscreen();
    }
  }
  exitBtn?.addEventListener('click', onExitClick);

  // Handshake for ts/quotes-fluid.ts. The solver is a separate bundle, so it
  // can't import from here; it picks the mask up off the section element.
  (root as HTMLElement & { __quotes?: unknown }).__quotes = {
    mask,
    tune,
    color: () => fill,
    accent: () => accent,
    smokeOn: () => on('smoke'),
    // No WebGL2, or no float render targets: there is no fluid, so fall back to
    // the lattice rather than leaving the reader with an empty box.
    onFail: () => {
      const smokeToggle = toggles.get('smoke');
      const dotsToggle = toggles.get('dots');
      if (smokeToggle) {
        smokeToggle.checked = false;
        smokeToggle.disabled = true;
        smokeToggle.closest('label')?.classList.add('is-off');
      }
      if (dotsToggle) dotsToggle.checked = true;
    },
  };

  // Load the solver, then tell it we're ready. Both matter:
  //
  //   · The script is injected from here rather than sitting in <head> because
  //     hx-boost swaps only <body>. A head-loaded bundle never arrives when you
  //     navigate to /quotes from another page — only on a hard load.
  //   · It's loaded *after* the bridge exists, so the solver can't lose the race
  //     against ts/main.ts's deferred init. The event covers the other order,
  //     when the script is already loaded and only needs re-running.
  // Deliberately not `data-quotes-fluid`: that's the canvas's attribute, and a
  // querySelector for it would match this section first.
  const src = root.dataset.quotesSolver;
  if (src && !document.querySelector(`script[data-quotes-solver-src="${src}"]`)) {
    const tag = document.createElement('script');
    tag.src = src;
    tag.defer = true;
    tag.dataset.quotesSolverSrc = src;
    const integrity = root.dataset.quotesSolverIntegrity;
    if (integrity) {
      tag.integrity = integrity;
      tag.crossOrigin = 'anonymous';
    }
    document.head.appendChild(tag);
  }
  document.dispatchEvent(new CustomEvent('quotes:ready'));

  layout();
  observer.observe(canvas);

  // Metrics measured before Inter arrives come from the fallback face and size
  // the text wrong, so re-run once the real font is in.
  if (document.fonts) void document.fonts.ready.then(layout);

  advanceBtn.addEventListener('pointermove', onMove);
  advanceBtn.addEventListener('pointerleave', onLeave);
  advanceBtn.addEventListener('click', onClick);

  raf = requestAnimationFrame(frame);
  scheduleAuto();
}
