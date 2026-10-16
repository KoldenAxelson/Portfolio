/* The Particle Life matrix as a clickable grid. Click a cell to raise it,
 * right- or shift-click to lower it, scroll over it to fine-tune. Rows are
 * the species feeling the force, columns the species causing it. */

import type { ControlsHandle } from '../behavior';
import { button, element } from './dom';
import { SPECIES_COLORS } from '../palette';
import type { AttractionMatrix, MatrixSeed } from '../behaviors/particle-life';

const CLICK_STEP = 0.25;
const WHEEL_STEP = 0.05;
const SEEDS: readonly { seed: MatrixSeed; label: string }[] = [
  { seed: 'random', label: 'Random' },
  { seed: 'symmetric', label: 'Symmetric' },
  { seed: 'chain', label: 'Chain' },
  { seed: 'zero', label: 'Zero' },
];

export function mountMatrixEditor(host: HTMLElement, matrix: AttractionMatrix, changed: () => void): ControlsHandle {
  const wrapper = element('div', 'em-matrix');
  const grid = element('div', 'em-matrix-grid');
  const seeds = element('div', 'em-matrix-seeds');
  wrapper.append(grid, seeds);
  host.append(wrapper);

  let cells: HTMLButtonElement[] = [];
  let builtFor = 0;

  const nudge = (row: number, col: number, delta: number): void => {
    let next = matrix.get(row, col) + delta;
    if (next > 1 + 1e-6) next = -1;
    if (next < -1 - 1e-6) next = 1;
    matrix.set(row, col, Math.round(next * 100) / 100);
    paint();
    changed();
  };

  const build = (): void => {
    const species = matrix.species;
    grid.replaceChildren(element('span', 'em-matrix-corner'));
    grid.style.gridTemplateColumns = `repeat(${species + 1}, minmax(0, var(--em-cell-size)))`;
    for (let col = 0; col < species; col++) grid.append(swatch(col));
    cells = [];
    for (let row = 0; row < species; row++) {
      grid.append(swatch(row));
      for (let col = 0; col < species; col++) {
        const cell = matrixCell(row, col, nudge);
        cells.push(cell);
        grid.append(cell);
      }
    }
    builtFor = species;
  };

  const paint = (): void => {
    if (builtFor !== matrix.species) build();
    for (const cell of cells) {
      const value = matrix.get(Number(cell.dataset.row), Number(cell.dataset.col));
      cell.textContent = value.toFixed(1).replace('-0.0', '0.0');
      cell.style.setProperty('--em-cell', cellColor(value));
      cell.title = `${value.toFixed(2)}`;
    }
  };

  for (const { seed, label } of SEEDS) {
    seeds.append(button('em-chip', label, () => {
      matrix.seed(seed);
      paint();
      changed();
    }));
  }

  paint();
  return { sync: paint };
}

function matrixCell(row: number, col: number, nudge: (row: number, col: number, delta: number) => void): HTMLButtonElement {
  const cell = button('em-matrix-cell', '', (event) => nudge(row, col, event.shiftKey ? -CLICK_STEP : CLICK_STEP));
  cell.dataset.row = String(row);
  cell.dataset.col = String(col);
  cell.setAttribute('aria-label', `Species ${row + 1} toward species ${col + 1}`);
  cell.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    nudge(row, col, -CLICK_STEP);
  });
  cell.addEventListener('wheel', (event) => {
    event.preventDefault();
    nudge(row, col, event.deltaY < 0 ? WHEEL_STEP : -WHEEL_STEP);
  }, { passive: false });
  return cell;
}

function swatch(species: number): HTMLElement {
  const dot = element('span', 'em-matrix-swatch');
  dot.style.background = SPECIES_COLORS[species];
  return dot;
}

/** Attraction green, repulsion red, strength as opacity. */
function cellColor(value: number): string {
  const alpha = Math.abs(value) * 0.85;
  return value >= 0 ? `rgba(59, 206, 120, ${alpha})` : `rgba(255, 80, 80, ${alpha})`;
}

