// Gradient descent on y = slope * x + intercept, minimizing mean squared error.
// Points are draggable; coordinates run 0–1 in both axes.

import { type Point, PLOT_HEIGHT, PLOT_WIDTH, meanSquaredError, svgElement } from './plot';

const RUN_STEP_MS = 60;

function computeGradients(points: Point[], slope: number, intercept: number): [number, number] {
  let slopeGradient = 0;
  let interceptGradient = 0;
  for (const p of points) {
    const error = slope * p.x + intercept - p.y;
    slopeGradient += (2 * error * p.x) / points.length;
    interceptGradient += (2 * error) / points.length;
  }
  return [slopeGradient, interceptGradient];
}

export function initDescent(root: HTMLElement): void {
  const plot = root.querySelector<SVGSVGElement>('#mli-gd-plot');
  const stepButton = root.querySelector<HTMLButtonElement>('#mli-gd-step');
  const runButton = root.querySelector<HTMLButtonElement>('#mli-gd-run');
  const resetButton = root.querySelector<HTMLButtonElement>('#mli-gd-reset');
  const output = root.querySelector<HTMLElement>('#mli-gd-out');
  const caption = root.querySelector<HTMLElement>('#mli-gd-cap');
  const rateButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-rate]')];
  if (!plot || !stepButton || !runButton || !resetButton || !output || !caption || !rateButtons.length) return;

  const points: Point[] = (root.dataset.points ?? '').split(' ').map((pair) => {
    const [x, y] = pair.split(',').map(Number);
    return { x, y };
  });
  const shouldAnimate = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
  const startIntercept = Number(root.dataset.intercept);
  const runSteps = Number(runButton.dataset.runSteps);
  if (Number.isNaN(startIntercept) || !runSteps) return;
  let slope = 0;
  let intercept = startIntercept;
  let rate = Number(rateButtons.find((button) => button.classList.contains('is-on'))?.dataset.rate ?? 0.6);
  let stepCount = 0;
  const measureLoss = (): number => meanSquaredError(points, (x) => slope * x + intercept);
  let lastLoss = measureLoss();

  const toScreen = (p: Point): Point => ({ x: p.x * PLOT_WIDTH, y: PLOT_HEIGHT - p.y * PLOT_HEIGHT });

  const render = (): void => {
    const start = toScreen({ x: 0, y: intercept });
    const end = toScreen({ x: 1, y: slope + intercept });
    const line = svgElement('line', { x1: start.x, y1: start.y, x2: end.x, y2: end.y, class: 'mli-gd-line' });
    const errors = points.map((p) => {
      const at = toScreen(p);
      const onLine = toScreen({ x: p.x, y: slope * p.x + intercept });
      return svgElement('line', { x1: at.x, y1: at.y, x2: onLine.x, y2: onLine.y, class: 'mli-gd-err' });
    });
    const dots = points.map((p, i) => {
      const at = toScreen(p);
      return svgElement('circle', { cx: at.x, cy: at.y, r: 7, class: 'mli-gd-dot', 'data-index': i });
    });
    plot.replaceChildren(...errors, line, ...dots);
    const loss = measureLoss();
    output.replaceChildren(`${loss < 10 ? loss.toFixed(4) : loss.toExponential(1)} `, Object.assign(document.createElement('small'), { textContent: `loss after ${stepCount} ${stepCount === 1 ? 'step' : 'steps'}` }));
  };

  const describe = (loss: number): string => {
    if (!Number.isFinite(loss) || loss > 1) return 'Each step overshoots the bottom and lands higher up the other side. The error is exploding.';
    if (loss > lastLoss) return 'The error went up. The steps are too big: they jump past the bottom of the valley.';
    if (lastLoss - loss < 1e-5) return 'Barely moving. Either it has found the bottom, or the steps are too small to get there.';
    return 'The error went down. Each step follows the slope of the error downhill.';
  };

  const step = (): void => {
    const [slopeGradient, interceptGradient] = computeGradients(points, slope, intercept);
    slope -= rate * slopeGradient;
    intercept -= rate * interceptGradient;
    stepCount++;
    const loss = measureLoss();
    caption.textContent = describe(loss);
    lastLoss = loss;
    render();
  };

  const run = async (): Promise<void> => {
    runButton.disabled = true;
    for (let i = 0; i < runSteps && root.isConnected; i++) {
      step();
      if (shouldAnimate) await new Promise((resolve) => { setTimeout(resolve, RUN_STEP_MS); });
    }
    runButton.disabled = false;
  };

  let dragging: number | null = null;
  plot.addEventListener('pointerdown', (event) => {
    const target = event.target as Element;
    if (!target.classList.contains('mli-gd-dot')) return;
    dragging = Number(target.getAttribute('data-index'));
    plot.setPointerCapture(event.pointerId);
  });
  plot.addEventListener('pointermove', (event) => {
    if (dragging === null) return;
    const box = plot.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    const y = Math.min(1, Math.max(0, 1 - (event.clientY - box.top) / box.height));
    points[dragging] = { x, y };
    lastLoss = measureLoss();
    render();
  });
  plot.addEventListener('pointerup', () => { dragging = null; });

  const selectRate = (selected: HTMLButtonElement): void => {
    rate = Number(selected.dataset.rate);
    for (const other of rateButtons) {
      other.classList.toggle('is-on', other === selected);
      other.setAttribute('aria-pressed', String(other === selected));
    }
  };
  for (const button of rateButtons) button.addEventListener('click', () => selectRate(button));
  stepButton.addEventListener('click', step);
  runButton.addEventListener('click', () => { void run(); });
  resetButton.addEventListener('click', () => {
    slope = 0;
    intercept = startIntercept;
    stepCount = 0;
    lastLoss = measureLoss();
    caption.textContent = 'Line reset. Try a different learning rate.';
    render();
  });
  render();
}
