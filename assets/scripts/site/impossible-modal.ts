// Impossible-list game detail — DESKTOP drawer. Completed game line items
// ([data-game-open]) carry their title / rating / blurb / image on data
// attributes; on desktop (>=1024px) clicking one slides the shared drawer in from
// the right. On mobile the same buttons feed the top-nav panel instead
// (sub-nav.ts), so the drawer's desktop gate lets those taps through.
//
// The slide / swap / dismiss lifecycle lives in drawer.ts; this file keeps only
// what's specific to the game card: filling it (game-card.ts), paging its image
// carousel with the arrow keys, and the full-screen lightbox layered over it.
import { populateGameCard, wireCarouselDots } from './game-card';
import { createDrawer } from './drawer';

let docKeyHandler: ((e: KeyboardEvent) => void) | null = null;

export function initGameModal(): void {
  const modal = document.querySelector<HTMLElement>('[data-game-modal]');
  if (!modal) return;
  const triggers = document.querySelectorAll<HTMLButtonElement>('[data-game-open]');
  if (!triggers.length) return;

  const dialog = modal.querySelector<HTMLElement>('[role="dialog"]');
  const mediaEl = modal.querySelector<HTMLElement>('[data-game-media]');
  const dotsEl = modal.querySelector<HTMLElement>('[data-game-dots]');
  const lightbox = modal.querySelector<HTMLElement>('[data-game-lightbox]');
  const lightboxImg = modal.querySelector<HTMLImageElement>('[data-game-lightbox-img]');
  const lbPrev = modal.querySelector<HTMLElement>('[data-game-lightbox-prev]');
  const lbNext = modal.querySelector<HTMLElement>('[data-game-lightbox-next]');

  // Card slots for the shared populate step (game-card.ts). The drawer keeps only
  // what's unique here: the carousel, the lightbox, and arrow-key paging.
  const cardEls = {
    title: modal.querySelector<HTMLElement>('[data-game-title]'),
    blurb: modal.querySelector<HTMLElement>('[data-game-blurb]'),
    media: mediaEl,
    dots: dotsEl,
    stars: modal.querySelector<HTMLElement>('[data-game-stars]'),
    status: modal.querySelector<HTMLElement>('[data-game-status]'),
    series: modal.querySelector<HTMLElement>('[data-game-series]'),
    consoleIcons: Array.from(modal.querySelectorAll<HTMLElement>('[data-console-icon-for]')),
  };

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

  const drawer = createDrawer(
    {
      id: 'game',
      root: modal,
      card: dialog || modal,
      trigger: '[data-game-open]',
      closeButton: '[data-game-close]',
      animateSwap: true,
    },
    {
      populate: (trigger) => populateGameCard(trigger.dataset, cardEls),
      onOpen: () => (dialog || modal.querySelector<HTMLElement>('[data-game-close]'))?.focus(),
      onClose: () => {
        if (lightbox) lightbox.hidden = true;
      },
      // While the lightbox is up it owns Escape (to close itself); don't let the
      // drawer close underneath it.
      blockClose: () => Boolean(lightbox && !lightbox.hidden),
    },
  );

  // Arrow keys page the carousel, or the lightbox when it's open; the lightbox
  // also handles its own Escape. Drawer Escape/close is drawer.ts's job.
  const onKeydown = (e: KeyboardEvent): void => {
    if (!drawer.isOpen()) return;
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
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      stepCarousel(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      stepCarousel(1);
    }
  };

  wireCarouselDots(mediaEl, dotsEl);
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

  // Document-level so the keys work wherever focus sits while the card is open.
  // Guarded so it doesn't accumulate across hx-boost swaps.
  if (docKeyHandler) document.removeEventListener('keydown', docKeyHandler);
  docKeyHandler = onKeydown;
  document.addEventListener('keydown', onKeydown);
}
