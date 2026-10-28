/* Entry for /misc/black-hole/. Mounts every [data-black-hole] on the page
 * (layouts/shortcodes/black-hole/sim.html, shipped by partials/black-hole/assets.html).
 *
 * presets.ts holds the four holes; shaders.ts the WGSL (gas, tables, lens trace, shade, composite); blackbody.ts
 * the band intensities the exposure is seeded from; sim.ts the pipeline, controls and clocks, on the shared kit in
 * assets/scripts/site/gpu/. The Tech Watch card (static/js/tech-watch/dwarfstar.js) is a one-preset cut of the
 * same lens. */

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
