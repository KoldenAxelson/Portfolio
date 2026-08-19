// The feat filter on /misc/dnd/.
//
// The list is server-rendered and complete; this reveals the search box and hides
// rows that do not match. Same contract as the maneuver picker: with JavaScript off
// the reader gets every allowed feat, which is the thing the section is for.
//
// Substring matching over one prepared `data-search` string per row — name, summary,
// benefits, prerequisite — so the filter never has to know how a row is marked up.
// The full text of a feat is not in the DOM at all; it opens in a glossary window
// from a synthesised set (partials/dnd-popovers.html), which is why the search index
// has to be built server-side rather than read off the page.

function queryAll<T extends Element>(root: ParentNode, selector: string): T[] {
  return Array.prototype.slice.call(root.querySelectorAll(selector)) as T[];
}

export function initFeats(): void {
  const root = document.querySelector<HTMLElement>('[data-dnd-feats]');
  if (!root) return;

  const rows = queryAll<HTMLElement>(root, '[data-dnd-feat-row]');
  if (!rows.length) return;

  const tools = root.querySelector<HTMLElement>('[data-dnd-feats-tools]');
  const search = root.querySelector<HTMLInputElement>('[data-dnd-feats-search]');
  const count = root.querySelector<HTMLElement>('[data-dnd-feats-count]');
  const empty = root.querySelector<HTMLElement>('[data-dnd-feats-empty]');
  if (!tools || !search) return;

  tools.hidden = false;

  const paint = (): void => {
    const query = search.value.trim().toLowerCase();
    let shown = 0;
    for (const row of rows) {
      const match = !query || (row.getAttribute('data-search') || '').indexOf(query) !== -1;
      row.hidden = !match;
      if (match) shown++;
    }
    if (empty) empty.hidden = shown > 0;
    if (count) {
      count.textContent = shown === rows.length ? `${rows.length} feats` : `${shown} of ${rows.length}`;
    }
  };

  search.addEventListener('input', paint);
  search.addEventListener('search', paint);
  paint();
}
