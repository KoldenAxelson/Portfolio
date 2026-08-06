// Recipe notes on /misc/skyrim/ — DESKTOP drawer.
//
// A recipe's notes and its alternate ingredient sets used to be a `<details>` inside the
// card. In a CSS grid every card in a row is as tall as the tallest, so opening one 300px
// note grew both of its neighbours by 300px of empty space, and everything below the row
// moved down with it. A disclosure is the wrong control for content that lives inside a
// row of equals.
//
// The whole card is the control now — a <button> stretched over it, so there is nothing
// small to aim at. The note opens in the shared drawer (drawer.ts) on desktop or the
// top-nav panel ('note' mode — see nav.ts / topnav.html) on mobile. Both halves are the
// ones the glossary terms and the completed-game cards already use; this file only says
// how to fill the card.
//
// The `<details>` is still server-rendered and is what a reader without JavaScript gets.
// The swap below hides it and reveals the button in one pass, so the page never offers two
// ways into the same content, and never offers a control that cannot work.
import { createDrawer } from './drawer';

export interface NoteSlots {
  title: HTMLElement | null;
  body: HTMLElement | null;
}

/** A trigger's note markup: the body of the `<details>` in the same card. */
function noteBodyOf(trigger: HTMLElement): string {
  const card = trigger.closest('.sky-card');
  const body = card ? card.querySelector<HTMLElement>('.sky-note__body') : null;
  return body ? body.innerHTML : '';
}

/**
 * Shared by the drawer and the mobile panel, so the two cannot drift — which is exactly
 * how the enchant picker lost `data-note` on one of its two copies.
 *
 * innerHTML rather than textContent: a note carries variant ingredient tiles and effect
 * chips, not a sentence. All of it is server-rendered from data/skyrim/potions.yaml
 * through the same partials the card itself uses, so nothing here came from a user.
 */
export function populateNoteCard(trigger: HTMLElement, slots: NoteSlots): void {
  if (slots.title) slots.title.textContent = trigger.getAttribute('data-note-title') || '';
  if (slots.body) slots.body.innerHTML = noteBodyOf(trigger);
}

function buildDrawer(): HTMLElement {
  const existing = document.getElementById('sky-note-drawer');
  if (existing) return existing;
  const drawer = document.createElement('div');
  drawer.id = 'sky-note-drawer';
  drawer.className = 'sky-drawer';
  drawer.hidden = true;
  drawer.innerHTML =
    '<div class="sky-drawer__card" role="dialog" aria-label="Recipe notes" tabindex="-1">' +
    '<div class="sky-drawer__head"><p class="sky-drawer__title"></p>' +
    '<button type="button" class="sky-drawer__close" data-sky-note-close aria-label="Close notes">' +
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M6 18 18 6M6 6l12 12"/></svg>' +
    // The body carries .sky-note__body as well: what gets poured into it is the card's own
    // markup, so it should inherit the note styling already in skyrim.css.
    '</button></div><div class="sky-drawer__body sky-note__body"></div></div>';
  document.body.appendChild(drawer);
  return drawer;
}

export function initSkyrimNotes(): void {
  const triggers = Array.from(document.querySelectorAll<HTMLElement>('[data-sky-note-open]'));
  if (!triggers.length) return;

  for (const trigger of triggers) {
    trigger.hidden = false;
    const card = trigger.closest('.sky-card');
    // Only a card that can be opened gets the hover treatment that says so. Every card in
    // the grid looks identical at rest, and half of them have no note — promising a
    // response the card cannot give is worse than a quiet one.
    if (card) card.classList.add('is-clickable');
    const details = card ? card.querySelector<HTMLDetailsElement>('details.sky-note') : null;
    if (details) {
      details.open = false;
      details.hidden = true;
    }
  }

  const root = buildDrawer();
  const card = root.querySelector<HTMLElement>('.sky-drawer__card');
  const title = root.querySelector<HTMLElement>('.sky-drawer__title');
  const body = root.querySelector<HTMLElement>('.sky-drawer__body');
  if (!card || !title || !body) return;

  createDrawer(
    {
      id: 'sky-note',
      root,
      card,
      trigger: '[data-sky-note-open]',
      closeButton: '[data-sky-note-close]',
      // Both true, unlike the game drawer: a recipe card is one of dozens in a grid, so
      // reading the next one means clicking off this one, and re-tapping the button you
      // just pressed is the obvious way to put it away.
      outsideClickCloses: true,
      toggleCloses: true,
    },
    {
      populate: (trigger) => populateNoteCard(trigger, { title, body }),
      onOpen: () => card.focus(),
    },
  );
}
