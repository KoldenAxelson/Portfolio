// The Ba-Gil card on /misc (partials/misc/live/ba-gil.html): one word built up
// a piece at a time. Each step in data-steps lists the pieces in reading order
// and the word's meaning. Every piece is positioned absolutely and slides to its
// slot, so a piece entering fades in where it lands, and the inversion step
// visibly swaps the two ends. The hyphens follow the gaps between pieces.

import { isAsleep, mountAll } from './card-kit';

const HOLD_MS = 2200;
const GAP_EM = 0.15; // space either side of a hyphen, in em of the word size

interface Step {
  order: string[];
  gloss: string;
}

function mount(root: HTMLElement): void {
  const steps = JSON.parse(root.dataset.steps || '[]') as Step[];
  const word = root.querySelector<HTMLElement>('[data-word]');
  const glossEl = root.querySelector<HTMLElement>('[data-gloss]');
  const pieces = new Map<string, HTMLElement>();
  for (const el of root.querySelectorAll<HTMLElement>('[data-piece]')) pieces.set(el.dataset.piece || '', el);
  const dashes = Array.from(root.querySelectorAll<HTMLElement>('[data-dash]'));
  if (!steps.length || !word || !glossEl) return;

  root.classList.add('is-live');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Opens (and, asleep or reduced motion, rests) on Ba-Mon-Ab, the page's example.
  let index = 2;
  let onScreen = false;

  // A hidden element jumps to its slot before fading in, so a piece that is
  // entering appears where it belongs instead of sliding in from elsewhere.
  const moveTo = (el: HTMLElement, x: number): void => {
    if (el.style.opacity !== '1') {
      el.style.transition = 'none';
      el.style.transform = `translateX(${x}px)`;
      void el.offsetWidth;
      el.style.transition = '';
    } else {
      el.style.transform = `translateX(${x}px)`;
    }
    el.style.opacity = '1';
  };

  const place = (step: Step): void => {
    const fontSize = parseFloat(getComputedStyle(pieces.get('mon') ?? word).fontSize) || 16;
    const wordSize = (pieces.get('mon')?.firstElementChild as HTMLElement | null)?.offsetHeight || fontSize * 2.25;
    const gap = GAP_EM * wordSize;
    const dashWidth = dashes[0]?.offsetWidth ?? 0;
    const widths = step.order.map((id) => pieces.get(id)?.offsetWidth ?? 0);
    const total = widths.reduce((sum, w) => sum + w, 0) + (step.order.length - 1) * (dashWidth + gap * 2);
    let x = (word.clientWidth - total) / 2;

    step.order.forEach((id, i) => {
      const el = pieces.get(id);
      if (!el) return;
      moveTo(el, x);
      x += widths[i];
      const dash = dashes[i];
      if (dash && i < step.order.length - 1) {
        moveTo(dash, x + gap);
        x += dashWidth + gap * 2;
      }
    });
    // Pieces not in this step fade out where they stand; hyphens with no gap to
    // sit in fade out over the root.
    for (const [id, el] of pieces) if (!step.order.includes(id)) el.style.opacity = '0';
    for (let i = step.order.length - 1; i < dashes.length; i++) {
      dashes[i].style.opacity = '0';
      dashes[i].style.transform = `translateX(${(word.clientWidth - dashWidth) / 2}px)`;
    }
  };

  const show = (next: number): void => {
    const step = steps[next];
    place(step);
    if (glossEl.textContent !== step.gloss) {
      glossEl.style.opacity = '0';
      window.setTimeout(() => {
        glossEl.textContent = step.gloss;
        glossEl.style.opacity = '1';
      }, reduce ? 0 : 280);
    }
    index = next;
  };

  const tick = (): void => {
    if (!root.isConnected) return;
    if (onScreen && !document.hidden && !isAsleep(root)) show((index + 1) % steps.length);
    window.setTimeout(tick, HOLD_MS);
  };

  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
  }).observe(root);
  new ResizeObserver(() => place(steps[index])).observe(word);

  show(index);
  if (!reduce) window.setTimeout(tick, HOLD_MS);
}

mountAll('[data-live-ba-gil]', mount);
