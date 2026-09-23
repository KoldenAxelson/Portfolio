// game-embed.ts — click-to-play for standalone game pages (partials/game-embed.html).
// Nothing of the game is fetched before the click, which is what keeps the
// host page's Lighthouse numbers where they are — see docs/microgames.md.
// Idempotent, because the site bundle re-runs init after every hx-boost swap.

const BOUND = 'gameEmbedBound';

function mountGame(box: HTMLElement): HTMLIFrameElement | null {
  const mounted = box.querySelector('iframe');
  if (mounted) return mounted;
  const src = box.dataset.src;
  if (!src) return null;
  const frame = document.createElement('iframe');
  frame.src = src;
  frame.title = box.dataset.title || 'Game';
  frame.loading = 'lazy';
  frame.allow = 'fullscreen';
  frame.setAttribute('allowfullscreen', '');
  frame.className = 'absolute inset-0 h-full w-full border-0';
  // The poster stays underneath until the game document paints, so the swap
  // reads as a crossfade rather than a black box.
  box.querySelector('[data-game-play]')?.remove();
  box.appendChild(frame);
  frame.addEventListener('load', () => {
    box.querySelector('img')?.remove();
    frame.focus();
  });
  return frame;
}

// Fullscreen goes on the embed box rather than the iframe, so the UA's
// :fullscreen rules size the box and the game letterboxes inside it. Mounting
// first means the button also works before Play was ever clicked. Focus goes
// to the frame either way: keyboard games only see keys while they hold it.
function fullscreenGame(box: HTMLElement): void {
  const frame = mountGame(box);
  if (!frame) return;
  const focusFrame = () => frame.focus();
  if (!document.fullscreenEnabled) {
    focusFrame();
    return;
  }
  box.requestFullscreen().then(focusFrame, focusFrame);
}

export function initGameEmbed(): void {
  document.querySelectorAll<HTMLElement>('[data-game-embed]').forEach((box) => {
    if (box.dataset[BOUND]) return;
    box.dataset[BOUND] = '1';
    box.querySelector('[data-game-play]')?.addEventListener('click', () => mountGame(box), { once: true });
  });
  // A [data-game-fullscreen] button anywhere inside a [data-game-frame]
  // wrapper drives the embed box in that wrapper.
  document.querySelectorAll<HTMLElement>('[data-game-fullscreen]').forEach((button) => {
    if (button.dataset[BOUND]) return;
    button.dataset[BOUND] = '1';
    const box = button.closest<HTMLElement>('[data-game-frame]')?.querySelector<HTMLElement>('[data-game-embed]');
    if (!box) return;
    button.addEventListener('click', () => fullscreenGame(box));
  });
}
