// speed-reader — RSVP for articles: the text shown one word at a time, each on
// its pivot letter (Spritz's "optimal recognition point") so the eye stays put.
// Two faces, one engine: the desktop aux button's popover
// ([data-sr-fab], articles/single.html) and the mobile navbar panel's "read"
// mode (site/topnav.html, opened from nav.ts by openMobileReader). Markup is
// components/speed-reader.html, styles assets/css/site/speed-reader.css, and
// func/speed-read.html decides which pages get it.
//
// The article behind follows along: the word and its sentence are highlighted
// with the CSS Custom Highlight API (no markup changes) and the page scrolls to
// keep them in view, so closing the reader leaves you where you stopped. It
// opens paused on the first word in view, or on the last one read if that's
// still on screen.
//
// The magnifier picks where to start: press it, then click (or tap) a word in
// the article. While it waits, clicks on the article choose a word instead of
// following links or closing the reader, and Escape cancels.
//
// For fun, V (desktop) voices each word in NPC Voices' Mythfall hum: the
// Simple view's default voice, from static/js/npc-voices/nv-voice.js
// (window.NvSpeak), with its data on the article ([data-sr-voice-*], from
// partials/npc-voices/data.html). V again mutes it.

const WPM_KEY = 'speed-reader-wpm';
const WPM_DEFAULT = 300;
const WPM_MIN = 100;
const WPM_MAX = 1000;
const WPM_STEP = 50;
// Text inside these is not read: code blocks, maths, figures and tables,
// widgets, collapsed details, footnote markers and the footnotes themselves.
const SKIP = 'header, pre, .katex, math, svg, script, style, figure, table, .not-prose, button, nav, details, sup, .footnotes, noscript, [aria-hidden="true"]';
const BLOCK = 'p, li, h1, h2, h3, h4, h5, h6, blockquote, dd, dt';
// How much longer a word stays up after these (× one word's time), by ear and
// close to what Spritz-style readers use: sentence ends and paragraph ends get
// a breath, commas a beat, long words a little more.
const PAUSE = { sentence: 2.2, clause: 1.5, block: 2.8, heading: 1.4 };
const START_DELAY_MS = 450;
// The band the word is kept in, as fractions of the readable height: the page
// scrolls only when the word leaves it, and then puts it at `aim`.
const BAND = { top: 0.12, bottom: 0.65, aim: 0.3 };
const DESKTOP = '(min-width: 1024px)';

interface Token {
  node: Text;
  start: number;
  end: number;
  text: string;
  block: Element;
  sentenceEnd: boolean;
  blockEnd: boolean;
  heading: boolean;
}

interface View {
  root: HTMLElement;
  word: HTMLElement;
  left: HTMLElement;
  pivot: HTMLElement;
  right: HTMLElement;
  fill: HTMLElement;
  wpm: HTMLElement;
  time: HTMLElement;
}

let article: HTMLElement | null = null;
let tokens: Token[] = [];
let index = -1;
let playing = false;
let timer = 0;
let wpm = readWpm();
let view: View | null = null;
let keysBound = false;
let picking = false;
let hoverFrame = 0;

// The Mythfall voice (V). Its script loads when the desktop reader first
// opens, so the key press itself can wake the audio, which browsers require.
interface NvSpeak {
  wake: () => boolean;
  voice: (picker: unknown, picks: Record<string, string>, tuning: unknown) => unknown;
  latencyS: () => number;
  word: (text: string, settings: unknown, withinMs: number, inS?: number) => AudioScheduledSourceNode[];
}
let voiceOn = false;
let voiceSettings: unknown = null;
let voiceLoad: Promise<void> | null = null;
// Sounds queued for a word not shown yet; dropped if the reader pauses or
// jumps before it gets there.
let queued: AudioScheduledSourceNode[] = [];

function speaker(): NvSpeak | undefined {
  return (window as unknown as { NvSpeak?: NvSpeak }).NvSpeak;
}

function readJson(raw: string | undefined): unknown {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function loadVoice(): Promise<void> {
  if (voiceLoad) return voiceLoad;
  const src = article?.dataset.srVoiceSrc;
  voiceLoad = new Promise((resolve) => {
    if (speaker() || !src) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
  return voiceLoad;
}

// The Simple view's default picks (Mythfall, adult, calm…), as NPC Voices
// would build them.
function mythfall(): unknown {
  const picker = readJson(article?.dataset.srVoicePicker) as { categories?: Array<{ key: string; default: string }> } | null;
  const api = speaker();
  if (!picker?.categories || !api) return null;
  const picks: Record<string, string> = {};
  picker.categories.forEach((category) => (picks[category.key] = category.default));
  return api.voice(picker, picks, readJson(article?.dataset.srVoiceTuning) ?? {});
}

function toggleVoice(): void {
  const api = speaker();
  if (!api) return;
  voiceOn = !voiceOn && api.wake();
  if (voiceOn && !voiceSettings) voiceSettings = mythfall();
  if (!voiceSettings) voiceOn = false;
  if (!voiceOn) dropQueued();
  view?.root.querySelector('[data-sr-voice-badge]')?.toggleAttribute('hidden', !voiceOn);
  // Say the word on screen at once, so turning it on while paused is heard.
  if (voiceOn && tokens[index]) speak(tokens[index]);
}

// Say a word now (turning the voice on, a jump while paused).
function speak(token: Token): void {
  if (voiceOn && voiceSettings) speaker()?.word(token.text, voiceSettings, delayOf(token));
}

// Queue the word that shows after `inMs`, started early by the speakers'
// delay so it's heard as it appears. Without this a Bluetooth headset hears
// each word well after it's gone.
function speakAhead(token: Token | undefined, inMs: number): void {
  const api = speaker();
  if (!token || !api || !voiceOn || !voiceSettings) return;
  queued = api.word(token.text, voiceSettings, delayOf(token), inMs / 1000 - api.latencyS());
}

function dropQueued(): void {
  queued.forEach((node) => {
    try {
      node.stop();
    } catch {
      // Already finished.
    }
  });
  queued = [];
}

function readWpm(): number {
  try {
    const saved = Number(window.localStorage.getItem(WPM_KEY));
    return saved >= WPM_MIN && saved <= WPM_MAX ? saved : WPM_DEFAULT;
  } catch {
    return WPM_DEFAULT;
  }
}

function saveWpm(): void {
  try {
    window.localStorage.setItem(WPM_KEY, String(wpm));
  } catch {
    // A private window can refuse storage; the speed still applies.
  }
}

/* ---- Reading the article ------------------------------------------------ */

function tokenize(root: HTMLElement): Token[] {
  const shown = new Map<Element, boolean>();
  const isReadable = (el: Element): boolean => {
    if (!shown.has(el)) shown.set(el, !el.closest(SKIP) && el.getClientRects().length > 0);
    return shown.get(el) === true;
  };
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (!parent || !node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      return isReadable(parent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const found: Token[] = [];
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const block = node.parentElement!.closest(BLOCK) ?? node.parentElement!;
    const heading = /^H[1-6]$/.test(block.tagName);
    for (const match of node.data.matchAll(/\S+/g)) {
      const start = match.index ?? 0;
      found.push({ node, start, end: start + match[0].length, text: match[0], block, sentenceEnd: false, blockEnd: false, heading });
    }
  }
  found.forEach((token, i) => {
    const next = found[i + 1];
    token.blockEnd = !next || next.block !== token.block;
    token.sentenceEnd = token.blockEnd || /[.!?…]["'”’)\]]*$/.test(token.text);
  });
  return found;
}

function ensureTokens(): boolean {
  const root = document.querySelector<HTMLElement>('[data-sr-article]');
  if (root !== article) {
    article = root;
    tokens = root ? tokenize(root) : [];
    index = -1;
  }
  return tokens.length > 0;
}

function rangeOf(from: Token, to: Token = from): Range {
  const range = document.createRange();
  range.setStart(from.node, from.start);
  range.setEnd(to.node, to.end);
  return range;
}

// The first word in the reading band (so opening doesn't scroll the page), or
// the last one read if it's still on screen.
function startIndex(): number {
  const top = readingTop();
  const bandTop = top + (window.innerHeight - top) * BAND.top;
  const onScreen = (i: number): boolean => {
    const rect = rangeOf(tokens[i]).getBoundingClientRect();
    return rect.height > 0 && rect.top >= top && rect.bottom <= window.innerHeight;
  };
  if (index >= 0 && index < tokens.length && onScreen(index)) return index;
  const first = tokens.findIndex((_, i) => rangeOf(tokens[i]).getBoundingClientRect().top >= bandTop);
  return Math.max(0, first);
}

function sentenceStart(i: number): number {
  let k = i;
  while (k > 0 && !tokens[k - 1].sentenceEnd) k--;
  return k;
}

function sentenceEnd(i: number): number {
  let k = i;
  while (k < tokens.length - 1 && !tokens[k].sentenceEnd) k++;
  return k;
}

/* ---- Showing a word ------------------------------------------------------ */

// Spritz's pivot: the letter about a third in, counted over the word's letters
// (leading quotes and brackets don't count).
function pivotOf(word: string): number {
  const lead = word.length - word.replace(/^[^\p{L}\p{N}]+/u, '').length;
  const letters = word.replace(/[^\p{L}\p{N}]/gu, '').length;
  const orp = letters <= 1 ? 0 : letters <= 5 ? 1 : letters <= 9 ? 2 : letters <= 13 ? 3 : 4;
  return Math.min(word.length - 1, lead + orp);
}

function delayOf(token: Token): number {
  const base = 60000 / wpm;
  const letters = token.text.replace(/[^\p{L}\p{N}]/gu, '').length;
  let factor = 1 + Math.min(0.5, Math.max(0, letters - 7) * 0.06);
  if (token.blockEnd) factor = Math.max(factor, PAUSE.block);
  else if (token.sentenceEnd) factor = Math.max(factor, PAUSE.sentence);
  else if (/[,;:—–-]["'”’)\]]*$/.test(token.text)) factor = Math.max(factor, PAUSE.clause);
  if (token.heading) factor *= PAUSE.heading;
  return base * factor;
}

function minutesLeft(): string {
  let ms = 0;
  for (let i = Math.max(0, index); i < tokens.length; i++) ms += delayOf(tokens[i]);
  const minutes = ms / 60000;
  return minutes < 1 ? 'under a minute left' : `${Math.round(minutes)} min left`;
}

function render(): void {
  if (!view) return;
  const token = tokens[index];
  if (!token) return;
  const at = pivotOf(token.text);
  view.left.textContent = token.text.slice(0, at);
  view.pivot.textContent = token.text.charAt(at);
  view.right.textContent = token.text.slice(at + 1);
  view.word.toggleAttribute('data-long', token.text.length > 14);
  view.fill.style.width = `${((index + 1) / tokens.length) * 100}%`;
  view.wpm.textContent = String(wpm);
  view.time.textContent = minutesLeft();
  highlight();
  follow();
}

// The CSS Custom Highlight API, where the browser has it.
function highlightRegistry(): { registry?: Map<string, unknown>; Make?: new (...ranges: Range[]) => unknown } {
  return {
    registry: (window.CSS as unknown as { highlights?: Map<string, unknown> }).highlights,
    Make: (window as unknown as { Highlight?: new (...ranges: Range[]) => unknown }).Highlight,
  };
}

function highlight(): void {
  const { registry, Make } = highlightRegistry();
  if (!registry || !Make) return;
  const token = tokens[index];
  if (!token) {
    clearHighlight();
    return;
  }
  registry.set('sr-sentence', new Make(rangeOf(tokens[sentenceStart(index)], tokens[sentenceEnd(index)])));
  registry.set('sr-word', new Make(rangeOf(token)));
}

function clearHighlight(): void {
  const { registry } = highlightRegistry();
  ['sr-word', 'sr-sentence', 'sr-hover'].forEach((name) => registry?.delete(name));
}

// Where the readable part of the window starts: under the mobile panel when
// it's the panel reading, else the top.
function readingTop(): number {
  if (view?.root.dataset.sr !== 'mobile') return 0;
  const panel = document.querySelector<HTMLElement>('[data-mobile-panel]');
  return panel ? Math.max(0, panel.getBoundingClientRect().bottom) : 0;
}

// Keep the word in BAND, scrolling only when it drifts out, so the page
// doesn't twitch every word.
function follow(): void {
  const rect = rangeOf(tokens[index]).getBoundingClientRect();
  if (!rect.height) return;
  const top = readingTop();
  const room = window.innerHeight - top;
  if (rect.top >= top + room * BAND.top && rect.bottom <= top + room * BAND.bottom) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: window.scrollY + rect.top - (top + room * BAND.aim), behavior: reduce ? 'auto' : 'smooth' });
}

/* ---- Picking a word (the magnifier) -------------------------------------- */

function setPicking(on: boolean): void {
  picking = on;
  document.documentElement.toggleAttribute('data-sr-picking', on);
  view?.root.querySelector('[data-sr-pick]')?.setAttribute('aria-pressed', String(on));
  if (on) setPlaying(false);
  else highlightRegistry().registry?.delete('sr-hover');
}

// The text position under a point: caretPositionFromPoint where it exists
// (Firefox, newer Chrome), caretRangeFromPoint otherwise (Safari, older Chrome).
function pointAt(x: number, y: number): { node: Node; offset: number } | null {
  const doc = document as unknown as {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  if (doc.caretPositionFromPoint) {
    const at = doc.caretPositionFromPoint(x, y);
    return at ? { node: at.offsetNode, offset: at.offset } : null;
  }
  const range = doc.caretRangeFromPoint?.(x, y);
  return range ? { node: range.startContainer, offset: range.startOffset } : null;
}

// The word at a point, or the next readable one after it (a click in a code
// block or a gap lands on what follows).
function tokenAt(x: number, y: number): number {
  const at = pointAt(x, y);
  if (!at || !article?.contains(at.node)) return -1;
  return tokens.findIndex((token) => rangeOf(token).comparePoint(at.node, at.offset) <= 0);
}

function showHover(x: number, y: number): void {
  const { registry, Make } = highlightRegistry();
  if (!registry || !Make) return;
  const i = tokenAt(x, y);
  if (i < 0) registry.delete('sr-hover');
  else registry.set('sr-hover', new Make(rangeOf(tokens[i])));
}

function pick(i: number): void {
  setPicking(false);
  if (i < 0) return;
  index = i;
  render();
  speak(tokens[index]);
}

// Bound once for the site: they only act while the magnifier is waiting.
// Capture phase, so the pick wins over the reader's own outside-click closing,
// the navbar panel's, and the article's links.
function bindPickingOnce(): void {
  if (document.documentElement.dataset.srPickBound === '1') return;
  document.documentElement.dataset.srPickBound = '1';
  document.addEventListener(
    'click',
    (e) => {
      if (!picking || !view) return;
      const target = e.target as Element | null;
      if (target && view.root.contains(target)) return; // the reader's own buttons
      if (!target || !article?.contains(target)) {
        setPicking(false);
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      pick(tokenAt(e.clientX, e.clientY));
    },
    true,
  );
  document.addEventListener(
    'mousemove',
    (e) => {
      if (!picking || hoverFrame) return;
      hoverFrame = requestAnimationFrame(() => {
        hoverFrame = 0;
        showHover(e.clientX, e.clientY);
      });
    },
    { passive: true },
  );
  document.addEventListener(
    'keydown',
    (e) => {
      if (!picking || e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      setPicking(false);
    },
    true,
  );
}

/* ---- Playing ------------------------------------------------------------- */

function setPlaying(next: boolean): void {
  playing = next;
  window.clearTimeout(timer);
  dropQueued();
  if (view) {
    view.root.dataset.playing = String(next);
    view.root.querySelector('[data-sr-play]')?.setAttribute('aria-label', next ? 'Pause' : 'Play');
  }
  if (!next) return;
  timer = window.setTimeout(step, START_DELAY_MS);
  speakAhead(tokens[index + 1], START_DELAY_MS);
}

function step(): void {
  if (!playing || !isOpen()) {
    stop();
    return;
  }
  if (index >= tokens.length - 1) {
    setPlaying(false);
    return;
  }
  index += 1;
  render();
  const delay = delayOf(tokens[index]);
  timer = window.setTimeout(step, delay);
  speakAhead(tokens[index + 1], delay);
}

function jumpTo(i: number): void {
  index = Math.max(0, Math.min(tokens.length - 1, i));
  render();
  if (playing) setPlaying(true);
  else speak(tokens[index]);
}

function back(): void {
  const start = sentenceStart(index);
  // Partway in, go to this sentence's start; at its start, the one before.
  jumpTo(index - start > 1 ? start : sentenceStart(Math.max(0, start - 1)));
}

function next(): void {
  jumpTo(sentenceEnd(index) + 1);
}

function changeSpeed(delta: number): void {
  wpm = Math.max(WPM_MIN, Math.min(WPM_MAX, wpm + delta));
  saveWpm();
  if (view) {
    view.wpm.textContent = String(wpm);
    view.time.textContent = minutesLeft();
  }
}

function stop(): void {
  playing = false;
  window.clearTimeout(timer);
  dropQueued();
  setPicking(false);
  if (view) view.root.dataset.playing = 'false';
  clearHighlight();
  view = null;
}

function viewOf(root: HTMLElement): View {
  const get = (hook: string): HTMLElement => root.querySelector<HTMLElement>(`[data-sr-${hook}]`)!;
  return { root, word: get('word'), left: get('left'), pivot: get('pivot'), right: get('right'), fill: get('fill'), wpm: get('wpm'), time: get('time') };
}

function open(where: 'desktop' | 'mobile'): void {
  const root = document.querySelector<HTMLElement>(`[data-sr="${where}"]`);
  if (!root || !ensureTokens()) return;
  if (view && view.root !== root) stop();
  view = viewOf(root);
  index = startIndex();
  render();
  setPlaying(false);
  view.root.querySelector('[data-sr-voice-badge]')?.toggleAttribute('hidden', !voiceOn);
  if (where === 'desktop') void loadVoice();
}

// Whether the face that's reading is still open: the popover's <details>, or
// the mobile panel in "read" mode (it closes on outside taps and Escape, and
// other modes can take the panel over).
function isOpen(): boolean {
  if (!view) return false;
  if (view.root.dataset.sr === 'desktop') return !!view.root.closest<HTMLDetailsElement>('details')?.open;
  const nav = document.querySelector<HTMLDetailsElement>('[data-mobile-nav]');
  const panel = document.querySelector<HTMLElement>('[data-mobile-panel]');
  return !!nav?.open && panel?.dataset.mode === 'read';
}

/** Called by nav.ts when the navbar's speed-read button opens the panel. */
export function openMobileReader(): void {
  open('mobile');
}

function wireControls(root: HTMLElement): void {
  if (root.dataset.srBound === '1') return;
  root.dataset.srBound = '1';
  const on = (hook: string, fn: () => void): void => {
    root.querySelector(`[data-sr-${hook}]`)?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!view || view.root !== root) return;
      fn();
    });
  };
  on('stage', () => setPlaying(!playing));
  on('pick', () => setPicking(!picking));
  on('play', () => setPlaying(!playing));
  on('back', back);
  on('next', next);
  on('slower', () => changeSpeed(-WPM_STEP));
  on('faster', () => changeSpeed(WPM_STEP));
  const wpmOut = root.querySelector<HTMLElement>('[data-sr-wpm]');
  if (wpmOut) wpmOut.textContent = String(wpm);
}

// While the desktop popover is open: Space plays or pauses, ←/→ move a
// sentence, ↑/↓ change speed, V turns the Mythfall voice on or off. Caught early so Space doesn't also toggle the
// <details> or scroll the page.
function bindKeysOnce(): void {
  if (keysBound) return;
  keysBound = true;
  document.addEventListener(
    'keydown',
    (e) => {
      if (!view || view.root.dataset.sr !== 'desktop' || !isOpen()) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const actions: Record<string, () => void> = {
        ' ': () => setPlaying(!playing),
        ArrowLeft: back,
        ArrowRight: next,
        ArrowUp: () => changeSpeed(WPM_STEP),
        ArrowDown: () => changeSpeed(-WPM_STEP),
        v: toggleVoice,
        V: toggleVoice,
      };
      const action = actions[e.key];
      if (!action) return;
      e.preventDefault();
      e.stopPropagation();
      action();
    },
    true,
  );
}

export function initSpeedReader(): void {
  // A new page (hx-boost) means new text: forget the last one.
  if (article && !document.contains(article)) {
    stop();
    article = null;
    tokens = [];
    index = -1;
    voiceSettings = null;
    voiceOn = false;
    voiceLoad = null;
  }
  const roots = Array.from(document.querySelectorAll<HTMLElement>('[data-sr]'));
  if (!roots.length) return;
  roots.forEach(wireControls);
  bindKeysOnce();
  bindPickingOnce();
  const fab = document.querySelector<HTMLDetailsElement>('[data-sr-fab]');
  if (fab && fab.dataset.srBound !== '1') {
    fab.dataset.srBound = '1';
    fab.addEventListener('toggle', () => {
      if (fab.open && window.matchMedia(DESKTOP).matches) open('desktop');
      // Closed: stop and clear the highlights whatever state the reader is
      // in, unless the mobile panel is the one reading.
      else if (view?.root.dataset.sr !== 'mobile') stop();
    });
  }
  // Closing the mobile panel (its X, a tap outside, Escape) stops the reader
  // and clears the highlights, even while paused.
  const nav = document.querySelector<HTMLDetailsElement>('[data-mobile-nav]');
  if (nav && nav.dataset.srBound !== '1') {
    nav.dataset.srBound = '1';
    nav.addEventListener('toggle', () => {
      if (!nav.open && view?.root.dataset.sr !== 'desktop') stop();
    });
  }
  document.querySelectorAll('[data-sr-pending]').forEach((el) => el.removeAttribute('data-sr-pending'));
}
