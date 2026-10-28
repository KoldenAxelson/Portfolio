// Wake on sight: the /misc card bands (partials/misc/card.html, whose first
// child span is the band) animate only while the whole band is on screen.
// Thirty-odd animated cards running at once kept the main thread busy for most
// of every second; a screenful is 8–12 cards, and a sleeping card costs nothing.
//
// THE CONTRACT, for every band and anything drawn in one:
//   · The band carries data-asleep="true" or "false" ("true" from the markup,
//     partials/misc/card.html, so scripts that mount first can find it). Script-driven bands
//     (scripts/pages/misc-cards/card-kit.ts, the quotes engine, emergence)
//     check it before doing work, and listen for the `card:wake` event on the
//     band to start again.
//   · CSS animations inside a band are handled here: paused on a poster frame
//     while asleep, played while awake. A partial picks its poster moment with
//     data-poster="0.45" (a fraction of its longest cycle) on any element in
//     the band; 0.45 is the default, where most loops are fully built.
//
// Awake means fully on screen: the IntersectionObserver measures against the
// viewport clipped by every scrolling ancestor, so a card half-hidden at the
// edge of its shelf, or half off the bottom of the page, stays asleep. The
// same rule on every device; nothing depends on hover. A card falls asleep
// AFTERLIFE_MS after it stops being fully visible, and then only when its loop
// next reaches the poster frame, so it always rests on a finished picture,
// never mid-transition. Reduced motion never wakes anything.

const AFTERLIFE_MS = 1500;
const DEFAULT_POSTER = 0.45;
const SETTLE_CYCLES = 2; // seek past every start delay before the first rest
// "Fully" visible, with a hair of slack for sub-pixel layout: a band whose
// border is a fraction of a pixel inside the shelf's edge still counts.
const FULLY_VISIBLE = 0.97;

interface Band {
  el: HTMLElement;
  poster: number;
  sleepTimer: number;
  settleTimer: number;
}

let teardown: (() => void) | null = null;

const cssAnimations = (el: HTMLElement): CSSAnimation[] =>
  el.getAnimations({ subtree: true }).filter((a): a is CSSAnimation => a instanceof CSSAnimation);

const longestCycle = (anims: Animation[]): number =>
  Math.max(0, ...anims.map((a) => Number(a.effect?.getComputedTiming().duration) || 0));

// Rest every CSS animation in the band on the poster moment of the next cycle.
function restOnPoster(band: Band): void {
  const anims = cssAnimations(band.el);
  const cycle = longestCycle(anims);
  if (!cycle) return;
  const reference = anims.find((a) => Number(a.effect?.getComputedTiming().duration) === cycle);
  const now = Number(reference?.currentTime) || 0;
  const posterAt = band.poster * cycle;
  let next = Math.ceil((now - posterAt) / cycle) * cycle + posterAt;
  next = Math.max(next, SETTLE_CYCLES * cycle + posterAt);
  for (const a of anims) {
    a.currentTime = next;
    a.pause();
  }
}

function setAwake(band: Band, awake: boolean): void {
  window.clearTimeout(band.sleepTimer);
  window.clearTimeout(band.settleTimer);
  if (awake) {
    if (band.el.dataset.asleep === 'false') return;
    band.el.dataset.asleep = 'false';
    for (const a of cssAnimations(band.el)) a.play();
    band.el.dispatchEvent(new CustomEvent('card:wake'));
    return;
  }
  if (band.el.dataset.asleep === 'true') return; // never woke: already resting
  // Afterlife, then run on to the poster frame and stop there.
  band.sleepTimer = window.setTimeout(() => {
    const anims = cssAnimations(band.el);
    const cycle = longestCycle(anims);
    const reference = anims.find((a) => Number(a.effect?.getComputedTiming().duration) === cycle);
    const now = Number(reference?.currentTime) || 0;
    const posterAt = band.poster * cycle;
    const wait = cycle ? Math.ceil((now - posterAt) / cycle) * cycle + posterAt - now : 0;
    band.settleTimer = window.setTimeout(() => {
      band.el.dataset.asleep = 'true';
      restOnPoster(band);
      band.el.dispatchEvent(new CustomEvent('card:sleep'));
    }, wait);
  }, AFTERLIFE_MS);
}

export function initCardWake(): void {
  teardown?.();
  teardown = null;
  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-misc-card]'));
  if (!cards.length) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const bands: Band[] = [];
  for (const card of cards) {
    const el = card.firstElementChild as HTMLElement | null;
    if (!el) continue;
    const posterEl = el.querySelector<HTMLElement>('[data-poster]');
    const band: Band = { el, poster: Number(posterEl?.dataset.poster ?? DEFAULT_POSTER), sleepTimer: 0, settleTimer: 0 };
    el.dataset.asleep = 'true';
    restOnPoster(band);
    bands.push(band);
  }

  const cleanups: (() => void)[] = [];
  if (!reduce) {
    const byEl = new Map(bands.map((b) => [b.el, b]));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const band = byEl.get(entry.target as HTMLElement);
          if (band) setAwake(band, entry.isIntersecting && entry.intersectionRatio >= FULLY_VISIBLE);
        }
      },
      { threshold: [0, FULLY_VISIBLE, 1] },
    );
    for (const b of bands) observer.observe(b.el);
    cleanups.push(() => observer.disconnect());
  }

  teardown = () => {
    for (const b of bands) {
      window.clearTimeout(b.sleepTimer);
      window.clearTimeout(b.settleTimer);
    }
    for (const c of cleanups) c();
  };
}

/** For band scripts: is the band this element sits in asleep right now? */
export const isAsleep = (el: Element): boolean => el.closest('[data-asleep]')?.getAttribute('data-asleep') === 'true';
