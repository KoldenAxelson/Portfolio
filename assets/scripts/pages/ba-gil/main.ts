// Entry for /misc/ba-gil/, shipped only there (layouts/partials/ba-gil/assets.html).
// Each widget no-ops when its shortcode isn't on the page, and one that throws on
// start takes only itself down: the static page underneath is complete without it.

import { readData } from './data';
import { initDecoder } from './decoder';
import { initFlip } from './flip';
import { initNumbers } from './numbers';

function start(name: string, init: () => void): void {
  try {
    init();
  } catch (error) {
    console.error(`ba-gil: ${name} failed to start`, error);
  }
}

function mountAll(): void {
  const data = readData();
  start('inversion demo', initFlip);
  if (!data) return;
  start('decoder', () => initDecoder(data));
  start('number converter', () => initNumbers(data));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountAll);
} else {
  mountAll();
}
// hx-boost swaps <body> without a reload, so mount again after each swap; every
// widget marks itself mounted, so a page it already started is left alone.
document.addEventListener('htmx:afterSettle', mountAll);
