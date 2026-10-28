// Shared plumbing for the live cards on /misc (partials/misc/live/*.html).
//
// Each card's script is its own small bundle, loaded only by its partial. The
// partial's <script> runs again after every hx-boost swap back to /misc, so
// mounting is idempotent (a mounted root is flagged), and a loop ends itself
// once its root leaves the document.
//
// Cards only run while awake: scripts/site/widgets/card-wake.ts marks each
// band data-asleep="true|false" and fires `card:wake` on it. `isAsleep` and
// `onWake` are that contract for the card scripts.

/** Is the card band this element sits in asleep? (No band: never asleep.) */
export const isAsleep = (el: Element): boolean =>
  el.closest('[data-asleep]')?.getAttribute('data-asleep') === 'true';

/** Calls `fn` whenever the band this element sits in wakes up. */
export function onWake(el: Element, fn: () => void): void {
  el.closest('[data-asleep]')?.addEventListener('card:wake', fn);
}

export function mountAll(selector: string, mount: (root: HTMLElement) => void): void {
  const run = (): void => {
    for (const root of document.querySelectorAll<HTMLElement>(selector)) {
      if (root.dataset.liveMounted) continue;
      root.dataset.liveMounted = 'true';
      mount(root);
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
}

export interface CardLoop {
  /** Run frames again (after input, or a change the frame should show). */
  wake: () => void;
}

/**
 * Drives `frame` on requestAnimationFrame while the card is on screen and
 * awake. `frame` returns whether it wants another frame; returning false lets
 * the loop sleep until `wake()`. `layout` runs first and again whenever the
 * card resizes; an asleep card still gets one frame then, so it isn't blank.
 */
export function watchCard(
  root: HTMLElement,
  frame: (now: number) => boolean,
  layout: () => void,
): CardLoop {
  let onScreen = false;
  let raf = 0;

  const tick = (now: number): void => {
    raf = 0;
    if (!root.isConnected) {
      observer.disconnect();
      resizer.disconnect();
      return;
    }
    if (!onScreen) return;
    if (frame(now) && !isAsleep(root)) raf = requestAnimationFrame(tick);
  };
  const wake = (): void => {
    if (!raf && onScreen && root.isConnected) raf = requestAnimationFrame(tick);
  };

  const observer = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    wake();
  });
  observer.observe(root);
  const resizer = new ResizeObserver(() => {
    layout();
    wake();
  });
  resizer.observe(root);
  onWake(root, wake);

  return { wake };
}
