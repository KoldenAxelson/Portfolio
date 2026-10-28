// The data every Ba-Gil widget reads: the JSON block layouts/partials/ba-gil/assets.html
// emits from data/ba-gil/*.yaml. Its lexicon is the one the page's static glosses
// were rendered from (layouts/partials/func/ba-gil-lexicon.html), so the live widgets
// and the printed page can't disagree.

export interface LexiconEntry {
  form: string;
  gloss: string;
  shape: string;
  frame?: string;
  note?: string;
  respell?: boolean;
}

export interface BaGilData {
  letters: string[];
  vowels: string[];
  lexicon: Record<string, LexiconEntry>;
  meanings: Record<string, string>;
}

export function readData(): BaGilData | null {
  const block = document.querySelector<HTMLScriptElement>('script[data-ba-gil-data]');
  if (!block?.textContent) return null;
  return JSON.parse(block.textContent) as BaGilData;
}

// Ba-Gil text is compared lowercase and in composed form, so a ü typed as u plus a
// combining diaeresis still matches the ü in the alphabet.
export const normalize = (text: string): string => text.normalize('NFC').toLowerCase();

// A number is a # followed by letters, each letter a base-16 digit worth its
// position in the alphabet (b = 0 … t = 15).
export function readNumber(digits: string, letters: string[]): number | null {
  let value = 0;
  for (const digit of Array.from(digits)) {
    const digitValue = letters.indexOf(digit);
    if (digitValue < 0) return null;
    value = value * letters.length + digitValue;
  }
  return digits ? value : null;
}
