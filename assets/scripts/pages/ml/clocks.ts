// Two memories, two speeds: one signal fed into a fast and a slow exponential
// moving average, the structure Adam and the bacterial ribosome pools share.
// The environment flips between calm (long feasts and famines) and chaotic
// (fast flips); the slow memory keeps the old environment for a while after
// the switch. Starts on a prefilled history so the still frame tells the story.

import { PLOT_HEIGHT, PLOT_WIDTH, svgElement } from './plot';

const HISTORY = 240;
const FAST = 0.8;
const SLOW = 0.98;
const NOISE = 0.35;
const PERIOD = { calm: 90, chaos: 8 } as const;
const STEPS_PER_FRAME = 1;
const PREFILL_CALM = 70;
const DISAGREE_GAP = 0.3;

type Environment = keyof typeof PERIOD;

export function initClocks(root: HTMLElement): void {
  const plot = root.querySelector<SVGSVGElement>('#mli-clk-plot');
  const output = root.querySelector<HTMLElement>('#mli-clk-out');
  const playButton = root.querySelector<HTMLButtonElement>('#mli-clk-play');
  const envButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-clk-env]')];
  if (!plot || !output || !playButton || !envButtons.length) return;

  let environment: Environment = 'chaos';
  let sinceSwitch = 0;
  let fast = 0;
  let slow = 0;
  let isPlaying = false;
  const signal: number[] = [];
  const fastLine: number[] = [];
  const slowLine: number[] = [];

  const tick = (): void => {
    const sign = Math.floor(sinceSwitch / PERIOD[environment]) % 2 === 0 ? 1 : -1;
    const value = sign + (Math.random() * 2 - 1) * NOISE;
    fast = FAST * fast + (1 - FAST) * value;
    slow = SLOW * slow + (1 - SLOW) * value;
    sinceSwitch++;
    signal.push(value);
    fastLine.push(fast);
    slowLine.push(slow);
    if (signal.length > HISTORY) { signal.shift(); fastLine.shift(); slowLine.shift(); }
  };

  const toY = (value: number): number => PLOT_HEIGHT / 2 - value * (PLOT_HEIGHT * 0.38);
  const toX = (i: number): number => (i / (HISTORY - 1)) * PLOT_WIDTH;
  const polyline = (values: number[], className: string): SVGPolylineElement =>
    svgElement('polyline', { points: values.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' '), class: className });

  const render = (): void => {
    const dots = signal.map((v, i) => svgElement('circle', { cx: toX(i).toFixed(1), cy: toY(v).toFixed(1), r: 1.3, class: 'mli-clk-dot' }));
    const axis = svgElement('line', { x1: 0, x2: PLOT_WIDTH, y1: toY(0), y2: toY(0), class: 'mli-clk-axis' });
    plot.replaceChildren(axis, ...dots, polyline(slowLine, 'mli-clk-slow'), polyline(fastLine, 'mli-clk-fast'));
    const gap = Math.abs(fast - slow);
    output.textContent = gap > DISAGREE_GAP
      ? `The two memories disagree (gap ${gap.toFixed(2)}): something changed, and the slow one still remembers how it was.`
      : `The two memories agree (gap ${gap.toFixed(2)}): this environment has lasted long enough to be learned.`;
  };

  const setEnvironment = (next: Environment): void => {
    environment = next;
    sinceSwitch = 0;
    for (const button of envButtons) {
      const isOn = button.dataset.clkEnv === next;
      button.classList.toggle('is-on', isOn);
      button.setAttribute('aria-pressed', String(isOn));
    }
  };

  const frame = (): void => {
    if (!isPlaying || !root.isConnected) return;
    for (let k = 0; k < STEPS_PER_FRAME; k++) tick();
    render();
    requestAnimationFrame(frame);
  };

  for (const button of envButtons) {
    button.addEventListener('click', () => {
      setEnvironment(button.dataset.clkEnv as Environment);
      if (!isPlaying) {
        for (let k = 0; k < 60; k++) tick();
        render();
      }
    });
  }
  playButton.addEventListener('click', () => {
    isPlaying = !isPlaying;
    playButton.textContent = isPlaying ? 'Pause' : 'Play';
    if (isPlaying) requestAnimationFrame(frame);
  });

  for (let k = 0; k < HISTORY - PREFILL_CALM; k++) tick();
  setEnvironment('calm');
  for (let k = 0; k < PREFILL_CALM; k++) tick();
  root.querySelector<HTMLElement>('#mli-clk-controls')?.removeAttribute('hidden');
  render();
}
