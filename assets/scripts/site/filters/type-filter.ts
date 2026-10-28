// Type filter for /projects/, /misc/, /misc/cool-sites/ and /misc/tech-watch/.
// Items carry [data-types="a,b"]; any [data-filter-type] button ("" = all)
// switches the filter. The buttons live in two places, both built from
// partials/func/filter-cats.html:
//   - the desktop filter aux button, partials/components/filter-fab.html;
//   - the same choices in the mobile navbar tools panel (site/topnav.html).
// Every button for the active type gets aria-pressed="true" (a Tailwind
// aria-[pressed=true] variant styles the panel rows; aux-fab rows also get
// .aux-fab__row--current), so this only flips attributes and toggles visibility.

/** Close the desktop aux button and the mobile nav panel, whichever is open. */
function closeLaunchers(): void {
  document
    .querySelectorAll<HTMLDetailsElement>('[data-aux-fab][open], [data-mobile-nav][open]')
    .forEach((d) => d.removeAttribute('open'));
}

// Bring the first item the filter left showing into view, unless it already is.
function scrollToFirstShown(items: HTMLElement[]): void {
  const first = items.find((el) => !el.hidden);
  if (!first) return;
  const top = first.getBoundingClientRect().top;
  if (top >= 0 && top <= window.innerHeight * 0.6) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: top + window.scrollY - 96, behavior: reduce ? 'auto' : 'smooth' });
}

export function initTypeFilter(): void {
  const buttons = Array.from(document.querySelectorAll<HTMLElement>('[data-filter-type]'));
  if (!buttons.length) return;

  const items = Array.from(document.querySelectorAll<HTMLElement>('[data-types]'));
  const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-type-section]'));
  const unfilteredOnly = Array.from(document.querySelectorAll<HTMLElement>('[data-filter-all-only]'));

  const apply = (type: string): void => {
    for (const btn of buttons) {
      const on = (btn.dataset.filterType || '') === type;
      btn.setAttribute('aria-pressed', String(on));
      if (btn.classList.contains('aux-fab__row')) btn.classList.toggle('aux-fab__row--current', on);
    }

    for (const el of items) {
      const types = (el.dataset.types || '').split(',');
      el.hidden = Boolean(type) && !types.includes(type);
    }

    // Drop a section heading when nothing under it survives the filter.
    for (const sec of sections) {
      sec.hidden = !sec.querySelector('[data-types]:not([hidden])');
    }

    // Uncategorized blocks (the projects archive) only make sense under "all".
    for (const el of unfilteredOnly) el.hidden = Boolean(type);
  };

  for (const btn of buttons) {
    btn.addEventListener('click', () => {
      apply(btn.dataset.filterType || '');
      // A launcher can be clicked from far down the page; filtering then
      // shrinks the page under the reader. Close it and bring the first
      // surviving item into view, unless it is already on screen.
      if (!btn.closest('[data-aux-fab], [data-mobile-panel-tools]')) return;
      closeLaunchers();
      scrollToFirstShown(items);
    });
  }

  // Sync every surface to "All" on load — the mobile panel's buttons are
  // rendered without aria-pressed.
  apply('');
}
