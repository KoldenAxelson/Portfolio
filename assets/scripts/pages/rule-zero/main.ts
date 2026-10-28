// /misc/rule-zero/ — the Rule Zero table (layouts/shortcodes/rule-zero/table.html).
//
// Four seats, every card in the pool below. Tapping any card, in a seat or in
// the pool, opens it large in a dialog with one action: put it in play (into
// the first empty seat), or take it out. A card in play is marked in the pool
// and can't be added twice; with four in play, the action says the table is
// full. The four picks persist in localStorage, so a page reload mid-game
// keeps the table, until the trash button clears it (tapped twice: the first
// tap turns it red, so a stray tap can't wipe a game in progress).

const STORAGE_KEY = 'rule-zero-table-v1';
const SEATS = 4;
const CLEAR_ARM_MS = 3000;

interface Card {
  id: string;
  name: string;
  note: string;
  large: string;
  thumb: string;
  thumb2: string;
  el: HTMLElement;
}

function load(valid: Set<string>): (string | null)[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]') as unknown;
    if (Array.isArray(raw)) {
      const seats = raw.slice(0, SEATS).map((id) => (typeof id === 'string' && valid.has(id) ? id : null));
      // A saved table with a duplicate (an old bug, a hand edit) keeps the first.
      return seats.map((id, i) => (id && seats.indexOf(id) === i ? id : null)).concat(Array(SEATS).fill(null)).slice(0, SEATS);
    }
  } catch {
    // Private mode or bad JSON: start with an empty table.
  }
  return Array(SEATS).fill(null);
}

function save(seats: (string | null)[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seats));
  } catch {
    // Storage blocked: the table still works for this visit.
  }
}

function mount(root: HTMLElement): void {
  const dialog = root.querySelector<HTMLDialogElement>('[data-rz-dialog]');
  const dialogImg = root.querySelector<HTMLImageElement>('[data-rz-dialog-img]');
  const dialogName = root.querySelector<HTMLElement>('[data-rz-dialog-name]');
  const dialogNote = root.querySelector<HTMLElement>('[data-rz-dialog-note]');
  const action = root.querySelector<HTMLButtonElement>('[data-rz-action]');
  const clear = root.querySelector<HTMLButtonElement>('[data-rz-clear]');
  const count = root.querySelector<HTMLElement>('[data-rz-count]');
  const seatButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-rz-seat]'));
  const pool = root.querySelector<HTMLElement>('[data-rz-pool]');
  if (!dialog || !dialogImg || !dialogName || !dialogNote || !action || !clear || !count || !pool) return;

  const cards = new Map<string, Card>();
  for (const el of root.querySelectorAll<HTMLElement>('[data-rz-card]')) {
    const d = el.dataset;
    cards.set(d.rzCard || '', {
      id: d.rzCard || '', name: d.name || '', note: d.note || '',
      large: d.large || '', thumb: d.thumb || '', thumb2: d.thumb2 || '', el,
    });
  }

  let seats = load(new Set(cards.keys()));
  let open: Card | null = null;

  root.classList.add('is-live');
  for (const el of root.querySelectorAll<HTMLElement>('[data-rz-live]')) el.hidden = false;

  const render = (): void => {
    const inPlay = new Set(seats.filter(Boolean));
    seatButtons.forEach((button, i) => {
      const card = seats[i] ? cards.get(seats[i] as string) : undefined;
      button.classList.toggle('is-filled', !!card);
      if (card) {
        button.innerHTML = `<img src="${card.thumb}" srcset="${card.thumb} 1x, ${card.thumb2} 2x" alt="" />`;
        button.setAttribute('aria-label', `${card.name}, in play. Open card`);
      } else {
        button.innerHTML = '<span class="rz-seat-empty" aria-hidden="true"><span class="rz-seat-plus">+</span></span>';
        button.setAttribute('aria-label', 'Empty slot: pick a card below');
      }
    });
    for (const card of cards.values()) {
      const played = inPlay.has(card.id);
      card.el.classList.toggle('is-in-play', played);
      card.el.querySelector('.rz-pick')?.setAttribute('aria-label', `${card.name}${played ? ' (in play)' : ''}. Open card`);
    }
    count.textContent = `${inPlay.size} / ${SEATS}`;
    clear.disabled = inPlay.size === 0;
  };

  const refreshAction = (): void => {
    if (!open) return;
    const seat = seats.indexOf(open.id);
    const full = !seats.includes(null);
    action.disabled = seat < 0 && full;
    action.classList.toggle('is-remove', seat >= 0);
    // Two words only. With four in play, Play is greyed out; the slots say why.
    action.textContent = seat >= 0 ? 'Remove' : 'Play';
  };

  const show = (card: Card): void => {
    open = card;
    dialogImg.src = card.large;
    dialogImg.alt = card.name;
    dialogName.textContent = card.name;
    dialogNote.textContent = card.note;
    dialogNote.hidden = !card.note;
    refreshAction();
    if (!dialog.open) dialog.showModal();
  };

  action.addEventListener('click', () => {
    if (!open) return;
    const seat = seats.indexOf(open.id);
    if (seat >= 0) {
      seats[seat] = null;
    } else {
      const empty = seats.indexOf(null);
      if (empty < 0) return;
      seats[empty] = open.id;
    }
    save(seats);
    render();
    dialog.close();
  });

  // Tapping the dimmed backdrop closes the card, as people expect on a phone.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    open = null;
  });

  pool.addEventListener('click', (event) => {
    const el = (event.target as HTMLElement).closest<HTMLElement>('[data-rz-card]');
    const card = el && cards.get(el.dataset.rzCard || '');
    if (card) show(card);
  });

  seatButtons.forEach((button, i) => {
    button.addEventListener('click', () => {
      const card = seats[i] ? cards.get(seats[i] as string) : undefined;
      if (card) show(card);
      else pool.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Two taps to clear: the first arms it for a few seconds.
  let armed = 0;
  clear.addEventListener('click', () => {
    if (!armed) {
      clear.classList.add('is-armed');
      clear.setAttribute('aria-label', 'Tap again to clear the table');
      armed = window.setTimeout(() => {
        armed = 0;
        clear.classList.remove('is-armed');
        clear.setAttribute('aria-label', 'Clear table');
      }, CLEAR_ARM_MS);
      return;
    }
    window.clearTimeout(armed);
    armed = 0;
    clear.classList.remove('is-armed');
    clear.setAttribute('aria-label', 'Clear table');
    seats = Array(SEATS).fill(null);
    save(seats);
    render();
  });

  render();
}

function mountAll(): void {
  for (const root of document.querySelectorAll<HTMLElement>('[data-rule-zero]')) {
    if (root.dataset.rzMounted) continue;
    root.dataset.rzMounted = 'true';
    mount(root);
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll);
else mountAll();
document.addEventListener('htmx:afterSettle', mountAll);

export {}; // a module, so its helpers don't collide with other page scripts
