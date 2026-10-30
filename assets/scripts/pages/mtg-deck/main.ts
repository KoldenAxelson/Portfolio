// Card viewer for the Commander deck pages (layouts/shortcodes/mtg-deck/).
//
// Tap a card's name and the card itself opens in a small window, the way a
// {{< term >}} opens on Basic Logic (scripts/site/definitions/definitions.ts):
// it grows out of the click, drags by its header, and stays put on screen
// while the page scrolls, so a combo's pieces can sit side by side next to
// the list. Escape closes the front window; the close button hands focus back
// to the line that opened it.
//
// Wide screens keep any number of windows open. On a phone there's room for
// one, so opening a card replaces the last and the window sits mid-screen.
//
// The triggers are the deck list's <summary> lines and the commander's name,
// carrying [data-md-view] from partials/mtg-deck/view-attrs.html. Without this
// script the lines are plain <details> showing the rules text, and the
// commander's name is a link to Scryfall.

// No imports, so mark this a module: its names stay out of the global scope
// the type-checker shares with every other page script.
export {};

const WIDE = '(min-width: 768px)';
const EDGE = 12; // min gap between a window and the viewport edge
const NUDGE = 14; // gap between the pointer and the window's near corner
const FILL_DELAY_MS = 120; // keep in step with the .md-win transitions

interface Anchor {
  x: number;
  y: number;
}

interface CardInfo {
  name: string;
  scan: string;
  url: string;
  alt: string;
}

const open = new Map<string, HTMLElement>();
const openers = new WeakMap<HTMLElement, HTMLElement>();
let topZ = 1;
let documentBound = false;

function px(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function viewport(): { vw: number; vh: number } {
  return { vw: document.documentElement.clientWidth, vh: document.documentElement.clientHeight };
}

function clampIntoView(win: HTMLElement): void {
  const { vw, vh } = viewport();
  const maxLeft = Math.max(EDGE, vw - win.offsetWidth - EDGE);
  const maxTop = Math.max(EDGE, vh - win.offsetHeight - EDGE);
  win.style.left = `${Math.min(Math.max(px(win.style.left), EDGE), maxLeft)}px`;
  win.style.top = `${Math.min(Math.max(px(win.style.top), EDGE), maxTop)}px`;
}

function raise(win: HTMLElement): void {
  topZ += 1;
  win.style.zIndex = String(topZ);
}

// Below-right of the pointer, flipping to whichever side has room, and growing
// out of the corner nearest the click. On a phone: centred.
function seat(win: HTMLElement, at: Anchor): void {
  const { vw, vh } = viewport();
  const w = win.offsetWidth;
  const h = win.offsetHeight;
  if (!window.matchMedia(WIDE).matches) {
    win.style.left = `${(vw - w) / 2}px`;
    win.style.top = `${Math.max(EDGE, (vh - h) / 2)}px`;
    win.style.transformOrigin = 'center';
    clampIntoView(win);
    return;
  }
  const flipX = at.x + NUDGE + w + EDGE > vw;
  const flipY = at.y + NUDGE + h + EDGE > vh;
  win.style.left = `${flipX ? at.x - NUDGE - w : at.x + NUDGE}px`;
  win.style.top = `${flipY ? at.y - NUDGE - h : at.y + NUDGE}px`;
  win.style.transformOrigin = `${flipY ? 'bottom' : 'top'} ${flipX ? 'right' : 'left'}`;
  clampIntoView(win);
}

// A keyboard activation reports 0,0; grow out from under the line instead.
function anchorFrom(e: MouseEvent, el: Element): Anchor {
  if (e.clientX !== 0 || e.clientY !== 0) return { x: e.clientX, y: e.clientY };
  const box = el.getBoundingClientRect();
  return { x: box.left + 24, y: box.bottom };
}

function markTriggers(name: string, expanded: boolean): void {
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('[data-md-view]'))) {
    if (el.dataset.mdView === name) el.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  }
}

function closeWindow(win: HTMLElement, restoreFocus = false): void {
  const name = win.dataset.mdCard ?? '';
  open.delete(name);
  markTriggers(name, false);
  win.remove();
  if (!restoreFocus) return;
  const opener = openers.get(win);
  if (opener?.isConnected) opener.focus({ preventScroll: true });
}

function frontWindow(): HTMLElement | null {
  let front: HTMLElement | null = null;
  for (const win of open.values()) {
    if (!front || px(win.style.zIndex) >= px(front.style.zIndex)) front = win;
  }
  return front;
}

function wireDrag(win: HTMLElement, handle: HTMLElement): void {
  let grabX = 0;
  let grabY = 0;
  let dragging = false;

  handle.addEventListener('pointerdown', (e: PointerEvent) => {
    if ((e.target as Element | null)?.closest('[data-md-close]')) return;
    const box = win.getBoundingClientRect();
    grabX = e.clientX - box.left;
    grabY = e.clientY - box.top;
    dragging = true;
    handle.setPointerCapture(e.pointerId);
    win.classList.add('is-dragging');
    raise(win);
    e.preventDefault();
  });
  handle.addEventListener('pointermove', (e: PointerEvent) => {
    if (!dragging) return;
    win.style.left = `${e.clientX - grabX}px`;
    win.style.top = `${e.clientY - grabY}px`;
  });
  const endDrag = (e: PointerEvent): void => {
    if (!dragging) return;
    dragging = false;
    if (handle.hasPointerCapture(e.pointerId)) handle.releasePointerCapture(e.pointerId);
    win.classList.remove('is-dragging');
    clampIntoView(win);
  };
  handle.addEventListener('pointerup', endDrag);
  handle.addEventListener('pointercancel', endDrag);
}

// Appended to <body>, which an hx-boost swap replaces: a missing container
// means a fresh page, and any windows from the last one went with it.
function ensureContainer(): HTMLElement {
  const existing = document.getElementById('md-windows');
  if (existing) return existing;
  open.clear();
  topZ = 1;
  const root = document.createElement('div');
  root.id = 'md-windows';
  root.className = 'md-windows';
  document.body.appendChild(root);
  root.addEventListener('click', (e) => {
    const target = e.target as Element | null;
    const win = target?.closest<HTMLElement>('.md-win');
    if (win && target?.closest('[data-md-close]')) closeWindow(win, true);
  });
  root.addEventListener('pointerdown', (e) => {
    const win = (e.target as Element | null)?.closest<HTMLElement>('.md-win');
    if (win) raise(win);
  });
  return root;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
}

function openCard(card: CardInfo, at: Anchor, opener: HTMLElement): void {
  const already = open.get(card.name);
  if (already) {
    raise(already);
    openers.set(already, opener);
    already.focus({ preventScroll: true });
    return;
  }
  // One at a time on a phone.
  if (!window.matchMedia(WIDE).matches) {
    for (const win of Array.from(open.values())) closeWindow(win);
  }

  const root = ensureContainer();
  const win = el('div', 'md-win');
  win.dataset.mdCard = card.name;
  win.tabIndex = -1;
  win.setAttribute('role', 'dialog');
  win.setAttribute('aria-label', card.name);
  openers.set(win, opener);

  const head = el('div', 'md-win-head');
  head.appendChild(el('p', 'md-win-label', card.name));
  const close = el('button', 'md-win-close');
  close.type = 'button';
  close.setAttribute('data-md-close', '');
  close.setAttribute('aria-label', `Close ${card.name}`);
  close.innerHTML =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 18 18 6M6 6l12 12"/></svg>';
  head.appendChild(close);

  const body = el('div', 'md-win-body');
  const frame = el('div', 'md-win-card');
  const img = el('img', 'md-win-img');
  img.alt = card.alt;
  img.width = 488;
  img.height = 680;
  img.decoding = 'async';
  img.addEventListener('load', () => frame.classList.add('is-loaded'));
  img.addEventListener('error', () => {
    frame.classList.add('is-missing');
    frame.appendChild(el('p', 'md-win-missing', card.alt));
  });
  img.src = card.scan;
  frame.appendChild(img);
  body.appendChild(frame);

  const link = el('a', 'md-win-link', 'On Scryfall ↗');
  link.href = card.url;
  link.target = '_blank';
  link.rel = 'noopener';
  body.appendChild(link);

  win.appendChild(head);
  win.appendChild(body);
  root.appendChild(win);

  seat(win, at);
  raise(win);
  wireDrag(win, head);
  open.set(card.name, win);
  markTriggers(card.name, true);
  requestAnimationFrame(() => {
    win.classList.add('is-open');
    window.setTimeout(() => win.classList.add('is-filled'), FILL_DELAY_MS);
  });
  win.focus({ preventScroll: true });
}

function mountAll(): void {
  for (const trigger of Array.from(document.querySelectorAll<HTMLElement>('[data-md-view]'))) {
    if (trigger.dataset.mdBound) continue;
    trigger.dataset.mdBound = 'true';
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.addEventListener('click', (e) => {
      // A modified click on the commander's link still opens Scryfall in a tab.
      if (trigger instanceof HTMLAnchorElement && (e.metaKey || e.ctrlKey || e.shiftKey)) return;
      e.preventDefault(); // stops the <details> toggling and the link navigating
      const d = trigger.dataset;
      if (!d.mdView || !d.mdScan) return;
      openCard({ name: d.mdView, scan: d.mdScan, url: d.mdUrl ?? '', alt: d.mdAlt ?? d.mdView }, anchorFrom(e, trigger), trigger);
    });
  }
  // Marks the page so the CSS can drop the no-JS details styling.
  for (const deck of Array.from(document.querySelectorAll<HTMLElement>('.md'))) deck.classList.add('has-viewer');

  if (documentBound) return;
  documentBound = true;
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || open.size === 0) return;
    const front = frontWindow();
    if (front) closeWindow(front, true);
  });
  window.addEventListener('resize', () => {
    for (const win of open.values()) clampIntoView(win);
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll);
else mountAll();
document.addEventListener('htmx:afterSettle', mountAll);
