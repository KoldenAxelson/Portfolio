// A2A handoff: a planner agent fetches a flight agent's card, sends the job,
// answers its question and gets the result. With a look-alike card in the
// directory, the run depends on whether the planner checks cards. Steps and
// verdicts come from data/ml/handoff.yaml via the shortcode's data-* attributes.

import { type TraceStep, createTrace } from './trace';

type Scenario = 'normal' | 'hijacked' | 'rejected';

function pickScenario(attack: boolean, verify: boolean): Scenario {
  if (!attack) return 'normal';
  return verify ? 'rejected' : 'hijacked';
}

export function initHandoff(root: HTMLElement): void {
  const log = root.querySelector<HTMLElement>('#mli-hand-log');
  const verdict = root.querySelector<HTMLElement>('#mli-hand-verdict');
  const replay = root.querySelector<HTMLButtonElement>('#mli-hand-replay');
  const step = root.querySelector<HTMLButtonElement>('#mli-hand-step');
  const pills = [...root.querySelectorAll<HTMLElement>('[data-state]')];
  const attackBox = root.querySelector<HTMLInputElement>('[data-opt="attack"]');
  const verifyBox = root.querySelector<HTMLInputElement>('[data-opt="verify"]');
  if (!log || !verdict || !replay || !step || !attackBox || !verifyBox) return;

  const groups: Record<string, TraceStep[]> = JSON.parse(root.dataset.groups ?? '{}');
  const scenarios: Record<Scenario, string[]> = JSON.parse(root.dataset.scenarios ?? '{}');
  const verdicts: Record<Scenario, string> = JSON.parse(root.dataset.verdicts ?? '{}');
  let scenario: Scenario = 'normal';

  const setState = (state: string | undefined): void => {
    for (const pill of pills) pill.classList.toggle('is-active', pill.dataset.state === state);
  };

  const play = createTrace({
    log,
    replay,
    step,
    build: () => {
      scenario = pickScenario(attackBox.checked, verifyBox.checked);
      return (scenarios[scenario] ?? []).flatMap((name) => groups[name] ?? []);
    },
    onReset: () => {
      setState(undefined);
      verdict.hidden = true;
    },
    onStep: (current) => {
      if (current.state) setState(current.state);
    },
    onDone: () => {
      verdict.textContent = verdicts[scenario] ?? '';
      verdict.classList.toggle('is-bad', scenario === 'hijacked');
      verdict.hidden = false;
    },
  });

  attackBox.addEventListener('change', play);
  verifyBox.addEventListener('change', play);
  play();
}
