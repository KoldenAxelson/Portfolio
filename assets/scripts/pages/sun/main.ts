/* Entry for /misc/sun/. Mounts every [data-sun] on the page (layouts/shortcodes/sun/sim.html, shipped by
 * partials/sun/assets.html).
 *
 * sim.ts runs the page: pickers, clocks, the GPU passes and the readout. The model: stars.ts (the six stars and
 * what follows from them), views.ts (the nine instruments and their fits), clock.ts, field.ts (the surface field
 * and its cycle), frictional.ts (the corona's twisted field), flow.ts (surface plasma), loops.ts with plasma.ts
 * and ribbons.ts (event loops, flares, eruptions), cmes.ts, strings.ts (the traced field lines). The GPU side:
 * fieldmaps.ts, layer.ts, framing.ts and shaders/; vec.ts and constants.ts are shared helpers. fallback/ is the
 * WebGL2 renderer, its own bundle, loaded only when WebGPU won't start. The shared kit is assets/scripts/site/gpu/. */

import { SunSim } from './sim';

function mountAll(): void {
  for (const node of document.querySelectorAll<HTMLElement>('[data-sun]')) {
    if (node.dataset.sunMounted === 'true') continue;
    node.dataset.sunMounted = 'true';
    new SunSim(node);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountAll);
} else {
  mountAll();
}
// hx-boost replaces <body> without a reload, so hydrate again after each swap.
document.addEventListener('htmx:afterSettle', mountAll);
