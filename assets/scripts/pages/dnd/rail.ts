// The Fighting Style rail on /misc/dnd/.
//
// The rail is a CSS scroll-snap row and works with a trackpad, a touch screen and
// the keyboard without any of this. What the script adds is the two arrow buttons —
// which matter because the site hides scrollbars, so on a mouse-only desktop there
// is otherwise nothing on screen saying the row continues.
//
// The buttons ship `hidden` and are revealed here, and they hide again when the rail
// is not actually scrollable (a wide screen, or a shorter rail) — a disabled arrow
// pointing at nothing is worse than no arrow.

function queryAll<T extends Element>(root: ParentNode, selector: string): T[] {
  return Array.prototype.slice.call(root.querySelectorAll(selector)) as T[];
}

export function initRails(): void {
  for (const root of queryAll<HTMLElement>(document, '[data-dnd-rail]')) {
    const track = root.querySelector<HTMLElement>('[data-dnd-rail-track]');
    const nav = root.querySelector<HTMLElement>('[data-dnd-rail-nav]');
    const prev = root.querySelector<HTMLButtonElement>('[data-dnd-rail-prev]');
    const next = root.querySelector<HTMLButtonElement>('[data-dnd-rail-next]');
    if (!track || !nav || !prev || !next) continue;

    const overflowing = (): boolean => track.scrollWidth - track.clientWidth > 4;

    const sync = (): void => {
      nav.hidden = !overflowing();
      if (nav.hidden) return;
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    };

    // A page rather than a card: jumping one card at a time on a screen showing
    // three means three clicks to see anything new.
    const page = (direction: 1 | -1): void => {
      track.scrollBy({ left: direction * Math.max(240, track.clientWidth * 0.8), behavior: 'smooth' });
    };

    prev.addEventListener('click', () => page(-1));
    next.addEventListener('click', () => page(1));
    track.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  }
}
