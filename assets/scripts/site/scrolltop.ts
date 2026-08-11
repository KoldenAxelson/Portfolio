// Scroll-to-top button. Scroll listener wired once; click handler re-bound per page.

const SHOW_AFTER_PX = 400;

let sttGlobalsWired = false;
let sttTicking = false;

function updateScrollTop(): void {
  const btn = document.querySelector<HTMLButtonElement>('[data-scroll-top]');
  if (btn) btn.classList.toggle('is-visible', window.scrollY > SHOW_AFTER_PX);
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
