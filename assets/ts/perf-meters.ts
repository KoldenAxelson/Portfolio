// Colophon performance meters. The score rings and vital bars render empty;
// this fills them (and counts the ring numbers up) the first time the section
// scrolls into view. Idempotent so it survives hx-boost swaps, honors
// prefers-reduced-motion, and no-ops on every page except /colophon.

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

  const rings = Array.from(root.querySelectorAll<SVGCircleElement>('[data-ring-target]'));
  const nums = Array.from(root.querySelectorAll<SVGTextElement>('[data-num-target]'));
  const bars = Array.from(root.querySelectorAll<HTMLElement>('[data-bar-target]'));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const fill = (): void => {
    for (const ring of rings) {
      // Set via style (not attribute) so the CSS transition on .perf-ring runs.
      ring.style.strokeDasharray = `${ring.dataset.ringTarget} 100`;
    }
    for (const bar of bars) {
      bar.style.width = `${bar.dataset.barTarget}%`;
    }
    for (const num of nums) {
      const target = Number(num.dataset.numTarget) || 0;
      if (reduceMotion) {
        num.textContent = String(target);
        continue;
      }
      const start = performance.now();
      const step = (now: number): void => {
        const p = Math.min((now - start) / NUM_DURATION_MS, 1);
        const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
        num.textContent = String(Math.round(target * eased));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  };

  // No animation needed (or possible) — paint the final state immediately.
  if (reduceMotion || !('IntersectionObserver' in window)) {
    fill();
    return;
  }

  pmObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          fill();
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
