// {{< ml/memory-sampling >}}: a made-up memory trace (steps of MB over time),
// sampled every `interval` seconds from `offset`, as a script polling VmRSS
// would see it, against the true peak that VmHWM keeps.
// layouts/shortcodes/ml/memory-sampling.html works out the first settings the
// same way for JS off. Data: data/ml/memory-sampling.yaml.

import { svgElement } from './plot';

interface Config {
  seconds: number;
  steps: [number, number, number][];
  interval: number;
  offset: number;
}

export function initMemorySampling(root: HTMLElement): void {
  const config = JSON.parse(root.dataset.config ?? 'null') as Config | null;
  const intIn = root.querySelector<HTMLInputElement>('#mli-ms2-int');
  const offIn = root.querySelector<HTMLInputElement>('#mli-ms2-off');
  const dots = root.querySelector<SVGGElement>('#mli-ms2-dots');
  if (!config || !intIn || !offIn || !dots) return;
  const el = { intIn, offIn, dots };
  const n = (k: string): number => Number(root.dataset[k]);
  const [x0, x1, y0, y1, ymax] = [n('x0'), n('x1'), n('y0'), n('y1'), n('ymax')];
  const T = config.seconds;
  const steps = config.steps;
  const peak = Math.max(...steps.map((s) => s[2]));
  // Times are compared in hundredths of a second, so a check that lands on a
  // step boundary (6.0, 6.15, ...) is judged exactly, not after float drift.
  const cs = (s: number): number => Math.round(s * 100);
  const at = (tc: number): number => steps.find(([a, b]) => tc >= cs(a) && tc < cs(b))?.[2] ?? 0;
  const set = (id: string, text: string): void => {
    const node = root.querySelector(`#${id}`);
    if (node) node.textContent = text;
  };

  function render(): void {
    const interval = Number(el.intIn.value);
    const offset = Number(el.offIn.value);
    const circles: SVGCircleElement[] = [];
    let seen = 0;
    let count = 0;
    for (let tc = cs(offset); tc < cs(T); tc += cs(interval)) {
      const t = tc / 100;
      const v = at(tc);
      seen = Math.max(seen, v);
      count++;
      circles.push(svgElement('circle', { cx: x0 + ((x1 - x0) * t) / T, cy: y0 - ((y0 - y1) * v) / ymax, r: 4 }));
    }
    el.dots.replaceChildren(...circles);
    set('mli-ms2-n', String(count));
    set('mli-ms2-seen', `${seen} MB`);
    set('mli-ms2-hwm', `${peak} MB`);
    set('mli-ms2-miss', `${peak - seen} MB`);
    set('mli-ms2-int-out', `${interval.toFixed(1)} s`);
    set('mli-ms2-off-out', `${offset.toFixed(2)} s`);
    el.intIn.setAttribute('aria-valuetext', `${interval.toFixed(1)} seconds`);
    el.offIn.setAttribute('aria-valuetext', `${offset.toFixed(2)} seconds`);
  }

  for (const input of [el.intIn, el.offIn]) {
    input.disabled = false;
    input.addEventListener('input', render);
  }
  const controls = root.querySelector<HTMLElement>('#mli-ms2-controls');
  if (controls) controls.hidden = false;
  render();
}
