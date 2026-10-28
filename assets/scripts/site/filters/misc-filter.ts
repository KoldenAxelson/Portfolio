// /misc search. Cards carry [data-misc-card] plus a lowercased [data-misc-terms]
// haystack built by the template, so this never has to walk card markup to know
// what a card says. Substring match, not fuzzy — the shelf is small enough that
// anything cleverer would only be harder to predict.
//
// Works alongside the shelf bubbles (type-filter.ts), which hide whole
// <section data-types>. This script only ever touches each card's shelf slot
// and the [data-misc-group] wrapper inside each section, so neither undoes the other's
// `hidden`. The empty-state line counts only cards on a shelf that is showing.
//
// The field ships hidden and is revealed here: without JS it would be an input
// that silently does nothing, which is worse than not offering one.

const slotOf = (card: HTMLElement): HTMLElement => card.closest<HTMLElement>('li') ?? card;

export function initMiscFilter(): void {
  const input = document.querySelector<HTMLInputElement>('[data-misc-search]');
  if (!input) return;

  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-misc-card]'));
  if (!cards.length) return;

  const groups = Array.from(document.querySelectorAll<HTMLElement>('[data-misc-group]'));
  const wrap = document.querySelector<HTMLElement>('[data-misc-search-wrap]');
  const empty = document.querySelector<HTMLElement>('[data-misc-empty]');
  if (wrap) wrap.hidden = false;

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

  // A shelf bubble can leave the search with nothing visible (or rescue it);
  // re-run after type-filter.ts, whose click handler was bound first.
  for (const btn of Array.from(document.querySelectorAll<HTMLElement>('[data-filter-type]'))) {
    btn.addEventListener('click', apply);
  }

  // Run once on init: the browser may have restored a value on a back-navigation.
  apply();
}
