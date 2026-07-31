// The Restoration-loop planner on /misc/skyrim/. Give it a target percentage and
// it returns the wear pattern that lands closest, and how many rounds that takes.
//
// ── WHERE THE NUMBERS COME FROM ─────────────────────────────────────────────
//
// ALCHEMY — UESP, Skyrim:Alchemy Effects
//   mag = BaseMag × 4 × (1 + Skill/200) × (1 + Gear/100) × (1 + Alchemist/100)
//                 × (1 + Benefactor/100) × (1 + Seeker/100)
//   Gear is the SUMMED Fortify Alchemy across worn pieces. Fortify Restoration
//   has BaseMag 4 and Fortify Enchanting BaseMag 1, so on plain carriers the
//   restoration potion is exactly four times the enchanting one on plain carriers.
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
// THE LOOP — the whole model, and it is one line
//   A Fortify Restoration potion boosts every Fortify Alchemy enchantment you are
//   WEARING while it runs. Not the ones in your pack, and it does not matter which
//   pieces or in what order you put them on: if it is on your body, it reads
//   base × (1 + the live boost). There is no per-piece history to keep.
//
//   And because you never wait for the potion to expire, one is always live, which is
//   what makes it compound — the potion you drink is scaled by the one already running:
//
//     piece  = base × (1 + x)
//     x[n+1] = r × (1 + wear × base × (1 + x[n])) × (1 + x[n])
//
//   So a round offers exactly ONE choice: how many pieces you have on while you brew.
//   Fewer pieces, weaker potion. That is the only brake, and with growth this violent
//   it is the only reason an exact landing is possible at all.
//
//   MEASURED IN GAME, four 25% pieces, plain ingredients, all four worn every round.
//   Observed / modelled:
//     gear   100%  ->     120% /     120% potion  ->    54% /    55% a piece
//     gear   220%  ->     422% /     422% potion  ->   130% /   131% a piece
//     gear   522%  ->   1,948% /   1,951% potion  ->   512% /   513% a piece
//     gear 2,051%  ->  26,405% /  26,466% potion  -> 6,626% / 6,642% a piece
//     cash out     ->   3,991% /   4,000% Fortify Enchanting -> 9,831% / 9,874% PLACED
//   Every line inside 0.5%, drifting slightly high because the game floors each
//   magnitude and this does not. The 9,831% is the strongest check in here: it exercises
//   the enchanting quadratic four orders of magnitude past any published example.
//
// WHAT THIS MODULE DELIBERATELY DOES NOT COVER
//   WAITING for the potion to lapse. Do that and the boost stops compounding, growth
//   goes linear, and four 25% pieces converge on a hard 36.6% ceiling — measured too:
//   120% -> 192% -> 235% -> 261%. It also brings back per-piece history, because a value
//   written while a potion was up STICKS after it expires (a piece boosted to 47.5% and
//   then worn alongside untouched 25% ones read 47.5 + 47.5 + 25 + 25 = 145%). That is a
//   different, slower routine and modelling both in one place is what produced five
//   wrong models in a row. This one assumes you never wait.
//
//   Also out, each having been tried and cut: potions stacking additively, pieces
//   ratcheting from their boosted value, repeated off-on cycles under one potion,
//   ingredient magnitude multipliers, and re-enchanting the set mid-plan.
//
//   THE 235% THAT WAS NOT THERE. Three of those wrong models were chasing a remembered
//   "235%" off a 25% set. It was the third WAITING round's potion, not an enchantment;
//   that run places about 33%. The enchanting formula feeds the potion into a quadratic
//   on effective skill, so a potion percentage and an enchantment percentage are never
//   close. Every step names which it is.
//
// ── ACCURACY ────────────────────────────────────────────────────────────────
//   CONFIRMED END TO END. The five-round plan this file produces for 235% Fortify
//   Alchemy was executed in game off a fixed 4×25% set with plain ingredients, and it
//   placed 235% on a pair of gloves. Brewing in 0, 2, 2, 2, 2 pieces for potions of 60,
//   173, 387, 1,003 and 4,315%, then cashing out in 3 pieces for a 511.7% Fortify
//   Enchanting potion. That plan is pinned move by move in the self-check, because it is
//   the one thing in here that has been verified against reality rather than fitted to
//   it, and any drift in the model would silently change it.
//
//   The documented anchors also reproduce exactly: a 15% Fortify Enchanting potion bare,
//   the 25% natural cap on base-8 skill enchantments, 29% Fortify Alchemy from a 32%
//   potion, 32% back out of 4×29% gear. And the measured four-round ladder above holds
//   inside 0.5% end to end, including a 9,831% enchantment — which exercises the
//   enchanting quadratic four orders of magnitude past any published example.
//
//   UESP flags the 0.14 and 3.4 as an empirical fit rather than engine constants, so
//   treat the last digit of any enchantment as soft. Everything upstream of the
//   enchanting step is exact.

import { debounce, findField, formatNumber, formatPrecise, formatWhole, queryAll, readFlag, readNumber } from './util';

const RESTORATION_BASE = 4;
const ENCHANTING_BASE = 1;
/** Four apparel slots take Fortify Alchemy; a fifth needs the helmet + circlet bug. */
const MAX_PIECES = 5;
/**
 * How many rounds deep to plan. Twelve because a real run is a dozen-odd steps
 * when it is being throttled toward an exact number, not the four or five a
 * wear-everything plan needs.
 */
const MAX_ROUNDS = 12;
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


/** The Fortify Enchanting potion a given summed Fortify Alchemy brews, as a percent. */
export function potionOf(s: Settings, gearPercent: number): number {
  return ENCHANTING_BASE * potionMultiplier(s, gearPercent);
}

/** The enchantment magnitude a given Fortify Enchanting potion can place. */
export function placeableFrom(s: Settings, potionPercent: number): number {
  return enchantmentMagnitude(s, potionPercent);
}

/**
 * One node of the loop. State is JUST the live boost — see the header for why there is
 * no per-piece bookkeeping in the no-wait routine.
 */
interface LoopState {
  activeBoost: number;
  /** Pieces worn while brewing, which is the only choice a round offers. */
  move: number | null;
  parent: LoopState | null;
  rounds: number;
}

/** What you do in one round: how many pieces you have on while you brew. */
export type Move = number;

export interface Round {
  index: number;
  /** How many pieces to wear while brewing. Which ones does not matter. */
  wear: number;
  /** Summed Fortify Alchemy that gives you. */
  brewGearPercent: number;
  /** What the bottle reads — already scaled by the live effect. */
  brewedPercent: number;
  /** What every worn piece reads once you have drunk it. */
  piecePercent: number;
}

export interface Plan {
  value: number;
  rounds: number;
  /** Pieces to wear for the final Fortify Enchanting brew. */
  cashOutWear: number;
  gearPercent: number;
  potionPercent: number;
  state: LoopState | null;
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

/** The Fortify Restoration potion a bare, gearless brew gives you, as a fraction. */
function baseRestorationOf(s: Settings): number {
  return (RESTORATION_BASE * potionMultiplier(s, 0)) / 100;
}

/** Summed Fortify Alchemy from wearing `wear` pieces while the boost is `activeBoost`. */
function gearOf(wear: number, activeBoost: number, perPiece: number): number {
  return wear * perPiece * (1 + activeBoost);
}

/**
 * One round applied to a state. The recurrence lives here and nowhere else, so the
 * search and the replay used by the self-check cannot drift apart.
 */
function advance(state: LoopState, wear: Move, s: Settings, baseRestoration: number): LoopState {
  const gear = gearOf(wear, state.activeBoost, s.perPiece / 100);
  const brewed = baseRestoration * (1 + gear);
  return {
    // The live effect scales the potion you drink on top of it. That is the whole engine.
    activeBoost: brewed * (1 + state.activeBoost),
    move: wear,
    parent: state,
    rounds: state.rounds + 1,
  };
}

/** Run an explicit sequence of rounds — how a field run gets pinned in the self-check. */
export function replay(s: Settings, moves: Move[]): Round[] {
  const pieceCount = Math.max(1, Math.min(MAX_PIECES, Math.round(s.pieces)));
  const baseRestoration = baseRestorationOf(s);
  let state: LoopState = { activeBoost: 0, move: null, parent: null, rounds: 0 };
  for (const move of moves) state = advance(state, move, s, baseRestoration);
  return roundsOf({
    value: 0, rounds: moves.length, cashOutWear: 0, gearPercent: 0, potionPercent: 0,
    state, pieceCount, perPieceFraction: s.perPiece / 100, baseRestoration,
  });
}

/** Replay a plan into per-round instructions. */
export function roundsOf(plan: Plan): Round[] {
  const chain: LoopState[] = [];
  for (let node = plan.state; node && node.parent; node = node.parent) chain.unshift(node);

  return chain.map((node, i) => {
    const previous = node.parent as LoopState;
    const wear = node.move as number;
    return {
      index: i + 1,
      wear,
      brewGearPercent: gearOf(wear, previous.activeBoost, plan.perPieceFraction) * 100,
      brewedPercent: node.activeBoost * 100,
      piecePercent: plan.perPieceFraction * (1 + node.activeBoost) * 100,
    };
  });
}

/** What one piece reads at the end of a plan. */
function piecePercentAt(plan: Plan): number {
  return plan.perPieceFraction * (1 + (plan.state ? plan.state.activeBoost : 0)) * 100;
}

export function solve(s: Settings, target: number): Solution {
  const baseRestoration = baseRestorationOf(s);
  const pieceCount = Math.max(1, Math.min(MAX_PIECES, Math.round(s.pieces)));
  const perPiece = s.perPiece / 100;

  const natural = enchantmentMagnitude(s, 0);
  let best: Plan | null = null;
  let under: Plan | null = null;
  let over: Plan | null = null;

  // The game FLOORS the enchantment, so 200.04 (reads 200%) beats 199.96 (reads 199%)
  // even though both are 0.04 away. Match the displayed integer first, then prefer
  // fewer rounds, then close the gap.
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

  /** Every wear count for the final Fortify Enchanting brew. */
  const cashOut = (state: LoopState): void => {
    for (let wear = 0; wear <= pieceCount; wear++) {
      const gear = gearOf(wear, state.activeBoost, perPiece);
      const potionPercent = ENCHANTING_BASE * potionMultiplier(s, gear * 100);
      const value = enchantmentMagnitude(s, potionPercent);
      if (!Number.isFinite(value) || value <= 0) continue;
      consider({
        value, rounds: state.rounds, cashOutWear: wear,
        gearPercent: gear * 100, potionPercent, state, ...shell,
      });
    }
  };

  const root: LoopState = { activeBoost: 0, move: null, parent: null, rounds: 0 };
  const visited = new Set<string>(['0']);
  let frontier: LoopState[] = [root];
  let stateCount = 1;
  let truncated = false;
  cashOut(root);

  for (let depth = 0; depth < MAX_ROUNDS && !truncated; depth++) {
    const next: LoopState[] = [];
    for (const state of frontier) {
      for (let wear = 0; wear <= pieceCount && !truncated; wear++) {
        const candidate = advance(state, wear, s, baseRestoration);
        if (!Number.isFinite(candidate.activeBoost)) continue;
        if (gearOf(pieceCount, candidate.activeBoost, perPiece) > GEAR_CEILING) continue;
        const key = candidate.activeBoost.toFixed(6);
        if (visited.has(key)) continue;
        visited.add(key);
        next.push(candidate);
        truncated = ++stateCount >= MAX_STATES;
      }
      if (truncated) break;
    }
    next.forEach(cashOut);
    frontier = next;
    // Landed on the number in the fewest rounds that can reach it; searching deeper can
    // only turn up longer plans for the same result.
    if (best && displaysTarget(best.value)) break;
  }

  return { best, under, over, natural, truncated };
}

// ── Rendering ───────────────────────────────────────────────────────────────

function roundDetail(round: Round, pieceCount: number): string {
  // The badge is a single-glyph circle, so it carries the piece COUNT and the wording
  // goes underneath. "Each" in there rendered as "Eac".
  const tile = (badge: string, percent: number, label: string): string =>
    `<li class="sky-gear__p is-on"><b>${badge}</b>` +
    `<span>${formatNumber(percent)}<i>%</i></span><em>${label}</em></li>`;
  return [
    `<p class="sky-detail__head">After round ${round.index}</p>`,
    `<ul class="sky-gear">`,
    tile('1', round.piecePercent, 'one piece'),
    tile(String(pieceCount), round.piecePercent * pieceCount, 'wearing them all'),
    `</ul>`,
    `<p class="sky-detail__foot">Brewing in <b>${round.wear}</b> piece${round.wear === 1 ? '' : 's'} gives you `,
    `<b>${formatNumber(round.brewGearPercent)}%</b> Fortify Alchemy, which makes a `,
    `<b>${formatNumber(round.brewedPercent)}%</b> potion. Drink it and every piece you have on reads `,
    `<b>${formatNumber(round.piecePercent)}%</b> — so wearing fewer pieces while brewing is the only brake `,
    `there is.</p>`,
  ].join('');
}

function cashOutDetail(plan: Plan): string {
  return [
    `<p class="sky-detail__head">Cash out — wear ${plan.cashOutWear} piece${plan.cashOutWear === 1 ? '' : 's'}</p>`,
    `<p class="sky-detail__foot">Each reads <b>${formatNumber(piecePercentAt(plan))}%</b>, so that is `,
    `<b>${formatNumber(plan.gearPercent)}%</b> Fortify Alchemy, which brews a `,
    `<b>${formatNumber(plan.potionPercent)}%</b> Fortify Enchanting potion. Drink it at the arcane enchanter `,
    `and place the enchantment.</p>`,
  ].join('');
}

/**
 * The steps, written out.
 *
 * Counts, not letters. Which pieces you wear does not matter — anything on your body
 * while the potion is up reads the same number — and an earlier lettered notation with
 * a lowercase-means-base convention cost a whole run to ambiguity.
 */
function stepList(plan: Plan, rounds: Round[]): string {
  const pieces = (n: number): string => `<b>${n}</b> piece${n === 1 ? '' : 's'}`;
  const steps = rounds.map((round) => {
    const wearing = round.wear === 0
      ? 'wearing <b>nothing</b>'
      : `wearing any ${pieces(round.wear)} (<b>${formatNumber(round.brewGearPercent)}%</b> Fortify Alchemy)`;
    const text =
      `Brew a <b>${formatNumber(round.brewedPercent)}%</b> potion ${wearing}. Drink it. ` +
      `Every piece you put on now reads <b>${formatNumber(round.piecePercent)}%</b>.`;
    return `<li><button type="button" class="sky-step" data-step="${round.index - 1}">` +
      `<b>${round.index}</b><span>${text}</span></button></li>`;
  });
  steps.push(
    `<li><button type="button" class="sky-step sky-step--brew" data-step="${rounds.length}">` +
      `<b>&#9670;</b><span>Wearing ${pieces(plan.cashOutWear)} (<b>${formatNumber(plan.gearPercent)}%</b> ` +
      `Fortify Alchemy), brew a <b>${formatNumber(plan.potionPercent)}%</b> Fortify Enchanting potion. ` +
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
      : roundDetail(rounds[openStep], readNumber(root, 'pieces', 4));
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
