// Entry point for the /misc/dnd/ bundle, shipped only on the page that uses one of
// the campaign shortcodes — see partials/dnd-assets.html.
//
// Same isolation rule as the Skyrim bundle: a widget that throws on start takes only
// itself down, so a page with one broken widget still works everywhere else. Each
// widget also no-ops when its root is absent, which is why all four can be started
// unconditionally rather than sniffing the page first.

import { initPicker } from './picker';
import { initBuilder } from './builder';
import { initFeats } from './feats';
import { initRails } from './rail';

function start(name: string, init: () => void): void {
  try {
    init();
  } catch (error) {
    // Left visible in the console rather than swallowed — the widget is simply
    // absent, which is the same outcome as JavaScript being off.
    console.error(`dnd: ${name} failed to start`, error);
  }
}

function init(): void {
  start('character builder', initBuilder);
  start('maneuver picker', initPicker);
  start('feat filter', initFeats);
  start('style rail', initRails);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
