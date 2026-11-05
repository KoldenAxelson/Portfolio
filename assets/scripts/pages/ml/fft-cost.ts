// {{< ml/fft-cost >}}: moves the marker and readout along the server-drawn
// N² vs N · log₂ N chart, from a slider or from hovering the chart. Geometry
// comes from data attributes on the root so it matches the template.

const fmt = (n: number): string => n.toLocaleString('en-US');

// Illustrative: one operation per nanosecond. Three significant figures, so the
// two times keep the ratio shown beside them. layouts/shortcodes/ml/fft-cost.html
// formats the no-JS readout the same way; keep the two in step.
const UNITS: [number, string][] = [[3600e9, 'h'], [60e9, 'min'], [1e9, 's'], [1e6, 'ms'], [1e3, 'µs'], [1, 'ns']];
function duration(ns: number): string {
  const [size, unit] = UNITS.find(([unitNs]) => ns >= unitNs) ?? [1, 'ns'];
  return `${fmt(Number((ns / size).toPrecision(3)))} ${unit}`;
}

export function initFftCost(root: HTMLElement): void {
  const range = root.querySelector<HTMLInputElement>('#mli-fc-range');
  const hit = root.querySelector<SVGRectElement>('#mli-fc-hit');
  const svg = root.querySelector<SVGSVGElement>('#mli-fc-svg');
  const cross = root.querySelector<SVGLineElement>('#mli-fc-cross');
  const dotD = root.querySelector<SVGCircleElement>('#mli-fc-dot-d');
  const dotF = root.querySelector<SVGCircleElement>('#mli-fc-dot-f');
  const out = (id: string): HTMLElement | null => root.querySelector<HTMLElement>(`#mli-fc-${id}`);
  const nOut = out('n');
  const dOut = out('d');
  const fOut = out('f');
  const rOut = out('r');
  const tOut = out('t');
  const controls = out('controls');
  if (!range || !hit || !svg || !cross || !dotD || !dotF || !nOut || !dOut || !fOut || !rOut || !tOut) return;
  const rangeEl: HTMLInputElement = range;
  const el = { cross, dotD, dotF, n: nOut, d: dOut, f: fOut, r: rOut, t: tOut };
  const svgEl: SVGSVGElement = svg;

  const num = (key: string): number => Number(root.dataset[key]);
  const x0 = num('x0');
  const x1 = num('x1');
  const y0 = num('y0');
  const y1 = num('y1');
  const kmax = num('kmax');
  const lmax = num('lmax');
  const xAt = (k: number): number => x0 + ((x1 - x0) * (k - 1)) / (kmax - 1);
  const yAt = (value: number): number => y0 - ((y0 - y1) * Math.log10(value)) / lmax;

  function show(k: number): void {
    const n = 2 ** k;
    const direct = n * n;
    const fast = n * k;
    const x = xAt(k);
    el.cross.setAttribute('x1', String(x));
    el.cross.setAttribute('x2', String(x));
    el.dotD.setAttribute('cx', String(x));
    el.dotD.setAttribute('cy', String(yAt(direct)));
    el.dotF.setAttribute('cx', String(x));
    el.dotF.setAttribute('cy', String(yAt(fast)));
    el.n.textContent = fmt(n);
    el.d.textContent = fmt(direct);
    el.f.textContent = fmt(fast);
    const ratio = direct / fast;
    el.r.textContent = `${ratio < 10 ? ratio.toFixed(1).replace(/\.0$/, '') : fmt(Math.round(ratio))}×`;
    el.t.textContent = `${duration(direct)} against ${duration(fast)}`;
    rangeEl.value = String(k);
    rangeEl.setAttribute('aria-valuetext', fmt(n));
  }

  rangeEl.disabled = false;
  rangeEl.addEventListener('input', () => show(Number(rangeEl.value)));

  hit.addEventListener('pointermove', (event) => {
    const box = svgEl.getBoundingClientRect();
    const viewX = ((event.clientX - box.left) / box.width) * svgEl.viewBox.baseVal.width;
    const k = Math.min(kmax, Math.max(1, Math.round(1 + ((viewX - x0) / (x1 - x0)) * (kmax - 1))));
    show(k);
  });

  if (controls) controls.hidden = false;
  show(Number(rangeEl.value));
}
