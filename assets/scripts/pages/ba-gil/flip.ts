// The inversion demo (layouts/shortcodes/ba-gil/perversion.html). Static, the page
// shows Ba-Mon-Ab and Ab-Mon-Ba on two lines. Here the second line is hidden and a
// button swaps the first line's outer pieces in place, sliding them past each other
// (FLIP: measure, reorder the DOM, then animate from the old positions).

const REVEAL_MS = 450;

function swapEnds(word: HTMLElement): void {
  const parts = Array.from(word.children) as HTMLElement[];
  if (parts.length < 2) return;
  const before = new Map(parts.map((part) => [part, part.getBoundingClientRect().left]));

  const first = parts[0];
  const last = parts[parts.length - 1];
  word.insertBefore(last, first);
  word.append(first);
  for (const part of [first, last]) part.classList.toggle('is-inverted');

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (const part of parts) {
    const shift = (before.get(part) ?? 0) - part.getBoundingClientRect().left;
    if (!shift) continue;
    part.style.transition = 'none';
    part.style.transform = `translateX(${shift}px)`;
  }
  void word.offsetWidth; // commit the start positions before animating back to zero
  for (const part of parts) {
    part.style.transition = '';
    part.style.transform = '';
  }
}

export function initFlip(): void {
  const root = document.querySelector<HTMLElement>('[data-ba-gil-flip]');
  const original = root?.querySelector<HTMLElement>('[data-flip-line="0"]');
  const inverted = root?.querySelector<HTMLElement>('[data-flip-line="1"]');
  const button = root?.querySelector<HTMLButtonElement>('[data-flip-button]');
  const word = original?.querySelector<HTMLElement>('.bagil-gloss-word');
  const meaning = original?.querySelector<HTMLElement>('.bagil-flip-meaning strong');
  if (!root || !original || !inverted || !button || !word || !meaning || root.dataset.mounted) return;
  root.dataset.mounted = 'true';

  let isInverted = false;
  inverted.hidden = true;
  meaning.parentElement?.setAttribute('aria-live', 'polite');
  button.hidden = false;
  button.addEventListener('click', () => {
    isInverted = !isInverted;
    swapEnds(word);
    button.textContent = isInverted ? 'Put it back' : 'Invert it';
    // Let the pieces land before the meaning changes, so cause reads before effect.
    window.setTimeout(() => {
      meaning.textContent = (isInverted ? inverted : original).dataset.meaning ?? '';
    }, REVEAL_MS / 2);
  });
}
