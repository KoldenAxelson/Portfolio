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
import { initCutoff } from './cutoff.ts';
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
import { initContext } from './context.ts';
import { initMandate } from './mandate.ts';
import { initHandoff } from './handoff.ts';
import { initHorizon } from './horizon.ts';
import { initWire } from './wire.ts';
import { initSwarm } from './swarm.ts';
import { initClocks } from './clocks.ts';
import { initHrr } from './hrr.ts';
import { initConvolve } from './convolve.ts';
import { initEmbeddingTable } from './embedding-table.ts';
import { initTokenIds } from './token-ids.ts';
import { initNearestRows } from './nearest-rows.ts';
import { initBasisGrid } from './basis-grid.ts';
import { initDctBlock } from './dct-block.ts';
import { initWrapClock } from './wrap-clock.ts';
import { initSignedClock } from './signed-clock.ts';
import { initLiftingRow } from './lifting-row.ts';
import { initLiftingImage } from './lifting-image.ts';
import { initFwhtButterfly } from './fwht-butterfly.ts';
import { initFftCost } from './fft-cost.ts';
import { initTaskVectors } from './task-vectors.ts';
import { initMergeSymmetry } from './merge-symmetry.ts';
import { initSummedArea } from './summed-area.ts';
import { initFenwick } from './fenwick.ts';
import { initRollingChecksum } from './rolling-checksum.ts';
import { initMerkleCompare } from './merkle-compare.ts';
import { initHammingCode } from './hamming-code.ts';
import { initErrorChecks } from './error-checks.ts';
import { initPoincareTree } from './poincare-tree.ts';
import { initRoomOnTheCircle } from './room-on-the-circle.ts';
import { initMutationTest } from './mutation-test.ts';
import { initMemorySampling } from './memory-sampling.ts';

// Tells the inline failsafe in ml-demos-assets.html that the reveal is handled.
document.documentElement.dataset.mliReady = '';
initReveal();

const byId = (id) => document.getElementById(id);

// Larger demos kept as standalone scripts in static/js; each attaches to window.
const STANDALONE = [
  { id: 'mli-gi', scripts: ['tiny-digits', 'mli-garbagein'], init: (root) => window.TinyDigits && window.MliGarbageIn?.init(root, window.TinyDigits) },
  { id: 'mli-drift', scripts: ['mli-drift'], init: (root) => window.MliDrift?.init(root) },
  { id: 'mli-tok', scripts: ['mli-tok'], init: (root) => window.MliTok?.init(root) },
  // Preset sentences with real GPT-2 row numbers from data/ml/token-ids.yaml.
  { id: 'mli-tid', scripts: [], init: (root) => initTokenIds(root) },
  { id: 'mli-rag', scripts: ['mli-rag'], init: (root) => window.MliRag?.init(root) },
  { id: 'mli-ag', scripts: ['mli-agent'], init: (root) => window.MliAgent?.init(root) },
  { id: 'mli-cite', scripts: ['mli-cite'], init: (root) => window.MliCite?.init(root) },
];

for (const demo of STANDALONE) {
  const root = byId(demo.id);
  whenVisible(root, () => loadScripts(demo.scripts.map((s) => `/js/ml/${s}.js`), () => demo.init(root)));
}

const pad = byId('mli-nn-pad');
if (pad?.getContext) {
  whenVisible(pad, () => loadScripts(['/js/ml/tiny-digits.js'], () => window.TinyDigits && initDigits(pad, window.TinyDigits)));
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
const cutoff = byId('mli-cut');
whenVisible(cutoff, () => initCutoff(cutoff));
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
const context = byId('mli-ctx');
whenVisible(context, () => initContext(context));
const mandate = byId('mli-mnd');
whenVisible(mandate, () => initMandate(mandate));
const handoff = byId('mli-hand');
whenVisible(handoff, () => initHandoff(handoff));
const horizonChart = byId('mli-hz');
whenVisible(horizonChart, () => initHorizon(horizonChart));
const wire = byId('mli-wire');
whenVisible(wire, () => initWire(wire));
const swarm = byId('mli-swarm');
whenVisible(swarm, () => initSwarm(swarm));
const clocks = byId('mli-clk');
whenVisible(clocks, () => initClocks(clocks));
const hrr = byId('mli-hrr');
whenVisible(hrr, () => initHrr(hrr));
const convolve = byId('mli-conv');
whenVisible(convolve, () => initConvolve(convolve));
const embeddingTable = byId('mli-et');
whenVisible(embeddingTable, () => initEmbeddingTable(embeddingTable));
const nearestRows = byId('mli-nr');
whenVisible(nearestRows, () => initNearestRows(nearestRows));
const basisGrid = byId('mli-bg');
whenVisible(basisGrid, () => initBasisGrid(basisGrid));
const dctBlock = byId('mli-dct');
whenVisible(dctBlock, () => initDctBlock(dctBlock));
const wrapClock = byId('mli-wc');
whenVisible(wrapClock, () => initWrapClock(wrapClock));
const signedClock = byId('mli-sc');
whenVisible(signedClock, () => initSignedClock(signedClock));
const liftingRow = byId('mli-lr');
whenVisible(liftingRow, () => initLiftingRow(liftingRow));
const liftingImage = byId('mli-li');
whenVisible(liftingImage, () => initLiftingImage(liftingImage));
const fwhtButterfly = byId('mli-fw');
whenVisible(fwhtButterfly, () => initFwhtButterfly(fwhtButterfly));
const fftCost = byId('mli-fc');
whenVisible(fftCost, () => initFftCost(fftCost));
const taskVectors = byId('mli-tv');
whenVisible(taskVectors, () => initTaskVectors(taskVectors));
const mergeSymmetry = byId('mli-ms');
whenVisible(mergeSymmetry, () => initMergeSymmetry(mergeSymmetry));
const summedArea = byId('mli-sa');
whenVisible(summedArea, () => initSummedArea(summedArea));
const fenwick = byId('mli-fk');
whenVisible(fenwick, () => initFenwick(fenwick));
const rollingChecksum = byId('mli-rc');
whenVisible(rollingChecksum, () => initRollingChecksum(rollingChecksum));
const merkleCompare = byId('mli-mk');
whenVisible(merkleCompare, () => initMerkleCompare(merkleCompare));
const hammingCode = byId('mli-hc');
whenVisible(hammingCode, () => initHammingCode(hammingCode));
const errorChecks = byId('mli-ec');
whenVisible(errorChecks, () => initErrorChecks(errorChecks));
const poincareTree = byId('mli-pt');
whenVisible(poincareTree, () => initPoincareTree(poincareTree));
const roomOnTheCircle = byId('mli-rm');
whenVisible(roomOnTheCircle, () => initRoomOnTheCircle(roomOnTheCircle));
const mutationTest = byId('mli-mt');
whenVisible(mutationTest, () => initMutationTest(mutationTest));
const memorySampling = byId('mli-ms2');
whenVisible(memorySampling, () => initMemorySampling(memorySampling));
