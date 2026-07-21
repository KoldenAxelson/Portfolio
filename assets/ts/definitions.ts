// Glossary definitions — tap a {{< term >}} word to open its definition.
//
// DESKTOP (>=1024px) only: a card slides in from the right, seated in the gutter
// beside the text when it fits. On MOBILE the term routes into the shared top-nav
// panel instead (a 'definition' mode — see topnav.html / sub-nav.ts). The slide /
// dismiss lifecycle is the shared drawer (drawer.ts); this file owns only the
// glossary card's markup, its label/body fill, and the gutter positioning.
import { createDrawer } from './drawer';

const CARD_FALLBACK_W = 304;
const EDGE = 24;
const GAP = 24;

let resizeBound = false;

function buildDrawer(): HTMLElement {
  const existing = document.getElementById('def-drawer');
  if (existing) return existing;
  const drawer = document.createElement('div');
  drawer.id = 'def-drawer';
  drawer.className = 'def-drawer';
  drawer.hidden = true;
  drawer.innerHTML =
    '<div class="def-drawer__card" role="dialog" aria-label="Definition" tabindex="-1">' +
    '<div class="def-card__head"><p class="def-card__label"></p>' +
    '<button type="button" class="def-close" data-def-close aria-label="Close definition">' +
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18 18 6M6 6l12 12"/></svg>' +
    '</button></div><p class="def-card__body"></p></div>';
  document.body.appendChild(drawer);
  return drawer;
}

// Seat the card in the gutter to the right of the text column when it fits there
// (so it never covers the prose); otherwise pin it to the viewport edge.
function positionCard(card: HTMLElement): void {
  const vw = document.documentElement.clientWidth;
  const main = document.querySelector('main');
  const contentRight = main ? main.getBoundingClientRect().right : vw / 2 + 360;
  const cardW = card.offsetWidth || CARD_FALLBACK_W;
  if (vw - contentRight >= cardW + GAP) {
    card.style.left = Math.min(contentRight + GAP, vw - cardW - EDGE) + 'px';
    card.style.right = 'auto';
  } else {
    card.style.left = 'auto';
    card.style.right = EDGE + 'px';
  }
}

export function initDefinitions(): void {
  const root = buildDrawer();
  const card = root.querySelector<HTMLElement>('.def-drawer__card');
  const label = root.querySelector<HTMLElement>('.def-card__label');
  const body = root.querySelector<HTMLElement>('.def-card__body');
  if (!card || !label || !body) return;

  createDrawer(
    {
      id: 'definition',
      root,
      card,
      trigger: '[data-term-def]',
      closeButton: '[data-def-close]',
      outsideClickCloses: true,
      toggleCloses: true,
    },
    {
      populate: (trigger) => {
        label.textContent = trigger.getAttribute('data-term-label') || '';
        body.textContent = trigger.getAttribute('data-term-def') || '';
      },
      onOpen: () => positionCard(card),
    },
  );

  // A resized window can move the text column, so re-seat an open card. Bound
  // once — it re-reads the current card each time, so it survives hx-boost swaps.
  if (!resizeBound) {
    resizeBound = true;
    window.addEventListener('resize', () => {
      const open = document.querySelector<HTMLElement>('#def-drawer[data-open] .def-drawer__card');
      if (open) positionCard(open);
    });
  }
}
