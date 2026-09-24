// Entry for the ML article demos. Each demo is a shortcode (layouts/shortcodes/ml-*.html);
// this wires whichever of them are on the page.
import { loadScripts, whenVisible } from './lazy.js';
import { initReveal } from './reveal.js';
import { initDigits } from './digits.js';
import { initMlopsLoop } from './mlops-loop.js';
import { initLoad } from './load.js';
import { initCost } from './cost.js';
import { initBits } from './bits.ts';
import { initTimeline } from './timeline.ts';

// Tells the inline failsafe in ml-demos-assets.html that the reveal is handled.
document.documentElement.dataset.mliReady = '';
initReveal();

const byId = (id) => document.getElementById(id);

// Larger demos kept as standalone scripts in static/js; each attaches to window.
const STANDALONE = [
  { id: 'mli-gi', scripts: ['tiny-digits', 'mli-garbagein'], init: (root) => window.TinyDigits && window.MliGarbageIn?.init(root, window.TinyDigits) },
  { id: 'mli-drift', scripts: ['mli-drift'], init: (root) => window.MliDrift?.init(root) },
  { id: 'mli-tok', scripts: ['mli-tok'], init: (root) => window.MliTok?.init(root) },
  { id: 'mli-rag', scripts: ['mli-rag'], init: (root) => window.MliRag?.init(root) },
  { id: 'mli-ag', scripts: ['mli-agent'], init: (root) => window.MliAgent?.init(root) },
  { id: 'mli-cite', scripts: ['mli-cite'], init: (root) => window.MliCite?.init(root) },
];

for (const demo of STANDALONE) {
  const root = byId(demo.id);
  whenVisible(root, () => loadScripts(demo.scripts.map((s) => `/js/${s}.js`), () => demo.init(root)));
}

const pad = byId('mli-nn-pad');
if (pad?.getContext) {
  whenVisible(pad, () => loadScripts(['/js/tiny-digits.js'], () => window.TinyDigits && initDigits(pad, window.TinyDigits)));
}

const loop = byId('mli-mo');
whenVisible(loop, () => initMlopsLoop(loop));
whenVisible(byId('mli-load'), initLoad);
whenVisible(byId('mli-cost'), initCost);

const bits = byId('mli-bits');
whenVisible(bits, () => initBits(bits));
const timeline = byId('mli-tl');
whenVisible(timeline, () => initTimeline(timeline));
