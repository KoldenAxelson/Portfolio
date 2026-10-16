// Yes/no cutoff toy: simulated odds for truly-yes and truly-no cases, a cutoff
// the reader slides, and a button that picks the cutoff from a labelled sample.
// The scenarios come from data/ml/cutoff.yaml via data-scenarios.

interface Odds {
  positives: number[];
  negatives: number[];
}

interface Scenario {
  id: string;
  label: string;
  blurb: string;
  shown: Odds;
  tuning: Odds;
}

interface Tally {
  caught: number;
  missed: number;
  falseAlarms: number;
  f1: number;
}

function tally(odds: Odds, cutoff: number): Tally {
  const caught = odds.positives.filter((p) => p >= cutoff).length;
  const missed = odds.positives.length - caught;
  const falseAlarms = odds.negatives.filter((p) => p >= cutoff).length;
  const f1 = caught === 0 ? 0 : (2 * caught) / (2 * caught + falseAlarms + missed);
  return { caught, missed, falseAlarms, f1 };
}

// Best F1 on the labelled sample; on a tie, the cutoff nearest the default wins.
function tuneCutoffPercent(odds: Odds, candidates: number[], defaultPercent: number): number {
  const score = (percent: number): number => tally(odds, percent / 100).f1;
  return candidates.reduce((best, percent) => {
    const gain = score(percent) - score(best);
    if (gain > 1e-9) return percent;
    if (gain < -1e-9) return best;
    return Math.abs(percent - defaultPercent) < Math.abs(best - defaultPercent) ? percent : best;
  });
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function renderDots(lane: HTMLElement, odds: number[], kind: 'is-yes' | 'is-no', cutoff: number): void {
  const dots = odds.map((p) => {
    const dot = document.createElement('span');
    dot.className = p >= cutoff ? `mli-cut-dot ${kind} is-said-yes` : `mli-cut-dot ${kind}`;
    dot.style.left = `${(p * 100).toFixed(1)}%`;
    return dot;
  });
  lane.replaceChildren(...dots);
}

export function initCutoff(root: HTMLElement): void {
  const yesLane = root.querySelector<HTMLElement>('#mli-cut-yes');
  const noLane = root.querySelector<HTMLElement>('#mli-cut-no');
  const line = root.querySelector<HTMLElement>('#mli-cut-line');
  const slider = root.querySelector<HTMLInputElement>('#mli-cut-r');
  const cutoffLabel = root.querySelector<HTMLElement>('#mli-cut-v');
  const output = root.querySelector<HTMLElement>('#mli-cut-out');
  const caption = root.querySelector<HTMLElement>('#mli-cut-cap');
  const blurb = root.querySelector<HTMLElement>('#mli-cut-blurb');
  const tuneButton = root.querySelector<HTMLButtonElement>('#mli-cut-tune');
  const scenarioButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-id]')];
  if (!yesLane || !noLane || !line || !slider || !cutoffLabel || !output || !caption || !blurb || !tuneButton) return;

  const scenarios: Scenario[] = JSON.parse(root.dataset.scenarios ?? '[]');
  if (!scenarios.length) return;
  const defaultPercent = Number(slider.value);
  const candidates: number[] = [];
  for (let percent = Number(slider.min); percent <= Number(slider.max); percent += Number(slider.step)) candidates.push(percent);
  let scenario = scenarios[0];

  const render = (note: string): void => {
    const percent = Number(slider.value);
    const cutoff = percent / 100;
    const result = tally(scenario.shown, cutoff);
    renderDots(yesLane, scenario.shown.positives, 'is-yes', cutoff);
    renderDots(noLane, scenario.shown.negatives, 'is-no', cutoff);
    line.style.setProperty('--cut', String(percent));
    cutoffLabel.textContent = String(percent);
    slider.setAttribute('aria-valuetext', `${percent} percent`);
    const detail = `yeses caught · ${plural(result.falseAlarms, 'false alarm', 'false alarms')} · F1 ${result.f1.toFixed(2)}`;
    output.replaceChildren(`${result.caught} of ${scenario.shown.positives.length} `, Object.assign(document.createElement('small'), { textContent: detail }));
    caption.textContent = note;
  };

  const describe = (): string => {
    const result = tally(scenario.shown, Number(slider.value) / 100);
    return `At ${slider.value}%, it misses ${plural(result.missed, 'real yes', 'real yeses')} and raises ${plural(result.falseAlarms, 'false alarm', 'false alarms')}.`;
  };

  const tuningSize = (): number => scenario.tuning.positives.length + scenario.tuning.negatives.length;

  for (const button of scenarioButtons) {
    button.addEventListener('click', () => {
      scenario = scenarios.find((candidate) => candidate.id === button.dataset.id) ?? scenarios[0];
      for (const other of scenarioButtons) {
        other.classList.toggle('is-on', other === button);
        other.setAttribute('aria-pressed', String(other === button));
      }
      blurb.textContent = scenario.blurb;
      tuneButton.textContent = `Tune on ${tuningSize()} labelled examples`;
      slider.value = String(defaultPercent);
      render(describe());
    });
  }
  slider.addEventListener('input', () => render(describe()));
  tuneButton.addEventListener('click', () => {
    const tuned = tuneCutoffPercent(scenario.tuning, candidates, defaultPercent);
    slider.value = String(tuned);
    render(`Tuned on ${tuningSize()} other labelled examples, the best cutoff is ${tuned}%. ${describe()}`);
  });
  render(describe());
}
