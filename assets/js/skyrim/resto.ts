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
//   restoration potion is exactly four times the enchanting one.
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
//     b[n+1] = round( r × (1 + wear × base × (1 + x[n])) )      the new bottle
//     x[n+1] = b[n+1] > b[n] ? b[n+1] × (1 + x[n]) : x[n]        it only takes if it wins
//     piece  = base × (1 + x[n+1])                               after you drink it
//
//   where r is the plain Fortify Restoration potion (0.6 for a maxed alchemist with no
//   gear on), base is one piece's natural Fortify Alchemy (0.25), and x is the live boost.
//   Note what the second line is NOT: `max(x[n], ...)`. Comparing the new bottle against
//   the LIVE BOOST is one of the two models that died in play — see below.
//
//   So a round offers exactly ONE choice: how many pieces you have on while you brew.
//   Fewer pieces, weaker potion, smaller step. That is the only brake, and with growth
//   this violent it is the only reason an exact landing is possible at all.
//
//   WHETHER A ROUND TAKES AT ALL is decided on the potions' OWN magnitudes — bottle
//   against bottle — not on the boost you are walking around with. Two potions of the
//   same effect do not stack, and the new one only supersedes the old if it beats it:
//
//       takes  <=>  r × (1 + wear × base × (1 + x))  >  the last potion's own magnitude
//
//   The practical consequence, and it is a sharp one: brewing with NOTHING ON always
//   produces the same bare potion, so it can only ever be the opening move. A second
//   naked round does nothing whatsoever.
//
//   TWO WRONG VERSIONS DIED HERE, both caught in play on a 600% target:
//     - treating a weak brew as a way to step BACKWARDS. The plan dropped the boost from
//       277% to 226% mid-run; in game that round did nothing, the rest compounded off the
//       higher number, and it landed near 1,313%.
//     - then testing "does it beat the live boost", which let a plan open with two naked
//       rounds. The second did nothing, everything after it ran a step behind, and the
//       same target came out at 204% — measured, along with the 467% potion behind it.
//   The bottle-against-bottle rule reproduces both of those runs and is what ships.
//
//   THE GAME ROUNDS THE POTION to a whole percent as you brew it, and everything after is
//   exact. That one rounding matters more than it looks: leaving it out drifted 0.5% high
//   over four rounds and 1.5% over six, which turned a 600% plan into a measured 587%.
//
//   MEASURED IN GAME, four 25% pieces, plain ingredients, all four worn every round.
//   Observed / modelled:
//     gear   100%  ->     120% /     120.0% potion
//     gear   220%  ->     422% /     422.4% potion
//     gear   522%  ->   1,948% /   1,948.6% potion
//     gear 2,049%  ->  26,405% /  26,405.8% potion
//     cash out     ->   3,991% /   3,990.9% Fortify Enchanting -> 9,831% / 9,831% PLACED
//   The 9,831% is the strongest check in here: it exercises the enchanting quadratic four
//   orders of magnitude past any published example, and lands on the nose.
//
//   The enchanting step is the soft one. A second run cashed out at a measured 887%
//   potion — the model says 887.4 — and placed 587% where the model says 585.3. UESP
//   flags the 0.14 and 3.4 as an empirical fit, and that is about the size of it: a few
//   tenths of a percent, which is a couple of points once you are up at 600.
//
// WHAT THIS MODULE DELIBERATELY DOES NOT COVER
//   WAITING for the potion to lapse. Do that and the boost stops compounding and the
//   potions converge geometrically on 300% — 120% -> 192% -> 235% -> 261% -> 277% -> 286%
//   -> ... (measured through the first four). Mind the units: what converges on a hard
//   36.6% is the ENCHANTMENT you can place off the settled 400% gear, not the potion
//   series. It also brings back per-piece history, because a value
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
//   CONFIRMED END TO END. A five-round plan for 235% Fortify Alchemy was executed in game
//   off a fixed 4×25% set with plain ingredients, and it placed 235% on a pair of gloves.
//   Brewing in 0, 2, 2, 2, 2 pieces for potions of 60, 172.8, 387.4, 1,004 and 4,317%,
//   then cashing out in 3 pieces for a 511.9% Fortify Enchanting potion.
//
//   That run is pinned move by move in the self-check as a REPLAY, not as whatever the
//   search currently prefers — `solve` now proposes a shorter four-round route to the same
//   number (wear 2, 2, 4, 3, cash out in 3, 512.3% potion, 235.52%). Both are correct; the
//   replay is the one verified against reality rather than fitted to it, so it is the one
//   that would catch a drift in the model. Do not "fix" the self-check to match the
//   search — that is backwards, and it is the only in-game anchor this file has.
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

import { debounce, escapeHtml, findField, formatNumber, formatPrecise, formatWhole, queryAll, readFlag, readNumber, setUpConfigPanel } from './util';

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
/**
 * Soul gems, by the charge each holds. On APPAREL the gem scales the magnitude directly —
 * the engine's term is SoulGemUsedCharges / GrandSoulGemCharges — so a common soul places
 * exactly a third of what a grand one does. (On weapons it buys charges instead, which is
 * where the "always use grand" habit comes from; for armour it is simply a fifth lever.)
 *
 * It is the finest control in the whole module. The reachable set is discrete and lumpy,
 * and multiplying it by five different fractions gives five overlapping copies — which is
 * the difference between "no plan reads 600%" and one that lands 0.42 inside it.
 *
 * A black soul gem holds a grand charge, so it is the same row and the same picture.
 * Naming both made every mention of the gem two words longer for a distinction that
 * changes nothing about the number it places.
 */
const SOUL_GEMS: { label: string; slug: string; charges: number }[] = [
  { label: 'Petty', slug: 'petty', charges: 250 },
  { label: 'Lesser', slug: 'lesser', charges: 500 },
  { label: 'Common', slug: 'common', charges: 1000 },
  { label: 'Greater', slug: 'greater', charges: 2000 },
  { label: 'Grand', slug: 'grand', charges: 3000 },
];
const GRAND_CHARGES = 3000;
/**
 * Give up after 90,000 distinct states and say so rather than quietly returning the best
 * of a truncated search — `Solution.truncated` drives that caveat in the markup.
 *
 * A performance guard, not a correctness one: nothing in the self-check comes close, and
 * it only fires on configurations where the branching factor stays high for many rounds
 * (roughly 1 in 2,000 random ones). Raise it if you meet a real plan that trips it.
 */
const MAX_STATES = 90000;
/**
 * Stop exploring past ~300,000% summed Fortify Alchemy.
 *
 * This was 30,000% on the reasoning that nothing sane goes higher — which was fine until
 * soul gems became a lever. A petty soul places a twelfth of a grand one, so reaching the
 * same number needs twelve times the potion behind it, and the old ceiling pruned exactly
 * the states the small gems need. Raising it turned a 600% target from "no landing" into
 * one sitting 0.42 inside its band, and costs about 20ms.
 */
const GEAR_CEILING = 3000;

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
  /**
   * Charges of the soul gem to place the final enchantment with, or 0 to let the planner
   * pick whichever lands closest. Only the LAST enchantment — the Fortify Alchemy gear you
   * are wearing is whatever `perPiece` says it is.
   */
  soulCharges: number;
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
  /**
   * The OWN magnitude of the potion currently running — what it was worth in the bottle
   * before the live effect inflated it. This is what the game compares against, not the
   * boost you are walking around with.
   */
  brewedBase: number;
  /** What the bottle read. Equals activeBoost unless the potion was too weak to take. */
  applied: number;
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
  /** True when the brew came out weaker than what was already running, so it did nothing. */
  wasted: boolean;
  /** What every worn piece reads once you have drunk it. */
  piecePercent: number;
}

export interface Plan {
  value: number;
  rounds: number;
  /** Pieces to wear for the final Fortify Enchanting brew. */
  cashOutWear: number;
  /** The soul gem this landing needs. */
  soulCharges: number;
  soulLabel: string;
  soulSlug: string;
  /** How far inside its whole number this lands — under ~0.1 is a coin flip. */
  margin: number;
  gearPercent: number;
  potionPercent: number;
  state: LoopState | null;
  /** Pieces the plan was solved for, already clamped to 1..MAX_PIECES. */
  pieceCount: number;
  perPieceFraction: number;
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
  // THE GAME ROUNDS THE POTION to a whole percent when you brew it, and everything after
  // is exact. Leaving this out made the model drift ~0.5% high over four rounds and 1.5%
  // over six — enough to turn a 600% plan into a measured 587%. With it, a four-round
  // ladder reproduces as 120 / 422.4 / 1948.6 / 26405.8 against an observed
  // 120 / 422 / 1948 / 26405, and its cash-out lands on 3,991% and 9,831% exactly.
  const brewed = Math.round(baseRestoration * (1 + gear) * 100) / 100;
  // The live effect scales the potion you drink on top of it. That is the whole engine.
  const applied = brewed * (1 + state.activeBoost);
  // WHETHER IT TAKES AT ALL is decided on the potions' OWN magnitudes, not on what you
  // are walking around with. Two potions of the same effect do not stack, and the new one
  // only supersedes the old if the bottle beats the bottle.
  const takes = brewed > state.brewedBase;
  return {
    activeBoost: takes ? applied : state.activeBoost,
    brewedBase: takes ? brewed : state.brewedBase,
    applied,
    move: wear,
    parent: state,
    rounds: state.rounds + 1,
  };
}

/** Run an explicit sequence of rounds — how a field run gets pinned in the self-check. */
export function replay(s: Settings, moves: Move[]): Round[] {
  const pieceCount = Math.max(1, Math.min(MAX_PIECES, Math.round(s.pieces)));
  const baseRestoration = baseRestorationOf(s);
  let state: LoopState = { activeBoost: 0, brewedBase: 0, applied: 0, move: null, parent: null, rounds: 0 };
  for (const move of moves) state = advance(state, move, s, baseRestoration);
  return roundsOf({
    value: 0, rounds: moves.length, cashOutWear: 0, margin: 0, soulCharges: GRAND_CHARGES,
    soulLabel: 'Grand', soulSlug: 'grand', gearPercent: 0, potionPercent: 0,
    state, pieceCount, perPieceFraction: s.perPiece / 100,
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
      brewedPercent: node.applied * 100,
      wasted: node.brewedBase <= previous.brewedBase,
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

  // The game FLOORS the enchantment, so what matters is landing inside the target's whole
  // number, and landing WELL inside it. Ranking by closeness to the target itself picks
  // the value hugging the bottom edge of the band — a 500% target once chose 500.01%,
  // which came out as 499% in game, because the enchanting fit is soft to a few tenths of
  // a percent. So among plans that read the target, prefer the one nearest the MIDDLE of
  // the band; only then prefer fewer rounds.
  const band = Math.floor(target) + 0.5;
  const displaysTarget = (value: number): boolean => Math.floor(value) === Math.floor(target);
  const marginOf = (value: number): number =>
    Math.min(value - Math.floor(value), 1 - (value - Math.floor(value)));
  const rank = (plan: Plan): number =>
    displaysTarget(plan.value)
      ? Math.abs(plan.value - band) * 1e6 + plan.rounds
      : 1e12 + Math.abs(plan.value - target);

  /**
   * Read inside a closure on purpose: `best` is only ever assigned from one, so control
   * flow analysis still has it narrowed to `null` out here and any direct read is a type
   * error. A captured `let` widens back to its declared type inside a function body.
   */
  const settled = (): boolean => {
    const plan = best;
    return !!plan && displaysTarget(plan.value) && marginOf(plan.value) >= 0.2;
  };

  const consider = (plan: Plan): void => {
    if (!best || rank(plan) < rank(best)) best = plan;
    if (plan.value < target && (!under || plan.value > under.value)) under = plan;
    if (plan.value >= target && (!over || plan.value < over.value)) over = plan;
  };

  const shell = { pieceCount, perPieceFraction: perPiece };

  // Either the one gem asked for, or all five and let the search pick.
  const gems = s.soulCharges
    ? SOUL_GEMS.filter((gem) => gem.charges === s.soulCharges)
    : SOUL_GEMS;

  // Placing it stone cold sober, which is the floor of the whole space and the cheapest
  // plan there is. It has to be offered explicitly: `cashOut` always brews something,
  // because a maxed alchemist wearing nothing still makes a 15% Fortify Enchanting potion.
  // Without this the planner said "nothing reachable reads exactly 25%" about the one
  // number you get for free, on every enchantment group.
  for (const gem of gems) {
    const value = (natural * gem.charges) / GRAND_CHARGES;
    if (value > 0) {
      consider({
        value, rounds: 0, cashOutWear: 0, margin: marginOf(value),
        soulCharges: gem.charges, soulLabel: gem.label, soulSlug: gem.slug,
        gearPercent: 0, potionPercent: 0, state: null, ...shell,
      });
    }
  }

  /** Every wear count for the final Fortify Enchanting brew, against every soul gem. */
  const cashOut = (state: LoopState): void => {
    for (let wear = 0; wear <= pieceCount; wear++) {
      const gear = gearOf(wear, state.activeBoost, perPiece);
      const potionPercent = ENCHANTING_BASE * potionMultiplier(s, gear * 100);
      const full = enchantmentMagnitude(s, potionPercent);
      if (!Number.isFinite(full) || full <= 0) continue;
      for (const gem of gems) {
        const value = (full * gem.charges) / GRAND_CHARGES;
        if (value <= 0) continue;
        consider({
          value, rounds: state.rounds, cashOutWear: wear, margin: marginOf(value),
          soulCharges: gem.charges, soulLabel: gem.label, soulSlug: gem.slug,
          gearPercent: gear * 100, potionPercent, state, ...shell,
        });
      }
    }
  };

  const root: LoopState = { activeBoost: 0, brewedBase: 0, applied: 0, move: null, parent: null, rounds: 0 };
  // No seed: every key is `toFixed(6)|toFixed(6)`, and `advance` always produces a
  // brewedBase above zero, so the root is unreachable by construction and cannot collide.
  const visited = new Set<string>();
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
        // A round whose potion does not beat the last one does nothing at all, so it
        // cannot be a step in a plan. This is what stops the search proposing a second
        // "brew wearing nothing": naked always brews the same 60%, so it can only ever
        // be the opening move.
        if (candidate.brewedBase <= state.brewedBase) continue;
        if (gearOf(pieceCount, candidate.activeBoost, perPiece) > GEAR_CEILING) continue;
        const key = `${candidate.activeBoost.toFixed(6)}|${candidate.brewedBase.toFixed(6)}`;
        if (visited.has(key)) continue;
        visited.add(key);
        next.push(candidate);
        truncated = ++stateCount >= MAX_STATES;
      }
      if (truncated) break;
    }
    next.forEach(cashOut);
    frontier = next;
    // Stop once the number is not just reached but reached with room to spare. A landing
    // within a tenth of a percent of the band edge is a coin flip against the model's own
    // uncertainty, so it is worth another depth to look for a safer one.
    if (settled()) break;
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
    `<h4 class="sky-detail__head">After round ${round.index}</h4>`,
    `<ul class="sky-gear">`,
    tile('1', round.piecePercent, 'one piece'),
    tile(String(pieceCount), round.piecePercent * pieceCount, 'wearing them all'),
    `</ul>`,
    `<p class="sky-detail__foot">Brewing in <b>${round.wear}</b> piece${round.wear === 1 ? '' : 's'} gives you `,
    `<b>${formatNumber(round.brewGearPercent)}%</b> Fortify Alchemy, which makes a `,
    `<b>${formatNumber(round.brewedPercent)}%</b> potion. Drink it and every piece you have on reads `,
    // "…so wearing fewer pieces while brewing is the only brake there is" ended this, and
    // ends the paragraph under the widget, and ends the loop formula's own legend row.
    `<b>${formatNumber(round.piecePercent)}%</b>.</p>`,
  ].join('');
}

function cashOutDetail(plan: Plan): string {
  return [
    `<h4 class="sky-detail__head">Cash out — wear ${plan.cashOutWear} piece${plan.cashOutWear === 1 ? '' : 's'}</h4>`,
    `<p class="sky-detail__foot">Each reads <b>${formatNumber(piecePercentAt(plan))}%</b>, so that is `,
    `<b>${formatNumber(plan.gearPercent)}%</b> Fortify Alchemy, which brews a `,
    `<b>${formatNumber(plan.potionPercent)}%</b> Fortify Enchanting potion. Drink it at the arcane enchanter `,
    `and place the enchantment.</p>`,
  ].join('');
}

/**
 * The steps, at a glance.
 *
 * A step answers three things and no more: which round this is, how many pieces to have
 * on, and what comes out of the mortar. The last one adds the gem. Everything else — the
 * Fortify Alchemy the gear is worth, what a piece reads afterwards, where to drink it —
 * is in the card one tap away, which is what that card is for.
 *
 * It was a sentence per round before, run down a list up to twelve deep, so each word in
 * the frame cost twelve lines of reading to say a thing the numbers already said.
 *
 * Counts, not letters. Which pieces you wear does not matter — anything on your body
 * while the potion is up reads the same number — and an earlier lettered notation with
 * a lowercase-means-base convention cost a whole run to ambiguity.
 */
function stepList(plan: Plan, rounds: Round[]): string {
  /**
   * How many pieces to have on, as filled pips out of the set you own.
   *
   * "wear 2 pieces" was two words spent on a number between 0 and 5, down a list where
   * every row says it. Pips carry the count AND the total in one glance — a naked round
   * is a row of empty rings, which no wording made as obvious.
   *
   * The drawing is hidden and the sentence goes to `.sky-sr`, which is the same split
   * this module already makes for the builder's gather dots.
   */
  const wear = (n: number): string => {
    let pips = '';
    for (let i = 0; i < plan.pieceCount; i += 1) pips += `<i${i < n ? ' class="is-on"' : ''}></i>`;
    return `<span class="sky-step__wear">` +
      `<span class="sky-step__pips" aria-hidden="true">${pips}</span>` +
      `<span class="sky-sr">wear ${n} of ${plan.pieceCount} piece${plan.pieceCount === 1 ? '' : 's'}. </span>` +
      `</span>`;
  };

  /** The only number on the row, so it does not need to be told apart from another one. */
  const brew = (percent: number): string =>
    `<span class="sky-step__brew"><span class="sky-sr">Brew </span>` +
    `${formatNumber(percent)}<i>%</i></span>`;

  const steps = rounds.map((round) =>
    `<li><button type="button" class="sky-step" data-step="${round.index - 1}">` +
    `<b>${round.index}</b>${wear(round.wear)}${brew(round.brewedPercent)}` +
    `</button></li>`);

  // No gem here any more — it sits beside the answer, which is the other thing that is
  // true of the whole plan rather than of one round.
  steps.push(
    `<li><button type="button" class="sky-step sky-step--brew" data-step="${rounds.length}">` +
    `<b>&#9670;</b>${wear(plan.cashOutWear)}${brew(plan.potionPercent)}` +
    `</button></li>`);
  return `<ol class="sky-steps">${steps.join('')}</ol>`;
}

/**
 * The two things true of the whole plan: what it lands on, and what you place it with.
 *
 * Half the row each. The gem used to ride the cash-out step, which is where you USE it —
 * but it is not a property of that round the way the wear and the brew are, it is a
 * property of the answer, and it changes when the target does. Beside the number is where
 * it can be read as one of the two decisions the planner made for you.
 *
 * The bullseye is `--c-fg` rather than the accent the number carries: two accents side by
 * side would make the icon compete with the figure it is introducing.
 */
function answerRow(plan: Plan, gems: Record<string, string>): string {
  const art = gems[plan.soulSlug];
  return '<div class="sky-plan__answer">' +
    '<p class="sky-plan__value">' +
    '<svg class="sky-plan__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
    'aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8.6" /><circle cx="12" cy="12" r="4.2" />' +
    '<circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /></svg>' +
    `<span>${formatPrecise(plan.value)}<i>%</i></span></p>` +
    '<p class="sky-plan__gem">' +
    // `alt=""` and the name visible: five gems differ mostly by how blue they are, so the
    // word does work the picture cannot, and " soul gem." finishes the sentence for a
    // screen reader without saying the name to it twice.
    (art ? `<img src="${escapeHtml(art)}" alt="" loading="lazy" decoding="async" />` : '') +
    `<b>${escapeHtml(plan.soulLabel)}</b><span class="sky-sr"> soul gem.</span></p>` +
    '</div>';
}

/** The plan's markup for a solution — the entry point the self-check uses. */
export function planMarkupFor(solution: Solution, target: number, gems: Record<string, string> = {}): string {
  if (!solution.best) return '';
  return planMarkup(solution.best, solution, target, roundsOf(solution.best), gems);
}

function planMarkup(plan: Plan, solution: Solution, target: number, rounds: Round[],
  gems: Record<string, string>): string {
  const caveats = [
    Math.floor(plan.value) === Math.floor(target) ? '' : `Nothing reachable reads exactly ${Math.floor(target)}%. `,
    solution.truncated ? `Search hit its ${MAX_STATES.toLocaleString('en-US')}-state ceiling, so a better plan may exist.` : '',
  ].join('');

  return [
    answerRow(plan, gems),
    // No heading and no metadata row above the number.
    //
    // The heading read "Closest landing on 235%" directly under a box the reader had just
    // typed 235 into. The row under it — reads N% in game, N rounds, finest step, N%
    // inside, which soul — restated the step list in a denser hand: the rounds are the
    // rounds, and the gem is on the step that uses it.
    //
    // What left with it and did not come back: `Math.floor(plan.value)`, the number the
    // game itself shows, which is not the same as the value above and is not anywhere in
    // the steps. If that turns out to be missed, it belongs ON the headline rather than
    // in a row of five facts beside four that were already on screen.
    // Gate on the POTION, not on the round count. A plan can need zero loops and still
    // need a potion — and it used to print "place it with no potion at all" over a plan
    // that wanted a 15% one, with the cash-out step silently dropped along with the list,
    // so the instruction on screen produced a different number from the headline above it.
    // Only the zero-round case says anything: that IS the plan. The other branch used to
    // read "Tap a step to see where every piece stands after it", over a list of buttons
    // that hover, focus and carry a pointer cursor.
    plan.potionPercent > 0
      ? `${plan.rounds ? '' : '<p class="sky-plan__count">No restoration loops needed — one brew and place it.</p>'}${stepList(plan, rounds)}`
      : '<p class="sky-plan__count">Nothing to brew: put the set on and place it.</p>',
    // Live, where the whole plan is not: this fills only when a step is tapped, it is one
    // short card rather than the entire plan, and the tap is a request to hear it.
    `<div class="sky-detail" data-slot aria-live="polite"></div>`,
    caveats ? `<p class="sky-plan__note">${caveats}</p>` : '',
  ].join('');
}

// ── Wiring ──────────────────────────────────────────────────────────────────

export function initResto(): void {
  for (const root of queryAll<HTMLElement>(document, '[data-resto]')) setUp(root);
}

function setUp(root: HTMLElement): void {
  const output = root.querySelector<HTMLElement>('[data-resto-plan]');
  const status = root.querySelector<HTMLElement>('[data-resto-status]');
  const groupNote = root.querySelector<HTMLElement>('[data-resto-group-note]');
  const perkLabel = root.querySelector<HTMLElement>('[data-resto-perk-label]');
  const picker = findField(root, 'effect');
  if (!output || !(picker instanceof HTMLSelectElement)) return;

  // Soul gem art, resolved and fingerprinted by Hugo because JS cannot reach Hugo Pipes —
  // the same arrangement the builder's ingredient images use. An absent map just means no
  // picture: the gem's name is what carries it, and always has.
  const gemScript = root.querySelector('[data-soul-images]');
  let gems: Record<string, string> = {};
  if (gemScript) {
    try {
      gems = JSON.parse(gemScript.textContent || '{}') as Record<string, string>;
    } catch (error) {
      console.error('skyrim: soul gem images failed to parse', error);
    }
  }

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
      soulCharges: readNumber(root, 'soul', 0),
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
      : roundDetail(rounds[openStep], plan.pieceCount);
  };

  const openStepAt = (step: number): void => {
    openStep = openStep === step ? -1 : step;
    for (const button of queryAll<HTMLElement>(output, '[data-step]')) {
      button.classList.toggle('is-open', Number(button.dataset.step) === openStep);
    }
    renderDetail();
    // The detail renders after the whole step list, so on a phone tapping step 1 put the
    // answer ~590px below the tap — the border highlighted and nothing else appeared to
    // happen. Bring it to the reader instead of asking them to go find it.
    if (openStep === -1) return;
    const detail = output.querySelector<HTMLElement>('.sky-detail');
    if (!detail) return;
    const box = detail.getBoundingClientRect();
    if (box.top >= 0 && box.bottom <= window.innerHeight) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    detail.scrollIntoView({ behavior: motion, block: 'nearest' });
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
    output.innerHTML = plan ? planMarkup(plan, solution, target, rounds, gems) : '';

    // The one line the change is worth speaking. Everything else on screen is unchanged
    // in kind and is reachable by reading; see the shortcode for why it is not all live.
    if (status) {
      status.textContent = plan
        ? `${formatPrecise(plan.value)}% — reads ${Math.floor(plan.value)}% in game, ` +
          `${plan.rounds} round${plan.rounds === 1 ? '' : 's'}, ${plan.soulLabel} soul.`
        : `Nothing reachable lands on ${formatWhole(target)}%.`;
    }

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
