// Inline image carousels — shortcodes/carousel.html. The track is a plain
// scroll-snap row that already swipes, trackpad-scrolls and arrow-keys with no
// script, so this only adds what scrolling cannot: arrows for a mouse, and dots
// that say where you are. The dots are the impossible list's (./stars), so the
// two carousels on the site look like one component.

import { buildDots, setActiveDot } from './stars';

let teardown: (() => void)[] = [];

function wireCarousel(root: HTMLElement): (() => void) | null {
  const track = root.querySelector<HTMLElement>('[data-carousel-track]');
  const dots = root.querySelector<HTMLElement>('[data-carousel-dots]');
  const prev = root.querySelector<HTMLButtonElement>('[data-carousel-prev]');
  const next = root.querySelector<HTMLButtonElement>('[data-carousel-next]');
  if (!track) return null;
  const count = track.children.length;
  if (count < 2) return null;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const current = (): number => Math.round(track.scrollLeft / (track.clientWidth || 1));

  const sync = (): void => {
    const i = current();
    if (dots) setActiveDot(dots, i);
    if (prev) prev.disabled = i <= 0;
    if (next) next.disabled = i >= count - 1;
  };

  const go = (i: number): void => {
    const clamped = Math.max(0, Math.min(count - 1, i));
    track.scrollTo({ left: clamped * track.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
  };

  const onPrev = (): void => go(current() - 1);
  const onNext = (): void => go(current() + 1);
  // Dots are hit targets too — six pixels is small, but the arrows and the
  // swipe are the main routes and a click on a dot should still do the obvious.
  const onDot = (e: Event): void => {
    const i = Array.prototype.indexOf.call(dots?.children ?? [], e.target);
    if (i >= 0) go(i);
  };

  if (dots) {
    dots.innerHTML = buildDots(count);
    dots.hidden = false;
    dots.addEventListener('click', onDot);
    for (const d of Array.from(dots.children) as HTMLElement[]) d.style.cursor = 'pointer';
  }
  prev?.addEventListener('click', onPrev);
  next?.addEventListener('click', onNext);
  if (prev) prev.hidden = false;
  if (next) next.hidden = false;
  track.addEventListener('scroll', sync, { passive: true });
  sync();

  return () => {
    track.removeEventListener('scroll', sync);
    prev?.removeEventListener('click', onPrev);
    next?.removeEventListener('click', onNext);
    dots?.removeEventListener('click', onDot);
  };
}

export function initCarousels(): void {
  for (const off of teardown) off();
  teardown = [];
  for (const root of Array.from(document.querySelectorAll<HTMLElement>('[data-carousel]'))) {
    const off = wireCarousel(root);
    if (off) teardown.push(off);
  }
}
