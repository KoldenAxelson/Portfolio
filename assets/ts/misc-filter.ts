// /misc search. Cards carry [data-misc-card] plus a lowercased [data-misc-terms]
// haystack built by the template, so this never has to walk card markup to know
// what a card says. Substring match, not fuzzy — the shelf is small enough that
// anything cleverer would only be harder to predict.
//
// The field ships hidden and is revealed here: without JS it would be an input
// that silently does nothing, which is worse than not offering one.

export function initMiscFilter(): void {
  const input = document.querySelector<HTMLInputElement>('[data-misc-search]');
  if (!input) return;

  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-misc-card]'));
  if (!cards.length) return;

  const wrap = document.querySelector<HTMLElement>('[data-misc-search-wrap]');
  const empty = document.querySelector<HTMLElement>('[data-misc-empty]');
  if (wrap) wrap.hidden = false;

  const apply = (): void => {
    const query = input.value.trim().toLowerCase();
    let shown = 0;

    for (const card of cards) {
      const hit = !query || (card.dataset.miscTerms || '').includes(query);
      card.hidden = !hit;
      if (hit) shown += 1;
    }

    if (empty) empty.hidden = shown > 0;
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

  // Run once on init: the browser may have restored a value on a back-navigation.
  apply();
}
