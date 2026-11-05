// The Typing Speed card on /misc (partials/misc/live/typing-speed.html).
//
// One loop: the line is typed at a human, uneven pace, with one typo made
// and fixed, the current word highlighted and the speed ticking up; the
// finished score holds for a moment; then it starts again.

import { mountAll, watchCard } from './card-kit';

// A keystroke every 100–165 ms: about 90 words a minute, quick but human
// (five characters a word, so 450 keys a minute, one per 133 ms on average).
const KEY_MS = [100, 165];
const TYPO_AT = 18; // the "w" of "always" comes out wrong first
const TYPO_MS = 260;
const HOLD_MS = 2400;
const CHARS_PER_WORD = 5;

interface Step {
  at: number; // ms from the start of the loop
  run: () => void;
}

function mount(root: HTMLElement): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const q = <T extends Element>(hook: string): T | null => root.querySelector<T>(`[data-${hook}]`);
  const caret = q<SVGRectElement>('caret');
  const wpm = q<SVGTextElement>('wpm');
  if (!caret || !wpm) return;

  const advance = Number(root.dataset.advance) || 6.6;
  const letters = Array.from(root.querySelectorAll<SVGTextElement>('.ts-ch'));
  const highlights = Array.from(root.querySelectorAll<SVGRectElement>('.ts-hl'));
  const words = highlights.map((rect) => ({ from: Number(rect.dataset.from), to: Number(rect.dataset.to) }));
  const text = new Map(letters.map((letter) => [Number(letter.dataset.i), letter]));
  const lastIndex = Math.max(...text.keys());
  let typedAt = 0; // when the first key of this loop landed

  // The caret sits just left of the next letter. On a space (spaces have no
  // element) or past the end, it sits just right of the letter before.
  const placeCaret = (next: number): void => {
    const letter = text.get(next);
    const before = text.get(next - 1);
    const anchor = letter || before;
    if (!anchor) return;
    const x = Number(anchor.getAttribute('x')) + (letter ? 0 : advance);
    caret.setAttribute('x', String(x - 0.6));
    caret.setAttribute('y', String(Number(anchor.getAttribute('y')) - 9.5));
  };
  const lightWord = (next: number): void => {
    highlights.forEach((rect, w) => {
      const isOn = next >= words[w].from && next <= words[w].to && next <= lastIndex;
      if (isOn) rect.setAttribute('data-on', 'true');
      else rect.removeAttribute('data-on');
    });
  };
  const showSpeed = (chars: number, now: number): void => {
    // A couple of letters in a few milliseconds reads as a silly speed, so
    // the first moments count as at least a second and a half.
    const minutes = Math.max(now - typedAt, 1500) / 60000;
    wpm.textContent = `${Math.round(chars / CHARS_PER_WORD / minutes)} WPM`;
  };

  // Lays the loop out once: when each letter lands, the typo and its fix,
  // and the hold.
  const steps: Step[] = [];
  let at = 0;
  const add = (wait: number, run: () => void): void => {
    at += wait;
    steps.push({ at, run });
  };
  const keyMs = (): number => KEY_MS[0] + Math.random() * (KEY_MS[1] - KEY_MS[0]);

  add(0, () => {
    letters.forEach((letter) => letter.classList.remove('is-typed', 'is-wrong'));
    caret.style.display = '';
    placeCaret(0);
    lightWord(0);
    wpm.textContent = '0 WPM';
  });
  add(500, () => {});
  for (let i = 0; i <= lastIndex; i++) {
    const index = i;
    if (index === TYPO_AT) {
      add(keyMs(), () => {
        text.get(index)?.classList.add('is-wrong');
        placeCaret(index + 1);
      });
      add(TYPO_MS, () => {
        text.get(index)?.classList.remove('is-wrong');
        placeCaret(index);
      });
    }
    add(keyMs(), () => {
      if (index === 0) typedAt = performance.now();
      text.get(index)?.classList.add('is-typed');
      placeCaret(index + 1);
      lightWord(index + 1);
      showSpeed(index + 1, performance.now());
    });
  }
  add(120, () => {
    caret.style.display = 'none';
    lightWord(lastIndex + 1);
  });
  add(HOLD_MS, () => {});

  // Plays the steps against the clock; a gap (the card was asleep or off
  // screen) moves the start along instead of rushing to catch up.
  const loopMs = at;
  let start = 0;
  let last = 0;
  let next = 0;
  watchCard(
    root,
    (now) => {
      if (!start || now - last > 250) start = now - (last - start);
      last = now;
      let elapsed = now - start;
      if (elapsed >= loopMs) {
        start = now;
        elapsed = 0;
        next = 0;
      }
      while (next < steps.length && steps[next].at <= elapsed) steps[next++].run();
      return true;
    },
    () => {},
  );
}

mountAll('[data-live-typing]', mount);
