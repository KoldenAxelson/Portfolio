// Glossary definitions — click a {{< term >}} word to open its definition.
//
// DESKTOP (>=1024px): each term opens its own small window at the pointer, and
// several can be open at once. Windows are position:fixed, so they hold the same
// spot on the screen while the page scrolls underneath — the point being that
// you can park a definition beside the prose that uses it and keep reading. Drag
// by the header. Clicking a cross-reference inside a window opens the next one
// just below the word you clicked, so following a chain of terms leaves the
// trail on screen.
//
// MOBILE (<1024px): the term routes into the shared top-nav panel instead (a
// 'definition' mode — see topnav.html / nav.ts), where a cross-reference simply
// replaces the panel's contents. One definition at a time; no windows to manage
// on a phone-sized screen.
//
// This file owns the desktop window manager only. The data and the rendered
// definition body are shared with mobile via glossary.ts.
import { DEFAULT_SET, lookup, renderDefinition } from './glossary';

const DESKTOP = '(min-width: 1024px)';
const EDGE = 16; // min gap between a window and the viewport edge
const NUDGE = 14; // gap between the pointer and the window's near corner
// The empty shell scales up first, then the contents fade in. Keep in step with
// the transitions in definitions.css.
const FILL_DELAY_MS = 120;

// Key → its open window. One window per term: re-clicking a word already open
// raises that window rather than stacking a duplicate.
const openWindows = new Map<string, HTMLElement>();

interface Anchor {
  x: number;
  y: number;
}

let topZ = 1;
let documentBound = false;

function px(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

// Keep a window fully on screen. Called after a drag and on resize — never
// during a drag, so dragging stays 1:1 with the pointer instead of fighting it.
function clampIntoView(win: HTMLElement): void {
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const maxLeft = Math.max(EDGE, vw - win.offsetWidth - EDGE);
  const maxTop = Math.max(EDGE, vh - win.offsetHeight - EDGE);
  win.style.left = `${Math.min(Math.max(px(win.style.left), EDGE), maxLeft)}px`;
  win.style.top = `${Math.min(Math.max(px(win.style.top), EDGE), maxTop)}px`;
}

function raise(win: HTMLElement): void {
  topZ += 1;
  win.style.zIndex = String(topZ);
}

// Seat the window at the pointer — below-right of it by default, flipping to
// whichever side has room. transform-origin is set to the corner nearest the
// pointer so the open animation reads as the window growing out of the click
// rather than sliding in from somewhere else. Requires the window to already be
// in the DOM, since it needs its measured size.
function seatAtPointer(win: HTMLElement, at: Anchor): void {
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const w = win.offsetWidth;
  const h = win.offsetHeight;

  const flipX = at.x + NUDGE + w + EDGE > vw;
  const flipY = at.y + NUDGE + h + EDGE > vh;

  win.style.left = `${flipX ? at.x - NUDGE - w : at.x + NUDGE}px`;
  win.style.top = `${flipY ? at.y - NUDGE - h : at.y + NUDGE}px`;
  win.style.transformOrigin = `${flipY ? 'bottom' : 'top'} ${flipX ? 'right' : 'left'}`;
  clampIntoView(win);
}

// Pointer coordinates when there are any; a keyboard activation reports 0,0, so
// fall back to the word itself and grow the window out from under it.
function anchorFrom(e: MouseEvent, fallback: Element): Anchor {
  if (e.clientX !== 0 || e.clientY !== 0) return { x: e.clientX, y: e.clientY };
  const box = fallback.getBoundingClientRect();
  return { x: box.left, y: box.bottom };
}

function markTriggers(key: string, expanded: boolean): void {
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(`[data-term="${key}"]`))) {
    el.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  }
}

function closeWindow(win: HTMLElement, restoreFocus = false): void {
  const key = win.dataset.defKey ?? '';
  openWindows.delete(key);
  markTriggers(key, false);
  win.remove();
  if (restoreFocus) {
    document.querySelector<HTMLElement>(`[data-term="${key}"]`)?.focus();
  }
}

function wireDrag(win: HTMLElement, handle: HTMLElement): void {
  let grabX = 0;
  let grabY = 0;
  let dragging = false;

  handle.addEventListener('pointerdown', (e: PointerEvent) => {
    const target = e.target as Element | null;
    if (target?.closest('[data-def-close]')) return;
    const box = win.getBoundingClientRect();
    grabX = e.clientX - box.left;
    grabY = e.clientY - box.top;
    dragging = true;
    handle.setPointerCapture(e.pointerId);
    win.classList.add('is-dragging');
    raise(win);
    e.preventDefault(); // don't start a text selection in the header
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

// The container is appended to <body>, which hx-boost replaces wholesale — so a
// missing container means we're on a fresh page and any windows from the last
// one are gone with it. Rebuild and reset the bookkeeping to match.
function ensureContainer(): HTMLElement {
  const existing = document.getElementById('def-windows');
  if (existing) return existing;

  openWindows.clear();
  topZ = 1;

  const root = document.createElement('div');
  root.id = 'def-windows';
  root.className = 'def-windows';
  document.body.appendChild(root);

  // Delegated: close buttons and cross-references both live in markup this
  // manager creates, so one listener on the container covers every window.
  root.addEventListener('click', (e) => {
    const target = e.target as Element | null;
    if (!target) return;
    const win = target.closest<HTMLElement>('.def-win');
    if (!win) return;
    if (target.closest('[data-def-close]')) {
      closeWindow(win, true);
      return;
    }
    const ref = target.closest<HTMLElement>('[data-term-ref]');
    if (ref?.dataset.termRef) {
      openDefinition(ref.dataset.termRef, win.dataset.defSet ?? DEFAULT_SET, anchorFrom(e, ref));
    }
  });

  // Clicking anywhere in a window brings it forward.
  root.addEventListener('pointerdown', (e) => {
    const win = (e.target as Element | null)?.closest<HTMLElement>('.def-win');
    if (win) raise(win);
  });

  return root;
}

function openDefinition(key: string, set: string, at: Anchor): void {
  const entry = lookup(set, key);
  if (!entry) return;

  const already = openWindows.get(key);
  if (already) {
    raise(already);
    already.focus({ preventScroll: true });
    return;
  }

  const root = ensureContainer();
  const win = document.createElement('div');
  win.className = 'def-win';
  win.dataset.defKey = key;
  win.dataset.defSet = set;
  win.tabIndex = -1;
  win.setAttribute('role', 'dialog');
  win.setAttribute('aria-label', `Definition: ${entry.term}`);

  const head = document.createElement('div');
  head.className = 'def-win__head';

  const label = document.createElement('p');
  label.className = 'def-win__label';
  label.textContent = entry.term;

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'def-win__close';
  close.setAttribute('data-def-close', '');
  close.setAttribute('aria-label', `Close ${entry.term}`);
  close.innerHTML =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18 18 6M6 6l12 12"/></svg>';

  head.appendChild(label);
  head.appendChild(close);

  const body = document.createElement('div');
  body.className = 'def-win__body';
  body.appendChild(renderDefinition(entry, set));

  win.appendChild(head);
  win.appendChild(body);
  root.appendChild(win);

  // In the DOM at full size but still invisible: measure, seat at the pointer,
  // then run the two-stage open — the empty shell scales up, then its contents
  // fade in. Contents are only opacity-hidden, never display:none, so the shell
  // is already the size it ends up and nothing reflows mid-animation.
  seatAtPointer(win, at);
  raise(win);
  wireDrag(win, head);
  openWindows.set(key, win);
  markTriggers(key, true);

  requestAnimationFrame(() => {
    win.classList.add('is-open');
    window.setTimeout(() => win.classList.add('is-filled'), FILL_DELAY_MS);
  });
  win.focus({ preventScroll: true });
}

export function initDefinitions(): void {
  // Triggers are page elements, replaced wholesale on each hx-boost swap, so
  // binding per element never accumulates listeners.
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('[data-term]'))) {
    el.addEventListener('click', (e) => {
      if (!window.matchMedia(DESKTOP).matches) return; // mobile → top-nav panel
      e.preventDefault();
      const key = el.dataset.term;
      if (key) openDefinition(key, el.dataset.termSet ?? DEFAULT_SET, anchorFrom(e, el));
    });
  }

  // Document-level listeners read live DOM, so they're bound once for the life
  // of the page rather than re-bound (and stacked) on every swap.
  if (documentBound) return;
  documentBound = true;

  // Escape closes the frontmost window, so a chain unwinds one at a time.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || openWindows.size === 0) return;
    let front: HTMLElement | null = null;
    for (const win of openWindows.values()) {
      if (!front || px(win.style.zIndex) >= px(front.style.zIndex)) front = win;
    }
    if (front) closeWindow(front, true);
  });

  // A resize can leave a window off screen, and dropping below the desktop
  // breakpoint hands over to the mobile panel — close up rather than leave
  // orphans behind the hidden container.
  window.addEventListener('resize', () => {
    if (!window.matchMedia(DESKTOP).matches) {
      for (const win of Array.from(openWindows.values())) closeWindow(win);
      return;
    }
    for (const win of openWindows.values()) clampIntoView(win);
  });
}
