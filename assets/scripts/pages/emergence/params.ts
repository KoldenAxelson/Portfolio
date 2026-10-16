/* Tunable values, described once. The panel builds its controls from these
 * specs, presets override them by key, and each behaviour reads its typed
 * values straight off its group. */

export interface RangeSpec {
  readonly kind: 'range';
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly initial: number;
}

export interface ToggleSpec {
  readonly kind: 'toggle';
  readonly label: string;
  readonly initial: boolean;
}

export interface ChoiceOption {
  readonly value: string;
  readonly label: string;
}

export interface ChoiceSpec {
  readonly kind: 'choice';
  readonly label: string;
  readonly options: readonly ChoiceOption[];
  readonly initial: string;
}

export type ParamSpec = RangeSpec | ToggleSpec | ChoiceSpec;
export type SpecSet = Readonly<Record<string, ParamSpec>>;
export type ParamValue = number | boolean | string;

type ValueOf<S extends ParamSpec> = S extends RangeSpec ? number : S extends ToggleSpec ? boolean : string;
export type Values<S extends SpecSet> = { -readonly [K in keyof S]: ValueOf<S[K]> };

export interface ParamGroup<S extends SpecSet = SpecSet> {
  readonly label: string;
  readonly specs: S;
  readonly values: Values<S>;
}

export function range(label: string, min: number, max: number, step: number, initial: number): RangeSpec {
  return { kind: 'range', label, min, max, step, initial };
}

export function toggle(label: string, initial: boolean): ToggleSpec {
  return { kind: 'toggle', label, initial };
}

export function choice(label: string, options: readonly ChoiceOption[], initial: string): ChoiceSpec {
  return { kind: 'choice', label, options, initial };
}

export function createGroup<S extends SpecSet>(label: string, specs: S): ParamGroup<S> {
  return { label, specs, values: initialValues(specs) };
}

function initialValues<S extends SpecSet>(specs: S): Values<S> {
  const values: Record<string, ParamValue> = {};
  for (const [key, spec] of Object.entries(specs)) values[key] = spec.initial;
  return values as Values<S>;
}

export function resetGroup(group: ParamGroup): void {
  Object.assign(group.values, initialValues(group.specs));
}

/** Writes one value, coerced and clamped to its spec. Unknown keys and
 *  mismatched kinds are ignored, so a stale preset can't corrupt a group. */
export function writeParam(group: ParamGroup, key: string, raw: ParamValue): void {
  const spec = group.specs[key];
  if (!spec) return;
  const values = group.values as Record<string, ParamValue>;
  if (spec.kind === 'range') {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) values[key] = Math.min(spec.max, Math.max(spec.min, parsed));
    return;
  }
  if (spec.kind === 'toggle') {
    values[key] = raw === true || raw === 'true';
    return;
  }
  if (spec.options.some((option) => option.value === raw)) values[key] = String(raw);
}
