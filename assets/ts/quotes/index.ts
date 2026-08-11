// /quotes — the page.
//
// Progressive enhancement: the server-rendered <ul> is the real content. This
// module flags the section .is-live (the stylesheet then hides the list and
// reveals the canvas) and draws the same quotes as a lattice of dots. The canvas
// draws plain text, so inline Markdown in a quote still renders — but only in
// that list, which is what no-JS and screen readers get.
//
// The smoke is not here. It reads as smoke through advection — density carried
// along a velocity field that curls back into itself — which is a fluid solver,
// and that ships as its own bundle in ./fluid.ts. What this file gives it is the
// glyph mask, over the bridge, which is how the smoke knows where the words are.

import { QUOTES_READY_EVENT, type BridgeHost, type Flow } from './bridge';
import { createDeck } from './deck';
import { wireFullscreen } from './fullscreen';
import { loadTune, saveTune } from './knobs';
import { createLattice } from './lattice';
import { buildTuner } from './tuner';
import { getQuality, reduceQuality } from './viewport';

const RESIZE_DEBOUNCE_MS = 150;
const RELAYOUT_DEBOUNCE_MS = 200;
const MIN_HOLD_MS = 400;

// One live instance at a time. hx-boost swaps <body> without a reload, so the
// previous page's animation loop, timers and listeners have to be torn down by
// hand.
let dispose: (() => void) | null = null;

export function initQuotes(): void {
  dispose?.();
  dispose = null;

  const root = document.querySelector<HTMLElement>('[data-quotes]');
  const canvas = root?.querySelector<HTMLCanvasElement>('[data-quotes-canvas]');
  const source = root?.querySelector<HTMLElement>('[data-quotes-source]');
  const stage = root?.querySelector<HTMLButtonElement>('[data-quotes-advance]');
  if (!root || !canvas || !source || !stage) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // textContent, not innerHTML: the canvas draws glyphs, not markup.
  const quotes = Array.from(source.querySelectorAll('li'))
    .map((li) => (li.textContent || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  if (!quotes.length) return;

  const tune = loadTune();
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lattice = createLattice(root, canvas, ctx, quotes, tune, reduceMotion);
  if (!lattice) return;

  root.classList.add('is-live');

  const toggles = readToggles(root);
  const isOn = (name: string): boolean => toggles.get(name)?.checked ?? false;
  if (reduceMotion) openOnStillFrame(toggles);

  const deck = createDeck(quotes.length);
  const cursor = { x: 0, y: 0, present: false };
  let onScreen = true;
  let lastFrame = -1;
  let raf = 0;

  // ---- frame budget -------------------------------------------------------

  // This is the heaviest thing on the site, and where the cost lands is not
  // something the source can predict: an SVG goo filter runs over every pixel of
  // its layer on every frame it changes, which some browsers hand to the GPU and
  // others grind out on the CPU. Rather than guess a device class, watch the
  // frames that are actually landing and give something up if they are not.
  //
  // Downward only, two steps, then it stops watching. The first verdict that
  // comes in on budget also stops it, so a machine that is coping never pays for
  // the bookkeeping. Nothing here upgrades back: quality that flickers as the
  // load changes reads as a bug, and the reader cannot tell it was deliberate.
  const TARGET_FRAME_MS = 22; // ~45fps — below this nobody is counting
  const WARMUP_MS = 2500; // layout, webfonts, shader compile and the opening tween
  const VERDICT_MS = 2000;
  const MIN_SAMPLES = 6;
  // A frame this long is a stall, a sleep or a tab swap rather than a frame
  // rate. Clamped into the sample rather than dropped: discarding them means a
  // machine slow enough to spend two seconds a frame never collects a sample at
  // all and never gets helped, which is precisely backwards. One clamped
  // outlier cannot move a median anyway.
  const STALL_MS = 2000;
  let watchStart = 0;
  let intervals: number[] = [];
  let governorSteps = 0;
  let strikes = 0;

  const governor = (interval: number): void => {
    if (governorSteps >= 2 || document.hidden) return;
    const now = performance.now();
    if (!watchStart) {
      watchStart = now + WARMUP_MS;
      return;
    }
    if (now < watchStart) return;

    intervals.push(Math.min(interval, STALL_MS));
    // Windowed by time, not by frame count. A machine at 5fps would take half a
    // minute to fill a 90-frame window — and it is exactly the machine that
    // needs the answer soonest.
    if (now - watchStart < VERDICT_MS || intervals.length < MIN_SAMPLES) return;
    intervals.sort((a, b) => a - b);
    const median = intervals[intervals.length >> 1];
    intervals = [];
    watchStart = now; // next window starts here

    if (median <= TARGET_FRAME_MS) {
      governorSteps = 2; // coping — stop measuring
      return;
    }
    // Two windows before acting. One bad window can belong to something else
    // entirely — another tab taking the GPU, a garbage collection, a laptop
    // deciding to think about its battery — and the cost of being wrong here is
    // that a machine which was coping quietly loses the effect anyway.
    if (++strikes < 2) return;
    strikes = 0;

    // Cheapest thing to give up first: the goo threshold is a full-layer filter
    // pass per frame, and without it the dots simply stop fusing into strokes.
    const merge = toggles.get('merge');
    if (governorSteps === 0 && merge?.checked) {
      governorSteps = 1;
      merge.checked = false;
      lattice.applyFilters(false);
      return;
    }
    // Still short: draw fewer pixels and re-fit the deck into them.
    governorSteps = 2;
    if (reduceQuality()) relayout();
  };

  // ---- the loop -----------------------------------------------------------

  const frame = (): void => {
    raf = requestAnimationFrame(frame);
    // Scrolled past, or a hidden fullscreen backdrop over the top of it: there
    // is nothing to see, so there's nothing worth spending a frame on.
    if (!onScreen) return;

    lattice.startOfFrame();
    const now = performance.now();
    const previous = lastFrame < 0 ? now - 16.67 : lastFrame;
    governor(now - previous);
    lastFrame = now;

    const smoke = isOn('smoke');
    lattice.update({
      now,
      previous,
      cursor: isOn('cursor') && cursor.present ? cursor : null,
      flow: smoke ? readFlow(root) : null,
      emitting: smoke,
    });
    lattice.paint(isOn('dots'), isOn('merge'));
  };

  // ---- the deck -----------------------------------------------------------

  let holdTimer: number | null = null;
  const scheduleAuto = (): void => {
    if (holdTimer !== null) window.clearTimeout(holdTimer);
    holdTimer = null;
    if (!isOn('auto') || quotes.length < 2) return;
    // Read at schedule time rather than captured once, so moving the slider
    // takes effect on the next dwell instead of after a reload.
    holdTimer = window.setTimeout(() => {
      lattice.retarget(deck.advance());
      scheduleAuto();
    }, Math.max(MIN_HOLD_MS, tune.holdMs));
  };

  const onStageClick = (): void => {
    lattice.retarget(deck.advance());
    scheduleAuto(); // a manual advance restarts the auto clock rather than racing it
  };

  // ---- pointer ------------------------------------------------------------

  // Mouse only: a touch drag would otherwise shove the field around while the
  // reader is just trying to scroll past it.
  const onPointerMove = (event: PointerEvent): void => {
    if (event.pointerType !== 'mouse') return;
    const point = lattice.cursorAt(event);
    cursor.x = point.x;
    cursor.y = point.y;
    cursor.present = true;
  };
  const onPointerLeave = (): void => {
    cursor.present = false;
  };

  // ---- switches -----------------------------------------------------------

  const onToggle = (event: Event): void => {
    const input = event.target as HTMLInputElement;
    const name = input.dataset.quotesToggle;
    // Never leave the canvas blank: unchecking the last visible layer turns the
    // other one on rather than rendering nothing at all.
    if ((name === 'smoke' || name === 'dots') && !isOn('smoke') && !isOn('dots')) {
      const other = toggles.get(name === 'smoke' ? 'dots' : 'smoke');
      if (other) other.checked = true;
    }
    if (name === 'merge') lattice.applyFilters(isOn('merge'));
    if (name === 'cursor' && !input.checked) onPointerLeave();
    if (name === 'auto') scheduleAuto();
  };

  // ---- knobs --------------------------------------------------------------

  const relayout = (): void => lattice.layout(deck.current());

  let relayoutTimer: number | null = null;
  let lastDensity = tune.dotDensity;
  let lastFont = tune.font;
  let lastHold = tune.holdMs;
  buildTuner(root, tune, () => {
    saveTune(tune);
    lattice.applyFilters(isOn('merge'));
    // The pending timeout was armed with the old dwell, and restarting the clock
    // is also the only way to feel the new one without waiting out the old.
    if (tune.holdMs !== lastHold) {
      lastHold = tune.holdMs;
      scheduleAuto();
    }
    // Density and typeface both change how the deck is rasterised and re-fitted,
    // so they need a full layout. Debounced, because density fires on every
    // pixel of slider travel.
    if (tune.dotDensity === lastDensity && tune.font === lastFont) return;
    lastDensity = tune.dotDensity;
    lastFont = tune.font;
    if (relayoutTimer !== null) window.clearTimeout(relayoutTimer);
    relayoutTimer = window.setTimeout(relayout, RELAYOUT_DEBOUNCE_MS);
  });
  lattice.applyFilters(isOn('merge'));

  // ---- fullscreen geometry ------------------------------------------------

  // The logical box fullscreen draws into, in CSS pixels of area. Matching the
  // windowed module is the whole point: the same dots make up the words and the
  // same emitters feed the smoke, and the compositor blows the result up. Raise
  // it if fullscreen reads too soft — the cost of every frame rises with it,
  // roughly in proportion.
  const IMMERSIVE_LOGICAL_AREA = 720 * 416;

  const fitImmersive = (): void => {
    if (!root.classList.contains('is-immersive')) {
      root.style.removeProperty('--quotes-logical-w');
      root.style.removeProperty('--quotes-logical-h');
      root.style.removeProperty('--quotes-zoom');
      return;
    }
    const style = getComputedStyle(root);
    const availW =
      root.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const availH =
      root.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    if (!(availW > 2 && availH > 2)) return;

    // Same aspect as the space it has to fill, so the zoom is uniform and the
    // quote is never stretched — only the area is held down.
    const aspect = availW / availH;
    const h = Math.round(Math.sqrt(IMMERSIVE_LOGICAL_AREA / aspect));
    const w = Math.round(h * aspect);
    root.style.setProperty('--quotes-logical-w', `${w}px`);
    root.style.setProperty('--quotes-logical-h', `${h}px`);
    root.style.setProperty('--quotes-zoom', String(Math.min(availW / w, availH / h)));
  };

  // ---- observers ----------------------------------------------------------

  let resizeTimer: number | null = null;
  // The section, not the canvas: fullscreen pins it to the viewport, and a window
  // resize while immersive has to re-derive the logical box. Separate from the
  // canvas observer below so the two cannot chase each other — this one sets the
  // box, that one reacts to it.
  const shellObserver = new ResizeObserver(() => fitImmersive());

  const resizeObserver = new ResizeObserver(() => {
    if (resizeTimer !== null) window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(relayout, RESIZE_DEBOUNCE_MS);
  });
  // The dots and the smoke are both drawn in colours read out of the stylesheet,
  // and the stylesheet swaps them on the colour scheme. Nothing about that fires
  // a resize, so without this the page keeps painting the old theme's palette
  // until something else happens to re-measure it.
  const scheme = window.matchMedia('(prefers-color-scheme: dark)');
  const onSchemeChange = (): void => lattice.refreshPalette();
  scheme.addEventListener('change', onSchemeChange);

  const visibility = new IntersectionObserver(
    ([entry]) => {
      onScreen = entry.isIntersecting;
      // A gap in the clock would otherwise arrive as one enormous frame, which
      // the pulse integral would answer with a single huge puff of smoke.
      if (onScreen) lastFrame = -1;
    },
    { threshold: 0 },
  );

  const unwireFullscreen = wireFullscreen(root, fitImmersive);

  dispose = (): void => {
    cancelAnimationFrame(raf);
    for (const timer of [holdTimer, resizeTimer, relayoutTimer]) {
      if (timer !== null) window.clearTimeout(timer);
    }
    resizeObserver.disconnect();
    shellObserver.disconnect();
    visibility.disconnect();
    scheme.removeEventListener('change', onSchemeChange);
    unwireFullscreen();
    stage.removeEventListener('pointermove', onPointerMove);
    stage.removeEventListener('pointerleave', onPointerLeave);
    stage.removeEventListener('click', onStageClick);
    toggles.forEach((el) => el.removeEventListener('change', onToggle));
  };

  // ---- go -----------------------------------------------------------------

  (root as BridgeHost).__quotes = {
    mask: lattice.mask,
    tune,
    color: lattice.fill,
    accent: lattice.accent,
    smokeOn: () => isOn('smoke'),
    visible: () => onScreen,
    quality: getQuality,
    onFail: () => fallBackToDots(toggles),
    onRecover: () => restoreSmoke(toggles),
  };
  loadSolver(root);
  document.dispatchEvent(new CustomEvent(QUOTES_READY_EVENT));

  relayout();
  shellObserver.observe(root);
  resizeObserver.observe(canvas);
  visibility.observe(root);
  // Metrics measured before Inter arrives come from the fallback face and size
  // the text wrong, so re-run once the real font is in.
  void document.fonts?.ready.then(relayout);

  toggles.forEach((el) => el.addEventListener('change', onToggle));
  stage.addEventListener('pointermove', onPointerMove);
  stage.addEventListener('pointerleave', onPointerLeave);
  stage.addEventListener('click', onStageClick);

  raf = requestAnimationFrame(frame);
  scheduleAuto();
}

function readToggles(root: HTMLElement): Map<string, HTMLInputElement> {
  const toggles = new Map<string, HTMLInputElement>();
  root.querySelectorAll<HTMLInputElement>('[data-quotes-toggle]').forEach((input) => {
    if (input.dataset.quotesToggle) toggles.set(input.dataset.quotesToggle, input);
  });
  return toggles;
}

// Reduced motion opens on the still rendering: dots rather than a drifting
// plume, and no cursor scatter. The switches still work, so a reader who wants
// the smoke can ask for it — an explicit click is not unsolicited motion.
function openOnStillFrame(toggles: Map<string, HTMLInputElement>): void {
  for (const name of ['smoke', 'cursor']) {
    const toggle = toggles.get(name);
    if (toggle) toggle.checked = false;
  }
  const dots = toggles.get('dots');
  if (dots) dots.checked = true;
}

const readFlow = (root: HTMLElement): Flow | null => (root as BridgeHost).__quotes?.flow ?? null;

// No WebGL2, no float render targets, or a context that just went away. Rather
// than leave the reader with an empty box, turn the dots on and retire the
// switch that can't do anything.
function fallBackToDots(toggles: Map<string, HTMLInputElement>): void {
  const smoke = toggles.get('smoke');
  const dots = toggles.get('dots');
  if (smoke) {
    smoke.checked = false;
    smoke.disabled = true;
    smoke.closest('label')?.classList.add('is-off');
  }
  if (dots) dots.checked = true;
}

// The context came back. Offer the smoke again, but leave it switched off — the
// reader is looking at the dots now, and turning it on for them isn't ours to do.
function restoreSmoke(toggles: Map<string, HTMLInputElement>): void {
  const smoke = toggles.get('smoke');
  if (!smoke) return;
  smoke.disabled = false;
  smoke.closest('label')?.classList.remove('is-off');
}

// The solver is injected from here rather than sitting in <head> for two
// reasons, and both bite:
//
//   · hx-boost swaps only <body>, so a head-loaded bundle never arrives when you
//     navigate to /quotes from another page — only on a hard load.
//   · Loading it after the bridge exists is what stops it racing ts/main.ts's
//     deferred init. The ready event covers the other order, when the script is
//     already loaded and only needs re-running.
function loadSolver(root: HTMLElement): void {
  const src = root.dataset.quotesSolver;
  if (!src || document.querySelector(`script[data-quotes-solver-src="${src}"]`)) return;
  const tag = document.createElement('script');
  tag.src = src;
  tag.defer = true;
  tag.dataset.quotesSolverSrc = src;
  const integrity = root.dataset.quotesSolverIntegrity;
  if (integrity) {
    tag.integrity = integrity;
    tag.crossOrigin = 'anonymous';
  }
  document.head.appendChild(tag);
}
