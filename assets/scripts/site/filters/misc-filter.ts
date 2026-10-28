import { syncShelfRow } from '../widgets/shelf-row';

// /misc search. Cards carry [data-misc-card] plus a lowercased [data-misc-terms]
// haystack built by the template, so this never has to walk card markup to know
// what a card says. Substring match, not fuzzy — the shelf is small enough that
// anything cleverer would only be harder to predict.
//
// Works alongside the shelf filter (type-filter.ts), which hides whole
// <section data-types>. This script only touches each card's shelf slot and the
// [data-misc-group] inside each section, so neither undoes the other's `hidden`.

const slotOf = (card: HTMLElement): HTMLElement => card.closest<HTMLElement>('li') ?? card;

export function initMiscFilter(): void {
  const input = document.querySelector<HTMLInputElement>('[data-misc-search]');
  if (!input) return;

  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-misc-card]'));
  if (!cards.length) return;

  const groups = Array.from(document.querySelectorAll<HTMLElement>('[data-misc-group]'));
  const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-shelf-row]'));
  const empty = document.querySelector<HTMLElement>('[data-misc-empty]');

  const apply = (): void => {
    const query = input.value.trim().toLowerCase();

    // Hide the shelf slot (<li>), not just the card, so a filtered row closes
    // up instead of keeping card-width gaps.
    for (const card of cards) {
      slotOf(card).hidden = Boolean(query) && !(card.dataset.miscTerms || '').includes(query);
    }

    // A shelf whose cards all missed drops its heading too.
    for (const group of groups) {
      group.hidden = !cards.some((card) => group.contains(card) && !slotOf(card).hidden);
    }

    // A hidden card can't be a row's Tab stop, or Tab would skip the row.
    for (const row of rows) syncShelfRow(row);

    if (empty) {
      const shown = cards.some((card) => !slotOf(card).hidden && !card.closest('[data-types][hidden]'));
      empty.hidden = shown;
    }
  };

  input.addEventListener('input', apply);

  // Escape clears rather than blurring — a search input's native clear affordance
  // is inconsistent across browsers, and this keeps focus in the field.
  input.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !input.value) return;
    event.preventDefault();
    input.value = '';
    apply();
  });

  // Picking a shelf can leave the search with nothing visible (or rescue it);
  // re-run after type-filter.ts, whose click handler was bound first.
  for (const btn of Array.from(document.querySelectorAll<HTMLElement>('[data-filter-type]'))) {
    btn.addEventListener('click', apply);
  }

  // Run once on init: the browser may have restored a value on a back-navigation.
  apply();
}
