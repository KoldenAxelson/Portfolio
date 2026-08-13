// Micro-diagrams for glossary definitions — the visual half of a definition, for
// readers who get more from a picture than a sentence. Each is small, built from
// DOM/SVG here (never innerHTML), so a figure can't inject markup from the YAML.
//
// A figure is declared on a glossary entry:
//
//   figure: { kind: argument-map, highlight: premises }
//   figure: { kind: argument-map, cycle: [p1, p2, c] }
//   figure: { kind: madlib, template: "…{}…", options: [because, since] }
//   figure: { kind: pipeline }
//   figure: { kind: pipeline, mode: ring, target: 60, threshold: 51 }
//   figure: { kind: standard-form, premises: [...], conclusion: "…" }
//   figure: { kind: truth-values }
//   figure: { kind: advice }
//   figure: { kind: conditional }
//   figure: { kind: reasoning }
//   figure: { kind: infer }
//   figure: { kind: expository }
//   figure: { kind: illustration }
//   figure: { kind: report }
//   figure: { kind: belief }
//   figure: { kind: warning }
//   figure: { kind: evaluate, mode: validity | soundness | strength | cogency }
//   figure: { kind: expository, glyph: eye }
//
// Animations are driven from here rather than from CSS keyframes because each
// one needs a sequence, and a sequence in keyframes means one @keyframes block
// per element with hand-computed percentages. Every loop is self-cleaning: each
// hop checks isConnected and stops once its figure leaves the DOM, which is what
// keeps a closed window (or a replaced mobile panel) from leaking a timer.

export interface FigureOption {
  word: string;
  template?: string;
}

export interface Figure {
  kind: string;
  highlight?: string;
  cycle?: string[];
  glyph?: string;
  template?: string;
  options?: (string | FigureOption)[];
  mode?: string;
  premises?: string[];
  conclusion?: string;
  target?: number;
  threshold?: number;
}

const NS = 'http://www.w3.org/2000/svg';
const reduceMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function svg<K extends keyof SVGElementTagNameMap>(name: K): SVGElementTagNameMap[K] {
  return document.createElementNS(NS, name);
}

function attrs(el: Element, values: Record<string, string | number>): void {
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
function centredLabel(cx: number, cy: number, cls: string, content: string): SVGTextElement {
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

/* Every figure is built from the same two pieces: circles with a letter in them,
   and an <svg> to put them on. They differ only in which CSS family they belong
   to, so the markup is made here once and the family is a parameter. */
function bubble(family: string, cx: number, cy: number, radius: number, label: string): SVGGElement {
  const group = svg('g');
  group.setAttribute('class', family);

  const ring = svg('circle');
  attrs(ring, { cx, cy, r: radius });
  ring.setAttribute('class', `${family}__ring`);
  group.appendChild(ring);

  if (label) group.appendChild(centredLabel(cx, cy, `${family}__label`, label));
  return group;
}

function figureCanvas(width: number, height: number, className: string, label: string): SVGSVGElement {
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

interface Span extends Record<string, number> {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// A straight run drawn twice over the same span: a dim track that is always
// there, and the fill that lights along it. Two lines rather than one that
// changes colour, because the route has to read as present before anything
// travels it. Returns the fill, which is the half a figure animates.
function trackAndFill(
  canvas: SVGSVGElement,
  span: Span,
  trackClass: string,
  fillClass: string,
): SVGLineElement {
  const track = svg('line');
  attrs(track, span);
  track.setAttribute('class', trackClass);
  canvas.appendChild(track);

  const fill = svg('line');
  attrs(fill, span);
  fill.setAttribute('class', fillClass);
  canvas.appendChild(fill);
  return fill;
}

// Run `step` on a timer that stops itself once `anchor` leaves the document.
function whileMounted(anchor: Element, first: number, step: (tick: number) => number): void {
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
function cycleForever(anchor: Element, interval: number, paint: (state: number) => void): void {
  let state = 0;
  whileMounted(anchor, interval, () => {
    state += 1;
    paint(state);
    return interval;
  });
}

/* ── argument-map ─────────────────────────────────────────────────────────
   Two premises above, flowing down into one conclusion — stacked rather than
   side-by-side so it sits comfortably in a 20rem window. The links always
   flow: the support relation is live whether or not this particular definition
   is about it. `highlight` only changes what's in focus, never what's moving. */

const MAP_CYCLE_MS = 1700;

const LIT: Record<string, string[]> = {
  p1: ['p1'],
  p2: ['p2'],
  c: ['c'],
  premises: ['p1', 'p2'],
  conclusion: ['c'],
  links: ['l1', 'l2'],
  all: ['p1', 'p2', 'c', 'l1', 'l2'],
};

const MAP_CAPTION: Record<string, string> = {
  p1: 'The first premise — one of the three statements this argument is made of.',
  p2: 'The second premise — one of the three statements this argument is made of.',
  c: 'The conclusion — one of the three statements this argument is made of.',
  premises: 'Two premises, highlighted, supporting a conclusion.',
  conclusion: 'A conclusion, highlighted, supported by two premises.',
  links: 'The supporting relation, highlighted, running from premises to conclusion.',
  all: 'An argument: two premises supporting a conclusion.',
};

// Named so `highlight` and `cycle` can address it by part.
function mapNode(part: string, cx: number, cy: number, radius: number, label: string): SVGGElement {
  const group = bubble('fig-node', cx, cy, radius, label);
  group.dataset.part = part;
  return group;
}

function argumentMap(highlight: string, cycle: string[] | undefined): HTMLElement {
  const wrap = document.createElement('figure');
  wrap.className = 'def-fig def-fig--map';

  const canvas = figureCanvas(200, 120, 'fig-map', MAP_CAPTION.all ?? '');

  const link = (id: string, d: string): SVGPathElement => {
    const path = svg('path');
    attrs(path, { d, fill: 'none' });
    path.dataset.part = id;
    path.setAttribute('class', 'fig-link');
    return path;
  };

  canvas.appendChild(link('l1', 'M 58 43 C 58 66 74 70 88 78'));
  canvas.appendChild(link('l2', 'M 142 43 C 142 66 126 70 112 78'));
  canvas.appendChild(mapNode('p1', 58, 26, 16, 'P'));
  canvas.appendChild(mapNode('p2', 142, 26, 16, 'P'));
  canvas.appendChild(mapNode('c', 100, 92, 17, 'C'));

  const parts = Array.from(canvas.querySelectorAll<SVGElement>('[data-part]'));
  const light = (key: string): void => {
    const lit = new Set(LIT[key] ?? LIT.all);
    for (const part of parts) {
      const mine = lit.has(part.dataset.part ?? '');
      part.classList.toggle('is-lit', mine);
      part.classList.toggle('is-dim', !mine);
    }
    canvas.setAttribute('aria-label', MAP_CAPTION[key] ?? MAP_CAPTION.all);
  };

  // A `cycle` walks the highlight around the diagram — used by `statement`,
  // where the point is that EACH of the three is a statement in its own right,
  // which one still frame can't say.
  const steps = cycle?.length ? cycle : null;
  light(steps ? (steps[0] ?? highlight) : highlight);
  if (steps && steps.length > 1 && !reduceMotion()) {
    cycleForever(canvas, MAP_CYCLE_MS, (state) => {
      light(steps[state % steps.length] ?? highlight);
    });
  }

  wrap.appendChild(canvas);
  return wrap;
}

/* ── madlib ───────────────────────────────────────────────────────────────
   One sentence, cycling through the indicator words on its own. Which indicator
   you pick is style, not logic — so there's nothing to choose and no picker.
   The word currently in the sentence lights up in the chip list the entry
   already renders, so the vocabulary is shown once, not twice.

   ── Why this is built word-by-word ──────────────────────────────────────
   Some indicators need their own sentence: "on account of" takes a noun phrase
   rather than a clause, and "must" sits INSIDE the conclusion ("Socrates must
   be mortal") rather than in front of it. The first version handled those with a
   second, separate transition — the whole line faded out and back whenever the
   frame changed. That made two words refresh the entire sentence (the one with
   its own frame, and the one after it, which changes the frame back), which is
   both ugly and a different animation from every other word.

   The fix is to have exactly ONE transition and apply it at the smallest unit
   that actually changed. The sentence is a list of word spans; a cycle diffs the
   new wording against the old and crossfades only the spans that differ, using
   the same curves, overlap and blur for every one of them. A word with its own
   frame now changes just the two or three words around it, and no option has a
   special path — so no option can refresh the whole line.

   Guideline for anything else that cycles text: diff to the smallest changed
   unit and animate that. Never branch the animation on which content it is. */

const CYCLE_MS = 2300;

/* ── The motion vocabulary, shared by everything that swaps text ──────────
   Three things make a swap read as smooth rather than as a blink, and all three
   were measured problems in an earlier version:

   1. MOVEMENT. The indicator words run 32px ("as") to 141px ("for the reason
      that"). Changing text alone snaps the rest of the sentence sideways by up
      to 109px, which no amount of fading hides. An earlier version animated the
      span's own width, but that squeezes the box below the size its text needs:
      a long phrase like "It follows that" wrapped onto two lines mid-animation
      and the sentence visibly grew taller. So a span is ALWAYS its natural size,
      and the words around it glide to their new positions instead (FLIP).
   2. EASING. An exit and an entrance want opposite curves. Leaving on an
      ease-OUT (which starts fast and settles) makes the old text hang at full
      opacity and then drop; it should accelerate away on an ease-IN, while the
      new text arrives on an ease-out.
   3. OVERLAP + DIRECTION. Fading out, then in, leaves a gap with nothing there.
      The incoming text starts before the outgoing has finished, and travels the
      way it is read — out goes up, in comes up from below — so the two read as
      one movement rather than two.

   The slight blur is what sells it: it softens the frames where both are partly
   visible, which would otherwise look like a double image. */
const OUT_MS = 170;
const IN_MS = 240;
const LEAD_MS = 90; // the entrance starts this early, so the two overlap
const MOVE_MS = 300; // every word that has to move, moves over this
const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)'; // entrances: fast, then settle
const EASE_IN = 'cubic-bezier(0.5, 0, 0.75, 0)'; // exits: accelerate away
const EASE_SIZE = 'cubic-bezier(0.65, 0, 0.35, 1)'; // size and movement: ease-in-out

const FADE_OUT: Keyframe[] = [
  { opacity: 1, transform: 'translateY(0)', filter: 'blur(0px)' },
  { opacity: 0, transform: 'translateY(-6px)', filter: 'blur(2px)' },
];
const FADE_IN: Keyframe[] = [
  { opacity: 0, transform: 'translateY(7px)', filter: 'blur(2px)' },
  { opacity: 1, transform: 'translateY(0)', filter: 'blur(0px)' },
];

function normalize(word: string): string {
  return word.trim().toLowerCase();
}

// Light the entry's own listing of the word the sentence is showing right now —
// whether that listing is a chip row or a comparison table. For the inferential
// claim indicators the table is the point: as the sentence cycles, the lit cell
// crosses between the Deductive and Inductive columns, which shows the split
// happening rather than stating it.
function highlightChip(from: Element, word: string): void {
  const scope = from.closest('.def-win__body, [data-definition-body]');
  if (!scope) return;
  const target = normalize(word);
  const listed = scope.querySelectorAll<HTMLElement>('.def-words__list li, .def-table td');
  for (const cell of Array.from(listed)) {
    cell.classList.toggle('is-on', normalize(cell.textContent ?? '') === target);
  }
}

interface Token {
  text: string;
  slot: boolean;
}

// "Socrates is mortal, {} all men are mortal." + "because" → one token per word,
// with the indicator marked so it can wear the chip.
function tokenize(template: string, word: string): Token[] {
  const [head = '', tail = ''] = template.split('{}');
  const out: Token[] = [];
  for (const w of head.trim().split(/\s+/)) if (w) out.push({ text: w, slot: false });
  out.push({ text: word, slot: true });
  for (const w of tail.trim().split(/\s+/)) if (w) out.push({ text: w, slot: false });
  return out;
}

// Tokens sit in ordinary inline flow separated by REAL space characters, not by
// a flex gap. A gap looks identical but leaves no spaces in the text, so copying
// the sentence (or anything else reading textContent) gets "Socratesismortal".
function addToken(line: HTMLElement, span: HTMLElement): void {
  if (line.childNodes.length) line.appendChild(document.createTextNode(' '));
  line.appendChild(span);
}

function dropToken(span: HTMLElement): void {
  const spacer = span.previousSibling;
  if (spacer && spacer.nodeType === Node.TEXT_NODE) spacer.parentNode?.removeChild(spacer);
  span.remove();
}

function tokenEl(token: Token): HTMLElement {
  const span = document.createElement('span');
  span.className = token.slot ? 'fig-tok fig-slot' : 'fig-tok';
  const text = document.createElement('span');
  text.className = 'fig-tok__t';
  text.textContent = token.text;
  span.appendChild(text);
  return span;
}

// THE transition, used for every word without exception: the outgoing text
// leaves as a ghost while the span itself arrives with the new text, and the
// span carries its own width so neighbours are pushed rather than jumped.
function swapToken(span: HTMLElement, next: string): void {
  const text = span.querySelector<HTMLElement>('.fig-tok__t');
  if (!text || text.textContent === next) return;
  if (reduceMotion()) {
    text.textContent = next;
    return;
  }

  const ghost = document.createElement('span');
  ghost.className = 'fig-ghost';
  ghost.setAttribute('aria-hidden', 'true');
  ghost.textContent = text.textContent;
  span.appendChild(ghost);

  text.textContent = next;

  const leaving = ghost.animate(FADE_OUT, { duration: OUT_MS, easing: EASE_IN, fill: 'forwards' });
  const drop = (): void => ghost.remove();
  leaving.finished.then(drop, drop);

  // fill: backwards keeps the new text hidden through its delay, instead of
  // flashing at full opacity before its animation starts.
  text.animate(FADE_IN, { duration: IN_MS, delay: LEAD_MS, easing: EASE_OUT, fill: 'backwards' });
}

function madlib(defaultTemplate: string, declared: (string | FigureOption)[]): HTMLElement {
  const options: FigureOption[] = declared.map(
    (option) => (typeof option === 'string' ? { word: option } : option),
  );

  const wrap = document.createElement('figure');
  wrap.className = 'def-fig def-fig--madlib';
  const line = document.createElement('p');
  line.className = 'fig-line';
  wrap.appendChild(line);

  const templateOf = (option: FigureOption): string => option.template ?? defaultTemplate;
  const first = options[0] ?? { word: '' };
  for (const token of tokenize(templateOf(first), first.word)) addToken(line, tokenEl(token));

  const update = (option: FigureOption): void => {
    const next = tokenize(templateOf(option), option.word);
    const spans = Array.from(line.children) as HTMLElement[];

    // Where every surviving word is now, so it can be moved back and released.
    const was = new Map<HTMLElement, DOMRect>();
    for (const span of spans) was.set(span, span.getBoundingClientRect());

    const shared = Math.min(spans.length, next.length);
    for (let i = 0; i < shared; i += 1) {
      const span = spans[i];
      const token = next[i];
      if (!span || !token) continue;
      span.classList.toggle('fig-slot', token.slot);
      swapToken(span, token.text);
    }
    for (let i = shared; i < spans.length; i += 1) {
      const span = spans[i];
      if (!span) continue;
      const going = span.animate(FADE_OUT, { duration: OUT_MS, easing: EASE_IN, fill: 'forwards' });
      const drop = (): void => dropToken(span);
      going.finished.then(drop, drop);
    }
    for (let i = shared; i < next.length; i += 1) {
      const token = next[i];
      if (!token) continue;
      const span = tokenEl(token);
      addToken(line, span);
      span.animate(FADE_IN, { duration: IN_MS, delay: LEAD_MS, easing: EASE_OUT, fill: 'backwards' });
    }

    // FLIP: everything that moved starts from where it was and glides in.
    for (const span of spans) {
      const from = was.get(span);
      if (!from || !span.isConnected) continue;
      const to = span.getBoundingClientRect();
      const dx = from.left - to.left;
      const dy = from.top - to.top;
      // A word that wrapped to another line would fly across the figure; let
      // that one cut instead.
      if ((dx === 0 && dy === 0) || Math.abs(dy) > 4) continue;
      span.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
        duration: MOVE_MS,
        easing: EASE_SIZE,
      });
    }

    highlightChip(line, option.word);
  };

  // The chip list is appended AFTER this figure (see renderDefinition), and the
  // whole fragment is still detached right now — so the first highlight has to
  // wait a frame for both to be in the document. Later cycles find them fine.
  requestAnimationFrame(() => {
    if (line.isConnected) highlightChip(line, first.word);
  });
  if (reduceMotion() || options.length < 2) return wrap;

  cycleForever(line, CYCLE_MS, (state) => {
    const option = options[state % options.length];
    if (option) update(option);
  });
  return wrap;
}

/* ── truth-values ─────────────────────────────────────────────────────────
   Two sets of two, running in parallel: a statement, a line, and the value it
   lands on. Both start from the same kind of thing — an S, glowing in the
   primary colour — and the line carries it to a value bubble that reveals a
   blue T on one row and a red F on the other.

   Two rows rather than one branching node, because the point is not that a
   statement might go either way; it is that a statement HAS a value, and there
   are exactly two it can be. Colour does the naming: true and false get their
   own, so the pair is legible before the letters resolve. */

const TV_STEP_MS = 520;
const TV_HOLD_MS = 2000;

// `reveal` holds the letter back until the bubble lights, so a value looks
// read off rather than waiting to be coloured in.
function truthNode(cx: number, cy: number, label: string, kind: string, reveal: boolean): SVGGElement {
  const group = bubble('tv-node', cx, cy, 16, label);
  group.classList.add(`tv-node--${kind}`);
  if (reveal) group.classList.add('tv-node--reveal');
  return group;
}

function truthValues(): HTMLElement {
  const wrap = document.createElement('figure');
  wrap.className = 'def-fig def-fig--tv';

  const canvas = figureCanvas(200, 104, 'fig-tv',
    'A statement carries exactly one truth value: on one row it resolves to true, on the other to false.');

  const rows: { source: SVGGElement; fill: SVGLineElement; value: SVGGElement }[] = [];
  for (const [y, letter, kind] of [
    [26, 'T', 'true'],
    [78, 'F', 'false'],
  ] as [number, string, string][]) {
    const fill = trackAndFill(canvas, { x1: 47, y1: y, x2: 133, y2: y }, 'tv-track', 'tv-fill');

    const source = truthNode(28, y, 'S', 'source', false);
    const value = truthNode(150, y, letter, kind, true);
    canvas.appendChild(source);
    canvas.appendChild(value);
    rows.push({ source, fill, value });
  }

  wrap.appendChild(canvas);

  // Both rows move together: statement, then line, then value.
  const setPhase = (phase: number): void => {
    for (const row of rows) {
      row.source.classList.toggle('is-on', phase >= 1);
      row.fill.classList.toggle('is-on', phase >= 2);
      row.value.classList.toggle('is-on', phase >= 3);
    }
  };

  if (reduceMotion()) {
    setPhase(3);
    return wrap;
  }

  setPhase(0);
  whileMounted(canvas, 0, (tick) => {
    const phase = tick % 4;
    setPhase(phase);
    return phase === 3 ? TV_HOLD_MS : TV_STEP_MS;
  });
  return wrap;
}

/* ── advice / conditional ─────────────────────────────────────────────────
   Two shapes that share their machinery. Both cycle a glow colour, and in both
   the colour is doing the same job: it says the passage has no truth value to
   carry. Where a statement resolves to a blue T or a red F, these just pass a
   colour along — it could be any colour, which is the point.

   advice       one bubble to another, a crown over the source (someone telling
                you what to do), and a struck-out T and F under the line.
   conditional  one bubble pointing at two, lighting one branch at a time. "If
                X then Y" sets up a route; it does not travel it.

   The glow is set as a custom property rather than a class per colour, so the
   palette lives in one array and the CSS never has to know how many there are.
   Each entry names the CSS variables rather than literal hex, so the dark-mode
   overrides still apply. */

const GLOWS = [
  { color: 'var(--fig-blue)', rgb: 'var(--fig-blue-rgb)' },
  { color: 'var(--fig-violet)', rgb: 'var(--fig-violet-rgb)' },
];

function setGlow(el: SVGElement | HTMLElement, index: number): void {
  const glow = GLOWS[index % GLOWS.length];
  if (!glow) return;
  el.style.setProperty('--glow', glow.color);
  el.style.setProperty('--glow-rgb', glow.rgb);
}

function glowNode(cx: number, cy: number, radius: number): SVGGElement {
  return bubble('gl-node', cx, cy, radius, '');
}

function glowLink(d: string): SVGPathElement {
  const path = svg('path');
  attrs(path, { d, fill: 'none' });
  path.setAttribute('class', 'gl-link');
  return path;
}

// The values this passage does not have. Deliberately HTML rather than SVG
// <text>: in the figure sizes used here, SVG text has painted off its stated
// coordinates (a strike drawn to cross a letter landed beside it instead), and
// HTML text positions reliably. Anything that must sit exactly against another
// mark should not be SVG text.
function struckValues(letters: string[]): HTMLElement {
  const row = document.createElement('p');
  row.className = 'gl-values';
  for (const letter of letters) {
    const item = document.createElement('span');
    item.className = 'gl-struck';
    item.textContent = letter;
    row.appendChild(item);
  }
  row.setAttribute('aria-label', `Neither ${letters.join(' nor ')} — this carries no truth value.`);
  return row;
}

function crown(cx: number, cy: number): SVGPathElement {
  const path = svg('path');
  attrs(path, { d: `M ${cx - 8} ${cy + 5} L ${cx - 9} ${cy - 5} L ${cx - 4} ${cy} L ${cx} ${cy - 7} ` +
    `L ${cx + 4} ${cy} L ${cx + 9} ${cy - 5} L ${cx + 8} ${cy + 5} Z` });
  path.setAttribute('class', 'gl-crown');
  return path;
}

function advice(): HTMLElement {
  const wrap = document.createElement('figure');
  wrap.className = 'def-fig def-fig--glow';

  const canvas = figureCanvas(200, 62, 'fig-glow', 'One party directing another, a crown over the source.');

  canvas.appendChild(crown(46, 12));
  const link = glowLink('M 64 40 L 136 40');
  canvas.appendChild(link);
  const from = glowNode(46, 40, 16);
  const to = glowNode(154, 40, 16);
  canvas.appendChild(from);
  canvas.appendChild(to);

  wrap.appendChild(canvas);
  wrap.appendChild(struckValues(['T', 'F']));

  // Dark, then the speaker, then the line, then the listener — and the whole
  // thing goes dark again before the next colour, so the change of colour is
  // never what you are watching.
  sequence(canvas, 3, (phase, cycle) => {
    for (const el of [from, to, link]) setGlow(el, cycle);
    from.classList.toggle('is-on', phase >= 1);
    link.classList.toggle('is-on', phase >= 2);
    to.classList.toggle('is-on', phase >= 3);
  });
  return wrap;
}

function conditional(): HTMLElement {
  const wrap = document.createElement('figure');
  wrap.className = 'def-fig def-fig--glow';

  const canvas = figureCanvas(200, 104, 'fig-glow',
    'One statement pointing to either of two others, one route live at a time.');

  const up = glowLink('M 49 44 C 80 30 106 26 144 24');
  const down = glowLink('M 49 60 C 80 74 106 78 144 80');
  canvas.appendChild(up);
  canvas.appendChild(down);
  const source = glowNode(34, 52, 16);
  const top = glowNode(160, 24, 16);
  const bottom = glowNode(160, 80, 16);
  canvas.appendChild(source);
  canvas.appendChild(top);
  canvas.appendChild(bottom);

  wrap.appendChild(canvas);

  // One branch per pass, run the same way advice is: dark, source, line, target.
  // Which branch alternates with the colour, so the two read as one fact.
  const branches = [
    { node: top, link: up },
    { node: bottom, link: down },
  ];
  sequence(canvas, 3, (phase, cycle) => {
    const live = cycle % branches.length;
    setGlow(source, live);
    source.classList.toggle('is-on', phase >= 1);
    branches.forEach((branch, k) => {
      setGlow(branch.node, live);
      setGlow(branch.link, live);
      branch.link.classList.toggle('is-on', k === live && phase >= 2);
      branch.node.classList.toggle('is-on', k === live && phase >= 3);
    });
  });
  return wrap;
}

/* ── a kit for the sequenced figures ──────────────────────────────────────
   Several of the non-inferential kinds are the same idea told with different
   furniture: something lights, a line draws itself to the next thing, that
   lights in turn. Rather than six near-copies, they share a bubble, a line and
   a step runner, and differ only in what they put where.

   Lines draw themselves with pathLength=1 and a dash offset, which works the
   same on a straight run and a curve — the pipeline's scaleX trick does not
   survive a curve, and Illustration needs a line that stops half way. */

const SEQ_MS = 560;
const SEQ_HOLD_MS = 2200;

function sequenceNode(cx: number, cy: number, radius: number, label: string): SVGGElement {
  return bubble('bx-node', cx, cy, radius, label);
}

// A line and the track it draws itself along. `amount` lets a line stop part
// way, which is what Illustration's pause is made of.
function drawnLine(canvas: SVGSVGElement, d: string): SVGPathElement {
  const track = svg('path');
  attrs(track, { d, fill: 'none' });
  track.setAttribute('class', 'bx-track');
  canvas.appendChild(track);

  const line = svg('path');
  attrs(line, { d, fill: 'none', pathLength: 1 });
  line.setAttribute('class', 'bx-line');
  canvas.appendChild(line);
  return line;
}

function drawTo(line: SVGPathElement, amount: number): void {
  line.style.strokeDashoffset = String(1 - amount);
  line.classList.toggle('is-on', amount > 0);
}

// Run a figure through `steps` beats, then hold, then start over. `cycle` counts
// complete run-throughs, so a figure can change something once per pass — the
// glow colour, or which branch is live — while everything is still dark.
function sequence(
  canvas: SVGSVGElement,
  steps: number,
  apply: (phase: number, cycle: number) => void,
): void {
  if (reduceMotion()) {
    apply(steps, 0);
    return;
  }
  let cycle = 0;
  whileMounted(canvas, 0, (tick) => {
    const phase = tick % (steps + 1);
    if (phase === 0 && tick > 0) cycle += 1;
    apply(phase, cycle);
    return phase === steps ? SEQ_HOLD_MS : SEQ_MS;
  });
}

/* ── reasoning ────────────────────────────────────────────────────────────
   The argument map, with the premises carrying truth rather than emphasis.
   Three states, and the third is the one that teaches: it takes only one false
   premise, in either position, to lose the conclusion. Blue and red mean here
   exactly what they mean in truth value — this is the same alphabet. */

const REASON_MS = 1900;
const REASON_STATES: [string, string, string][] = [
  ['true', 'true', 'true'],
  ['false', 'true', 'false'],
  ['true', 'false', 'false'],
];

function reasoning(): HTMLElement {
  const wrap = document.createElement('figure');
  wrap.className = 'def-fig def-fig--map';

  const canvas = figureCanvas(200, 120, 'fig-map',
    'Two premises carrying truth into a conclusion: either one being false loses it.');

  const link = (d: string): SVGPathElement => {
    const path = svg('path');
    attrs(path, { d, fill: 'none' });
    path.setAttribute('class', 'fig-link is-lit');
    return path;
  };
  canvas.appendChild(link('M 58 43 C 58 66 74 70 88 78'));
  canvas.appendChild(link('M 142 43 C 142 66 126 70 112 78'));
  // Built with the truth-value node, not the map's: blue and red have to mean
  // here exactly what they mean there, so they are literally the same markup.
  const p1 = truthNode(58, 26, 'P', 'source', false);
  const p2 = truthNode(142, 26, 'P', 'source', false);
  const c = truthNode(100, 92, 'C', 'source', false);
  for (const node of [p1, p2, c]) {
    node.classList.remove('tv-node--source');
    canvas.appendChild(node);
  }
  wrap.appendChild(canvas);

  const paint = (i: number): void => {
    const state = REASON_STATES[i % REASON_STATES.length];
    if (!state) return;
    [p1, p2, c].forEach((node, k) => {
      node.classList.toggle('tv-node--true', state[k] === 'true');
      node.classList.toggle('tv-node--false', state[k] === 'false');
      node.classList.add('is-on');
    });
  };
  paint(0);
  if (!reduceMotion()) cycleForever(canvas, REASON_MS, paint);
  return wrap;
}

/* ── infer ────────────────────────────────────────────────────────────────
   One statement, and the value read off it. The bubble and the word beneath
   change together, so the pairing is the whole content. */

function infer(): HTMLElement {
  const wrap = document.createElement('figure');
  wrap.className = 'def-fig def-fig--infer';

  // Square canvas so the bubble sits dead centre, and built from the
  // truth-value node — mapNode's ring is .fig-node__ring, which the true/false
  // rules do not reach, so the colour never arrived.
  const canvas = figureCanvas(64, 64, 'fig-infer', 'A statement, and the truth value read off it.');
  const node = truthNode(32, 32, 'S', 'source', false);
  node.classList.remove('tv-node--source');
  node.classList.add('is-on');
  canvas.appendChild(node);
  wrap.appendChild(canvas);

  const value = document.createElement('p');
  value.className = 'if-value';
  wrap.appendChild(value);

  const states: [string, string][] = [['true', 'True'], ['false', 'False']];
  const paint = (i: number): void => {
    const state = states[i % states.length];
    if (!state) return;
    node.classList.toggle('tv-node--true', state[0] === 'true');
    node.classList.toggle('tv-node--false', state[0] === 'false');
    value.textContent = state[1];
    value.className = `if-value is-${state[0]}`;
  };
  paint(0);
  if (!reduceMotion()) cycleForever(canvas, REASON_MS, paint);
  return wrap;
}

/* ── expository ───────────────────────────────────────────────────────────
   A topic, the elaboration hanging off it, and only then the rest. The panel
   of lines fills in before the run continues, because that is the order the
   form is written in. */

// What the elaboration is made of, marked in the panel's corner: an eye for
// expository writing (it elaborates by describing), a book for an explanation
// (it elaborates by accounting for). Same figure, one glyph apart — which is
// close to the truth about the two forms.
function panelGlyph(kind: string, cx: number, cy: number): SVGGElement {
  const group = svg('g');
  group.setAttribute('class', 'bx-mark');
  if (kind === 'book') {
    const covers = svg('path');
    attrs(covers, { d: `M ${cx - 7} ${cy - 5} C ${cx - 4} ${cy - 7} ${cx - 1} ${cy - 6} ${cx} ${cy - 4} ` +
      `C ${cx + 1} ${cy - 6} ${cx + 4} ${cy - 7} ${cx + 7} ${cy - 5} L ${cx + 7} ${cy + 5} ` +
      `C ${cx + 4} ${cy + 3} ${cx + 1} ${cy + 4} ${cx} ${cy + 6} ` +
      `C ${cx - 1} ${cy + 4} ${cx - 4} ${cy + 3} ${cx - 7} ${cy + 5} Z` });
    const spine = svg('line');
    attrs(spine, { x1: cx, y1: cy - 4, x2: cx, y2: cy + 6 });
    group.appendChild(covers);
    group.appendChild(spine);
  } else {
    const lid = svg('path');
    attrs(lid, { d: `M ${cx - 8} ${cy} C ${cx - 5} ${cy - 5} ${cx + 5} ${cy - 5} ${cx + 8} ${cy} ` +
      `C ${cx + 5} ${cy + 5} ${cx - 5} ${cy + 5} ${cx - 8} ${cy} Z` });
    const iris = svg('circle');
    attrs(iris, { cx, cy, r: 2.2 });
    group.appendChild(lid);
    group.appendChild(iris);
  }
  return group;
}

function expository(glyph: string): HTMLElement {
  const wrap = document.createElement('figure');
  wrap.className = 'def-fig def-fig--bx';
  const canvas = figureCanvas(200, 116, 'fig-bx', 'A topic, elaborated on, and then carried forward.');

  const down = drawnLine(canvas, 'M 32 50 C 32 66 40 68 56 70');
  const across = drawnLine(canvas, 'M 48 30 L 144 30');

  const panel = svg('rect');
  attrs(panel, { x: 56, y: 56, width: 92, height: 40, rx: 7 });
  panel.setAttribute('class', 'bx-panel');
  canvas.appendChild(panel);

  // The third line is short so the corner glyph has somewhere to sit.
  const lines = [0, 1, 2].map((i) => {
    const bar = svg('rect');
    attrs(bar, { x: 65, y: 63 + i * 9, width: [72, 60, 48][i] ?? 60, height: 4, rx: 2 });
    bar.setAttribute('class', 'bx-textline');
    canvas.appendChild(bar);
    return bar;
  });

  const mark = panelGlyph(glyph, 134, 84);
  canvas.appendChild(mark);

  const topic = sequenceNode(32, 30, 16, 'E');
  const rest = sequenceNode(160, 30, 16, '\u2026');
  canvas.appendChild(topic);
  canvas.appendChild(rest);
  wrap.appendChild(canvas);

  // topic, branch down, three lines of elaboration, then across to the rest.
  sequence(canvas, 7, (phase) => {
    topic.classList.toggle('is-on', phase >= 1);
    drawTo(down, phase >= 2 ? 1 : 0);
    panel.classList.toggle('is-on', phase >= 2);
    lines.forEach((bar, i) => bar.classList.toggle('is-on', phase >= 3 + i));
    mark.classList.toggle('is-on', phase >= 5);
    drawTo(across, phase >= 6 ? 1 : 0);
    rest.classList.toggle('is-on', phase >= 7);
  });
  return wrap;
}

/* ── illustration ─────────────────────────────────────────────────────────
   A general idea, stopped half way while the examples are given, then allowed
   to carry on. The pause is the figure: examples interrupt the line rather
   than replacing it. */

function illustration(): HTMLElement {
  const wrap = document.createElement('figure');
  wrap.className = 'def-fig def-fig--bx';
  const canvas = figureCanvas(200, 116, 'fig-bx', 'A general idea, paused for examples, then carried on.');

  const exampleX = [58, 96, 134];
  const across = drawnLine(canvas, 'M 44 28 L 144 28');
  const branches = exampleX.map((x) => drawnLine(canvas, `M 96 28 C 96 56 ${x} 54 ${x} 74`));

  const idea = sequenceNode(28, 28, 16, 'I');
  const rest = sequenceNode(160, 28, 16, '\u2026');
  const examples = exampleX.map((x, i) => sequenceNode(x, 88, 13, `I${'\u00b9\u00b2\u00b3'[i] ?? ''}`));
  canvas.appendChild(idea);
  for (const example of examples) canvas.appendChild(example);
  canvas.appendChild(rest);
  wrap.appendChild(canvas);

  sequence(canvas, 7, (phase) => {
    idea.classList.toggle('is-on', phase >= 1);
    // Half way, wait for the examples, then the rest of the way.
    drawTo(across, phase >= 6 ? 1 : phase >= 2 ? 0.52 : 0);
    branches.forEach((branch, i) => drawTo(branch, phase >= 3 + i ? 1 : 0));
    examples.forEach((example, i) => example.classList.toggle('is-on', phase >= 3 + i));
    rest.classList.toggle('is-on', phase >= 7);
  });
  return wrap;
}

/* ── report ───────────────────────────────────────────────────────────────
   The world, and information about it. Nothing is inferred; something is
   simply carried across. */

function globe(cx: number, cy: number): SVGGElement {
  const group = svg('g');
  group.setAttribute('class', 'bx-glyph');
  const outline = svg('circle');
  attrs(outline, { cx, cy, r: 8.5 });
  const meridian = svg('ellipse');
  attrs(meridian, { cx, cy, rx: 3.6, ry: 8.5 });
  const equator = svg('line');
  attrs(equator, { x1: cx - 8.5, y1: cy, x2: cx + 8.5, y2: cy });
  for (const el of [outline, meridian, equator]) group.appendChild(el);
  return group;
}

function report(): HTMLElement {
  const wrap = document.createElement('figure');
  wrap.className = 'def-fig def-fig--bx';
  const canvas = figureCanvas(200, 62, 'fig-bx', 'The world on one side, information about it on the other.');

  const across = drawnLine(canvas, 'M 62 31 L 138 31');
  const world = sequenceNode(46, 31, 16, '');
  world.appendChild(globe(46, 31));
  const info = sequenceNode(154, 31, 16, 'i');
  canvas.appendChild(world);
  canvas.appendChild(info);
  wrap.appendChild(canvas);

  sequence(canvas, 3, (phase) => {
    world.classList.toggle('is-on', phase >= 1);
    drawTo(across, phase >= 2 ? 1 : 0);
    info.classList.toggle('is-on', phase >= 3);
  });
  return wrap;
}

/* ── belief ───────────────────────────────────────────────────────────────
   Advice's shape, but the speaker is not directing you — they are holding
   something true, which is what the lone T under them says. No colour cycling:
   there is nothing here that varies. */

function belief(): HTMLElement {
  const wrap = document.createElement('figure');
  wrap.className = 'def-fig def-fig--glow def-fig--belief';

  const canvas = figureCanvas(200, 62, 'fig-glow', 'A speaker holding something true, and passing it on.');

  canvas.appendChild(crown(46, 12));
  const link = glowLink('M 64 40 L 136 40');
  canvas.appendChild(link);
  const from = glowNode(46, 40, 16);
  const to = glowNode(154, 40, 16);
  canvas.appendChild(from);
  canvas.appendChild(to);
  for (const el of [from, to, link]) el.classList.add('is-on', 'is-accent');
  wrap.appendChild(canvas);

  // Positioned under the first bubble rather than centred — HTML, because a
  // mark that has to line up with something else must not be SVG text.
  const row = document.createElement('p');
  row.className = 'gl-values gl-values--under';
  const mark = document.createElement('span');
  mark.className = 'gl-mark';
  mark.style.setProperty('--at', '23%');
  mark.textContent = 'T';
  row.appendChild(mark);
  wrap.appendChild(row);
  return wrap;
}

/* ── warning ─────────────────────────────────────────────────────────────
   Advice's shape — someone addressing someone — but what is being passed is a
   caution rather than an instruction, so the struck truth values give way to
   the sign for it. No colour cycling: a warning is not a matter of degree. */

function warnTriangle(cx: number, cy: number): SVGGElement {
  const group = svg('g');
  group.setAttribute('class', 'gl-warn');
  const tri = svg('path');
  attrs(tri, {
    d: `M ${cx} ${cy - 7} L ${cx + 8} ${cy + 7} L ${cx - 8} ${cy + 7} Z`,
  });
  const stem = svg('line');
  attrs(stem, { x1: cx, y1: cy - 1, x2: cx, y2: cy + 2.5 });
  const dot = svg('line');
  attrs(dot, { x1: cx, y1: cy + 4.6, x2: cx, y2: cy + 4.9 });
  for (const el of [tri, stem, dot]) group.appendChild(el);
  return group;
}

function warning(): HTMLElement {
  const wrap = document.createElement('figure');
  wrap.className = 'def-fig def-fig--glow';

  const canvas = figureCanvas(200, 76, 'fig-glow', 'One party cautioning another.');

  canvas.appendChild(crown(46, 12));
  const link = glowLink('M 64 40 L 136 40');
  canvas.appendChild(link);
  canvas.appendChild(warnTriangle(100, 62));
  const from = glowNode(46, 40, 16);
  const to = glowNode(154, 40, 16);
  canvas.appendChild(from);
  canvas.appendChild(to);
  for (const el of [from, to, link]) el.classList.add('is-on', 'is-accent');

  wrap.appendChild(canvas);
  return wrap;
}

/* ── evaluate (validity / soundness / strength / cogency) ────────────────
   One drawing for all four: the argument moved left, and the two verdicts it is
   being judged against stacked beside it. Each popover shows the SAME picture
   and changes one thing, because the pairs ARE the lesson.

     validity   the support cycles away and V goes with it. S never lights —
                validity is not asking about the premises.
     soundness  the support holds, so V stays lit; the premises cycle through
                reasoning's three states and S lights only when none is red.
     strength   validity's run with the inductive pair beside it: S follows the
                support, C stays dark.
     cogency    the premises come in one at a time and the conclusion's ring
                climbs with them — 25% on the first, 60% and green on the
                second, which is where C finally lights.

   Only the argument's own bubbles ever take the truth colours. The verdict
   bubbles are the accent or nothing, because a verdict is not true or false —
   it either holds or it does not. */

const EVAL_MS = 1900;
const EVAL_CAPTION: Record<string, string> = {
  validity: 'An argument judged valid exactly while its premises support its conclusion.',
  soundness: 'An argument whose form holds throughout, judged sound only while both premises are true.',
  strength: 'An argument judged strong exactly while its premises support its conclusion.',
  cogency: 'Premises arriving one at a time, each raising how likely the conclusion is.',
};
const RING_THRESHOLD = 51;
// Per phase: how far each of the three rings has climbed. The premises are
// already likely on their own; what the figure is about is the conclusion
// crossing the halfway mark on the strength of them.
const COGENCY_PHASES: { p1: number; p2: number; c: number }[] = [
  { p1: 0, p2: 0, c: 0 },
  { p1: 75, p2: 0, c: 25 },
  { p1: 75, p2: 90, c: 60 },
];

// A ring drawn on a bubble, read as a percentage. pathLength=100 makes the dash
// offset the percentage directly, whatever the radius.
function progressArc(cx: number, cy: number, r: number): SVGCircleElement {
  const arc = svg('circle');
  attrs(arc, {
    cx, cy, r, fill: 'none', pathLength: 100,
    'stroke-dasharray': '100 100', 'stroke-dashoffset': 100,
    transform: `rotate(-90 ${cx} ${cy})`,
  });
  arc.setAttribute('class', 'ev-arc');
  return arc;
}

function setArc(arc: SVGCircleElement, value: number): void {
  arc.style.strokeDashoffset = String(100 - value);
  arc.classList.toggle('is-over', value >= RING_THRESHOLD);
  // At zero the round cap still paints a dot. Nothing should read as "a little
  // bit likely" when the answer is that nothing has been offered yet.
  arc.classList.toggle('is-empty', value <= 0);
}

function evaluation(mode: string): HTMLElement {
  const inductive = mode === 'strength' || mode === 'cogency';
  const [topLabel, bottomLabel] = inductive ? ['S', 'C'] : ['V', 'S'];

  const wrap = document.createElement('figure');
  wrap.className = 'def-fig def-fig--ev';

  const canvas = figureCanvas(224, 120, 'fig-ev', EVAL_CAPTION[mode] ?? EVAL_CAPTION.validity ?? '');

  const link = (d: string): SVGPathElement => {
    const path = svg('path');
    attrs(path, { d, fill: 'none' });
    path.setAttribute('class', 'ev-link');
    canvas.appendChild(path);
    return path;
  };
  const links = [
    link('M 37 41 C 37 62 50 68 63 78'),
    link('M 113 41 C 113 62 100 68 87 78'),
  ];

  const placeNode = (cx: number, cy: number, label: string): SVGGElement => {
    const group = truthNode(cx, cy, label, 'source', false);
    canvas.appendChild(group);
    return group;
  };
  const p1 = placeNode(36, 26, 'P');
  const p2 = placeNode(114, 26, 'P');
  const conclusion = placeNode(75, 88, 'C');

  // Cogency reads every one of them off a ring rather than a colour, so the
  // arcs go on before the verdict bubbles are drawn.
  const arcs =
    mode === 'cogency'
      ? { p1: progressArc(36, 26, 15), p2: progressArc(114, 26, 15), c: progressArc(75, 88, 16) }
      : null;
  if (arcs) for (const arc of [arcs.p1, arcs.p2, arcs.c]) canvas.appendChild(arc);

  const top = placeNode(192, 34, topLabel);
  const bottom = placeNode(192, 86, bottomLabel);
  wrap.appendChild(canvas);

  if (mode === 'soundness') {
    // The form never fails here; only the facts do. The verdicts stay accent —
    // they are not the things being called true or false.
    for (const el of links) el.classList.add('is-on');
    for (const el of [p1, p2, conclusion, top]) el.classList.add('is-on');

    const paint = (step: number): void => {
      const state = REASON_STATES[step % REASON_STATES.length];
      if (!state) return;
      [p1, p2, conclusion].forEach((node, position) => {
        node.classList.remove('tv-node--source');
        node.classList.toggle('tv-node--true', state[position] === 'true');
        node.classList.toggle('tv-node--false', state[position] === 'false');
      });
      bottom.classList.toggle('is-on', state.every((value) => value === 'true'));
    };
    paint(0);
    if (!reduceMotion()) cycleForever(canvas, EVAL_MS, paint);
    return wrap;
  }

  if (mode === 'cogency' && arcs) {
    // The support and the strength verdict are settled here — neither is what
    // this popover is asking about. The statements themselves never take the
    // accent: their rings are the whole reading.
    for (const el of links) el.classList.add('is-on');
    top.classList.add('is-on');

    const paint = (phase: number): void => {
      const level = COGENCY_PHASES[Math.min(phase, COGENCY_PHASES.length - 1)];
      if (!level) return;
      setArc(arcs.p1, level.p1);
      setArc(arcs.p2, level.p2);
      setArc(arcs.c, level.c);
      bottom.classList.toggle('is-on', level.c >= RING_THRESHOLD);
    };
    paint(reduceMotion() ? 2 : 0);
    if (reduceMotion()) return wrap;
    whileMounted(canvas, 0, (tick) => {
      const phase = tick % 3;
      paint(phase);
      return phase === 2 ? SEQ_HOLD_MS : EVAL_MS;
    });
    return wrap;
  }

  // validity and strength: the support comes and goes, and the verdict with it.
  for (const el of [p1, p2, conclusion]) el.classList.add('is-on');

  const paint = (supported: boolean): void => {
    for (const el of links) el.classList.toggle('is-on', supported);
    top.classList.toggle('is-on', supported);
  };
  paint(true);
  if (reduceMotion()) return wrap;
  cycleForever(canvas, EVAL_MS, (state) => paint(state % 2 === 0));
  return wrap;
}

/* ── standard-form ────────────────────────────────────────────────────────
   The premises listed, a rule, then the conclusion — the definition's own
   shape, shown at a glance rather than described. */

// A gutter mark (P1, P2, the therefore sign) and the statement itself. The mark
// is decoration — the list and the rule already say which line is which to a
// screen reader — so it is hidden from the accessibility tree.
function standardFormLine(tagName: string, className: string, mark: string, text: string): HTMLElement {
  const line = document.createElement(tagName);
  line.className = className;

  const tag = document.createElement('span');
  tag.className = 'sf-tag';
  tag.setAttribute('aria-hidden', 'true');
  tag.textContent = mark;
  line.appendChild(tag);

  const body = document.createElement('span');
  body.textContent = text;
  line.appendChild(body);

  return line;
}

function standardForm(premises: string[], conclusion: string): HTMLElement {
  const wrap = document.createElement('figure');
  wrap.className = 'def-fig def-fig--sf';

  const list = document.createElement('ol');
  list.className = 'sf-lines';
  premises.forEach((text, i) => {
    list.appendChild(standardFormLine('li', 'sf-line', `P${i + 1}`, text));
  });

  const rule = document.createElement('hr');
  rule.className = 'sf-rule';

  const concl = standardFormLine('p', 'sf-line sf-concl', '\u2234', conclusion);

  wrap.appendChild(list);
  wrap.appendChild(rule);
  wrap.appendChild(concl);
  return wrap;
}

/* ── pipeline (deductive and inductive) ───────────────────────────────────
   One drawing for both, and the difference between them IS the difference
   between the two kinds of argument. The premises check off identically —
   both arguments make the same claims. What differs is only what happens at
   the conclusion:

     deductive   the conclusion checks off too. Every stage passes, every time,
                 like a build that cannot go red.
     inductive   the conclusion never checks. Instead a ring sweeps around it
                 and stops partway — red while the conclusion is no better than
                 a coin flip, green once the premises make it more likely than
                 not, and never closing the circle.

   The ring is the colophon's score idiom (perf-meters.ts + the SVG in
   layouts/_default/colophon.html): stroke-dasharray as a percentage, rotated
   -90 so it starts at twelve o'clock. pathLength=100 makes the percentage exact
   at any radius, rather than relying on colophon's r=15.9155 trick. */

const PIPE_STEP_MS = 480;
const PIPE_HOLD_MS = 2000;
// The ring spends most of a beat sweeping, so its hold is longer — otherwise
// the figure resets almost as soon as it settles, and 60% never reads as the
// place it stopped.
const PIPE_RING_HOLD_MS = 2800;
const SWEEP_MS = 900;
const easeOutCubic = (p: number): number => 1 - Math.pow(1 - p, 3);

export interface RingSpec {
  target: number;
  threshold: number;
}

// The checkmark is drawn on with pathLength=1 once the stage passes.
function pipelineNode(cx: number, cy: number, radius: number, label: string): SVGGElement {
  const group = bubble('fig-step', cx, cy, radius, label);
  const check = svg('path');
  attrs(check, {
    d: `M ${cx - 6} ${cy} L ${cx - 1.5} ${cy + 4.5} L ${cx + 6.5} ${cy - 5}`,
    fill: 'none',
    pathLength: 1,
  });
  check.setAttribute('class', 'fig-step__check');
  group.appendChild(check);
  return group;
}

function pipeline(ringSpec: RingSpec | null): HTMLElement {
  const wrap = document.createElement('figure');
  wrap.className = 'def-fig def-fig--pipe';

  const canvas = figureCanvas(200, 52, 'fig-pipe',
    ringSpec
      ? `Two premises checking off, and a conclusion the premises raise to ${ringSpec.target} percent — likely, but never certain.`
      : 'Two premises checking off in sequence, and the conclusion following from them.',
  );

  const stageX = [26, 100, 174];
  const stageY = 26;

  const links: SVGLineElement[] = [];
  for (let i = 0; i < stageX.length - 1; i += 1) {
    links.push(trackAndFill(
      canvas,
      { x1: stageX[i]! + 18, y1: stageY, x2: stageX[i + 1]! - 18, y2: stageY },
      'fig-pipe__track',
      'fig-pipe__fill',
    ));
  }

  const labels = ['P', 'P', 'C'];
  const steps = stageX.map((x, i) => {
    const node = pipelineNode(x, stageY, 16, labels[i] ?? '');
    canvas.appendChild(node);
    return node;
  });

  // Inductive: an arc around the conclusion instead of a check inside it.
  let arc: SVGCircleElement | null = null;
  if (ringSpec) {
    const conclusion = steps[2]!;
    conclusion.classList.add('fig-step--ring');
    arc = svg('circle');
    attrs(arc, {
      cx: stageX[2]!,
      cy: stageY,
      r: 16,
      fill: 'none',
      pathLength: 100,
      'stroke-dasharray': '0 100',
      transform: `rotate(-90 ${stageX[2]!} ${stageY})`,
    });
    arc.setAttribute('class', 'fig-step__arc');
    conclusion.appendChild(arc);
  }

  wrap.appendChild(canvas);

  const paintArc = (value: number): void => {
    if (!arc || !ringSpec) return;
    arc.style.strokeDasharray = `${value} 100`;
    arc.classList.toggle('is-over', value >= ringSpec.threshold);
  };

  // Bumping the token abandons an in-flight sweep, so a loop reset can't leave
  // two rAF chains fighting over the same arc.
  let sweepToken = 0;
  const sweep = (): void => {
    if (!ringSpec) return;
    const mine = (sweepToken += 1);
    const begin = performance.now();
    const frame = (now: number): void => {
      if (!canvas.isConnected || mine !== sweepToken) return;
      const progress = Math.min(1, (now - begin) / SWEEP_MS);
      paintArc(ringSpec.target * easeOutCubic(progress));
      if (progress < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };

  // phase 0 = all clear; then node, link, node, link, conclusion.
  const setPhase = (phase: number): void => {
    steps.forEach((node, i) => {
      // In ring mode the conclusion never checks off — that's the whole point.
      const passed = ringSpec && i === 2 ? false : phase >= i * 2 + 1;
      node.classList.toggle('is-done', passed);
    });
    links.forEach((link, i) => link.classList.toggle('is-done', phase >= i * 2 + 2));
    if (!ringSpec) return;
    if (phase >= 5) {
      sweep();
      return;
    }
    if (phase !== 0) return;
    sweepToken += 1;
    paintArc(0);
  };

  if (reduceMotion()) {
    setPhase(4);
    steps.forEach((node, i) => { if (!ringSpec || i !== 2) node.classList.add('is-done'); });
    paintArc(ringSpec ? ringSpec.target : 0);
    return wrap;
  }

  setPhase(0);
  // Starts on the first hop rather than after one — otherwise the figure sits
  // visibly idle for a beat before the first stage lights.
  whileMounted(canvas, 0, (tick) => {
    const phase = tick % 6;
    setPhase(phase);
    if (phase !== 5) return PIPE_STEP_MS;
    return ringSpec ? PIPE_RING_HOLD_MS : PIPE_HOLD_MS;
  });
  return wrap;
}

export function renderFigure(figure: Figure): HTMLElement | null {
  switch (figure.kind) {
    case 'argument-map':
      return argumentMap(figure.highlight ?? 'all', figure.cycle);
    case 'madlib':
      return figure.template && figure.options?.length
        ? madlib(figure.template, figure.options)
        : null;
    case 'truth-values':
      return truthValues();
    case 'advice':
      return advice();
    case 'conditional':
      return conditional();
    case 'reasoning':
      return reasoning();
    case 'infer':
      return infer();
    case 'expository':
      return expository(figure.glyph ?? 'eye');
    case 'illustration':
      return illustration();
    case 'report':
      return report();
    case 'belief':
      return belief();
    case 'warning':
      return warning();
    case 'evaluate':
      return evaluation(figure.mode ?? 'validity');
    case 'standard-form':
      return figure.premises?.length && figure.conclusion
        ? standardForm(figure.premises, figure.conclusion)
        : null;
    case 'pipeline':
      return pipeline(
        figure.mode === 'ring'
          ? { target: figure.target ?? 60, threshold: figure.threshold ?? 51 }
          : null,
      );
    default:
      return null;
  }
}
