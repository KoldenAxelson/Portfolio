// Front-plate tile map — /projects/visorplate. The tiles and legend are already
// the whole picture in HTML; this adds the one line under the heading that says
// what the square you are pointing at means. A `title` tooltip does that on a
// desktop and nothing on a phone, so taps count too, and the last one tapped
// stays shown until another is.

let detach: (() => void) | null = null;

export function initPlateMap(): void {
  detach?.();
  detach = null;

  const root = document.querySelector<HTMLElement>('[data-plate-map]');
  const readout = root?.querySelector<HTMLElement>('[data-plate-readout]');
  if (!root || !readout) return;

  const headline = readout.textContent ?? '';
  const tiles = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-plate-tile]'));
  let pinned: HTMLButtonElement | null = null;

  const show = (tile: HTMLButtonElement | null): void => {
    readout.textContent = tile?.getAttribute('aria-label')?.replace(': ', ' · ') ?? headline;
  };
  const enter = (e: Event): void => show(e.currentTarget as HTMLButtonElement);
  const leave = (): void => show(pinned);
  const tap = (e: Event): void => {
    const tile = e.currentTarget as HTMLButtonElement;
    pinned = pinned === tile ? null : tile;
    for (const t of tiles) t.setAttribute('aria-pressed', String(t === pinned));
    show(pinned);
  };

  for (const t of tiles) {
    t.setAttribute('aria-pressed', 'false');
    t.addEventListener('pointerenter', enter);
    t.addEventListener('pointerleave', leave);
    t.addEventListener('focus', enter);
    t.addEventListener('blur', leave);
    t.addEventListener('click', tap);
  }

  detach = (): void => {
    for (const t of tiles) {
      t.removeEventListener('pointerenter', enter);
      t.removeEventListener('pointerleave', leave);
      t.removeEventListener('focus', enter);
      t.removeEventListener('blur', leave);
      t.removeEventListener('click', tap);
    }
  };
}
