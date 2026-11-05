// {{< ml/fenwick >}}: 16 made-up counts and their Fenwick tree. Picking a
// position either reads its running total (add bars, jumping left by each
// bar's length) or adds 1 to it (change bars, jumping right), and compares
// the cost with plain running totals. layouts/shortcodes/ml/fenwick.html
// builds the same tree and the first read for JS off; keep the two in step.
// Data comes from data/ml/fenwick.yaml.

const lowbit = (i: number): number => i & -i;

export function buildTree(values: number[]): number[] {
  const tree = new Array<number>(values.length + 1).fill(0);
  values.forEach((v, idx) => {
    for (let i = idx + 1; i <= values.length; i += lowbit(i)) tree[i] += v;
  });
  return tree;
}

export function readPath(k: number): number[] {
  const path: number[] = [];
  for (let i = k; i > 0; i -= lowbit(i)) path.push(i);
  return path;
}

export function addPath(k: number, n: number): number[] {
  const path: number[] = [];
  for (let i = k; i <= n; i += lowbit(i)) path.push(i);
  return path;
}

type Mode = 'read' | 'add';

export function initFenwick(root: HTMLElement): void {
  const start = JSON.parse(root.dataset.values ?? '[]') as number[];
  const say = root.querySelector<HTMLElement>('#mli-fk-say');
  const plain = root.querySelector<HTMLElement>('#mli-fk-plain');
  const treeOut = root.querySelector<HTMLElement>('#mli-fk-tree');
  if (!start.length || !say || !plain || !treeOut) return;
  const el = { say, plain, treeOut };
  const n = start.length;
  const bars = Array.from(root.querySelectorAll<HTMLElement>('.mli-fk-bar'));
  const cells = Array.from(root.querySelectorAll<HTMLButtonElement>('.mli-fk-val'));
  const modeButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-mode]'));
  const reset = root.querySelector<HTMLButtonElement>('#mli-fk-reset');

  const state = { values: start.slice(), tree: buildTree(start), mode: 'read' as Mode, picked: Number(root.dataset.start) || n, path: [] as number[] };

  function render(): void {
    const { values, tree, picked, mode, path } = state;
    bars.forEach((bar) => {
      const node = Number(bar.dataset.node);
      bar.textContent = String(tree[node]);
      bar.classList.toggle('is-hit', mode === 'read' && path.includes(node));
      bar.classList.toggle('is-changed', mode === 'add' && path.includes(node));
    });
    cells.forEach((cell, idx) => {
      const pos = idx + 1;
      const label = cell.querySelector('.mli-fk-pos');
      cell.textContent = '';
      if (label) cell.append(label);
      cell.append(String(values[idx]));
      cell.setAttribute('aria-label', `Position ${pos}, count ${values[idx]}`);
      cell.classList.toggle('is-span', mode === 'read' ? pos <= picked : pos >= picked);
      cell.classList.toggle('is-picked', pos === picked);
    });
    const binary = picked.toString(2);
    if (mode === 'read') {
      const total = path.reduce((sum, i) => sum + tree[i], 0);
      el.say.innerHTML = '';
      const strong = document.createElement('strong');
      strong.textContent = String(total);
      el.say.append(`Running total up to position ${picked} (${binary} in binary): ${path.map((i) => `bar ${i}`).join(' + ')} = `, strong, `. That's ${path.length} bar${path.length === 1 ? '' : 's'} added, one per 1 in the binary.`);
      el.plain.textContent = '1 lookup';
      el.treeOut.textContent = `${path.length} lookup${path.length === 1 ? '' : 's'}`;
    } else {
      const changes = n - picked + 1;
      el.say.textContent = `Added 1 at position ${picked} (${binary} in binary). The bars covering it changed: ${path.map((i) => `bar ${i}`).join(', ')}.`;
      el.plain.textContent = `${changes} total${changes === 1 ? '' : 's'} change (positions ${picked} to ${n})`;
      el.treeOut.textContent = `${path.length} bar${path.length === 1 ? '' : 's'} change`;
    }
  }

  function pick(pos: number): void {
    state.picked = pos;
    if (state.mode === 'add') {
      state.values[pos - 1] += 1;
      state.path = addPath(pos, n);
      for (const i of state.path) state.tree[i] += 1;
    } else {
      state.path = readPath(pos);
    }
    render();
  }

  cells.forEach((cell, idx) => {
    cell.disabled = false;
    cell.addEventListener('click', () => pick(idx + 1));
  });
  for (const button of modeButtons) {
    button.disabled = false;
    button.addEventListener('click', () => {
      state.mode = button.dataset.mode as Mode;
      for (const b of modeButtons) {
        b.classList.toggle('is-on', b === button);
        b.setAttribute('aria-pressed', String(b === button));
      }
      state.path = state.mode === 'read' ? readPath(state.picked) : [];
      if (state.mode === 'add') {
        el.say.textContent = 'Pick a position to add 1 to it.';
        el.plain.textContent = '—';
        el.treeOut.textContent = '—';
        bars.forEach((bar) => bar.classList.remove('is-hit', 'is-changed'));
        cells.forEach((cell) => cell.classList.remove('is-span', 'is-picked'));
        return;
      }
      render();
    });
  }
  if (reset) {
    reset.disabled = false;
    reset.addEventListener('click', () => {
      state.values = start.slice();
      state.tree = buildTree(start);
      state.path = state.mode === 'read' ? readPath(state.picked) : [];
      render();
      if (state.mode === 'add') {
        el.say.textContent = 'Counts reset. Pick a position to add 1 to it.';
        el.plain.textContent = '—';
        el.treeOut.textContent = '—';
        cells.forEach((cell) => cell.classList.remove('is-span', 'is-picked'));
      }
    });
  }
  // Previous / next: bigger targets than the 16 narrow count buttons on phones.
  for (const [id, step] of [['mli-fk-prev', -1], ['mli-fk-next', 1]] as const) {
    const button = root.querySelector<HTMLButtonElement>(`#${id}`);
    if (!button) continue;
    button.disabled = false;
    button.addEventListener('click', () => pick(Math.min(n, Math.max(1, state.picked + step))));
  }
  const controls = root.querySelector<HTMLElement>('#mli-fk-controls');
  if (controls) controls.hidden = false;
  state.path = readPath(state.picked);
  render();
}
