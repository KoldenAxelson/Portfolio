// Project tag filter. Cards carry [data-project-tags]; buttons [data-filter-tag] ("" = all).

export function initProjectFilter(): void {
  const group = document.querySelector<HTMLElement>('[data-project-filter]');
  if (!group) return;

  const buttons = Array.from(group.querySelectorAll<HTMLButtonElement>('[data-filter-tag]'));
  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-project-tags]'));
  const ACTIVE = ['bg-fg', 'text-bg'];
  const INACTIVE = ['text-muted', 'hover:text-fg'];

  const setButtonState = (btn: HTMLButtonElement, active: boolean): void => {
    btn.setAttribute('aria-pressed', String(active));
    btn.classList.remove(...ACTIVE, ...INACTIVE);
    btn.classList.add(...(active ? ACTIVE : INACTIVE));
  };

  const apply = (tag: string): void => {
    for (const btn of buttons) setButtonState(btn, btn.dataset.filterTag === tag);
    for (const el of cards) {
      if (!tag) {
        el.hidden = false;
        continue;
      }
      const tags = (el.dataset.projectTags || '').split(',');
      el.hidden = !tags.includes(tag);
    }
  };

  for (const btn of buttons) {
    btn.addEventListener('click', () => apply(btn.dataset.filterTag || ''));
  }
}
