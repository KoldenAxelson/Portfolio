// The cells engine behind the Python for ML array figures: a set of labelled
// boxes that move between arrangements. Every array figure (a grid being
// sliced, reshaped, reduced along an axis, broadcast, viewed or copied) is the
// same boxes in a sequence of states, so they all share one drawing and one
// motion: a cell that moves slides, a cell that goes away fades, and only the
// cells that changed do either.
//
// A figure is a list of states. Each state says where each cell sits (or that it
// is hidden), what it reads, how it is toned, and the caption under the drawing.
// The engine positions everything with CSS transforms and lets transitions in
// assets/css/figures-python.css do the moving.
import { attrs, centredLabel, figureCanvas, reduceMotion, svg, whileMounted } from '../figure-kit';

export interface Place {
  r: number;
  c: number;
  /** Depth for a 3-D stack: 0 is in front, and each layer sits up and to the
   *  right of the last. Cells paint in index order, so give the front layer
   *  the higher indices. */
  layer?: number;
  /** Positioned but invisible: where a cell waits before it fades in, or
   *  where it slides to as it fades out. */
  hidden?: boolean;
}

/** `head` draws a label rather than a value: a table's column name or row label. */
const TONES = ['lit', 'alt', 'bad', 'ghost', 'dim', 'head'] as const;
export type Tone = '' | (typeof TONES)[number];

export interface CellState {
  /** The bounding grid the placed cells are centred in. */
  rows: number;
  cols: number;
  place: (i: number) => Place | null;
  value?: (i: number) => string;
  tone?: (i: number) => Tone;
  caption: string;
  overlay?: 'axis0' | 'axis1';
  /** Top-left of the grid, when a figure positions it itself. */
  origin?: { x: number; y: number };
  holdMs?: number;
}

export interface CellFigure {
  count: number;
  states: CellState[];
  label: string;
  /** Box width; the default fits two digits. */
  cellWidth?: number;
  /** Which state a reduced-motion reader sees. */
  still?: number;
  /** Canvas height; by default the tallest state plus room for the axis arrows. */
  height?: number;
  /** Static extras (name tags, arrows); returns a painter called per state. */
  decorate?: (canvas: SVGSVGElement) => (state: number) => void;
}

export const WIDTH = 260;
export const CELL_H = 20;
export const CELL_W = 22;
const STEP_MS = 2200;
const ARROW_ROOM = 34;

export function gridOrigin(state: CellState, cellWidth: number, height: number): { x: number; y: number } {
  if (state.origin) return state.origin;
  return {
    x: (WIDTH - state.cols * cellWidth) / 2,
    y: (height - state.rows * CELL_H) / 2,
  };
}

function cellGroup(cellWidth: number): { group: SVGGElement; text: SVGTextElement } {
  const group = svg('g');
  group.setAttribute('class', 'fig-py-cell');
  const box = svg('rect');
  attrs(box, { x: 1, y: 1, width: cellWidth - 2, height: CELL_H - 2, rx: 2 });
  group.appendChild(box);
  const text = centredLabel(cellWidth / 2, CELL_H / 2 + 0.5, 'fig-py-cell__text', '');
  group.appendChild(text);
  return { group, text };
}

function axisArrow(className: string): SVGGElement {
  const group = svg('g');
  group.setAttribute('class', `fig-py-axis ${className}`);
  const line = svg('line');
  line.setAttribute('class', 'fig-py-axis__line');
  const head = svg('path');
  head.setAttribute('class', 'fig-py-axis__head');
  const label = centredLabel(0, 0, 'fig-py-axis__label', className === 'is-axis0' ? 'axis 0' : 'axis 1');
  group.append(line, head, label);
  return group;
}

// Arrows sit just outside the grid: axis 0 down its left edge, axis 1 along
// its top, each pointing the way the index grows.
function placeArrows(axis0: SVGGElement, axis1: SVGGElement, x: number, y: number, w: number, h: number): void {
  const [line0, head0, label0] = Array.from(axis0.children) as [SVGLineElement, SVGPathElement, SVGTextElement];
  attrs(line0, { x1: x - 7, y1: y, x2: x - 7, y2: y + h - 3 });
  attrs(head0, { d: `M ${x - 10} ${y + h - 6} L ${x - 7} ${y + h} L ${x - 4} ${y + h - 6}` });
  label0.setAttribute('transform', `translate(${x - 22} ${y + h / 2}) rotate(-90)`);
  const [line1, head1, label1] = Array.from(axis1.children) as [SVGLineElement, SVGPathElement, SVGTextElement];
  attrs(line1, { x1: x, y1: y - 6, x2: x + w - 3, y2: y - 6 });
  attrs(head1, { d: `M ${x + w - 6} ${y - 9} L ${x + w} ${y - 6} L ${x + w - 6} ${y - 3}` });
  label1.setAttribute('transform', `translate(${x + w / 2} ${y - 14})`);
}

export function cellFigure(spec: CellFigure): HTMLElement {
  const cellWidth = spec.cellWidth ?? CELL_W;
  const height = spec.height ?? Math.max(...spec.states.map((s) => s.rows)) * CELL_H + ARROW_ROOM;
  const wrap = document.createElement('figure');
  wrap.className = 'def-fig fig-py';
  const canvas = figureCanvas(WIDTH, height, 'fig-py__canvas', spec.label);
  const caption = document.createElement('figcaption');
  caption.className = 'fig-py__caption';
  const captionCode = document.createElement('code');
  caption.appendChild(captionCode);

  const axis0 = axisArrow('is-axis0');
  const axis1 = axisArrow('is-axis1');
  const repaintDecor = spec.decorate?.(canvas);
  const cells = Array.from({ length: spec.count }, () => cellGroup(cellWidth));
  for (const cell of cells) canvas.appendChild(cell.group);
  canvas.append(axis0, axis1);

  // A layer sits up and to the right of the one in front of it, far enough
  // that its top row and last column stay readable.
  const position = (state: CellState, place: Place): string => {
    const origin = gridOrigin(state, cellWidth, height);
    const depth = place.layer ?? 0;
    const x = origin.x + place.c * cellWidth + depth * cellWidth * 0.5;
    const y = origin.y + place.r * CELL_H - depth * CELL_H * 0.75;
    return `translate(${x}px, ${y}px)`;
  };

  const paint = (index: number): void => {
    const state = spec.states[index];
    if (!state) return;
    const origin = gridOrigin(state, cellWidth, height);
    cells.forEach((cell, i) => {
      const place = state.place(i);
      cell.group.classList.toggle('is-hidden', !place || place.hidden === true);
      if (place) cell.group.style.transform = position(state, place);
      const value = state.value?.(i);
      if (value !== undefined) cell.text.textContent = value;
      const tone = state.tone?.(i) ?? '';
      for (const name of TONES) {
        cell.group.classList.toggle(`is-${name}`, tone === name);
      }
    });
    placeArrows(axis0, axis1, origin.x, origin.y, state.cols * cellWidth, state.rows * CELL_H);
    axis0.classList.toggle('is-shown', state.overlay === 'axis0');
    axis1.classList.toggle('is-shown', state.overlay === 'axis1');
    captionCode.textContent = state.caption;
    canvas.setAttribute('aria-label', `${spec.label} ${state.caption}`);
    repaintDecor?.(index);
  };

  // A cell hidden in the first state still needs a position, or it would fade
  // in from the corner: park it where it first appears.
  cells.forEach((cell, i) => {
    for (const state of spec.states) {
      const place = state.place(i);
      if (!place) continue;
      cell.group.style.transform = position(state, place);
      return;
    }
  });
  const still = reduceMotion() ? spec.still ?? 0 : 0;
  paint(still);
  wrap.append(canvas, caption);
  if (spec.states.length < 2 || reduceMotion()) return wrap;

  let current = 0;
  whileMounted(canvas, spec.states[0]?.holdMs ?? STEP_MS, () => {
    current = (current + 1) % spec.states.length;
    paint(current);
    return spec.states[current]?.holdMs ?? STEP_MS;
  });
  return wrap;
}

// Row-major placement: cell i of an r×c grid, the order NumPy stores it in.
export const rowMajor = (cols: number) => (i: number): Place => ({ r: Math.floor(i / cols), c: i % cols });

// How NumPy prints a float in these small figures: a whole number keeps its
// trailing dot ("6."), anything else is rounded to two places.
export function floatText(value: number): string {
  if (Number.isInteger(value)) return `${value}.`;
  return String(Math.round(value * 100) / 100);
}
