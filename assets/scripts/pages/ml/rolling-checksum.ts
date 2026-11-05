// {{< ml/rolling-checksum >}}: rsync's search on one made-up sentence. The old
// copy is cut into blocks and each gets rsync's weak checksum (a, b). A window
// slides along the new copy; after a one-character slide the checksum is
// rolled with rsync's recurrences (and checked against a fresh computation);
// after a jump it's worked out from scratch. A weak match is confirmed by
// comparing the characters (standing in for MD4). Matches become "use block
// k"; everything else is sent as literal characters.
// layouts/shortcodes/ml/rolling-checksum.html finds the first edit's matches
// by plain comparison for JS off. Data: data/ml/rolling-checksum.yaml.

const M = 1 << 16;

interface Config {
  block: number;
  old: string;
  edits: { name: string; new: string }[];
}

type Out = { kind: 'lit'; text: string } | { kind: 'blk'; k: number };

export function weak(text: string): [number, number] {
  let a = 0;
  let b = 0;
  for (let i = 0; i < text.length; i++) {
    const x = text.charCodeAt(i);
    a = (a + x) % M;
    b = (b + (text.length - i) * x) % M;
  }
  return [a, b];
}

const mod = (v: number): number => ((v % M) + M) % M;
const show = (s: string): string => s.replace(/ /g, '·');

export function initRollingChecksum(root: HTMLElement): void {
  const config = JSON.parse(root.dataset.config ?? 'null') as Config | null;
  const textBox = root.querySelector<HTMLElement>('#mli-rc-text');
  const outBox = root.querySelector<HTMLElement>('#mli-rc-out');
  const say = root.querySelector<HTMLElement>('#mli-rc-say');
  const math = root.querySelector<HTMLElement>('#mli-rc-math');
  const total = root.querySelector<HTMLElement>('#mli-rc-total');
  if (!config || !textBox || !outBox || !say || !math || !total) return;
  const el = { textBox, outBox, say, math, total };
  const S = config.block;
  const edits = config.edits;

  const blocks: string[] = [];
  for (let i = 0; i < config.old.length; i += S) blocks.push(config.old.slice(i, i + S));
  const sums = blocks.map(weak);
  root.querySelectorAll<HTMLElement>('[data-ck]').forEach((node) => {
    const [a, b] = sums[Number(node.dataset.ck)];
    node.textContent = `a ${a} · b ${b}`;
  });
  const blockEls = Array.from(root.querySelectorAll<HTMLElement>('.mli-rc-block'));

  interface State {
    text: string;
    p: number;
    out: Out[];
    lit: string;
    sum: [number, number] | null; // checksum of the window at p, if known
    marks: ('blk' | 'lit' | '')[];
    done: boolean;
    lastBlock: number;
    rolledNote: string;
  }
  let state: State;

  function reset(index: number): void {
    const text = edits[index].new;
    state = { text, p: 0, out: [], lit: '', sum: null, marks: new Array(text.length).fill(''), done: false, lastBlock: -1, rolledNote: '' };
    el.textBox.replaceChildren(
      ...Array.from(text).map((ch) => {
        const span = document.createElement('span');
        span.className = 'mli-rc-ch';
        span.textContent = show(ch);
        return span;
      }),
    );
    el.say.textContent = 'The window starts at the first character. Slide it along.';
    el.math.textContent = '';
    render();
  }

  function flush(): void {
    if (state.lit) {
      state.out.push({ kind: 'lit', text: state.lit });
      state.lit = '';
    }
  }

  // One move of the search. Returns true if it found a block.
  function step(): boolean {
    const { text, p } = state;
    if (p >= text.length) {
      flush();
      state.done = true;
      return false;
    }
    const width = Math.min(S, text.length - p);
    const window = text.slice(p, p + width);
    let sum: [number, number];
    let how: string;
    const fresh = weak(window);
    if (state.sum && width === S) {
      sum = state.sum;
      how = `rolled from the last window: ${state.rolledNote}`;
    } else {
      sum = fresh;
      how = p === 0 ? 'worked out from scratch (the first window)' : width < S ? 'worked out from scratch (near the end, where the window is shorter)' : 'worked out from scratch (after a jump)';
    }
    const ok = sum[0] === fresh[0] && sum[1] === fresh[1];
    let hit = -1;
    sums.forEach(([a, b], k) => {
      if (hit < 0 && a === sum[0] && b === sum[1] && blocks[k].length === width && (width === S || p + width === text.length) && blocks[k] === window) hit = k;
    });
    const weakHits = sums.filter(([a, b], k) => a === sum[0] && b === sum[1] && blocks[k].length === width).length;
    el.math.textContent = `Window “${show(window)}”: a = ${sum[0]}, b = ${sum[1]}, ${how}.${state.sum && width === S ? (ok ? ' From scratch: the same.' : ' From scratch: different!') : ''}`;
    if (hit >= 0) {
      flush();
      state.out.push({ kind: 'blk', k: hit });
      for (let i = p; i < p + width; i++) state.marks[i] = 'blk';
      state.lastBlock = hit;
      state.p = p + width;
      state.sum = null;
      el.say.textContent = `Match: the checksum equals block ${hit}'s, and the characters agree. Send “use block ${hit}” and jump ${width} character${width === 1 ? '' : 's'} ahead.`;
    } else {
      state.lit += text[p];
      state.marks[p] = 'lit';
      state.lastBlock = -1;
      // Roll the checksum one character to the right for the next window.
      if (p + S < text.length) {
        const out = text.charCodeAt(p);
        const inn = text.charCodeAt(p + S);
        const a = mod(sum[0] - out + inn);
        const b = mod(sum[1] - S * out + a);
        state.rolledNote = `a = ${sum[0]} − ${out} (“${show(text[p])}” leaves) + ${inn} (“${show(text[p + S])}” arrives), b = ${sum[1]} − ${S} × ${out} + new a`;
        state.sum = [a, b];
      } else {
        state.sum = null;
      }
      state.p = p + 1;
      el.say.textContent = weakHits ? `The weak checksum matched a block, but the characters didn't: a false alarm. “${show(text[p])}” goes into the bytes to send.` : `No block has this checksum. “${show(text[p])}” goes into the bytes to send, and the window slides one character.`;
    }
    if (state.p >= text.length) {
      flush();
      state.done = true;
    }
    return hit >= 0;
  }

  function render(): void {
    const chars = Array.from(el.textBox.children) as HTMLElement[];
    const width = Math.min(S, state.text.length - state.p);
    chars.forEach((ch, i) => {
      ch.classList.toggle('is-window', !state.done && i >= state.p && i < state.p + width);
      ch.classList.toggle('is-blk', state.marks[i] === 'blk');
      ch.classList.toggle('is-lit', state.marks[i] === 'lit');
    });
    blockEls.forEach((b, k) => b.classList.toggle('is-hit', k === state.lastBlock));
    const items = state.out.map((o) => {
      const li = document.createElement('li');
      li.className = o.kind === 'lit' ? 'is-lit' : 'is-blk';
      li.textContent = o.kind === 'lit' ? `send “${show(o.text)}”` : `use block ${o.k}`;
      return li;
    });
    if (state.lit) {
      const li = document.createElement('li');
      li.className = 'is-lit is-pending';
      li.textContent = `send “${show(state.lit)}” (still growing)`;
      items.push(li);
    }
    el.outBox.replaceChildren(...items);
    const litChars = state.out.reduce((n, o) => n + (o.kind === 'lit' ? o.text.length : 0), 0) + state.lit.length;
    const copies = state.out.filter((o) => o.kind === 'blk').length;
    el.total.textContent = state.done ? `${litChars} of ${state.text.length} characters sent as they are; ${copies} block${copies === 1 ? '' : 's'} reused.` : `So far: ${litChars} character${litChars === 1 ? '' : 's'} to send, ${copies} block${copies === 1 ? '' : 's'} reused.`;
    const active = document.activeElement;
    for (const id of ['mli-rc-step', 'mli-rc-next', 'mli-rc-end']) {
      const b = root.querySelector<HTMLButtonElement>(`#${id}`);
      if (b) b.disabled = state.done;
    }
    if (state.done && active instanceof HTMLButtonElement && active.disabled) root.querySelector<HTMLButtonElement>('#mli-rc-reset')?.focus();
    const doneNote = 'Done: the far machine rebuilds the new copy from its own blocks and the characters sent.';
    if (state.done && !el.say.textContent?.endsWith(doneNote)) el.say.textContent = `${el.say.textContent ?? ''} ${doneNote}`.trim();
  }

  const on = (id: string, fn: () => void): void => {
    const b = root.querySelector<HTMLButtonElement>(`#${id}`);
    if (!b) return;
    b.disabled = false;
    b.addEventListener('click', fn);
  };
  let current = 0;
  on('mli-rc-reset', () => reset(current));
  on('mli-rc-step', () => {
    step();
    render();
  });
  on('mli-rc-next', () => {
    while (!state.done && !step()) {
      /* keep sliding */
    }
    render();
  });
  on('mli-rc-end', () => {
    while (!state.done) step();
    render();
  });
  const editButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-edit]'));
  for (const button of editButtons) {
    button.disabled = false;
    button.addEventListener('click', () => {
      current = Number(button.dataset.edit);
      for (const b of editButtons) {
        b.classList.toggle('is-on', b === button);
        b.setAttribute('aria-pressed', String(b === button));
      }
      reset(current);
    });
  }
  for (const id of ['mli-rc-controls', 'mli-rc-actions', 'mli-rc-window']) {
    const node = root.querySelector<HTMLElement>(`#${id}`);
    if (node) node.hidden = false;
  }
  reset(0);
}
