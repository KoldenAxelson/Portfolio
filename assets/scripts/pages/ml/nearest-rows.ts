// {{< ml/nearest-rows >}}: the shortcode renders one list of nearest rows per
// token (all real, from data/ml/nearest-rows.json); this only switches which
// list is showing.

export function initNearestRows(root: HTMLElement): void {
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('button[data-query]'));
  const lists = Array.from(root.querySelectorAll<HTMLElement>('.mli-nr-list'));
  if (!buttons.length || !lists.length) return;

  function choose(query: string): void {
    for (const button of buttons) {
      const isChosen = button.dataset.query === query;
      button.classList.toggle('is-on', isChosen);
      button.setAttribute('aria-pressed', String(isChosen));
    }
    for (const list of lists) list.hidden = list.dataset.query !== query;
  }

  for (const button of buttons) {
    button.disabled = false;
    button.addEventListener('click', () => choose(button.dataset.query ?? '0'));
  }
}
