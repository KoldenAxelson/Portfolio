// {{< ml/task-vectors >}}: a made-up two-weight model, two made-up bowl
// tasks. Each task is fine-tuned from the base by real gradient descent; the
// result minus the base is its task vector. Sliders scale and add the two
// arrows, and the readout scores the merged weights on both tasks.
// layouts/shortcodes/ml/task-vectors.html does the same fine-tuning for the
// first scenario (JS off); keep the two in step. Config comes from
// data/ml/task-vectors.yaml.

import { svgElement } from './plot';

interface TaskSpec {
  center: [number, number];
  sharp: number;
  flat: number;
  angle: number;
}

interface Config {
  steps: number;
  rate: number;
  scenarios: { name: string; tasks: TaskSpec[] }[];
}

interface Task extends TaskSpec {
  h: [number, number, number]; // h00, h01, h11
  tuned: [number, number];
}

type Vec = [number, number];

function prepare(spec: TaskSpec, steps: number, rate: number): Task {
  const r = (spec.angle * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  const ia = 1 / spec.sharp ** 2;
  const ib = 1 / spec.flat ** 2;
  const h: [number, number, number] = [ia * c * c + ib * s * s, (ia - ib) * c * s, ia * s * s + ib * c * c];
  let x = 0;
  let y = 0;
  for (let i = 0; i < steps; i++) {
    const dx = x - spec.center[0];
    const dy = y - spec.center[1];
    x -= rate * (h[0] * dx + h[1] * dy);
    y -= rate * (h[1] * dx + h[2] * dy);
  }
  return { ...spec, h, tuned: [x, y] };
}

function loss(task: Task, [x, y]: Vec): number {
  const dx = x - task.center[0];
  const dy = y - task.center[1];
  return 0.5 * (task.h[0] * dx * dx + 2 * task.h[1] * dx * dy + task.h[2] * dy * dy);
}

// Share of the fine-tuning drop in loss that the point keeps (1 = all of it).
function kept(task: Task, point: Vec): number {
  const before = loss(task, [0, 0]);
  return (before - loss(task, point)) / (before - loss(task, task.tuned));
}

const fmtLambda = (v: number): string => (v < 0 ? `−${(-v).toFixed(1)}` : v.toFixed(1));

export function initTaskVectors(root: HTMLElement): void {
  const config = JSON.parse(root.dataset.config ?? 'null') as Config | null;
  const la = root.querySelector<HTMLInputElement>('#mli-tv-la');
  const lb = root.querySelector<HTMLInputElement>('#mli-tv-lb');
  const say = root.querySelector<HTMLElement>('#mli-tv-say');
  const angleOut = root.querySelector<HTMLElement>('#mli-tv-angle');
  const merged = root.querySelector<SVGRectElement>('#mli-tv-merged');
  const mergedLabel = root.querySelector<SVGTextElement>('#mli-tv-mlab');
  if (!config || !la || !lb || !say || !angleOut || !merged || !mergedLabel) return;
  const els = { la, lb, say, angleOut, merged, mergedLabel };
  const q = <T extends Element>(id: string): T | null => root.querySelector<T>(`#${id}`);

  const scale = Number(root.dataset.scale);
  const ox = Number(root.dataset.ox);
  const oy = Number(root.dataset.oy);
  const px = ([x, y]: Vec): Vec => [ox + scale * x, oy - scale * y];
  const set = (el: Element | null, attrs: Record<string, string | number>): void => {
    if (el) for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  };

  const scenarios = config.scenarios.map((s) => s.tasks.map((t) => prepare(t, config.steps, config.rate)));
  const state = { scenario: 0 };
  const names = ['A', 'B'];

  function drawBowls(tasks: Task[]): void {
    tasks.forEach((task, i) => {
      const bowl = q<SVGGElement>(`mli-tv-bowl-${i}`);
      if (!bowl) return;
      const [cx, cy] = px(task.center);
      bowl.setAttribute('transform', `translate(${cx} ${cy}) rotate(${-task.angle})`);
      bowl.replaceChildren(...[0.6, 1.2, 1.8, 2.4].map((k) => svgElement('ellipse', { rx: k * scale * task.sharp, ry: k * scale * task.flat })));
      const [tx, ty] = px(task.tuned);
      set(q(`mli-tv-ft-${i}`), { x2: tx, y2: ty });
      set(q(`mli-tv-ftdot-${i}`), { cx: tx, cy: ty });
      const right = tx > 290;
      set(q(`mli-tv-ftlab-${i}`), { x: right ? tx - 7 : tx + 7, y: ty - 9, 'text-anchor': right ? 'end' : 'start' });
    });
    const [a, b] = tasks.map((t) => t.tuned);
    const cos = (a[0] * b[0] + a[1] * b[1]) / (Math.hypot(...a) * Math.hypot(...b));
    els.angleOut.textContent = `${Math.round((Math.acos(cos) * 180) / Math.PI)}°`;
  }

  function describe(lambdas: number[], scores: number[]): string {
    const parts = lambdas.map((l, i) => (l === 0 ? '' : `${l < 0 ? '−' : '+'} ${Math.abs(l) === 1 ? '' : Math.abs(l).toFixed(1)}τ${names[i]}`)).filter(Boolean);
    const formula = parts.length ? `base ${parts.join(' ')}` : 'just the base';
    const verdicts = scores.map((k, i) => {
      const n = names[i];
      if (k >= 0.85) return `keeps most of fine-tuning's gain on ${n}`;
      if (k >= 0.15) return `keeps part of the gain on ${n}`;
      if (k >= -0.005) return `is about where the base was on ${n}`;
      return `is worse at ${n} than the base was`;
    });
    return `Merged = ${formula}. It ${verdicts.join(', and ')}.`;
  }

  // The live sentence is written on `change` (and on load or scenario switch),
  // not on every slider step, so screen readers aren't flooded while dragging.
  function update(speak = true): void {
    const tasks = scenarios[state.scenario];
    const lambdas = [Number(els.la.value), Number(els.lb.value)];
    const first: Vec = [lambdas[0] * tasks[0].tuned[0], lambdas[0] * tasks[0].tuned[1]];
    const point: Vec = [first[0] + lambdas[1] * tasks[1].tuned[0], first[1] + lambdas[1] * tasks[1].tuned[1]];
    const [fx, fy] = px(first);
    const [rx, ry] = px(point);
    // Off the chart: stop the marker where B's arrow leaves it (inset 8).
    let t = 1;
    for (const [from, to, lo, hi] of [[fx, rx, 8, 392], [fy, ry, 8, 292]] as const) {
      if (to < lo) t = Math.min(t, (lo - from) / (to - from));
      if (to > hi) t = Math.min(t, (hi - from) / (to - from));
    }
    const off = t < 1;
    const mx = fx + t * (rx - fx);
    const my = fy + t * (ry - fy);
    set(q('mli-tv-sum-0'), { x2: fx, y2: fy });
    set(q('mli-tv-sum-1'), { x1: fx, y1: fy, x2: mx, y2: my });
    q('mli-tv-sum-0')?.classList.toggle('is-off', lambdas[0] === 0);
    q('mli-tv-sum-1')?.classList.toggle('is-off', lambdas[1] === 0);
    set(els.merged, { x: mx - 6, y: my - 6, transform: `rotate(45 ${mx} ${my})` });
    const right = mx > 340;
    set(els.mergedLabel, { x: right ? mx - 10 : mx + 10, y: my < 24 ? my + 22 : my - 10, 'text-anchor': right ? 'end' : 'start' });
    els.mergedLabel.textContent = off ? 'Merged (off the chart)' : 'Merged';
    const scores = tasks.map((t) => kept(t, point));
    scores.forEach((k, i) => {
      const out = q<HTMLElement>(`mli-tv-kept-${i}`);
      if (out) out.textContent = `${Math.round(k * 100) === 0 ? 0 : Math.round(k * 100)}%`.replace('-', '−');
      const bar = q<HTMLElement>(`mli-tv-bar-${i}`);
      if (bar) bar.style.width = `${Math.max(0, Math.min(100, k * 100))}%`;
    });
    const laOut = q<HTMLElement>('mli-tv-la-out');
    const lbOut = q<HTMLElement>('mli-tv-lb-out');
    if (laOut) laOut.textContent = fmtLambda(lambdas[0]);
    if (lbOut) lbOut.textContent = fmtLambda(lambdas[1]);
    if (speak) els.say.textContent = describe(lambdas, scores);
  }

  for (const input of [els.la, els.lb]) {
    input.disabled = false;
    input.addEventListener('input', () => update(false));
    input.addEventListener('change', () => update());
  }
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-scenario]'));
  for (const button of buttons) {
    button.disabled = false;
    button.addEventListener('click', () => {
      state.scenario = Number(button.dataset.scenario);
      for (const b of buttons) {
        b.classList.toggle('is-on', b === button);
        b.setAttribute('aria-pressed', String(b === button));
      }
      drawBowls(scenarios[state.scenario]);
      update();
    });
  }
  const controls = q<HTMLElement>('mli-tv-controls');
  const sliders = q<HTMLElement>('mli-tv-sliders');
  if (controls) controls.hidden = false;
  if (sliders) sliders.hidden = false;
  drawBowls(scenarios[0]);
  update();
}
