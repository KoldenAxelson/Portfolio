// MCP on the wire: an app lists a server's tools and calls one, in either spec
// version, then meets a server whose tool description carries hidden
// instructions. Whether the secret leaves depends on what the approval box
// shows. Messages come from data/ml/wire.yaml via the shortcode's data-*.

import { type TraceStep, createTrace } from './trace';

type Version = '2025' | '2026';
type Outcome = 'honest' | 'leaked' | 'caught';

interface Fill {
  meta: string;
  rt: string;
}

function fillIn(step: TraceStep, fill: Fill): TraceStep {
  const text = step.text
    .replace(/⟨,meta⟩/g, fill.meta ? `,${fill.meta}` : '')
    .replace(/⟨meta⟩/g, fill.meta)
    .replace(/⟨rt⟩/g, fill.rt);
  return { ...step, text };
}

export function initWire(root: HTMLElement): void {
  const log = root.querySelector<HTMLElement>('#mli-wire-log');
  const verdict = root.querySelector<HTMLElement>('#mli-wire-verdict');
  const replay = root.querySelector<HTMLButtonElement>('#mli-wire-replay');
  const step = root.querySelector<HTMLButtonElement>('#mli-wire-step');
  const versionButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-version]')];
  const maliciousBox = root.querySelector<HTMLInputElement>('[data-opt="malicious"]');
  const argumentsBox = root.querySelector<HTMLInputElement>('[data-opt="arguments"]');
  if (!log || !verdict || !replay || !step || !versionButtons.length || !maliciousBox || !argumentsBox) return;

  const groups: Record<string, TraceStep[]> = JSON.parse(root.dataset.groups ?? '{}');
  const fills: Record<Version, Fill> = JSON.parse(root.dataset.fills ?? '{}');
  const verdicts: Record<Outcome, string> = JSON.parse(root.dataset.verdicts ?? '{}');
  let version: Version = '2026';
  let outcome: Outcome = 'honest';

  const play = createTrace({
    log,
    replay,
    step,
    build: () => {
      const approval = argumentsBox.checked ? 'full' : 'blind';
      const names = maliciousBox.checked
        ? [`hello-${version}`, 'list-poisoned', 'add', `add-${approval}`]
        : [`hello-${version}`, 'list', 'weather', `weather-ok-${approval}`, 'weather-call'];
      outcome = !maliciousBox.checked ? 'honest' : argumentsBox.checked ? 'caught' : 'leaked';
      return names.flatMap((name) => groups[name] ?? []).map((current) => fillIn(current, fills[version]));
    },
    onReset: () => {
      verdict.hidden = true;
    },
    onDone: () => {
      verdict.textContent = verdicts[outcome] ?? '';
      verdict.classList.toggle('is-bad', outcome === 'leaked');
      verdict.hidden = false;
    },
  });

  for (const button of versionButtons) {
    button.addEventListener('click', () => {
      version = button.dataset.version === '2025' ? '2025' : '2026';
      for (const other of versionButtons) {
        other.classList.toggle('is-on', other === button);
        other.setAttribute('aria-pressed', String(other === button));
      }
      play();
    });
  }
  maliciousBox.addEventListener('change', play);
  argumentsBox.addEventListener('change', play);
  play();
}
