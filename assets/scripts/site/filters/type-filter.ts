// Type filter for any page that renders partials/components/type-filter.html:
// /projects/ and /misc/cool-sites/. Items carry [data-types]; buttons
// [data-filter-type] ("" = all). Active state is driven purely by aria-pressed
// on the button (Tailwind aria-[pressed=true] variants style the bubble), so
// this only flips attributes and toggles visibility.

export function initTypeFilter(): void {
  const group = document.querySelector<HTMLElement>('[data-type-filter]');
  if (!group) return;

  const buttons = Array.from(group.querySelectorAll<HTMLButtonElement>('[data-filter-type]'));
  const items = Array.from(document.querySelectorAll<HTMLElement>('[data-types]'));
  const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-type-section]'));
  const unfilteredOnly = Array.from(document.querySelectorAll<HTMLElement>('[data-filter-all-only]'));

  const apply = (type: string): void => {
    for (const btn of buttons) {
      btn.setAttribute('aria-pressed', String((btn.dataset.filterType || '') === type));
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
    btn.addEventListener('click', () => apply(btn.dataset.filterType || ''));
  }
}
