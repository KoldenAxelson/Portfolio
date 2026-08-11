// The tuning panel, generated from KNOBS. Adding a knob is one row in that
// table and nothing else — there is no markup here to keep in step with it.

import { defaultTune, KNOBS, type Knob, type Tune } from './knobs';

type Control = HTMLInputElement | HTMLSelectElement;

interface Row {
  control: Control;
  show: (value: number) => void;
}

const FEEDBACK_MS = 1400;

export function buildTuner(root: HTMLElement, tune: Tune, onChange: () => void): void {
  const host = root.querySelector<HTMLElement>('[data-quotes-tuner]');
  if (!host) return;
  host.textContent = '';

  const rows = new Map<string, Row>();
  for (const group of groupNames()) {
    host.appendChild(buildGroup(group, tune, rows, onChange));
  }
  host.appendChild(buildActions(tune, rows, onChange));
}

function groupNames(): string[] {
  const seen: string[] = [];
  for (const knob of KNOBS) if (!seen.includes(knob.group)) seen.push(knob.group);
  return seen;
}

function buildGroup(
  group: string,
  tune: Tune,
  rows: Map<string, Row>,
  onChange: () => void,
): HTMLElement {
  const section = document.createElement('div');
  section.className = 'quotes__tunegroup';

  const heading = document.createElement('h3');
  heading.textContent = group;
  section.appendChild(heading);

  for (const knob of KNOBS.filter((k) => k.group === group)) {
    section.appendChild(buildRow(knob, tune, rows, onChange));
  }
  return section;
}

function buildRow(
  knob: Knob,
  tune: Tune,
  rows: Map<string, Row>,
  onChange: () => void,
): HTMLElement {
  const row = document.createElement('label');
  row.className = 'quotes__knob';

  const name = document.createElement('span');
  name.className = 'quotes__knobname';
  name.textContent = knob.label;

  const readout = document.createElement('span');
  readout.className = 'quotes__knobvalue';

  // A select carries its own label, so its readout stays empty.
  const show = knob.options
    ? () => {
        readout.textContent = '';
      }
    : (value: number) => {
        readout.textContent = String(value);
      };

  const control = knob.options ? buildSelect(knob) : buildSlider(knob);
  control.value = String(tune[knob.key]);
  show(tune[knob.key]);
  control.addEventListener(knob.options ? 'change' : 'input', () => {
    tune[knob.key] = Number(control.value);
    show(tune[knob.key]);
    onChange();
  });

  rows.set(knob.key, { control, show });
  row.append(name, readout, control);
  return row;
}

function buildSelect(knob: Knob): HTMLSelectElement {
  const select = document.createElement('select');
  (knob.options ?? []).forEach((label, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = label;
    select.appendChild(option);
  });
  return select;
}

function buildSlider(knob: Knob): HTMLInputElement {
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = String(knob.min);
  slider.max = String(knob.max);
  slider.step = String(knob.step);
  return slider;
}

function buildActions(tune: Tune, rows: Map<string, Row>, onChange: () => void): HTMLElement {
  const actions = document.createElement('div');
  actions.className = 'quotes__tuneactions';
  actions.append(buildCopyButton(tune), buildResetButton(tune, rows, onChange));
  return actions;
}

function buildCopyButton(tune: Tune): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Copy as code';

  const flash = (message: string): void => {
    button.textContent = message;
    window.setTimeout(() => (button.textContent = 'Copy as code'), FEEDBACK_MS);
  };

  button.addEventListener('click', () => {
    const source = KNOBS.map((knob) =>
      knob.format ? knob.format(tune[knob.key]) : `const ${knob.source} = ${tune[knob.key]};`,
    ).join('\n');
    void navigator.clipboard
      ?.writeText(source)
      .then(() => flash('Copied'), () => flash('Copy failed'));
  });
  return button;
}

// Keyed by knob rather than by DOM order: the panel mixes sliders and selects,
// so position is not a reliable way back to the control a value belongs to.
function buildResetButton(
  tune: Tune,
  rows: Map<string, Row>,
  onChange: () => void,
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Reset';
  button.addEventListener('click', () => {
    const defaults = defaultTune();
    for (const knob of KNOBS) {
      tune[knob.key] = defaults[knob.key];
      const row = rows.get(knob.key);
      if (!row) continue;
      row.control.value = String(defaults[knob.key]);
      row.show(defaults[knob.key]);
    }
    onChange();
  });
  return button;
}
