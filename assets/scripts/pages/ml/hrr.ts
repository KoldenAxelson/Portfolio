// Holographic memory toy: a sentence stored as role ⊛ word + role ⊛ word +
// role ⊛ word in one vector (Plate's holographic reduced representations).
// Binding is circular convolution and asking is circular correlation, both
// through an FFT; the clean-up memory is cosine similarity against every
// known word. Sentences and slider ranges come from data/ml/hrr.yaml.

interface Role {
  key: string;
  question: string;
}

type Sentence = Record<string, string> & { text: string };

type Vector = Float64Array;

// Random, but the same random on every visit, so the numbers the reader sees
// are repeatable. mulberry32: tiny and good enough for a demo.
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashOf(text: string): number {
  let hash = 2166136261;
  for (const ch of text) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
  return hash >>> 0;
}

// Plate's recipe: every element drawn independently, mean 0, variance 1/n.
// Cached because every render reuses the same vectors and bound pairs; without
// it a render at 2,048 numbers and 60 extra facts redoes ~200 FFTs.
const vectorCache = new Map<string, Vector>();
function randomVector(name: string, length: number): Vector {
  const key = `${name}:${length}`;
  const cached = vectorCache.get(key);
  if (cached) return cached;
  const vector = drawVector(name, length);
  vectorCache.set(key, vector);
  return vector;
}

function drawVector(name: string, length: number): Vector {
  const next = seededRandom(hashOf(`${name}:${length}`));
  const vector = new Float64Array(length);
  const spread = Math.sqrt(1 / length);
  for (let i = 0; i < length; i++) {
    const u = Math.max(next(), 1e-12);
    vector[i] = spread * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next());
  }
  return vector;
}

// In-place radix-2 FFT; `inverse` runs it backwards and divides by n.
function fft(re: Float64Array, im: Float64Array, inverse: boolean): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i >= j) continue;
    [re[i], re[j]] = [re[j], re[i]];
    [im[i], im[j]] = [im[j], im[i]];
  }
  for (let size = 2; size <= n; size <<= 1) {
    const angle = (inverse ? 2 : -2) * Math.PI / size;
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < size / 2; k++) {
        const wr = Math.cos(angle * k);
        const wi = Math.sin(angle * k);
        const a = start + k;
        const b = a + size / 2;
        const tr = re[b] * wr - im[b] * wi;
        const ti = re[b] * wi + im[b] * wr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
      }
    }
  }
  if (!inverse) return;
  for (let i = 0; i < n; i++) {
    re[i] /= n;
    im[i] /= n;
  }
}

function spectrum(vector: Vector): [Float64Array, Float64Array] {
  const re = Float64Array.from(vector);
  const im = new Float64Array(vector.length);
  fft(re, im, false);
  return [re, im];
}

// Circular convolution (binding) multiplies spectra; circular correlation
// (unbinding) multiplies by the cue's conjugate, Plate's approximate inverse.
function combine(a: Vector, b: Vector, isUnbinding: boolean): Vector {
  const [aRe, aIm] = spectrum(a);
  const [bRe, bIm] = spectrum(b);
  const sign = isUnbinding ? -1 : 1;
  const re = new Float64Array(a.length);
  const im = new Float64Array(a.length);
  for (let i = 0; i < a.length; i++) {
    re[i] = aRe[i] * bRe[i] - aIm[i] * sign * bIm[i];
    im[i] = aRe[i] * sign * bIm[i] + aIm[i] * bRe[i];
  }
  fft(re, im, true);
  return re;
}

const pairCache = new Map<string, Vector>();
function bindNamed(roleName: string, wordName: string, length: number): Vector {
  const key = `${roleName}|${wordName}|${length}`;
  const cached = pairCache.get(key);
  if (cached) return cached;
  const pair = combine(randomVector(roleName, length), randomVector(wordName, length), false);
  pairCache.set(key, pair);
  return pair;
}
const unbind = (trace: Vector, role: Vector): Vector => combine(trace, role, true);

function addInto(total: Vector, part: Vector): void {
  for (let i = 0; i < total.length; i++) total[i] += part[i];
}

function cosine(a: Vector, b: Vector): number {
  let dot = 0;
  let aa = 0;
  let bb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    aa += a[i] * a[i];
    bb += b[i] * b[i];
  }
  return aa && bb ? dot / Math.sqrt(aa * bb) : 0;
}

// Zeroes a fixed random share of the numbers: the same ones each time for a
// given share, so dragging the slider back restores the answer.
function wipe(trace: Vector, share: number): void {
  const next = seededRandom(hashOf(`wipe:${trace.length}`));
  for (let i = 0; i < trace.length; i++) if (next() < share) trace[i] = 0;
}

function pressOnly(buttons: HTMLButtonElement[], chosen: HTMLButtonElement): void {
  for (const button of buttons) {
    const isOn = button === chosen;
    button.classList.toggle('is-on', isOn);
    button.setAttribute('aria-pressed', String(isOn));
  }
}

export function initHrr(root: HTMLElement): void {
  const bars = root.querySelector<HTMLElement>('#mli-hrr-bars');
  const answer = root.querySelector<HTMLElement>('#mli-hrr-answer');
  const contrast = root.querySelector<HTMLElement>('#mli-hrr-contrast');
  const lengthSlider = root.querySelector<HTMLInputElement>('#mli-hrr-n');
  const extraSlider = root.querySelector<HTMLInputElement>('#mli-hrr-x');
  const wipeSlider = root.querySelector<HTMLInputElement>('#mli-hrr-w');
  const sentenceButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-sentence]')];
  const roleButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-role]')];
  if (!bars || !answer || !contrast || !lengthSlider || !extraSlider || !wipeSlider) return;

  const roles: Role[] = JSON.parse(root.dataset.roles ?? '[]');
  const sentences: Sentence[] = JSON.parse(root.dataset.sentences ?? '[]');
  const [firstContrast, secondContrast]: number[] = JSON.parse(root.dataset.contrast ?? '[0, 1]');
  const lengths: number[] = JSON.parse(root.dataset.lengths ?? '[512]');
  if (!roles.length || !sentences.length) return;
  const words = [...new Set(sentences.flatMap((sentence) => roles.map((role) => sentence[role.key])))];
  let sentenceAt = 0;
  let roleAt = 0;

  const show = (id: string, text: string): void => {
    const value = root.querySelector<HTMLElement>(id);
    if (value) value.textContent = text;
  };

  // role ⊛ word, added up for every role, plus `extra` unrelated pairs.
  const store = (sentence: Sentence, length: number, extra: number): Vector => {
    const trace = new Float64Array(length);
    for (const role of roles) addInto(trace, bindNamed(`role:${role.key}`, `word:${sentence[role.key]}`, length));
    for (let i = 0; i < extra; i++) addInto(trace, bindNamed(`extra-role:${i}`, `extra-word:${i}`, length));
    return trace;
  };

  // Adding the words without binding them to roles loses who did what:
  // swapped sentences come out identical.
  const showContrast = (length: number): void => {
    const pair = [sentences[firstContrast], sentences[secondContrast]];
    const bag = pair.map((sentence) => {
      const sum = new Float64Array(length);
      for (const role of roles) addInto(sum, randomVector(`word:${sentence[role.key]}`, length));
      return sum;
    });
    const bound = pair.map((sentence) => store(sentence, length, 0));
    contrast.textContent = `"${pair[0].text}" vs "${pair[1].text}": words just added, similarity ${cosine(bag[0], bag[1]).toFixed(2)}; words bound to roles, ${cosine(bound[0], bound[1]).toFixed(2)}.`;
  };

  const render = (): void => {
    const length = lengths[Number(lengthSlider.value)];
    const extra = Number(extraSlider.value);
    const wipedShare = Number(wipeSlider.value) / 100;
    show('#mli-hrr-n-v', String(length));
    show('#mli-hrr-x-v', String(extra));
    show('#mli-hrr-w-v', `${Math.round(wipedShare * 100)}%`);
    lengthSlider.setAttribute('aria-valuetext', String(length));
    wipeSlider.setAttribute('aria-valuetext', `${Math.round(wipedShare * 100)}%`);

    const sentence = sentences[sentenceAt];
    const role = roles[roleAt];
    const trace = store(sentence, length, extra);
    wipe(trace, wipedShare);
    const echo = unbind(trace, randomVector(`role:${role.key}`, length));
    const ranked = words
      .map((word) => ({ word, similarity: cosine(echo, randomVector(`word:${word}`, length)) }))
      .sort((a, b) => b.similarity - a.similarity);
    const [best, runnerUp] = ranked;
    const isRight = best.word === sentence[role.key];

    bars.replaceChildren(...ranked.map((entry, i) => {
      const row = document.createElement('div');
      row.className = i === 0 ? 'mli-nn-bar mli-top' : 'mli-nn-bar';
      const word = document.createElement('b');
      word.textContent = entry.word;
      const track = document.createElement('div');
      track.className = 'mli-nn-track';
      const fill = document.createElement('div');
      fill.className = 'mli-nn-val';
      fill.style.width = `${Math.max(0, entry.similarity) * 100}%`;
      track.append(fill);
      const value = document.createElement('span');
      value.className = 'mli-dec-pct';
      value.textContent = entry.similarity.toFixed(2);
      row.append(word, track, value);
      return row;
    }));

    const verdict = isRight ? 'right' : `wrong: the stored word was ${sentence[role.key]}`;
    answer.textContent = `"${role.question}" Clean-up memory picks ${best.word} (${best.similarity.toFixed(2)}), ahead of ${runnerUp.word} (${runnerUp.similarity.toFixed(2)}). That's ${verdict}.`;
    answer.classList.toggle('is-wrong', !isRight);
    showContrast(length);
  };

  for (const button of sentenceButtons) {
    button.addEventListener('click', () => {
      sentenceAt = Number(button.dataset.sentence);
      pressOnly(sentenceButtons, button);
      render();
    });
  }
  for (const button of roleButtons) {
    button.addEventListener('click', () => {
      roleAt = Number(button.dataset.role);
      pressOnly(roleButtons, button);
      render();
    });
  }
  for (const slider of [lengthSlider, extraSlider, wipeSlider]) {
    slider.disabled = false;
    slider.addEventListener('input', render);
  }
  render();
}
