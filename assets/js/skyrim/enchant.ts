// The "how strong can this enchantment get" calculator on /misc/skyrim/.
//
// Tick the tricks you have, get the number, and — the point of the thing — see what
// each one is actually worth, because they are not close to equal.
//
// ── THE FORMULA ─────────────────────────────────────────────────────────────
//   mag = floor( BaseMag × skillMult × (1 + Enchanter) × (1 + categoryPerk) × mults )
//
//   skillMult = 1 + x(x − 0.14)/3.4     where  x = (Skill + skillBonuses) × (1 + potion/100) / 100
//
//   THE LOAD-BEARING DETAIL, and the reason this module exists: a Fortify Enchanting
//   potion does NOT multiply the finished enchantment. It scales your effective SKILL
//   inside a quadratic. So the potion is worth wildly more than any of the flat +10%
//   and +25% multipliers once it gets large, and anything that adds SKILL POINTS
//   rather than a percentage lands in the same privileged spot.
//
//   Everything else is a plain outer multiplier and they compose in any order:
//   Enchanter 5/5 is ×2, a category perk is ×1.25, Seeker of Sorcery ×1.1, Necromage
//   on a vampire ×1.25.
//
// ── THE FAIR LOOP, WHICH IS WHERE MOST OF THE NUMBER COMES FROM ────────────
//   No glitch, no Restoration exploit, nothing the game did not intend: brew the best
//   Fortify Enchanting potion you can, use it to place better Fortify Alchemy gear, and
//   that gear brews a better potion. Repeat.
//
//     potion = potionBase × 4 × (1 + Alchemy/200) × (1 + Alchemist) × (1 + Benefactor)
//                        × alchemyMults × (1 + gear/100)
//     gear   = pieces × floor(the Fortify Alchemy you can now place)
//
//   It CONVERGES, because each pass adds less than the last — which is why it is fair
//   and the Restoration loop is not. Plain, it settles on 29% gear pieces and a 32.4%
//   potion, and those are UESP's own documented figures. With the Anniversary
//   ingredients and Necromage it settles far higher (4 slots, base-8 with Insightful):
//
//     plain                          29% a piece,   32.4% potion,  places 29.2%
//     + Seeker of Shadows            29%,           35.6%,         places 29.7%
//     + Seeker of Sorcery            32%,           34.2%,         places 32.4%
//     + Dreugh Wax (×2 base)         35%,           72.0%,         places 36.0%
//     + Necromage                    39%,           48.0%,         places 39.6%
//     Dreugh + Necromage             60%,          127.5%,         places 60.7%
//     + Sorcery as well              74%,          148.5%,         places 74.6%
//     everything, Ahzidal too        97%,          183.0%,         places 98.0%
//     everything on FIVE slots       runaway — no fixed point, and no glitch involved
//
//   BOTH SEEKER BOONS COMPOUND, which is not obvious and cost this file a wrong claim.
//   Shadows is inside the loop, so it makes a better potion. But Sorcery boosts EVERY
//   enchantment you place — including the Fortify Alchemy gear the loop is building —
//   so it compounds too, and by more: 74.6% against 70.8% on the same setup. Only one
//   can be held at a time, and the module enforces that.
//
// ── ACCURACY ────────────────────────────────────────────────────────────────
//   The formula is the same one the resto planner uses, which reproduces UESP's anchors
//   exactly (15% bare potion, 25.06% natural cap on a base-8 enchantment) and has been
//   confirmed in game end to end at 235% and at 9,831%. The fair loop lands on UESP's
//   documented 29%-gear / 32%-potion pair on its own, which is a real check on it rather
//   than a fitted one.
//
//   The 0.14 and 3.4 are UESP's empirical fit rather than extracted engine values, so
//   the last digit is soft. USSEP changes the potion into a flat outer multiplier and
//   removes the Necromage interaction, so none of this applies if you run it.
//
//   Ahzidal's Genius is the one number here that is not nailed down — see
//   data/skyrim/enchant-tricks.yaml. It is rendered with a warning rather than
//   quietly folded in.

import { debounce, escapeHtml, findField, formatNumber, formatWhole, queryAll, readFlag, readNumber, setUpConfigPanel } from './util';

export interface Trick {
  id: string;
  label: string;
  note: string;
  /**
   * Which half of the chain it lands on. BOTH sides compound through the fair loop:
   * "alchemy" by brewing a stronger potion, "enchant" by strengthening every enchantment
   * placed — INCLUDING the Fortify Alchemy gear the loop is building. Assuming "enchant"
   * applies once at the end is the specific error this module already shipped and fixed;
   * it is why Sorcery (74.6%) beats Shadows (70.8%) on the same build.
   *
   * Honoured only for `kind: "mult"`. A `skill` trick is always Enchanting skill and a
   * `potionbase` trick always multiplies the potion, whatever `side` says.
   */
  side: 'enchant' | 'alchemy' | 'both';
  kind: 'mult' | 'skill' | 'potionbase';
  value: number;
  excludes: string[];
  dlc: string;
  sure: boolean;
}

export interface MaxSettings {
  enchanting: number;
  enchanter: number;
  baseMagnitude: number;
  categoryPerk: boolean;
  /** Used when `fairLoop` is off — whatever potion you can actually get. */
  potionPercent: number;
  /** Work the potion out by running the fair alchemy/enchanting loop to its fixed point. */
  fairLoop: boolean;
  alchemy: number;
  alchemist: number;
  benefactor: boolean;
  pieces: number;
  /** Ticked trick ids. */
  active: Set<string>;
}

export interface FairLoop {
  /** The Fortify Enchanting potion it settles on. */
  potionPercent: number;
  /** Fortify Alchemy per piece, floored as the game does. */
  piecePercent: number;
  gearPercent: number;
  rounds: number;
  /** True when there is no fixed point — the fair loop runs away on its own. */
  runaway: boolean;
}

/** One line of the breakdown: what a lever is worth, in place. */
export interface Contribution {
  label: string;
  detail: string;
  /** Magnitude with this lever off, everything else as configured. */
  without: number;
  /** What having it is worth, in points of enchantment. */
  worth: number;
  sure: boolean;
}

export interface MaxResult {
  magnitude: number;
  reads: number;
  effectiveSkill: number;
  contributions: Contribution[];
}

/** Total skill points added by the ticked tricks. */
function skillBonus(tricks: Trick[], active: Set<string>): number {
  return tricks
    .filter((trick) => trick.kind === 'skill' && active.has(trick.id))
    .reduce((total, trick) => total + trick.value, 0);
}

/** Product of the ticked flat multipliers landing on one side of the chain. */
function multiplier(tricks: Trick[], active: Set<string>, side: 'enchant' | 'alchemy'): number {
  return tricks
    .filter((trick) => trick.kind === 'mult' && active.has(trick.id))
    .filter((trick) => trick.side === side || trick.side === 'both')
    .reduce((total, trick) => total * trick.value, 1);
}

/** The potion's base magnitude — 1 for plain carriers, doubled by Dreugh Wax. */
function potionBase(tricks: Trick[], active: Set<string>): number {
  return tricks
    .filter((trick) => trick.kind === 'potionbase' && active.has(trick.id))
    .reduce((total, trick) => total * trick.value, 1);
}

/** The Fortify Enchanting potion a given summed Fortify Alchemy brews, as a percent. */
function potionFrom(s: MaxSettings, tricks: Trick[], gearPercent: number): number {
  return (
    potionBase(tricks, s.active) *
    4 *
    (1 + s.alchemy / 200) *
    (1 + gearPercent / 100) *
    (1 + (s.alchemist * 20) / 100) *
    (1 + (s.benefactor ? 25 : 0) / 100) *
    multiplier(tricks, s.active, 'alchemy')
  );
}

/**
 * Run the fair loop to its fixed point.
 *
 * Each pass places the best Fortify Alchemy it can and wears it to brew the next potion.
 * Normally each pass adds less than the last and it settles — that is what makes this
 * fair rather than an exploit. With enough levers on enough slots it stops settling, and
 * `runaway` says so rather than returning a number off a truncated iteration.
 */
export function fairLoop(s: MaxSettings, tricks: Trick[]): FairLoop {
  // The gear this loop places is always Fortify Alchemy, whatever effect the picker is
  // pointed at — so it takes base magnitude 8 and the Insightful Enchanter perk regardless
  // of the selected effect's own base and perk. DELIBERATE, and worth knowing: with
  // Fortify Alchemy selected the perk checkbox is literally "Insightful Enchanter", and
  // unticking it will not move the loop. Change this and every published figure in the
  // header table, the page prose and the self-check moves with it.
  const alchemySide: MaxSettings = { ...s, baseMagnitude: 8, categoryPerk: true };
  let gearPercent = 0;
  let potionPercent = 0;
  let piecePercent = 0;
  for (let round = 1; round <= 200; round++) {
    potionPercent = potionFrom(s, tricks, gearPercent);
    const placeable = magnitudeOf({ ...alchemySide, potionPercent, fairLoop: false }, tricks);
    if (!Number.isFinite(placeable) || placeable > 1e9) {
      return { potionPercent, piecePercent, gearPercent, rounds: round, runaway: true };
    }
    // The game floors what you place, so the loop walks integers.
    piecePercent = Math.floor(placeable);
    const next = Math.max(1, Math.round(s.pieces)) * piecePercent;
    if (next <= gearPercent) return { potionPercent, piecePercent, gearPercent, rounds: round, runaway: false };
    gearPercent = next;
  }
  return { potionPercent, piecePercent, gearPercent, rounds: 200, runaway: true };
}

/** The potion this configuration actually has, fair loop or hand-entered. */
function potionFor(s: MaxSettings, tricks: Trick[]): number {
  if (!s.fairLoop) return s.potionPercent;
  const loop = fairLoop(s, tricks);
  return loop.runaway ? Infinity : loop.potionPercent;
}

export function magnitudeOf(s: MaxSettings, tricks: Trick[]): number {
  const potionPercent = potionFor(s, tricks);
  const skill = s.enchanting + skillBonus(tricks, s.active);
  const x = (skill * (1 + potionPercent / 100)) / 100;
  return (
    s.baseMagnitude *
    (1 + (x * (x - 0.14)) / 3.4) *
    (1 + s.enchanter * 0.2) *
    (s.categoryPerk ? 1.25 : 1) *
    multiplier(tricks, s.active, 'enchant')
  );
}

/**
 * The number, plus what each lever is worth WITH THE OTHERS STILL ON.
 *
 * Deliberately not "this trick multiplies by 1.1": because the potion sits inside a
 * quadratic, the same +10% is worth a couple of points on a bare character and
 * hundreds on a looped one. The only honest way to show it is to turn each lever off
 * in place and report the difference.
 */
export function maximise(s: MaxSettings, tricks: Trick[]): MaxResult {
  const magnitude = magnitudeOf(s, tricks);
  const skill = s.enchanting + skillBonus(tricks, s.active);
  const contributions: Contribution[] = [];

  const drop = (label: string, detail: string, sure: boolean, changed: Partial<MaxSettings>): void => {
    const without = magnitudeOf({ ...s, ...changed }, tricks);
    contributions.push({ label, detail, without, worth: magnitude - without, sure });
  };

  const potionPercent = potionFor(s, tricks);
  if (potionPercent > 0) {
    drop('Fortify Enchanting potion',
      `${formatNumber(potionPercent)}% — scales your skill inside the quadratic`,
      true, { potionPercent: 0, fairLoop: false });
  }
  if (s.enchanter > 0) {
    drop(`Enchanter ${s.enchanter}/5`, `+${s.enchanter * 20}% on the finished enchantment`, true, { enchanter: 0 });
  }
  if (s.categoryPerk) {
    drop('Category perk', '+25% — Insightful, Corpus, or Fire / Frost / Storm', true, { categoryPerk: false });
  }
  for (const trick of tricks) {
    if (!s.active.has(trick.id)) continue;
    const active = new Set(s.active);
    active.delete(trick.id);
    // Naming the side is the whole point of the row: it is what tells you why two
    // identical +10% levers are not worth the same.
    const through = s.fairLoop ? ' — compounds through the loop' : '';
    const detail = trick.kind === 'skill'
      ? `+${trick.value} Enchanting skill, inside the quadratic`
      : trick.kind === 'potionbase'
        ? `×${trick.value} on the potion's base magnitude, before any alchemist multiplier${through}`
        : trick.side === 'both'
          ? `×${trick.value} on potions AND enchantments${s.fairLoop ? ' — compounds on both sides' : ''}`
          : trick.side === 'alchemy'
            ? `×${trick.value} on every potion you brew${through}`
            : `×${trick.value} on every enchantment you place${s.fairLoop ? ', the loop\'s gear included' : ''}`;
    drop(trick.label, detail, trick.sure, { active });
  }

  contributions.sort((a, b) => b.worth - a.worth);
  // The skill the quadratic actually sees, potion included — quoting the raw 100 next
  // to a 511% potion suggests the potion is doing something else, which is the exact
  // confusion this module exists to clear up.
  const effectiveSkill = skill * (1 + potionPercent / 100);
  return { magnitude, reads: Math.floor(magnitude), effectiveSkill, contributions };
}

// ── Rendering ───────────────────────────────────────────────────────────────

function resultMarkup(result: MaxResult, potionPercent: number, loop: FairLoop | null): string {
  const rows = result.contributions.map((contribution) => {
    const share = result.magnitude > 0 ? (contribution.worth / result.magnitude) * 100 : 0;
    return (
      `<li class="sky-worth${contribution.sure ? '' : ' is-unsure'}">` +
      `<span class="sky-worth__bar" style="--w:${Math.max(0, Math.min(100, share)).toFixed(1)}%"></span>` +
      `<b>${escapeHtml(contribution.label)}</b>` +
      `<span class="sky-worth__gain">+${formatNumber(contribution.worth)}<i>%</i></span>` +
      `<em>${escapeHtml(contribution.detail)}${contribution.sure ? '' : ' · not confirmed'}</em>` +
      // The visible text is the number alone — the line above the list says what the
      // column is, and repeating "without it:" down fifteen rows is the label winning an
      // argument with the data. The accessible name keeps it, since a screen reader
      // arrives at the row without having the column heading in view.
      `<span class="sky-worth__without"><span class="sky-sr">without it: </span>${formatNumber(contribution.without)}%</span>` +
      `</li>`
    );
  }).join('');

  const unsure = result.contributions.some((contribution) => !contribution.sure);
  const loopLine = loop
    ? loop.runaway
      ? `<p class="sky-plan__note">The fair loop has <b>no fixed point</b> with these levers on this many slots — each pass makes better gear than the last, forever, with no Restoration glitch involved. There is no maximum to report.</p>`
      : `<p class="sky-plan__count">The fair loop settles after <b>${loop.rounds}</b> passes at ` +
        `<b>${formatNumber(loop.piecePercent)}%</b> Fortify Alchemy a piece — ` +
        `<b>${formatNumber(loop.gearPercent)}%</b> worn, brewing a ` +
        `<b>${formatNumber(loop.potionPercent)}%</b> Fortify Enchanting potion.</p>`
    : '';
  if (loop && loop.runaway) return loopLine;
  return [
    `<h3 class="sky-plan__head">Strongest this enchantment gets</h3>`,
    `<p class="sky-plan__value">${formatNumber(result.magnitude)}<i>%</i></p>`,
    // aria-hidden on the dividers: decorative separators between metadata fields, and the
    // only text here under the contrast floor — deliberately, since they are punctuation
    // rather than words. Same treatment as the resto planner's.
    // Spans so each field wraps as a unit; same as the resto planner's meta row.
    `<p class="sky-plan__meta"><span>reads <b>${formatWhole(result.reads)}%</b> in game</span><i aria-hidden="true">·</i>`,
    `<span>effective skill <b>${formatWhole(result.effectiveSkill)}</b></span>`,
    potionPercent > 0 ? `<i aria-hidden="true">·</i><span>×<b>${formatNumber(1 + potionPercent / 100)}</b> from the potion</span>` : '',
    `</p>`,
    loopLine,
    `<p class="sky-plan__count">What each is worth with everything else on, and what you would place without it:</p>`,
    `<ul class="sky-worths">${rows}</ul>`,
    unsure ? `<p class="sky-plan__note">Rows marked <em>not confirmed</em> use a number this page is not sure of — see data/skyrim/enchant-tricks.yaml for what is in doubt.</p>` : '',
  ].join('');
}

// ── Wiring ──────────────────────────────────────────────────────────────────

export function initEnchantMax(): void {
  for (const root of queryAll<HTMLElement>(document, '[data-enchant-max]')) setUp(root);
}

function setUp(root: HTMLElement): void {
  const output = root.querySelector<HTMLElement>('[data-enchant-out]');
  const status = root.querySelector<HTMLElement>('[data-enchant-status]');
  const payload = root.querySelector('[data-tricks]');
  const picker = findField(root, 'effect');
  const perkLabel = root.querySelector<HTMLElement>('[data-enchant-perk-label]');
  const groupNote = root.querySelector<HTMLElement>('[data-enchant-group-note]');
  if (!output || !payload || !(picker instanceof HTMLSelectElement)) return;

  const tricks = JSON.parse(payload.textContent || '[]') as Trick[];
  // Tracked apart from the checkbox's own state: choosing an effect no perk applies to
  // has to clear the box, and coming back must not silently leave the perk off.
  let perkWanted = true;

  const read = (): MaxSettings => {
    const option = picker.selectedOptions[0];
    const active = new Set<string>();
    for (const trick of tricks) if (readFlag(root, trick.id)) active.add(trick.id);
    return {
      enchanting: readNumber(root, 'enchanting', 100),
      enchanter: readNumber(root, 'enchanter', 5),
      baseMagnitude: parseFloat(option?.dataset.base || '8'),
      categoryPerk: !!option?.dataset.perk && readFlag(root, 'perk'),
      potionPercent: readNumber(root, 'potion', 0),
      fairLoop: readFlag(root, 'fair'),
      alchemy: readNumber(root, 'alchemy', 100),
      alchemist: readNumber(root, 'alchemist', 5),
      benefactor: readFlag(root, 'benefactor'),
      pieces: readNumber(root, 'pieces', 4),
      active,
    };
  };

  const render = (): void => {
    const settings = read();
    const loop = settings.fairLoop ? fairLoop(settings, tricks) : null;
    const potion = loop ? (loop.runaway ? Infinity : loop.potionPercent) : settings.potionPercent;
    const result = maximise(settings, tricks);
    output.innerHTML = resultMarkup(result, potion, loop);

    // Mirror the loop's own answer into the disabled Potion % box. It used to sit at 0
    // while the sentence below it said 32.4% — two contradictory readouts of one quantity,
    // in one widget. Writing it also means unticking the loop hands you a real starting
    // point to edit instead of dropping the answer to whatever 0% places.
    const box = findField(root, 'potion');
    if (box instanceof HTMLInputElement && box.disabled && Number.isFinite(potion)) {
      box.value = String(Math.round(potion * 10) / 10);
    }

    // The answer in a line. The breakdown below it is the interesting part but it is not
    // what changed in kind, and restating all of it on every tick buried the number.
    if (status) {
      status.textContent = loop && loop.runaway
        ? 'The fair loop has no fixed point on this many slots — there is no maximum to report.'
        : `${formatNumber(result.magnitude)}% — reads ${formatWhole(result.reads)}% in game, ` +
          `off a ${formatNumber(potion)}% Fortify Enchanting potion.`;
    }
  };

  /** The manual potion box is meaningless while the loop is working it out. */
  const syncPotion = (): void => {
    const box = findField(root, 'potion');
    if (box instanceof HTMLInputElement) box.disabled = readFlag(root, 'fair');
  };

  /** Two Black Book boons, one at a time — ticking either has to clear the other. */
  const syncExclusions = (changed: HTMLElement): void => {
    const id = changed.getAttribute('data-f');
    const trick = tricks.find((candidate) => candidate.id === id);
    if (!trick || !(changed as HTMLInputElement).checked) return;
    for (const other of trick.excludes || []) {
      const box = findField(root, other);
      if (box instanceof HTMLInputElement) box.checked = false;
    }
  };

  const syncPicker = (): void => {
    const option = picker.selectedOptions[0];
    const perk = option?.dataset.perk || '';
    const checkbox = findField(root, 'perk');
    if (perkLabel) perkLabel.textContent = perk || 'No perk applies';
    // The group's caveat, same sink the resto planner uses. It used to be dropped here.
    if (groupNote) groupNote.textContent = option?.dataset.note || '';
    if (checkbox instanceof HTMLInputElement) {
      if (!checkbox.disabled) perkWanted = checkbox.checked;
      checkbox.disabled = !perk;
      checkbox.checked = perk ? perkWanted : false;
    }
  };

  // Debounced for two reasons, and only the first has gone away: the breakdown used to
  // sit in an aria-live region and re-announce itself on every digit, which the status
  // line above now handles in one sentence — but a full re-solve and re-render per
  // keystroke is still waste. Same 180ms and same trailing edge as the resto planner.
  const scheduleRender = debounce(() => {
    render();
  }, 180);

  for (const control of queryAll<HTMLElement>(root, 'input, select')) {
    const onChange = (): void => {
      syncExclusions(control);
      syncPicker();
      syncPotion();
      scheduleRender();
    };
    control.addEventListener('input', onChange);
    control.addEventListener('change', onChange);
  }

  setUpConfigPanel(root);
  syncPicker();
  syncPotion();
  render();
}
