// Glossary data + definition rendering — shared by the two surfaces that show a
// definition: the desktop draggable windows (definitions.ts) and the mobile
// top-nav panel (nav.ts). Both render the same fragment, so the two views cannot
// drift.
//
// The term shortcode ships the whole set once per page as
// <script type="application/json" data-glossary="<set>">. Lookup is by key at
// click time rather than from an attribute on the tapped word, because a
// definition can cross-reference other terms and those refs live inside an
// already-open card, where there is no trigger element to read.
//
// Definition syntax (see data/glossary/*.yaml):
//   [[key|display text]]   a cross-reference — rendered as a click target
//   **bold**               emphasis
// Anything else is literal text. Both are parsed here, never with innerHTML, so
// glossary copy can never inject markup.
//
// An entry renders as: the definition sentence, then its figure (a micro-diagram
// — see def-figures.ts), then its word lists. Word lists pick their own shape:
// a single unlabelled group reads best as chips, while two or more labelled
// groups are a comparison and read as a table.
import { renderFigure } from './def-figures';
import type { Figure } from './def-figures';

export interface WordGroup {
  label?: string;
  words: string[];
}

export interface TermGroup {
  label?: string;
  terms: string[];
}

export interface GlossaryEntry {
  term: string;
  definition: string;
  figure?: Figure;
  wordgroups?: WordGroup[];
  termgroups?: TermGroup[];
}

export type Glossary = Record<string, GlossaryEntry>;

export const DEFAULT_SET = 'basic-logic';

// Keyed by set name. The YAML is one source of truth per set, so a set parsed on
// one page is valid on the next; this survives hx-boost swaps deliberately.
// Empty results are NOT cached — a page with no terms must not poison the cache
// for a later page that has them.
const cache = new Map<string, Glossary>();

export function loadGlossary(set: string): Glossary {
  const hit = cache.get(set);
  if (hit) return hit;
  const holder = document.querySelector<HTMLScriptElement>(`[data-glossary="${set}"]`);
  let data: Glossary = {};
  if (holder?.textContent) {
    try {
      data = JSON.parse(holder.textContent) as Glossary;
    } catch {
      data = {};
    }
  }
  if (Object.keys(data).length > 0) cache.set(set, data);
  return data;
}

export function lookup(set: string, key: string): GlossaryEntry | null {
  return loadGlossary(set)[key] ?? null;
}

// [[key|display]] or **bold**, whichever comes first.
const TOKEN = /\[\[([a-z0-9-]+)\|([^\]]+)\]\]|\*\*([^*]+)\*\*/g;

function definitionBody(definition: string): HTMLParagraphElement {
  const p = document.createElement('p');
  p.className = 'def-body';
  let last = 0;
  TOKEN.lastIndex = 0;
  let match: RegExpExecArray | null = TOKEN.exec(definition);
  while (match !== null) {
    if (match.index > last) {
      p.appendChild(document.createTextNode(definition.slice(last, match.index)));
    }
    const refKey = match[1];
    const refText = match[2];
    const bold = match[3];
    if (refKey && refText) {
      const ref = document.createElement('button');
      ref.type = 'button';
      ref.className = 'def-ref';
      ref.dataset.termRef = refKey;
      ref.textContent = refText;
      p.appendChild(ref);
    } else if (bold) {
      const strong = document.createElement('strong');
      strong.textContent = bold;
      p.appendChild(strong);
    }
    last = match.index + match[0].length;
    match = TOKEN.exec(definition);
  }
  if (last < definition.length) {
    p.appendChild(document.createTextNode(definition.slice(last)));
  }
  return p;
}

function wordGroup(group: WordGroup): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'def-words';
  if (group.label) {
    const label = document.createElement('p');
    label.className = 'def-words__label';
    label.textContent = group.label;
    wrap.appendChild(label);
  }
  const list = document.createElement('ul');
  list.className = 'def-words__list';
  for (const word of group.words) {
    const item = document.createElement('li');
    item.textContent = word;
    list.appendChild(item);
  }
  wrap.appendChild(list);
  return wrap;
}

interface Column<T> {
  label?: string;
  items: T[];
}

// Word lists and term lists are the same table: one column per group, as many
// rows as the longest column, blanks where a column runs out. Only what a cell
// contains differs, so that is the parameter.
function columnTable<T>(
  className: string,
  columns: Column<T>[],
  fillCell: (cell: HTMLTableCellElement, item: T) => void,
): HTMLTableElement {
  const table = document.createElement('table');
  table.className = className;

  if (columns.some((column) => column.label)) {
    const head = document.createElement('thead');
    const headRow = document.createElement('tr');
    for (const column of columns) {
      const heading = document.createElement('th');
      heading.scope = 'col';
      heading.textContent = column.label ?? '';
      headRow.appendChild(heading);
    }
    head.appendChild(headRow);
    table.appendChild(head);
  }

  const body = document.createElement('tbody');
  const rowCount = Math.max(...columns.map((column) => column.items.length));
  for (let row = 0; row < rowCount; row += 1) {
    const tr = document.createElement('tr');
    for (const column of columns) {
      const cell = document.createElement('td');
      const item = column.items[row];
      if (item !== undefined) fillCell(cell, item);
      tr.appendChild(cell);
    }
    body.appendChild(tr);
  }
  table.appendChild(body);
  return table;
}

// Two or more labelled groups are a comparison — side-by-side columns say
// "these line up against each other" in a way two chip clouds cannot.
function wordTable(groups: WordGroup[]): HTMLElement {
  return columnTable(
    'def-table',
    groups.map((group) => ({ label: group.label, items: group.words })),
    (cell, word) => {
      cell.textContent = word;
    },
  );
}

// A table of OTHER terms, each cell a way in to that definition. Used by
// non-inferential passage, where the eight kinds are the content of the entry —
// listing them as plain words would be naming eight things a reader then has to
// go and find.
function termTable(groups: TermGroup[], set: string): HTMLElement {
  const glossary = loadGlossary(set);
  return columnTable(
    'def-table def-table--terms',
    groups.map((group) => ({ label: group.label, items: group.terms })),
    (cell, key) => {
      const target = glossary[key];
      if (!target) return;
      const link = document.createElement('button');
      link.type = 'button';
      link.className = 'def-ref';
      link.dataset.termRef = key;
      link.textContent = target.term;
      cell.appendChild(link);
    },
  );
}

// The definition sentence, its figure, then its lists.
export function renderDefinition(entry: GlossaryEntry, set: string = DEFAULT_SET): DocumentFragment {
  const frag = document.createDocumentFragment();
  frag.appendChild(definitionBody(entry.definition));

  if (entry.figure) {
    const figure = renderFigure(entry.figure);
    if (figure) frag.appendChild(figure);
  }

  const groups = entry.wordgroups ?? [];
  if (groups.length > 1 && groups.every((g) => g.label)) {
    frag.appendChild(wordTable(groups));
  } else {
    for (const group of groups) frag.appendChild(wordGroup(group));
  }

  if (entry.termgroups?.length) frag.appendChild(termTable(entry.termgroups, set));
  return frag;
}

// Mobile: fill the top-nav panel in place. Called both by the trigger word in
// the prose and by a cross-reference tapped inside the panel — the "replace"
// effect is just calling this again with the new key.
export function fillPanel(content: HTMLElement, key: string, set: string): void {
  const label = content.querySelector<HTMLElement>('[data-definition-label]');
  const body = content.querySelector<HTMLElement>('[data-definition-body]');
  if (!body) return;
  const entry = lookup(set, key);
  if (label) label.textContent = entry ? entry.term : '';
  body.dataset.termSet = set;
  body.textContent = '';
  if (entry) body.appendChild(renderDefinition(entry, set));
}
