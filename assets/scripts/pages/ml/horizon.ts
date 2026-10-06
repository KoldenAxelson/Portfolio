// METR time horizons on a log scale: each model's task length (in skilled-human
// minutes) at a chosen success rate, plus the doubling trend through the
// frontier models. The trend is fitted the way METR fits it: log2(horizon)
// against release date over frontier models from fit_from on, leaving out 50%
// estimates above fit_max minutes. Data: data/ml/horizons.yaml via data-models.
//
// The 95% level is our extrapolation, not METR's. METR fits a logistic in
// log2(task length) per model; its 50% and 80% points pin the slope, and the
// same curve is read off at 95%.

import { svgElement } from './plot';

interface Model {
  name: string;
  released: string;
  frontier: boolean;
  p50: number;
  p50_ci: [number, number];
  p80: number;
  p80_ci: [number, number];
}

type Level = 50 | 80 | 95;

const DAY_MS = 86_400_000;
const MONTH_DAYS = 30.44;
const X_START = Date.UTC(2023, 0, 1);
const X_END = Date.UTC(2026, 6, 1);
const Y_MIN = 1 / 12;
const Y_MAX = 72 * 60;
const UNRELIABLE_MIN = 16 * 60;
const Y_TICKS: [number, string][] = [[1 / 6, '10 sec'], [1, '1 min'], [10, '10 min'], [60, '1 hr'], [480, '8 hr'], [2880, '48 hr']];
const YEARS = [2023, 2024, 2025, 2026];
const PAD = { left: 50, right: 14, top: 12, bottom: 26 };
// Direct labels: a few landmarks, placed clear of their neighbours.
const LABELS: Record<string, { text: string; anchor: 'start' | 'end'; dx: number; dy: number; narrow?: boolean }> = {
  'GPT-4': { text: 'GPT-4', anchor: 'start', dx: 8, dy: -6 },
  o1: { text: 'o1', anchor: 'end', dx: -8, dy: -6 },
  'GPT-5': { text: 'GPT-5', anchor: 'end', dx: -8, dy: -6 },
  'Claude Opus 4.6': { text: 'Claude Opus 4.6', anchor: 'end', dx: -8, dy: -4, narrow: true },
  'Claude Mythos Preview (early)': { text: 'Mythos Preview', anchor: 'end', dx: -8, dy: -6 },
};

function horizon(model: Model, level: Level): number {
  if (level === 50) return model.p50;
  if (level === 80) return model.p80;
  const slope = Math.log(4) / Math.log2(model.p50 / model.p80);
  return model.p50 * 2 ** (-Math.log(19) / slope);
}

function interval(model: Model, level: Level): [number, number] | null {
  if (level === 50) return model.p50_ci;
  if (level === 80) return model.p80_ci;
  return null;
}

function formatMinutes(minutes: number): string {
  if (minutes < 1) return `${Math.round(minutes * 60)} sec`;
  if (minutes < 59.5) return `${Math.round(minutes)} min`;
  const total = Math.round(minutes);
  if (total >= 600) return `${Math.round(total / 60)} hr`;
  const mins = total % 60;
  return mins ? `${Math.floor(total / 60)} hr ${mins} min` : `${total / 60} hr`;
}

function monthYear(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

// Least squares of log2(minutes) on days; returns [intercept, slope per day].
function fitTrend(points: { day: number; minutes: number }[]): [number, number] {
  const n = points.length;
  const meanX = points.reduce((sum, p) => sum + p.day, 0) / n;
  const meanY = points.reduce((sum, p) => sum + Math.log2(p.minutes), 0) / n;
  const slope = points.reduce((sum, p) => sum + (p.day - meanX) * (Math.log2(p.minutes) - meanY), 0) / points.reduce((sum, p) => sum + (p.day - meanX) ** 2, 0);
  return [meanY - slope * meanX, slope];
}

export function initHorizon(root: HTMLElement): void {
  const plot = root.querySelector<SVGSVGElement>('#mli-hz-plot');
  const wrap = root.querySelector<HTMLElement>('.mli-hz-wrap');
  const tip = root.querySelector<HTMLElement>('#mli-hz-tip');
  const doubling = root.querySelector<HTMLElement>('#mli-hz-double');
  const reference = root.querySelector<HTMLElement>('#mli-hz-ref');
  const referenceLabel = root.querySelector<HTMLElement>('#mli-hz-ref-lab');
  const caption = root.querySelector<HTMLElement>('#mli-hz-cap');
  const levelButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-level]')];
  if (!plot || !wrap || !tip || !doubling || !reference || !referenceLabel || !caption || !levelButtons.length) return;

  const models: Model[] = JSON.parse(root.dataset.models ?? '[]');
  const fitFrom = Date.parse(root.dataset.fitFrom ?? '2023-01-01');
  const fitMax = Number(root.dataset.fitMax ?? UNRELIABLE_MIN);
  const referenceName = root.dataset.reference ?? '';
  const referenceModel = models.find((model) => model.name === referenceName);
  const fitSet = models.filter((model) => model.frontier && Date.parse(model.released) >= fitFrom && model.p50 <= fitMax);
  let level: Level = 50;

  const hideTip = (): void => {
    tip.hidden = true;
  };

  const showTip = (model: Model, x: number, y: number): void => {
    const range = interval(model, level);
    tip.replaceChildren(
      Object.assign(document.createElement('b'), { textContent: model.name }),
      ` · ${monthYear(model.released)}`,
      document.createElement('br'),
      `${formatMinutes(horizon(model, level))} at ${level}%`,
      range ? ` (95% CI ${formatMinutes(range[0])}–${formatMinutes(range[1])})` : ', extrapolated',
    );
    tip.hidden = false;
    const left = Math.min(Math.max(x - tip.offsetWidth / 2, 0), wrap.clientWidth - tip.offsetWidth);
    tip.style.left = `${left}px`;
    tip.style.top = `${Math.max(y - tip.offsetHeight - 12, 0)}px`;
  };

  const draw = (): void => {
    const width = Math.max(wrap.clientWidth, 280);
    const height = width < 480 ? 300 : 340;
    const narrow = width < 480;
    plot.setAttribute('viewBox', `0 0 ${width} ${height}`);
    plot.setAttribute('width', String(width));
    plot.setAttribute('height', String(height));
    const innerW = width - PAD.left - PAD.right;
    const innerH = height - PAD.top - PAD.bottom;
    const xOf = (ms: number): number => PAD.left + ((ms - X_START) / (X_END - X_START)) * innerW;
    const yOf = (minutes: number): number => {
      const clamped = Math.min(Math.max(minutes, Y_MIN), Y_MAX);
      return PAD.top + (1 - (Math.log(clamped) - Math.log(Y_MIN)) / (Math.log(Y_MAX) - Math.log(Y_MIN))) * innerH;
    };

    const nodes: SVGElement[] = [];
    // METR's ceiling: above 16 hours its task suite can't measure reliably.
    const bandBottom = yOf(UNRELIABLE_MIN);
    nodes.push(svgElement('rect', { class: 'mli-hz-band', x: PAD.left, y: PAD.top, width: innerW, height: bandBottom - PAD.top }));
    const bandLabel = svgElement('text', { class: 'mli-hz-note', x: PAD.left + 6, y: PAD.top + 13 });
    bandLabel.textContent = narrow ? 'Above 16 hr: unreliable' : 'Above 16 hr: METR says its tasks can’t measure this reliably';
    nodes.push(bandLabel);

    for (const [minutes, label] of Y_TICKS) {
      const y = yOf(minutes);
      nodes.push(svgElement('line', { class: minutes === 480 ? 'mli-hz-guide' : 'mli-hz-grid', x1: PAD.left, x2: width - PAD.right, y1: y, y2: y }));
      const text = svgElement('text', { class: 'mli-hz-axis', x: PAD.left - 6, y: y + 3.5, 'text-anchor': 'end' });
      text.textContent = label;
      nodes.push(text);
    }
    const workday = svgElement('text', { class: 'mli-hz-note', x: PAD.left + 6, y: yOf(480) + 13 });
    workday.textContent = 'a workday';
    nodes.push(workday);
    for (const year of YEARS) {
      const x = xOf(Date.UTC(year, 0, 1));
      nodes.push(svgElement('line', { class: 'mli-hz-grid', x1: x, x2: x, y1: height - PAD.bottom, y2: height - PAD.bottom + 4 }));
      const text = svgElement('text', { class: 'mli-hz-axis', x, y: height - PAD.bottom + 16, 'text-anchor': 'middle' });
      text.textContent = String(year);
      nodes.push(text);
    }

    const [intercept, slope] = fitTrend(fitSet.map((model) => ({ day: Date.parse(model.released) / DAY_MS, minutes: horizon(model, level) })));
    const trendAt = (ms: number): number => 2 ** (intercept + slope * (ms / DAY_MS));
    nodes.push(svgElement('line', { class: 'mli-hz-trend', x1: xOf(X_START), y1: yOf(trendAt(X_START)), x2: xOf(X_END), y2: yOf(trendAt(X_END)) }));

    for (const model of models) {
      const range = interval(model, level);
      if (!range) continue;
      const x = xOf(Date.parse(model.released));
      nodes.push(svgElement('line', { class: 'mli-hz-ci', x1: x, x2: x, y1: yOf(range[0]), y2: yOf(range[1]) }));
    }
    for (const model of models) {
      const value = horizon(model, level);
      const x = xOf(Date.parse(model.released));
      const y = yOf(value);
      nodes.push(svgElement('circle', { class: model.frontier ? 'mli-hz-dot is-frontier' : 'mli-hz-dot', cx: x, cy: y, r: 4.5 }));
      const label = LABELS[model.name];
      if (label && (!narrow || label.narrow)) {
        const text = svgElement('text', { class: 'mli-hz-label', x: x + label.dx, y: y + label.dy, 'text-anchor': label.anchor });
        text.textContent = label.text;
        nodes.push(text);
      }
      const hit = svgElement('circle', { class: 'mli-hz-hit', cx: x, cy: y, r: 11, tabindex: 0, role: 'img', 'aria-label': `${model.name}, ${monthYear(model.released)}: ${formatMinutes(value)} at ${level}%` });
      hit.addEventListener('pointerenter', () => showTip(model, x, y));
      hit.addEventListener('focus', () => showTip(model, x, y));
      hit.addEventListener('pointerleave', hideTip);
      hit.addEventListener('blur', hideTip);
      nodes.push(hit);
    }
    plot.replaceChildren(...nodes);

    const months = 1 / slope / MONTH_DAYS;
    doubling.textContent = `${months.toFixed(1)} months`;
    const referenceValue = referenceModel ? horizon(referenceModel, level) : 0;
    reference.textContent = referenceModel ? formatMinutes(referenceValue) : '–';
    referenceLabel.textContent = `${referenceName} at ${level}%`;
    if (!referenceModel) return;
    if (level === 50) {
      caption.textContent = `Half the time, ${referenceName} finishes software tasks that take a skilled person about ${formatMinutes(referenceValue)}. The leaders' line doubles every ${months.toFixed(1)} months.`;
    } else if (level === 80) {
      caption.textContent = `Ask for 80% and the same model tops out around ${formatMinutes(referenceValue)}, against ${formatMinutes(referenceModel.p50)} at 50%. The line climbs at a similar pace, just much lower.`;
    } else {
      caption.textContent = `At 95%, its curve reads about ${formatMinutes(referenceValue)}. METR doesn't measure this: it's each model's own curve, extended past the data.`;
    }
  };

  for (const button of levelButtons) {
    button.addEventListener('click', () => {
      level = Number(button.dataset.level) as Level;
      for (const other of levelButtons) {
        other.classList.toggle('is-on', other === button);
        other.setAttribute('aria-pressed', String(other === button));
      }
      hideTip();
      draw();
    });
  }
  let drawnWidth = 0;
  const redrawIfResized = (): void => {
    if (wrap.clientWidth === drawnWidth) return;
    drawnWidth = wrap.clientWidth;
    draw();
  };
  if ('ResizeObserver' in window) new ResizeObserver(redrawIfResized).observe(wrap);
  redrawIfResized();
}
