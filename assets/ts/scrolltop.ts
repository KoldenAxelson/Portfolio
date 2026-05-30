// Scroll-to-top button, boost-aware. The scroll listener is wired once and
// live-queries the (per-page) button; the click handler is (re)bound per page.

let sttGlobalsWired = false;
let sttTicking = false;

function updateScrollTop(): void {
  const btn = document.querySelector<HTMLButtonElement>('[data-scroll-top]');
  if (btn) btn.classList.toggle('is-visible', window.scrollY > 400);
  sttTicking = false;
}

function wireScrollTopGlobalsOnce(): void {
  if (sttGlobalsWired) return;
  sttGlobalsWired = true;
  window.addEventListener(
    'scroll',
    () => {
      if (!sttTicking) {
        requestAnimationFrame(updateScrollTop);
        sttTicking = true;
      }
    },
    { passive: true },
  );
}

export function initScrollTop(): void {
  const btn = document.querySelector<HTMLButtonElement>('[data-scroll-top]');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });
  wireScrollTopGlobalsOnce();
  updateScrollTop();
}
