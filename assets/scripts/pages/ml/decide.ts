// Decision-model toy: score a ticket against the chosen question's options and
// show odds, a confidence and the typed answer a program would receive.
// Questions and cue words come from data/ml/decide.yaml via data-* attributes.

interface DecisionOption {
  label: string;
  cues: string[];
}

// Each matching cue multiplies an option's odds by e^CUE_WEIGHT.
const CUE_WEIGHT = 0.9;
const ACT_AT = 0.6;
const REVIEW_AT = 0.3;

function countCues(text: string, cues: string[]): number {
  return cues.filter((cue) => new RegExp(`(^|\\W)${cue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(text)).length;
}

function toProbabilities(scores: number[]): number[] {
  const weights = scores.map((score) => Math.exp(score * CUE_WEIGHT));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return weights.map((weight) => weight / total);
}

// How far the top answer stands above a coin flip across all the options, 0 to 1.
function toConfidence(probabilities: number[]): number {
  const even = 1 / probabilities.length;
  return (Math.max(...probabilities) - even) / (1 - even);
}

function describeAction(confidence: number): string {
  if (confidence >= ACT_AT) return 'High confidence: the program acts on it automatically.';
  if (confidence >= REVIEW_AT) return 'Medium confidence: act, but flag it for a person to check.';
  return 'Low confidence: the model is unsure, so hand the ticket to a human.';
}

function renderBar(option: DecisionOption, probability: number, isTop: boolean): HTMLElement {
  const row = document.createElement('div');
  row.className = isTop ? 'mli-nn-bar mli-top' : 'mli-nn-bar';
  const label = document.createElement('b');
  label.textContent = option.label;
  const track = document.createElement('div');
  track.className = 'mli-nn-track';
  const fill = document.createElement('div');
  fill.className = 'mli-nn-val';
  fill.style.width = `${(probability * 100).toFixed(1)}%`;
  track.append(fill);
  const percent = document.createElement('span');
  percent.className = 'mli-dec-pct';
  percent.textContent = `${Math.round(probability * 100)}%`;
  row.append(label, track, percent);
  return row;
}

export function initDecide(root: HTMLElement): void {
  const ticket = root.querySelector<HTMLTextAreaElement>('#mli-dec-in');
  const nextButton = root.querySelector<HTMLButtonElement>('#mli-dec-next');
  const bars = root.querySelector<HTMLElement>('#mli-dec-bars');
  const json = root.querySelector<HTMLElement>('#mli-dec-json');
  const caption = root.querySelector<HTMLElement>('#mli-dec-cap');
  const questionButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-options]')];
  if (!ticket || !nextButton || !bars || !json || !caption || !questionButtons.length) return;

  const samples: string[] = JSON.parse(root.dataset.samples ?? '[]');
  let sampleIndex = 0;
  let question = questionButtons[0];

  const render = (): void => {
    const options: DecisionOption[] = JSON.parse(question.dataset.options ?? '[]');
    const probabilities = toProbabilities(options.map((option) => countCues(ticket.value, option.cues)));
    const topIndex = probabilities.indexOf(Math.max(...probabilities));
    const confidence = toConfidence(probabilities);
    bars.replaceChildren(...options.map((option, i) => renderBar(option, probabilities[i], i === topIndex)));
    const odds = Object.fromEntries(options.map((option, i) => [option.label, Number(probabilities[i].toFixed(2))]));
    json.textContent = JSON.stringify({ answer: options[topIndex].label, probabilities: odds, confidence: Number(confidence.toFixed(2)) }, null, 1);
    caption.textContent = `${describeAction(confidence)} Words of prose generated: 0.`;
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
  nextButton.addEventListener('click', () => {
    sampleIndex = (sampleIndex + 1) % samples.length;
    ticket.value = samples[sampleIndex] ?? '';
    render();
  });
  ticket.addEventListener('input', render);
  render();
}
