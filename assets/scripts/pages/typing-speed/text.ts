// Text for the typing test: making any passage typeable, pulling prose out of
// an article's Markdown, random word lines, and where its words and sentences
// fall. main.ts renders from these ranges.

export interface Range {
  start: number;
  end: number; // exclusive
}

// What a plain keyboard can't type becomes what it can: curly quotes, dashes,
// ellipses, accents. Anything else outside printable ASCII is dropped.
const TYPEABLE: Array<[RegExp, string]> = [
  [/[‘’‚‛′`]/g, "'"],
  [/[“”„‟″]/g, '"'],
  [/[‐‑‒–—―−]/g, '-'],
  [/…/g, '...'],
  [/×/g, 'x'],
  [/÷/g, '/'],
  [/[•·]/g, '-'],
];

export function typeable(text: string): string {
  let out = text.normalize('NFKD').replace(/[̀-ͯ]/g, '');
  for (const [pattern, plain] of TYPEABLE) out = out.replace(pattern, plain);
  return out
    .replace(/[^\x20-\x7e\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// An article's prose paragraphs from its Markdown: headings, lists, tables,
// code, quotes-as-blocks and shortcodes go; inline links, terms and emphasis
// keep their words. Very short leftovers (captions, labels) are skipped.
const MIN_WORDS = 8;
const SKIP_BLOCK = /^(\{\{|#|\||<|```|~~~|-{3,}|!\[|\s*[-*+] |\s*\d+\. )/;

export function articleParagraphs(markdown: string): string[] {
  const paragraphs: string[] = [];
  let isInFence = false;
  for (const block of markdown.split(/\n\s*\n/)) {
    const trimmed = block.trim();
    const fences = (trimmed.match(/^(```|~~~)/gm) || []).length;
    if (isInFence || fences) {
      if (fences % 2) isInFence = !isInFence;
      continue;
    }
    if (!trimmed || SKIP_BLOCK.test(trimmed)) continue;
    const prose = typeable(
      trimmed
        .replace(/^>\s?/gm, '')
        .replace(/\{\{<\s*term\s+"[^"]*"\s*>\}\}([\s\S]*?)\{\{<\s*\/term\s*>\}\}/g, '$1')
        .replace(/\{\{[<%][\s\S]*?[>%]\}\}/g, '')
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/`([^`]*)`/g, '$1')
        .replace(/<[^>]+>/g, '')
        .replace(/(\*\*|__)(.+?)\1/g, '$2')
        .replace(/(^|[^\w*])[*_](\S(?:.*?\S)?)[*_](?!\w)/g, '$1$2'),
    );
    if (prose.split(' ').length >= MIN_WORDS) paragraphs.push(prose);
  }
  return paragraphs;
}

// Random words. Punctuation reads like sentences: a capital after a full stop,
// a comma now and then. Numbers stand in for the odd word. Rates are by feel.
export function randomWords(list: string[], count: number, punctuation: boolean, numbers: boolean, startsSentence: boolean): string {
  const words: string[] = [];
  let isSentenceStart = startsSentence;
  for (let i = 0; i < count; i++) {
    let word = numbers && Math.random() < 0.1 ? String(1 + Math.floor(Math.random() * 2026)) : list[Math.floor(Math.random() * list.length)];
    if (punctuation) {
      if (isSentenceStart) word = word.charAt(0).toUpperCase() + word.slice(1);
      const roll = Math.random();
      isSentenceStart = roll < 0.12;
      if (roll < 0.1) word += '.';
      else if (roll < 0.12) word += '?';
      else if (roll < 0.2) word += ',';
    }
    words.push(word);
  }
  return words.join(' ');
}

// Words are the runs between spaces. A word's range ends before its space.
export function wordRanges(text: string, from = 0): Range[] {
  const ranges: Range[] = [];
  const pattern = /\S+/g;
  pattern.lastIndex = from;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) ranges.push({ start: match.index, end: match.index + match[0].length });
  return ranges;
}

// Sentences end after . ? or ! (and a closing quote). A line of random words
// with no punctuation has none, so it's cut into groups of a dozen words to
// give the board something to light up.
const WORDS_PER_PLAIN_SENTENCE = 12;

export function sentenceRanges(text: string, words: Range[]): Range[] {
  const ranges: Range[] = [];
  let start = words.length ? words[0].start : 0;
  let count = 0;
  const hasStops = /[.?!]/.test(text);
  words.forEach((word, i) => {
    count++;
    const isEnd = hasStops ? /[.?!]["')]*$/.test(text.slice(word.start, word.end)) : count === WORDS_PER_PLAIN_SENTENCE;
    if (!isEnd && i < words.length - 1) return;
    ranges.push({ start, end: word.end });
    count = 0;
    if (words[i + 1]) start = words[i + 1].start;
  });
  return ranges;
}
