// Impossible-list game detail — DESKTOP drawer. Completed game line items
// ([data-game-open]) carry their title / rating / blurb / image on data
// attributes; on desktop (≥1024px) clicking one opens the shared [data-game-modal]
// drawer. On mobile the same buttons feed the top-nav panel instead (ts/nav.ts),
// so this handler is gated to desktop. Idempotent across hx-boost swaps.
import { buildStars, buildCarousel, buildSeries, buildDots, setActiveDot } from './stars';
import type { MediaImage, SeriesEntry } from './stars';

const DESKTOP = '(min-width: 1024px)';
let docKeyHandler: ((e: KeyboardEvent) => void) | null = null;

export function initGameModal(): void {
  const modal = document.querySelector<HTMLElement>('[data-game-modal]');
  if (!modal) return;
  const triggers = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-game-open]'));
  if (!triggers.length) return;

  const dialog = modal.querySelector<HTMLElement>('[role="dialog"]');
  const mediaEl = modal.querySelector<HTMLElement>('[data-game-media]');
  const dotsEl = modal.querySelector<HTMLElement>('[data-game-dots]');
  const consoleIcons = Array.from(modal.querySelectorAll<HTMLElement>('[data-console-icon-for]'));
  const titleEl = modal.querySelector<HTMLElement>('[data-game-title]');
  const starsEl = modal.querySelector<HTMLElement>('[data-game-stars]');
  const statusEl = modal.querySelector<HTMLElement>('[data-game-status]');
  const seriesEl = modal.querySelector<HTMLElement>('[data-game-series]');
  const blurbEl = modal.querySelector<HTMLElement>('[data-game-blurb]');
  const lightbox = modal.querySelector<HTMLElement>('[data-game-lightbox]');
  const lightboxImg = modal.querySelector<HTMLImageElement>('[data-game-lightbox-img]');
  const lbPrev = modal.querySelector<HTMLElement>('[data-game-lightbox-prev]');
  const lbNext = modal.querySelector<HTMLElement>('[data-game-lightbox-next]');
  let lbImgs: string[] = [];
  let lbIndex = 0;
  const lbStep = (delta: number): void => {
    if (!lightboxImg || lbImgs.length < 2) return;
    lbIndex = (lbIndex + delta + lbImgs.length) % lbImgs.length;
    lightboxImg.src = lbImgs[lbIndex];
  };

  // Page the in-card carousel (wrapping) — used by arrow keys while the card is open.
  const stepCarousel = (delta: number): void => {
    if (!mediaEl) return;
    const count = mediaEl.children.length;
    if (count < 2 || !mediaEl.clientWidth) return;
    const idx = Math.round(mediaEl.scrollLeft / mediaEl.clientWidth);
    const next = (idx + delta + count) % count;
    mediaEl.scrollTo({ left: next * mediaEl.clientWidth, behavior: 'smooth' });
  };
  let lastFocused: HTMLElement | null = null;
  let closeTimer = 0;
  let swapTimer = 0;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CLOSE_MS = 320; // keep in sync with the transition in base.css
  const SWAP_OUT_MS = 280; // old card slides out before the new slides in

  const close = (): void => {
    if (modal.hidden || !modal.hasAttribute('data-open')) return;
    window.clearTimeout(swapTimer);
    if (lightbox) lightbox.hidden = true;
    modal.removeAttribute('data-open'); // triggers the slide out
    lastFocused?.focus();
    if (reduceMotion) {
      modal.hidden = true;
    } else {
      window.clearTimeout(closeTimer);
      closeTimer = window.setTimeout(() => {
        modal.hidden = true;
      }, CLOSE_MS);
    }
  };

  const populate = (btn: HTMLButtonElement): void => {
    const d = btn.dataset;
    lastFocused = btn;
    if (titleEl) titleEl.textContent = d.title || '';
    if (blurbEl) blurbEl.textContent = d.blurb || '';
    if (mediaEl) {
      let imgs: MediaImage[] = [];
      try {
        imgs = JSON.parse(d.images || '[]');
      } catch {
        imgs = [];
      }
      mediaEl.innerHTML = buildCarousel(imgs);
      mediaEl.setAttribute('data-kind', d.kind || 'game');
      mediaEl.scrollLeft = 0;
      if (dotsEl) {
        if (imgs.length > 1) {
          dotsEl.innerHTML = buildDots(imgs.length);
          setActiveDot(dotsEl, 0);
          dotsEl.hidden = false;
        } else {
          dotsEl.innerHTML = '';
          dotsEl.hidden = true;
        }
      }
    }
    const rating = parseFloat(d.rating || '0');
    const hasRating = Boolean(d.rating) && rating > 0;
    if (starsEl) {
      if (hasRating) {
        starsEl.innerHTML = buildStars(rating);
        starsEl.setAttribute('role', 'img');
        starsEl.setAttribute('aria-label', `Rated ${rating.toFixed(1)} out of 5`);
        starsEl.hidden = false;
      } else {
        starsEl.innerHTML = '';
        starsEl.hidden = true;
      }
    }
    if (statusEl) {
      if (d.status && !hasRating) {
        statusEl.textContent = d.status;
        statusEl.hidden = false;
      } else {
        statusEl.hidden = true;
      }
    }
    if (seriesEl) {
      let entries: SeriesEntry[] = [];
      if (d.series) {
        try {
          entries = JSON.parse(d.series);
        } catch {
          entries = [];
        }
      }
      seriesEl.innerHTML = entries.length ? buildSeries(entries) : '';
      seriesEl.hidden = entries.length === 0;
    }
    for (const el of consoleIcons) {
      el.hidden = el.getAttribute('data-console-icon-for') !== d.console;
    }
  };

  const open = (btn: HTMLButtonElement): void => {
    window.clearTimeout(closeTimer);
    window.clearTimeout(swapTimer);
    // A card is already showing → slide the whole card out to the right, then
    // slide a fresh card in from the right to take its place.
    if (!modal.hidden && modal.hasAttribute('data-open') && !reduceMotion) {
      modal.removeAttribute('data-open'); // slide + fade out to the right
      swapTimer = window.setTimeout(() => {
        populate(btn);
        void modal.offsetWidth; // ensure it's at the off-screen start
        modal.setAttribute('data-open', ''); // new card slides + fades in from the right
        (dialog || modal.querySelector<HTMLElement>('[data-game-close]'))?.focus();
      }, SWAP_OUT_MS);
      return;
    }
    // Fresh open (or reduced motion) → slide + fade in from the right.
    populate(btn);
    modal.hidden = false;
    void modal.offsetWidth; // reflow so the slide+fade runs from the closed state
    modal.setAttribute('data-open', '');
    (dialog || modal.querySelector<HTMLElement>('[data-game-close]'))?.focus();
  };

  const onKeydown = (e: KeyboardEvent): void => {
    if (modal.hidden) return;
    if (lightbox && !lightbox.hidden) {
      if (e.key === 'Escape') lightbox.hidden = true;
      else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        lbStep(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        lbStep(1);
      }
      return;
    }
    if (e.key === 'Escape') {
      close();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      stepCarousel(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      stepCarousel(1);
    }
  };

  for (const btn of triggers) {
    btn.addEventListener('click', () => {
      if (!window.matchMedia(DESKTOP).matches) return; // mobile → nav panel handles it
      open(btn);
    });
  }
  for (const el of Array.from(modal.querySelectorAll<HTMLElement>('[data-game-close]'))) {
    el.addEventListener('click', close);
  }
  // Update the active carousel dot as the media scrolls.
  if (mediaEl && dotsEl) {
    mediaEl.addEventListener(
      'scroll',
      () => {
        if (dotsEl.hidden || !mediaEl.clientWidth) return;
        setActiveDot(dotsEl, Math.round(mediaEl.scrollLeft / mediaEl.clientWidth));
      },
      { passive: true },
    );
  }
  // Click a carousel image to enlarge it in the lightbox; click the lightbox to close.
  if (mediaEl && lightbox && lightboxImg) {
    mediaEl.addEventListener('click', (e) => {
      const t = (e.target as HTMLElement).closest<HTMLImageElement>('img[data-full]');
      if (!t) return;
      const imgEls = Array.from(mediaEl.querySelectorAll<HTMLImageElement>('img[data-full]'));
      lbImgs = imgEls.map((i) => i.getAttribute('data-full') || i.src);
      lbIndex = Math.max(0, imgEls.indexOf(t));
      lightboxImg.src = lbImgs[lbIndex];
      const multi = lbImgs.length > 1;
      if (lbPrev) lbPrev.hidden = !multi;
      if (lbNext) lbNext.hidden = !multi;
      lightbox.hidden = false;
      lightbox.focus();
    });
    lightbox.addEventListener('click', () => {
      lightbox.hidden = true;
    });
    lbPrev?.addEventListener('click', (e) => {
      e.stopPropagation();
      lbStep(-1);
    });
    lbNext?.addEventListener('click', (e) => {
      e.stopPropagation();
      lbStep(1);
    });
  }
  // Document-level so Esc / arrow keys work no matter where focus is while the
  // card or lightbox is open. Guarded so it doesn't accumulate across hx-boost swaps.
  if (docKeyHandler) document.removeEventListener('keydown', docKeyHandler);
  docKeyHandler = onKeydown;
  document.addEventListener('keydown', onKeydown);
}
