// Temperature toy: softmax over fixed candidate scores, divided by the
// temperature first. Temperature 0 is the limit case: always the top word.
// Candidates come from data/ml/next-token.yaml.

interface Candidate {
  token: string;
  logit: number;
  rest: string;
}

const SAMPLE_COUNT = 5;

function softmax(logits: number[], temperature: number): number[] {
  if (temperature === 0) {
    const top = logits.indexOf(Math.max(...logits));
    return logits.map((_, i) => (i === top ? 1 : 0));
  }
  const scaled = logits.map((logit) => logit / temperature);
  const max = Math.max(...scaled);
  const weights = scaled.map((value) => Math.exp(value - max));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return weights.map((weight) => weight / total);
}

function sampleIndex(probabilities: number[]): number {
  let roll = Math.random();
  for (let i = 0; i < probabilities.length; i++) {
    roll -= probabilities[i];
    if (roll <= 0) return i;
  }
  return probabilities.length - 1;
}

export function initTemperature(root: HTMLElement): void {
  const slider = root.querySelector<HTMLInputElement>('#mli-temp-r');
  const label = root.querySelector<HTMLElement>('#mli-temp-v');
  const bars = root.querySelector<HTMLElement>('#mli-temp-bars');
  const sampleButton = root.querySelector<HTMLButtonElement>('#mli-temp-go');
  const output = root.querySelector<HTMLElement>('#mli-temp-out');
  if (!slider || !label || !bars || !sampleButton || !output) return;

  const candidates: Candidate[] = JSON.parse(root.dataset.candidates ?? '[]');
  const logits = candidates.map((candidate) => candidate.logit);
  const temperature = (): number => Number(slider.value) / 10;

  const render = (): void => {
    const probabilities = softmax(logits, temperature());
    label.textContent = temperature().toFixed(1);
    slider.setAttribute('aria-valuetext', temperature().toFixed(1));
    bars.replaceChildren(...candidates.map((candidate, i) => {
      const row = document.createElement('div');
      row.className = 'mli-nn-bar';
      const word = document.createElement('b');
      word.textContent = candidate.token.trim();
      const track = document.createElement('div');
      track.className = 'mli-nn-track';
      const fill = document.createElement('div');
      fill.className = 'mli-nn-val';
      fill.style.width = `${probabilities[i] * 100}%`;
      track.append(fill);
      const percent = document.createElement('span');
      percent.className = 'mli-dec-pct';
      percent.textContent = probabilities[i] < 0.005 && probabilities[i] > 0 ? '<1%' : `${Math.round(probabilities[i] * 100)}%`;
      row.append(word, track, percent);
      return row;
    }));
  };

  sampleButton.addEventListener('click', () => {
    const probabilities = softmax(logits, temperature());
    output.replaceChildren(...Array.from({ length: SAMPLE_COUNT }, () => {
      const pick = candidates[sampleIndex(probabilities)];
      const item = document.createElement('li');
      const word = document.createElement('b');
      word.textContent = pick.token;
      item.append('…', word, pick.rest);
      return item;
    }));
  });
  slider.addEventListener('input', render);
  render();
}
