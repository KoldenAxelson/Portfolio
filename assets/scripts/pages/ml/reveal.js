// Fades article blocks in as they scroll into view. The `mli-anim` class that
// hides them is set inline by partials/ml-demos-assets.html before first paint.

const BLOCKS = '.prose > *:not(header)';

function showAll() {
  document.querySelectorAll(BLOCKS).forEach((el) => el.classList.add('mli-in'));
}

export function initReveal() {
  if (!document.documentElement.classList.contains('mli-anim')) return;
  if (!('IntersectionObserver' in window)) { showAll(); return; }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('mli-in');
      io.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.04 });
  document.querySelectorAll(BLOCKS).forEach((el) => io.observe(el));
}
