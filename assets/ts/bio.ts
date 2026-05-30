// Shared helpers for the bio "typewriter" indicators (sidebar.ts + nav.ts).

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export const pickRandom = <T>(arr: T[] | undefined): T | null => {
  if (!arr || !arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
};

// Parse the JSON array in [data-bio-messages]; malformed/missing data is
// non-fatal, so the parse error is swallowed to "no messages".
export const readMessages = (indicator: Element | null): string[] => {
  if (!indicator) return [];
  try {
    const parsed = JSON.parse(indicator.getAttribute('data-bio-messages') || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// Per-character typing delay (ms): longer pause after punctuation, slight jitter otherwise.
const PUNCT_DELAY_MS = 140;
const CHAR_DELAY_MIN_MS = 28;
const CHAR_DELAY_JITTER_MS = 24;

export const charDelay = (ch: string): number =>
  /[.!?,;:]/.test(ch) ? PUNCT_DELAY_MS : CHAR_DELAY_MIN_MS + Math.random() * CHAR_DELAY_JITTER_MS;
