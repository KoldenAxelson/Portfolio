// The character-creation module on /misc/dnd/character-creation/.
//
// Eight steps, one live ability strip, and a sheet at the end. It is a form, not
// a game: nothing here rolls dice, and every number on the strip is derivable by
// hand from the choices above it. That is the point — the module exists because
// the arithmetic (an array value, plus two human points, plus a feat, capped at
// 20) is exactly fiddly enough that people get it wrong on paper, not because
// character creation needed to be interactive.
//
// PROGRESSIVE ENHANCEMENT, and here that costs something. The static rules ship
// in the HTML and this hides them, the same swap the Dagea gazetteer does. So the
// no-script page is the complete rules and the scripted page is the walkthrough;
// neither is a degraded version of the other.
//
// THE STAGE IS RE-RENDERED WHOLE on every change. Eight small steps, none with
// more than about twenty controls, so diffing would be work spent to avoid work
// that is already imperceptible. The one exception is the two experience text
// fields: they write to state on `input` and do NOT trigger a render, because
// nothing downstream of them changes and rebuilding the stage on every keystroke
// would take the caret with it.

import { loadCharacter, saveCharacter } from './store';

type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

interface AbilityDef { key: AbilityKey; short: string; name: string; group: 'major' | 'minor' }
interface ArrayOption { key: string; values: number[]; label: string; note: string }
interface ArrayDef { label: string; note: string; options: ArrayOption[] }
interface SkillDef { name: string; ability: AbilityKey }
interface Boost { ability?: AbilityKey; choose?: string; amount: number; doubles_for_mental?: boolean; grants_save?: boolean }
interface FeatDef { name: string; origin: string; boost?: Boost }
interface StyleDef { name: string; grants?: number }

interface Config {
  abilities: AbilityDef[];
  arrays: { major: ArrayDef; minor: ArrayDef };
  human: { points: number; max_per_ability: number };
  skills: SkillDef[];
  skillsTotal: number;
  skillsFrom: { source: string; count: number }[];
  background: { boost: number; boost_from: AbilityKey[]; experiences: number; experience_examples: string[] };
  saves: { fixed: AbilityKey[]; choose_one: AbilityKey[] };
  hitPoints: { base: number };
  feats: FeatDef[];
  featPicks: number;
  styles: StyleDef[];
}

interface State {
  step: number;
  majorArray: string | null;
  minorArray: string | null;
  /** Which slot of the chosen array each ability holds. */
  slot: Partial<Record<AbilityKey, number>>;
  human: Partial<Record<AbilityKey, number>>;
  feats: string[];
  resilient: AbilityKey | null;
  skills: string[];
  bgAbility: AbilityKey | null;
  expertise: string | null;
  experiences: string[];
  style: string | null;
  save: AbilityKey | null;
}

const STEPS = [
  { id: 'majors', label: 'Majors' },
  { id: 'minors', label: 'Minors' },
  { id: 'human', label: 'Human' },
  { id: 'feats', label: 'Feats' },
  { id: 'skills', label: 'Skills' },
  { id: 'background', label: 'Background' },
  { id: 'style', label: 'Style' },
  { id: 'review', label: 'Review' },
];

const MENTAL: AbilityKey[] = ['int', 'wis', 'cha'];

function fresh(cfg: Config): State {
  return {
    step: 0,
    majorArray: null,
    minorArray: null,
    slot: {},
    human: {},
    feats: [],
    resilient: null,
    skills: [],
    bgAbility: null,
    expertise: null,
    experiences: new Array<string>(cfg.background.experiences).fill(''),
    style: null,
    save: null,
  };
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));
}

function modifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

function signed(n: number): string {
  return n >= 0 ? `+${n}` : String(n);
}

export function initBuilder(): void {
  const root = document.querySelector<HTMLElement>('[data-dnd-builder]');
  if (!root) return;

  const configEl = root.querySelector<HTMLScriptElement>('[data-dnd-config]');
  const stage = root.querySelector<HTMLElement>('[data-dnd-stage]');
  const stepsEl = root.querySelector<HTMLElement>('[data-dnd-steps]');
  const stripEl = root.querySelector<HTMLElement>('[data-dnd-strip]');
  const staticEl = root.querySelector<HTMLElement>('[data-dnd-static]');
  const moduleEl = root.querySelector<HTMLElement>('[data-dnd-module]');
  const backBtn = root.querySelector<HTMLButtonElement>('[data-dnd-back]');
  const nextBtn = root.querySelector<HTMLButtonElement>('[data-dnd-next]');
  if (!configEl || !stage || !stepsEl || !stripEl || !moduleEl) return;

  let cfg: Config;
  try {
    cfg = JSON.parse(configEl.textContent || '{}') as Config;
  } catch {
    return; // Leaves the static rules on the page, which is the right failure.
  }
  if (!cfg.abilities?.length) return;

  // The swap. Only now — a reader whose JavaScript failed keeps the full rules.
  if (staticEl) staticEl.hidden = true;
  moduleEl.hidden = false;

  const stored = loadCharacter<State>();
  const state: State = stored ? { ...fresh(cfg), ...stored } : fresh(cfg);
  // A stored step from an older layout would strand the reader on a blank stage.
  if (state.step < 0 || state.step >= STEPS.length) state.step = 0;

  const abilityOf = (key: AbilityKey): AbilityDef =>
    cfg.abilities.find((a) => a.key === key) as AbilityDef;
  const group = (g: 'major' | 'minor'): AbilityDef[] => cfg.abilities.filter((a) => a.group === g);
  const chosenArray = (g: 'major' | 'minor'): ArrayOption | null => {
    const key = g === 'major' ? state.majorArray : state.minorArray;
    return cfg.arrays[g].options.find((o) => o.key === key) ?? null;
  };

  // ── Derived numbers ─────────────────────────────────────────────────────
  /** What each feat adds, resolved against the campaign's mental-ability rule. */
  function featBoosts(): Partial<Record<AbilityKey, number>> {
    const out: Partial<Record<AbilityKey, number>> = {};
    for (const name of state.feats) {
      const feat = cfg.feats.find((f) => f.name === name);
      const boost = feat?.boost;
      if (!boost) continue;
      const target: AbilityKey | null = boost.ability ?? (boost.choose ? state.resilient : null);
      if (!target) continue;
      const doubled = boost.doubles_for_mental && MENTAL.indexOf(target) !== -1;
      out[target] = (out[target] ?? 0) + (doubled ? boost.amount * 2 : boost.amount);
    }
    return out;
  }

  function baseOf(key: AbilityKey): number | null {
    const slot = state.slot[key];
    if (slot === undefined) return null;
    const arr = chosenArray(abilityOf(key).group);
    return arr ? (arr.values[slot] ?? null) : null;
  }

  function scoreOf(key: AbilityKey): number | null {
    const base = baseOf(key);
    if (base === null) return null;
    const boosts = featBoosts();
    const bg = state.bgAbility === key ? cfg.background.boost : 0;
    // 20 is the ceiling, and it is a ceiling on the total rather than on any one
    // source — which is exactly what makes 17 + 2 + 1 legal and 17 + 2 + 2 not.
    return Math.min(20, base + (state.human[key] ?? 0) + (boosts[key] ?? 0) + bg);
  }

  const humanSpent = (): number =>
    cfg.abilities.reduce((n, a) => n + (state.human[a.key] ?? 0), 0);

  // ── Chrome ──────────────────────────────────────────────────────────────
  function paintSteps(): void {
    stepsEl!.innerHTML = STEPS.map((s, i) => `
      <li>
        <button type="button" class="dnd-step" data-dnd-goto="${i}"
                aria-current="${i === state.step ? 'step' : 'false'}"
                data-done="${i < state.step}">
          <span class="dnd-step__n">${i + 1}</span>
          <span class="dnd-step__label">${esc(s.label)}</span>
        </button>
      </li>`).join('');
  }

  function paintStrip(): void {
    const cells = cfg.abilities.map((a) => {
      const score = scoreOf(a.key);
      const shown = score === null ? '—' : String(score);
      const mod = score === null ? '' : signed(modifier(score));
      return `
        <div class="dnd-ab" data-set="${score !== null}">
          <span class="dnd-ab__k">${a.short}</span>
          <span class="dnd-ab__v">${shown}</span>
          <span class="dnd-ab__m">${mod}</span>
        </div>`;
    }).join('');
    const con = scoreOf('con');
    const hp = con === null ? '—' : String(cfg.hitPoints.base + modifier(con));
    stripEl!.innerHTML = `${cells}
      <div class="dnd-ab dnd-ab--hp" data-set="${con !== null}">
        <span class="dnd-ab__k">HP</span>
        <span class="dnd-ab__v">${hp}</span>
        <span class="dnd-ab__m">lvl 1</span>
      </div>`;
  }

  // ── Steps ───────────────────────────────────────────────────────────────
  function arrayStep(g: 'major' | 'minor'): string {
    const def = cfg.arrays[g];
    const picked = g === 'major' ? state.majorArray : state.minorArray;
    const arr = chosenArray(g);
    const cards = def.options.map((o) => `
      <button type="button" class="dnd-pick" aria-pressed="${o.key === picked}" data-dnd-array="${g}:${o.key}">
        <span class="dnd-pick__title">${esc(o.label)}</span>
        <span class="dnd-pick__note">${esc(o.note)}</span>
      </button>`).join('');

    if (!arr) {
      return `<h3 class="dnd-subhead">${esc(def.label)}</h3>
        <p class="dnd-subhead__note">${esc(def.note)} Pick an array; you assign the numbers next.</p>
        <div class="dnd-picks">${cards}</div>`;
    }

    const flat = arr.values.every((v) => v === arr.values[0]);
    const rows = group(g).map((a) => {
      const held = state.slot[a.key];
      const chips = arr.values.map((v, i) => `
        <button type="button" class="dnd-num" aria-pressed="${held === i}" data-dnd-slot="${a.key}:${i}">${v}</button>`).join('');
      return `<div class="dnd-assign__row">
        <span class="dnd-assign__name">${esc(a.name)}</span>
        <span class="dnd-assign__nums">${chips}</span>
      </div>`;
    }).join('');

    return `<h3 class="dnd-subhead">${esc(def.label)}</h3>
      <p class="dnd-subhead__note">${esc(def.note)}</p>
      <div class="dnd-picks">${cards}</div>
      <h4 class="dnd-minihead">Assign them</h4>
      <p class="dnd-subhead__note">${flat
        ? 'All three are the same, so there is nothing to decide here — but the rows are live if you switch arrays.'
        : 'Tap a number to move it. Whoever had it takes yours.'}</p>
      <div class="dnd-assign">${rows}</div>`;
  }

  function humanStep(): string {
    const left = cfg.human.points - humanSpent();
    const rows = cfg.abilities.map((a) => {
      const n = state.human[a.key] ?? 0;
      const base = baseOf(a.key);
      return `<div class="dnd-assign__row">
        <span class="dnd-assign__name">${esc(a.name)}<span class="dnd-assign__base">${base === null ? 'unassigned' : `base ${base}`}</span></span>
        <span class="dnd-assign__nums">
          <button type="button" class="dnd-num dnd-num--step" data-dnd-human="${a.key}:-1" ${n === 0 ? 'disabled' : ''} aria-label="Remove a point from ${esc(a.name)}">&minus;</button>
          <span class="dnd-assign__count" aria-live="polite">${signed(n)}</span>
          <button type="button" class="dnd-num dnd-num--step" data-dnd-human="${a.key}:1" ${left === 0 || n >= cfg.human.max_per_ability ? 'disabled' : ''} aria-label="Add a point to ${esc(a.name)}">+</button>
        </span>
      </div>`;
    }).join('');
    return `<h3 class="dnd-subhead">Human</h3>
      <p class="dnd-subhead__note">Two points, one ability score each. Both may go on the same
        ability — that is the intended way to reach a 20 at 1st level, and it is allowed on purpose.</p>
      <p class="dnd-budget"><strong>${left}</strong> of ${cfg.human.points} left</p>
      <div class="dnd-assign">${rows}</div>`;
  }

  function featsStep(): string {
    const left = cfg.featPicks - state.feats.length;
    const cards = cfg.feats.map((f) => {
      const on = state.feats.indexOf(f.name) !== -1;
      const full = !on && left === 0;
      return `<button type="button" class="dnd-pick" aria-pressed="${on}" data-dnd-feat="${esc(f.name)}" ${full ? 'disabled' : ''}>
        <span class="dnd-pick__title">${esc(f.name)}</span>
        <span class="dnd-pick__note">${f.boost ? esc(f.boost.ability ? `+${f.boost.amount} ${abilityOf(f.boost.ability).name}` : 'Raises an ability you choose') : 'No ability change'}</span>
      </button>`;
    }).join('');

    // The chooser only exists when a chosen feat asks a question. Rendering it
    // greyed-out the rest of the time would imply the choice is always pending.
    const asks = state.feats
      .map((n) => cfg.feats.find((f) => f.name === n))
      .find((f) => f?.boost?.choose);
    let chooser = '';
    if (asks) {
      const chips = cfg.abilities.map((a) => {
        const doubled = asks.boost?.doubles_for_mental && MENTAL.indexOf(a.key) !== -1;
        const amount = doubled ? (asks.boost?.amount ?? 1) * 2 : (asks.boost?.amount ?? 1);
        return `<button type="button" class="dnd-num dnd-num--wide" aria-pressed="${state.resilient === a.key}" data-dnd-resilient="${a.key}">
          ${a.short} <span class="dnd-num__sub">+${amount}</span></button>`;
      }).join('');
      chooser = `<h4 class="dnd-minihead">${esc(asks.name)} — which ability?</h4>
        <p class="dnd-subhead__note">You also gain proficiency in that ability's saving throws.
          Intelligence, Wisdom and Charisma are worth double under the campaign rule.</p>
        <div class="dnd-nums">${chips}</div>`;
    }

    return `<h3 class="dnd-subhead">Feats</h3>
      <p class="dnd-subhead__note">Three, from the allow-list. This is where a 19 becomes a 20.</p>
      <p class="dnd-budget"><strong>${left}</strong> of ${cfg.featPicks} left</p>
      <div class="dnd-picks">${cards}</div>${chooser}`;
  }

  function skillsStep(): string {
    const left = cfg.skillsTotal - state.skills.length;
    const from = cfg.skillsFrom.map((s) => `${s.count} from ${esc(s.source)}`).join(', ');
    const chips = cfg.skills.map((s) => {
      const on = state.skills.indexOf(s.name) !== -1;
      const full = !on && left === 0;
      return `<button type="button" class="dnd-num dnd-num--wide" aria-pressed="${on}" data-dnd-skill="${esc(s.name)}" ${full ? 'disabled' : ''}>
        ${esc(s.name)} <span class="dnd-num__sub">${abilityOf(s.ability).short}</span></button>`;
    }).join('');
    return `<h3 class="dnd-subhead">Skills</h3>
      <p class="dnd-subhead__note">${esc(from)} — ${cfg.skillsTotal} in total, and they all come out of one pool.</p>
      <p class="dnd-budget"><strong>${left}</strong> of ${cfg.skillsTotal} left</p>
      <div class="dnd-nums">${chips}</div>`;
  }

  function backgroundStep(): string {
    const abilityChips = cfg.background.boost_from.map((k) => `
      <button type="button" class="dnd-num dnd-num--wide" aria-pressed="${state.bgAbility === k}" data-dnd-bg="${k}">
        ${esc(abilityOf(k).name)} <span class="dnd-num__sub">+${cfg.background.boost}</span></button>`).join('');

    let expertise = '';
    if (state.bgAbility) {
      const under = cfg.skills.filter((s) => s.ability === state.bgAbility);
      const chips = under.map((s) => `
        <button type="button" class="dnd-num dnd-num--wide" aria-pressed="${state.expertise === s.name}" data-dnd-expertise="${esc(s.name)}">${esc(s.name)}</button>`).join('');
      expertise = `<h4 class="dnd-minihead">Double proficiency</h4>
        <p class="dnd-subhead__note">One skill under ${esc(abilityOf(state.bgAbility).name)}. You are proficient in it whether or not you spent a skill pick on it.</p>
        <div class="dnd-nums">${chips}</div>`;
    }

    const ex = state.experiences.map((v, i) => {
      const placeholder = cfg.background.experience_examples[i % cfg.background.experience_examples.length] ?? '';
      return `<label class="dnd-field">
        <span class="dnd-field__label">Experience ${i + 1}</span>
        <input type="text" class="dnd-input" data-dnd-exp="${i}" value="${esc(v)}" placeholder="${esc(placeholder)}" autocomplete="off" />
      </label>`;
    }).join('');

    return `<h3 class="dnd-subhead">Background</h3>
      <p class="dnd-subhead__note">Pick a mental ability to raise, a skill to be twice as good at, and two things you have done with your life.</p>
      <div class="dnd-nums">${abilityChips}</div>
      ${expertise}
      <h4 class="dnd-minihead">Experiences</h4>
      <p class="dnd-subhead__note">There are no tool or language proficiencies in this game. These two lines
        replace them. Write anything — a trade, a posting, a disgrace — and when it plausibly bears on a roll,
        argue for it: proficiency if you don't have the skill, advantage if you do.</p>
      <div class="dnd-fields">${ex}</div>`;
  }

  function styleStep(): string {
    const cards = cfg.styles.map((s) => `
      <button type="button" class="dnd-pick" aria-pressed="${state.style === s.name}" data-dnd-style="${esc(s.name)}">
        <span class="dnd-pick__title">${esc(s.name)}</span>
        ${s.grants ? `<span class="dnd-pick__note">Grants ${s.grants} maneuver${s.grants > 1 ? 's' : ''}</span>` : ''}
      </button>`).join('');
    const saveChips = cfg.saves.choose_one.map((k) => `
      <button type="button" class="dnd-num dnd-num--wide" aria-pressed="${state.save === k}" data-dnd-save="${k}">${esc(abilityOf(k).name)}</button>`).join('');
    return `<h3 class="dnd-subhead">Fighting Style</h3>
      <p class="dnd-subhead__note">One at 1st level. Battle Tested gives you a second at 7th.</p>
      <div class="dnd-picks">${cards}</div>
      <h4 class="dnd-minihead">Saving throws</h4>
      <p class="dnd-subhead__note">Constitution is fixed. The other one is yours.</p>
      <div class="dnd-nums">${saveChips}</div>`;
  }

  function reviewStep(): string {
    const rows = cfg.abilities.map((a) => {
      const score = scoreOf(a.key);
      return `<tr><td>${esc(a.name)}</td><td>${score ?? '—'}</td><td>${score === null ? '—' : signed(modifier(score))}</td></tr>`;
    }).join('');

    const missing: string[] = [];
    if (!state.majorArray) missing.push('a major array');
    if (!state.minorArray) missing.push('a minor array');
    if (humanSpent() < cfg.human.points) missing.push('your human points');
    if (state.feats.length < cfg.featPicks) missing.push('three feats');
    if (state.skills.length < cfg.skillsTotal) missing.push(`${cfg.skillsTotal} skills`);
    if (!state.bgAbility) missing.push('a background ability');
    if (!state.style) missing.push('a fighting style');
    if (!state.save) missing.push('a saving throw');

    const todo = missing.length
      ? `<p class="dnd-todo">Still open: ${esc(missing.join(', '))}.</p>`
      : '';

    const list = (label: string, items: string[]): string =>
      `<div class="dnd-sheet__row"><span class="dnd-sheet__k">${esc(label)}</span><span class="dnd-sheet__v">${items.length ? esc(items.join(', ')) : '—'}</span></div>`;

    const con = scoreOf('con');
    // Deduplicated by ability, not by label. Resilient on the ability you already
    // picked for your class save is legal and wasteful, and listing "Dexterity,
    // Dexterity (Resilient)" made it look like two things instead of one mistake.
    const saveKeys: AbilityKey[] = [...cfg.saves.fixed];
    if (state.save) saveKeys.push(state.save);
    const resilientSaves = state.resilient
      && state.feats.some((n) => cfg.feats.find((f) => f.name === n)?.boost?.grants_save);
    if (resilientSaves && state.resilient) saveKeys.push(state.resilient);
    const saves = saveKeys
      .filter((k, i) => saveKeys.indexOf(k) === i)
      .map((k) => abilityOf(k).name);
    const wasted = resilientSaves && state.resilient
      && saveKeys.indexOf(state.resilient) !== saveKeys.lastIndexOf(state.resilient);

    return `<h3 class="dnd-subhead">Your character</h3>
      ${todo}
      <table class="dnd-table dnd-table--sheet">
        <thead><tr><th scope="col">Ability</th><th scope="col">Score</th><th scope="col">Mod</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="dnd-sheet">
        ${list('Hit points', con === null ? [] : [`${cfg.hitPoints.base + modifier(con)} at 1st level`])}
        ${list('Saving throws', saves)}
        ${wasted ? `<div class="dnd-sheet__row"><span class="dnd-sheet__k"></span><span class="dnd-sheet__v dnd-sheet__warn">Resilient duplicates a save you already had — the +1 still counts, the proficiency does not.</span></div>` : ''}
        ${list('Skills', state.skills)}
        ${list('Expertise', state.expertise ? [state.expertise] : [])}
        ${list('Experiences', state.experiences.filter(Boolean))}
        ${list('Feats', state.feats)}
        ${list('Fighting Style', state.style ? [state.style] : [])}
      </div>
      <div class="dnd-review__acts">
        <button type="button" class="dnd-act" data-dnd-copy-sheet>Copy</button>
        <button type="button" class="dnd-act" data-dnd-restart>Start over</button>
      </div>`;
  }

  function stageHTML(): string {
    switch (STEPS[state.step]?.id) {
      case 'majors': return arrayStep('major');
      case 'minors': return arrayStep('minor');
      case 'human': return humanStep();
      case 'feats': return featsStep();
      case 'skills': return skillsStep();
      case 'background': return backgroundStep();
      case 'style': return styleStep();
      default: return reviewStep();
    }
  }

  function render(): void {
    paintSteps();
    paintStrip();
    stage!.innerHTML = stageHTML();
    if (backBtn) backBtn.disabled = state.step === 0;
    if (nextBtn) {
      nextBtn.disabled = state.step === STEPS.length - 1;
      nextBtn.textContent = state.step === STEPS.length - 2 ? 'Review' : 'Next';
    }
    saveCharacter(state);
  }

  function go(step: number): void {
    state.step = Math.max(0, Math.min(STEPS.length - 1, step));
    render();
    // The strip is the anchor: after a step change the reader should be looking
    // at the numbers their last choice moved, not at wherever they had scrolled.
    stripEl!.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  /** Give `key` the array slot `slot`, handing whatever it held to the displaced ability. */
  function assignSlot(key: AbilityKey, slot: number): void {
    const g = abilityOf(key).group;
    const previous = state.slot[key];
    for (const a of group(g)) {
      if (a.key !== key && state.slot[a.key] === slot) state.slot[a.key] = previous;
    }
    state.slot[key] = slot;
  }

  function chooseArray(g: 'major' | 'minor', key: string): void {
    if (g === 'major') state.majorArray = key;
    else state.minorArray = key;
    // Seed the assignment in the order the abilities are listed. Every row is
    // filled from the moment an array is chosen, so the assignment UI only ever
    // has to model a swap — never "this one is empty".
    group(g).forEach((a, i) => { state.slot[a.key] = i; });
  }

  // ── Wiring ──────────────────────────────────────────────────────────────
  root.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest('button');
    if (!(button instanceof HTMLButtonElement) || button.disabled) return;

    const d = button.dataset;

    if (d.dndGoto !== undefined) { go(Number(d.dndGoto)); return; }
    if (d.dndBack !== undefined) { go(state.step - 1); return; }
    if (d.dndNext !== undefined) { go(state.step + 1); return; }

    if (d.dndArray) {
      const [g, key] = d.dndArray.split(':');
      chooseArray(g as 'major' | 'minor', key as string);
    } else if (d.dndSlot) {
      const [key, slot] = d.dndSlot.split(':');
      assignSlot(key as AbilityKey, Number(slot));
    } else if (d.dndHuman) {
      const [key, delta] = d.dndHuman.split(':');
      const k = key as AbilityKey;
      const next = (state.human[k] ?? 0) + Number(delta);
      const room = cfg.human.points - humanSpent() + (state.human[k] ?? 0);
      state.human[k] = Math.max(0, Math.min(cfg.human.max_per_ability, Math.min(room, next)));
    } else if (d.dndFeat) {
      const at = state.feats.indexOf(d.dndFeat);
      if (at === -1) {
        if (state.feats.length < cfg.featPicks) state.feats.push(d.dndFeat);
      } else {
        state.feats.splice(at, 1);
        // Dropping the feat that asked the question drops the answer with it.
        const stillAsks = state.feats.some((n) => cfg.feats.find((f) => f.name === n)?.boost?.choose);
        if (!stillAsks) state.resilient = null;
      }
    } else if (d.dndResilient) {
      state.resilient = d.dndResilient as AbilityKey;
    } else if (d.dndSkill) {
      const at = state.skills.indexOf(d.dndSkill);
      if (at === -1) {
        if (state.skills.length < cfg.skillsTotal) state.skills.push(d.dndSkill);
      } else {
        state.skills.splice(at, 1);
      }
    } else if (d.dndBg) {
      state.bgAbility = d.dndBg as AbilityKey;
      // Expertise is scoped to the chosen ability, so changing the ability
      // invalidates it rather than silently keeping a skill from the old one.
      const still = cfg.skills.find((s) => s.name === state.expertise);
      if (!still || still.ability !== state.bgAbility) state.expertise = null;
    } else if (d.dndExpertise) {
      state.expertise = state.expertise === d.dndExpertise ? null : d.dndExpertise;
    } else if (d.dndStyle) {
      state.style = state.style === d.dndStyle ? null : d.dndStyle;
    } else if (d.dndSave) {
      state.save = d.dndSave as AbilityKey;
    } else if (d.dndRestart !== undefined) {
      Object.assign(state, fresh(cfg));
    } else if (d.dndCopySheet !== undefined) {
      copySheet(button);
      return;
    } else {
      return;
    }
    render();
  });

  root.addEventListener('input', (event) => {
    const el = event.target;
    if (!(el instanceof HTMLInputElement) || el.dataset.dndExp === undefined) return;
    const i = Number(el.dataset.dndExp);
    state.experiences[i] = el.value;
    saveCharacter(state);
    // Not a re-render: nothing downstream of an experience field changes, and
    // rebuilding the stage on every keystroke would fight the caret for no gain.
  });

  function copySheet(button: HTMLButtonElement): void {
    const lines: string[] = ['Dagean Fighter (Warlord), 1st level', ''];
    for (const a of cfg.abilities) {
      const score = scoreOf(a.key);
      lines.push(`${a.short} ${score ?? '—'}${score === null ? '' : ` (${signed(modifier(score))})`}`);
    }
    const con = scoreOf('con');
    lines.push('');
    if (con !== null) lines.push(`HP ${cfg.hitPoints.base + modifier(con)}`);
    if (state.save) lines.push(`Saves: Constitution, ${abilityOf(state.save).name}`);
    if (state.skills.length) lines.push(`Skills: ${state.skills.join(', ')}`);
    if (state.expertise) lines.push(`Expertise: ${state.expertise}`);
    const ex = state.experiences.filter(Boolean);
    if (ex.length) lines.push(`Experiences: ${ex.join(', ')}`);
    if (state.feats.length) lines.push(`Feats: ${state.feats.join(', ')}`);
    if (state.style) lines.push(`Fighting Style: ${state.style}`);

    const label = button.textContent || 'Copy';
    const done = (ok: boolean): void => {
      button.textContent = ok ? 'Copied' : 'Press ⌘C';
      window.setTimeout(() => { button.textContent = label; }, 1600);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(lines.join('\n')).then(() => done(true), () => done(false));
    } else {
      done(false);
    }
  }

  render();
}
