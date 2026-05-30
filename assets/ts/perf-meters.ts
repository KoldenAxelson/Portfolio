// Colophon performance meters. Each device panel (mobile / desktop) renders its
// score rings and vital bars empty; this fills them — and counts the ring
// numbers up — the first time a panel is shown, whether that's the initial
// scroll-into-view or a toggle click. Idempotent so it survives hx-boost swaps,
// honors prefers-reduced-motion, and no-ops on every page except /colophon.

const NUM_DURATION_MS = 1100;

let pmObserver: IntersectionObserver | null = null;

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

  // Animate a panel's meters once. Subsequent shows keep their final state, so
  // toggling back and forth doesn't re-run the sweep.
  const fillPanel = (panel: HTMLElement | null): void => {
    if (!panel || panel.dataset.filled === 'true') return;
    panel.dataset.filled = 'true';

    panel.querySelectorAll<SVGCircleElement>('[data-ring-target]').forEach((ring) => {
      // Set via style (not attribute) so the CSS transition on .perf-ring runs.
      ring.style.strokeDasharray = `${ring.dataset.ringTarget} 100`;
    });
    panel.querySelectorAll<HTMLElement>('[data-bar-target]').forEach((bar) => {
      bar.style.width = `${bar.dataset.barTarget}%`;
    });
    panel.querySelectorAll<SVGTextElement>('[data-num-target]').forEach((num) => {
      const target = Number(num.dataset.numTarget) || 0;
      if (reduceMotion) {
        num.textContent = String(target);
        return;
      }
      const start = performance.now();
      const step = (now: number): void => {
        const p = Math.min((now - start) / NUM_DURATION_MS, 1);
        const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
        num.textContent = String(Math.round(target * eased));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
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
    const shown = panels.find((p) => p.dataset.perfPanel === id) ?? null;
    // The panel was display:none; let layout apply before animating from 0.
    requestAnimationFrame(() => fillPanel(shown));
  };

  for (const btn of buttons) {
    btn.addEventListener('click', () => {
      const id = btn.dataset.perfToggle;
      if (id) showPanel(id);
    });
  }

  const start = (): void => fillPanel(visiblePanel());

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
