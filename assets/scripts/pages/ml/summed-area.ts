// {{< ml/summed-area >}}: an 8 × 8 grid of made-up numbers and its
// summed-area table. Pick a rectangle (preset or drag); the four corner
// lookups give its total, checked against adding the cells directly. The
// stepper shows how many times each grid cell is counted after each lookup.
// layouts/shortcodes/ml/summed-area.html builds the same table and the first
// rectangle's answer for JS off; keep the two in step. Data comes from
// data/ml/summed-area.yaml.

type Box = [number, number, number, number]; // top, left, bottom, right (inclusive)

interface Rect {
  name: string;
  box: Box;
}

export function buildTable(rows: number[][]): number[][] {
  const table: number[][] = [];
  rows.forEach((row, r) => {
    let run = 0;
    table.push(row.map((v, c) => {
      run += v;
      return run + (r > 0 ? table[r - 1][c] : 0);
    }));
  });
  return table;
}

const LETTERS = ['D', 'B', 'C', 'A'] as const;
const SIGNS = [1, -1, -1, 1];

export function initSummedArea(root: HTMLElement): void {
  const rows = JSON.parse(root.dataset.rows ?? '[]') as number[][];
  const rects = JSON.parse(root.dataset.rects ?? '[]') as Rect[];
  const gridBox = root.querySelector<HTMLElement>('#mli-sa-grid');
  const tableBox = root.querySelector<HTMLElement>('#mli-sa-table');
  const sumText = root.querySelector<HTMLElement>('#mli-sa-sum');
  const stepText = root.querySelector<HTMLElement>('#mli-sa-step');
  const countText = root.querySelector<HTMLElement>('#mli-sa-count');
  const back = root.querySelector<HTMLButtonElement>('#mli-sa-back');
  const forward = root.querySelector<HTMLButtonElement>('#mli-sa-forward');
  if (!rows.length || !gridBox || !tableBox || !sumText || !stepText || !countText || !back || !forward) return;
  const el = { gridBox, tableBox, sumText, stepText, countText, back, forward };
  const legend = root.querySelector<HTMLElement>('#mli-sa-legend');

  const table = buildTable(rows);
  const gridCells = Array.from(gridBox.querySelectorAll<HTMLElement>('.mli-sa-cell'));
  const tableCells = Array.from(tableBox.querySelectorAll<HTMLElement>('.mli-sa-cell'));
  const state = { box: rects[0]?.box ?? ([0, 0, 0, 0] as Box), step: 0 };

  // The four corner lookups as [row, col], or null when it falls off the grid.
  function corners([r0, c0, r1, c1]: Box): ([number, number] | null)[] {
    return [
      [r1, c1],
      r0 > 0 ? [r0 - 1, c1] : null,
      c0 > 0 ? [r1, c0 - 1] : null,
      r0 > 0 && c0 > 0 ? [r0 - 1, c0 - 1] : null,
    ];
  }
  const valueAt = (corner: [number, number] | null): number => (corner ? table[corner[0]][corner[1]] : 0);

  function render(): void {
    const [r0, c0, r1, c1] = state.box;
    const cs = corners(state.box);
    const values = cs.map(valueAt);
    const total = values.reduce((sum, v, i) => sum + SIGNS[i] * v, 0);
    let direct = 0;
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) direct += rows[r][c];
    const cellsIn = (r1 - r0 + 1) * (c1 - c0 + 1);

    gridCells.forEach((cell) => {
      const r = Number(cell.dataset.r);
      const c = Number(cell.dataset.c);
      const inside = r >= r0 && r <= r1 && c >= c0 && c <= c1;
      // How many times this cell is counted after the first `step` lookups.
      let count = 0;
      cs.slice(0, state.step).forEach((corner, i) => {
        if (corner && r <= corner[0] && c <= corner[1]) count += SIGNS[i];
      });
      cell.classList.toggle('is-in', inside && state.step === 0);
      cell.classList.toggle('is-plus', state.step > 0 && count === 1);
      cell.classList.toggle('is-minus', state.step > 0 && count < 0);
      cell.classList.toggle('is-edge', state.step > 0 && inside);
    });
    tableCells.forEach((cell) => {
      const r = Number(cell.dataset.r);
      const c = Number(cell.dataset.c);
      cell.querySelector('.mli-sa-tag')?.remove();
      cell.className = 'mli-sa-cell';
      cs.forEach((corner, i) => {
        if (corner && corner[0] === r && corner[1] === c) {
          cell.classList.add('is-corner', `is-${LETTERS[i].toLowerCase()}`);
          if (state.step > 0 && i === state.step - 1) cell.classList.add('is-now');
          const tag = document.createElement('b');
          tag.className = 'mli-sa-tag';
          tag.textContent = LETTERS[i];
          cell.append(tag);
        }
      });
    });

    el.sumText.innerHTML = '';
    el.sumText.append(`D − B − C + A = ${values[0]} − ${values[1]} − ${values[2]} + ${values[3]} = `);
    const strong = document.createElement('strong');
    strong.textContent = String(total);
    el.sumText.append(strong, `. Adding the ${cellsIn} cell${cellsIn === 1 ? '' : 's'} directly gives ${direct} too, with ${cellsIn - 1} addition${cellsIn - 1 === 1 ? '' : 's'}; the table always needs 3 additions or subtractions, whatever the size.`);

    const running = values.slice(0, state.step).reduce((sum, v, i) => sum + SIGNS[i] * v, 0);
    const lines = [
      'The rectangle is shaded. Step through the four lookups to see how many times each cell gets counted.',
      `D = ${values[0]}: everything above and to the left of the rectangle's bottom-right corner, each cell counted once.`,
      cs[1] ? `− B = ${values[1]}: take away everything above the rectangle. Running total: ${running}.` : 'B would be above the top row, so it counts as 0 and nothing changes.',
      cs[2]
        ? cs[1]
          ? `− C = ${values[2]}: take away everything to its left. The top-left block was in both, so it's now counted −1. Running total: ${running}.`
          : `− C = ${values[2]}: take away everything to its left. Nothing was taken away above it, so no cell drops to −1. Running total: ${running}.`
        : 'C would be left of the first column, so it counts as 0 and nothing changes.',
      cs[3] ? `+ A = ${values[3]}: add the top-left block back once. Only the rectangle is left, counted once. Total: ${running}.` : `A falls off the grid, so it counts as 0. Only the rectangle is left, counted once. Total: ${running}.`,
    ];
    el.stepText.textContent = lines[state.step];
    el.countText.textContent = state.step === 0 ? '' : `Step ${state.step} of 4`;
    if (legend) legend.hidden = state.step === 0;
    el.back.disabled = state.step === 0;
    el.forward.disabled = state.step === 4;
  }

  function choose(box: Box): void {
    state.box = box;
    state.step = 0;
    render();
  }

  const presetButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-rect]'));
  const markPreset = (index: number): void => {
    presetButtons.forEach((b, i) => {
      b.classList.toggle('is-on', i === index);
      b.setAttribute('aria-pressed', String(i === index));
    });
  };
  presetButtons.forEach((button, i) => {
    button.disabled = false;
    button.addEventListener('click', () => {
      markPreset(i);
      choose(rects[i].box);
    });
  });

  // Drag to pick a rectangle on the number grid.
  let anchor: [number, number] | null = null;
  const cellFrom = (x: number, y: number): [number, number] | null => {
    const hit = document.elementFromPoint(x, y)?.closest<HTMLElement>('#mli-sa-grid .mli-sa-cell');
    return hit ? [Number(hit.dataset.r), Number(hit.dataset.c)] : null;
  };
  const boxFrom = (a: [number, number], b: [number, number]): Box => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])];
  el.gridBox.addEventListener('pointerdown', (event) => {
    const at = cellFrom(event.clientX, event.clientY);
    if (!at) return;
    anchor = at;
    el.gridBox.setPointerCapture(event.pointerId);
    markPreset(-1);
    choose(boxFrom(at, at));
  });
  el.gridBox.addEventListener('pointermove', (event) => {
    if (!anchor) return;
    const at = cellFrom(event.clientX, event.clientY);
    if (at) {
      const next = boxFrom(anchor, at);
      if (next.join() !== state.box.join()) choose(next);
    }
  });
  const end = (): void => {
    anchor = null;
  };
  el.gridBox.addEventListener('pointerup', end);
  el.gridBox.addEventListener('pointercancel', end);
  el.gridBox.classList.add('is-live');

  el.forward.addEventListener('click', () => {
    state.step = Math.min(4, state.step + 1);
    render();
  });
  el.back.addEventListener('click', () => {
    state.step = Math.max(0, state.step - 1);
    render();
  });
  el.forward.disabled = false;
  for (const id of ['mli-sa-controls', 'mli-sa-actions']) {
    const node = root.querySelector<HTMLElement>(`#${id}`);
    if (node) node.hidden = false;
  }
  render();
}
