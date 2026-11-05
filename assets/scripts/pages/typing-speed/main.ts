// /misc/typing-speed/ — the typing test (layouts/shortcodes/typing-speed/test.html).
//
// What you type is the value of a hidden textarea laid over the board, so
// phone keyboards, autocorrect and backspace all arrive as one `input` event,
// compared a character at a time with the text. The text is random words
// (timed) or a passage (an article, a book, your own; runs until finished),
// shown in place with the current sentence lit, the rest dimmed and the
// current word highlighted; it scrolls a line at a time. Two bars above it
// show momentum: the overall speed and the last finished sentence's.
//
// The clock only counts typing: a pause counts for at most PAUSE_MS, after
// which the board shows it's paused until the next key. Text handling is in
// text.ts, the passage pickers in library.ts.

import { randomWords, sentenceRanges, wordRanges, type Range } from './text';
import { readLibrary, wireArticles, wireBooks, wireOwn, type Passage } from './library';

const STORAGE_KEY = 'typing-speed-best-v1';
const CHARS_PER_WORD = 5;
const WORDS_PER_BATCH = 60;
// Random words are topped up when the caret gets this close to the end.
const REFILL_AHEAD = 120;
// A pause longer than this stops the clock (so resting your arms is free).
const PAUSE_MS = 1000;
// The momentum bars share one scale: at least this, or the best for this
// test, rounded up to a step, and it grows if you beat it.
const METER_MIN_WPM = 60;
const METER_STEP_WPM = 20;
// Speeds are read over at least this long, so the first few keys (a letter in
// 50 ms is 240 wpm) don't blow the scale up before the bars mean anything.
const METER_FLOOR_MS = 2000;

type Source = 'words' | 'articles' | 'books' | 'own';

interface Config {
  durations: number[];
  default: number;
  words: string[];
}

function readConfig(root: HTMLElement): Config | null {
  try {
    const config = JSON.parse(root.dataset.tsConfig || '') as Config;
    return Array.isArray(config.words) && config.words.length ? config : null;
  } catch {
    return null;
  }
}

function loadBests(): Record<string, number> {
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}') as unknown;
    return raw && typeof raw === 'object' ? (raw as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function saveBests(bests: Record<string, number>): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bests));
  } catch {
    // A private window can refuse storage; the result still shows.
  }
}

function wpmOf(chars: number, ms: number): number {
  return ms > 0 ? chars / CHARS_PER_WORD / (ms / 60000) : 0;
}

function el(tag: string, className: string, text?: string): HTMLElement {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function init(root: HTMLElement): void {
  const config = readConfig(root);
  const library = readLibrary(root);
  const q = <T extends Element>(hook: string): T | null => root.querySelector<T>(`[data-ts-${hook}]`);
  const board = q<HTMLElement>('board');
  const windowEl = q<HTMLElement>('window');
  const textEl = q<HTMLElement>('text');
  const caret = q<HTMLElement>('caret');
  const input = q<HTMLTextAreaElement>('input');
  const hint = q<HTMLElement>('hint');
  const restart = q<HTMLButtonElement>('restart');
  const result = q<HTMLElement>('result');
  const chart = q<SVGSVGElement>('chart');
  if (!config || !library || !board || !windowEl || !textEl || !caret || !input || !hint || !restart || !result || !chart) return;

  const all = <T extends Element>(selector: string): T[] => Array.from(root.querySelectorAll<T>(selector));
  const show = (hook: string, value: string): void => {
    const element = q<HTMLElement>(hook);
    if (element) element.textContent = value;
  };
  const sourceChips = all<HTMLButtonElement>('[data-ts-source]');
  const timeChips = all<HTMLButtonElement>('[data-ts-seconds]');
  const timeMenu = q<HTMLDetailsElement>('time-menu');
  const optionChips = all<HTMLButtonElement>('[data-ts-option]');
  const panels = all<HTMLElement>('[data-ts-panel]');

  let source: Source = 'words';
  const options = { seconds: config.default, punctuation: false, numbers: false };
  let passage: Passage | null = null;

  let target = '';
  let typed = '';
  let chars: HTMLElement[] = [];
  let words: Range[] = [];
  let sentences: Range[] = [];
  let wordEls: HTMLElement[] = [];
  let sentenceEls: HTMLElement[] = [];
  // For each caret position, the word it belongs to: a word's own letters,
  // and the space after it (the word is finished but not yet left).
  let wordAt: Int32Array = new Int32Array(0);
  let sentenceOfWord: Int32Array = new Int32Array(0);
  let currentWord = -1;
  let currentSentence = -1;
  let keystrokes = 0;
  let rightKeystrokes = 0;
  // Typing time: activeMs is banked at each key, each gap capped at PAUSE_MS.
  let startedAt = 0;
  let lastKeyAt = 0;
  let activeMs = 0;
  let isPaused = false;
  // Momentum: when the current sentence started (in typing time), and the
  // speed of the last one finished (-1 until one is).
  let sentenceStartMs = 0;
  let lastSentenceWpm = -1;
  let meterMax = METER_MIN_WPM;
  let frame = 0;
  let isDone = false;
  let samples: number[] = [];

  const isTimed = (): boolean => source === 'words';

  /* ---- Building the text ------------------------------------------------ */

  function index(): void {
    words = wordRanges(target);
    sentences = sentenceRanges(target, words);
    wordAt = new Int32Array(target.length + 1).fill(-1);
    words.forEach((word, w) => {
      const until = words[w + 1] ? words[w + 1].start : target.length + 1;
      for (let i = word.start; i < until; i++) wordAt[i] = w;
    });
    sentenceOfWord = new Int32Array(words.length);
    let s = 0;
    words.forEach((word, w) => {
      while (sentences[s] && word.start >= sentences[s].end) s++;
      sentenceOfWord[w] = s;
    });
  }

  // Sentence spans hold word spans hold letter spans; the spaces between words
  // sit in the sentence, so dimming a sentence dims its spaces too.
  function render(): void {
    index();
    textEl!.textContent = '';
    chars = new Array(target.length);
    wordEls = [];
    sentenceEls = [];
    const fragment = document.createDocumentFragment();
    sentences.forEach((sentence, s) => {
      const sentenceEl = el('span', 'ts-sentence');
      sentenceEls.push(sentenceEl);
      const until = sentences[s + 1] ? sentences[s + 1].start : target.length;
      let i = sentence.start;
      while (i < until) {
        const w = wordAt[i];
        const word = words[w];
        if (word && i === word.start) {
          const wordEl = el('span', 'ts-word');
          for (let k = word.start; k < word.end; k++) wordEl.appendChild((chars[k] = el('span', 'ts-ch', target[k])));
          wordEls[w] = wordEl;
          sentenceEl.appendChild(wordEl);
          i = word.end;
          continue;
        }
        sentenceEl.appendChild((chars[i] = el('span', 'ts-ch', target[i])));
        i++;
      }
      fragment.appendChild(sentenceEl);
    });
    textEl!.appendChild(fragment);
    currentWord = -1;
    currentSentence = -1;
    markChars(0, typed.length);
  }

  function markChars(from: number, to: number): void {
    for (let i = from; i < to; i++) {
      const span = chars[i];
      if (!span) continue;
      span.classList.toggle('is-right', i < typed.length && typed[i] === target[i]);
      span.classList.toggle('is-wrong', i < typed.length && typed[i] !== target[i]);
    }
  }

  /* ---- Showing where you are -------------------------------------------- */

  function showFocus(): void {
    const w = wordAt[Math.min(typed.length, target.length)];
    if (w !== currentWord) {
      wordEls[currentWord]?.classList.remove('is-current');
      wordEls[w]?.classList.add('is-current');
      currentWord = w;
    }
    const s = w >= 0 ? sentenceOfWord[w] : -1;
    if (s !== currentSentence) {
      if (s === currentSentence + 1 && currentSentence >= 0) finishSentence(currentSentence);
      sentenceEls[currentSentence]?.classList.remove('is-active');
      sentenceEls[s]?.classList.add('is-active');
      currentSentence = s;
      sentenceStartMs = typingMs();
    }
    placeCaret();
  }

  // Moving on to the next sentence scores the one just left.
  function finishSentence(s: number): void {
    const sentence = sentences[s];
    const ms = typingMs() - sentenceStartMs;
    if (!sentence || !startedAt || ms <= 0) return;
    lastSentenceWpm = wpmOf(correctIn(sentence.start, sentence.end + 1), ms);
  }

  // The caret sits before the next character; the text scrolls so that
  // character's line is the second one showing. Its top and height are the
  // letter's own box: a line is taller than its letters (line-height), and
  // sizing the caret by the letter put it half a line too high.
  function placeCaret(): void {
    const next = chars[typed.length];
    const last = chars[typed.length - 1];
    const anchor = next || last;
    if (!anchor) return;
    const left = next ? anchor.offsetLeft : anchor.offsetLeft + anchor.offsetWidth;
    const lineHeight = parseFloat(getComputedStyle(textEl!).lineHeight) || anchor.offsetHeight || 1;
    const line = Math.floor(anchor.offsetTop / lineHeight);
    const scrollTop = Math.max(0, line - 1) * lineHeight;
    textEl!.style.transform = `translateY(${-scrollTop}px)`;
    caret!.style.transform = `translate(${left}px, ${anchor.offsetTop - scrollTop}px)`;
    caret!.style.height = `${anchor.offsetHeight}px`;
  }

  /* ---- The clock and the score ------------------------------------------ */

  function correctIn(from: number, to: number): number {
    let count = 0;
    for (let i = from; i < Math.min(to, typed.length); i++) if (typed[i] === target[i]) count++;
    return count;
  }

  function correctChars(): number {
    return correctIn(0, typed.length);
  }

  // Typing time so far: banked time plus the current gap, capped.
  function typingMs(): number {
    return startedAt ? activeMs + Math.min(performance.now() - lastKeyAt, PAUSE_MS) : 0;
  }

  function elapsedMs(): number {
    return isTimed() ? Math.min(typingMs(), options.seconds * 1000) : typingMs();
  }

  function accuracy(): number {
    return keystrokes ? Math.round((rightKeystrokes / keystrokes) * 100) : 100;
  }

  function showLive(): void {
    const ms = elapsedMs();
    show('time', String(isTimed() ? Math.max(0, Math.ceil(options.seconds - ms / 1000)) : Math.floor(ms / 1000)));
    show('wpm', String(Math.round(wpmOf(correctChars(), ms))));
    show('accuracy', String(accuracy()));
    if (!isTimed()) show('progress', String(Math.floor((typed.length / Math.max(1, target.length)) * 100)));
    showMomentum(ms);
  }

  function showMeter(hook: string, wpm: number): void {
    const fill = q<HTMLElement>(`meter-${hook}`);
    if (fill) fill.style.width = `${Math.min(100, (wpm / meterMax) * 100)}%`;
    show(`meter-${hook}-value`, String(Math.round(wpm)));
  }

  // Before the first sentence is done, the second bar follows the one you're on.
  function showMomentum(ms: number): void {
    const overall = wpmOf(correctChars(), Math.max(ms, METER_FLOOR_MS));
    const sentence = currentSentence >= 0 ? sentences[currentSentence] : undefined;
    const isLive = lastSentenceWpm < 0;
    const recent = isLive ? (sentence ? wpmOf(correctIn(sentence.start, typed.length), Math.max(typingMs() - sentenceStartMs, METER_FLOOR_MS)) : 0) : lastSentenceWpm;
    while (Math.max(overall, recent) > meterMax) meterMax += METER_STEP_WPM;
    showMeter('overall', overall);
    showMeter('sentence', recent);
    show('meter-sentence-label', isLive ? 'This sentence' : 'Last sentence');
    q<HTMLElement>('meter-sentence')?.classList.toggle('is-up', !isLive && recent >= overall && overall > 0);
  }

  function showPause(paused: boolean): void {
    if (paused === isPaused) return;
    isPaused = paused;
    board!.classList.toggle('is-paused', paused);
    hint!.hidden = !paused;
    if (paused) hint!.textContent = 'Paused. Type to carry on';
  }

  function tick(): void {
    showPause(performance.now() - lastKeyAt > PAUSE_MS);
    const ms = elapsedMs();
    while (samples.length < Math.floor(ms / 1000)) samples.push(wpmOf(correctChars(), (samples.length + 1) * 1000));
    showLive();
    if (isTimed() && ms >= options.seconds * 1000) {
      finish();
      return;
    }
    frame = requestAnimationFrame(tick);
  }

  function drawChart(): void {
    const top = Math.max(1, ...samples);
    const points = samples.map((value, i) => {
      const x = samples.length > 1 ? (i / (samples.length - 1)) * 300 : 150;
      return `${x.toFixed(1)},${(76 - (value / top) * 70).toFixed(1)}`;
    });
    chart!.innerHTML = points.length ? `<polyline class="ts-chart-line" points="${points.join(' ')}" />` : '';
  }

  function modeKey(): string {
    if (!isTimed()) return 'passage';
    return [options.seconds + 's', options.punctuation ? 'punctuation' : '', options.numbers ? 'numbers' : ''].filter(Boolean).join('+');
  }

  function modeLabel(): string {
    if (!isTimed()) return `${words.length} words`;
    const extras = [options.punctuation ? 'punctuation' : '', options.numbers ? 'numbers' : ''].filter(Boolean);
    return options.seconds + ' seconds' + (extras.length ? ', ' + extras.join(' and ') : '');
  }

  function finish(): void {
    isDone = true;
    cancelAnimationFrame(frame);
    showPause(false);
    finishSentence(currentSentence);
    showLive();
    input!.disabled = true;
    const ms = isTimed() ? options.seconds * 1000 : elapsedMs();
    const right = correctChars();
    const wpm = Math.round(wpmOf(right, ms));
    const bests = loadBests();
    const key = modeKey();
    const previous = bests[key] || 0;
    const isBest = wpm > previous;
    if (isBest) {
      bests[key] = wpm;
      saveBests(bests);
    }
    show('result-wpm', String(wpm));
    show('result-accuracy', accuracy() + '%');
    show('result-raw', Math.round(wpmOf(typed.length, ms)) + ' wpm');
    show('result-chars', `${right} right · ${typed.length - right} wrong`);
    show('result-mode', modeLabel());
    const best = q<HTMLElement>('best');
    if (best) {
      best.hidden = !isBest && !previous;
      best.textContent = isBest ? (previous ? `New best (was ${previous})` : 'First score for this test') : `Best: ${previous}`;
      best.classList.toggle('is-new', isBest);
    }
    drawChart();
    result!.hidden = false;
    hint!.hidden = true;
    restart!.focus();
  }

  /* ---- Starting and typing ---------------------------------------------- */

  // A fresh run of the current text (or new random words).
  function reset(): void {
    cancelAnimationFrame(frame);
    if (timeMenu) timeMenu.open = false;
    typed = '';
    keystrokes = 0;
    rightKeystrokes = 0;
    startedAt = 0;
    lastKeyAt = 0;
    activeMs = 0;
    sentenceStartMs = 0;
    lastSentenceWpm = -1;
    showPause(false);
    board!.classList.remove('is-typing');
    isDone = false;
    samples = [];
    input!.value = '';
    result!.hidden = true;
    textEl!.style.transform = '';
    if (isTimed()) target = randomWords(config!.words, WORDS_PER_BATCH, options.punctuation, options.numbers, true);
    else target = passage ? passage.text : '';
    const isReady = target.length > 0;
    input!.disabled = !isReady;
    caret!.hidden = !isReady;
    hint!.hidden = false;
    hint!.textContent = isReady ? 'Click here or start typing' : 'Paste or drop some text above';
    q<HTMLElement>('progress-stat')!.hidden = isTimed();
    const best = loadBests()[modeKey()] || 0;
    meterMax = Math.max(METER_MIN_WPM, Math.ceil(best / METER_STEP_WPM) * METER_STEP_WPM);
    render();
    showLive();
    showFocus();
  }

  function onInput(): void {
    if (isDone) return;
    const value = input!.value.slice(0, target.length);
    const now = performance.now();
    if (!startedAt && value) {
      startedAt = now;
      hint!.hidden = true;
      frame = requestAnimationFrame(tick);
    } else if (startedAt) {
      activeMs += Math.min(now - lastKeyAt, PAUSE_MS);
    }
    lastKeyAt = now;
    showPause(false);
    // Score only what was added, at the moment it was added.
    for (let i = typed.length; i < value.length; i++) {
      keystrokes++;
      if (value[i] === target[i]) rightKeystrokes++;
    }
    const from = Math.min(typed.length, value.length);
    const to = Math.max(typed.length, value.length);
    typed = value;
    if (isTimed() && target.length - typed.length < REFILL_AHEAD) {
      target += ' ' + randomWords(config!.words, WORDS_PER_BATCH, options.punctuation, options.numbers, /[.?]$/.test(target));
      render();
    } else {
      markChars(from, to);
    }
    board!.classList.add('is-typing');
    showFocus();
    showLive();
    if (!isTimed() && typed.length >= target.length) finish();
  }

  /* ---- Controls --------------------------------------------------------- */

  function press(chips: HTMLButtonElement[], chosen: HTMLButtonElement): void {
    chips.forEach((chip) => chip.setAttribute('aria-pressed', String(chip === chosen)));
  }

  // Loading and error notes from the pickers show where the eye already is.
  function showNote(text: string): void {
    hint!.textContent = text;
    hint!.hidden = !text;
  }

  function usePassage(next: Passage): void {
    passage = next;
    reset();
    input!.focus();
  }

  const loadArticle = wireArticles(root, library, usePassage, showNote);
  const loadBook = wireBooks(root, library, usePassage, showNote);
  wireOwn(root, usePassage, showNote);

  sourceChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      source = chip.dataset.tsSource as Source;
      press(sourceChips, chip);
      panels.forEach((panel) => (panel.hidden = panel.dataset.tsPanel !== source));
      show('time-label', 'seconds');
      passage = null;
      reset();
      if (source === 'articles') loadArticle();
      if (source === 'books') loadBook();
      if (source === 'words') input.focus();
    });
  });
  timeChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      options.seconds = Number(chip.dataset.tsSeconds);
      press(timeChips, chip);
      show('seconds-label', options.seconds + 's');
      reset();
      input.focus();
    });
  });
  optionChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const name = chip.dataset.tsOption as 'punctuation' | 'numbers';
      options[name] = !options[name];
      chip.setAttribute('aria-pressed', String(options[name]));
      reset();
      input.focus();
    });
  });
  restart.addEventListener('click', () => {
    reset();
    input.focus();
  });
  board.addEventListener('click', () => input.focus());
  // The length menu is a <details>; a click anywhere else closes it.
  document.addEventListener('click', (event) => {
    if (timeMenu?.open && !timeMenu.contains(event.target as Node)) timeMenu.open = false;
  });
  input.addEventListener('input', onInput);
  input.addEventListener('paste', (event) => event.preventDefault());
  // Enter would put a newline in the textarea and shift every later character.
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') event.preventDefault();
  });
  input.addEventListener('focus', () => board.classList.add('is-focused'));
  input.addEventListener('blur', () => board.classList.remove('is-focused'));
  root.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    reset();
    input.focus();
  });
  window.addEventListener('resize', placeCaret);

  all<HTMLButtonElement | HTMLSelectElement | HTMLTextAreaElement | HTMLInputElement>('button, select, [data-ts-own-text], [data-ts-own-file]').forEach((control) => (control.disabled = false));
  reset();
}

document.querySelectorAll<HTMLElement>('[data-ts]').forEach(init);
