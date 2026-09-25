// Search toy: keyword ranking (shared words), vector ranking (distance on a
// hand-placed 2D map) and hybrid (reciprocal rank fusion of the two). Docs
// and queries come from data/ml/search-map.yaml.

import { PLOT_HEIGHT as HEIGHT, PLOT_WIDTH as WIDTH, svgElement } from './plot';

interface Doc {
  text: string;
  at: [number, number];
}

const LABEL_CHARS = 22;
const RIGHT_LABEL_FROM = 0.65;

function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9'-]+/g) ?? [];
}

export function initSearch(root: HTMLElement): void {
  const map = root.querySelector<SVGSVGElement>('#mli-srch-map');
  const output = root.querySelector<HTMLElement>('#mli-srch-out');
  const queryButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-at]')];
  const modeButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-mode]')];
  if (!map || !output || !queryButtons.length || !modeButtons.length) return;

  const docs: Doc[] = JSON.parse(root.dataset.docs ?? '[]');
  const stopwords = new Set((root.dataset.stopwords ?? '').split(' '));
  const rrfK = Number(root.dataset.rrfK);
  const topK = Number(root.dataset.topK);
  let query = queryButtons[0];
  let mode = modeButtons.find((button) => button.classList.contains('is-on'))?.dataset.mode ?? 'vector';

  const keywordRanking = (text: string): number[] => {
    const queryWords = new Set(words(text).filter((word) => !stopwords.has(word)));
    return docs
      .map((doc, i) => ({ i, score: words(doc.text).filter((word) => queryWords.has(word)).length }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.i);
  };

  const vectorRanking = (at: number[]): number[] =>
    docs.map((doc, i) => ({ i, distance: Math.hypot(doc.at[0] - at[0], doc.at[1] - at[1]) }))
      .sort((a, b) => a.distance - b.distance)
      .map((entry) => entry.i);

  // Reciprocal rank fusion: each list adds 1 / (k + rank) to a document's score.
  const fuse = (...rankings: number[][]): number[] => {
    const scores = new Map<number, number>();
    for (const ranking of rankings) {
      ranking.forEach((docIndex, rank) => scores.set(docIndex, (scores.get(docIndex) ?? 0) + 1 / (rrfK + rank + 1)));
    }
    return [...scores.entries()].sort((a, b) => b[1] - a[1]).map(([docIndex]) => docIndex);
  };

  const render = (): void => {
    const at = (query.dataset.at ?? '0.5,0.5').split(',').map(Number);
    const keyword = keywordRanking(query.textContent ?? '');
    const vector = vectorRanking(at);
    const ranking = { keyword, vector, hybrid: fuse(keyword, vector) }[mode] ?? vector;
    const top = ranking.slice(0, topK);
    const toScreen = (point: number[]): [number, number] => [point[0] * WIDTH, HEIGHT - point[1] * HEIGHT];
    const [queryX, queryY] = toScreen(at);

    const lines = top.map((docIndex) => {
      const [x, y] = toScreen(docs[docIndex].at);
      return svgElement('line', { x1: queryX, y1: queryY, x2: x, y2: y, class: 'mli-srch-link' });
    });
    const marks = docs.flatMap((doc, i) => {
      const [x, y] = toScreen(doc.at);
      const isTop = top.includes(i);
      // Labels on the right half hang left, so they don't run off the map.
      const isRightHalf = doc.at[0] > RIGHT_LABEL_FROM;
      const label = svgElement('text', { x: isRightHalf ? x - 6 : x + 6, y: y + 3, 'text-anchor': isRightHalf ? 'end' : 'start', class: isTop ? 'mli-srch-label is-top' : 'mli-srch-label' });
      label.textContent = doc.text.length > LABEL_CHARS ? `${doc.text.slice(0, LABEL_CHARS - 1)}…` : doc.text;
      return [svgElement('circle', { cx: x, cy: y, r: isTop ? 5 : 3.5, class: isTop ? 'mli-srch-doc is-top' : 'mli-srch-doc' }), label];
    });
    const star = svgElement('circle', { cx: queryX, cy: queryY, r: 6, class: 'mli-srch-query' });
    map.replaceChildren(...lines, ...marks, star);

    output.replaceChildren(...top.map((docIndex) => {
      const item = document.createElement('li');
      item.textContent = docs[docIndex].text;
      return item;
    }));
    if (!top.length) output.replaceChildren(Object.assign(document.createElement('li'), { textContent: 'No document shares a word with the query.' }));
  };

  const bindGroup = (buttons: HTMLButtonElement[], onPick: (button: HTMLButtonElement) => void): void => {
    for (const button of buttons) {
      button.addEventListener('click', () => {
        onPick(button);
        for (const other of buttons) {
          other.classList.toggle('is-on', other === button);
          other.setAttribute('aria-pressed', String(other === button));
        }
        render();
      });
    }
  };
  bindGroup(queryButtons, (button) => { query = button; });
  bindGroup(modeButtons, (button) => { mode = button.dataset.mode ?? mode; });
  render();
}
