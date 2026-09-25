// Overfitting toy: least-squares polynomial fits of rising degree to a few
// noisy training points, scored on held-out test points from the same curve.

import { type Point, PLOT_HEIGHT, PLOT_WIDTH, meanSquaredError, svgElement } from './plot';

const Y_RANGE = 1.8;
// A whisper of ridge keeps high-degree fits numerically solvable.
const RIDGE = 1e-9;
// Degrees whose test error ties the best one at display precision get the same
// verdict, so the caption never contradicts the numbers on screen.
const NEAR_BEST_RATIO = 1.05;

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function trueCurve(x: number): number {
  return Math.sin(2.2 * x) * 0.6;
}

function makePoints(count: number, noise: number, random: () => number, isEvenlySpaced: boolean): Point[] {
  return Array.from({ length: count }, (_, i) => {
    const x = isEvenlySpaced ? -1 + (2 * (i + 0.5)) / count : random() * 2 - 1;
    return { x, y: trueCurve(x) + (random() - 0.5) * 2 * noise };
  });
}

// The normal equations (AᵀA + ridge·I) c = Aᵀy as an augmented matrix.
function buildNormalEquations(points: Point[], size: number): number[][] {
  const powers = points.map((p) => Array.from({ length: size }, (_, k) => p.x ** k));
  return Array.from({ length: size }, (_, row) => {
    const lhs = Array.from({ length: size }, (_, col) => powers.reduce((sum, pointPowers) => sum + pointPowers[row] * pointPowers[col], 0) + (row === col ? RIDGE : 0));
    const rhs = powers.reduce((sum, pointPowers, i) => sum + pointPowers[row] * points[i].y, 0);
    return [...lhs, rhs];
  });
}

function swapInLargestPivot(matrix: number[][], pivot: number): void {
  let best = pivot;
  for (let row = pivot + 1; row < matrix.length; row++) if (Math.abs(matrix[row][pivot]) > Math.abs(matrix[best][pivot])) best = row;
  [matrix[pivot], matrix[best]] = [matrix[best], matrix[pivot]];
}

function eliminateColumn(matrix: number[][], pivot: number): void {
  for (let row = 0; row < matrix.length; row++) {
    if (row === pivot) continue;
    const factor = matrix[row][pivot] / matrix[pivot][pivot];
    for (let col = pivot; col < matrix[row].length; col++) matrix[row][col] -= factor * matrix[pivot][col];
  }
}

function fitPolynomial(points: Point[], degree: number): number[] {
  const size = degree + 1;
  const matrix = buildNormalEquations(points, size);
  for (let pivot = 0; pivot < size; pivot++) {
    swapInLargestPivot(matrix, pivot);
    eliminateColumn(matrix, pivot);
  }
  return matrix.map((row, i) => row[size] / row[i]);
}

function evaluate(coefficients: number[], x: number): number {
  return coefficients.reduce((sum, c, k) => sum + c * x ** k, 0);
}

function measureFitError(points: Point[], coefficients: number[]): number {
  return meanSquaredError(points, (x) => evaluate(coefficients, x));
}

function toScreen(p: Point): Point {
  return { x: ((p.x + 1) / 2) * PLOT_WIDTH, y: PLOT_HEIGHT / 2 - (p.y / Y_RANGE) * PLOT_HEIGHT };
}

export function initOverfit(root: HTMLElement): void {
  const plot = root.querySelector<SVGSVGElement>('#mli-of-plot');
  const slider = root.querySelector<HTMLInputElement>('#mli-of-r');
  const label = root.querySelector<HTMLElement>('#mli-of-v');
  const trainOut = root.querySelector<HTMLElement>('#mli-of-train');
  const testOut = root.querySelector<HTMLElement>('#mli-of-test');
  const caption = root.querySelector<HTMLElement>('#mli-of-cap');
  if (!plot || !slider || !label || !trainOut || !testOut || !caption) return;

  const random = seededRandom(Number(root.dataset.seed));
  const noise = Number(root.dataset.noise);
  const train = makePoints(Number(root.dataset.train), noise, random, true);
  const test = makePoints(Number(root.dataset.test), noise, random, false);
  let bestTestError = Infinity;
  let bestDegree = 1;
  for (let degree = 1; degree <= Number(slider.max); degree++) {
    const error = measureFitError(test, fitPolynomial(train, degree));
    if (error < bestTestError) { bestTestError = error; bestDegree = degree; }
  }

  const render = (): void => {
    const degree = Number(slider.value);
    const coefficients = fitPolynomial(train, degree);
    const path = Array.from({ length: 121 }, (_, i) => {
      const x = -1 + i / 60;
      const at = toScreen({ x, y: Math.max(-Y_RANGE, Math.min(Y_RANGE, evaluate(coefficients, x))) });
      return `${i ? 'L' : 'M'}${at.x.toFixed(1)},${at.y.toFixed(1)}`;
    }).join('');
    const curve = svgElement('path', { d: path, class: 'mli-gd-line' });
    const dots = [...train.map((p) => ({ p, kind: 'train' })), ...test.map((p) => ({ p, kind: 'test' }))].map(({ p, kind }) => {
      const at = toScreen(p);
      return svgElement('circle', { cx: at.x.toFixed(1), cy: at.y.toFixed(1), r: kind === 'train' ? 5 : 3.5, class: `mli-of-dot is-${kind}` });
    });
    plot.replaceChildren(...dots, curve);

    const trainError = measureFitError(train, coefficients);
    const testError = measureFitError(test, coefficients);
    const isNearBest = testError <= bestTestError * NEAR_BEST_RATIO;
    label.textContent = String(degree);
    slider.setAttribute('aria-valuetext', String(degree));
    trainOut.textContent = trainError.toFixed(3);
    testOut.textContent = testError < 10 ? testError.toFixed(3) : testError.toExponential(1);
    if (isNearBest) caption.textContent = 'The sweet spot: lowest error on points the model never saw.';
    else if (degree < bestDegree) caption.textContent = 'Too stiff: the curve misses the pattern, on both sets of points. That’s underfitting.';
    else caption.textContent = 'Training error keeps falling, but test error is worse than at the sweet spot. The curve is bending to fit the noise: overfitting.';
  };

  slider.addEventListener('input', render);
  render();
}
