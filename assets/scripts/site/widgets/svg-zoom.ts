// Page-zoom correction for the /misc card bands. Safari multiplies pixel
// lengths in a CSS transform on an SVG element by the page zoom, so a zoomed
// page overshoots every slide in assets/css/pages/misc/motifs.css. A hidden
// probe slides 10px, we measure how far it really went, and --mf-px (which
// every pixel slide in motifs.css is multiplied by) divides the stretch back
// out. Unaffected browsers measure 1, and so would a fixed Safari.
// Turns and scales don't need this: they pivot on 0 0 (.pivot in motifs.css).

const SVG_NS = 'http://www.w3.org/2000/svg';
const PROBE_PX = 10;

let isListening = false;

function makeProbe(): { svg: SVGSVGElement; mark: SVGRectElement } {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:fixed;left:0;top:0;width:100px;height:100px;visibility:hidden;pointer-events:none';
  const mark = document.createElementNS(SVG_NS, 'rect');
  mark.setAttribute('width', '1');
  mark.setAttribute('height', '1');
  mark.style.transform = `translateX(${PROBE_PX}px)`;
  svg.appendChild(mark);
  return { svg, mark };
}

function measureStretch(): number {
  const { svg, mark } = makeProbe();
  document.body.appendChild(svg);
  const svgBox = svg.getBoundingClientRect();
  const userUnitPx = svgBox.width / 100;
  const movedPx = mark.getBoundingClientRect().left - svgBox.left;
  svg.remove();
  const stretch = movedPx / (PROBE_PX * userUnitPx);
  return Number.isFinite(stretch) && stretch > 0 ? stretch : 1;
}

function applyCorrection(): void {
  const stretch = measureStretch();
  const isOff = Math.abs(stretch - 1) > 0.01;
  document.documentElement.style.setProperty('--mf-px', isOff ? (1 / stretch).toFixed(4) : '1');
}

export function initSvgZoom(): void {
  if (!document.querySelector('.mf')) return;
  applyCorrection();
  if (isListening) return;
  isListening = true;
  // Safari reports a zoom change as a resize. Measuring is one probe, so no debounce.
  window.addEventListener('resize', () => {
    if (document.querySelector('.mf')) applyCorrection();
  });
}
