// The potion filter on /misc/skyrim/.
//
// A progressive enhancement over server-rendered markup: every card is already
// in the HTML, and filtering is substring matching over each card's data-search
// attribute (title, tag, effects, ingredient names and slugs). The box ships
// hidden and is revealed here, so a reader without JavaScript is never shown a
// control that cannot work.

import { queryAll } from './util';

export function initFilter(): void {
  const tools = document.querySelector<HTMLElement>('[data-sky-tools]');
  const input = document.querySelector<HTMLInputElement>('[data-sky-search]');
  const cards = queryAll<HTMLElement>(document, '[data-sky-card]');
  if (!tools || !input || !cards.length) return;

  const groups = queryAll<HTMLElement>(document, '[data-sky-group]');
  const count = document.querySelector<HTMLElement>('[data-sky-count]');
  const empty = document.querySelector<HTMLElement>('[data-sky-empty]');

  tools.hidden = false;

  // Only hides a heading that sits directly before the grid. Anything else there
  // (an intro paragraph, a note) is left alone rather than guessed at.
  const headingBefore = (group: HTMLElement): HTMLElement | null => {
    const previous = group.previousElementSibling;
    const isHeading = previous instanceof HTMLElement && /^H[1-6]$/.test(previous.tagName);
    return isHeading ? (previous as HTMLElement) : null;
  };

  const apply = (): void => {
    const query = input.value.trim().toLowerCase();
    let shown = 0;

    for (const card of cards) {
      const matches = !query || (card.getAttribute('data-search') || '').indexOf(query) !== -1;
      card.hidden = !matches;
      if (matches) shown++;
    }

    for (const group of groups) {
      const anyVisible = queryAll<HTMLElement>(group, '[data-sky-card]').some((card) => !card.hidden);
      group.hidden = !anyVisible;
      const heading = headingBefore(group);
      if (heading) heading.hidden = !anyVisible;
    }

    if (empty) empty.hidden = shown > 0;
    if (count) count.textContent = query ? `${shown} / ${cards.length} shown` : `${cards.length} recipes`;
  };

  input.addEventListener('input', apply);
  input.addEventListener('search', apply); // the ✕ inside a type="search" field
  apply();
}
