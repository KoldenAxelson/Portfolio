// {{< ml/merkle-compare >}}: two machines with the same 16 made-up files,
// except the ones edited on machine B. Each builds a Merkle tree of SHA-256
// hashes (files, then pairs of hashes, up to the root), and the comparison
// walks down from the root only where the two trees' hashes differ.
// layouts/shortcodes/ml/merkle-compare.html does the same for the first
// scenario (JS off); keep the two in step: file text, the " (edited)" suffix,
// hex hashes joined left then right. Data: data/ml/merkle-compare.yaml.

interface Config {
  files: string[];
  scenarios: { name: string; changed: number[] }[];
}

async function sha256(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

// Heap-numbered tree: node 1 is the root, node i has children 2i and 2i + 1,
// and nodes n to 2n − 1 are the files.
async function tree(files: string[], edited: Set<number>): Promise<string[]> {
  const n = files.length;
  const h = new Array<string>(2 * n).fill('');
  await Promise.all(
    files.map(async (f, i) => {
      const text = `${f}: contents of file ${i + 1}`;
      h[n + i] = await sha256(edited.has(i + 1) ? `${text} (edited)` : text);
    }),
  );
  for (let j = n - 1; j >= 1; j--) h[j] = await sha256(h[2 * j] + h[2 * j + 1]);
  return h;
}

export function initMerkleCompare(root: HTMLElement): void {
  const config = JSON.parse(root.dataset.config ?? 'null') as Config | null;
  const say = root.querySelector<HTMLElement>('#mli-mk-say');
  const nodeText = root.querySelector<HTMLElement>('#mli-mk-node');
  if (!config || !say || !nodeText) return;
  if (!window.crypto?.subtle) {
    nodeText.textContent = "This browser can't work out SHA-256 here (it allows that only on secure pages), so this shows the first scenario, worked out in advance.";
    return;
  }
  const el = { say, nodeText };
  const files = config.files;
  const n = files.length;
  const nodes = Array.from(root.querySelectorAll<SVGGElement>('.mli-mk-node'));
  const byNode = new Map(nodes.map((g) => [Number(g.dataset.node), g]));
  const state = { edited: new Set<number>(config.scenarios[0]?.changed ?? []), a: [] as string[], b: [] as string[], picked: 0 };
  let version = 0;

  function describe(j: number): string {
    if (!j) return `Each box shows the start of machine B's hash for that part of the tree; the bottom row is the ${n} files. Pick one to see both machines' hashes.`;
    const what = j >= n ? `File ${j - n + 1} (${files[j - n]})` : j === 1 ? 'The root' : `Node ${j}, covering files ${firstFile(j)} to ${lastFile(j)}`;
    const same = state.a[j] === state.b[j];
    return `${what}: A ${state.a[j].slice(0, 12)}…, B ${state.b[j].slice(0, 12)}… ${same ? 'Same.' : 'Different.'}`;
  }
  function firstFile(j: number): number {
    let k = j;
    while (k < n) k *= 2;
    return k - n + 1;
  }
  function lastFile(j: number): number {
    let k = j;
    while (k < n) k = 2 * k + 1;
    return k - n + 1;
  }

  function render(): void {
    const { a, b } = state;
    let compared = 0;
    const found: number[] = [];
    for (let j = 1; j < 2 * n; j++) {
      const cmp = j === 1 || a[j >> 1] !== b[j >> 1];
      const diff = a[j] !== b[j];
      if (cmp) compared++;
      if (cmp && diff && j >= n) found.push(j - n + 1);
      const g = byNode.get(j);
      if (!g) continue;
      g.classList.toggle('is-cmp', cmp);
      g.classList.toggle('is-diff', diff);
      g.classList.toggle('is-picked', j === state.picked);
      const status = !cmp ? 'never compared' : diff ? 'compared, different from machine A' : 'compared, same as machine A';
      g.setAttribute('aria-label', j >= n ? `Edit file ${j - n + 1}, ${files[j - n]}, on machine B: ${status}` : `${j === 1 ? 'The root' : `Hash of files ${firstFile(j)} to ${lastFile(j)}`}, ${status}`);
      if (j >= n) g.setAttribute('aria-pressed', String(state.edited.has(j - n + 1)));
      const label = g.querySelector('text');
      if (label && j < n) label.textContent = b[j].slice(0, j >= n / 2 ? 4 : 6);
    }
    const list = found.length === 1 ? `file ${found[0]} is found` : `files ${found.join(', ').replace(/, (\d+)$/, ' and $1')} are found`;
    el.say.textContent = found.length ? `${compared} hashes compared, and ${list}. Sending every file's hash would take ${n}.` : `${compared} hash compared: the roots match, so nothing needs to move. Sending every file's hash would take ${n}.`;
    el.nodeText.textContent = describe(state.picked);
  }

  async function rebuild(): Promise<void> {
    const mine = ++version;
    const [a, b] = await Promise.all([tree(files, new Set()), tree(files, state.edited)]);
    if (mine !== version) return;
    state.a = a;
    state.b = b;
    render();
  }

  nodes.forEach((g) => {
    const j = Number(g.dataset.node);
    g.setAttribute('tabindex', '0');
    g.setAttribute('role', 'button');
    const act = (): void => {
      state.picked = j;
      if (j >= n) {
        const file = j - n + 1;
        if (state.edited.has(file)) state.edited.delete(file);
        else state.edited.add(file);
        markScenario(-1);
        void rebuild();
      } else render();
    };
    g.addEventListener('click', act);
    g.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        act();
      }
    });
  });

  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-scenario]'));
  function markScenario(index: number): void {
    buttons.forEach((b, i) => {
      b.classList.toggle('is-on', i === index);
      b.setAttribute('aria-pressed', String(i === index));
    });
  }
  buttons.forEach((button, i) => {
    button.disabled = false;
    button.addEventListener('click', () => {
      state.edited = new Set(config.scenarios[i].changed);
      state.picked = 0;
      markScenario(i);
      void rebuild();
    });
  });
  // A bigger control than the narrow file boxes, for phones and keyboards.
  const pickFile = root.querySelector<HTMLSelectElement>('#mli-mk-file');
  if (pickFile) {
    pickFile.disabled = false;
    pickFile.addEventListener('change', () => {
      const file = Number(pickFile.value);
      if (file) byNode.get(n + file - 1)?.dispatchEvent(new Event('click'));
      pickFile.value = '';
    });
  }
  const controls = root.querySelector<HTMLElement>('#mli-mk-controls');
  if (controls) controls.hidden = false;
  void rebuild();
}
