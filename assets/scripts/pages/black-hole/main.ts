/* Entry for /misc/black-hole/. Mounts every [data-black-hole] on the page
 * (layouts/shortcodes/black-hole/sim.html). */

import { BlackHoleSim } from './sim';

function mountAll(): void {
  for (const node of document.querySelectorAll<HTMLElement>('[data-black-hole]')) {
    if (node.dataset.blackHoleMounted === 'true') continue;
    node.dataset.blackHoleMounted = 'true';
    new BlackHoleSim(node);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountAll);
} else {
  mountAll();
}
// hx-boost replaces <body> without a reload, so hydrate again after each swap.
document.addEventListener('htmx:afterSettle', mountAll);
