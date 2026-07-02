// Shared game-card logic for the impossible list's two detail surfaces: the
// desktop drawer (impossible-modal.ts) and the mobile top-nav panel (nav.ts).
// Both read the same [data-game-open] dataset and fill structurally identical
// card markup, so the populate + carousel-dot-sync steps live here once —
// a fix or new field lands on both surfaces automatically. Each surface keeps
// its own open/close choreography (drawer slide vs panel mode switch).
import { buildStars, buildCarousel, buildSeries, buildDots, setActiveDot } from './stars';
import type { MediaImage, SeriesEntry } from './stars';

// The card's slots. Every slot is optional (null) — a surface that omits one
// simply skips it, matching how both surfaces already behaved.
export interface GameCardEls {
  title: HTMLElement | null;
  blurb: HTMLElement | null;
  media: HTMLElement | null;
  dots: HTMLElement | null;
  stars: HTMLElement | null;
  status: HTMLElement | null;
  series: HTMLElement | null;
  consoleIcons: HTMLElement[];
}

// Fill a card from a trigger's dataset: title, blurb, image carousel (+dots),
// star rating OR status line (rating wins when both exist), series checklist,
// and the matching console icon.
export function populateGameCard(d: DOMStringMap, els: GameCardEls): void {
  if (els.title) els.title.textContent = d.title || '';
  if (els.blurb) els.blurb.textContent = d.blurb || '';
  if (els.media) {
    let imgs: MediaImage[] = [];
    try {
      imgs = JSON.parse(d.images || '[]');
    } catch {
      imgs = [];
    }
    els.media.innerHTML = buildCarousel(imgs);
    els.media.setAttribute('data-kind', d.kind || 'game');
    els.media.scrollLeft = 0;
    if (els.dots) {
      if (imgs.length > 1) {
        els.dots.innerHTML = buildDots(imgs.length);
        setActiveDot(els.dots, 0);
        els.dots.hidden = false;
      } else {
        els.dots.innerHTML = '';
        els.dots.hidden = true;
      }
    }
  }
  const rating = parseFloat(d.rating || '0');
  const hasRating = Boolean(d.rating) && rating > 0;
  if (els.stars) {
    if (hasRating) {
      els.stars.innerHTML = buildStars(rating);
      els.stars.setAttribute('role', 'img');
      els.stars.setAttribute('aria-label', `Rated ${rating.toFixed(1)} out of 5`);
      els.stars.hidden = false;
    } else {
      els.stars.innerHTML = '';
      els.stars.hidden = true;
    }
  }
  if (els.status) {
    if (d.status && !hasRating) {
      els.status.textContent = d.status;
      els.status.hidden = false;
    } else {
      els.status.hidden = true;
    }
  }
  if (els.series) {
    let entries: SeriesEntry[] = [];
    if (d.series) {
      try {
        entries = JSON.parse(d.series);
      } catch {
        entries = [];
      }
    }
    els.series.innerHTML = entries.length ? buildSeries(entries) : '';
    els.series.hidden = entries.length === 0;
  }
  for (const el of els.consoleIcons) {
    el.hidden = el.getAttribute('data-console-icon-for') !== d.console;
  }
}

// Keep the active dot in sync while the carousel scroll-snaps. Passive: the
// handler only reads scroll position, never blocks the scroll.
export function wireCarouselDots(media: HTMLElement | null, dots: HTMLElement | null): void {
  if (!media || !dots) return;
  media.addEventListener(
    'scroll',
    () => {
      if (dots.hidden || !media.clientWidth) return;
      setActiveDot(dots, Math.round(media.scrollLeft / media.clientWidth));
    },
    { passive: true },
  );
}
