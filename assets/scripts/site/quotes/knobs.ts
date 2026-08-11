// Every number worth playing with, in one table.
//
// The tuning panel is generated from this, and it's also what the solver reads
// through the bridge — values the fluid needs are looked up here rather than
// duplicated as constants over there, so a default and a slider cannot drift
// apart. `source` names the constant a value belongs to when it's baked back
// into the code; the panel's Copy button prints those lines ready to paste.

import { DENSITY_DISSIPATION, EMIT_RATE } from './bridge';

export interface Knob {
  key: string;
  label: string;
  group: string;
  min: number;
  max: number;
  step: number;
  value: number;
  source: string;
  format?: (value: number) => string;
  // Present ⇒ rendered as a <select>, storing the chosen index. Keeping it a
  // number is what lets a tune stay a flat Record<string, number> that persists
  // and crosses the bridge unchanged.
  options?: string[];
}

// Index 0 inherits from the stylesheet, which is the site's Inter. The rest are
// set inline on the canvas and read back through getComputedStyle, so the
// rasteriser needs no special case for them.
export const FONT_STACKS = [
  '',
  'Papyrus, "Papyrus MT", fantasy',
  '"Comic Sans MS", "Comic Sans", "Chalkboard SE", cursive',
  '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  'Georgia, "Times New Roman", serif',
];

const scaled = (base: readonly number[], factor: number): string =>
  base.map((n) => (n * factor).toFixed(3)).join(', ');

const divided = (base: readonly number[], divisor: number): string =>
  base.map((n) => (n / divisor).toFixed(3)).join(', ');

export const KNOBS: Knob[] = [
  { key: 'holdMs', label: 'Auto-advance hold (ms)', group: 'Deck',
    min: 1500, max: 30000, step: 100, value: 10400, source: 'AUTO_HOLD_MS' },

  // A pulse is half a second open, then dark for a few seconds. With a few
  // thousand lattice points only a handful of percent are alight at once, which
  // is the only reason this doesn't drown the canvas.
  { key: 'emit', label: 'Smoke emission volume', group: 'Emission',
    min: 0, max: 3, step: 0.01, value: 1.38, source: 'EMIT_RATE',
    format: (v) =>
      `export const EMIT_RATE: readonly [number, number, number] = [${scaled(EMIT_RATE, v)}];` },
  { key: 'pulseMs', label: 'Pulse length (ms)', group: 'Emission',
    min: 40, max: 1200, step: 10, value: 520, source: 'PULSE_MS' },
  { key: 'gapMin', label: 'Pulse gap min (ms)', group: 'Emission',
    min: 100, max: 8000, step: 50, value: 1000, source: 'PULSE_GAP_MIN' },
  { key: 'gapMax', label: 'Pulse gap max (ms)', group: 'Emission',
    min: 200, max: 15000, step: 50, value: 5000, source: 'PULSE_GAP_MAX' },

  // Velocity is in texels per unit time and advection scales it by texel size,
  // so on a 128-cell grid the useful range for a force is hundreds, not single
  // digits. Buoyancy and the vent kick have to share those units or the dye
  // never leaves the floor.
  { key: 'buoyancy', label: 'Rise speed', group: 'Motion',
    min: 0, max: 1200, step: 5, value: 170, source: 'BUOYANCY' },
  { key: 'curl', label: 'Swirl', group: 'Motion',
    min: 0, max: 80, step: 0.5, value: 1, source: 'CURL_STRENGTH' },
  { key: 'life', label: 'Smoke lifetime', group: 'Motion',
    min: 0.1, max: 4, step: 0.05, value: 0.2, source: 'DENSITY_DISSIPATION',
    format: (v) =>
      `export const DENSITY_DISSIPATION: readonly [number, number, number] = [${divided(DENSITY_DISSIPATION, v)}];` },
  { key: 'sink', label: 'Pull toward text', group: 'Motion',
    min: 0, max: 300, step: 5, value: 0, source: 'SINK' },
  { key: 'pointer', label: 'Cursor swish force', group: 'Motion',
    min: 0, max: 40, step: 0.5, value: 3, source: 'POINTER_FORCE' },
  { key: 'flowPush', label: 'Dots in the draught', group: 'Motion',
    min: 0, max: 2, step: 0.01, value: 0.3, source: 'FLOW_PUSH' },

  { key: 'font', label: 'Typeface', group: 'Dots',
    min: 0, max: FONT_STACKS.length - 1, step: 1, value: 1, source: 'canvas font-family',
    options: ['Site default (Inter)', 'Papyrus', 'Comic Sans MS', 'JetBrains Mono', 'Georgia'],
    format: (v) => `/* .quotes__canvas { font-family: ${FONT_STACKS[v] || 'inherit'} } */` },
  { key: 'dotOpacity', label: 'Dot opacity', group: 'Dots',
    min: 0, max: 1, step: 0.01, value: 0.63, source: 'DOT_OPACITY' },
  { key: 'dotBlur', label: 'Dot blur', group: 'Dots',
    min: 0, max: 12, step: 0.1, value: 0, source: 'DOT_BLUR' },
  { key: 'dotTint', label: 'Dot tint', group: 'Dots',
    min: 0, max: 1, step: 0.01, value: 0.54, source: 'DOT_TINT' },
  { key: 'dotSize', label: 'Dot size', group: 'Dots',
    min: 0.2, max: 2.5, step: 0.05, value: 1, source: 'DOT_RATIO',
    format: (v) => `const DOT_RATIO = ${(0.52 * v).toFixed(3)};` },
  { key: 'dotDensity', label: 'Dot density', group: 'Dots',
    min: 0.5, max: 2, step: 0.05, value: 2, source: 'GAP_DIVISOR',
    format: (v) => `const GAP_DIVISOR = ${(20 * v).toFixed(1)};` },
  { key: 'snappiness', label: 'Dot snappiness', group: 'Dots',
    min: 0.01, max: 0.3, step: 0.005, value: 0.01, source: 'OFFSET_SPRING' },
  { key: 'tweenMs', label: 'Transition speed (ms)', group: 'Dots',
    min: 150, max: 2500, step: 25, value: 900, source: 'TWEEN_MS' },

  // Blur the lattice and push its alpha through a steep curve: dots close enough
  // that their blurred fields overlap clear the threshold together and fuse into
  // a stroke, while a dot knocked clear of its neighbours only clears it alone
  // and stays a dot. Nothing decides to merge — it falls out of thresholding a
  // summed field, which is why it comes apart the instant something scatters it.
  { key: 'gooBlur', label: 'Merge blur', group: 'Merge',
    min: 0.5, max: 8, step: 0.1, value: 1.4, source: 'GOO_BLUR' },
  { key: 'gooThreshold', label: 'Merge threshold', group: 'Merge',
    min: 4, max: 40, step: 0.5, value: 6.5, source: 'GOO_THRESHOLD' },

  { key: 'lit', label: 'Text node illumination', group: 'Look',
    min: 0, max: 2, step: 0.01, value: 1.59, source: 'LIT' },
  { key: 'dim', label: 'Ambient smoke', group: 'Look',
    min: 0, max: 0.6, step: 0.005, value: 0.15, source: 'DIM' },
  { key: 'tint', label: 'Accent tint', group: 'Look',
    min: 0, max: 1, step: 0.01, value: 0.88, source: 'TINT' },
  { key: 'shade', label: 'Volumetric shading', group: 'Look',
    min: 0, max: 1.5, step: 0.01, value: 0.29, source: 'SHADE' },
];

const STORAGE_KEY = 'quotes-tune-v2';

export type Tune = Record<string, number>;

export function defaultTune(): Tune {
  const tune: Tune = {};
  for (const knob of KNOBS) tune[knob.key] = knob.value;
  return tune;
}

// Stored values are merged over the defaults rather than replacing them, so a
// knob added later doesn't come back undefined for someone who has tuned before.
export function loadTune(): Tune {
  const tune = defaultTune();
  const raw = readStorage();
  if (!raw) return tune;
  for (const knob of KNOBS) {
    const saved = raw[knob.key];
    if (typeof saved !== 'number' || !isFinite(saved)) continue;
    tune[knob.key] = Math.min(knob.max, Math.max(knob.min, saved));
  }
  return tune;
}

export function saveTune(tune: Tune): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tune));
  } catch {
    // Private mode or blocked storage. The panel still works for this session,
    // which is the whole of what's lost.
  }
}

function readStorage(): Tune | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Tune) : null;
  } catch {
    return null;
  }
}
