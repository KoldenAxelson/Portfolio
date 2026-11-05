// {{< ml/hamming-code >}}: the (7,4) Hamming code. Data bits sit in positions
// 3, 5, 6 and 7; check bit c (1, 2 or 4) makes the count of 1s even over the
// positions whose binary number includes c. Flip any bit and the failed checks
// add up to its position. An optional overall parity bit (position 0 here)
// tells one flip from two. layouts/shortcodes/ml/hamming-code.html works out
// the same code word for JS off. Data: data/ml/hamming-code.yaml.

const DATA_POS = [3, 5, 6, 7];
const CHECKS = [1, 2, 4];
const covers = (c: number): number[] => [1, 2, 3, 4, 5, 6, 7].filter((p) => (p & c) !== 0);

export function encode(data: number[]): number[] {
  const word = new Array<number>(8).fill(0); // index 0 is the overall bit
  DATA_POS.forEach((p, i) => (word[p] = data[i]));
  for (const c of CHECKS) word[c] = covers(c).filter((p) => p !== c).reduce((s, p) => s + word[p], 0) % 2;
  word[0] = word.slice(1).reduce((s, v) => s + v, 0) % 2;
  return word;
}

export function initHammingCode(root: HTMLElement): void {
  const start = JSON.parse(root.dataset.start ?? '[1,0,1,1]') as number[];
  const say = root.querySelector<HTMLElement>('#mli-hc-say');
  const fix = root.querySelector<HTMLButtonElement>('#mli-hc-fix');
  const extraButton = root.querySelector<HTMLButtonElement>('#mli-hc-extra');
  const clear = root.querySelector<HTMLButtonElement>('#mli-hc-clear');
  if (!say || !fix || !extraButton || !clear) return;
  const el = { say, fix, extraButton, clear };
  const cells = Array.from(root.querySelectorAll<HTMLElement>('.mli-hc-cell'));
  const dataButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('.mli-hc-data'));
  const checkItems = Array.from(root.querySelectorAll<HTMLElement>('.mli-hc-check'));

  const state = { data: start.slice(), sent: encode(start), flipped: new Set<number>(), extra: false };
  const received = (): number[] => state.sent.map((v, p) => (state.flipped.has(p) ? 1 - v : v));

  function render(): void {
    const word = received();
    cells.forEach((cell) => {
      const p = Number(cell.dataset.pos);
      if (p === 0) cell.hidden = !state.extra;
      const bit = cell.querySelector('.mli-hc-bit');
      if (bit) bit.textContent = String(word[p]);
      cell.classList.toggle('is-flipped', state.flipped.has(p));
      cell.setAttribute('aria-label', `Position ${p === 0 ? 'overall' : p}, ${p === 0 ? 'overall parity' : CHECKS.includes(p) ? 'check' : 'data'} bit, ${word[p]}${state.flipped.has(p) ? ', flipped' : ''}. Press to flip.`);
    });
    dataButtons.forEach((b, i) => {
      b.textContent = String(state.data[i]);
      b.setAttribute('aria-label', `Data bit ${i + 1} (position ${DATA_POS[i]}): ${state.data[i]}. Press to change it.`);
    });

    const failed: number[] = [];
    checkItems.forEach((item) => {
      const c = Number(item.dataset.check);
      if (c === 0) {
        item.hidden = !state.extra;
        const ones = word.reduce((s, v) => s + v, 0);
        const pass = ones % 2 === 0;
        item.classList.toggle('is-pass', pass);
        item.classList.toggle('is-fail', !pass);
        item.innerHTML = '';
        const strong = document.createElement('strong');
        strong.textContent = 'Overall';
        item.append(strong, ` covers all 8 bits: ${ones} ones, ${pass ? 'even' : 'odd'}, ${pass ? 'passes' : 'fails'}`);
        return;
      }
      const pos = covers(c);
      const ones = pos.reduce((s, p) => s + word[p], 0);
      const pass = ones % 2 === 0;
      if (!pass) failed.push(c);
      item.classList.toggle('is-pass', pass);
      item.classList.toggle('is-fail', !pass);
      item.innerHTML = '';
      const strong = document.createElement('strong');
      strong.textContent = `Check ${c}`;
      item.append(strong, ` covers positions ${pos.slice(0, -1).join(', ')} and ${pos[pos.length - 1]}: ${ones} ${ones === 1 ? 'one' : 'ones'}, ${pass ? 'even' : 'odd'}, ${pass ? 'passes' : 'fails'}`);
    });

    const pointer = failed.reduce((s, c) => s + c, 0);
    const overallFails = word.reduce((s, v) => s + v, 0) % 2 === 1;
    const flips = state.flipped.size;
    const sum = failed.length > 1 ? `${failed.join(' + ')} = ${pointer}` : String(pointer);
    let text: string;
    let canFix = false;
    if (flips === 0) text = `Data ${state.data.join('')} becomes the code word ${state.sent.slice(1).join('')}${state.extra ? ` with overall bit ${state.sent[0]}` : ''}. Every check passes, so the failed checks add up to 0: no error.`;
    else if (!state.extra) {
      canFix = pointer > 0;
      if (flips === 1) text = pointer ? `The failed checks add up to ${sum}: position ${pointer}, which is the bit that flipped. Flipping it back restores the code word${CHECKS.includes(pointer) ? '; the data itself was never touched' : ' and the data'}.` : 'Every check passes.';
      else text = pointer ? `${flips} bits flipped, but the failed checks add up to ${sum}, so they point at position ${pointer}${state.flipped.has(pointer) ? `, one of the flipped bits, but fixing it still leaves ${flips - 1} flipped` : ', which wasn’t flipped. Fixing it would make the word worse'}. One code like this can only fix one flip.` : `${flips} bits flipped, and every check passes. The error got through.`;
    } else if (overallFails) {
      canFix = true;
      const at = pointer || 0;
      text = flips === 1 ? `The overall check fails, so an odd number of bits flipped: assume one. The checks add up to ${sum}, so it's ${at === 0 ? 'the overall bit itself' : `position ${at}`}. Flip it back.` : `The overall check fails, so an odd number flipped, and ${at === 0 ? 'the other checks all pass, which blames the overall bit' : `the checks point at position ${at}`}. With ${flips} flips that's not to be trusted.`;
    } else if (pointer) {
      text = `The checks fail (${sum}) but the overall check passes, so an even number of bits flipped: two, most likely. That's detected, but there's no way to tell which two, so don't fix; ask for the data again.`;
    } else text = `${flips} bits flipped, and every check passes. The error got through.`;
    el.say.textContent = text;
    el.fix.disabled = !canFix;
    el.fix.textContent = canFix ? (pointer === 0 ? 'Flip the overall bit, the only one left to blame' : `Flip position ${pointer}, where the checks point`) : 'Flip the bit the checks point at';
    el.fix.dataset.target = String(pointer);
    el.extraButton.setAttribute('aria-pressed', String(state.extra));
    el.extraButton.classList.toggle('is-on', state.extra);
    el.clear.disabled = flips === 0;
  }

  cells.forEach((cell) => {
    const p = Number(cell.dataset.pos);
    cell.setAttribute('role', 'button');
    cell.setAttribute('tabindex', '0');
    const flip = (): void => {
      if (state.flipped.has(p)) state.flipped.delete(p);
      else state.flipped.add(p);
      render();
    };
    cell.addEventListener('click', flip);
    cell.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        flip();
      }
    });
  });
  dataButtons.forEach((b, i) => {
    b.disabled = false;
    b.addEventListener('click', () => {
      state.data[i] = 1 - state.data[i];
      state.sent = encode(state.data);
      state.flipped.clear();
      render();
    });
  });
  el.fix.addEventListener('click', () => {
    const p = Number(el.fix.dataset.target);
    if (state.flipped.has(p)) state.flipped.delete(p);
    else state.flipped.add(p);
    render();
  });
  el.extraButton.disabled = false;
  el.extraButton.addEventListener('click', () => {
    state.extra = !state.extra;
    if (!state.extra) state.flipped.delete(0);
    render();
  });
  el.clear.addEventListener('click', () => {
    state.flipped.clear();
    render();
  });
  for (const id of ['mli-hc-controls', 'mli-hc-actions', 'mli-hc-hint']) {
    const node = root.querySelector<HTMLElement>(`#${id}`);
    if (node) node.hidden = false;
  }
  render();
}
