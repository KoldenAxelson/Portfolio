// A2A handoff: a planner agent fetches a flight agent's card, sends the job,
// answers its question and gets the result. With a look-alike card in the
// directory, the run depends on whether the planner checks cards. Steps and
// verdicts come from data/ml/handoff.yaml via the shortcode's data-* attributes.

interface Step {
  who: string;
  kind: string;
  text: string;
  state?: string;
}

type Scenario = 'normal' | 'hijacked' | 'rejected';

const STEP_MS = 900;

function pickScenario(attack: boolean, verify: boolean): Scenario {
  if (!attack) return 'normal';
  return verify ? 'rejected' : 'hijacked';
}

function renderStep(step: Step): HTMLElement {
  const row = document.createElement('div');
  row.className = `mli-ag-step t-${step.kind}`;
  const label = document.createElement('span');
  label.className = 'mli-ag-lab';
  label.textContent = step.who;
  const body = document.createElement('span');
  body.className = 'mli-ag-body';
  body.textContent = step.text;
  row.append(label, body);
  return row;
}

export function initHandoff(root: HTMLElement): void {
  const log = root.querySelector<HTMLElement>('#mli-hand-log');
  const verdict = root.querySelector<HTMLElement>('#mli-hand-verdict');
  const replay = root.querySelector<HTMLButtonElement>('#mli-hand-replay');
  const stepButton = root.querySelector<HTMLButtonElement>('#mli-hand-step');
  const pills = [...root.querySelectorAll<HTMLElement>('[data-state]')];
  const attackBox = root.querySelector<HTMLInputElement>('[data-opt="attack"]');
  const verifyBox = root.querySelector<HTMLInputElement>('[data-opt="verify"]');
  if (!log || !verdict || !replay || !stepButton || !attackBox || !verifyBox) return;

  const groups: Record<string, Step[]> = JSON.parse(root.dataset.groups ?? '{}');
  const scenarios: Record<Scenario, string[]> = JSON.parse(root.dataset.scenarios ?? '{}');
  const verdicts: Record<Scenario, string> = JSON.parse(root.dataset.verdicts ?? '{}');
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  let scenario: Scenario = 'normal';
  let steps: Step[] = [];
  let rows: HTMLElement[] = [];
  let shown = 0;
  let timer: number | undefined;

  const setState = (state: string | undefined): void => {
    for (const pill of pills) pill.classList.toggle('is-active', pill.dataset.state === state);
  };

  const showNext = (): boolean => {
    if (shown >= rows.length) return false;
    rows[shown].classList.add('is-shown');
    const state = steps[shown].state;
    if (state) setState(state);
    shown += 1;
    if (shown === rows.length) {
      verdict.textContent = verdicts[scenario] ?? '';
      verdict.hidden = false;
      verdict.classList.toggle('is-bad', scenario === 'hijacked');
    }
    return shown < rows.length;
  };

  const stop = (): void => {
    if (timer !== undefined) window.clearTimeout(timer);
    timer = undefined;
  };

  const tick = (): void => {
    timer = showNext() ? window.setTimeout(tick, STEP_MS) : undefined;
  };

  const load = (): void => {
    stop();
    scenario = pickScenario(attackBox.checked, verifyBox.checked);
    steps = (scenarios[scenario] ?? []).flatMap((name) => groups[name] ?? []);
    rows = steps.map(renderStep);
    log.replaceChildren(...rows);
    shown = 0;
    setState(undefined);
    verdict.hidden = true;
  };

  const play = (): void => {
    load();
    if (reduceMotion) {
      while (showNext());
      return;
    }
    tick();
  };

  replay.addEventListener('click', play);
  stepButton.addEventListener('click', () => {
    stop();
    if (shown >= rows.length) load();
    showNext();
  });
  attackBox.addEventListener('change', play);
  verifyBox.addEventListener('change', play);
  play();
}
