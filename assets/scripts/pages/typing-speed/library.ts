// The passages the typing test can load: articles and books, published as
// JSON by layouts/partials/typing-speed/library.html and fetched only when
// picked, plus pasted or uploaded text. Each source fills the pickers in the
// shortcode (layouts/shortcodes/typing-speed/test.html) and hands main.ts a
// passage: the text to type. The pickers already say what it is, so there's
// no credit line.

import { articleParagraphs, typeable } from './text';

export interface Passage {
  text: string;
  key: string; // which personal best it counts toward
}

interface BookInfo {
  slug: string;
  title: string;
  author: string;
  translator: string;
  source: string;
  sections: string[];
  url: string;
}

export interface Library {
  articles: string;
  articleTitles: string[];
  books: BookInfo[];
}

interface Article {
  title: string;
  url: string;
  markdown: string;
}

interface Book {
  sections: Array<{ title: string; paragraphs: string[] }>;
}

const cache = new Map<string, Promise<unknown>>();

function load<T>(url: string): Promise<T> {
  if (!cache.has(url)) {
    cache.set(
      url,
      fetch(url).then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json();
      }),
    );
  }
  return cache.get(url) as Promise<T>;
}

function fillOptions(select: HTMLSelectElement, labels: string[]): void {
  select.textContent = '';
  labels.forEach((label, i) => select.add(new Option(label, String(i))));
}

// "Whole thing" first, then each paragraph by its opening words.
function partLabels(paragraphs: string[], whole: string): string[] {
  return [whole, ...paragraphs.map((p, i) => `Paragraph ${i + 1}: ${p.split(' ').slice(0, 6).join(' ')}…`)];
}

function chosenText(paragraphs: string[], part: HTMLSelectElement): string {
  const index = Number(part.value);
  return index ? paragraphs[index - 1] : paragraphs.join(' ');
}

export function readLibrary(root: HTMLElement): Library | null {
  try {
    const library = JSON.parse(root.dataset.tsLibrary || '') as Library;
    return library && Array.isArray(library.books) ? library : null;
  } catch {
    return null;
  }
}

// Wires one source's pickers. `onPick` gets a passage whenever the choice
// changes, and `onNote` a status line while something loads or fails.
export function wireArticles(root: HTMLElement, library: Library, onPick: (passage: Passage) => void, onNote: (note: string) => void): () => void {
  const article = root.querySelector<HTMLSelectElement>('[data-ts-article]');
  const part = root.querySelector<HTMLSelectElement>('[data-ts-article-part]');
  if (!article || !part) return () => {};
  let paragraphs: string[] = [];
  let current: Article | null = null;

  const pick = (): void => {
    if (!current || !paragraphs.length) return;
    onPick({ text: chosenText(paragraphs, part), key: 'passage' });
  };
  const choose = (): void => {
    onNote('Loading the article...');
    load<Article[]>(library.articles)
      .then((articles) => {
        current = articles[Number(article.value)] || null;
        paragraphs = current ? articleParagraphs(current.markdown) : [];
        fillOptions(part, partLabels(paragraphs, 'The whole article'));
        pick();
      })
      .catch(() => onNote("Couldn't load the articles. Try again in a moment."));
  };
  article.addEventListener('change', choose);
  part.addEventListener('change', pick);
  return choose;
}

export function wireBooks(root: HTMLElement, library: Library, onPick: (passage: Passage) => void, onNote: (note: string) => void): () => void {
  const book = root.querySelector<HTMLSelectElement>('[data-ts-book]');
  const section = root.querySelector<HTMLSelectElement>('[data-ts-book-section]');
  const part = root.querySelector<HTMLSelectElement>('[data-ts-book-part]');
  if (!book || !section || !part) return () => {};
  let paragraphs: string[] = [];

  const info = (): BookInfo | undefined => library.books[Number(book.value)];
  const pick = (): void => {
    if (paragraphs.length) onPick({ text: chosenText(paragraphs, part), key: 'passage' });
  };
  const chooseSection = (): void => {
    const chosen = info();
    if (!chosen) return;
    onNote('Loading the book...');
    load<Book>(chosen.url)
      .then((data) => {
        paragraphs = (data.sections[Number(section.value)]?.paragraphs || []).map(typeable).filter(Boolean);
        fillOptions(part, partLabels(paragraphs, 'The whole section'));
        pick();
      })
      .catch(() => onNote("Couldn't load that book. Try again in a moment."));
  };
  const chooseBook = (): void => {
    fillOptions(section, info()?.sections || []);
    chooseSection();
  };
  book.addEventListener('change', chooseBook);
  section.addEventListener('change', chooseSection);
  part.addEventListener('change', pick);
  return chooseBook;
}

const MAX_OWN_CHARS = 20000;

export function wireOwn(root: HTMLElement, onPick: (passage: Passage) => void, onNote: (note: string) => void): void {
  const area = root.querySelector<HTMLTextAreaElement>('[data-ts-own-text]');
  const file = root.querySelector<HTMLInputElement>('[data-ts-own-file]');
  const use = root.querySelector<HTMLButtonElement>('[data-ts-own-use]');
  if (!area || !file || !use) return;
  use.addEventListener('click', () => {
    const text = typeable(area.value).slice(0, MAX_OWN_CHARS);
    if (!text) {
      onNote('Paste some text or load a file first.');
      return;
    }
    onPick({ text, key: 'passage' });
  });
  // A picked or dropped file fills the box and starts at once.
  const readFile = (chosen: File | undefined): void => {
    if (!chosen) return;
    chosen
      .text()
      .then((text) => {
        area.value = text.slice(0, MAX_OWN_CHARS);
        use.click();
      })
      .catch(() => onNote("Couldn't read that file."));
  };
  file.addEventListener('change', () => readFile(file.files?.[0]));
  area.addEventListener('dragover', (event) => {
    event.preventDefault();
    area.classList.add('is-drop');
  });
  area.addEventListener('dragleave', () => area.classList.remove('is-drop'));
  area.addEventListener('drop', (event) => {
    const dropped = event.dataTransfer?.files[0];
    area.classList.remove('is-drop');
    if (!dropped) return; // dropped text lands in the box as usual
    event.preventDefault();
    readFile(dropped);
  });
}
