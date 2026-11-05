// {{< ml/dct-block >}}: an 8 x 8 block as 64 pixels and as 64 DCT weights,
// rebuilt from only the biggest few. The transform is JPEG's: the orthonormal
// 2-D DCT-II on pixel values shifted down by 128 (ITU-T T.81, A.3.3). Blocks
// come from data/ml/dct-block.yaml via the shortcode.

interface Patch {
  name: string;
  rows: number[][];
}

const SIZE = 8;
const LEVEL_SHIFT = 128;

// cosine[k][n]: pattern k at position n, scaled so the transform keeps lengths
// (orthonormal), which lets the inverse be the transpose.
const cosine: number[][] = Array.from({ length: SIZE }, (_, k) =>
  Array.from({ length: SIZE }, (_, n) => (k === 0 ? Math.sqrt(1 / SIZE) : Math.sqrt(2 / SIZE)) * Math.cos(((2 * n + 1) * k * Math.PI) / (2 * SIZE))),
);

function forward(rows: number[][]): number[][] {
  return cosine.map((rowPattern) =>
    cosine.map((columnPattern) => {
      let sum = 0;
      for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) sum += rowPattern[y] * columnPattern[x] * (rows[y][x] - LEVEL_SHIFT);
      return sum;
    }),
  );
}

function inverse(weights: number[][]): number[][] {
  return Array.from({ length: SIZE }, (_, y) =>
    Array.from({ length: SIZE }, (_, x) => {
      let sum = 0;
      for (let v = 0; v < SIZE; v++) for (let u = 0; u < SIZE; u++) sum += cosine[v][y] * cosine[u][x] * weights[v][u];
      return sum + LEVEL_SHIFT;
    }),
  );
}

const grey = (value: number): string => {
  const level = Math.round(Math.max(0, Math.min(255, value)));
  return `rgb(${level} ${level} ${level})`;
};

function fillGrid(grid: HTMLElement, values: number[][], paint: (value: number, v: number, u: number) => string): HTMLElement[] {
  const cells: HTMLElement[] = [];
  grid.replaceChildren();
  values.forEach((row, v) =>
    row.forEach((value, u) => {
      const cell = document.createElement('span');
      cell.style.background = paint(value, v, u);
      cell.dataset.v = String(v);
      cell.dataset.u = String(u);
      grid.append(cell);
      cells.push(cell);
    }),
  );
  return cells;
}

export function initDctBlock(root: HTMLElement): void {
  const patches = JSON.parse(root.dataset.patches ?? '[]') as Patch[];
  const pixelsGrid = root.querySelector<HTMLElement>('#mli-dct-pixels');
  const weightsGrid = root.querySelector<HTMLElement>('#mli-dct-weights');
  const rebuiltGrid = root.querySelector<HTMLElement>('#mli-dct-rebuilt');
  const patternGrid = root.querySelector<HTMLElement>('#mli-dct-pattern');
  const patternCaption = root.querySelector<HTMLElement>('#mli-dct-pattern-cap');
  const slider = root.querySelector<HTMLInputElement>('#mli-dct-keep');
  const sliderValue = root.querySelector<HTMLElement>('#mli-dct-keep-v');
  const stat = root.querySelector<HTMLElement>('#mli-dct-stat');
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-patch]'));
  if (!patches.length || !pixelsGrid || !weightsGrid || !rebuiltGrid || !slider || !stat) return;

  for (const id of ['#mli-dct-weights-panel', '#mli-dct-rebuilt-panel', '#mli-dct-pattern-panel', '#mli-dct-controls']) {
    const element = root.querySelector<HTMLElement>(id);
    if (element) element.hidden = false;
  }

  // Diverging colours set per theme in css/pages/ml/demos.css (.mli-dct).
  const style = getComputedStyle(root);
  const colour = (name: string): string => style.getPropertyValue(name).trim();

  let patchIndex = 0;

  function showPattern(v: number, u: number): void {
    if (!patternGrid) return;
    const pattern = Array.from({ length: SIZE }, (_, y) => Array.from({ length: SIZE }, (_, x) => cosine[v][y] * cosine[u][x]));
    const peak = 2 / SIZE;
    fillGrid(patternGrid, pattern, (value) => grey(128 + (value / peak) * 127));
    if (patternCaption) patternCaption.textContent = v === 0 && u === 0 ? 'The pattern a weight scales: this one is flat, the block’s average' : `The pattern weight (${v + 1}, ${u + 1}) scales`;
  }

  function render(): void {
    const { rows } = patches[patchIndex];
    const keep = Number(slider!.value);
    if (sliderValue) sliderValue.textContent = String(keep);
    const weights = forward(rows);
    const ranked = weights.flat().map((weight, index) => ({ weight, index })).sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
    const kept = new Set(ranked.slice(0, keep).map((entry) => entry.index));
    const largest = Math.abs(ranked[0].weight) || 1;

    fillGrid(pixelsGrid!, rows, grey);
    const weightCells = fillGrid(weightsGrid!, weights, (weight, v, u) => {
      if (!kept.has(v * SIZE + u)) return 'transparent';
      const strength = Math.round(Math.sqrt(Math.abs(weight) / largest) * 100);
      const pole = weight < 0 ? colour('--mli-et-neg') : colour('--mli-et-pos');
      return `color-mix(in srgb, rgb(${pole}) ${strength}%, rgb(${colour('--mli-et-mid')}))`;
    });
    weightCells.forEach((cell, index) => {
      cell.classList.toggle('is-dropped', !kept.has(index));
      const label = `weight (${Math.floor(index / SIZE) + 1}, ${(index % SIZE) + 1}): ${weights[Math.floor(index / SIZE)][index % SIZE].toFixed(1).replace('-', '−')}${kept.has(index) ? '' : ', dropped'}`;
      cell.tabIndex = 0;
      cell.title = label;
      cell.setAttribute('aria-label', label);
    });

    const keptWeights = weights.map((row, v) => row.map((weight, u) => (kept.has(v * SIZE + u) ? weight : 0)));
    const rebuilt = inverse(keptWeights);
    fillGrid(rebuiltGrid!, rebuilt, grey);

    let errorSum = 0;
    rebuilt.forEach((row, y) => row.forEach((value, x) => { errorSum += Math.abs(Math.max(0, Math.min(255, value)) - rows[y][x]); }));
    const averageError = errorSum / (SIZE * SIZE);
    const plural = keep === 1 ? 'weight' : 'weights';
    stat!.innerHTML = `Keeping <b>${keep}</b> of 64 ${plural}: the rebuilt block is off by <b>${averageError.toFixed(1)}</b> grey levels per pixel on average (out of 255).`;
  }

  weightsGrid.addEventListener('pointerover', (event) => {
    const cell = (event.target as Element).closest<HTMLElement>('span[data-v]');
    if (cell) showPattern(Number(cell.dataset.v), Number(cell.dataset.u));
  });
  weightsGrid.addEventListener('focusin', (event) => {
    const cell = (event.target as Element).closest<HTMLElement>('span[data-v]');
    if (cell) showPattern(Number(cell.dataset.v), Number(cell.dataset.u));
  });

  for (const button of buttons) {
    button.disabled = false;
    button.addEventListener('click', () => {
      patchIndex = Number(button.dataset.patch);
      for (const other of buttons) {
        other.classList.toggle('is-on', other === button);
        other.setAttribute('aria-pressed', String(other === button));
      }
      render();
    });
  }
  slider.addEventListener('input', render);

  showPattern(0, 0);
  render();
}
