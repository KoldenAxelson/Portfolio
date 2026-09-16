// game-embed.ts — click-to-play for standalone game pages (partials/game-embed.html).
// Nothing of the game is fetched before the click, which is what keeps the
// host page's Lighthouse numbers where they are — see docs/microgames.md.
// Idempotent, because the site bundle re-runs init after every hx-boost swap.

const BOUND = 'gameEmbedBound';

function mountGame(box: HTMLElement): void {
  const src = box.dataset.src;
  if (!src) return;
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
}

export function initGameEmbed(): void {
  document.querySelectorAll<HTMLElement>('[data-game-embed]').forEach((box) => {
    if (box.dataset[BOUND]) return;
    box.dataset[BOUND] = '1';
    box.querySelector('[data-game-play]')?.addEventListener('click', () => mountGame(box), { once: true });
  });
}
