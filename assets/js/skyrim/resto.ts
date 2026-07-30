// The Restoration-loop planner on /misc/skyrim/. Give it a target percentage and
// it returns the wear pattern that lands closest, and how many rounds that takes.
//
// ── WHERE THE NUMBERS COME FROM ─────────────────────────────────────────────
//
// ALCHEMY — UESP, Skyrim:Alchemy Effects
//   mag = BaseMag × 4 × (1 + Skill/200) × (1 + Gear/100) × (1 + Alchemist/100)
//                 × (1 + Benefactor/100) × (1 + Seeker/100)
//   Gear is the SUMMED Fortify Alchemy across worn pieces. Fortify Restoration
//   has BaseMag 4 and Fortify Enchanting BaseMag 1, so the restoration potion is
//   always exactly four times the enchanting one. Duration never binds:
//   re-equipping resets the Fortify Restoration timer, so no round is timed.
//
// ENCHANTING — UESP, Skyrim:Enchanting Effects, vanilla branch
//   mag = floor(BaseMag × skillMult × (1 + Enchanter) × (1 + categoryPerk) × (1 + Sorcery))
//   skillMult = 1 + x(x − 0.14)/3.4,  x = Skill × (1 + potion/100) / 100
//   The load-bearing detail: a Fortify Enchanting potion does NOT multiply the
//   finished magnitude. It scales effective SKILL inside a quadratic, so the
//   enchantment comes out quadratic in potion strength. USSEP changes this to a
//   flat outer multiplier and also takes the Fortify effects out of the
//   Restoration school, which kills the loop — none of this applies if you run it.
//
// THE LOOP — with x the active boost and e the summed gear, both as fractions:
//
//     x[n+1] = r × (1 + e(1 + x[n])) × (1 + x[n]),   x[0] = 0
//                  \____ brewed ____/  \_ applied _/
//
//   Two compounding factors per round: the re-equipped gear is worth more, and
//   the new potion is itself a Restoration effect so drinking it on top of the
//   live one multiplies it again. Growth is quadratic, not geometric.
//
//   A piece has NO private history. Drinking recomputes the Fortify Alchemy
//   magnitude of everything WORN AT THAT MOMENT from its base; anything not worn
//   sits at base. So at any point a piece is worth either base × (1 + x) or just
//   base — never some stale value from an earlier, smaller boost. (An earlier
//   version let pieces freeze at old boosted values, which produced plans holding
//   a 243.7% item that the game will not give you. It went unnoticed because
//   wearing everything every round cannot diverge, so every validated anchor
//   passed regardless.)
//
//   State is therefore just (x, how many pieces are currently boosted) — boosted
//   pieces are all equal and base pieces are all equal, so only counts matter.
//
//   This recurrence is a derivation, not a published formula. Solving
//   x[n+1] = x[n] yields a discriminant of (1−r)² − 4re, so "no fixed point" is
//   exactly UESP's documented divergence condition e > (1−r)²/(4r). It also
//   reproduces all three of UESP's worked examples and a 122% field report.
//
// ── THE TWO CHOICES PER ROUND ───────────────────────────────────────────────
//   Wearing everything every round overshoots wildly — 121% at three rounds,
//   9,874% at four. Each round you pick two things, and they are not the same set:
//
//     what you wear WHILE BREWING   sets the potion's strength, because Fortify
//                                   Alchemy only applies to brewing
//     what you wear BEFORE DRINKING decides which pieces come out boosted, and
//                                   nothing else
//
//   Pieces are interchangeable within their tier, so a plan only has to say how
//   many boosted and how many base ones to wear. Letters are assigned so the
//   boosted ones are always the leading run — A B C D — which keeps the written
//   steps followable.
//
// ── ACCURACY ────────────────────────────────────────────────────────────────
//   Every documented anchor reproduces exactly: a 15% Fortify Enchanting potion
//   bare, the 25% natural cap on base-8 skill enchantments, 29% Fortify Alchemy
//   from a 32% potion, 32% back out of 4×29% gear. Against a 122% field report at
//   three rounds it gives 121.6%. UESP flags the 0.14 and 3.4 as an empirical fit
//   rather than engine constants — moving 3.4 to 3.3 moves that to 124 — so the
//   last digit is soft. Everything upstream of the enchanting step is exact.

import { debounce, escapeHtml, findField, formatNumber, formatPrecise, formatWhole, queryAll, readFlag, readNumber } from './util';

const RESTORATION_BASE = 4;
const ENCHANTING_BASE = 1;
const PIECE_LETTERS = 'ABCDE'; // a fifth slot is reachable via the helmet + circlet bug
const MAX_ROUNDS = 6;
const MAX_STATES = 90000;
/** Stop exploring past ~30,000% gear; far beyond anything the game survives. */
const GEAR_CEILING = 300;

export interface Settings {
  alchemy: number;
  alchemist: number; // perk rank 0-5, each worth +20%
  benefactor: boolean;
  seekerShadows: boolean;
  enchanting: number;
  enchanter: number; // perk rank 0-5, each worth +20%
  seekerSorcery: boolean;
  pieces: number;
  perPiece: number;
  /** Enchantment base magnitude: 8 / 10 / 13 / 15 / 20 / 25 per the picker. */
  baseMagnitude: number;
  /** The group's +25% perk exists and has been taken. */
  categoryPerk: boolean;
}

/** Multiplier applied to a potion effect's base magnitude. `gearPercent` is summed Fortify Alchemy. */
function potionMultiplier(s: Settings, gearPercent: number): number {
  return (
    4 *
    (1 + s.alchemy / 200) *
    (1 + gearPercent / 100) *
    (1 + (s.alchemist * 20) / 100) *
    (1 + (s.benefactor ? 25 : 0) / 100) *
    (s.seekerShadows ? 1.1 : 1)
  );
}

function enchantmentMagnitude(s: Settings, potionPercent: number): number {
  const skill = (s.enchanting * (1 + potionPercent / 100)) / 100;
  return (
    s.baseMagnitude *
    (1 + (skill * (skill - 0.14)) / 3.4) *
    (1 + s.enchanter * 0.2) *
    (s.categoryPerk ? 1.25 : 1) *
    (s.seekerSorcery ? 1.1 : 1)
  );
}


/**
 * One node of the loop. `boostedCount` is how many pieces currently sit at
 * base × (1 + activeBoost); the rest sit at base.
 */
interface LoopState {
  activeBoost: number;
  boostedCount: number;
  /** The choice that produced this node, for replaying the plan. */
  move: Move | null;
  parent: LoopState | null;
  rounds: number;
}

/** What you do in one round. */
interface Move {
  /** Boosted pieces worn while brewing. */
  brewBoosted: number;
  /** Base pieces worn while brewing. */
  brewBase: number;
  /** Pieces equipped before drinking — they are what comes out boosted. */
  equip: number;
}

export interface Round {
  index: number;
  /** Pieces to wear while brewing, as letters. */
  brewWith: string;
  /** The same split out, so a mixed wear can be described as one. */
  brewBoostedLetters: string;
  brewBaseLetters: string;
  /** Summed Fortify Alchemy that gives you. */
  brewGearPercent: number;
  /** The Fortify Restoration potion it yields. */
  brewedPercent: number;
  /** Pieces to be wearing when you drink it. */
  equip: string;
  /** What the potion is worth once drunk on top of the one still running. */
  appliedPercent: number;
  /** Each piece afterwards: boosted ones first, then any left at base. */
  piecePercents: number[];
  boostedCount: number;
}

export interface Plan {
  value: number;
  rounds: number;
  /** Pieces to wear for the final Fortify Enchanting brew. */
  brew: string;
  gearPercent: number;
  potionPercent: number;
  state: LoopState | null;
  cashOut: { boosted: number; base: number };
  pieceCount: number;
  perPieceFraction: number;
  baseRestoration: number;
}

export interface Solution {
  best: Plan | null;
  /** Nearest reachable values either side of the target — the granularity available. */
  under: Plan | null;
  over: Plan | null;
  /** What you can place with no potion at all. */
  natural: number;
  truncated: boolean;
}

/** Letters for `count` pieces starting at `from`, e.g. (1, 2) -> "B C". */
function letters(from: number, count: number): string {
  const picked: string[] = [];
  for (let i = from; i < from + count; i++) picked.push(PIECE_LETTERS[i]);
  return picked.join(' ') || 'nothing';
}

/** Summed Fortify Alchemy from wearing `boosted` boosted pieces and `base` base ones. */
function gearWorn(boosted: number, base: number, activeBoost: number, perPiece: number): number {
  return boosted * perPiece * (1 + activeBoost) + base * perPiece;
}

/**
 * Replay a plan into per-round instructions.
 *
 * Not computed during the search — the search evaluates hundreds of thousands of
 * cash-outs and only displayed plans need this.
 */
export function roundsOf(plan: Plan): Round[] {
  const chain: LoopState[] = [];
  for (let node = plan.state; node && node.parent; node = node.parent) chain.unshift(node);

  return chain.map((node, i) => {
    const previous = node.parent as LoopState;
    const move = node.move as Move;
    const gear = gearWorn(move.brewBoosted, move.brewBase, previous.activeBoost, plan.perPieceFraction);
    const boostedValue = plan.perPieceFraction * (1 + node.activeBoost) * 100;
    const baseValue = plan.perPieceFraction * 100;
    const pieces: number[] = [];
    for (let piece = 0; piece < plan.pieceCount; piece++) {
      pieces.push(piece < node.boostedCount ? boostedValue : baseValue);
    }
    // Boosted pieces are the leading run, so brewing with `brewBoosted` of them
    // plus `brewBase` base ones is two adjacent slices of the same alphabet.
    const boostedPart = move.brewBoosted ? letters(0, move.brewBoosted) : '';
    const basePart = move.brewBase ? letters(previous.boostedCount, move.brewBase) : '';
    return {
      index: i + 1,
      brewWith: [boostedPart, basePart].filter(Boolean).join(' ') || 'nothing',
      brewBoostedLetters: boostedPart,
      brewBaseLetters: basePart,
      brewGearPercent: gear * 100,
      brewedPercent: plan.baseRestoration * (1 + gear) * 100,
      equip: letters(0, move.equip),
      appliedPercent: node.activeBoost * 100,
      piecePercents: pieces,
      boostedCount: node.boostedCount,
    };
  });
}

export function piecePercentsAt(plan: Plan): number[] {
  if (!plan.state) return [];
  const boostedValue = plan.perPieceFraction * (1 + plan.state.activeBoost) * 100;
  const baseValue = plan.perPieceFraction * 100;
  const pieces: number[] = [];
  for (let piece = 0; piece < plan.pieceCount; piece++) {
    pieces.push(piece < plan.state.boostedCount ? boostedValue : baseValue);
  }
  return pieces;
}

export function solve(s: Settings, target: number): Solution {
  const baseRestoration = (RESTORATION_BASE * potionMultiplier(s, 0)) / 100;
  const pieceCount = Math.max(1, Math.min(PIECE_LETTERS.length, Math.round(s.pieces)));
  const perPiece = s.perPiece / 100;

  const natural = enchantmentMagnitude(s, 0);
  let best: Plan | null = null;
  let under: Plan | null = null;
  let over: Plan | null = null;

  // The game FLOORS the enchantment, so 200.04 (reads 200%) beats 199.96 (reads
  // 199%) even though both are 0.04 away. Match the displayed integer first, then
  // prefer fewer rounds, then close the gap.
  const displaysTarget = (value: number): boolean => Math.floor(value) === Math.floor(target);
  const rank = (plan: Plan): number =>
    displaysTarget(plan.value)
      ? plan.rounds * 1e6 + Math.abs(plan.value - target)
      : 1e12 + Math.abs(plan.value - target);

  const consider = (plan: Plan): void => {
    if (!best || rank(plan) < rank(best)) best = plan;
    if (plan.value < target && (!under || plan.value > under.value)) under = plan;
    if (plan.value >= target && (!over || plan.value < over.value)) over = plan;
  };

  const shell = { pieceCount, perPieceFraction: perPiece, baseRestoration };
  consider({
    value: natural, rounds: 0, brew: 'nothing', gearPercent: 0, potionPercent: 0,
    state: null, cashOut: { boosted: 0, base: 0 }, ...shell,
  });

  /** Every wear split for the final Fortify Enchanting brew. */
  const cashOut = (state: LoopState): void => {
    for (let boosted = 0; boosted <= state.boostedCount; boosted++) {
      for (let base = 0; base <= pieceCount - state.boostedCount; base++) {
        const gear = gearWorn(boosted, base, state.activeBoost, perPiece);
        const potionPercent = ENCHANTING_BASE * potionMultiplier(s, gear * 100);
        const value = enchantmentMagnitude(s, potionPercent);
        if (!Number.isFinite(value) || value <= 0) continue;
        consider({
          value,
          rounds: state.rounds,
          brew: [letters(0, boosted), letters(state.boostedCount, base)]
            .filter((part) => part !== 'nothing').join(' ') || 'nothing',
          gearPercent: gear * 100,
          potionPercent,
          state,
          cashOut: { boosted, base },
          ...shell,
        });
      }
    }
  };

  const root: LoopState = { activeBoost: 0, boostedCount: 0, move: null, parent: null, rounds: 0 };
  const visited = new Set<string>(['0|0']);
  let frontier: LoopState[] = [root];
  let stateCount = 1;
  let truncated = false;
  cashOut(root);

  for (let depth = 0; depth < MAX_ROUNDS && !truncated; depth++) {
    const next: LoopState[] = [];
    for (const state of frontier) {
      for (let brewBoosted = 0; brewBoosted <= state.boostedCount && !truncated; brewBoosted++) {
        for (let brewBase = 0; brewBase <= pieceCount - state.boostedCount && !truncated; brewBase++) {
          const gear = gearWorn(brewBoosted, brewBase, state.activeBoost, perPiece);
          const activeBoost = baseRestoration * (1 + gear) * (1 + state.activeBoost);
          if (activeBoost * perPiece * pieceCount > GEAR_CEILING) continue;
          for (let equip = 0; equip <= pieceCount; equip++) {
            const key = `${activeBoost.toFixed(6)}|${equip}`;
            if (visited.has(key)) continue;
            visited.add(key);
            next.push({
              activeBoost,
              boostedCount: equip,
              move: { brewBoosted, brewBase, equip },
              parent: state,
              rounds: state.rounds + 1,
            });
            truncated = ++stateCount >= MAX_STATES;
          }
        }
      }
      if (truncated) break;
    }
    next.forEach(cashOut);
    frontier = next;
    // Landed on the number in the fewest rounds that can reach it; searching
    // deeper can only turn up longer plans for the same result.
    if (best && displaysTarget(best.value)) break;
  }

  return { best, under, over, natural, truncated };
}

// ── Rendering ───────────────────────────────────────────────────────────────

function gearTiles(percents: number[], boostedCount: number): string {
  const tiles = percents.map((percent, i) => {
    const boosted = i < boostedCount;
    return (
      `<li class="sky-gear__p${boosted ? ' is-on' : ''}">` +
      `<b>${PIECE_LETTERS[i]}</b><span>${formatNumber(percent)}<i>%</i></span>` +
      `<em>${boosted ? 'boosted' : 'back to base'}</em></li>`
    );
  });
  return `<ul class="sky-gear">${tiles.join('')}</ul>`;
}

function roundDetail(round: Round, perPiecePercent: number): string {
  return [
    `<p class="sky-detail__head">After round ${round.index}</p>`,
    gearTiles(round.piecePercents, round.boostedCount),
    `<p class="sky-detail__foot">Wearing <b>${escapeHtml(round.brewWith)}</b> puts `,
    `<b>${formatNumber(round.brewGearPercent)}%</b> Fortify Alchemy on you, which is what makes the potion `,
    `<b>${formatNumber(round.brewedPercent)}%</b>. Drunk on top of the one still running it is worth `,
    `<b>${formatNumber(round.appliedPercent)}%</b>. Whatever you had on <em>at the moment you drank</em> — `,
    `<b>${escapeHtml(round.equip)}</b> — is scaled to that from its base. Everything else sits at `,
    `${formatNumber(perPiecePercent)}%.</p>`,
  ].join('');
}

function cashOutDetail(plan: Plan): string {
  return [
    `<p class="sky-detail__head">Cash out — wear <b>${escapeHtml(plan.brew)}</b></p>`,
    gearTiles(piecePercentsAt(plan), plan.state ? plan.state.boostedCount : 0),
    `<p class="sky-detail__foot">That is <b>${formatNumber(plan.gearPercent)}%</b> Fortify Alchemy on your body, `,
    `which brews a <b>${formatNumber(plan.potionPercent)}%</b> Fortify Enchanting potion. Drink it at the arcane `,
    `enchanter and place the enchantment.</p>`,
  ].join('');
}

/**
 * The steps, written out.
 *
 * Chips reading "3 AC" said nothing about what to actually do with them. Each
 * round is two distinct actions on two possibly-different sets of pieces, so it
 * gets a sentence naming both.
 */
function stepList(plan: Plan, rounds: Round[]): string {
  const basePercent = plan.perPieceFraction * 100;
  const steps = rounds.map((round) => {
    // Mixing boosted pieces with ones sitting at base is a real lever — three at
    // 300% plus one at 25% is 925% rather than 900% or 1,200% — so a mixed wear
    // says so rather than leaving you to work it out from the letters.
    const mixed = round.brewBoostedLetters && round.brewBaseLetters;
    const wearing = mixed
      ? `<b>${escapeHtml(round.brewBoostedLetters)}</b> (boosted) with ` +
        `<b>${escapeHtml(round.brewBaseLetters)}</b> (still ${formatNumber(basePercent)}%)`
      : `only <b>${escapeHtml(round.brewWith)}</b>`;
    const text =
      `Brew a <b>${formatNumber(round.brewedPercent)}%</b> potion wearing ${wearing} — ` +
      `<b>${formatNumber(round.brewGearPercent)}%</b> Fortify Alchemy. ` +
      `Equip <b>${escapeHtml(round.equip)}</b>, then drink it.`;
    return `<li><button type="button" class="sky-step" data-step="${round.index - 1}">` +
      `<b>${round.index}</b><span>${text}</span></button></li>`;
  });
  steps.push(
    `<li><button type="button" class="sky-step sky-step--brew" data-step="${rounds.length}">` +
      `<b>&#9670;</b><span>Brew a <b>${formatNumber(plan.potionPercent)}%</b> Fortify Enchanting potion wearing ` +
      `<b>${escapeHtml(plan.brew)}</b> — <b>${formatNumber(plan.gearPercent)}%</b> Fortify Alchemy. ` +
      `Drink it at an arcane enchanter and place the enchantment.</span></button></li>`,
  );
  return `<ol class="sky-steps">${steps.join('')}</ol>`;
}

/** The plan's markup for a solution — the entry point the self-check uses. */
export function planMarkupFor(solution: Solution, target: number): string {
  if (!solution.best) return '';
  return planMarkup(solution.best, solution, target, roundsOf(solution.best));
}

function planMarkup(plan: Plan, solution: Solution, target: number, rounds: Round[]): string {
  const granularity = solution.under && solution.over ? Math.abs(solution.over.value - solution.under.value) : 0;
  const meta = [
    `reads <b>${Math.floor(plan.value)}%</b> in game`,
    plan.rounds ? `<b>${plan.rounds}</b> round${plan.rounds === 1 ? '' : 's'}` : 'no loops needed',
    granularity ? `finest step <b>${formatPrecise(granularity)}%</b>` : '',
  ].filter(Boolean).join('<i>·</i>');

  const caveats = [
    Math.floor(plan.value) === Math.floor(target) ? '' : `Nothing reachable reads exactly ${Math.floor(target)}%. `,
    solution.truncated ? `Search hit its ${MAX_STATES.toLocaleString('en-US')}-state ceiling, so a better plan may exist.` : '',
  ].join('');

  return [
    `<p class="sky-plan__head">Closest landing on ${formatWhole(target)}%</p>`,
    `<p class="sky-plan__value">${formatPrecise(plan.value)}<i>%</i></p>`,
    `<p class="sky-plan__meta">${meta}</p>`,
    plan.rounds
      ? `<p class="sky-plan__count">Tap a step to see where every piece stands after it.</p>${stepList(plan, rounds)}`
      : '<p class="sky-plan__count">No restoration loops needed — place it with no potion at all.</p>',
    `<div class="sky-detail" data-slot></div>`,
    caveats ? `<p class="sky-plan__note">${caveats}</p>` : '',
  ].join('');
}

// ── Wiring ──────────────────────────────────────────────────────────────────

export function initResto(): void {
  for (const root of queryAll<HTMLElement>(document, '[data-resto]')) setUp(root);
}

function setUp(root: HTMLElement): void {
  const output = root.querySelector<HTMLElement>('[data-resto-plan]');
  const groupNote = root.querySelector<HTMLElement>('[data-resto-group-note]');
  const perkLabel = root.querySelector<HTMLElement>('[data-resto-perk-label]');
  const picker = findField(root, 'effect');
  if (!output || !(picker instanceof HTMLSelectElement)) return;

  let plan: Plan | null = null;
  let rounds: Round[] = [];
  let openStep = -1;
  // Signature of the inputs the last render was built from. Blurring a number
  // input fires a native `change` even when the value has not moved, so without
  // this a click on a round chip re-renders the plan and throws away the panel
  // that click just opened.
  let renderedFrom = '';
  // Tracked apart from the checkbox's own state: choosing an effect no perk
  // applies to has to clear the box, and coming back must not silently leave the
  // perk off and change every number.
  let perkWanted = true;

  const readSettings = (): Settings => {
    const option = picker.selectedOptions[0];
    return {
      alchemy: readNumber(root, 'alchemy', 100),
      alchemist: readNumber(root, 'alchemist', 5),
      benefactor: readFlag(root, 'benefactor'),
      seekerShadows: readFlag(root, 'seekerShadows'),
      enchanting: readNumber(root, 'enchanting', 100),
      enchanter: readNumber(root, 'enchanter', 5),
      seekerSorcery: readFlag(root, 'seekerSorcery'),
      pieces: readNumber(root, 'pieces', 4),
      perPiece: readNumber(root, 'perPiece', 25),
      baseMagnitude: parseFloat(option?.dataset.base || '8'),
      categoryPerk: !!option?.dataset.perk && readFlag(root, 'perk'),
    };
  };

  const renderDetail = (): void => {
    const slot = output.querySelector<HTMLElement>('[data-slot]');
    if (!slot) return;
    if (!plan || openStep < 0) {
      slot.innerHTML = '';
      return;
    }
    slot.innerHTML = openStep >= rounds.length
      ? cashOutDetail(plan)
      : roundDetail(rounds[openStep], readNumber(root, 'perPiece', 25));
  };

  const openStepAt = (step: number): void => {
    openStep = openStep === step ? -1 : step;
    for (const button of queryAll<HTMLElement>(output, '[data-step]')) {
      button.classList.toggle('is-open', Number(button.dataset.step) === openStep);
    }
    renderDetail();
  };

  const renderPlan = (): void => {
    const settings = readSettings();
    const target = readNumber(root, 'target', 200);
    const signature = JSON.stringify([settings, target]);
    if (signature === renderedFrom) return;
    renderedFrom = signature;

    const solution = solve(settings, target);
    plan = solution.best;
    rounds = plan ? roundsOf(plan) : [];
    openStep = -1;
    output.innerHTML = plan ? planMarkup(plan, solution, target, rounds) : '';

    for (const button of queryAll<HTMLButtonElement>(output, '[data-step]')) {
      button.addEventListener('click', () => openStepAt(Number(button.dataset.step)));
    }
  };

  /** Keep the perk checkbox honest about which perk it currently means. */
  const syncPicker = (): void => {
    const option = picker.selectedOptions[0];
    const perk = option?.dataset.perk || '';
    const checkbox = findField(root, 'perk');
    if (perkLabel) perkLabel.textContent = perk || 'No perk applies';
    if (checkbox instanceof HTMLInputElement) {
      if (!checkbox.disabled) perkWanted = checkbox.checked;
      checkbox.disabled = !perk;
      checkbox.checked = perk ? perkWanted : false;
    }
    if (groupNote) groupNote.textContent = option?.dataset.note || '';
  };

  // The search walks tens of thousands of states — fine once, not on every
  // keystroke.
  const scheduleRender = debounce(() => {
    output.removeAttribute('data-busy');
    renderPlan();
  }, 180);

  const onInput = (): void => {
    syncPicker();
    output.setAttribute('data-busy', '');
    scheduleRender();
  };

  for (const control of queryAll<HTMLElement>(root, 'input, select')) {
    control.addEventListener('input', onInput);
    control.addEventListener('change', onInput);
  }

  setUpConfigPanel(root);
  syncPicker();
  renderPlan();
}

/**
 * The panel ships OPEN with its toggle hidden, so a reader without JavaScript
 * sees the assumptions rather than a dead "+" button. Here we reveal the button
 * and collapse the panel.
 */
function setUpConfigPanel(root: HTMLElement): void {
  const panel = root.querySelector<HTMLElement>('[data-config]');
  const toggle = root.querySelector<HTMLButtonElement>('[data-config-toggle]');
  if (!panel || !toggle) return;

  toggle.hidden = false;
  panel.hidden = true;
  toggle.setAttribute('aria-expanded', 'false');
  toggle.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    toggle.setAttribute('aria-expanded', String(!panel.hidden));
    toggle.classList.toggle('is-open', !panel.hidden);
  });
}
