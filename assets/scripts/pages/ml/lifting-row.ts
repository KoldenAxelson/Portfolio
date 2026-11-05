// {{< ml/lifting-row >}}: one row of 16 pixels, lifted a step at a time and
// then undone a step at a time. The undo really runs the inverse steps on the
// current numbers (it doesn't replay history), so the final check is honest.
// A second mode does the obvious thing instead, a rounded average and
// half-difference per pair, and its undo gets some pixels wrong.
// Rows come from data/ml/lifting-row.yaml via the shortcode.

import { mirror, predict, undoPredict, undoUpdate, update } from './lifting';

type Mode = 'lifting' | 'rounded';

interface Preset {
  name: string;
  row: number[];
}

const STAGES: Record<Mode, string[]> = {
  lifting: [
    'The row, as {count} pixel values.',
    'Split it: even positions and odd positions.',
    'Predict: each odd pixel minus the rounded average of its even neighbours. What’s left is the detail, how wrong the guess was.',
    'Update: each even pixel plus a rounded quarter of the details either side. The evens are now a smooth half-size copy of the row.',
  ],
  rounded: [
    'The row, as {count} pixel values.',
    'Pair them up: positions 0 and 1, 2 and 3, and so on.',
    'Each pair becomes its average and half its difference, both rounded down, because pixels have to stay whole numbers.',
  ],
};

const floorDiv = (value: number, by: number): number => Math.floor(value / by);
const sign = (value: number): string => (value < 0 ? `−${-value}` : String(value));

function roundedForward(row: number[]): number[] {
  return row.map((_, i) => {
    const a = row[i - (i % 2)];
    const b = row[i - (i % 2) + 1];
    return i % 2 === 0 ? floorDiv(a + b, 2) : floorDiv(b - a, 2);
  });
}

// The best a decoder can do: average minus and plus the half-difference.
function roundedInverse(row: number[]): number[] {
  return row.map((_, i) => {
    const average = row[i - (i % 2)];
    const half = row[i - (i % 2) + 1];
    return i % 2 === 0 ? average - half : average + half;
  });
}

export function initLiftingRow(root: HTMLElement): void {
  const cellsBox = root.querySelector<HTMLElement>('#mli-lr-cells');
  const stageText = root.querySelector<HTMLElement>('#mli-lr-stage');
  const detailText = root.querySelector<HTMLElement>('#mli-lr-detail');
  const checkText = root.querySelector<HTMLElement>('#mli-lr-check');
  const forwardButton = root.querySelector<HTMLButtonElement>('#mli-lr-forward');
  const backButton = root.querySelector<HTMLButtonElement>('#mli-lr-back');
  const presetButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-preset]'));
  const modeButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-mode]'));
  if (!cellsBox || !stageText || !checkText || !forwardButton || !backButton) return;

  const presets = JSON.parse(root.dataset.presets ?? '[]') as Preset[];
  const state = { mode: 'lifting' as Mode, stage: 0, original: [...(presets[0]?.row ?? [])], values: [...(presets[0]?.row ?? [])], undoing: false, justUndid: false };

  const lastStage = (): number => STAGES[state.mode].length - 1;
  // In both modes, odd positions hold the small numbers from step 2 on.
  const isDetail = (i: number): boolean => state.stage >= 2 && i % 2 === 1;

  function explain(i: number): string {
    const { values, original, stage, mode } = state;
    if (state.undoing || stage < 2) return '';
    if (mode === 'rounded') {
      const a = original[i - (i % 2)];
      const b = original[i - (i % 2) + 1];
      return `Pair (${a}, ${b}): average ⌊(${a} + ${b}) ÷ 2⌋ = ${floorDiv(a + b, 2)}, half-difference ⌊(${b} − ${a}) ÷ 2⌋ = ${sign(floorDiv(b - a, 2))}.`;
    }
    const length = values.length;
    if (i % 2 === 1) {
      const left = original[mirror(i - 1, length)];
      const right = original[mirror(i + 1, length)];
      const guess = floorDiv(left + right, 2);
      return `Position ${i}: detail = ${original[i]} − ⌊(${left} + ${right}) ÷ 2⌋ = ${original[i]} − ${guess} = ${sign(original[i] - guess)}.`;
    }
    if (stage < 3) return `Position ${i} waits for the update step.`;
    const details = predict(original);
    const left = details[mirror(i - 1, length)];
    const right = details[mirror(i + 1, length)];
    const nudge = floorDiv(left + right + 2, 4);
    return `Position ${i}: smooth = ${original[i]} + ⌊(${sign(left)} + ${sign(right)} + 2) ÷ 4⌋ = ${original[i]} + ${sign(nudge)} = ${values[i]}.`;
  }

  function render(): void {
    cellsBox!.style.setProperty('--mli-lr-count', String(state.values.length));
    cellsBox!.replaceChildren(
      ...state.values.map((value, i) => {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = `mli-lr-cell${state.stage >= 1 ? (i % 2 === 0 ? ' is-even' : ' is-odd') : ''}${isDetail(i) ? ' is-detail' : ''}`;
        cell.dataset.index = String(i);
        const wrong = state.stage === 0 && state.justUndid && value !== state.original[i];
        if (wrong) cell.classList.add('is-wrong');
        if (!isDetail(i)) {
          const level = Math.max(0, Math.min(255, value));
          cell.style.setProperty('--mli-lr-grey', `rgb(${level} ${level} ${level})`);
        }
        cell.innerHTML = `<span class="mli-lr-num">${sign(value)}</span>${wrong ? `<span class="mli-lr-was">was ${state.original[i]}</span>` : ''}`;
        cell.setAttribute('aria-label', `Position ${i}: ${sign(value)}${wrong ? `, should be ${state.original[i]}` : ''}`);
        return cell;
      }),
    );
    stageText!.textContent = `${state.undoing ? 'Undoing. ' : ''}Step ${state.stage} of ${lastStage()}: ${STAGES[state.mode][state.stage].replace('{count}', String(state.values.length))}`;
    forwardButton!.disabled = state.undoing || state.stage === lastStage();
    backButton!.disabled = state.stage === 0;
    backButton!.textContent = state.stage === lastStage() || state.undoing ? 'Undo a step' : 'Step back';
    if (detailText) detailText.textContent = state.stage >= 2 && !state.undoing ? 'Point at a number to see how it was worked out.' : '';
    if (state.stage === lastStage() && !state.undoing) {
      const details = state.values.filter((_, i) => i % 2 === 1);
      checkText!.textContent = `The details run from ${sign(Math.min(...details))} to ${sign(Math.max(...details))}. Now undo it.`;
    } else if (state.stage === 0 && state.justUndid) {
      const wrong = state.values.filter((value, i) => value !== state.original[i]).length;
      checkText!.textContent = wrong === 0
        ? `Back at the start: all ${state.values.length} pixels match the original exactly.`
        : `Back at the start: ${wrong} of ${state.values.length} pixels came back wrong. Rounding both halves threw away the bit that told some pairs apart.`;
    } else {
      checkText!.textContent = '';
    }
  }

  function stepForward(): void {
    if (state.stage === lastStage()) return;
    // Starting over after an undo begins from the true row, even if the
    // rounded mode's undo got some of it wrong.
    if (state.stage === 0) state.values = [...state.original];
    state.justUndid = false;
    if (state.mode === 'lifting') {
      if (state.stage === 1) state.values = predict(state.values);
      if (state.stage === 2) state.values = update(state.values);
    } else if (state.stage === 1) {
      state.values = roundedForward(state.values);
    }
    state.stage += 1;
    render();
  }

  function stepBack(): void {
    if (state.stage === 0) return;
    if (state.stage === lastStage()) state.undoing = true;
    if (state.mode === 'lifting') {
      if (state.stage === 3) state.values = undoUpdate(state.values);
      if (state.stage === 2) state.values = undoPredict(state.values);
    } else if (state.stage === 2) {
      state.values = roundedInverse(state.values);
    }
    state.stage -= 1;
    if (state.stage === 0 && state.undoing) {
      state.undoing = false;
      state.justUndid = true;
    }
    render();
  }

  function reset(row: number[]): void {
    state.original = [...row];
    state.values = [...row];
    state.stage = 0;
    state.undoing = false;
    state.justUndid = false;
    render();
  }

  function choose(buttons: HTMLButtonElement[], chosen: HTMLButtonElement): void {
    for (const button of buttons) {
      button.classList.toggle('is-on', button === chosen);
      button.setAttribute('aria-pressed', String(button === chosen));
    }
  }

  cellsBox.addEventListener('pointerover', (event) => {
    const cell = (event.target as Element).closest<HTMLElement>('[data-index]');
    if (cell && detailText) detailText.textContent = explain(Number(cell.dataset.index)) || detailText.textContent;
  });
  cellsBox.addEventListener('focusin', (event) => {
    const cell = (event.target as Element).closest<HTMLElement>('[data-index]');
    if (cell && detailText) detailText.textContent = explain(Number(cell.dataset.index)) || detailText.textContent;
  });
  forwardButton.addEventListener('click', stepForward);
  backButton.addEventListener('click', stepBack);
  for (const button of presetButtons) {
    button.addEventListener('click', () => {
      const preset = presets[Number(button.dataset.preset)];
      if (!preset) return;
      choose(presetButtons, button);
      reset(preset.row);
    });
  }
  for (const button of modeButtons) {
    button.addEventListener('click', () => {
      state.mode = button.dataset.mode as Mode;
      choose(modeButtons, button);
      reset(state.original);
    });
  }

  for (const button of [...presetButtons, ...modeButtons, forwardButton, backButton]) button.disabled = false;
  for (const id of ['#mli-lr-controls', '#mli-lr-actions']) {
    const element = root.querySelector<HTMLElement>(id);
    if (element) element.hidden = false;
  }
  render();
}
