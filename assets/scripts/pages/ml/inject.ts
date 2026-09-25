// Prompt-injection toy: which defences stop a poisoned email from turning an
// assistant's read-only job into a send. The scenario text comes from
// data/ml/inject.yaml via the shortcode's data-* attributes.

interface Step {
  kind: string;
  label: string;
  text: string;
}

type Outcome = 'refuses' | 'sent' | 'no-tool' | 'approval';

// The prompt warning only catches the attack that announces itself.
function decideOutcome(attack: string, defences: Set<string>): Outcome {
  if (defences.has('prompt') && attack === 'blunt') return 'refuses';
  if (defences.has('tools')) return 'no-tool';
  if (defences.has('approval')) return 'approval';
  return 'sent';
}

function renderStep(step: Step): HTMLElement {
  const row = document.createElement('div');
  row.className = `mli-ag-step t-${step.kind} is-shown`;
  const label = document.createElement('span');
  label.className = 'mli-ag-lab';
  label.textContent = step.label;
  const body = document.createElement('span');
  body.className = 'mli-ag-body';
  body.textContent = step.text;
  row.append(label, body);
  return row;
}

export function initInject(root: HTMLElement): void {
  const log = root.querySelector<HTMLElement>('#mli-inj-log');
  const verdict = root.querySelector<HTMLElement>('#mli-inj-verdict');
  const hiddenText = root.querySelector<HTMLElement>('#mli-inj-hidden');
  const attackButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-attack]')];
  const defenceBoxes = [...root.querySelectorAll<HTMLInputElement>('[data-defence]')];
  if (!log || !verdict || !hiddenText || !attackButtons.length) return;

  const attacks: Record<string, string> = JSON.parse(root.dataset.attacks ?? '{}');
  const steps: Record<string, Step[]> = JSON.parse(root.dataset.steps ?? '{}');
  const answers: Record<string, string> = JSON.parse(root.dataset.answers ?? '{}');
  const verdicts: Record<string, string> = JSON.parse(root.dataset.verdicts ?? '{}');
  let attack = 'blunt';

  const render = (): void => {
    const defences = new Set(defenceBoxes.filter((box) => box.checked).map((box) => box.dataset.defence ?? ''));
    const outcome = decideOutcome(attack, defences);
    const trace = outcome === 'refuses' ? steps.refuses : [...steps.hijacked, ...steps[outcome]];
    const answer = { kind: 'answer', label: 'ANSWER', text: outcome === 'refuses' ? answers.flagged : answers.quiet };
    hiddenText.textContent = attacks[attack] ?? '';
    log.replaceChildren(...[...trace, answer].map(renderStep));
    verdict.textContent = verdicts[outcome] ?? '';
    verdict.classList.toggle('is-bad', outcome === 'sent');
  };

  const selectAttack = (chosen: HTMLButtonElement): void => {
    attack = chosen.dataset.attack ?? 'blunt';
    for (const button of attackButtons) {
      button.classList.toggle('is-on', button === chosen);
      button.setAttribute('aria-pressed', String(button === chosen));
    }
    render();
  };

  for (const button of attackButtons) button.addEventListener('click', () => selectAttack(button));
  for (const box of defenceBoxes) box.addEventListener('change', render);
  render();
}
