// Shared game-card logic for the impossible list's two detail surfaces: the
// desktop drawer (impossible-modal.ts) and the mobile top-nav panel (nav.ts).
// Both read the same [data-game-open] dataset and fill structurally identical
// card markup, so the populate + carousel-dot-sync steps live here once —
// a fix or new field lands on both surfaces automatically. Each surface keeps
// its own open/close choreography (drawer slide vs panel mode switch).
import { buildStars, buildCarousel, buildSeries, buildDots, setActiveDot } from '../widgets/stars';
import type { MediaImage, SeriesEntry } from '../widgets/stars';

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
  textToggle: HTMLElement | null;
}

type TextMode = 'review' | 'pitch';

// The review and pitch ride on the blurb element's dataset so the toggle's click
// handler (wireTextToggle) can swap them without knowing which book is open. The
// toggle shows the icon for what's on screen (star = review, book = pitch) and
// labels itself with what a click switches to.
const TOGGLE_LABELS: Record<TextMode, string> = {
  review: 'Showing my review. Switch to the pitch',
  pitch: 'Showing the pitch. Switch to my review',
};

function showText(blurb: HTMLElement, toggle: HTMLElement | null, mode: TextMode): void {
  blurb.textContent = (mode === 'pitch' ? blurb.dataset.pitch : blurb.dataset.review) || '';
  if (!toggle) return;
  toggle.dataset.mode = mode;
  toggle.setAttribute('aria-label', TOGGLE_LABELS[mode]);
  toggle.title = TOGGLE_LABELS[mode];
  for (const icon of Array.from(toggle.querySelectorAll<HTMLElement>('[data-text-icon]'))) {
    icon.hidden = icon.dataset.textIcon !== mode;
  }
}

// Fill a card from a trigger's dataset: title, blurb (your review, else the
// pitch, with a toggle when a book has both), image carousel (+dots),
// star rating OR status line (rating wins when both exist), series checklist,
// and the matching console icon.
export function populateGameCard(d: DOMStringMap, els: GameCardEls): void {
  if (els.title) els.title.textContent = d.title || '';
  if (els.blurb) {
    const review = d.blurb || '';
    const pitch = d.pitch || '';
    els.blurb.dataset.review = review;
    els.blurb.dataset.pitch = pitch;
    // A series' per-slide pitches ride along for showSlide (below).
    els.blurb.dataset.entryPitch = pitch;
    els.blurb.dataset.slidePitches = d.slidePitches || '';
    els.blurb.dataset.slideSeries = d.slideSeries || '';
    els.blurb.dataset.slide = '';
    if (els.textToggle) els.textToggle.hidden = !(review && pitch);
    showText(els.blurb, els.textToggle, review ? 'review' : 'pitch');
  }
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
    // The drawer is often still hidden at this point, and a hidden scroller
    // ignores scrollLeft, so it would reopen on the last card's slide. Reset
    // again once it is laid out; the scroll event re-syncs dots and text.
    const media = els.media;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      media.scrollLeft = 0;
    }));
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
  // Start on the first slide's book (after the series list exists to mark).
  if (els.blurb) showSlide(0, els.blurb, els.textToggle, els.series);
}

const parseList = <T>(raw: string | undefined): T[] => {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

// A series card pairs each carousel image with one of its books
// (impossible-list/book-card.html builds the pairing). Landing on an image
// swaps the pitch to that book's, falling back to the entry's own pitch, and
// marks the book in the series checklist. Only the pitch follows the slide:
// the review is about the whole entry, so it stays put until the toggle flips
// to the pitch. A card without a pairing is left alone.
function showSlide(idx: number, blurb: HTMLElement, toggle: HTMLElement | null, series: HTMLElement | null): void {
  const pitches = parseList<string>(blurb.dataset.slidePitches);
  if (!pitches.length || blurb.dataset.slide === String(idx)) return;
  blurb.dataset.slide = String(idx);
  blurb.dataset.pitch = pitches[idx] || blurb.dataset.entryPitch || '';
  const mode: TextMode = toggle && !toggle.hidden && toggle.dataset.mode === 'review' ? 'review' : 'pitch';
  if (mode === 'pitch' || !blurb.dataset.review) showText(blurb, toggle, 'pitch');
  if (!series) return;
  const row = parseList<number>(blurb.dataset.slideSeries)[idx];
  for (const li of Array.from(series.querySelectorAll<HTMLElement>('[data-series-row]'))) {
    if (Number(li.dataset.seriesRow) === row) li.setAttribute('aria-current', 'true');
    else li.removeAttribute('aria-current');
  }
}

// Follow the carousel with the pitch and checklist (showSlide). Passive, like
// the dots: it only reads the scroll position.
export function wireCarouselText(
  media: HTMLElement | null,
  blurb: HTMLElement | null,
  toggle: HTMLElement | null,
  series: HTMLElement | null,
): void {
  if (!media || !blurb) return;
  media.addEventListener(
    'scroll',
    () => {
      if (!media.clientWidth) return;
      showSlide(Math.round(media.scrollLeft / media.clientWidth), blurb, toggle, series);
    },
    { passive: true },
  );
}

// Swap between review and pitch. Wired once per surface; the texts themselves
// are refreshed by populateGameCard on every open.
export function wireTextToggle(toggle: HTMLElement | null, blurb: HTMLElement | null): void {
  if (!toggle || !blurb) return;
  toggle.addEventListener('click', () => {
    showText(blurb, toggle, toggle.dataset.mode === 'pitch' ? 'review' : 'pitch');
  });
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
