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
import { initDecide } from './decide.ts';
import { initCalibration } from './calibration.ts';
import { initInject } from './inject.ts';
import { initRoofline } from './roofline.ts';
import { initThreats } from './threats.ts';
import { initGovflow } from './govflow.ts';
import { initRoute } from './route.ts';
import { initParallel } from './parallel.ts';
import { initCheckpoint } from './checkpoint.ts';
import { initJudge } from './judge.ts';
import { initReward } from './reward.ts';
import { initTemperature } from './temperature.ts';
import { initDecode } from './decode.ts';
import { initBreakeven } from './breakeven.ts';
import { initDescent } from './descent.ts';
import { initOverfit } from './overfit.ts';
import { initChunks } from './chunks.ts';
import { initSearch } from './search.ts';

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
const decide = byId('mli-dec');
whenVisible(decide, () => initDecide(decide));
const calibration = byId('mli-cal');
whenVisible(calibration, () => initCalibration(calibration));
const inject = byId('mli-inj');
whenVisible(inject, () => initInject(inject));
const roofline = byId('mli-roof');
whenVisible(roofline, () => initRoofline(roofline));
const threats = byId('mli-thr');
whenVisible(threats, () => initThreats(threats));
const govflow = byId('mli-gov');
whenVisible(govflow, () => initGovflow(govflow));
const route = byId('mli-route');
whenVisible(route, () => initRoute(route));
const parallel = byId('mli-par');
whenVisible(parallel, () => initParallel(parallel));
const checkpoint = byId('mli-ckpt');
whenVisible(checkpoint, () => initCheckpoint(checkpoint));
const judge = byId('mli-judge');
whenVisible(judge, () => initJudge(judge));
const reward = byId('mli-rew');
whenVisible(reward, () => initReward(reward));
const temperature = byId('mli-temp');
whenVisible(temperature, () => initTemperature(temperature));
const decode = byId('mli-dcd');
whenVisible(decode, () => initDecode(decode));
const breakeven = byId('mli-be');
whenVisible(breakeven, () => initBreakeven(breakeven));
const descent = byId('mli-gd');
whenVisible(descent, () => initDescent(descent));
const overfit = byId('mli-of');
whenVisible(overfit, () => initOverfit(overfit));
const chunks = byId('mli-chk');
whenVisible(chunks, () => initChunks(chunks));
const search = byId('mli-srch');
whenVisible(search, () => initSearch(search));
