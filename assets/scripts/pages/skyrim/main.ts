// Entry point for the Skyrim page bundle, shipped only on pages that use one of
// the shortcodes — see partials/skyrim-assets.html.
//
// Each widget is started in isolation. They share nothing, so a malformed
// payload in one should not take the others down with it: before this, a single
// throw from the builder's JSON.parse also killed the potion filter and the
// resto planner on the same page.

import { initFilter } from './filter';
import { initResto } from './resto';
import { initEnchantMax } from './enchant';
import { initBuilder } from './builder';
import { initJohn } from './john';

function start(name: string, init: () => void): void {
  try {
    init();
  } catch (error) {
    // Left visible in the console rather than swallowed — the widget is simply
    // absent, which is the same outcome as JavaScript being off.
    console.error(`skyrim: ${name} failed to start`, error);
  }
}

function init(): void {
  start('potion filter', initFilter);
  start('resto planner', initResto);
  start('potion builder', initBuilder);
  start('enchant max', initEnchantMax);
  start('john skyrim', initJohn);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
