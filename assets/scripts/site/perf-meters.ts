// Ring / bar meters. Originally colophon-only, now also driving the ancestry
// rings on /misc/genes — anything inside a [data-perf-meters] root with a
// [data-perf-panel] child gets swept.
//
// Two callers, two different starting states, and the difference is deliberate.
// /colophon renders its rings and numbers EMPTY and depends on this module to
// fill them, so with JS off the page shows zeros. /misc/genes renders the real
// dasharray and the real number into static HTML, and this module resets to zero
// and sweeps back up — same animation, but the data survives without a runtime,
// which is what Product Principle 1 asks for. The genes shape is the better one;
// colophon could adopt it whenever someone is in there.
//
// Each device panel (mobile / desktop) renders its score rings, vital bars, and
// ring numbers empty; this sweeps them up to their targets. The sweep is driven entirely by requestAnimationFrame — not CSS
// transitions — because Firefox doesn't reliably animate a two-value
// stroke-dasharray list, which left the rings stuck when toggling to a panel
// that started hidden. Re-runs from zero on every tab press, honors
// prefers-reduced-motion, idempotent across hx-boost swaps, and no-ops on every
// page except /colophon.

const DURATION_MS = 1100;
const easeOutCubic = (p: number): number => 1 - Math.pow(1 - p, 3);

let pmObserver: IntersectionObserver | null = null;
// Per-panel animation token: bumping it cancels an in-flight sweep so rapid
// toggling doesn't leave two rAF loops fighting over the same elements.
const tokens = new WeakMap<HTMLElement, number>();

export function initPerfMeters(): void {
  // Tear down any observer from the previous page (boost navigation).
  if (pmObserver) {
    pmObserver.disconnect();
    pmObserver = null;
  }

  const root = document.querySelector<HTMLElement>('[data-perf-meters]');
  if (!root) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const panels = Array.from(root.querySelectorAll<HTMLElement>('[data-perf-panel]'));
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-perf-toggle]'));
  const suffix = root.querySelector<HTMLElement>('[data-perf-suffix]');

  // Sweep a panel's meters from zero to their targets. Called fresh on each show,
  // so toggling tabs replays the animation.
  const animatePanel = (panel: HTMLElement | null): void => {
    if (!panel) return;

    const rings = Array.from(panel.querySelectorAll<SVGCircleElement>('[data-ring-target]'));
    const bars = Array.from(panel.querySelectorAll<HTMLElement>('[data-bar-target]'));
    const nums = Array.from(panel.querySelectorAll<SVGTextElement>('[data-num-target]'));

    // We write every frame ourselves, so suppress any CSS transition that would
    // otherwise double-animate (and lag) each step.
    rings.forEach((r) => { r.style.transition = 'none'; });
    bars.forEach((b) => { b.style.transition = 'none'; });

    const ringT = rings.map((r) => Number(r.dataset.ringTarget) || 0);
    const barT = bars.map((b) => Number(b.dataset.barTarget) || 0);
    const numT = nums.map((n) => Number(n.dataset.numTarget) || 0);
    // Lighthouse scores are integers; ancestry percentages are not. Opt in per
    // element with data-num-decimals. Defaults to 0, and toFixed(0) matches the
    // Math.round this replaced for every non-negative value, so /colophon is
    // byte-identical.
    const numD = nums.map((n) => Number(n.dataset.numDecimals) || 0);

    // k is progress 0→1. The dasharray is "<visible> 100" on a circle whose
    // circumference is ~100, so the visible length doubles as a percentage.
    const paint = (k: number): void => {
      rings.forEach((r, i) => { r.style.strokeDasharray = `${ringT[i] * k} 100`; });
      bars.forEach((b, i) => { b.style.width = `${barT[i] * k}%`; });
      nums.forEach((n, i) => { n.textContent = (numT[i] * k).toFixed(numD[i]); });
    };

    if (reduceMotion) {
      paint(1);
      return;
    }

    const myToken = (tokens.get(panel) ?? 0) + 1;
    tokens.set(panel, myToken);

    paint(0); // reset to the initial (empty) state before sweeping
    const startT = performance.now();
    const step = (now: number): void => {
      if (tokens.get(panel) !== myToken) return; // superseded by a newer sweep
      const p = Math.min((now - startT) / DURATION_MS, 1);
      paint(easeOutCubic(p));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const visiblePanel = (): HTMLElement | null => panels.find((p) => !p.hidden) ?? null;

  const showPanel = (id: string): void => {
    for (const panel of panels) panel.hidden = panel.dataset.perfPanel !== id;
    let label = '';
    for (const btn of buttons) {
      const active = btn.dataset.perfToggle === id;
      btn.setAttribute('aria-pressed', String(active));
      if (active) label = btn.dataset.perfLabel ?? '';
    }
    // Mirror the active source into the section heading ("Performance — Desktop").
    if (suffix && label) suffix.textContent = `— ${label}`;
    animatePanel(panels.find((p) => p.dataset.perfPanel === id) ?? null);
  };

  for (const btn of buttons) {
    btn.addEventListener('click', () => {
      const id = btn.dataset.perfToggle;
      if (id) showPanel(id);
    });
  }

  const start = (): void => animatePanel(visiblePanel());

  // No animation needed (or possible) — paint the visible panel immediately.
  if (reduceMotion || !('IntersectionObserver' in window)) {
    start();
    return;
  }

  pmObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          start();
          pmObserver?.disconnect();
          pmObserver = null;
          return;
        }
      }
    },
    { threshold: 0.25 },
  );
  pmObserver.observe(root);
}
