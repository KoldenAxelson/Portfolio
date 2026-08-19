// The maneuver picker on /misc/dnd/.
//
// Progressive enhancement over server-rendered markup, the same shape as the
// Skyrim potion filter: every one of the 55 cards is already in the HTML, and this
// file only adds narrowing and selection on top. The toolbar ships `hidden` and is
// revealed here, so a reader with JavaScript off gets the full, readable list
// rather than dead controls.
//
// ONE FACET GROUP. Family is OR within itself; the search box and the "on my list"
// view are ANDed on top. There used to be a second facet group for the action
// economy and it is gone — the family already says when a maneuver happens.
//
// NO CEILING. The list counts up and stops nowhere. It used to count against twelve,
// which is what a Warlord knows at 18th level, but Signature Technique, Superior
// Technique and any future feat add to that — so the ceiling was wrong for anyone
// who took one, and a budget you can legitimately exceed is worse than no budget.

import { load, save } from './store';

function queryAll<T extends Element>(root: ParentNode, selector: string): T[] {
  return Array.prototype.slice.call(root.querySelectorAll(selector)) as T[];
}

export function initPicker(): void {
  const root = document.querySelector<HTMLElement>('[data-dnd-picker]');
  if (!root) return;

  const cards = queryAll<HTMLButtonElement>(root, '[data-dnd-card]');
  if (!cards.length) return;

  const tools = root.querySelector<HTMLElement>('[data-dnd-tools]');
  const scroll = root.querySelector<HTMLElement>('[data-dnd-scroll]');
  const search = root.querySelector<HTMLInputElement>('[data-dnd-search]');
  const filters = queryAll<HTMLButtonElement>(root, '[data-dnd-filter]');
  const count = root.querySelector<HTMLElement>('[data-dnd-count]');
  const empty = root.querySelector<HTMLElement>('[data-dnd-empty]');
  const copy = root.querySelector<HTMLButtonElement>('[data-dnd-copy]');
  const clear = root.querySelector<HTMLButtonElement>('[data-dnd-clear]');
  const reset = root.querySelector<HTMLButtonElement>('[data-dnd-reset]');

  if (tools) tools.hidden = false;

  const picked = load();
  const family = new Set<string>();
  let onlyPicked = false;

  const visible = (card: HTMLButtonElement, query: string): boolean => {
    const slug = card.getAttribute('data-slug') || '';
    if (onlyPicked && !picked.has(slug)) return false;
    if (family.size && !family.has(card.getAttribute('data-family') || '')) return false;
    if (query && (card.getAttribute('data-search') || '').indexOf(query) === -1) return false;
    return true;
  };

  const paint = (): void => {
    const query = (search ? search.value : '').trim().toLowerCase();
    let shown = 0;

    for (const card of cards) {
      const slug = card.getAttribute('data-slug') || '';
      card.setAttribute('aria-pressed', picked.has(slug) ? 'true' : 'false');
      const show = visible(card, query);
      // The <li> is what the grid lays out; hiding the button alone leaves a gap
      // in the track.
      const item = card.closest('li');
      if (item instanceof HTMLElement) item.hidden = !show;
      card.hidden = !show;
      if (show) shown++;
    }

    if (empty) empty.hidden = shown > 0;
    if (count) {
      const narrowed = shown !== cards.length;
      const list = picked.size ? ` · ${picked.size} on your list` : '';
      count.textContent = `${narrowed ? `${shown} of ${cards.length}` : `${cards.length} maneuvers`}${list}`;
    }
    // Only offer the escape hatch once there is something to escape from.
    if (reset) reset.hidden = !(family.size || onlyPicked || query);
    if (copy) copy.disabled = picked.size === 0;
    if (clear) clear.disabled = picked.size === 0;
  };

  for (const card of cards) {
    card.addEventListener('click', () => {
      const slug = card.getAttribute('data-slug');
      if (!slug) return;
      if (picked.has(slug)) picked.delete(slug);
      else picked.add(slug);
      save(picked);
      paint();
    });
  }

  for (const button of filters) {
    button.addEventListener('click', () => {
      const spec = (button.getAttribute('data-dnd-filter') || '').split(':');
      const on = button.getAttribute('aria-pressed') !== 'true';
      if (spec[0] === 'family') {
        if (on) family.add(spec[1] || '');
        else family.delete(spec[1] || '');
      } else if (spec[0] === 'picked') {
        onlyPicked = on;
      } else {
        return;
      }
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
      paint();
      // Narrowing the list while parked halfway down it leaves you looking at
      // whatever happens to be at that offset now.
      if (scroll) scroll.scrollTop = 0;
    });
  }

  if (search) {
    const onInput = (): void => {
      paint();
      if (scroll) scroll.scrollTop = 0;
    };
    search.addEventListener('input', onInput);
    search.addEventListener('search', onInput); // the ✕ inside a type="search" field
  }

  if (reset) {
    reset.addEventListener('click', () => {
      family.clear();
      onlyPicked = false;
      for (const button of filters) button.setAttribute('aria-pressed', 'false');
      if (search) search.value = '';
      paint();
      if (search) search.focus();
    });
  }

  if (clear) {
    clear.addEventListener('click', () => {
      picked.clear();
      save(picked);
      paint();
    });
  }

  if (copy) {
    copy.addEventListener('click', () => {
      // Card order is the page's order, which is alphabetical, so the pasted list
      // comes out sorted without a second sort.
      const lines = cards
        .filter((card) => picked.has(card.getAttribute('data-slug') || ''))
        .map((card) => `- ${card.getAttribute('data-name') || ''}`);
      const text = `Maneuvers (${lines.length})\n${lines.join('\n')}`;
      const label = copy.textContent || 'Copy';
      const done = (ok: boolean): void => {
        copy.textContent = ok ? 'Copied' : 'Press ⌘C';
        window.setTimeout(() => { copy.textContent = label; }, 1600);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => done(true), () => done(false));
      } else {
        done(false);
      }
    });
  }

  paint();
}
