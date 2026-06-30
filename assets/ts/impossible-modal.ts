// Impossible-list game detail — DESKTOP drawer. Completed game line items
// ([data-game-open]) carry their title / rating / blurb / image on data
// attributes; on desktop (≥1024px) clicking one opens the shared [data-game-modal]
// drawer. On mobile the same buttons feed the top-nav panel instead (ts/nav.ts),
// so this handler is gated to desktop. Idempotent across hx-boost swaps.
import { buildStars, buildCarousel, buildSeries } from './stars';
import type { MediaImage, SeriesEntry } from './stars';

const FOCUSABLE = 'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])';
const DESKTOP = '(min-width: 1024px)';

export function initGameModal(): void {
  const modal = document.querySelector<HTMLElement>('[data-game-modal]');
  if (!modal) return;
  const triggers = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-game-open]'));
  if (!triggers.length) return;

  const dialog = modal.querySelector<HTMLElement>('[role="dialog"]');
  const mediaEl = modal.querySelector<HTMLElement>('[data-game-media]');
  const consoleIcons = Array.from(modal.querySelectorAll<HTMLElement>('[data-console-icon-for]'));
  const titleEl = modal.querySelector<HTMLElement>('[data-game-title]');
  const starsEl = modal.querySelector<HTMLElement>('[data-game-stars]');
  const statusEl = modal.querySelector<HTMLElement>('[data-game-status]');
  const seriesEl = modal.querySelector<HTMLElement>('[data-game-series]');
  const blurbEl = modal.querySelector<HTMLElement>('[data-game-blurb]');
  const lightbox = modal.querySelector<HTMLElement>('[data-game-lightbox]');
  const lightboxImg = modal.querySelector<HTMLImageElement>('[data-game-lightbox-img]');
  let lastFocused: HTMLElement | null = null;
  let closeTimer = 0;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CLOSE_MS = 320; // keep in sync with the transition in base.css

  const close = (): void => {
    if (modal.hidden || !modal.hasAttribute('data-open')) return;
    if (lightbox) lightbox.hidden = true;
    modal.removeAttribute('data-open'); // triggers the slide/fade out
    document.documentElement.style.removeProperty('overflow');
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

  const open = (btn: HTMLButtonElement): void => {
    const d = btn.dataset;
    lastFocused = btn;
    window.clearTimeout(closeTimer);
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
    modal.hidden = false;
    void modal.offsetWidth; // reflow so the transition runs from the closed state
    modal.setAttribute('data-open', '');
    document.documentElement.style.overflow = 'hidden';
    (modal.querySelector<HTMLElement>('[data-game-close]') || dialog)?.focus();
  };

  const onKeydown = (e: KeyboardEvent): void => {
    if (modal.hidden) return;
    if (e.key === 'Escape') {
      if (lightbox && !lightbox.hidden) {
        lightbox.hidden = true;
        return;
      }
      close();
      return;
    }
    if (e.key !== 'Tab' || !dialog) return;
    const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null,
    );
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
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
  // Click a carousel image to enlarge it in the lightbox; click the lightbox to close.
  if (mediaEl && lightbox && lightboxImg) {
    mediaEl.addEventListener('click', (e) => {
      const t = (e.target as HTMLElement).closest<HTMLImageElement>('img[data-full]');
      if (!t) return;
      lightboxImg.src = t.getAttribute('data-full') || t.src;
      lightbox.hidden = false;
    });
    lightbox.addEventListener('click', () => {
      lightbox.hidden = true;
    });
  }
  // Bound to the modal (re-created on hx-boost swaps) rather than document, so
  // listeners don't accumulate; focus is trapped inside, so Esc/Tab still reach it.
  modal.addEventListener('keydown', onKeydown);
}
