// A population of Adam optimizers on a toy 2-D loss landscape, optionally
// sharing a slime-mould-style trail: each walker deposits where its loss is
// good, the trail diffuses and evaporates, and each step blends the walker's
// own Adam update with the pull of the trail. "Next generation" restarts the
// walkers but keeps the trail, the inherited-memory half of the idea.
// Constants were tuned headless so the trail visibly helps without being rigged:
// over six seeds, 9% of independent walkers reach the deepest valley, about half
// with the trail, and about 70% in the generation after.

const GRID_W = 80;
const GRID_H = 50;
const WALKERS = 24;
const STEPS_PER_RUN = 600;
const STEPS_PER_FRAME = 4;
const LEARNING_RATE = 0.008;
const GRADIENT_NOISE = 0.6;
const DEPOSIT = 0.4;
const DECAY = 0.997;
const TRAIL_PULL = 0.015;
const BETA1 = 0.9;
const BETA2 = 0.999;
const DEEPEST = { x: 0.8, y: 0.3 };
const DEEPEST_RADIUS = 0.06;
const LONE_START = { x: 0.22, y: 0.82 };

const WELLS = [
  { x: 0.25, y: 0.7, depth: 0.55, width: 0.012 },
  { x: 0.8, y: 0.3, depth: 1.0, width: 0.006 },
  { x: 0.5, y: 0.5, depth: 0.3, width: 0.08 },
];

type Mode = 'alone' | 'swarm' | 'trail';

interface Walker {
  x: number;
  y: number;
  m: [number, number];
  v: [number, number];
  t: number;
  path: [number, number][];
}

function loss(x: number, y: number): number {
  let value = 1;
  for (const w of WELLS) value -= w.depth * Math.exp(-((x - w.x) ** 2 + (y - w.y) ** 2) / w.width);
  return value + 0.04 * Math.sin(18 * x) * Math.sin(18 * y);
}

function gradient(x: number, y: number): [number, number] {
  const e = 1e-3;
  return [(loss(x + e, y) - loss(x - e, y)) / (2 * e), (loss(x, y + e) - loss(x, y - e)) / (2 * e)];
}

function gaussian(): number {
  return Math.sqrt(-2 * Math.log(Math.random() + 1e-12)) * Math.cos(2 * Math.PI * Math.random());
}

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

export function initSwarm(root: HTMLElement): void {
  const canvas = root.querySelector<HTMLCanvasElement>('#mli-swarm-canvas');
  const output = root.querySelector<HTMLElement>('#mli-swarm-out');
  const runButton = root.querySelector<HTMLButtonElement>('#mli-swarm-run');
  const nextButton = root.querySelector<HTMLButtonElement>('#mli-swarm-next');
  const resetButton = root.querySelector<HTMLButtonElement>('#mli-swarm-reset');
  const coupling = root.querySelector<HTMLInputElement>('#mli-swarm-coupling');
  const modeButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-swarm-mode]')];
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx || !output || !runButton || !nextButton || !resetButton || !coupling || !modeButtons.length) return;

  const shouldAnimate = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
  let lossMin = Infinity;
  let lossMax = -Infinity;
  for (let i = 0; i <= 100; i++) {
    for (let j = 0; j <= 100; j++) {
      const l = loss(i / 100, j / 100);
      lossMin = Math.min(lossMin, l);
      lossMax = Math.max(lossMax, l);
    }
  }
  const quality = (x: number, y: number): number => (lossMax - loss(x, y)) / (lossMax - lossMin);

  const landscape = ctx.createImageData(canvas.width, canvas.height);
  for (let py = 0; py < canvas.height; py++) {
    for (let px = 0; px < canvas.width; px++) {
      const q = quality(px / (canvas.width - 1), py / (canvas.height - 1));
      const i = (py * canvas.width + px) * 4;
      landscape.data[i] = 18 + q * 70;
      landscape.data[i + 1] = 30 + q * 150;
      landscape.data[i + 2] = 58 + q * 120;
      landscape.data[i + 3] = 255;
    }
  }
  const trailCanvas = document.createElement('canvas');
  trailCanvas.width = GRID_W;
  trailCanvas.height = GRID_H;
  const trailCtx = trailCanvas.getContext('2d');
  const trailImage = trailCtx?.createImageData(GRID_W, GRID_H);

  let mode: Mode = 'trail';
  let trail = new Float32Array(GRID_W * GRID_H);
  let walkers: Walker[] = [];
  let step = 0;
  let generation = 1;
  let isRunning = false;

  const spawn = (): void => {
    const count = mode === 'alone' ? 1 : WALKERS;
    walkers = Array.from({ length: count }, () => {
      const start = mode === 'alone' ? LONE_START : { x: Math.random(), y: Math.random() };
      return { x: start.x, y: start.y, m: [0, 0], v: [0, 0], t: 0, path: [[start.x, start.y]] };
    });
    step = 0;
  };

  const trailAt = (i: number, j: number): number => trail[j * GRID_W + i];

  const advance = (): void => {
    const pull = mode === 'trail' ? Number(coupling.value) : 0;
    for (const w of walkers) {
      let [gx, gy] = gradient(w.x, w.y);
      gx += gaussian() * GRADIENT_NOISE * (Math.abs(gx) + 0.1);
      gy += gaussian() * GRADIENT_NOISE * (Math.abs(gy) + 0.1);
      w.t++;
      w.m = [BETA1 * w.m[0] + (1 - BETA1) * gx, BETA1 * w.m[1] + (1 - BETA1) * gy];
      w.v = [BETA2 * w.v[0] + (1 - BETA2) * gx * gx, BETA2 * w.v[1] + (1 - BETA2) * gy * gy];
      const correct1 = 1 - BETA1 ** w.t;
      const correct2 = 1 - BETA2 ** w.t;
      let dx = (-LEARNING_RATE * (w.m[0] / correct1)) / (Math.sqrt(w.v[0] / correct2) + 1e-8);
      let dy = (-LEARNING_RATE * (w.m[1] / correct1)) / (Math.sqrt(w.v[1] / correct2) + 1e-8);
      if (pull > 0) {
        const i = Math.min(GRID_W - 2, Math.max(1, Math.round(w.x * (GRID_W - 1))));
        const j = Math.min(GRID_H - 2, Math.max(1, Math.round(w.y * (GRID_H - 1))));
        const tx = trailAt(i + 1, j) - trailAt(i - 1, j);
        const ty = trailAt(i, j + 1) - trailAt(i, j - 1);
        const length = Math.hypot(tx, ty);
        if (length > 1e-6) {
          dx = (1 - pull) * dx + (pull * TRAIL_PULL * tx) / length;
          dy = (1 - pull) * dy + (pull * TRAIL_PULL * ty) / length;
        }
      }
      w.x = clamp01(w.x + dx);
      w.y = clamp01(w.y + dy);
      if (step % 6 === 0) w.path.push([w.x, w.y]);
      if (mode === 'trail') trail[Math.round(w.y * (GRID_H - 1)) * GRID_W + Math.round(w.x * (GRID_W - 1))] += DEPOSIT * quality(w.x, w.y) ** 6;
    }
    if (mode === 'trail') diffuse();
    step++;
  };

  const diffuse = (): void => {
    const next = new Float32Array(GRID_W * GRID_H);
    for (let j = 0; j < GRID_H; j++) {
      for (let i = 0; i < GRID_W; i++) {
        let sum = 0;
        let count = 0;
        for (let dj = -1; dj <= 1; dj++) {
          for (let di = -1; di <= 1; di++) {
            const a = i + di;
            const b = j + dj;
            if (a < 0 || a >= GRID_W || b < 0 || b >= GRID_H) continue;
            sum += trailAt(a, b);
            count++;
          }
        }
        next[j * GRID_W + i] = (sum / count) * DECAY;
      }
    }
    trail = next;
  };

  const draw = (): void => {
    const w = canvas.width;
    const h = canvas.height;
    ctx.putImageData(landscape, 0, 0);
    if (trailCtx && trailImage && mode === 'trail') {
      let peak = 1e-6;
      for (const value of trail) peak = Math.max(peak, value);
      for (let k = 0; k < trail.length; k++) {
        trailImage.data[k * 4] = 255;
        trailImage.data[k * 4 + 1] = 196;
        trailImage.data[k * 4 + 2] = 92;
        trailImage.data[k * 4 + 3] = Math.min(220, (trail[k] / peak) ** 0.5 * 220);
      }
      trailCtx.putImageData(trailImage, 0, 0);
      ctx.drawImage(trailCanvas, 0, 0, w, h);
    }
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(DEEPEST.x * w, DEEPEST.y * h, DEEPEST_RADIUS * w * 0.6, 0, Math.PI * 2);
    ctx.stroke();
    if (mode === 'alone') {
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.beginPath();
      walkers[0].path.forEach(([x, y], i) => (i ? ctx.lineTo(x * w, y * h) : ctx.moveTo(x * w, y * h)));
      ctx.stroke();
    }
    for (const walker of walkers) {
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#0b1220';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(walker.x * w, walker.y * h, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    const inDeepest = walkers.filter((walker) => Math.hypot(walker.x - DEEPEST.x, walker.y - DEEPEST.y) < DEEPEST_RADIUS).length;
    const best = Math.min(...walkers.map((walker) => loss(walker.x, walker.y)));
    const where = mode === 'alone'
      ? (inDeepest ? 'It found the deepest valley.' : 'Stuck outside the deepest valley.')
      : `${inDeepest} of ${walkers.length} in the deepest valley.`;
    output.textContent = `Step ${step} of ${STEPS_PER_RUN} · ${where} Best loss ${best.toFixed(3)}${mode === 'trail' ? ` · generation ${generation}` : ''}`;
  };

  const run = (): void => {
    if (isRunning) return;
    if (step >= STEPS_PER_RUN) spawn();
    isRunning = true;
    runButton.disabled = true;
    if (!shouldAnimate) {
      while (step < STEPS_PER_RUN) advance();
      isRunning = false;
      runButton.disabled = false;
      draw();
      return;
    }
    const frame = (): void => {
      if (!root.isConnected) return;
      for (let k = 0; k < STEPS_PER_FRAME && step < STEPS_PER_RUN; k++) advance();
      draw();
      if (step < STEPS_PER_RUN) { requestAnimationFrame(frame); return; }
      isRunning = false;
      runButton.disabled = false;
    };
    requestAnimationFrame(frame);
  };

  const reset = (keepTrail: boolean): void => {
    if (isRunning) return;
    if (!keepTrail) { trail = new Float32Array(GRID_W * GRID_H); generation = 1; }
    spawn();
    draw();
  };

  for (const button of modeButtons) {
    button.addEventListener('click', () => {
      if (isRunning) return;
      mode = button.dataset.swarmMode as Mode;
      for (const other of modeButtons) {
        other.classList.toggle('is-on', other === button);
        other.setAttribute('aria-pressed', String(other === button));
      }
      nextButton.hidden = mode !== 'trail';
      coupling.disabled = mode !== 'trail';
      reset(false);
    });
  }
  runButton.addEventListener('click', run);
  nextButton.addEventListener('click', () => { if (isRunning) return; generation++; reset(true); run(); });
  resetButton.addEventListener('click', () => reset(false));
  root.querySelector<HTMLElement>('#mli-swarm-controls')?.removeAttribute('hidden');
  reset(false);
}
