// Reward-model toy: a linear score over hand-labeled traits, trained with the
// Bradley–Terry update used for real reward models: raise the winner's score
// relative to the loser's, more when the model found the pick surprising.

interface Answer {
  text: string;
  traits: Record<string, number>;
}

interface Pair {
  question: string;
  a: Answer;
  b: Answer;
}

const LEARNING_RATE = 0.6;
const BAR_SCALE = 3;

function score(weights: Record<string, number>, answer: Answer): number {
  return Object.entries(answer.traits).reduce((sum, [trait, value]) => sum + (weights[trait] ?? 0) * value, 0);
}

function describeTaste(weights: Record<string, number>, labels: Record<string, string>): string {
  const ranked = Object.entries(weights).sort((x, y) => y[1] - x[1]);
  const [topTrait, topWeight] = ranked[0];
  if (topWeight < 0.3) return 'No strong taste yet. Keep picking.';
  if (topTrait === 'flatters') return 'It has learned that you reward flattery. Train a model on this and you get a sycophant.';
  return `It mostly rewards "${labels[topTrait].toLowerCase()}". A model trained against it will drift toward whatever scores well here.`;
}

export function initReward(root: HTMLElement): void {
  const question = root.querySelector<HTMLElement>('#mli-rew-q');
  const buttonA = root.querySelector<HTMLButtonElement>('#mli-rew-a');
  const buttonB = root.querySelector<HTMLButtonElement>('#mli-rew-b');
  const resetButton = root.querySelector<HTMLButtonElement>('#mli-rew-reset');
  const count = root.querySelector<HTMLElement>('#mli-rew-count');
  const caption = root.querySelector<HTMLElement>('#mli-rew-cap');
  const bars = [...root.querySelectorAll<HTMLElement>('[data-trait]')];
  if (!question || !buttonA || !buttonB || !resetButton || !count || !caption || !bars.length) return;

  const pairs: Pair[] = JSON.parse(root.dataset.pairs ?? '[]');
  if (!pairs.length) return;
  const labels = Object.fromEntries(bars.map((bar) => [bar.dataset.trait ?? '', bar.querySelector('.mli-rew-lab')?.textContent ?? '']));
  const introText = caption.textContent ?? '';
  let weights: Record<string, number> = {};
  let pairIndex = 0;
  let picks = 0;

  const currentPair = (): Pair => pairs[pairIndex % pairs.length];

  const render = (): void => {
    const pair = currentPair();
    question.textContent = pair.question;
    buttonA.textContent = pair.a.text;
    buttonB.textContent = pair.b.text;
    for (const bar of bars) {
      const weight = weights[bar.dataset.trait ?? ''] ?? 0;
      const fill = bar.querySelector<HTMLElement>('.mli-rew-fill');
      const value = bar.querySelector<HTMLElement>('.mli-rew-val');
      if (!fill || !value) continue;
      const width = Math.min(50, (Math.abs(weight) / BAR_SCALE) * 50);
      fill.style.left = weight >= 0 ? '50%' : `${50 - width}%`;
      fill.style.width = `${width}%`;
      fill.classList.toggle('is-neg', weight < 0);
      value.textContent = (Math.abs(weight) < 0.05 ? 0 : weight).toFixed(1);
    }
    count.textContent = `${picks} ${picks === 1 ? 'pick' : 'picks'}`;
    if (picks) caption.textContent = describeTaste(weights, labels);
  };

  const pick = (winner: Answer, loser: Answer): void => {
    // Bradley–Terry: the probability the model gave the winner.
    const predicted = 1 / (1 + Math.exp(score(weights, loser) - score(weights, winner)));
    const step = LEARNING_RATE * (1 - predicted);
    const traits = new Set([...Object.keys(winner.traits), ...Object.keys(loser.traits)]);
    const next = { ...weights };
    for (const trait of traits) {
      next[trait] = (next[trait] ?? 0) + step * ((winner.traits[trait] ?? 0) - (loser.traits[trait] ?? 0));
    }
    weights = next;
    picks++;
    pairIndex++;
    render();
  };

  buttonA.addEventListener('click', () => pick(currentPair().a, currentPair().b));
  buttonB.addEventListener('click', () => pick(currentPair().b, currentPair().a));
  resetButton.addEventListener('click', () => {
    weights = {};
    picks = 0;
    pairIndex = 0;
    caption.textContent = introText;
    render();
  });
  render();
}
