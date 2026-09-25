// Chunking toy: split a document into chunks of N sentences, score each chunk
// against the question by shared keywords (normalized by length), and show
// whether the best chunk carries every sentence the answer needs.

const BURIED_RATIO = 3;

function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9-]+/g) ?? [];
}

// Crude stemming, so "connects" meets "connect".
function stem(word: string): string {
  return word.replace(/(ing|ed|es|s)$/, '');
}

export function initChunks(root: HTMLElement): void {
  const slider = root.querySelector<HTMLInputElement>('#mli-chk-r');
  const label = root.querySelector<HTMLElement>('#mli-chk-v');
  const doc = root.querySelector<HTMLElement>('#mli-chk-doc');
  const verdict = root.querySelector<HTMLElement>('#mli-chk-verdict');
  const questionButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-needs]')];
  if (!slider || !label || !doc || !verdict || !questionButtons.length) return;

  const sentences: string[] = JSON.parse(root.dataset.sentences ?? '[]');
  const sizes = (root.dataset.sizes ?? '1').split(',').map(Number);
  const stopwords = new Set((root.dataset.stopwords ?? '').split(' '));
  const keyTerms = (text: string): Set<string> => new Set(words(text).filter((word) => !stopwords.has(word)).map(stem));
  let question = questionButtons[0];

  const render = (): void => {
    const size = sizes[Number(slider.value)] ?? 1;
    const needs = (question.dataset.needs ?? '').split(',').map(Number);
    const questionTerms = keyTerms(question.textContent ?? '');
    const chunks: number[][] = [];
    for (let start = 0; start < sentences.length; start += size) {
      chunks.push(sentences.slice(start, start + size).map((_, offset) => start + offset));
    }
    const scores = chunks.map((chunk) => {
      const text = chunk.map((i) => sentences[i]).join(' ');
      const chunkTerms = keyTerms(text);
      const matches = [...questionTerms].filter((term) => chunkTerms.has(term)).length;
      return matches / Math.sqrt(words(text).length);
    });
    const bestIndex = scores.indexOf(Math.max(...scores));
    const best = chunks[bestIndex];

    doc.replaceChildren(...chunks.map((chunk, i) => {
      const box = document.createElement('span');
      box.className = i === bestIndex ? 'mli-chk-chunk is-hit' : 'mli-chk-chunk';
      for (const sentenceIndex of chunk) {
        const sentence = document.createElement('span');
        sentence.className = needs.includes(sentenceIndex) ? 'mli-chk-s is-answer' : 'mli-chk-s';
        sentence.textContent = `${sentences[sentenceIndex]} `;
        box.append(sentence);
      }
      return box;
    }));

    const found = needs.filter((i) => best.includes(i)).length;
    const sentWords = words(best.map((i) => sentences[i]).join(' ')).length;
    const neededWords = words(needs.map((i) => sentences[i]).join(' ')).length;
    label.textContent = String(size);
    slider.setAttribute('aria-valuetext', String(size));
    verdict.classList.toggle('is-bad', found < needs.length);
    if (found === 0) verdict.textContent = 'Missed: the retrieved chunk doesn’t contain the answer at all.';
    else if (found < needs.length) verdict.textContent = 'Half an answer: the rest of it landed in a different chunk, which wasn’t retrieved.';
    else if (sentWords > neededWords * BURIED_RATIO) verdict.textContent = `Found, but buried: the model reads ${sentWords} words to use ${neededWords}.`;
    else verdict.textContent = `Found, with its context: ${sentWords} words sent to the model.`;
  };

  for (const button of questionButtons) {
    button.addEventListener('click', () => {
      question = button;
      for (const other of questionButtons) {
        other.classList.toggle('is-on', other === button);
        other.setAttribute('aria-pressed', String(other === button));
      }
      render();
    });
  }
  slider.addEventListener('input', render);
  render();
}
