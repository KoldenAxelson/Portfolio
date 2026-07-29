// skyrim — the potion filter for /misc/skyrim/. Shipped only on pages that use
// the potion shortcodes (see partials/skyrim-assets.html), so it never adds
// weight to the global bundle.
//
// This is a progressive enhancement over server-rendered markup: every card is
// already in the HTML, and filtering is string matching over each card's
// data-search attribute (title, tag, effects, ingredient names and slugs). The
// search box ships hidden and is revealed below, so a reader without JavaScript
// is never shown a control that cannot work.
//
// The "jump to section" FAB is a separate concern — see js/section-nav.ts.
// The Restoration-loop planner lives in ./resto and the potion builder in
// ./builder; both are initialised below.

import { initResto } from './resto';
import { initBuilder } from './builder';

function initFilter(): void {
  const tools = document.querySelector<HTMLElement>('[data-sky-tools]');
  const input = document.querySelector<HTMLInputElement>('[data-sky-search]');
  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-sky-card]'));
  if (!tools || !input || !cards.length) return;

  const groups = Array.from(document.querySelectorAll<HTMLElement>('[data-sky-group]'));
  const count = document.querySelector<HTMLElement>('[data-sky-count]');
  const empty = document.querySelector<HTMLElement>('[data-sky-empty]');
  const total = cards.length;

  tools.hidden = false; // the control works, so now it may be seen

  // A group's heading is hidden along with it, but only when it sits directly
  // before the grid. Anything else there (an intro paragraph, a note) is left
  // alone rather than guessed at.
  const headingFor = (group: HTMLElement): HTMLElement | null => {
    const prev = group.previousElementSibling;
    return prev instanceof HTMLElement && /^H[1-6]$/.test(prev.tagName) ? prev : null;
  };

  const apply = (): void => {
    const q = input.value.trim().toLowerCase();
    let shown = 0;

    cards.forEach((card) => {
      const hit = !q || (card.getAttribute('data-search') || '').indexOf(q) !== -1;
      card.hidden = !hit;
      if (hit) shown++;
    });

    groups.forEach((group) => {
      const any = Array.from(group.querySelectorAll<HTMLElement>('[data-sky-card]')).some((c) => !c.hidden);
      group.hidden = !any;
      const heading = headingFor(group);
      if (heading) heading.hidden = !any;
    });

    if (empty) empty.hidden = shown > 0;
    if (count) count.textContent = q ? `${shown} / ${total} shown` : `${total} recipes`;
  };

  input.addEventListener('input', apply);
  input.addEventListener('search', apply); // the ✕ in a type="search" field
  apply();
}

function init(): void {
  initFilter();
  initResto();
  initBuilder();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
