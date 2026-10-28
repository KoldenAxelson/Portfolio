// Profile photo cycle: any [data-photo-cycle] frame (the /about portrait). The
// frame stacks its photos, and only the first is visible in the HTML, so with
// no JS it is a plain portrait. This crossfades to the next photo every
// INTERVAL_MS while the frame is on screen and the tab is visible. Reduced
// motion keeps the first photo.

const INTERVAL_MS = 5000;

let teardown: (() => void)[] = [];

function wirePhotoCycle(frame: HTMLElement): (() => void) | null {
  const photos = Array.from(frame.querySelectorAll<HTMLImageElement>('img'));
  if (photos.length < 2) return null;

  let shown = 0;
  let onScreen = true;
  const show = (next: number): void => {
    photos[shown].classList.replace('opacity-100', 'opacity-0');
    photos[next].classList.replace('opacity-0', 'opacity-100');
    shown = next;
  };
  const tick = (): void => {
    if (onScreen && !document.hidden) show((shown + 1) % photos.length);
  };

  // The later photos are lazy; start fetching them now so the first fade
  // never lands on a blank frame.
  for (const img of photos) img.loading = 'eager';

  const timer = window.setInterval(tick, INTERVAL_MS);
  const observer = new IntersectionObserver((entries) => {
    onScreen = entries[0].isIntersecting;
  });
  observer.observe(frame);

  return () => {
    window.clearInterval(timer);
    observer.disconnect();
  };
}

export function initPhotoCycle(): void {
  for (const stop of teardown) stop();
  teardown = [];
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (const frame of document.querySelectorAll<HTMLElement>('[data-photo-cycle]')) {
    const stop = wirePhotoCycle(frame);
    if (stop) teardown.push(stop);
  }
}
