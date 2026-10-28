// Shelf rows: any [data-shelf-row] track, a sideways row of cards. Today that
// is every components/shelf.html row (/impossible-list/, /misc/,
// /misc/writing/) and the Fighting Style rail on /misc/dnd/. Opting a row in is
// the attribute alone; this module is everything such a row does.
//
// Mouse wheel. A vertical wheel over the row scrolls it left/right until it
// reaches an end, then hands the wheel back to the page so the visitor is never
// trapped in the row. Only for a notched mouse wheel: a trackpad or Magic Mouse
// can already swipe sideways natively, so a vertical swipe over a row on one of
// those scrolls the page as normal. Browsers don't say which device sent a
// wheel event, so isNotchedWheel() infers it (see there). The pan is eased over
// a few frames, since a raw wheel tick jumps the row ~100px at once.
//
// A row with CSS scroll-snap works too: each tick glides to the next snap
// point in that direction (snapping is paused mid-glide, then restored on a
// point, so nothing jumps). Snap points are read as `start` alignment.
//
// Keyboard. See "Arrow keys" below.

const LINE_HEIGHT_PX = 16;
// Events closer together than this belong to one gesture, which keeps the
// verdict of its first event: a trackpad's momentum tail can end in values
// that look like a wheel's.
const GESTURE_GAP_MS = 120;
// Share of the remaining distance covered each frame by the eased pan.
const EASE = 0.2;

interface TrackState {
  target: number;
  frame: number;
  lastEvent: number;
  isWheel: boolean;
  snaps: boolean;
}

const states = new WeakMap<HTMLElement, TrackState>();
let teardown: (() => void)[] = [];

const prefersReducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Firefox reports some wheels in lines or pages rather than pixels.
const wheelDeltaPx = (e: WheelEvent, track: HTMLElement): number => {
  if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) return e.deltaY * LINE_HEIGHT_PX;
  if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) return e.deltaY * track.clientWidth;
  return e.deltaY;
};

// Is this a notched mouse wheel (true) or a trackpad / Magic Mouse (false)?
// No browser says which device sent a wheel event (there are open W3C issues
// asking for exactly that), so this reads the values, in order:
//   - Sideways movement, or a pinch (ctrlKey): a trackpad.
//   - Firefox on Windows/Linux reports a wheel in lines or pages.
//   - Chrome sends the legacy `wheelDeltaY` as 120 per notch for a wheel.
//   - macOS (Safari, Firefox, and Chrome when the 120 test misses): a Mac
//     trackpad or Magic Mouse only ever reports whole pixels (half pixels on
//     some Retina setups), while a notched wheel's line-to-pixel scaling leaves
//     a stray fraction, like 4.000244. Any other fraction means a wheel.
//   - Otherwise, whole steps of 50px or more are wheel ticks (Windows/Linux
//     pixel-mode wheels); small whole-pixel values are a trackpad.
// Each gesture is judged by its first event (see onWheel). If a device is
// misjudged, the Wheel Probe page logs what it really sends.
const isMultipleOf120 = (v: number): boolean => {
  const notches = Math.abs(v) / 120;
  return notches >= 1 && Math.abs(notches - Math.round(notches)) < 0.01;
};

const hasStrayFraction = (v: number): boolean => {
  const frac = Math.abs(v) % 1;
  return frac > 1e-6 && Math.abs(frac - 0.5) > 1e-6;
};

function isNotchedWheel(e: WheelEvent): boolean {
  if (e.deltaX !== 0 || e.ctrlKey) return false;
  if (e.deltaMode !== WheelEvent.DOM_DELTA_PIXEL) return true;
  const legacy = (e as WheelEvent & { wheelDeltaY?: number }).wheelDeltaY;
  if (typeof legacy === 'number' && isMultipleOf120(legacy)) return true;
  if (hasStrayFraction(e.deltaY)) return true;
  return Number.isInteger(e.deltaY) && Math.abs(e.deltaY) >= 50;
}

function stateFor(track: HTMLElement): TrackState {
  let s = states.get(track);
  if (!s) {
    const snap = getComputedStyle(track).scrollSnapType;
    s = { target: track.scrollLeft, frame: 0, lastEvent: 0, isWheel: false, snaps: Boolean(snap) && snap !== 'none' };
    states.set(track, s);
  }
  return s;
}

// Where each child's start edge sits in scrollLeft terms, plus the far end.
function snapPoints(track: HTMLElement, maxScroll: number): number[] {
  const origin = track.getBoundingClientRect().left - track.scrollLeft;
  const points = Array.from(track.children, (el) => Math.round(el.getBoundingClientRect().left - origin));
  points.push(maxScroll);
  return [...new Set(points.map((p) => Math.min(maxScroll, Math.max(0, p))))].sort((a, b) => a - b);
}

// The snap point a tick should land on: the one nearest where the raw delta
// would go, but always at least one point past `from` in the tick's direction.
function snapTarget(track: HTMLElement, from: number, raw: number, maxScroll: number): number {
  const ahead = snapPoints(track, maxScroll).filter((p) => (raw > from ? p > from + 1 : p < from - 1));
  if (!ahead.length) return raw > from ? maxScroll : 0;
  return ahead.reduce((best, p) => (Math.abs(p - raw) < Math.abs(best - raw) ? p : best));
}

function pauseSnap(track: HTMLElement, s: TrackState): void {
  if (s.snaps) track.style.scrollSnapType = 'none';
}

function resumeSnap(track: HTMLElement, s: TrackState): void {
  if (s.snaps) track.style.scrollSnapType = '';
}

function stopPan(track: HTMLElement, s: TrackState): void {
  if (s.frame) cancelAnimationFrame(s.frame);
  s.frame = 0;
  s.target = track.scrollLeft;
  resumeSnap(track, s);
}

function step(track: HTMLElement, s: TrackState): void {
  const before = track.scrollLeft;
  const gap = s.target - before;
  // Browsers round scrollLeft, so the last sub-pixel steps of an ease never
  // land; finish the glide once it's within a couple of pixels, or stalls.
  if (Math.abs(gap) < 2) {
    track.scrollLeft = s.target;
    s.frame = 0;
    resumeSnap(track, s);
    return;
  }
  track.scrollLeft = before + gap * EASE;
  if (track.scrollLeft === before) {
    track.scrollLeft = s.target;
    s.frame = 0;
    resumeSnap(track, s);
    return;
  }
  s.frame = requestAnimationFrame(() => step(track, s));
}

function onWheel(e: WheelEvent): void {
  const track = e.currentTarget as HTMLElement;
  const s = stateFor(track);

  // One verdict per gesture, taken from its first event.
  if (e.timeStamp - s.lastEvent > GESTURE_GAP_MS) s.isWheel = isNotchedWheel(e);
  else if (e.deltaX !== 0) s.isWheel = false;
  s.lastEvent = e.timeStamp;

  // Trackpad / Magic Mouse: leave it native, and drop any pan in flight so
  // the two don't fight over scrollLeft.
  if (!s.isWheel) {
    if (s.frame) stopPan(track, s);
    return;
  }

  const maxScroll = track.scrollWidth - track.clientWidth;
  if (maxScroll <= 0) return;
  // Measure from where the pan is heading, not where it is mid-glide, so a
  // quick run of ticks adds up instead of restarting from the current frame.
  const from = s.frame ? s.target : track.scrollLeft;
  // 1px tolerance: scrollLeft can land on a fractional pixel at the far end.
  const isAtStart = from <= 0 && e.deltaY < 0;
  const isAtEnd = from >= maxScroll - 1 && e.deltaY > 0;
  if (isAtStart || isAtEnd) return;

  e.preventDefault();
  const raw = Math.min(maxScroll, Math.max(0, from + wheelDeltaPx(e, track)));
  s.target = s.snaps ? snapTarget(track, from, raw, maxScroll) : raw;
  if (prefersReducedMotion()) {
    track.scrollLeft = s.target;
    return;
  }
  pauseSnap(track, s);
  if (!s.frame) s.frame = requestAnimationFrame(() => step(track, s));
}

// ── Arrow keys: step the highlight, not the scroll ──────────────────────────
// Each row is one Tab stop (a roving tabindex): Tab lands on the row's current
// card, Left/Right/Home/End move focus to another card, and the row glides to
// keep that card in view. The focus ring is the highlight. Without this script
// every card is its own Tab stop, so nothing is lost with JS off.

// The one focusable thing in each slot: the card's link or button.
const cardsOf = (track: HTMLElement): HTMLElement[] =>
  Array.from(track.children)
    .map((slot) => slot.querySelector<HTMLElement>('a[href], button:not([disabled]), [tabindex]'))
    .filter((el): el is HTMLElement => Boolean(el) && !(el as HTMLElement).closest('[hidden]'));

function setRoving(cards: HTMLElement[], active: HTMLElement): void {
  for (const card of cards) card.tabIndex = card === active ? 0 : -1;
}

function onKeydown(e: KeyboardEvent): void {
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  const track = e.currentTarget as HTMLElement;
  const cards = cardsOf(track);
  const at = cards.indexOf(e.target as HTMLElement);
  if (at === -1) return;
  let next = at;
  if (e.key === 'ArrowRight') next = Math.min(cards.length - 1, at + 1);
  else if (e.key === 'ArrowLeft') next = Math.max(0, at - 1);
  else if (e.key === 'Home') next = 0;
  else if (e.key === 'End') next = cards.length - 1;
  else return;
  e.preventDefault();
  if (next === at) return;
  const card = cards[next];
  setRoving(cards, card);
  card.focus({ preventScroll: true });
  revealCard(track, card);
}

// Glide the row just far enough to show the whole card, through the same
// eased pan the wheel uses. On a snapping row it lands on a snap point, as the
// wheel does; scrollIntoView() fights mandatory snapping and lags a card behind.
function revealCard(track: HTMLElement, card: HTMLElement): void {
  const s = stateFor(track);
  const maxScroll = track.scrollWidth - track.clientWidth;
  if (maxScroll <= 0) return;
  const origin = track.getBoundingClientRect().left - track.scrollLeft;
  const slot = (card.closest('[data-shelf-row] > *') as HTMLElement | null) ?? card;
  const box = slot.getBoundingClientRect();
  const left = box.left - origin;
  const right = box.right - origin;
  const from = s.frame ? s.target : track.scrollLeft;
  const pad = 4;
  let to = from;
  if (left < from + pad) to = left - pad;
  else if (right > from + track.clientWidth - pad) to = right - track.clientWidth + pad;
  else return;
  if (s.snaps) {
    const points = snapPoints(track, maxScroll);
    to = to < from
      ? Math.max(0, ...points.filter((p) => p <= left))
      : Math.min(maxScroll, ...points.filter((p) => p >= to));
  }
  s.target = Math.min(maxScroll, Math.max(0, Math.round(to)));
  if (prefersReducedMotion()) {
    track.scrollLeft = s.target;
    return;
  }
  pauseSnap(track, s);
  if (!s.frame) s.frame = requestAnimationFrame(() => step(track, s));
}

// A card focused any other way (a click, the Tab key) becomes the row's stop.
function onFocusin(e: FocusEvent): void {
  const track = e.currentTarget as HTMLElement;
  const cards = cardsOf(track);
  const card = e.target as HTMLElement;
  if (cards.includes(card)) setRoving(cards, card);
}

export function initShelfRows(): void {
  for (const off of teardown) off();
  teardown = [];
  for (const track of Array.from(document.querySelectorAll<HTMLElement>('[data-shelf-row]'))) {
    // Not passive: preventDefault is what stops the page scrolling underneath.
    track.addEventListener('wheel', onWheel, { passive: false });
    track.addEventListener('keydown', onKeydown);
    track.addEventListener('focusin', onFocusin);
    const cards = cardsOf(track);
    if (cards.length) setRoving(cards, cards[0]);
    teardown.push(() => {
      track.removeEventListener('wheel', onWheel);
      track.removeEventListener('keydown', onKeydown);
      track.removeEventListener('focusin', onFocusin);
    });
  }
}
