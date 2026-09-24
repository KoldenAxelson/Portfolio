// Quantization timeline: a strip of dots, one per milestone, showing one card
// at a time. Without this script every card shows as a plain list.

export function initTimeline(root: HTMLElement): void {
  const strip = root.querySelector<HTMLElement>('#mli-tl-strip');
  const nav = root.querySelector<HTMLElement>('#mli-tl-nav');
  const count = root.querySelector<HTMLElement>('#mli-tl-count');
  const cards = [...root.querySelectorAll<HTMLElement>('.mli-tl-card')];
  const dots = [...root.querySelectorAll<HTMLButtonElement>('.mli-tl-dot')];
  if (!strip || !nav || !count || !cards.length || dots.length !== cards.length) return;

  const scrollBehavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  let current = 0;
  const show = (index: number): void => {
    current = Math.max(0, Math.min(cards.length - 1, index));
    cards.forEach((card, i) => { card.hidden = i !== current; });
    dots.forEach((dot, i) => {
      dot.classList.toggle('is-on', i === current);
      dot.setAttribute('aria-pressed', String(i === current));
    });
    count.textContent = `${current + 1} / ${cards.length}`;
    // Scrolls the strip only, never the page, so picking a dot can't yank the reader.
    const dot = dots[current]!;
    strip.scrollTo({ left: dot.offsetLeft - strip.clientWidth / 2 + dot.offsetWidth / 2, behavior: scrollBehavior });
  };

  dots.forEach((dot, i) => dot.addEventListener('click', () => show(i)));
  root.querySelector('#mli-tl-prev')?.addEventListener('click', () => show(current - 1));
  root.querySelector('#mli-tl-next')?.addEventListener('click', () => show(current + 1));
  strip.addEventListener('keydown', (event) => {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (!step) return;
    event.preventDefault();
    show(current + step);
    dots[current]!.focus();
  });

  strip.hidden = false;
  nav.hidden = false;
  root.classList.add('is-live');
  show(0);
}
