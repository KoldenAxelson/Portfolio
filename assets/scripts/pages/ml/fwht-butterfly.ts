// {{< ml/fwht-butterfly >}}: the 8-number fast Walsh–Hadamard transform as a
// butterfly diagram. Steps reveal one stage at a time; picking a number shows
// the pair it came from, every input it depends on, the later numbers that
// reuse it, and for an output, the direct sum it has to equal (worked out
// separately, so the check is a real one). Inputs come from
// data/ml/fwht-butterfly.yaml via the shortcode, plus a random set.

interface Preset {
  name: string;
  values: number[];
}

const SIZE = 8;
// The template works out the same stages for no-JS (layouts/shortcodes/ml/fwht-butterfly.html); keep its spans in step.
const SPANS = [1, 2, 4];
const DIRECT_OPS = SIZE * (SIZE - 1);
const LAST = SPANS.length;

const fmt = (value: number): string => (value < 0 ? `−${-value}` : String(value));
const isTop = (row: number, span: number): boolean => Math.floor(row / span) % 2 === 0;

// columns[0] is the input; columns[c] is after stage c.
export function stages(input: number[]): number[][] {
  const columns = [input.slice()];
  for (const span of SPANS) {
    const prev = columns[columns.length - 1];
    columns.push(prev.map((_, j) => (isTop(j, span) ? prev[j] + prev[j + span] : prev[j - span] - prev[j])));
  }
  return columns;
}

// The pair a node at column c (c ≥ 1) was made from: [upper, lower].
function parents(col: number, row: number): [number, number] {
  const span = SPANS[col - 1];
  const upper = isTop(row, span) ? row : row - span;
  return [upper, upper + span];
}

// Output k is the sum of input j times (−1) to the number of shared 1 bits.
const directSign = (k: number, j: number): number => (popcount(k & j) % 2 === 0 ? 1 : -1);
function popcount(n: number): number {
  let count = 0;
  for (let v = n; v; v >>= 1) count += v & 1;
  return count;
}

const randomInput = (): number[] => Array.from({ length: SIZE }, () => Math.floor(Math.random() * 19) - 9);

export function initFwhtButterfly(root: HTMLElement): void {
  const svg = root.querySelector<SVGSVGElement>('#mli-fw-svg');
  const stageText = root.querySelector<HTMLElement>('#mli-fw-stage');
  const detailText = root.querySelector<HTMLElement>('#mli-fw-detail');
  const countText = root.querySelector<HTMLElement>('#mli-fw-count');
  const forwardButton = root.querySelector<HTMLButtonElement>('#mli-fw-forward');
  const backButton = root.querySelector<HTMLButtonElement>('#mli-fw-back');
  const controls = root.querySelector<HTMLElement>('#mli-fw-controls');
  const actions = root.querySelector<HTMLElement>('#mli-fw-actions');
  if (!svg || !stageText || !detailText || !countText || !forwardButton || !backButton) return;
  const stageEl: HTMLElement = stageText;
  const detailEl: HTMLElement = detailText;
  const countEl: HTMLElement = countText;
  const forwardEl: HTMLButtonElement = forwardButton;
  const backEl: HTMLButtonElement = backButton;

  const presets = JSON.parse(root.dataset.presets ?? '[]') as Preset[];
  const presetButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-preset]'));
  const nodes = Array.from(svg.querySelectorAll<SVGGElement>('.mli-fw-node'));
  const lines = Array.from(svg.querySelectorAll<SVGLineElement>('.mli-fw-line'));

  const state = { columns: stages(presets[0]?.values ?? new Array(SIZE).fill(0)), stage: 0, picked: null as null | { col: number; row: number } };

  // Everything a node depends on, column by column back to the input.
  function ancestors(col: number, row: number): Set<string> {
    const found = new Set<string>([`${col}:${row}`]);
    let rows = new Set([row]);
    for (let c = col; c >= 1; c--) {
      const next = new Set<number>();
      for (const r of rows) for (const p of parents(c, r)) next.add(p);
      for (const r of next) found.add(`${c - 1}:${r}`);
      rows = next;
    }
    return found;
  }

  // Everything that reuses a node, forward to the outputs (up to the shown stage).
  function descendants(col: number, row: number): Set<string> {
    const found = new Set<string>();
    let rows = new Set([row]);
    for (let c = col + 1; c <= state.stage; c++) {
      const span = SPANS[c - 1];
      const next = new Set<number>();
      for (const r of rows) {
        next.add(r);
        next.add(isTop(r, span) ? r + span : r - span);
      }
      for (const r of next) found.add(`${c}:${r}`);
      rows = next;
    }
    return found;
  }

  function describe(col: number, row: number): string {
    const value = state.columns[col][row];
    if (col === 0) {
      const used = descendants(0, row);
      const outputs = [...used].filter((key) => key.startsWith(`${state.stage}:`)).length;
      return state.stage === 0 ? `Input ${row + 1} is ${fmt(value)}. Step forward to see where it goes.` : `Input ${row + 1} (${fmt(value)}) feeds ${outputs} of the 8 numbers in stage ${state.stage}.`;
    }
    const [upper, lower] = parents(col, row);
    const a = state.columns[col - 1][upper];
    const b = state.columns[col - 1][lower];
    const op = row === upper ? `${fmt(a)} + ${b < 0 ? `(${fmt(b)})` : fmt(b)}` : `${fmt(a)} − ${b < 0 ? `(${fmt(b)})` : fmt(b)}`;
    let text = `${op} = ${fmt(value)}, from rows ${upper + 1} and ${lower + 1} of the column before.`;
    if (col < state.stage) {
      const outputs = [...descendants(col, row)].filter((key) => key.startsWith(`${state.stage}:`)).length;
      text += ` Worked out once, it's reused by ${outputs} of the ${SIZE} numbers in stage ${state.stage}.`;
    }
    if (col === LAST) {
      const input = state.columns[0];
      const terms = input.map((x, j) => ({ sign: directSign(row, j), x }));
      const total = terms.reduce((sum, t) => sum + t.sign * t.x, 0);
      const written = terms
        .map((t, j) => {
          const shown = t.x < 0 ? `(${fmt(t.x)})` : fmt(t.x);
          return j === 0 ? (t.sign > 0 ? shown : `−${shown}`) : `${t.sign > 0 ? '+' : '−'} ${shown}`;
        })
        .join(' ');
      const ok = total === value;
      text += ` Directly: ${written} = ${fmt(total)}. ${ok ? 'Same answer.' : 'They differ!'}`;
    }
    return text;
  }

  function render(): void {
    const { columns, stage, picked } = state;
    const lit = picked ? ancestors(picked.col, picked.row) : null;
    const reused = picked ? descendants(picked.col, picked.row) : null;
    nodes.forEach((node, i) => {
      const col = Math.floor(i / SIZE);
      const row = i % SIZE;
      const shown = col <= stage;
      const key = `${col}:${row}`;
      node.classList.toggle('is-hidden', !shown);
      node.classList.toggle('is-lit', !!lit?.has(key));
      node.classList.toggle('is-reuse', !!reused?.has(key));
      node.classList.toggle('is-picked', !!picked && picked.col === col && picked.row === row);
      node.classList.toggle('is-dim', !!picked && shown && !lit?.has(key) && !reused?.has(key));
      const text = node.querySelector('text');
      if (text) text.textContent = shown ? fmt(columns[col][row]) : '';
      node.setAttribute('tabindex', shown ? '0' : '-1');
      node.setAttribute('aria-hidden', String(!shown));
      node.setAttribute('aria-label', shown ? `${col === 0 ? 'Input' : `Stage ${col}`}, row ${row + 1}: ${fmt(columns[col][row])}` : '');
    });
    lines.forEach((line) => {
      const col = Number(line.dataset.col);
      const from = `${col - 1}:${line.dataset.from}`;
      const to = `${col}:${line.dataset.to}`;
      line.classList.toggle('is-hidden', col > stage);
      const onPath = !!lit && lit.has(from) && lit.has(to);
      const onReuse = !!reused && (reused.has(to) && (reused.has(from) || (picked && from === `${picked.col}:${picked.row}`)));
      line.classList.toggle('is-lit', onPath);
      line.classList.toggle('is-reuse', !!onReuse);
      line.classList.toggle('is-dim', !!picked && !onPath && !onReuse);
    });
    const ops = stage * SIZE;
    stageEl.textContent =
      stage === 0
        ? 'The input: 8 numbers. Step forward to run the first stage.'
        : stage < LAST
          ? `Stage ${stage}: each number pairs with the one ${SPANS[stage - 1]} place${SPANS[stage - 1] > 1 ? 's' : ''} along. The upper box of each pair gets a + b, the lower one a − b.`
          : `Stage 3: pairs 4 apart, and the transform is done. Pick any output to check it against the direct sum.`;
    countEl.textContent = `${ops} adds and subtracts so far · ${DIRECT_OPS} the direct way`;
    detailEl.textContent = picked ? describe(picked.col, picked.row) : stage > 0 ? 'Pick any number to see what it came from and what reuses it.' : '';
    backEl.disabled = stage === 0;
    forwardEl.disabled = stage === LAST;
  }

  function pick(col: number, row: number): void {
    if (col > state.stage) return;
    const same = state.picked && state.picked.col === col && state.picked.row === row;
    state.picked = same ? null : { col, row };
    render();
  }

  nodes.forEach((node, i) => {
    const col = Math.floor(i / SIZE);
    const row = i % SIZE;
    node.setAttribute('role', 'button');
    node.addEventListener('click', () => pick(col, row));
    node.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        pick(col, row);
      }
    });
  });

  forwardButton.addEventListener('click', () => {
    state.stage = Math.min(LAST, state.stage + 1);
    render();
  });
  backButton.addEventListener('click', () => {
    state.stage = Math.max(0, state.stage - 1);
    if (state.picked && state.picked.col > state.stage) state.picked = null;
    render();
  });

  for (const button of presetButtons) {
    button.disabled = false;
    button.addEventListener('click', () => {
      const which = button.dataset.preset;
      const input = which === 'random' ? randomInput() : presets[Number(which)]?.values;
      if (!input) return;
      state.columns = stages(input);
      for (const b of presetButtons) {
        const on = b === button;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', String(on));
      }
      render();
    });
  }

  forwardButton.disabled = false;
  if (controls) controls.hidden = false;
  if (actions) actions.hidden = false;
  render();
}
