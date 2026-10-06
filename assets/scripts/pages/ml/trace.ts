// Shared step player for the ML trace demos (handoff, wire): labelled rows
// revealed one at a time, with Replay and Step controls. Text between ⟦ and ⟧
// is highlighted, for the part of a message the user never sees.

export interface TraceStep {
  who: string;
  kind: string;
  text: string;
  state?: string;
}

interface TraceOptions {
  log: HTMLElement;
  replay: HTMLButtonElement;
  step: HTMLButtonElement;
  // The steps for the current settings, read again on every play.
  build: () => TraceStep[];
  onReset: () => void;
  onStep?: (step: TraceStep) => void;
  onDone: () => void;
}

const STEP_MS = 900;

export function renderStep(step: TraceStep): HTMLElement {
  const row = document.createElement('div');
  row.className = `mli-ag-step t-${step.kind}`;
  const label = document.createElement('span');
  label.className = 'mli-ag-lab';
  label.textContent = step.who;
  const body = document.createElement('span');
  body.className = 'mli-ag-body';
  for (const part of step.text.split(/(⟦[^⟧]*⟧)/)) {
    if (!part.startsWith('⟦')) {
      body.append(part);
      continue;
    }
    const hidden = document.createElement('mark');
    hidden.className = 'mli-trace-hl';
    hidden.textContent = part.slice(1, -1);
    body.append(hidden);
  }
  row.append(label, body);
  return row;
}

// Wires the controls and returns `play`, which reloads the steps and runs them.
export function createTrace(options: TraceOptions): () => void {
  const { log, replay, step: stepButton, build, onReset, onStep, onDone } = options;
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  let steps: TraceStep[] = [];
  let rows: HTMLElement[] = [];
  let shown = 0;
  let timer: number | undefined;

  const showNext = (): boolean => {
    if (shown >= rows.length) return false;
    rows[shown].classList.add('is-shown');
    onStep?.(steps[shown]);
    shown += 1;
    if (shown === rows.length) onDone();
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
    steps = build();
    rows = steps.map(renderStep);
    log.replaceChildren(...rows);
    shown = 0;
    onReset();
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
  return play;
}
