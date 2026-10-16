/* Entry for /misc/emergence/. Mounts every [data-emergence-lab] on the page
 * (layouts/shortcodes/emergence/lab.html). */

import { Lab } from './lab';

function mountAll(): void {
  for (const node of document.querySelectorAll<HTMLElement>('[data-emergence-lab]')) {
    if (node.dataset.emergenceMounted === 'true') continue;
    node.dataset.emergenceMounted = 'true';
    new Lab(node);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountAll);
} else {
  mountAll();
}
// hx-boost replaces <body> without a reload, so hydrate again after each swap.
document.addEventListener('htmx:afterSettle', mountAll);
