// {{< ml/merge-symmetry >}}: a made-up model, output = w1 × w2 × input,
// trained (real gradient descent) to double its input. Flipping both weights'
// signs gives the same model, so there are two equally good valleys. The demo
// trains two runs, averages their weights, and can flip run B first.
// layouts/shortcodes/ml/merge-symmetry.html trains the first pair the same
// way for JS off; keep the two in step. Config comes from
// data/ml/merge-symmetry.yaml.

type Vec = [number, number];

interface Config {
  target: number;
  steps: number;
  rate: number;
  pairs: { name: string; starts: Vec[] }[];
}

function train(start: Vec, config: Config): Vec[] {
  let [w1, w2] = start;
  const path: Vec[] = [[w1, w2]];
  for (let i = 0; i < config.steps; i++) {
    const error = w1 * w2 - config.target;
    [w1, w2] = [w1 - config.rate * error * w2, w2 - config.rate * error * w1];
    path.push([w1, w2]);
  }
  return path;
}

const fmt = (v: number): string => (v < 0 ? `−${(-v).toFixed(2)}` : v.toFixed(2));

export function initMergeSymmetry(root: HTMLElement): void {
  const config = JSON.parse(root.dataset.config ?? 'null') as Config | null;
  const flip = root.querySelector<HTMLButtonElement>('#mli-ms-flip');
  const say = root.querySelector<HTMLElement>('#mli-ms-say');
  if (!config || !flip || !say) return;
  const flipButton: HTMLButtonElement = flip;
  const sayEl: HTMLElement = say;
  const target = config.target;
  const q = <T extends Element>(id: string): T | null => root.querySelector<T>(`#${id}`);
  const scale = Number(root.dataset.scale);
  const o = Number(root.dataset.origin);
  const px = ([x, y]: Vec): Vec => [o + scale * x, o - scale * y];
  const set = (el: Element | null, attrs: Record<string, string | number>): void => {
    if (el) for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  };

  const runs = config.pairs.map((p) => p.starts.map((s) => train(s, config)));
  const state = { pair: 0, flipped: false };

  function update(): void {
    const [pathA, pathB] = runs[state.pair];
    const a = pathA[pathA.length - 1];
    const b = pathB[pathB.length - 1];
    const bUsed: Vec = state.flipped ? [-b[0], -b[1]] : b;
    const avg: Vec = [(a[0] + bUsed[0]) / 2, (a[1] + bUsed[1]) / 2];
    [pathA, pathB].forEach((path, i) => {
      set(q(`mli-ms-path-${i}`), { points: path.map((p) => px(p).map((v) => v.toFixed(1)).join(',')).join(' ') });
      const [x, y] = px(path[path.length - 1]);
      set(q(`mli-ms-dot-${i}`), { cx: x, cy: y });
      set(q(`mli-ms-lab-${i}`), { x: x + 8, y: y + 4 });
      const out = q<HTMLElement>(`mli-ms-out-${i}`);
      if (out) out.textContent = fmt(path[path.length - 1][0] * path[path.length - 1][1]);
    });
    const flipDot = q<SVGCircleElement>('mli-ms-flipdot');
    if (flipDot) {
      const [fx, fy] = px(bUsed);
      set(flipDot, { cx: fx, cy: fy });
      if (state.flipped) flipDot.removeAttribute('hidden');
      else flipDot.setAttribute('hidden', '');
    }
    const [mx, my] = px(avg);
    set(q('mli-ms-avg'), { x: mx - 6, y: my - 6, transform: `rotate(45 ${mx} ${my})` });
    set(q('mli-ms-avglab'), { x: mx - 10, y: my + 18 });
    const output = avg[0] * avg[1];
    const avgOut = q<HTMLElement>('mli-ms-out-avg');
    if (avgOut) avgOut.textContent = fmt(output);
    const sameValley = Math.sign(a[0]) === Math.sign(b[0]);
    const good = Math.abs(output - target) < 0.25;
    sayEl.textContent = state.flipped
      ? sameValley
        ? `Flipping B moved it to the other valley, away from A, so now the average is ${good ? 'still fine by luck' : 'the broken one'}: it outputs ${fmt(output)}.`
        : `B flipped (the hollow dot) is the same model, now in A's valley, so the average works again: it outputs ${fmt(output)}.`
      : sameValley
        ? `Both runs ended in the same valley, so their average is still a good model: it outputs ${fmt(output)}.`
        : `The runs ended in opposite valleys. Each model works, but their average lands between the valleys and outputs ${fmt(output)} instead of ${fmt(target)}.`;
    flipButton.classList.toggle('is-on', state.flipped);
    flipButton.setAttribute('aria-pressed', String(state.flipped));
  }

  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-pair]'));
  for (const button of buttons) {
    button.disabled = false;
    button.addEventListener('click', () => {
      state.pair = Number(button.dataset.pair);
      state.flipped = false;
      for (const b of buttons) {
        b.classList.toggle('is-on', b === button);
        b.setAttribute('aria-pressed', String(b === button));
      }
      update();
    });
  }
  flipButton.disabled = false;
  flipButton.addEventListener('click', () => {
    state.flipped = !state.flipped;
    update();
  });
  const controls = q<HTMLElement>('mli-ms-controls');
  if (controls) controls.hidden = false;
  update();
}
