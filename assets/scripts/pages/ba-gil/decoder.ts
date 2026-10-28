// The word decoder on /misc/ba-gil/ (layouts/shortcodes/ba-gil/builder.html): type a
// compound, get it back as an interlinear gloss. Renders the same markup and class
// names as the static glosses (layouts/partials/ba-gil/gloss.html), so typed and
// printed examples look identical.
//
// The one rule the static glosses don't apply is inversion ("perversion"): a CV
// prefix in a word's last position, or a VC suffix in its first, flips its meaning.

import { normalize, readNumber } from './data';
import type { BaGilData } from './data';

type Role = 'root' | 'prefix' | 'suffix' | 'number' | 'unknown';

interface PartReading {
  text: string;
  role: Role;
  gloss: string;
  isInverted: boolean;
  isRespell: boolean;
  problems: string[];
}

const ROLE_BY_SHAPE: Record<string, Role> = { CVC: 'root', CV: 'prefix', VC: 'suffix' };

function shapeOf(part: string, vowels: string[]): string {
  return Array.from(part)
    .map((letter) => (vowels.includes(letter) ? 'V' : 'C'))
    .join('');
}

function readPart(part: string, position: number, partCount: number, data: BaGilData): PartReading {
  const key = normalize(part);
  if (key.startsWith('#')) {
    const value = readNumber(key.slice(1), data.letters);
    return {
      text: part,
      role: 'number',
      gloss: value === null ? '?' : String(value),
      isInverted: false,
      isRespell: false,
      problems: value === null ? ['a number is # followed by letters from the alphabet'] : [],
    };
  }

  const entry = data.lexicon[key];
  const role = ROLE_BY_SHAPE[entry?.shape ?? shapeOf(key, data.vowels)] ?? 'unknown';
  const isCompound = partCount > 1;
  const isInverted =
    isCompound && ((role === 'prefix' && position === partCount - 1) || (role === 'suffix' && position === 0));

  const problems: string[] = [];
  const strangers = Array.from(new Set(Array.from(key).filter((letter) => !data.letters.includes(letter))));
  if (strangers.length && !entry?.respell) problems.push(`${strangers.join(', ')} ${strangers.length > 1 ? "aren't among" : "isn't one of"} the ${data.letters.length} letters`);
  if (role === 'unknown') problems.push('not a CVC, CV or VC piece; join pieces with hyphens');
  else if (!entry) problems.push('not in the lexicon yet');

  return {
    text: part,
    role,
    gloss: entry ? (isInverted ? `${entry.gloss}, inverted` : entry.gloss) : '?',
    isInverted,
    isRespell: Boolean(entry?.respell),
    problems,
  };
}

function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderPart(reading: PartReading): HTMLElement {
  const part = el('span', `bagil-gloss-part${reading.isInverted ? ' is-inverted' : ''}`);
  part.append(
    el('span', `bagil-morph is-${reading.role}${reading.isRespell ? ' is-respell' : ''}`, reading.text),
    el('span', 'bagil-gloss', reading.gloss),
  );
  return part;
}

function render(input: string, output: HTMLElement, data: BaGilData): void {
  output.replaceChildren();
  const words = input.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return;

  const line = el('span', 'bagil-gloss-line');
  const notes: string[] = [];
  for (const word of words) {
    const parts = word.split('-').filter(Boolean);
    const wordNode = el('span', 'bagil-gloss-word');
    parts.forEach((part, position) => {
      const reading = readPart(part, position, parts.length, data);
      wordNode.append(renderPart(reading));
      for (const problem of reading.problems) notes.push(`${reading.text}: ${problem}.`);
      if (reading.isRespell) notes.push(`${reading.text}: spelling pending; it uses a letter outside the alphabet.`);
      if (reading.isInverted) notes.push(`${reading.text} is in the wrong position for its shape, so its meaning inverts.`);
    });
    line.append(wordNode);
  }
  output.append(line);

  const meaning = data.meanings[normalize(words.join(' '))];
  if (meaning) {
    const summary = el('p', '');
    summary.append('Means ', el('strong', '', meaning), '.');
    output.append(summary);
  }
  for (const note of notes) output.append(el('p', '', note));
}

export function initDecoder(data: BaGilData): void {
  const root = document.querySelector<HTMLElement>('[data-ba-gil-decoder]');
  const ui = root?.querySelector<HTMLElement>('[data-decoder-ui]');
  const input = root?.querySelector<HTMLInputElement>('[data-decoder-input]');
  const output = root?.querySelector<HTMLElement>('[data-decoder-output]');
  if (!root || !ui || !input || !output || root.dataset.mounted) return;
  root.dataset.mounted = 'true';

  input.addEventListener('input', () => render(input.value, output, data));
  root.addEventListener('click', (e) => {
    const preset = (e.target as HTMLElement).closest<HTMLElement>('[data-decoder-preset]');
    if (!preset?.dataset.decoderPreset) return;
    input.value = preset.dataset.decoderPreset;
    render(input.value, output, data);
  });
  ui.hidden = false;
  input.value = input.placeholder;
  render(input.value, output, data);
}
