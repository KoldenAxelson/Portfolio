/* Builds the control panel from parameter specs. Nothing here knows about any
 * particular behaviour: a group's specs decide its controls, and a behaviour
 * additionally gets an on/off switch, a mix slider and any custom controls it
 * mounts itself. */

import type { Behavior } from '../behavior';
import { writeParam } from '../params';
import type { ChoiceSpec, ParamGroup, ParamSpec, ParamValue, RangeSpec, ToggleSpec } from '../params';
import { element } from './dom';

const MIX_MAX = 2;

/** Called after any edit, with the group that changed. */
export type PanelChange = (group: ParamGroup) => void;

type Readback = () => void;

export class Panel {
  private readonly readbacks: Readback[] = [];

  constructor(private readonly host: HTMLElement, private readonly changed: PanelChange) {}

  addGroup(group: ParamGroup, isOpen: boolean): void {
    const { section, body } = this.section(group.label, isOpen);
    this.addParams(group, body);
    this.host.append(section);
  }

  addBehavior(behavior: Behavior): void {
    const { section, head, body } = this.section(behavior.label, true);
    section.title = behavior.summary;
    section.classList.add('em-behavior');

    const enabled = element('input', 'em-switch');
    enabled.type = 'checkbox';
    enabled.setAttribute('aria-label', `Enable ${behavior.label}`);
    enabled.addEventListener('change', () => {
      behavior.mix.enabled = enabled.checked;
      this.changed(behavior);
    });
    head.append(enabled);

    const weight = rangeInput({ kind: 'range', label: 'Mix', min: 0, max: MIX_MAX, step: 0.05, initial: 1 });
    weight.input.addEventListener('input', () => {
      behavior.mix.weight = Number(weight.input.value);
      weight.output.textContent = format(behavior.mix.weight, 0.05);
      this.changed(behavior);
    });
    weight.row.classList.add('em-row-mix');
    body.append(weight.row);

    this.readbacks.push(() => {
      enabled.checked = behavior.mix.enabled;
      section.classList.toggle('is-off', !behavior.mix.enabled);
      weight.input.value = String(behavior.mix.weight);
      weight.output.textContent = format(behavior.mix.weight, 0.05);
    });

    this.addParams(behavior, body);
    const custom = behavior.mountControls?.(body, () => this.changed(behavior));
    if (custom) this.readbacks.push(() => custom.sync());
    this.host.append(section);
  }

  /** Re-reads every value into its control, after a preset or a restart. */
  sync(): void {
    for (const readback of this.readbacks) readback();
  }

  private section(label: string, isOpen: boolean) {
    const section = element('details', 'em-group');
    section.open = isOpen;
    const head = element('summary', 'em-group-head');
    const title = element('span', 'em-group-title');
    title.textContent = label;
    head.append(title);
    const body = element('div', 'em-group-body');
    section.append(head, body);
    return { section, head, body };
  }

  private addParams(group: ParamGroup, body: HTMLElement): void {
    for (const [key, spec] of Object.entries(group.specs)) {
      const { row, readback } = this.control(group, key, spec);
      body.append(row);
      this.readbacks.push(readback);
    }
  }

  private control(group: ParamGroup, key: string, spec: ParamSpec): { row: HTMLElement; readback: Readback } {
    const values = group.values as Record<string, ParamValue>;
    const commit = (raw: ParamValue): void => {
      writeParam(group, key, raw);
      this.changed(group);
    };
    if (spec.kind === 'range') return rangeControl(spec, () => values[key] as number, commit);
    if (spec.kind === 'toggle') return toggleControl(spec, () => values[key] as boolean, commit);
    return choiceControl(spec, () => values[key] as string, commit);
  }
}

function rangeInput(spec: RangeSpec) {
  const row = element('label', 'em-row');
  const name = element('span', 'em-row-label');
  name.textContent = spec.label;
  const output = element('output', 'em-row-value');
  const input = element('input', 'em-range');
  input.type = 'range';
  input.min = String(spec.min);
  input.max = String(spec.max);
  input.step = String(spec.step);
  row.append(name, output, input);
  return { row, input, output };
}

function rangeControl(spec: RangeSpec, read: () => number, commit: (raw: ParamValue) => void) {
  const { row, input, output } = rangeInput(spec);
  input.addEventListener('input', () => {
    commit(Number(input.value));
    output.textContent = format(read(), spec.step);
  });
  const readback = (): void => {
    input.value = String(read());
    output.textContent = format(read(), spec.step);
  };
  return { row, readback };
}

function toggleControl(spec: ToggleSpec, read: () => boolean, commit: (raw: ParamValue) => void) {
  const row = element('label', 'em-row em-row-toggle');
  const name = element('span', 'em-row-label');
  name.textContent = spec.label;
  const input = element('input', 'em-switch');
  input.type = 'checkbox';
  input.addEventListener('change', () => commit(input.checked));
  row.append(name, input);
  return { row, readback: () => { input.checked = read(); } };
}

function choiceControl(spec: ChoiceSpec, read: () => string, commit: (raw: ParamValue) => void) {
  const row = element('label', 'em-row em-row-choice');
  const name = element('span', 'em-row-label');
  name.textContent = spec.label;
  const select = element('select', 'em-select');
  for (const option of spec.options) select.append(new Option(option.label, option.value));
  select.addEventListener('change', () => commit(select.value));
  row.append(name, select);
  return { row, readback: () => { select.value = read(); } };
}

function format(value: number, step: number): string {
  return value.toFixed(String(step).split('.')[1]?.length ?? 0);
}
