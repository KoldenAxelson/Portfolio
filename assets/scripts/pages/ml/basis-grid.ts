// {{< ml/basis-grid >}}: one town, two grids. Your grid is east/north; the
// fisher's is "along the river" and "up the bank". Drag the bakery and both
// sets of coordinates update; drag the ends of the fisher's arrows and their
// grid, the river and the matrix follow. "Read it as a move" plays the other
// meaning of the same matrix: your grid sliding onto the fisher's.
// Defaults come from data/ml/basis-grid.yaml via the shortcode.

import { svgElement } from './plot';

interface Vec {
  x: number;
  y: number;
}

const VIEW = 400;
const UNIT = 30;
const ORIGIN = { x: 130, y: 290 };
// Grid lines are drawn long and clipped to the view, so tilted ones still
// reach the edges.
const LINE_REACH = 30;
const GRID_RANGE = 14;
const HANDLE_LIMIT = { min: -3, max: 6 };
const BAKERY_LIMIT = { minX: -4, maxX: 8.5, minY: -3.5, maxY: 9 };
const MOVE_MS = 1400;

const toPx = (v: Vec): Vec => ({ x: ORIGIN.x + v.x * UNIT, y: ORIGIN.y - v.y * UNIT });
const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
const scale = (v: Vec, k: number): Vec => ({ x: v.x * k, y: v.y * k });
const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const snap = (value: number, step: number): number => Math.round(value / step) * step;
const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

function formatNumber(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  const text = Object.is(rounded, -0) ? '0' : String(rounded);
  return text.replace('-', '−');
}

const pair = (v: Vec): string => `(${formatNumber(v.x)}, ${formatNumber(v.y)})`;

// Solves a·along + b·up = target. Null when the two arrows lie on one line,
// which is exactly when they stop being a basis.
function fisherCoordinates(target: Vec, along: Vec, up: Vec): Vec | null {
  const determinant = along.x * up.y - along.y * up.x;
  if (Math.abs(determinant) < 1e-9) return null;
  return {
    x: (target.x * up.y - target.y * up.x) / determinant,
    y: (along.x * target.y - along.y * target.x) / determinant,
  };
}

function lineAttrs(from: Vec, to: Vec): Record<string, number> {
  const a = toPx(from);
  const b = toPx(to);
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
}

// Every line of a grid built on two arrows: lines parallel to `first` through
// whole steps of `second`, and the other way round.
function gridLines(first: Vec, second: Vec): [Vec, Vec][] {
  const lines: [Vec, Vec][] = [];
  for (let k = -GRID_RANGE; k <= GRID_RANGE; k++) {
    const offsetSecond = scale(second, k);
    lines.push([add(offsetSecond, scale(first, -LINE_REACH)), add(offsetSecond, scale(first, LINE_REACH))]);
    const offsetFirst = scale(first, k);
    lines.push([add(offsetFirst, scale(second, -LINE_REACH)), add(offsetFirst, scale(second, LINE_REACH))]);
  }
  return lines;
}

export function initBasisGrid(root: HTMLElement): void {
  const svg = root.querySelector<SVGSVGElement>('#mli-bg-plot');
  const youText = root.querySelector<HTMLElement>('#mli-bg-you');
  const fisherText = root.querySelector<HTMLElement>('#mli-bg-fisher');
  const matrixBox = root.querySelector<HTMLElement>('#mli-bg-matrix');
  const noteText = root.querySelector<HTMLElement>('#mli-bg-note');
  const modeButton = root.querySelector<HTMLButtonElement>('#mli-bg-mode');
  const resetButton = root.querySelector<HTMLButtonElement>('#mli-bg-reset');
  if (!svg || !youText || !fisherText || !matrixBox) return;

  // The shortcode passes [east, north] pairs (see data/ml/basis-grid.yaml).
  const readPoint = (json: string | undefined, fallback: [number, number]): Vec => {
    const [x, y] = json ? (JSON.parse(json) as [number, number]) : fallback;
    return { x, y };
  };
  const defaults = {
    along: readPoint(root.dataset.along, [2, 1]),
    up: readPoint(root.dataset.up, [-1, 2]),
    bakery: readPoint(root.dataset.bakery, [3, 4]),
  };
  const state = { along: { ...defaults.along }, up: { ...defaults.up }, bakery: { ...defaults.bakery }, move: 0 };
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let isMoveReading = false;

  // --- Static layers, then the ones redrawn on every change ---------------
  svg.replaceChildren();
  const clip = svgElement('clipPath', { id: 'mli-bg-clip' });
  clip.append(svgElement('rect', { x: 0, y: 0, width: VIEW, height: VIEW, rx: 8 }));
  svg.append(clip);
  const scene = svgElement('g', { 'clip-path': 'url(#mli-bg-clip)' });
  svg.append(scene);

  const river = svgElement('line', { class: 'mli-bg-river' });
  const riverLabel = svgElement('text', { class: 'mli-bg-river-label' });
  riverLabel.textContent = 'river';
  const yourGrid = svgElement('g', { class: 'mli-bg-grid is-you' });
  const fisherGrid = svgElement('g', { class: 'mli-bg-grid is-fisher' });
  const movingGrid = svgElement('g', { class: 'mli-bg-grid is-moving' });
  const yourRoute = svgElement('polyline', { class: 'mli-bg-route is-you' });
  const fisherRoute = svgElement('polyline', { class: 'mli-bg-route is-fisher' });
  const arrows = svgElement('g', {});
  const ghost = svgElement('circle', { class: 'mli-bg-ghost', r: 5 });
  scene.append(river, riverLabel, yourGrid, fisherGrid, movingGrid, yourRoute, fisherRoute, arrows, ghost);

  const marker = (id: string, className: string): void => {
    const element = svgElement('marker', { id, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' });
    element.append(svgElement('path', { d: 'M0,0 L10,5 L0,10 z', class: className }));
    clip.before(element);
  };
  marker('mli-bg-head-you', 'mli-bg-head is-you');
  marker('mli-bg-head-fisher', 'mli-bg-head is-fisher');

  function arrow(className: string, label: string): { line: SVGLineElement; text: SVGTextElement } {
    const line = svgElement('line', { class: `mli-bg-arrow ${className}`, 'marker-end': `url(#mli-bg-head-${className.replace('is-', '')})` });
    const text = svgElement('text', { class: `mli-bg-arrow-label ${className}` });
    text.textContent = label;
    arrows.append(line, text);
    return { line, text };
  }
  const east = arrow('is-you', 'east');
  const north = arrow('is-you', 'north');
  const along = arrow('is-fisher', 'along');
  const up = arrow('is-fisher', 'up the bank');

  const home = svgElement('g', { class: 'mli-bg-home' });
  home.append(svgElement('circle', { r: 5 }));
  const homeLabel = svgElement('text', { x: -8, y: 18, 'text-anchor': 'end' });
  homeLabel.textContent = 'you';
  home.append(homeLabel);
  home.setAttribute('transform', `translate(${ORIGIN.x} ${ORIGIN.y})`);
  scene.append(home);

  function handle(className: string, label: string): SVGGElement {
    const group = svgElement('g', { class: `mli-bg-handle ${className}`, tabindex: 0, role: 'button', 'aria-label': label });
    group.append(svgElement('circle', { class: 'mli-bg-hit', r: 16 }), svgElement('circle', { class: 'mli-bg-dot', r: 7 }));
    svg!.append(group);
    return group;
  }
  const bakeryHandle = handle('is-bakery', 'Bakery: drag it, or use the arrow keys');
  const bakeryLabel = svgElement('text', { class: 'mli-bg-bakery-label', x: 12, y: -10 });
  bakeryLabel.textContent = 'bakery';
  bakeryHandle.append(bakeryLabel);
  const alongHandle = handle('is-fisher', 'End of the fisher’s “along the river” arrow: drag it, or use the arrow keys');
  const upHandle = handle('is-fisher', 'End of the fisher’s “up the bank” arrow: drag it, or use the arrow keys');

  function drawGrid(group: SVGGElement, first: Vec, second: Vec): void {
    group.replaceChildren(...gridLines(first, second).map(([from, to]) => svgElement('line', lineAttrs(from, to))));
  }
  drawGrid(yourGrid, { x: 1, y: 0 }, { x: 0, y: 1 });

  function placeArrow(parts: { line: SVGLineElement; text: SVGTextElement }, tip: Vec, labelOffset: Vec): void {
    for (const [name, value] of Object.entries(lineAttrs({ x: 0, y: 0 }, tip))) parts.line.setAttribute(name, String(value));
    const at = toPx(tip);
    parts.text.setAttribute('x', String(at.x + labelOffset.x));
    parts.text.setAttribute('y', String(at.y + labelOffset.y));
  }

  const routePoints = (corners: Vec[]): string => corners.map((corner) => { const p = toPx(corner); return `${p.x},${p.y}`; }).join(' ');

  // --- Readouts ------------------------------------------------------------

  function moveNote(fisher: Vec): string {
    if (!isMoveReading) return 'Read as relabelling: nothing moves. The bakery just has two names.';
    return `Read as a move: every point except your doorstep slides. The point at ${pair(fisher)} on your grid ends up on the bakery, at ${pair(state.bakery)}.`;
  }

  function writeReadouts(fisher: Vec | null): void {
    const { bakery } = state;
    youText!.textContent = `You: ${formatNumber(bakery.x)} east, ${formatNumber(bakery.y)} north, so ${pair(bakery)}.`;
    if (noteText) noteText.textContent = fisher ? moveNote(fisher) : '';
    if (!fisher) {
      fisherText!.textContent = 'The fisher: stuck. These two arrows lie on one line (or one has shrunk to nothing), so together they only reach places on that line. They aren’t a basis.';
      matrixBox!.innerHTML = '<span class="mli-bg-eq">The matrix has no inverse, so there’s nothing to translate with.</span>';
      return;
    }
    fisherText!.textContent = `The fisher: ${formatNumber(fisher.x)} along, ${formatNumber(fisher.y)} up the bank, so ${pair(fisher)}.`;
    const cell = (value: number, className: string): string => `<span class="${className}">${formatNumber(value)}</span>`;
    const column = (v: Vec, className: string): string => `<span class="mli-bg-col">${cell(v.x, className)}${cell(v.y, className)}</span>`;
    // Same markup and sentence as the no-JS default in layouts/shortcodes/ml/basis-grid.html.
    matrixBox!.innerHTML =
      `<span class="mli-bg-m">${column(state.along, 'is-fisher')}${column(state.up, 'is-fisher')}</span>` +
      `<span class="mli-bg-op">×</span><span class="mli-bg-m">${column(fisher, 'is-fisher')}</span>` +
      `<span class="mli-bg-op">=</span><span class="mli-bg-m">${column(bakery, 'is-you')}</span>` +
      `<span class="mli-bg-eq">The columns are the fisher’s arrows in east/north terms. Times the fisher’s numbers, out come yours.</span>`;
  }

  // --- Drawing -------------------------------------------------------------

  function render(): void {
    const fisher = fisherCoordinates(state.bakery, state.along, state.up);
    const isBasis = fisher !== null;

    const riverEnds = lineAttrs(scale(state.along, -40), scale(state.along, 40));
    for (const [name, value] of Object.entries(riverEnds)) river.setAttribute(name, String(value));
    const riverAt = toPx(scale(state.along, 3.4));
    riverLabel.setAttribute('x', String(riverAt.x + 6));
    riverLabel.setAttribute('y', String(riverAt.y + 26));

    if (isBasis) drawGrid(fisherGrid, state.along, state.up);
    else fisherGrid.replaceChildren();

    placeArrow(east, { x: 1, y: 0 }, { x: 2, y: 16 });
    placeArrow(north, { x: 0, y: 1 }, { x: 7, y: -5 });
    placeArrow(along, state.along, { x: 8, y: 4 });
    placeArrow(up, state.up, { x: -10, y: -10 });

    yourRoute.setAttribute('points', routePoints([{ x: 0, y: 0 }, { x: state.bakery.x, y: 0 }, state.bakery]));
    fisherRoute.setAttribute('points', isBasis ? routePoints([{ x: 0, y: 0 }, scale(state.along, fisher.x), state.bakery]) : '');

    // The move reading: your grid, mixed toward the fisher's by `state.move`.
    const showMove = isBasis && state.move > 0;
    movingGrid.toggleAttribute('hidden', !showMove);
    ghost.toggleAttribute('hidden', !showMove);
    if (showMove) {
      const mix = easeInOut(state.move);
      const first = add(scale({ x: 1, y: 0 }, 1 - mix), scale(state.along, mix));
      const second = add(scale({ x: 0, y: 1 }, 1 - mix), scale(state.up, mix));
      drawGrid(movingGrid, first, second);
      const at = toPx(add(scale(first, fisher.x), scale(second, fisher.y)));
      ghost.setAttribute('cx', String(at.x));
      ghost.setAttribute('cy', String(at.y));
    }

    const place = (group: SVGGElement, v: Vec): void => {
      const p = toPx(v);
      group.setAttribute('transform', `translate(${p.x} ${p.y})`);
    };
    place(bakeryHandle, state.bakery);
    place(alongHandle, state.along);
    place(upHandle, state.up);
    root.classList.toggle('is-broken', !isBasis);
    writeReadouts(fisher);
  }

  // --- Dragging and keys ---------------------------------------------------

  type Target = 'bakery' | 'along' | 'up';
  const handles: [SVGGElement, Target][] = [[bakeryHandle, 'bakery'], [alongHandle, 'along'], [upHandle, 'up']];

  function setTarget(target: Target, v: Vec): void {
    if (target === 'bakery') {
      state.bakery = { x: clamp(snap(v.x, 0.5), BAKERY_LIMIT.minX, BAKERY_LIMIT.maxX), y: clamp(snap(v.y, 0.5), BAKERY_LIMIT.minY, BAKERY_LIMIT.maxY) };
    } else {
      state[target] = { x: clamp(snap(v.x, 1), HANDLE_LIMIT.min, HANDLE_LIMIT.max), y: clamp(snap(v.y, 1), HANDLE_LIMIT.min, HANDLE_LIMIT.max) };
    }
    render();
  }

  function pointerToUnits(event: PointerEvent): Vec {
    const matrix = svg!.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const local = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: (local.x - ORIGIN.x) / UNIT, y: (ORIGIN.y - local.y) / UNIT };
  }

  const KEY_STEPS: Record<string, Vec> = { ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, ArrowUp: { x: 0, y: 1 }, ArrowDown: { x: 0, y: -1 } };

  for (const [group, target] of handles) {
    group.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      group.setPointerCapture(event.pointerId);
      group.classList.add('is-dragging');
    });
    group.addEventListener('pointermove', (event) => {
      if (!group.hasPointerCapture(event.pointerId)) return;
      setTarget(target, pointerToUnits(event));
    });
    const release = (): void => group.classList.remove('is-dragging');
    group.addEventListener('pointerup', release);
    group.addEventListener('pointercancel', release);
    group.addEventListener('keydown', (event) => {
      const step = KEY_STEPS[event.key];
      if (!step) return;
      event.preventDefault();
      const size = target === 'bakery' ? 0.5 : 1;
      setTarget(target, add(state[target], scale(step, size)));
    });
  }

  // --- Relabel or move -------------------------------------------------------

  let frame = 0;
  function playMove(toValue: number): void {
    cancelAnimationFrame(frame);
    if (reducedMotion) {
      state.move = toValue;
      render();
      return;
    }
    const fromValue = state.move;
    const startMs = performance.now();
    const step = (nowMs: number): void => {
      if (!root.isConnected) return;
      const progress = Math.min(1, (nowMs - startMs) / MOVE_MS);
      state.move = fromValue + (toValue - fromValue) * progress;
      render();
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  }

  if (modeButton) {
    modeButton.disabled = false;
    modeButton.addEventListener('click', () => {
      isMoveReading = !isMoveReading;
      modeButton.textContent = isMoveReading ? 'Read it as relabelling' : 'Read it as a move';
      modeButton.setAttribute('aria-pressed', String(isMoveReading));
      root.classList.toggle('is-move', isMoveReading);
      playMove(isMoveReading ? 1 : 0);
    });
  }
  if (resetButton) {
    resetButton.disabled = false;
    resetButton.addEventListener('click', () => {
      state.along = { ...defaults.along };
      state.up = { ...defaults.up };
      state.bakery = { ...defaults.bakery };
      render();
    });
  }

  for (const id of ['#mli-bg-key', '#mli-bg-actions']) {
    const element = root.querySelector<HTMLElement>(id);
    if (element) element.hidden = false;
  }
  root.classList.add('is-live');
  render();
}
