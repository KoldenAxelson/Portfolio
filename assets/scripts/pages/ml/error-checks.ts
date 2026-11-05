// {{< ml/error-checks >}}: HELLO as 40 bits, guarded by one parity bit, a sum
// of the bytes mod 256, and CRC-8 (polynomial 0x07, start 0). Presets flip
// bits or swap two bytes; clicking a bit flips it. Each check is worked out on
// the sent and the received bytes, and differs if it caught the damage.
// layouts/shortcodes/ml/error-checks.html (with partials/ml/crc8.html) does the
// same for the first preset with JS off. Data: data/ml/error-checks.yaml.

interface Preset {
  name: string;
  flip?: number[];
  swap?: [number, number];
}
interface Config {
  message: number[];
  presets: Preset[];
}

export function crc8(bytes: number[]): number {
  let crc = 0;
  for (const b of bytes) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = crc & 0x80 ? ((crc << 1) & 0xff) ^ 0x07 : (crc << 1) & 0xff;
  }
  return crc;
}
const parity = (bytes: number[]): number => bytes.reduce((n, b) => n + b.toString(2).split('1').length - 1, 0) % 2;
const sum = (bytes: number[]): number => bytes.reduce((s, b) => s + b, 0) % 256;
const CHECKS: [string, (b: number[]) => number][] = [
  ['parity', parity],
  ['sum', sum],
  ['crc', crc8],
];

export function initErrorChecks(root: HTMLElement): void {
  const config = JSON.parse(root.dataset.config ?? 'null') as Config | null;
  const bytesBox = root.querySelector<HTMLElement>('#mli-ec-bytes');
  const say = root.querySelector<HTMLElement>('#mli-ec-say');
  if (!config || !bytesBox || !say) return;
  const el = { bytesBox, say };
  const sent = config.message;
  const presets = config.presets;
  const state = { swap: null as [number, number] | null, flips: new Set<number>(), label: config.presets[0]?.name ?? '' };

  function received(): number[] {
    const out = sent.slice();
    if (state.swap) [out[state.swap[0]], out[state.swap[1]]] = [out[state.swap[1]], out[state.swap[0]]];
    for (const i of state.flips) out[i >> 3] ^= 1 << (7 - (i & 7));
    return out;
  }

  // Build the 40 bit buttons once.
  el.bytesBox.replaceChildren(
    ...sent.map((_, byte) => {
      const wrap = document.createElement('div');
      wrap.className = 'mli-ec-byte';
      const ch = document.createElement('span');
      ch.className = 'mli-ec-char';
      const bits = document.createElement('span');
      bits.className = 'mli-ec-bits';
      for (let k = 0; k < 8; k++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'mli-ec-bit';
        b.dataset.index = String(byte * 8 + k);
        b.addEventListener('click', () => {
          const i = byte * 8 + k;
          if (state.flips.has(i)) state.flips.delete(i);
          else state.flips.add(i);
          state.label = state.swap ? 'The swap plus your own flips' : 'Your own flips';
          mark(-1);
          render();
        });
        bits.append(b);
      }
      const val = document.createElement('span');
      val.className = 'mli-ec-val';
      wrap.append(ch, bits, val);
      return wrap;
    }),
  );

  function render(): void {
    const got = received();
    const wraps = Array.from(el.bytesBox.children) as HTMLElement[];
    wraps.forEach((wrap, byte) => {
      const v = got[byte];
      const o = sent[byte];
      const ch = wrap.querySelector('.mli-ec-char');
      if (ch) ch.textContent = v >= 32 && v < 127 ? String.fromCharCode(v) : '?';
      const val = wrap.querySelector('.mli-ec-val');
      if (val) val.textContent = String(v);
      wrap.querySelectorAll<HTMLButtonElement>('.mli-ec-bit').forEach((b, k) => {
        const bit = (v >> (7 - k)) & 1;
        b.textContent = String(bit);
        const changed = bit !== ((o >> (7 - k)) & 1);
        b.classList.toggle('is-flipped', changed);
        b.setAttribute('aria-label', `Letter ${byte + 1}, bit ${k + 1}: ${bit}${changed ? ', changed' : ''}. Press to flip.`);
      });
    });
    const same = got.every((v, i) => v === sent[i]);
    const missed: string[] = [];
    for (const [id, fn] of CHECKS) {
      const row = root.querySelector<HTMLElement>(`#mli-ec-${id}`);
      if (!row) continue;
      const a = fn(sent);
      const b = fn(got);
      const caught = a !== b;
      if (!caught) missed.push(row.querySelector('th')?.textContent ?? id);
      row.classList.toggle('is-caught', !same && caught);
      row.classList.toggle('is-missed', !same && !caught);
      const set = (cls: string, text: string): void => {
        const cell = row.querySelector(`.${cls}`);
        if (cell) cell.textContent = text;
      };
      set('mli-ec-a', String(a));
      set('mli-ec-b', String(b));
      set('mli-ec-v', same ? 'nothing to catch' : caught ? 'caught' : 'missed');
    }
    const word = got.map((v) => (v >= 32 && v < 127 ? String.fromCharCode(v) : '?')).join('');
    el.say.textContent = same ? 'Nothing is damaged, so every check matches, as it should.' : `${state.label}: the received word reads “${word}”. ${missed.length ? `Missed by: ${missed.join(', ')}.` : 'Every check caught it.'}`;
  }

  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-preset]'));
  function mark(index: number): void {
    buttons.forEach((b, i) => {
      b.classList.toggle('is-on', i === index);
      b.setAttribute('aria-pressed', String(i === index));
    });
  }
  function apply(index: number): void {
    const p = presets[index];
    state.swap = p.swap ?? null;
    state.flips = new Set(p.flip ?? []);
    state.label = p.name;
    mark(index);
    render();
  }
  buttons.forEach((b, i) => {
    b.disabled = false;
    b.addEventListener('click', () => apply(i));
  });
  const clear = root.querySelector<HTMLButtonElement>('#mli-ec-clear');
  if (clear) {
    clear.disabled = false;
    clear.addEventListener('click', () => {
      state.swap = null;
      state.flips.clear();
      mark(-1);
      render();
    });
  }
  const controls = root.querySelector<HTMLElement>('#mli-ec-controls');
  if (controls) controls.hidden = false;
  apply(0);
}
