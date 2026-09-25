// Figure kit — the SVG helpers every glossary figure family is built from:
// element creation, the canvas, centred labels, and the self-cleaning timers.
// Shared by def-figures.ts (the logic and ML kinds) and def-figures-python.ts
// (the Python for ML kinds).

const NS = 'http://www.w3.org/2000/svg';
export const reduceMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function svg<K extends keyof SVGElementTagNameMap>(name: K): SVGElementTagNameMap[K] {
  return document.createElementNS(NS, name);
}

export function attrs(el: Element, values: Record<string, string | number>): void {
  for (const [name, value] of Object.entries(values)) el.setAttribute(name, String(value));
}

/* Every label in every figure goes through here, and it positions with a
   TRANSFORM rather than x/y attributes. That is not a style choice.
   Chromium mis-resolves x/y on SVG <text> in these figures: the DOM reports the
   coordinates you set (getBBox and getBoundingClientRect both agree), but the
   glyph paints at roughly 0.83x its stated position — far enough to sit outside
   its own bubble, and far enough that a strike drawn across a letter landed
   beside it. A transform is honoured exactly.

   This was expensive to find, because every way of ASKING the browser where the
   text is returns the right answer; only a screenshot disagrees. If a label ever
   drifts again, suspect the positioning method before anything else. */
export function centredLabel(cx: number, cy: number, cls: string, content: string): SVGTextElement {
  const text = svg('text');
  attrs(text, {
    transform: `translate(${cx} ${cy})`,
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
  });
  text.setAttribute('class', cls);
  text.textContent = content;
  return text;
}

export function figureCanvas(width: number, height: number, className: string, label: string): SVGSVGElement {
  const canvas = svg('svg');
  // width/height MUST be set alongside viewBox. Without an intrinsic size the
  // SVG is laid out once at the body's full width and again once max-width
  // applies, and Chromium leaves that first paint of the <text> glyphs behind
  // as a ghost — a stray mark a third of the way across the figure. (The
  // window's open animation scales the whole card, which is what makes it
  // stick.)
  attrs(canvas, { viewBox: `0 0 ${width} ${height}`, width, height, role: 'img' });
  canvas.setAttribute('class', className);
  canvas.setAttribute('aria-label', label);
  return canvas;
}

// Run `step` on a timer that stops itself once `anchor` leaves the document.
export function whileMounted(anchor: Element, first: number, step: (tick: number) => number): void {
  let tick = 0;
  const hop = (): void => {
    if (!anchor.isConnected) return;
    const wait = step(tick);
    tick += 1;
    window.setTimeout(hop, wait);
  };
  window.setTimeout(hop, first);
}

// Step a figure through its states forever, one every `interval`. The caller
// paints state 0 itself, so a reduced-motion figure can simply not call this.
export function cycleForever(anchor: Element, interval: number, paint: (state: number) => void): void {
  let state = 0;
  whileMounted(anchor, interval, () => {
    state += 1;
    paint(state);
    return interval;
  });
}
