/* Entry for /misc/cave-in/. Mounts every [data-cave-in] on the page
 * (layouts/shortcodes/cave-in/game.html). */

import { Game } from './game';

function mountAll(): void {
  for (const node of document.querySelectorAll<HTMLElement>('[data-cave-in]')) {
    if (node.dataset.caveInMounted === 'true') continue;
    node.dataset.caveInMounted = 'true';
    new Game(node);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountAll);
} else {
  mountAll();
}
// hx-boost replaces <body> without a reload, so hydrate again after each swap.
document.addEventListener('htmx:afterSettle', mountAll);
