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

  // ---- the loop -----------------------------------------------------------

  const frame = (): void => {
    raf = requestAnimationFrame(frame);
    // Scrolled past, or a hidden fullscreen backdrop over the top of it: there
    // is nothing to see, so there's nothing worth spending a frame on.
    if (!onScreen) return;

    lattice.startOfFrame();
    const now = performance.now();
    const previous = lastFrame < 0 ? now - 16.67 : lastFrame;
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

  // ---- observers ----------------------------------------------------------

  let resizeTimer: number | null = null;
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

  const unwireFullscreen = wireFullscreen(root);

  dispose = (): void => {
    cancelAnimationFrame(raf);
    for (const timer of [holdTimer, resizeTimer, relayoutTimer]) {
      if (timer !== null) window.clearTimeout(timer);
    }
    resizeObserver.disconnect();
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
    onFail: () => fallBackToDots(toggles),
    onRecover: () => restoreSmoke(toggles),
  };
  loadSolver(root);
  document.dispatchEvent(new CustomEvent(QUOTES_READY_EVENT));

  relayout();
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
