// Project focus-area filter. Cards carry [data-project-types]; buttons
// [data-filter-type] ("" = all). Active state is driven purely by aria-pressed on
// the button (Tailwind aria-[pressed=true] variants style the bubble), so this
// only flips attributes and toggles visibility.

export function initProjectFilter(): void {
  const group = document.querySelector<HTMLElement>('[data-project-filter]');
  if (!group) return;

  const buttons = Array.from(group.querySelectorAll<HTMLButtonElement>('[data-filter-type]'));
  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-project-types]'));
  const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-project-section]'));
  const archive = document.querySelector<HTMLElement>('[data-archive-section]');

  const apply = (type: string): void => {
    for (const btn of buttons) {
      btn.setAttribute('aria-pressed', String((btn.dataset.filterType || '') === type));
    }

    for (const el of cards) {
      const types = (el.dataset.projectTypes || '').split(',');
      el.hidden = Boolean(type) && !types.includes(type);
    }

    // Drop a section heading when nothing under it survives the filter.
    for (const sec of sections) {
      sec.hidden = !sec.querySelector('[data-project-types]:not([hidden])');
    }

    // Archive entries aren't categorized, so they only make sense under "all".
    if (archive) archive.hidden = Boolean(type);
  };

  for (const btn of buttons) {
    btn.addEventListener('click', () => apply(btn.dataset.filterType || ''));
  }
}
