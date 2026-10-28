// The number converter (layouts/shortcodes/ba-gil/numbers.html): type 255 to get
// #tt, or #tt to get 255. Digits are the alphabet itself, b = 0 … t = 15, each said
// as "chi" plus the letter.

import { normalize, readNumber } from './data';
import type { BaGilData } from './data';

function writeNumber(value: number, letters: string[]): string {
  let digits = '';
  let remaining = value;
  do {
    digits = letters[remaining % letters.length] + digits;
    remaining = Math.floor(remaining / letters.length);
  } while (remaining > 0);
  return digits;
}

const say = (digits: string): string =>
  Array.from(digits)
    .map((digit) => `chi${digit}`)
    .join(' ');

function convert(raw: string, data: BaGilData): string {
  const text = normalize(raw.trim());
  if (!text) return '';
  if (/^\d+$/.test(text)) {
    const value = Number(text);
    if (!Number.isSafeInteger(value)) return 'That number is too big to convert here.';
    const digits = writeNumber(value, data.letters);
    return `${value} is #${digits}, said “${say(digits)}”.`;
  }
  const digits = text.replace(/^#/, '');
  const value = readNumber(digits, data.letters);
  if (value === null) return `Type a number like 255, or letters like #tt.`;
  return `#${digits}, said “${say(digits)}”, is ${value}.`;
}

export function initNumbers(data: BaGilData): void {
  const root = document.querySelector<HTMLElement>('[data-ba-gil-numbers]');
  const ui = root?.querySelector<HTMLElement>('[data-numbers-ui]');
  const input = root?.querySelector<HTMLInputElement>('[data-numbers-input]');
  const output = root?.querySelector<HTMLElement>('[data-numbers-output]');
  if (!root || !ui || !input || !output || root.dataset.mounted) return;
  root.dataset.mounted = 'true';

  input.addEventListener('input', () => {
    output.textContent = convert(input.value, data);
  });
  ui.hidden = false;
}
