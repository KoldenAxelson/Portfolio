// The potion builder on /misc/skyrim/. Nine screens: 1-3 ask what you want and search for
// it, 4 is the mortar, 5-6 the effect index, 7 favourites, 8 one brew, 9 the overflow.
//
// An effect only reaches the bottle when two ingredients carry it, so every valid mixture
// holds two carriers of the RAREST effect asked for. Enumerating from that effect's
// carriers (4-31 of them) rather than all 183 is ~85,000 triples instead of C(183,3) =
// 1,004,731. The same rule is why "Fortify Sneak + Fortify Marksman" has no answer.
//
// Winners are tracked during the walk rather than picked from a collected sample: Fortify
// Magicka has 23,392 mixtures, and ranking the first few thousand lost Salmon Roe's x12.5
// past the cutoff. The stored sample only feeds screen 9.

import { debounce, escapeHtml, formatMultiplier, queryAll } from './util';

/** Effect indices are packed into two 32-bit halves — JS bitwise ops are 32-bit and there are 59 effects. */
export interface EffectMask { low: number; high: number }

export interface Ingredient {
  slug: string;
  name: string;
  gatherScore: number; // 1-5, see the `avail` field in data/skyrim/ingredients.yaml
  dlc: string;
  effects: number[];
  mask: EffectMask;
}

export interface Mixture {
  ingredients: Ingredient[];
  effects: number[];
  gatherScore: number;
  /** Applied multiplier per effect index, only where it differs from 1. */
  multipliers: Record<number, number>;
  /** Summed multipliers on the effects that were asked for. */
  potency: number;
  /**
   * Two DISAGREEING ingredients carry a requested effect. The game uses whichever costs
   * more for that effect, not whichever is bigger, so the larger multiplier can lose —
   * ranked below unambiguous mixtures, where the printed number is the delivered one.
   */
  contested: boolean;
  /** Index of the effect with the largest gold cost — the one in charge. -1 when empty. */
  dominant: number;
  /** True when that dominant effect is harmful, i.e. this comes out of the mortar as a poison. */
  poison: boolean;
  /** The top two costs are equal and disagree on side, so which you get is genuinely unknown. */
  undecided: boolean;
  /**
   * Effects on BOTH sides. Not `poison`, which is only about the costliest one: a bottle
   * can be a perfectly good potion and still paralyse you. Every `undecided` mixture is
   * mixed by construction, since a tie that matters is a tie between the sides.
   */
  mixed: boolean;
  /** How many of `effects` harm you. The rest help. */
  harmfulCount: number;
}

/**
 * How many of this bottle's effects are on the side you are shopping for.
 *
 * "Most effects" used to count all of them, so a Fortify potion won it by carrying Damage
 * Stamina — three effects, two of which you wanted, ranked above a clean two. A contradiction
 * is not a bonus. With no side requested the mixture's own verdict decides, because the
 * question is still "how much of what this bottle is does it do well".
 */
const onSideCount = (mixture: Mixture, kind: Kind): number => {
  const wantsHarm = kind === 'any' ? mixture.poison : kind === 'bad';
  return wantsHarm ? mixture.harmfulCount : mixture.effects.length - mixture.harmfulCount;
};

const offSideCount = (mixture: Mixture, kind: Kind): number =>
  mixture.effects.length - onSideCount(mixture, kind);

interface Ranking {
  label: string;
  compare: (a: Mixture, b: Mixture, kind: Kind) => number;
  /**
   * The one number this ranking is about, higher being better. A ranking always has a
   * winner; that does not mean the winner BEAT anything. `headlines` prints a label only
   * when its winner scores above the benchmark — see there.
   */
  measure: (mixture: Mixture, kind: Kind) => number;
}

const SAMPLE_LIMIT = 400;
/**
 * Eight fills two rows of the grid at desktop widths and one thumb-scroll on a phone. The
 * old inline "show more" appended 24 unranked cards under the three headlines instead.
 */
const PAGE_SIZE = 8;
const MAX_GATHER_SCORE = 5;

/**
 * RANKINGS[0] IS THE BENCHMARK. What you asked for and nothing else, and among those the
 * easiest to gather — the answer to give someone who has not said what they are optimising
 * for. Every other ranking is a reason to overrule it, and has to earn the right to say so
 * (`headlines`). It is also the sort the overflow uses, so screen 9 opens on the same
 * standard screen 3 leads with.
 */
const RANKINGS: Ranking[] = [
  {
    // A resist potion that also restores stamina is not the resist potion you asked for.
    // The requested set is fixed, so fewest total effects is exactly fewest unrequested.
    label: 'Nothing extra',
    compare: (a, b) => a.effects.length - b.effects.length || b.gatherScore - a.gatherScore || a.ingredients.length - b.ingredients.length,
    measure: (mixture) => -mixture.effects.length,
  },
  {
    // Cleanliness breaks the tie: two equally gatherable mixtures should not be separated
    // at random when one of them carries a passenger.
    label: 'Easiest to gather',
    compare: (a, b, kind) => b.gatherScore - a.gatherScore ||
      offSideCount(a, kind) - offSideCount(b, kind) || a.effects.length - b.effects.length ||
      a.ingredients.length - b.ingredients.length,
    measure: (mixture) => mixture.gatherScore,
  },
  {
    // Effects on the side you asked for, and off-side ones as a tie-break AGAINST.
    label: 'Most effects',
    compare: (a, b, kind) =>
      onSideCount(b, kind) - onSideCount(a, kind) || offSideCount(a, kind) - offSideCount(b, kind) ||
      b.gatherScore - a.gatherScore || a.ingredients.length - b.ingredients.length,
    measure: onSideCount,
  },
  {
    label: 'Most potent',
    // Equal potency used to be broken by MORE effects, which handed the label to whichever
    // brew carried the most passengers. A passenger is a cost everywhere else here.
    compare: (a, b, kind) =>
      Number(a.contested) - Number(b.contested) || b.potency - a.potency ||
      offSideCount(a, kind) - offSideCount(b, kind) || b.effects.length - a.effects.length ||
      b.gatherScore - a.gatherScore,
    // A contested mixture cannot claim potency it may not deliver, so it never outscores
    // the benchmark on this axis even when its arithmetic is higher.
    measure: (mixture) => (mixture.contested ? 0 : mixture.potency),
  },
  {
    label: 'Fewest ingredients',
    compare: (a, b) => a.ingredients.length - b.ingredients.length || b.gatherScore - a.gatherScore || b.effects.length - a.effects.length,
    measure: (mixture) => -mixture.ingredients.length,
  },
];

// ── The ingredient catalogue ────────────────────────────────────────────────
//
// Passed explicitly rather than held in module scope: `search` reads like a pure
// function and should behave like one, and two builders on one page must not
// share state.

/**
 * The shortcode's JSON payload. Single-letter keys because 183 rows of full key names is
 * KB of repeated text for nothing. The one place all three layers have to agree:
 *
 *   YAML             payload   catalogue
 *   slug (map key)   s         slug
 *   name             n         name
 *   avail            a         gatherScore
 *   dlc              d         dlc
 *   effects          f         effects (indices into `e`)
 *   effects.mult     x         deviations
 *   effects.baseMag  bm        baseMagnitudes
 *   effects.baseDur  bd        baseDurations
 *   effects.baseCost bc        baseCosts
 *   effects.kind     k         harmful (kind === "bad")
 *   (image files)    g         images
 */
interface Payload {
  e: string[];
  bm: number[];
  bd: number[];
  bc: number[];
  k: boolean[];
  x: Record<string, [number, number]>[];
  i: { s: string; n: string; a: number; d: string; f: number[] }[];
  /** slug -> resolved image URL, for the few that have art yet. */
  g?: Record<string, string>;
}

export interface Catalogue {
  effectNames: string[];
  baseMagnitudes: number[];
  baseDurations: number[];
  baseCosts: number[];
  /** kind === "bad" in data/skyrim/effects.yaml. */
  harmful: boolean[];
  deviations: Record<string, [number, number]>[];
  ingredients: Ingredient[];
  /** Effect index to the ingredients carrying it. */
  carriersOf: Ingredient[][];
  images: Record<string, string>;
}

/**
 * The catalogue minus the add-ons you have turned off.
 *
 * Filtering the CATALOGUE, not the view: reachability, the rankings, the overflow and the
 * effect index all read these two arrays, so a DLC you turned off cannot come back as an
 * answer. As a view filter the toggles hid pills in the mortar and nothing else, and the
 * best brew was routinely built out of an ingredient the player cannot pick up.
 *
 * Ingredient objects are shared, not copied — identity comparisons across the two hold.
 */
export function catalogueWithout(catalogue: Catalogue, excluded: Set<string>): Catalogue {
  if (!excluded.size) return catalogue;
  const keep = (ingredient: Ingredient): boolean => !ingredient.dlc || !excluded.has(ingredient.dlc);
  return {
    ...catalogue,
    ingredients: catalogue.ingredients.filter(keep),
    carriersOf: catalogue.carriersOf.map((carriers) => carriers.filter(keep)),
  };
}

/** Blue benefits you, green harms you. The one rule every chip, cell and title follows. */
const sideOf = (catalogue: Catalogue, effect: number): string =>
  catalogue.harmful[effect] ? 'bad' : 'good';

/**
 * effects.yaml holds deviations BELOW 1 — Briar Heart takes Fortify Block to x0.5 — and
 * three call sites had drifted to three different tests for "worth printing". The `> 1`
 * one dropped those from screen 8's title, on the screen that exists to give a brew room.
 */
const multiplierSuffix = (applied: number | undefined): string =>
  applied === undefined ? '' : `<b>&times;${formatMultiplier(applied)}</b>`;

/** An effect with no magnitude carries all its strength in duration, so read that column. */
const readsDuration = (catalogue: Catalogue, effect: number): boolean =>
  catalogue.baseMagnitudes[effect] === 0;

function maskOf(effects: number[]): EffectMask {
  let low = 0;
  let high = 0;
  for (const index of effects) {
    if (index < 32) low |= 1 << index;
    else high |= 1 << (index - 32);
  }
  return { low, high };
}

export function buildCatalogue(payload: Payload): Catalogue {
  const ingredients: Ingredient[] = payload.i.map((row) => ({
    slug: row.s,
    name: row.n,
    gatherScore: row.a,
    dlc: row.d,
    effects: row.f,
    mask: maskOf(row.f),
  }));
  const carriersOf: Ingredient[][] = payload.e.map(() => []);
  for (const ingredient of ingredients) {
    for (const index of ingredient.effects) carriersOf[index].push(ingredient);
  }
  return {
    effectNames: payload.e,
    baseMagnitudes: payload.bm || [],
    baseDurations: payload.bd || [],
    baseCosts: payload.bc || [],
    harmful: payload.k || [],
    deviations: payload.x || [],
    ingredients,
    carriersOf,
    images: payload.g || {},
  };
}

// ── The mixture rule ────────────────────────────────────────────────────────

/** Effects shared by two or more of the mixture — what the bottle ends up doing. */
function effectsProducedBy(mixture: Ingredient[]): EffectMask {
  let low = 0;
  let high = 0;
  for (let a = 0; a < mixture.length; a++) {
    for (let b = a + 1; b < mixture.length; b++) {
      low |= mixture[a].mask.low & mixture[b].mask.low;
      high |= mixture[a].mask.high & mixture[b].mask.high;
    }
  }
  return { low, high };
}

/**
 * Could you drop one of these and get the same bottle?
 *
 * Canis Root + Hanging Moss makes a Fortify One-Handed potion. So does Canis Root +
 * Hanging Moss + Bear Claws, because Bear Claws carries Fortify One-Handed too — it is a
 * third carrier of an effect that already had two, and it changes nothing. The search
 * ranked those, and ranked them WELL: "most potent" and "easiest to gather" both scored
 * the mixture on the two ingredients that were doing the work.
 *
 * "Does every ingredient carry a produced effect" does not catch it — Bear Claws passes
 * that. Whether the mixture WITHOUT it produces the same set does.
 *
 * Multipliers are checked too: a redundant carrier can still be the strongest deviator,
 * in which case it buys magnitude rather than coverage and earns its slot.
 */
function isRedundant(catalogue: Catalogue, mixture: Ingredient[], produced: EffectMask): boolean {
  if (mixture.length < 3) return false;
  for (let index = 0; index < mixture.length; index += 1) {
    const rest = mixture.filter((_, position) => position !== index);
    const producedWithout = effectsProducedBy(rest);
    if (producedWithout.low !== produced.low || producedWithout.high !== produced.high) continue;
    // `multiplierFor`, not `deviationOf`: the inert half of the pair kept eight mixtures
    // whose third ingredient moved only the number nobody reads. Same call `describe`
    // makes, so the filter and the printed card agree.
    const unchanged = maskToIndices(produced, catalogue.effectNames.length).every((effect) =>
      multiplierFor(catalogue, mixture, effect) === multiplierFor(catalogue, rest, effect));
    if (unchanged) return true;
  }
  return false;
}

const covers = (outer: EffectMask, inner: EffectMask): boolean =>
  (outer.low & inner.low) === inner.low && (outer.high & inner.high) === inner.high;

export function maskToIndices(mask: EffectMask, effectCount: number): number[] {
  const indices: number[] = [];
  for (let index = 0; index < effectCount; index++) {
    const bit = index < 32 ? mask.low & (1 << index) : mask.high & (1 << (index - 32));
    if (bit !== 0) indices.push(index);
  }
  return indices;
}

/**
 * Where several deviating ingredients are present the furthest from 1.0 wins; see
 * `Mixture.contested` for why that is only sometimes the number the game uses.
 */
function deviationOf(catalogue: Catalogue, mixture: Ingredient[], effect: number): [number, number] {
  const table = catalogue.deviations[effect];
  if (!table) return [1, 1];
  let magnitude = 1;
  let duration = 1;
  for (const ingredient of mixture) {
    const row = table[ingredient.slug];
    if (!row) continue;
    if (Math.abs(row[0] - 1) > Math.abs(magnitude - 1)) magnitude = row[0];
    if (Math.abs(row[1] - 1) > Math.abs(duration - 1)) duration = row[1];
  }
  return [magnitude, duration];
}

/**
 * Paralysis, Invisibility, Waterbreathing, Light and Night Eye have a base magnitude of 0,
 * so their strength is all duration and the duration multiplier is the one that matters.
 */
function multiplierFor(catalogue: Catalogue, mixture: Ingredient[], effect: number): number {
  const [magnitude, duration] = deviationOf(catalogue, mixture, effect);
  return readsDuration(catalogue, effect) ? duration : magnitude;
}

/**
 * Whether two ingredients here deviate on this effect by DIFFERENT amounts.
 *
 * Disagreement, not merely several deviators. Six of Invisibility's seven carriers all
 * deviate by the same x1.5, and when they agree the printed multiplier is delivered
 * whichever one the game picks. Counting rows instead of values demoted provably-correct
 * "Most potent" winners in favour of harder-to-gather mixtures holding one deviator.
 */
function deviatorsDisagree(catalogue: Catalogue, mixture: Ingredient[], effect: number): boolean {
  const table = catalogue.deviations[effect];
  if (!table) return false;
  const column = readsDuration(catalogue, effect) ? 1 : 0;
  const values = new Set<number>();
  for (const ingredient of mixture) {
    const row = table[ingredient.slug];
    if (row) values.add(row[column]);
  }
  return values.size > 1;
}

// ── Potion or poison ────────────────────────────────────────────────────────
//
// The costliest effect decides the whole bottle (UESP, Skyrim:Alchemy Effects), so four
// good effects and one expensive Damage Health come out as a poison.
//
//   cost = floor( baseCost x max(magnitude^1.1, 1) x (duration/10)^1.1 )
//
// with the duration term dropped when the effect is instantaneous.

/**
 * An effect's gold cost up to a constant, which is all that ranking them needs.
 *
 * Leaving your alchemy strength out is exact, not a simplification: skill and gear put a
 * common M^1.1 in front of every cost and cannot change which is largest. Perks are out
 * because the game excludes them from this determination too (UESP) — otherwise
 * Benefactor would quietly turn poisons into potions.
 */
function relativeCostOf(catalogue: Catalogue, mixture: Ingredient[], effect: number): number {
  const [magnitudeMultiplier, durationMultiplier] = deviationOf(catalogue, mixture, effect);
  const magnitude = (catalogue.baseMagnitudes[effect] || 0) * magnitudeMultiplier;
  const duration = (catalogue.baseDurations[effect] || 0) * durationMultiplier;
  const magnitudeTerm = Math.max(Math.pow(magnitude, 1.1), 1);
  const durationTerm = duration ? Math.pow(duration / 10, 1.1) : 1;
  return (catalogue.baseCosts[effect] || 0) * magnitudeTerm * durationTerm;
}

/**
 * Which effect is in charge, and whether the top two tie across the potion/poison line.
 * Resist Magic ties both Weakness to Poison and Weakness to Magic at 7.1774; only the
 * first is reachable in three slots, in 65 of the 635,068 triples that make anything.
 * Nothing documents the game's tie-break, so a tie is reported rather than guessed.
 */
function dominanceOf(catalogue: Catalogue, mixture: Ingredient[], effects: number[]):
  { dominant: number; poison: boolean; undecided: boolean } {
  if (!effects.length) return { dominant: -1, poison: false, undecided: false };
  const ranked = effects
    .map((effect) => ({ effect, cost: relativeCostOf(catalogue, mixture, effect) }))
    .sort((a, b) => b.cost - a.cost);
  const top = ranked[0];
  const runnerUp = ranked[1];
  const poison = !!catalogue.harmful[top.effect];
  const undecided = !!runnerUp &&
    Math.abs(runnerUp.cost - top.cost) < 1e-9 &&
    !!catalogue.harmful[runnerUp.effect] !== poison;
  return { dominant: top.effect, poison, undecided };
}

function describe(catalogue: Catalogue, mixture: Ingredient[], produced: EffectMask, wanted: number[]): Mixture {
  const effects = maskToIndices(produced, catalogue.effectNames.length);
  const multipliers: Record<number, number> = {};
  for (const effect of effects) {
    const applied = multiplierFor(catalogue, mixture, effect);
    if (applied !== 1) multipliers[effect] = applied;
  }
  const { dominant, poison, undecided } = dominanceOf(catalogue, mixture, effects);
  const harmfulCount = effects.filter((effect) => catalogue.harmful[effect]).length;
  return {
    ingredients: mixture,
    effects,
    harmfulCount,
    gatherScore: mixture.reduce((total, ingredient) => total + ingredient.gatherScore, 0),
    multipliers,
    potency: wanted.reduce((total, effect) => total + (multipliers[effect] || 1), 0),
    contested: wanted.some((effect) => deviatorsDisagree(catalogue, mixture, effect)),
    dominant,
    poison,
    undecided,
    mixed: harmfulCount > 0 && harmfulCount < effects.length,
  };
}

export type Kind = 'good' | 'bad' | 'any';

/**
 * Does this bottle answer the question that was asked?
 *
 * Asking for a potion and being handed a poison at the top of the results is a search
 * failure, not a result — the mortar can be brilliant at hitting the effects you named
 * and still produce the opposite of what you wanted, because the side is decided by
 * whichever effect happens to cost the most (see `dominanceOf`). `undecided` counts as a
 * match for either side: the game itself has not settled it, so neither will this.
 */
export const matchesKind = (mixture: Mixture, kind: Kind): boolean =>
  kind === 'any' || mixture.undecided || (kind === 'good' ? !mixture.poison : mixture.poison);

/**
 * The tie-break that comes before every other one, so the side you asked for sorts to the
 * front of the winners AND of the overflow. Screen 3 and screen 9 must agree about which
 * brews are answers; sharing the comparator is what makes that structural.
 */
const sideFirst = (kind: Kind) => (a: Mixture, b: Mixture): number =>
  Number(!matchesKind(a, kind)) - Number(!matchesKind(b, kind));

export interface SearchResult {
  /** Winner per RANKINGS entry, chosen over every mixture found. */
  winners: (Mixture | null)[];
  /** What was asked for, so the renderer can mark the mixtures that missed it. */
  kind: Kind;
  /**
   * True when NOTHING produces the requested effects on the requested side, so the
   * winners are the nearest misses rather than answers. The cards say so in red.
   */
  closestOnly: boolean;
  /** Bounded list backing "show more". Never used for ranking. */
  sample: Mixture[];
  total: number;
  /** Effects that could still be added to the selection. */
  reachable: Set<number>;
}

export function search(catalogue: Catalogue, wanted: number[], kind: Kind = 'any'): SearchResult {
  const winners: (Mixture | null)[] = RANKINGS.map(() => null);
  const sample: Mixture[] = [];
  const reachable = new Set<number>();
  let total = 0;
  let matching = 0;

  const requestedSideFirst = sideFirst(kind);
  /**
   * A wrapper rather than a ownedCache candidate list: a filter has to decide up front what
   * to do when it empties the set, and this way the wrong side loses every comparison it
   * can while still winning when it is all there is. Built once per ranking, not once per
   * comparison — this runs ~85,000 times.
   */
  const rankers = RANKINGS.map((ranking) => (a: Mixture, b: Mixture): number =>
    requestedSideFirst(a, b) || ranking.compare(a, b, kind));

  // An effect needs two carriers to reach a bottle at all, and turning off an add-on can
  // take one below two — so this is a test, not the formality it was before DLC filtering.
  if (!wanted.length) {
    catalogue.effectNames.forEach((_, index) => {
      if (catalogue.carriersOf[index].length >= 2) reachable.add(index);
    });
    return { winners, kind, closestOnly: false, sample, total, reachable };
  }

  const wantedMask = maskOf(wanted);
  const rarest = wanted.reduce((best, effect) =>
    catalogue.carriersOf[effect].length < catalogue.carriersOf[best].length ? effect : best);
  const anchors = catalogue.carriersOf[rarest];

  const seen = new Set<string>();
  const consider = (mixture: Ingredient[]): void => {
    const produced = effectsProducedBy(mixture);
    if (!covers(produced, wantedMask)) return;
    // The same bottle off fewer ingredients is already in the results, or about to be.
    if (isRedundant(catalogue, mixture, produced)) return;

    const key = mixture.map((ingredient) => ingredient.slug).sort().join('|');
    if (seen.has(key)) return;
    seen.add(key);
    total++;

    const described = describe(catalogue, mixture, produced, wanted);
    if (matchesKind(described, kind)) matching++;
    for (const effect of described.effects) reachable.add(effect);
    rankers.forEach((beats, index) => {
      const current = winners[index];
      if (!current || beats(described, current) < 0) winners[index] = described;
    });
    if (sample.length < SAMPLE_LIMIT) sample.push(described);
  };

  for (let a = 0; a < anchors.length; a++) {
    for (let b = a + 1; b < anchors.length; b++) {
      const pair = [anchors[a], anchors[b]];
      consider(pair);
      for (const third of catalogue.ingredients) {
        if (third === pair[0] || third === pair[1]) continue;
        consider([...pair, third]);
      }
    }
  }
  return { winners, kind, closestOnly: total > 0 && matching === 0, sample, total, reachable };
}

// ── Rendering ───────────────────────────────────────────────────────────────

function gatherDots(score: number): string {
  return '●'.repeat(score) + '○'.repeat(MAX_GATHER_SCORE - score);
}

/** The DLC each two-letter badge stands for. Expanded nowhere else on the page. */
const DLC_NAMES: Record<string, string> = {
  DG: 'Dawnguard',
  HF: 'Hearthfire',
  DB: 'Dragonborn',
  CC: 'Creation Club',
};

const PLACEHOLDER_ART =
  '<svg class="sky-ph" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" ' +
  'focusable="false"><circle class="sky-ph__disc" cx="24" cy="24" r="22" />' +
  '<text class="sky-ph__mark" x="24" y="25" text-anchor="middle" dominant-baseline="central">?</text></svg>';

/**
 * @param alt  Empty on a result row, where the name sits right beside the picture, so the
 *   image is decoration; the ingredient's own name on a tile, where the picture IS the
 *   control and there is nothing else to announce.
 */
function artFor(catalogue: Catalogue, ingredient: Ingredient, alt = ''): string {
  const url = catalogue.images[ingredient.slug];
  if (!url) return PLACEHOLDER_ART;
  return `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async"` +
    `${alt ? '' : ' aria-hidden="true"'} />`;
}

/**
 * Same shape as partials/skyrim-dlc.html, off the same map — duplicated here only because
 * JS cannot reach Hugo at runtime. The code is a glyph a screen reader says as "D B", so
 * the name rides alongside it in `.sky-sr`.
 *
 * @param tag  `i` in a result row, `span.sky-ing__dlc` on a tile. Both take their hue from
 *   `[data-dlc]`, which is why the element can differ and the colour cannot.
 */
function dlcBadge(ingredient: Ingredient, tag: 'i' | 'span'): string {
  const code = ingredient.dlc;
  if (!code) return '';
  const name = escapeHtml(DLC_NAMES[code] || code);
  const className = tag === 'span' ? ' class="sky-ing__dlc"' : '';
  return `<${tag}${className} data-dlc="${escapeHtml(code)}" title="${name}" aria-hidden="true">` +
    `${escapeHtml(code)}</${tag}><span class="sky-sr"> (${name})</span>`;
}

/**
 * The gather dots were read out literally — "black circle black circle…" fifteen times per
 * card — so the glyphs are aria-hidden and the sentence they mean rides in `.sky-sr`.
 */
function ingredientRow(catalogue: Catalogue, ingredient: Ingredient): string {
  const score = ingredient.gatherScore;
  return `<li class="sky-bi"><span class="sky-bi__pic">${artFor(catalogue, ingredient)}</span>` +
    `<b>${escapeHtml(ingredient.name)}</b>${dlcBadge(ingredient, 'i')}` +
    `<em title="How easy this is to find: ${score} of ${MAX_GATHER_SCORE}">` +
    `<span aria-hidden="true">${gatherDots(score)}</span>` +
    `<span class="sky-sr">easy to find: ${score} of ${MAX_GATHER_SCORE}</span></em></li>`;
}

/**
 * COLOUR SAYS WHICH SIDE, and nothing else. It used to double as "you asked for this",
 * which returned one amber chip among blue ones and read as "only that one is a potion
 * effect". Asked-for is a fill now, and the verdict-setter a heavier border.
 */
function chipMarkup(
  catalogue: Catalogue,
  effect: number,
  { tagged = false, dominant = false, applied }: { tagged?: boolean; dominant?: boolean; applied?: number } = {},
): string {
  const classes = ['sky-chip'];
  if (tagged) classes.push('sky-chip--tag');
  if (dominant) classes.push('is-dominant');
  return `<li class="${classes.join(' ')}" data-side="${sideOf(catalogue, effect)}">` +
    `${escapeHtml(catalogue.effectNames[effect])}${multiplierSuffix(applied)}</li>`;
}

const effectChip = (catalogue: Catalogue, mixture: Mixture, effect: number, wanted: number[]): string =>
  chipMarkup(catalogue, effect, {
    tagged: wanted.indexOf(effect) !== -1,
    dominant: effect === mixture.dominant,
    applied: mixture.multipliers[effect],
  });

/** Flask, skull, or — when the top two costs tie across the sides — both circles. */
const verdictKind = (mixture: Mixture): 'good' | 'bad' | 'either' =>
  mixture.undecided ? 'either' : mixture.poison ? 'bad' : 'good';

/**
 * A second channel beside the glyph: "poison" and "poison that also restores your health"
 * are different things to be handed, and one colour could only say one of them. Mixed
 * outranks both sides; the glyph still says which way it fell.
 */
const verdictTone = (mixture: Mixture): string =>
  mixture.mixed ? 'mixed' : mixture.poison ? 'bad' : 'good';

const verdictLabel = (mixture: Mixture): string =>
  mixture.undecided ? 'Potion or poison' : mixture.poison ? 'Poison' : 'Potion';

/**
 * The same three glyphs screen 1 offers as choices, reused as the answer — so the flask
 * you pressed to ask for a potion is the flask that tells you that you got one.
 */
const VERDICT_GLYPH: Record<'good' | 'bad' | 'either', string> = {
  good: '<path d="M9.5 3h5M10.5 3v6.4l-5.1 8.9A1.7 1.7 0 0 0 6.9 21h10.2a1.7 1.7 0 0 0 1.5-2.7l-5.1-8.9V3" /><path d="M7.8 15h8.4" />',
  bad: '<path d="M12 3a7 7 0 0 0-4 12.7V18a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.3A7 7 0 0 0 12 3Z" /><path d="M9.7 10.2h.01M14.3 10.2h.01M10.5 19v2M13.5 19v2" />',
  either: '<circle cx="9" cy="12" r="6" /><circle cx="15" cy="12" r="6" />',
};

/**
 * @param interactive  Render a button rather than a span. Only the mortar's disc takes
 *   this: there the verdict is about a mixture you assembled by hand and have no other way
 *   to open, so the thing that announces it is also the way in. On a result card the whole
 *   card is already the button, and this would be a button inside a button.
 */
function verdictBadge(mixture: Mixture, interactive = false): string {
  const glyph = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    `${VERDICT_GLYPH[verdictKind(mixture)]}</svg>`;
  const tone = `data-tone="${verdictTone(mixture)}"`;
  // aria-label replaces the content outright, so the button carries no `.sky-sr` twin.
  if (interactive) {
    return `<button type="button" class="sky-verdict sky-verdict--go" ${tone} data-verdict-open ` +
      `aria-label="${escapeHtml(verdictLabel(mixture))} — see what each ingredient carries">${glyph}</button>`;
  }
  return `<span class="sky-verdict" ${tone}>${glyph}` +
    `<span class="sky-sr">${verdictLabel(mixture)}</span></span>`;
}

function chipsMarkup(catalogue: Catalogue, mixture: Mixture, wanted: number[]): string {
  return `<ul class="sky-chips">${mixture.effects
    .map((effect) => effectChip(catalogue, mixture, effect, wanted))
    .join('')}</ul>`;
}

/**
 * Every effect each ingredient carries, not only the ones that survived the mix.
 *
 * This is the answer to "why these three?" — a shared effect is the reason two ingredients
 * are in the same bottle, and the other three are what you are also carrying around. The
 * cell marked `is-shared` is one that made it into the mixture; the rest were outvoted,
 * because an effect needs two ingredients to appear at all.
 */
function ingredientEffectsTable(catalogue: Catalogue, mixture: Mixture): string {
  const inMixture = new Set(mixture.effects);
  const rows = mixture.ingredients.map((ingredient) => {
    const cells = ingredient.effects.map((effect) => {
      const classes = ['sky-fxcell'];
      if (inMixture.has(effect)) classes.push('is-shared');
      return `<td class="${classes.join(' ')}" data-side="${sideOf(catalogue, effect)}">` +
        `${escapeHtml(catalogue.effectNames[effect])}</td>`;
    }).join('');
    return `<tr><th scope="row">${escapeHtml(ingredient.name)}</th>${cells}</tr>`;
  }).join('');
  return '<table class="sky-fxtable">' +
    '<caption class="sky-sr">Every effect each ingredient carries. ' +
    'Highlighted cells are the ones this mixture produces.</caption>' +
    `<tbody>${rows}</tbody></table>`;
}

/**
 * Screen 8's title: the mortar's disc, then what the bottle does, each effect in its own
 * side's colour. It replaces the POTION pill and the chip row that used to say the same
 * thing twice in two visual languages.
 */
export function brewTitleMarkup(catalogue: Catalogue, mixture: Mixture): string {
  const effects = mixture.effects
    .map((effect) => `<span class="sky-brewtitle__fx" data-side="${sideOf(catalogue, effect)}">` +
      `${escapeHtml(catalogue.effectNames[effect])}${multiplierSuffix(mixture.multipliers[effect])}</span>`)
    .join('<span class="sky-brewtitle__sep" aria-hidden="true">+</span>');
  return `${verdictBadge(mixture)}<span class="sky-brewtitle__fxs">${effects}</span>`;
}

/**
 * SCREEN 8 — one brew with the room the card could not give it. The table is why this is a
 * screen and not a panel: four effect names per row do not fit a 15rem grid column, and
 * widening the card pushes everything below it down the page.
 */
export function brewDetailMarkup(catalogue: Catalogue, mixture: Mixture, closest = false): string {
  return [
    '<div class="sky-brewpage">',
    closest ? `<p class="sky-warn">${closestLead(true)}</p>` : '',
    `<ul class="sky-bis sky-bis--wide">${mixture.ingredients.map((ingredient) => ingredientRow(catalogue, ingredient)).join('')}</ul>`,
    // No heading and no legend: the list above names the table, and highlighting reads
    // as "these ones" without being told. The sr-only caption stays — the highlight is
    // the one thing there that cannot be seen.
    ingredientEffectsTable(catalogue, mixture),
    '</div>',
  ].join('');
}

function mixtureCard(
  catalogue: Catalogue,
  mixture: Mixture,
  wanted: number[],
  index: number,
  badge?: string,
  closest = false,
): string {
  const label = `${mixture.ingredients.map((ingredient) => ingredient.name).join(', ')} — ${verdictLabel(mixture)}`;
  return [
    '<article class="sky-brew">',
    '<div class="sky-brew__head">',
    // Labels share a cell so the disc keeps its corner however far a ranking name wraps.
    '<div class="sky-brew__labels">',
    badge ? `<h4 class="sky-brew__badge">${escapeHtml(badge)}</h4>` : '',
    closest ? `<p class="sky-brew__closest" title="${closestLead(false)}">Closest possible</p>` : '',
    '</div>',
    verdictBadge(mixture),
    '</div>',
    // A real button, so focus, Enter and Space come with the element. The index is how
    // the handler finds the mixture again once this markup has been replaced.
    `<button type="button" class="sky-brew__open" data-brew-open="${index}" ` +
    `aria-label="${escapeHtml(label)}. See what each ingredient carries.">`,
    `<ul class="sky-bis">${mixture.ingredients.map((ingredient) => ingredientRow(catalogue, ingredient)).join('')}</ul>`,
    chipsMarkup(catalogue, mixture, wanted),
    '</button>',
    '</article>',
  ].join('');
}

/**
 * A LABEL IS A CLAIM TO HAVE BEATEN THE BENCHMARK, so a ranking that only tied it stays
 * quiet. "Most potent" on a brew exactly as potent as RANKINGS[0]'s winner is not a reason
 * to pick it — it is a fact about a set where nothing did better, printed as if it were an
 * argument. Every label the old code printed on such a tie sent the reader to a worse
 * mixture with a better-sounding name.
 *
 * A ranking the benchmark itself wins keeps its label: there the claim is true, and it says
 * this one brew is best on every axis rather than merely first.
 *
 * A card left with no labels is dropped — nothing distinguished it.
 */
export function headlines(result: SearchResult): { mixture: Mixture; labels: string[] }[] {
  const cards: { mixture: Mixture; labels: string[] }[] = [];
  const benchmark = result.winners[0];
  RANKINGS.forEach((ranking, index) => {
    const winner = result.winners[index];
    if (!winner) return;
    if (benchmark && winner !== benchmark &&
      ranking.measure(winner, result.kind) <= ranking.measure(benchmark, result.kind)) return;
    const existing = cards.find((card) => card.mixture === winner);
    if (existing) existing.labels.push(ranking.label);
    else cards.push({ mixture: winner, labels: [ranking.label] });
  });
  return cards;
}

/** The mortar: no search and no ranking, because there is nothing to choose between. */
export function liveMixture(catalogue: Catalogue, chosen: Ingredient[]): Mixture | null {
  if (chosen.length < 2) return null;
  const produced = effectsProducedBy(chosen);
  if (!produced.low && !produced.high) return null;
  return describe(catalogue, chosen, produced, []);
}

/**
 * Every effect carried by anything that shares an effect with the one ingredient in the
 * mortar — i.e. what a THIRD slot could still bring to the table.
 *
 * Cheap because it is computed once per pick rather than once per candidate: OR the masks
 * of every bridge, then a single AND per pill. The alternative is 183 x 183 pair tests on
 * every repaint.
 *
 * Null unless exactly one ingredient is chosen. With none there is nothing to bridge to;
 * with two, the last slot is the candidate itself and there is nothing left to bridge
 * WITH, so the strict rule is already the right answer.
 */
export function bridgeMaskOf(catalogue: Catalogue, chosen: Ingredient[]): EffectMask | null {
  if (chosen.length !== 1) return null;
  const anchor = chosen[0];
  let low = 0;
  let high = 0;
  for (const other of catalogue.ingredients) {
    if (other === anchor) continue;
    if ((other.mask.low & anchor.mask.low) === 0 && (other.mask.high & anchor.mask.high) === 0) continue;
    low |= other.mask.low;
    high |= other.mask.high;
  }
  return { low, high };
}

/**
 * Could this ingredient be in a bottle with what is already chosen, given the slots left?
 *
 * `contributesTo` asks whether it pairs with something ALREADY in the mortar, which is the
 * quick answer and a pessimistic one: pick Hanging Moss and Juniper Berries greys out,
 * even though Canis Root shares Fortify One-Handed with the first and Fortify Marksman
 * with the second and makes all three work. The quick rule cannot see a bridge that has
 * not been picked yet.
 *
 * This looks one slot ahead. `bridge` is null wherever looking ahead is meaningless, in
 * which case the two rules agree.
 */
export function couldJoin(candidate: Ingredient, chosen: Ingredient[], bridge: EffectMask | null): boolean {
  if (sharesEffectWith(candidate, chosen)) return true;
  if (!bridge) return false;
  return (candidate.mask.low & bridge.low) !== 0 || (candidate.mask.high & bridge.high) !== 0;
}

/**
 * Would adding this ingredient contribute anything?
 *
 * An effect only reaches the bottle when two ingredients share it, so an ingredient that
 * shares nothing with what is already in the mortar is a wasted third slot. The game
 * would let you do it; there is no reason to want to.
 */
export function sharesEffectWith(candidate: Ingredient, chosen: Ingredient[]): boolean {
  if (!chosen.length) return true;
  return chosen.some((ingredient) =>
    (ingredient.mask.low & candidate.mask.low) !== 0 ||
    (ingredient.mask.high & candidate.mask.high) !== 0);
}

/**
 * One ingredient tile, matching partials/skyrim-ingredients.html so the two share their
 * CSS and a recipe card and the mortar look like the same thing.
 */
function tileMarkup(catalogue: Catalogue, ingredient: Ingredient, removable = false): string {
  const art = artFor(catalogue, ingredient, ingredient.name);
  // In the mortar the tile IS the way back out, so it is a real button with a real label.
  // On a recipe card there is nothing to take out, so it stays an inert span.
  const tile = removable
    ? `<button type="button" class="sky-tile sky-tile--drop" data-drop="${escapeHtml(ingredient.slug)}"` +
      ` aria-label="Take ${escapeHtml(ingredient.name)} out of the mortar">${art}</button>`
    : `<span class="sky-tile">${art}</span>`;
  return `<div class="sky-ing">${tile}` +
    `<span class="sky-ing__name">${escapeHtml(ingredient.name)}${dlcBadge(ingredient, 'span')}</span></div>`;
}

/**
 * The tiles of whatever is in the mortar, and — once there are two — what they make.
 *
 * The tray takes the verdict's colour and a disc in its corner, which is also why the
 * "Empty the mortar" button that used to hang under it is gone: with at most three tiles,
 * each of them its own remove control, a bulk clear was a second way to do a thing that
 * was already one tap away.
 */
export function mortarMarkup(catalogue: Catalogue, chosen: Ingredient[], mixture: Mixture | null = null): string {
  if (!chosen.length) return '';
  const tone = mixture ? ` data-tone="${verdictTone(mixture)}"` : '';
  return `<div class="sky-ings"${tone}>` +
    `${chosen.map((ingredient) => tileMarkup(catalogue, ingredient, true)).join('')}` +
    `${mixture ? verdictBadge(mixture, true) : ''}</div>`;
}

/**
 * Why the last tap did nothing.
 *
 * Kept out of `liveMarkup` on purpose: that function answers "what does this make", and a
 * refusal is not the bottle's answer. The reason used to live only in a `title`, which a
 * touch user can never surface and a keyboard user only hears if their reader reads
 * descriptions.
 *
 * It no longer also carries "Add a second — an effect only reaches the bottle when two
 * ingredients carry it": one tile in the tray, no chips under it, and every incompatible
 * pill struck through is the same statement, made three ways, on screen.
 */
function guidanceMarkup(refusal: string): string {
  return refusal ? `<p class="sky-hint sky-hint--refused">${escapeHtml(refusal)}</p>` : '';
}

/**
 * What the bottle currently holds. Nothing to say when it holds nothing: the tiles above
 * show what is in, and an absent chip row shows that it makes nothing yet.
 */
export function liveMarkup(catalogue: Catalogue, chosen: Ingredient[]): string {
  const mixture = liveMixture(catalogue, chosen);
  if (!mixture) return '';
  // The verdict is visible on the tray above, but this IS the live region, so the word
  // still has to be spoken — in `.sky-sr`, not as a second visible copy of it.
  return chipsMarkup(catalogue, mixture, []) +
    `<p class="sky-sr">${verdictLabel(mixture)}</p>`;
}

/**
 * Screen 6: one effect, every ingredient carrying it, and what else each of those brings.
 *
 * The other screens all ask a question about a BOTTLE. This one is the index — you have
 * an effect in mind and want to know what carries it, and, because an ingredient never
 * arrives alone, what else comes with it. The chips are the ingredient's own four, with
 * the effect you asked for marked and any multiplier printed on the chip it applies to.
 */
function carrierCard(catalogue: Catalogue, ingredient: Ingredient, asked: number): string {
  const chips = ingredient.effects.map((effect) => {
    // A one-ingredient mixture, so there is no strongest-deviator contest to hold.
    const applied = multiplierFor(catalogue, [ingredient], effect);
    return chipMarkup(catalogue, effect, {
      tagged: effect === asked,
      applied: applied === 1 ? undefined : applied,
    });
  }).join('');
  return '<article class="sky-brew">' +
    `<ul class="sky-bis">${ingredientRow(catalogue, ingredient)}</ul>` +
    `<ul class="sky-chips">${chips}</ul></article>`;
}

export function effectDetailMarkup(catalogue: Catalogue, effect: number): string {
  const carriers = catalogue.carriersOf[effect] || [];
  // No count above this: the cards are on screen and countable, and a number nobody asked
  // for taking the first line of the answer is the label winning again.
  return '<div class="sky-brews">' +
    `${carriers.map((ingredient) => carrierCard(catalogue, ingredient, effect)).join('')}</div>`;
}

/**
 * @param order  Filled with every mixture rendered, in card order. The cards carry the
 *               matching index, which is how a click on one finds its mixture again —
 *               the alternative is stashing objects on DOM nodes that the next render
 *               throws away.
 */
export function resultsMarkup(
  catalogue: Catalogue,
  result: SearchResult,
  wanted: number[],
  order: Mixture[] = [],
): string {
  order.length = 0;
  const cards = headlines(result);

  return [
    result.closestOnly ? `<p class="sky-warn">${closestLead(result.total !== 1)}</p>` : '',
    `<div class="sky-brews">${cards
      .map((c) => {
        order.push(c.mixture);
        return mixtureCard(catalogue, c.mixture, wanted, order.length - 1, c.labels.join(' · '), result.closestOnly);
      })
      .join('')}</div>`,
    // The count rides the button rather than taking a line of its own to say it, and it
    // counts what the button can actually reach — the browsable sample, not the raw total.
    // A button reading "Show more (2,318)" that leads to 400 is the sentence's old problem
    // moved onto the control.
    '<div class="sky-scr__foot">',
    browsableCount(result) > cards.length
      ? '<button type="button" class="sky-go sky-go--ghost" data-more>' +
        `Show more (${browsableCount(result).toLocaleString('en-US')})</button>`
      : '',
    '</div>',
  ].join('');
}

/**
 * What screen 9 can actually reach. The search keeps at most SAMPLE_LIMIT mixtures, and
 * `result.total` — often far larger — is not a number any control here can honour.
 */
export const browsableCount = (result: SearchResult): number => result.sample.length;

/**
 * The overflow in reading order: the side you asked for first, then the ranking winners,
 * then everything else by the same comparator the top card uses.
 *
 * The winners are IN this list rather than skipped from it. Screen 9 is the index — a list
 * called "every brew" that quietly omits the three best ones is a trap for anyone who
 * arrived here to look for a specific mixture, and their badges come along so page one
 * still says which is which.
 */
// ── Screen 9: the overflow ──────────────────────────────────────────────────

export function overflowOrder(result: SearchResult): { order: Mixture[]; badges: Map<Mixture, string> } {
  const badges = new Map<Mixture, string>();
  for (const card of headlines(result)) badges.set(card.mixture, card.labels.join(' · '));
  const requestedSideFirst = sideFirst(result.kind);
  const order = result.sample.slice().sort((a, b) =>
    requestedSideFirst(a, b) ||
    Number(!badges.has(a)) - Number(!badges.has(b)) ||
    RANKINGS[0].compare(a, b, result.kind));
  return { order, badges };
}

export const pageCount = (total: number): number => Math.max(1, Math.ceil(total / PAGE_SIZE));

/**
 * One page of it. Cards carry their index into the WHOLE list, not into the page, so a
 * click on the seventh card of page four still finds its mixture without the handler
 * having to know which page it came from.
 */
export function overflowPageMarkup(
  catalogue: Catalogue,
  all: Mixture[],
  wanted: number[],
  page: number,
  badges: Map<Mixture, string>,
  kind: Kind,
  closestOnly: boolean,
): string {
  const start = page * PAGE_SIZE;
  const cards = all.slice(start, start + PAGE_SIZE)
    .map((mixture, offset) => mixtureCard(
      catalogue, mixture, wanted, start + offset, badges.get(mixture),
      !matchesKind(mixture, kind) && !closestOnly,
    ))
    .join('');
  return `<div class="sky-brews">${cards}</div>`;
}

/** Also rewritten in place on every page turn, which is why it is not inline markup. */
const pageCounterInner = (page: number, pages: number): string =>
  `${page + 1}<span aria-hidden="true"> / </span><span class="sky-sr"> of </span>${pages}`;

const CHEVRON = (d: string): string =>
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
  `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${d}" /></svg>`;

/**
 * The carousel indicator: a dot per page while that is a countable number of dots, and a
 * plain "4 / 27" once it is not. Fifty dots is not an indicator, it is a texture.
 *
 * `aria-current`, not `role="tab"`. These are buttons that change what is above them, and
 * a tablist without tabpanels is a promise to a screen reader that nothing here keeps.
 */
const dotsMarkup = (page: number, pages: number): string =>
  '<div class="sky-pager__dots">' +
  Array.from({ length: pages }, (_, index) =>
    `<button type="button" class="sky-pager__dot" data-page="${index}"` +
    `${index === page ? ' aria-current="true"' : ''} ` +
    `aria-label="Page ${index + 1} of ${pages}"></button>`).join('') +
  '</div>';

export function pagerMarkup(page: number, pages: number): string {
  if (pages < 2) return '';
  const dots = pages <= 12
    ? dotsMarkup(page, pages)
    : `<p class="sky-pager__count" data-page-count>${pageCounterInner(page, pages)}</p>`;
  // Neither arrow is ever disabled. The list is a ring: past the last page is the first
  // one. A dead control at each end asks the reader to notice which end they are on before
  // pressing anything, which is a job the dots already do and the arrows should not.
  return [
    `<button type="button" class="sky-pager__arrow" data-page-step="-1" aria-label="Previous page">` +
    `${CHEVRON('m15 18-6-6 6-6')}</button>`,
    dots,
    `<button type="button" class="sky-pager__arrow" data-page-step="1" aria-label="Next page">` +
    `${CHEVRON('m9 18 6-6-6-6')}</button>`,
  ].join('');
}

/**
 * ONE FLICK, ONE PAGE — a reader for horizontal trackpad scrolling.
 *
 * A flick is not one event. It is a burst of deltas while the fingers are on the pad, then
 * a momentum tail the browser keeps sending for up to a second and a half after they have
 * left it, so accumulating naively turns one flick into five pages.
 *
 * Two ways back in after a page has been spent, and both are needed. Silence ends a
 * gesture — but the tail never falls silent, so waiting for quiet swallowed the next flick
 * entirely, and only pausing (say, to move the cursor) got through. So a delta over PUSH
 * and more than DOUBLE what the tail has decayed to also counts as new: momentum is noisy
 * rather than smoothly monotonic, and merely "bigger than the last one" re-armed on that
 * jitter, letting the tail feed itself back over the line nine times per flick.
 *
 * @returns -1, 0 or 1 — the page step this event completes, if any.
 */
function createFlickReader(): (deltaX: number, at: number) => number {
  /** Sideways travel that counts as a page. */
  const PAGE = 55;
  /** Silence that ends a gesture. Tail events arrive ~16ms apart, so this is safe. */
  const QUIET = 140;
  /** Below this, a delta is momentum or a stray graze — never a deliberate push. */
  const PUSH = 12;
  let travelled = 0;
  let lastAt = 0;
  /** The level the current tail has decayed to — the bar a new push has to clear. */
  let tail = 0;
  let spent = false;

  return (deltaX, at) => {
    const size = Math.abs(deltaX);
    if (at - lastAt > QUIET) { travelled = 0; spent = false; }
    lastAt = at;
    if (spent) {
      if (size < PUSH || size <= tail * 2) {
        // Still falling. Follow it down, so the bar a new push must clear falls with it.
        tail = Math.min(tail, size);
        return 0;
      }
      travelled = 0;
      spent = false;
    }
    travelled += deltaX;
    if (Math.abs(travelled) < PAGE) return 0;
    spent = true;
    tail = size;
    return travelled > 0 ? 1 : -1;
  };
}

/** Why a pill in the mortar's grid refuses to be picked. */
function blockReason(mortarIsFull: boolean, usesQuickRule: boolean): string {
  if (mortarIsFull) return 'The mortar already holds three';
  if (usesQuickRule) return 'Shares no effect with what is already in the mortar';
  return 'No third ingredient can bridge these';
}

// ── Wiring ──────────────────────────────────────────────────────────────────

/** Screen 2 has no way to show which side you asked for — every pill looks the same. */
const KIND_LABEL: Record<Kind, string> = { good: 'Potion', bad: 'Poison', any: 'Mixture' };

/** Screen 8 is reached from three places, so its Back has three names. */
const BACK_FROM: Record<number, string> = {
  3: 'Back to the brews',
  4: 'Back to the mortar',
  9: 'Back to every brew',
};

/** The one answer both the results and the overflow give when the search comes up empty. */
const NOTHING_SPOKEN = 'Nothing can produce that combination.';
const NOTHING = `<p class="sky-hint">${NOTHING_SPOKEN}</p>`;

/** And the one it gives when everything it found is on the wrong side. */
const closestLead = (plural: boolean): string =>
  `Nothing produces ${plural ? 'these' : 'this'} on the side you asked for. ` +
  `${plural ? 'These are' : 'This is'} the nearest ${plural ? 'misses' : 'miss'}.`;

export function initBuilder(): void {
  for (const root of queryAll<HTMLElement>(document, '[data-builder]')) setUp(root);
}

function setUp(root: HTMLElement): void {
  const payloadScript = root.querySelector('[data-builder-data]');
  const results = root.querySelector<HTMLElement>('[data-results]');
  const resultsHead = root.querySelector<HTMLElement>('[data-result-head]');
  const brewButton = root.querySelector<HTMLButtonElement>('[data-brew]');
  if (!payloadScript || !results || !brewButton) return;

  const catalogue = buildCatalogue(JSON.parse(payloadScript.textContent || '{}') as Payload);

  const effectPickButtons = queryAll<HTMLButtonElement>(root, '[data-fx]');
  const ingredientButtons = queryAll<HTMLButtonElement>(root, '[data-ing]');
  const live = root.querySelector<HTMLElement>('[data-live]');
  const mortar = root.querySelector<HTMLElement>('[data-mortar]');
  const filter = root.querySelector<HTMLInputElement>('[data-ing-filter]');
  const ingredientEmpty = root.querySelector<HTMLElement>('[data-ing-empty]');
  // One control, rendered on four screens. The state lives here, not in the buttons, so
  // pressing DB on the brews screen is the same press as DB in the mortar.
  const dlcGroups = queryAll<HTMLElement>(root, '[data-dlc-group]');
  const hiddenDlc = new Set<string>();
  const quickToggle = root.querySelector<HTMLButtonElement>('[data-quick-toggle]');
  const dlcToggles = queryAll<HTMLButtonElement>(root, '[data-dlc-toggle]');
  // Screen 5/6 — the effect index.
  const fxHead = root.querySelector<HTMLElement>('[data-fx-head]');
  const fxDetail = root.querySelector<HTMLElement>('[data-fx-detail]');
  const fxFilter = root.querySelector<HTMLInputElement>('[data-fx-filter]');
  const fxEmpty = root.querySelector<HTMLElement>('[data-fx-empty]');
  const effectIndexButtons = queryAll<HTMLButtonElement>(root, '[data-fxinfo]');
  const kindHead = root.querySelector<HTMLElement>('[data-kind-head]');
  // Screen 8 — one brew on its own.
  const brewHead = root.querySelector<HTMLElement>('[data-brew-head]');
  const brewDetail = root.querySelector<HTMLElement>('[data-brew-detail]');
  // Screen 8 is reached from the results, from the overflow, and from the mortar, so its
  // Back is written at open time rather than baked into the markup — otherwise opening a
  // brew from the mortar drops you into a results screen you never asked for.
  const brewBack = root.querySelector<HTMLElement>('[data-scr="8"] [data-back]');
  // Screen 9 — the overflow.
  const overflowScreen = root.querySelector<HTMLElement>('[data-scr="9"]');
  const overflowHead = root.querySelector<HTMLElement>('[data-all-head]');
  const overflowGrid = root.querySelector<HTMLElement>('[data-all-page]');
  const overflowPager = root.querySelector<HTMLElement>('[data-all-pager]');
  const overflowLive = root.querySelector<HTMLElement>('[data-all-live]');
  /** The mixtures behind the cards currently on screen 3, in the order they were drawn. */
  const rendered: Mixture[] = [];
  let resultsAreClosest = false;
  /** The same, for screen 9 — the whole sorted overflow, of which one page is on screen. */
  let overflowMixtures: Mixture[] = [];
  let badges = new Map<Mixture, string>();
  let overflowIsClosest = false;
  let overflowPage = 0;
  const bySlug = new Map(catalogue.ingredients.map((ingredient) => [ingredient.slug, ingredient]));
  /**
   * What the ingredient filter matches on: the name AND its four effects.
   *
   * Typing "marksman" used to find nothing, because no ingredient has the word in its
   * name — "what carries Fortify Marksman" had to be asked on a different screen, which
   * is a strange thing for the screen with all 183 of them on it to refuse.
   *
   * Built once. 183 rows of string concatenation per keystroke is not free.
   */
  const haystack = new Map<string, string>();
  for (const ingredient of catalogue.ingredients) {
    const effects = ingredient.effects.map((effect) => catalogue.effectNames[effect]).join(' ');
    haystack.set(ingredient.slug, `${ingredient.name} ${effects}`.toLowerCase());
  }
  let kind: Kind = 'any';
  let wanted: number[] = [];
  let chosen: Ingredient[] = [];
  /** Why the last tap did nothing. Cleared by anything that does something. */
  let refusal = '';

  /**
   * `search` walks up to ~85,000 candidate triples and ran twice per brew: once for the
   * reachability pass on the last effect click, then again in `paintResults` for the
   * same selection, with the first result thrown away. One slot is enough — the search is
   * pure in `wanted`, and the selection cannot change between those two calls.
   */
  let cacheKey = '';
  let cached: SearchResult | null = null;
  /** Which add-ons are off, as a cache key fragment. */
  const dlcKey = (): string => [...hiddenDlc].sort().join('');

  /**
   * The catalogue every answer is drawn from — the full one until an add-on is turned off.
   * Rebuilt only when that set changes, not per search: `paintReachability` runs on every
   * effect pill, and re-filtering 183 ingredients and 59 carrier lists each time would be
   * work done to reach the same object.
   */
  let ownedCache = catalogue;
  let ownedCacheKey = '';
  const ownedCatalogue = (): Catalogue => {
    const key = dlcKey();
    if (key !== ownedCacheKey) {
      ownedCacheKey = key;
      ownedCache = catalogueWithout(catalogue, hiddenDlc);
    }
    return ownedCache;
  };

  const searchFor = (selection: number[]): SearchResult => {
    const key = `${kind}|${dlcKey()}|${selection.join(',')}`;
    if (!cached || key !== cacheKey) {
      cacheKey = key;
      cached = search(ownedCatalogue(), selection, kind);
    }
    return cached;
  };

  /**
   * Hiding the outgoing screen destroys focus — it holds the button that was just
   * pressed — and the browser drops it to <body>, which on a page this long silently
   * returns a keyboard or screen-reader user to the very top. So the incoming screen
   * takes focus itself; it is a `tabindex="-1"` landmark with an aria-label, never a tab
   * stop. `moveFocus` is off for the initial call, which would otherwise steal focus and
   * scroll the page on load.
   */
  const currentScreen = (): number => Number(root.getAttribute('data-screen')) || 1;

  const showScreen = (screen: number, moveFocus = true): void => {
    root.setAttribute('data-screen', String(screen));
    let incoming: HTMLElement | null = null;
    for (const section of queryAll<HTMLElement>(root, '[data-scr]')) {
      const active = section.getAttribute('data-scr') === String(screen);
      section.hidden = !active;
      if (active) incoming = section;
    }
    if (moveFocus) incoming?.focus();
  };

  /** Everything a click already knows: what is picked, what the kind filter shows. */
  const paintSelection = (): void => {
    for (const button of effectPickButtons) {
      const effect = Number(button.dataset.fx);
      const selected = wanted.indexOf(effect) !== -1;
      const item = button.closest('li');
      const visible = kind === 'any' || button.dataset.kind === kind;
      if (item) item.hidden = !visible;
      button.classList.toggle('is-on', selected);
      button.setAttribute('aria-pressed', String(selected));
      // A picked effect is reachable by definition, so the one the reader just pressed
      // never shows a stale greyed state while the search catches up.
      if (selected) {
        button.setAttribute('aria-disabled', 'false');
        button.title = '';
      }
    }
    // The [data-picked] line that used to be written here spelled the selection back out
    // beside the pills that carry it — and, empty, told the reader that incompatible
    // effects would grey out, which they do, visibly, on the next tap. Brew going live is
    // the state change worth having.
    brewButton.disabled = !wanted.length;
  };

  /** The half that costs a search: what can still join what is already picked. */
  const paintReachability = (): void => {
    const { reachable } = searchFor(wanted);
    for (const button of effectPickButtons) {
      const effect = Number(button.dataset.fx);
      // aria-disabled, not disabled: a disabled button leaves the tab order, so picking one
      // effect used to make every incompatible one silently vanish for a screen reader.
      // These stay focusable and say why; toggleEffect is what refuses the click.
      const unreachable = wanted.indexOf(effect) === -1 && !reachable.has(effect);
      button.setAttribute('aria-disabled', String(unreachable));
      button.title = unreachable ? 'Cannot share a bottle with what you have already picked' : '';
    }
  };

  /**
   * The search ran synchronously inside the click, so the pill did not repaint until it
   * finished: 129ms for the worst effect (Restore Magicka), measured, on a desktop — four
   * or five times that on a mid-range phone, which is well past the 200ms INP threshold.
   * Selection paints on the click and the search follows on the trailing edge, the same
   * shape the resto planner and the enchant calculator next door have always used.
   */
  const scheduleReachability = debounce(paintReachability, 150);

  const paintEffectGrid = (): void => {
    paintSelection();
    scheduleReachability();
  };

  /** The mortar: three slots, live, with everything useless greyed out. */
  const paintIngredientScreen = (): void => {
    const needle = (filter?.value || '').trim().toLowerCase();
    const mortarIsFull = chosen.length >= 3;
    // The quick rule only pairs against what is already in the mortar; the deep one looks
    // one slot ahead for an ingredient that could bridge. Both are per repaint, not per pill.
    const usesQuickRule = !quickToggle || quickToggle.getAttribute('aria-pressed') !== 'false';
    // Searched over the catalogue you OWN, or a bridge could keep a pill lit on the
    // strength of an ingredient the list below is refusing to show you.
    const bridge = usesQuickRule ? null : bridgeMaskOf(ownedCatalogue(), chosen);
    let shownCount = 0;
    for (const button of ingredientButtons) {
      const ingredient = bySlug.get(button.dataset.ing || '');
      if (!ingredient) continue;
      const picked = chosen.indexOf(ingredient) !== -1;
      const item = button.closest('li');
      // An add-on the reader turned off, or a name the filter did not match. Anything
      // already in the mortar stays in it — the tray records what you picked, it is not a
      // view that re-filters underneath you.
      const hide = (!!ingredient.dlc && hiddenDlc.has(ingredient.dlc)) ||
        (!!needle && (haystack.get(ingredient.slug) || '').indexOf(needle) === -1);
      if (item) item.hidden = hide;
      if (!hide) shownCount++;
      button.classList.toggle('is-on', picked);
      button.setAttribute('aria-pressed', String(picked));
      // Same reasoning as the effect grid: stay focusable, carry the reason.
      const reachable = usesQuickRule
        ? sharesEffectWith(ingredient, chosen)
        : couldJoin(ingredient, chosen, bridge);
      const blocked = !picked && (mortarIsFull || !reachable);
      button.setAttribute('aria-disabled', String(blocked));
      button.title = blocked ? blockReason(mortarIsFull, usesQuickRule) : '';
    }
    if (ingredientEmpty) ingredientEmpty.hidden = shownCount > 0;
    const mixture = liveMixture(catalogue, chosen);
    if (mortar) mortar.innerHTML = mortarMarkup(catalogue, chosen, mixture);
    if (live) live.innerHTML = liveMarkup(catalogue, chosen) + guidanceMarkup(refusal);
  };

  /**
   * Screen 8, from wherever. `from` is where its Back should go, which is the screen you
   * were standing on — the results, the overflow, or the mortar.
   */
  /**
   * Delegated rather than per card: both grids are rewritten from scratch on every search
   * or page turn, so per-card listeners would be rebound a screenful at a time for nothing.
   * The lists are read at click time for the same reason.
   */
  const bindBrewOpeners = (
    host: HTMLElement | null,
    mixtures: () => Mixture[],
    from: number,
    isClosest: () => boolean,
    swallow: () => boolean = () => false,
  ): void => {
    host?.addEventListener('click', (event) => {
      const opener = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-brew-open]');
      if (!opener || swallow()) return;
      const mixture = mixtures()[Number(opener.dataset.brewOpen)];
      if (mixture) openBrew(mixture, from, isClosest());
    }, true);
  };

  const openBrew = (mixture: Mixture, from: number, closest = false): void => {
    if (!brewDetail) return;
    if (brewHead) brewHead.innerHTML = brewTitleMarkup(catalogue, mixture);
    brewDetail.innerHTML = brewDetailMarkup(catalogue, mixture, closest);
    if (brewBack) {
      brewBack.dataset.back = String(from);
      // The name has to move with the destination. It did not, so a brew opened from the
      // mortar offered "Back to the brews" and then went to the mortar.
      brewBack.setAttribute('aria-label', BACK_FROM[from] || 'Back');
    }
    showScreen(8);
  };

  const paintPager = (pages: number): void => {
    if (!overflowPager) return;
    for (const dot of queryAll<HTMLButtonElement>(overflowPager, '[data-page]')) {
      dot.toggleAttribute('aria-current', Number(dot.dataset.page) === overflowPage);
    }
    const counter = overflowPager.querySelector<HTMLElement>('[data-page-count]');
    if (counter) counter.innerHTML = pageCounterInner(overflowPage, pages);
  };

  /**
   * One page of the overflow, and the pager caught up to it.
   *
   * The GRID is rewritten; the pager is edited in place. Rewriting both would destroy the
   * arrow that was just pressed, dropping focus to <body> on every page turn — the same
   * problem screens have when they hide, one control down. `direction` only feeds the
   * entry animation, so a page that arrives from a swipe leans the way the thumb went.
   */
  const paintOverflowPage = (page: number, direction = 0): void => {
    if (!overflowGrid) return;
    const pages = pageCount(overflowMixtures.length);
    overflowPage = Math.min(Math.max(page, 0), pages - 1);
    overflowGrid.innerHTML = overflowPageMarkup(
      catalogue, overflowMixtures, wanted, overflowPage, badges, kind, overflowIsClosest);
    // Restarting the animation needs the attribute to actually change, so it is cleared
    // and reapplied on the next frame rather than simply reassigned.
    overflowGrid.removeAttribute('data-enter');
    if (direction) {
      requestAnimationFrame(() => overflowGrid.setAttribute('data-enter', direction > 0 ? 'next' : 'prev'));
    }
    paintPager(pages);
    // The cards are not announced — eight of them read aloud on every arrow press is the
    // "show more" live region's old mistake with a shorter list. The position is.
    if (overflowLive) overflowLive.textContent = `Page ${overflowPage + 1} of ${pages}`;
  };

  /**
   * A page step from an arrow, a key, a thumb or a trackpad. The list wraps: forward from
   * the last page is the first, back from the first is the last. Paging is a way to sweep
   * a list you are scanning, and a sweep that stops dead at one end makes you turn around
   * and count your way back rather than carry on.
   */
  const stepPage = (delta: number): void => {
    const pages = pageCount(overflowMixtures.length);
    if (pages < 2) return;
    paintOverflowPage((overflowPage + delta + pages) % pages, delta);
  };

  const wantedLabel = (): string => wanted.map((effect) => catalogue.effectNames[effect]).join(' + ');

  /** Rebuild the overflow from the current search. Does not move focus or change screen. */
  const buildOverflow = (): void => {
    const result = searchFor(wanted);
    ({ order: overflowMixtures, badges } = overflowOrder(result));
    overflowIsClosest = result.closestOnly;
    overflowPage = 0;
    if (overflowHead) overflowHead.textContent = wantedLabel();
    // The pager's SHAPE depends on the page count — dots or a counter — so it is built
    // here, once per search, and only its state moves after that.
    if (overflowPager) overflowPager.innerHTML = overflowMixtures.length ? pagerMarkup(0, pageCount(overflowMixtures.length)) : '';
    if (!overflowMixtures.length) {
      // Turning off an add-on can empty a list the reader is standing in the middle of.
      // The same answer screen 3 gives, given here rather than one screen back.
      if (overflowGrid) overflowGrid.innerHTML = NOTHING;
      if (overflowLive) overflowLive.textContent = NOTHING_SPOKEN;
      return;
    }
    paintOverflowPage(0);
  };

  const openOverflow = (): void => {
    buildOverflow();
    showScreen(9);
  };

  const paintResults = (): void => {
    if (resultsHead) resultsHead.textContent = wantedLabel();
    const result = searchFor(wanted);
    if (!result.total) {
      results.innerHTML = NOTHING;
      return;
    }
    resultsAreClosest = result.closestOnly;
    results.innerHTML = resultsMarkup(catalogue, result, wanted, rendered);
    results.querySelector<HTMLButtonElement>('[data-more]')?.addEventListener('click', openOverflow);
  };

  bindBrewOpeners(results, () => rendered, 3, () => resultsAreClosest);

  // The browser fires a click after every pointer sequence, so a drag that ends on a card
  // would open it. Set by the drag handlers below; declared here, where it is first read.
  let suppressNextClick = false;

  bindBrewOpeners(overflowGrid, () => overflowMixtures, 9, () => overflowIsClosest,
    () => suppressNextClick);

  overflowPager?.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    const step = target?.closest<HTMLElement>('[data-page-step]');
    if (step) return stepPage(Number(step.dataset.pageStep));
    const dot = target?.closest<HTMLElement>('[data-page]');
    if (!dot) return;
    const page = Number(dot.dataset.page);
    paintOverflowPage(page, Math.sign(page - overflowPage));
  });

  // Left and right, as the screen's own shape suggests. Scoped to the section so it cannot
  // hijack an arrow key meant for the filter boxes on other screens.
  overflowScreen?.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
    event.preventDefault();
    stepPage(event.key === 'ArrowRight' ? 1 : -1);
  });

  /**
   * DRAG — one path for a finger, a trackpad and a mouse, via pointer events.
   *
   * Two things make it work on a touchscreen: `touch-action: pan-y` in the stylesheet, or
   * the browser claims the horizontal gesture and cancels the pointer stream mid-drag; and
   * pointer capture, so a drag that wanders off the grid still ends up here.
   *
   * The grid follows at a third speed — 1:1 promises a next page that is not rendered yet.
   */
  /** Sideways travel that commits to a page turn. */
  const SWIPE_COMMIT_PX = 45;
  /** How far the grid moves per pixel of finger. Not 1:1 — see the note above. */
  const DRAG_FOLLOW = 0.32;
  /** Where the gesture stops being ambiguous and becomes a horizontal drag. */
  const DRAG_DECIDED_PX = 8;
  let startX = 0;
  let startY = 0;
  let pointerTracking = false;
  let draggingHorizontally = false;

  const endDrag = (turned: boolean): void => {
    if (!overflowGrid) return;
    overflowGrid.style.transform = '';
    // A frame late when the page turns: the entry animation IS the movement, and the
    // spring-back transition this attribute suppresses would race it on the same property.
    if (turned) requestAnimationFrame(() => overflowGrid.removeAttribute('data-dragging'));
    else overflowGrid.removeAttribute('data-dragging');
    pointerTracking = false;
    draggingHorizontally = false;
  };

  overflowGrid?.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (pageCount(overflowMixtures.length) < 2) return;
    startX = event.clientX;
    startY = event.clientY;
    pointerTracking = true;
    draggingHorizontally = false;
    suppressNextClick = false;
  });

  overflowGrid?.addEventListener('pointermove', (event) => {
    if (!pointerTracking || !overflowGrid) return;
    const dx = event.clientX - startX;
    if (!draggingHorizontally) {
      // Decided once, and not revisited: a gesture that starts vertical stays a scroll
      // however far sideways it later drifts.
      if (Math.abs(dx) < DRAG_DECIDED_PX) return;
      if (Math.abs(dx) <= Math.abs(event.clientY - startY)) {
        pointerTracking = false;
        return;
      }
      draggingHorizontally = true;
      suppressNextClick = true;
      overflowGrid.setAttribute('data-dragging', '');
      overflowGrid.setPointerCapture?.(event.pointerId);
    }
    overflowGrid.style.transform = `translateX(${(dx * DRAG_FOLLOW).toFixed(1)}px)`;
  });

  overflowGrid?.addEventListener('pointerup', (event) => {
    if (!pointerTracking) return;
    const dx = event.clientX - startX;
    const turned = draggingHorizontally && Math.abs(dx) >= SWIPE_COMMIT_PX;
    endDrag(turned);
    if (turned) stepPage(dx < 0 ? 1 : -1);
    // Cleared a task later, so the click this same gesture is about to fire still finds it.
    if (suppressNextClick) setTimeout(() => { suppressNextClick = false; }, 0);
  });
  overflowGrid?.addEventListener('pointercancel', () => endDrag(false));

  const readFlick = createFlickReader();
  overflowGrid?.addEventListener('wheel', (event) => {
    if (pageCount(overflowMixtures.length) < 2) return;
    // A vertical scroll that drifts sideways is a vertical scroll.
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    // Non-passive, so this can run: otherwise the browser reads the same gesture as a
    // back-navigation swipe and leaves the page entirely.
    event.preventDefault();
    const step = readFlick(event.deltaX, event.timeStamp);
    if (step) stepPage(step);
  }, { passive: false });

  for (const button of queryAll<HTMLButtonElement>(root, '.sky-pick__b[data-kind]')) {
    button.addEventListener('click', () => {
      kind = (button.dataset.kind as Kind) || 'any';
      if (kindHead) kindHead.textContent = KIND_LABEL[kind];
      wanted = [];
      paintEffectGrid();
      showScreen(2);
    });
  }

  /** Substring match over the effect names, the same shape as the ingredient filter. */
  const paintEffectIndex = (): void => {
    const needle = (fxFilter?.value || '').trim().toLowerCase();
    let shownCount = 0;
    for (const button of effectIndexButtons) {
      const hide = !!needle && (button.textContent || '').toLowerCase().indexOf(needle) === -1;
      const item = button.closest('li');
      if (item) item.hidden = hide;
      if (!hide) shownCount++;
    }
    if (fxEmpty) fxEmpty.hidden = shownCount > 0;
  };

  for (const button of effectIndexButtons) {
    button.addEventListener('click', () => {
      const effect = Number(button.dataset.fxinfo);
      if (fxHead) fxHead.textContent = catalogue.effectNames[effect];
      // "What carries Fortify Sneak" should not answer with an add-on the reader has
      // just said they do not have.
      if (fxDetail) fxDetail.innerHTML = effectDetailMarkup(ownedCatalogue(), effect);
      showScreen(6);
    });
  }

  fxFilter?.addEventListener('input', paintEffectIndex);

  for (const button of queryAll<HTMLButtonElement>(root, '.sky-pick__b[data-mode="favorites"]')) {
    button.addEventListener('click', () => showScreen(7));
  }

  for (const button of queryAll<HTMLButtonElement>(root, '.sky-pick__b[data-mode="effects"]')) {
    button.addEventListener('click', () => {
      if (fxFilter) fxFilter.value = '';
      paintEffectIndex();
      showScreen(5);
    });
  }

  for (const button of queryAll<HTMLButtonElement>(root, '.sky-pick__b[data-mode="ingredient"]')) {
    button.addEventListener('click', () => {
      chosen = [];
      refusal = '';
      if (filter) filter.value = '';
      paintIngredientScreen();
      showScreen(4);
    });
  }

  const toggleIngredient = (ingredient: Ingredient): void => {
    const at = chosen.indexOf(ingredient);
    if (at === -1) {
      if (chosen.length >= 3) return;
      chosen.push(ingredient);
    } else {
      chosen.splice(at, 1);
    }
    refusal = '';
    paintIngredientScreen();
  };

  for (const button of ingredientButtons) {
    button.addEventListener('click', () => {
      // These stay focusable so a screen reader can find them and hear why; refusing the
      // click here is what `disabled` used to do. The refusal used to be silent in every
      // channel — no movement, no message, and a `title` a thumb cannot reach — on the one
      // screen where a single pick strikes through 127 other pills.
      if (button.getAttribute('aria-disabled') === 'true') {
        refusal = button.title;
        paintIngredientScreen();
        return;
      }
      const ingredient = bySlug.get(button.dataset.ing || '');
      if (ingredient) toggleIngredient(ingredient);
    });
  }

  // The tiles are rewritten on every change, so this is delegated to the container that
  // survives. Clicking the picture takes that ingredient back out — the same thing the
  // pill below does, in the place you are already looking.
  mortar?.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    // The verdict disc. It is the one thing on this screen that already knows what the
    // three tiles make, so it is also the way to the table that spells that out — the same
    // screen a result card opens, reached from the mixture you built rather than one the
    // search found. Back returns to the mortar, with the tiles still in it.
    if (target?.closest('[data-verdict-open]')) {
      const inTray = liveMixture(catalogue, chosen);
      if (inTray) openBrew(inTray, 4);
      return;
    }
    const tile = target?.closest<HTMLElement>('[data-drop]');
    if (!tile) return;
    const ingredient = bySlug.get(tile.dataset.drop || '');
    if (ingredient) toggleIngredient(ingredient);
  });

  // Typing is a new question; a refusal from the last tap should not survive it.
  filter?.addEventListener('input', () => {
    refusal = '';
    paintIngredientScreen();
  });

  // aria-pressed is the state, not a class: a toggle button's pressed-ness belongs in the
  // accessibility tree first, and the CSS keys off the same attribute so the two cannot
  // disagree the way a class and an aria attribute eventually do.
  for (const group of dlcGroups) group.hidden = false;
  if (quickToggle) {
    quickToggle.hidden = false;
    quickToggle.addEventListener('click', () => {
      quickToggle.setAttribute('aria-pressed', String(quickToggle.getAttribute('aria-pressed') === 'false'));
      refusal = '';
      paintIngredientScreen();
    });
  }
  /** Every copy of the control, told what the one shared set now says. */
  const paintDlc = (): void => {
    for (const box of dlcToggles) {
      box.setAttribute('aria-pressed', String(!hiddenDlc.has(box.dataset.dlcToggle || '')));
    }
  };

  for (const box of dlcToggles) {
    box.addEventListener('click', () => {
      const code = box.dataset.dlcToggle || '';
      if (hiddenDlc.has(code)) hiddenDlc.delete(code);
      else hiddenDlc.add(code);
      paintDlc();
      refusal = '';
      paintIngredientScreen();
      // Which effects can still be reached depends on which ingredients exist, so the grid
      // has to be recomputed even when the reader is not looking at it — they may well
      // press Back into it next.
      paintEffectGrid();
      // And the answer they ARE looking at is now out of date. Rebuilt in place: the
      // button that was pressed sits in the screen head, outside the region being
      // rewritten, so it keeps focus.
      if (currentScreen() === 3) paintResults();
      if (currentScreen() === 9) buildOverflow();
    });
  }

  for (const button of effectPickButtons) {
    button.addEventListener('click', () => {
      if (button.getAttribute('aria-disabled') === 'true') return;
      const effect = Number(button.dataset.fx);
      const at = wanted.indexOf(effect);
      if (at === -1) wanted.push(effect);
      else wanted.splice(at, 1);
      paintEffectGrid();
    });
  }

  brewButton.addEventListener('click', () => {
    paintResults();
    showScreen(3);
  });

  for (const button of queryAll<HTMLButtonElement>(root, '[data-back]')) {
    button.addEventListener('click', () => {
      // Screens that do not sit under screen 3 name their own destination; screen 8's is
      // written at open time, because it has three of them.
      const explicit = button.dataset.back;
      showScreen(explicit ? Number(explicit) : Math.max(1, currentScreen() - 1));
    });
  }

  paintEffectGrid();
  paintIngredientScreen();
  paintEffectIndex();
  showScreen(1, false);
}
