// The four-screen potion builder on /misc/skyrim/. Screens 1-3 ask what you want and
// search for it; screen 4 is the mortar itself and tells you what a handful makes.
//
// WHY THE SEARCH IS SHAPED LIKE THIS
//   An effect only reaches the bottle when two or more ingredients in the mortar
//   carry it. So every valid mixture must contain two carriers of the rarest
//   effect you asked for — which means we can enumerate from that effect's
//   carriers (4-31 ingredients) instead of all 183. Worst case is ~85,000
//   candidate triples rather than C(183,3) = 1,004,731.
//
//   That same rule is why "Fortify Sneak + Fortify Marksman" has no answer: no
//   ingredient carries both, so you would need two carriers of each and only
//   three slots exist.
//
// WHY RANKING HAPPENS INSIDE THE SEARCH
//   Fortify Magicka has 23,392 valid mixtures. An earlier version collected the
//   first few thousand and ranked those, which silently lost Salmon Roe's x12.5
//   because it sat past the cutoff. Winners are now tracked as we go, so they
//   are chosen over every mixture; the stored sample only feeds "show more".

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
   * Two DISAGREEING ingredients carry a requested effect. The game then uses only the
   * higher-priority one, and priority is that ingredient's cost for the effect rather
   * than its magnitude — so the larger multiplier can lose. Ranked below unambiguous
   * mixtures so a printed multiplier is one the mortar will actually deliver.
   *
   * Deviators that AGREE are not contested: whichever the game picks, the number is the
   * same. See `describe` for why that distinction is load-bearing.
   */
  contested: boolean;
  /** Index of the effect with the largest gold cost — the one in charge. -1 when empty. */
  dominant: number;
  /** True when that dominant effect is harmful, i.e. this comes out of the mortar as a poison. */
  poison: boolean;
  /** The top two costs are equal and disagree on side, so which you get is genuinely unknown. */
  undecided: boolean;
  /**
   * The bottle holds effects on BOTH sides — a potion carrying something harmful, or a
   * poison carrying something useful.
   *
   * Not the same question as `poison`, which is only about the costliest effect. A bottle
   * can be a perfectly good potion and still paralyse you, and that is worth seeing before
   * you drink it. Every `undecided` mixture is mixed by construction, since a tie that
   * matters is a tie between the two sides.
   */
  mixed: boolean;
}

interface Ranking {
  label: string;
  compare: (a: Mixture, b: Mixture) => number;
}

const SAMPLE_LIMIT = 400;
const EXTRA_SHOWN = 24;
const MAX_GATHER_SCORE = 5;

const RANKINGS: Ranking[] = [
  {
    label: 'Most effects',
    compare: (a, b) => b.effects.length - a.effects.length || b.gatherScore - a.gatherScore || a.ingredients.length - b.ingredients.length,
  },
  {
    // A resist potion that also restores stamina is not the resist potion you
    // asked for. The requested set is fixed, so fewest total effects is exactly
    // fewest unrequested ones.
    label: 'Nothing extra',
    compare: (a, b) => a.effects.length - b.effects.length || b.gatherScore - a.gatherScore || a.ingredients.length - b.ingredients.length,
  },
  {
    // Cleanliness breaks the tie: two equally gatherable mixtures should not be
    // separated at random when one of them carries a passenger.
    label: 'Easiest to gather',
    compare: (a, b) => b.gatherScore - a.gatherScore || a.effects.length - b.effects.length || a.ingredients.length - b.ingredients.length,
  },
  {
    label: 'Most potent',
    compare: (a, b) =>
      Number(a.contested) - Number(b.contested) || b.potency - a.potency || b.effects.length - a.effects.length || b.gatherScore - a.gatherScore,
  },
  {
    label: 'Fewest ingredients',
    compare: (a, b) => a.ingredients.length - b.ingredients.length || b.gatherScore - a.gatherScore || b.effects.length - a.effects.length,
  },
];

// ── The ingredient catalogue ────────────────────────────────────────────────
//
// Passed explicitly rather than held in module scope: `search` reads like a pure
// function and should behave like one, and two builders on one page must not
// share state.

/**
 * The shortcode's JSON payload. Keys are single letters because 183 ingredients
 * times full key names is several KB of repeated text for nothing. The mapping,
 * which is the one place all three layers have to agree:
 *
 *   YAML             payload   catalogue
 *   name             n         name
 *   value            v         (dropped — nothing ranks on gold)
 *   avail            a         gatherScore
 *   dlc              d         dlc
 *   effects          f         effects (indices into `e`)
 *   effects.mult     x         deviations
 *   effects.baseMag  bm        baseMagnitudes
 *   effects.baseDur  bd        baseDurations
 *   effects.baseCost bc        baseCosts
 *   effects.kind     k         harmful (kind === "bad")
 */
interface Payload {
  e: string[];
  bm: number[];
  bd: number[];
  bc: number[];
  k: boolean[];
  x: Record<string, [number, number]>[];
  i: { s: string; n: string; v: number; a: number; d: string; f: number[] }[];
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
 * The multiplier this mixture applies to one effect.
 *
 * Paralysis, Invisibility, Waterbreathing, Light and Night Eye have a base
 * magnitude of 0 — all their strength is duration — so those read the duration
 * multiplier instead. Where several deviating ingredients are present we take
 * the furthest from 1.0; see `Mixture.contested` for why that is only sometimes
 * the number the game uses.
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

function multiplierFor(catalogue: Catalogue, mixture: Ingredient[], effect: number): number {
  const [magnitude, duration] = deviationOf(catalogue, mixture, effect);
  return catalogue.baseMagnitudes[effect] === 0 ? duration : magnitude;
}

// ── Potion or poison ────────────────────────────────────────────────────────
//
// UESP, Skyrim:Alchemy Effects: "The effect with the largest individual gold cost is the
// effect that controls the overall properties of the mixture. That effect is used for
// naming, and it determines whether the result is considered to be a potion or a poison."
// So a bottle with four good effects and one Damage Health comes out as a poison if
// Damage Health is the expensive one, which is not what the mortar looks like it is doing.
//
//   cost = floor( baseCost x max(magnitude^1.1, 1) x (duration/10)^1.1 )
//
// with the duration term dropped when the effect is instantaneous.

/**
 * An effect's gold cost in this mixture, up to a constant — enough to rank them, which is
 * all the classification needs.
 *
 * YOUR ALCHEMY STRENGTH IS DELIBERATELY LEFT OUT, and that is exact rather than a
 * simplification. Skill, gear and perks multiply an effect's magnitude, or its duration
 * when it has no magnitude, by the same M; either route puts an M^1.1 in front of the
 * cost, so it is a common factor and cannot change which effect is largest. (The
 * `max(…, 1)` never binds here: every effect with a magnitude has a base of at least 1.)
 *
 * PERKS are left out because the game leaves them out — UESP again: "The determination of
 * the strongest effect is actually done before the perks are factored into the gold cost."
 * That is what stops Benefactor from quietly turning a poison into a potion.
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
 * Which effect is in charge, and whether the top two are tied across the potion/poison
 * line. TWO such collisions exist in the table: Resist Magic ties both Weakness to Poison
 * and Weakness to Magic, all three costing 7.1774 to the last decimal. Only the first is
 * reachable — no ingredient carries Resist Magic and Weakness to Magic together, so
 * producing both would need a fourth slot — and it turns up in 65 of the 635,068 triples
 * that make anything. Nothing documents what the game does with a tie, so those are
 * reported as undecided rather than guessed at. Add one ingredient carrying Resist Magic
 * and Weakness to Magic and the second collision becomes reachable too.
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
  const harmful = effects.filter((effect) => catalogue.harmful[effect]).length;
  return {
    ingredients: mixture,
    effects,
    gatherScore: mixture.reduce((total, i) => total + i.gatherScore, 0),
    multipliers,
    potency: wanted.reduce((total, effect) => total + (multipliers[effect] || 1), 0),
    // DISAGREEING deviators, not merely several of them. Six of Invisibility's seven
    // carriers all deviate by the same x1.5, and when they agree there is nothing to lose
    // — the printed multiplier is delivered whichever one the game picks. Counting rows
    // instead of values demoted provably-correct "Most potent" winners in favour of
    // harder-to-gather mixtures that happened to hold only one deviator.
    contested: wanted.some((effect) => {
      const table = catalogue.deviations[effect];
      if (!table) return false;
      const readDuration = catalogue.baseMagnitudes[effect] === 0;
      const values: number[] = [];
      for (const ingredient of mixture) {
        const row = table[ingredient.slug];
        if (row && values.indexOf(row[readDuration ? 1 : 0]) === -1) values.push(row[readDuration ? 1 : 0]);
      }
      return values.length > 1;
    }),
    dominant,
    poison,
    undecided,
    mixed: harmful > 0 && harmful < effects.length,
  };
}

export interface SearchResult {
  /** Winner per RANKINGS entry, chosen over every mixture found. */
  winners: (Mixture | null)[];
  /** Bounded list backing "show more". Never used for ranking. */
  sample: Mixture[];
  total: number;
  /** Effects that could still be added to the selection. */
  reachable: Set<number>;
}

export function search(catalogue: Catalogue, wanted: number[]): SearchResult {
  const winners: (Mixture | null)[] = RANKINGS.map(() => null);
  const sample: Mixture[] = [];
  const reachable = new Set<number>();
  let total = 0;

  // Nothing selected: every effect is reachable, because ingredients.yaml
  // guarantees each is carried by at least two ingredients.
  if (!wanted.length) {
    catalogue.effectNames.forEach((_, index) => {
      if (catalogue.carriersOf[index].length >= 2) reachable.add(index);
    });
    return { winners, sample, total, reachable };
  }

  const wantedMask = maskOf(wanted);
  const rarest = wanted.reduce((best, effect) =>
    catalogue.carriersOf[effect].length < catalogue.carriersOf[best].length ? effect : best);
  const anchors = catalogue.carriersOf[rarest];

  const seen = new Set<string>();
  const consider = (mixture: Ingredient[]): void => {
    const produced = effectsProducedBy(mixture);
    if (!covers(produced, wantedMask)) return;

    const key = mixture.map((i) => i.slug).sort().join('|');
    if (seen.has(key)) return;
    seen.add(key);
    total++;

    const described = describe(catalogue, mixture, produced, wanted);
    for (const effect of described.effects) reachable.add(effect);
    RANKINGS.forEach((ranking, index) => {
      const current = winners[index];
      if (!current || ranking.compare(described, current) < 0) winners[index] = described;
    });
    if (sample.length < SAMPLE_LIMIT) sample.push(described);
  };

  for (let a = 0; a < anchors.length; a++) {
    for (let b = a + 1; b < anchors.length; b++) {
      const pair = [anchors[a], anchors[b]];
      consider(pair);
      for (const third of catalogue.ingredients) {
        if (third !== pair[0] && third !== pair[1]) consider([...pair, third]);
      }
    }
  }
  return { winners, sample, total, reachable };
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

/**
 * The dots and the DLC tag are both glyph-only, and a screen reader read them literally:
 * "black circle black circle black circle black circle white circle" fifteen times per
 * result card, and "D B" for Dragonborn. Both now carry the sentence they mean, and the
 * decoration is hidden from the accessibility tree rather than duplicated into it.
 */
function ingredientRow(catalogue: Catalogue, ingredient: Ingredient): string {
  const code = ingredient.dlc;
  const dlc = code
    ? `<i title="${escapeHtml(DLC_NAMES[code] || code)}" aria-hidden="true">${escapeHtml(code)}</i>` +
      `<span class="sky-sr"> (${escapeHtml(DLC_NAMES[code] || code)})</span>`
    : '';
  const score = ingredient.gatherScore;
  // The picture, at row scale. A result card used to be a list of names — the one place
  // in the module where an ingredient appeared without its art, while the mortar and the
  // recipe cards both showed it. aria-hidden: the name is right beside it.
  const url = catalogue.images[ingredient.slug];
  const art = url
    ? `<img src="${escapeHtml(url)}" alt="" loading="lazy" decoding="async" aria-hidden="true" />`
    : '<svg class="sky-ph" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" ' +
      'focusable="false"><circle class="sky-ph__disc" cx="24" cy="24" r="22" />' +
      '<text class="sky-ph__mark" x="24" y="25" text-anchor="middle" dominant-baseline="central">?</text></svg>';
  return `<li class="sky-bi"><span class="sky-bi__pic">${art}</span>` +
    `<b>${escapeHtml(ingredient.name)}</b>${dlc}` +
    `<em title="How easy this is to find: ${score} of ${MAX_GATHER_SCORE}">` +
    `<span aria-hidden="true">${gatherDots(score)}</span>` +
    `<span class="sky-sr">easy to find: ${score} of ${MAX_GATHER_SCORE}</span></em></li>`;
}

function effectChip(names: string[], mixture: Mixture, effect: number, wanted: number[]): string {
  const applied = mixture.multipliers[effect];
  const classes = ['sky-chip'];
  if (wanted.indexOf(effect) !== -1) classes.push('sky-chip--tag');
  if (applied > 1) classes.push('is-boosted');
  // The effect that decided potion-or-poison. Marked rather than explained: the verdict is
  // right there above it, and this says which of the four is responsible for it.
  if (effect === mixture.dominant) classes.push('is-dominant');
  const suffix = applied ? `<b>×${formatMultiplier(applied)}</b>` : '';
  return `<li class="${classes.join(' ')}">${escapeHtml(names[effect])}${suffix}</li>`;
}

/**
 * The GLYPH: what the mortar hands you. Flask, skull, or — for the one documented tie —
 * both circles.
 */
const verdictKind = (mixture: Mixture): string =>
  mixture.undecided ? 'either' : mixture.poison ? 'bad' : 'good';

/**
 * The HUE: how clean the bottle is. Two channels rather than one, because "poison" and
 * "poison that also restores your health" are different things to be handed and a single
 * colour could only say one of them. Mixed outranks both sides — that is the case worth
 * catching — and the glyph still says which way it fell.
 */
const verdictTone = (mixture: Mixture): string =>
  mixture.mixed ? 'mixed' : mixture.poison ? 'bad' : 'good';

const verdictLabel = (mixture: Mixture): string =>
  mixture.undecided ? 'Potion or poison' : mixture.poison ? 'Poison' : 'Potion';

/**
 * The same three glyphs screen 1 offers as choices, reused as the answer — so the flask
 * you pressed to ask for a potion is the flask that tells you that you got one.
 */
const KIND_GLYPH: Record<string, string> = {
  good: '<path d="M9.5 3h5M10.5 3v6.4l-5.1 8.9A1.7 1.7 0 0 0 6.9 21h10.2a1.7 1.7 0 0 0 1.5-2.7l-5.1-8.9V3" /><path d="M7.8 15h8.4" />',
  bad: '<path d="M12 3a7 7 0 0 0-4 12.7V18a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.3A7 7 0 0 0 12 3Z" /><path d="M9.7 10.2h.01M14.3 10.2h.01M10.5 19v2M13.5 19v2" />',
  either: '<circle cx="9" cy="12" r="6" /><circle cx="15" cy="12" r="6" />',
};

/**
 * The mortar's verdict, as a disc in the corner of the tray rather than a word under it.
 *
 * It used to be a 36px word — the answer register — sitting below the tiles. The tray is
 * what the verdict is ABOUT, so the tray takes the colour and this marks it. aria-hidden
 * on the drawing; the word rides along in `.sky-sr` for the live region.
 */
function verdictBadge(mixture: Mixture): string {
  if (mixture.dominant === -1) return '';
  const kind = verdictKind(mixture);
  return `<span class="sky-verdict" data-kind="${kind}" data-tone="${verdictTone(mixture)}">` +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${KIND_GLYPH[kind]}</svg>` +
    `<span class="sky-sr">${verdictLabel(mixture)}</span></span>`;
}

/** One word for what comes out of the mortar — on a RESULT CARD, where the verdict is one
 *  attribute of several competing brews. The live mortar uses `verdictBadge` instead. */
function verdictTag(mixture: Mixture): string {
  if (mixture.dominant === -1) return '';
  return `<p class="sky-brew__kind" data-kind="${verdictKind(mixture)}" ` +
    `data-tone="${verdictTone(mixture)}">${verdictLabel(mixture)}</p>`;
}

/**
 * The effect chips, tagged with the verdict so the chip that caused it can be tinted to
 * match — the word at the top says WHAT, this says WHICH.
 */
function chipsMarkup(names: string[], mixture: Mixture, wanted: number[]): string {
  return `<ul class="sky-chips" data-kind="${verdictKind(mixture)}" data-tone="${verdictTone(mixture)}">${mixture.effects
    .map((effect) => effectChip(names, mixture, effect, wanted))
    .join('')}</ul>`;
}

function mixtureCard(catalogue: Catalogue, mixture: Mixture, wanted: number[], badge?: string): string {
  const names = catalogue.effectNames;
  return [
    '<article class="sky-brew">',
    '<div class="sky-brew__head">',
    badge ? `<h4 class="sky-brew__badge">${escapeHtml(badge)}</h4>` : '',
    verdictTag(mixture),
    '</div>',
    `<ul class="sky-bis">${mixture.ingredients.map((i) => ingredientRow(catalogue, i)).join('')}</ul>`,
    chipsMarkup(names, mixture, wanted),
    '</article>',
  ].join('');
}

/** One card per ranking, merging the labels when a mixture wins more than one. */
function headlines(winners: (Mixture | null)[]): { mixture: Mixture; labels: string[] }[] {
  const cards: { mixture: Mixture; labels: string[] }[] = [];
  RANKINGS.forEach((ranking, index) => {
    const winner = winners[index];
    if (!winner) return;
    const existing = cards.find((card) => card.mixture === winner);
    if (existing) existing.labels.push(ranking.label);
    else cards.push({ mixture: winner, labels: [ranking.label] });
  });
  return cards;
}

/**
 * What a specific handful of ingredients actually makes.
 *
 * The other three modes ask what you WANT and search for it; this one is the mortar
 * itself — you put things in and the bottle updates. No search, no ranking, no Brew
 * button, because there is nothing to choose between.
 */
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
export function reachesWith(chosen: Ingredient[], candidate: Ingredient, bridge: EffectMask | null): boolean {
  if (contributesTo(chosen, candidate)) return true;
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
export function contributesTo(chosen: Ingredient[], candidate: Ingredient): boolean {
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
  const url = catalogue.images[ingredient.slug];
  const art = url
    ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(ingredient.name)}" loading="lazy" decoding="async" />`
    // No art yet. aria-hidden because the name below already says it.
    : '<svg class="sky-ph" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" ' +
      'focusable="false"><circle class="sky-ph__disc" cx="24" cy="24" r="22" />' +
      '<text class="sky-ph__mark" x="24" y="25" text-anchor="middle" dominant-baseline="central">?</text></svg>';
  // Same shape as partials/skyrim-dlc.html, off the same DLC_NAMES map: visible code,
  // colour as reinforcement, full name in the accessibility tree. This one is here rather
  // than in the partial only because JS cannot reach Hugo at runtime.
  const dlc = ingredient.dlc
    ? `<span class="sky-ing__dlc" data-dlc="${escapeHtml(ingredient.dlc)}" aria-hidden="true">${escapeHtml(ingredient.dlc)}</span>` +
      `<span class="sky-sr"> (${escapeHtml(DLC_NAMES[ingredient.dlc] || ingredient.dlc)})</span>`
    : '';
  // In the mortar the tile IS the way back out, so it is a real button with a real label.
  // On a recipe card there is nothing to take out, so it stays an inert span.
  const tile = removable
    ? `<button type="button" class="sky-tile sky-tile--drop" data-drop="${escapeHtml(ingredient.slug)}"` +
      ` aria-label="Take ${escapeHtml(ingredient.name)} out of the mortar">${art}</button>`
    : `<span class="sky-tile">${art}</span>`;
  return (
    `<div class="sky-ing">${tile}` +
    `<span class="sky-ing__name">${escapeHtml(ingredient.name)}${dlc}</span></div>`
  );
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
  const kind = mixture && mixture.dominant !== -1 ? ` data-tone="${verdictTone(mixture)}"` : '';
  return `<div class="sky-ings"${kind}>${chosen.map((i) => tileMarkup(catalogue, i, true)).join('')}` +
    `${mixture ? verdictBadge(mixture) : ''}</div>`;
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
export function guidanceMarkup(refusal: string): string {
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
  return chipsMarkup(catalogue.effectNames, mixture, []) +
    `<p class="sky-sr">${verdictLabel(mixture)}</p>`;
}

/**
 * The multiplier this ONE ingredient applies to ONE of its effects.
 *
 * `deviationOf` answers the same question for a whole mixture, where the strongest
 * deviator wins; here there is only ever one ingredient, so this reads its row directly.
 * Which half of the row matters is the same rule the mortar uses: an effect with no
 * magnitude carries its strength in its duration.
 */
function deviationFor(catalogue: Catalogue, slug: string, effect: number): number {
  const table = catalogue.deviations[effect];
  const row = table ? table[slug] : undefined;
  if (!row) return 1;
  return catalogue.baseMagnitudes[effect] === 0 ? row[1] : row[0];
}

/**
 * Screen 6: one effect, every ingredient carrying it, and what else each of those brings.
 *
 * The other screens all ask a question about a BOTTLE. This one is the index — you have
 * an effect in mind and want to know what carries it, and, because an ingredient never
 * arrives alone, what else comes with it. The chips are the ingredient's own four, with
 * the effect you asked for marked and any multiplier printed on the chip it applies to.
 */
export function effectDetailMarkup(catalogue: Catalogue, effect: number): string {
  const carriers = catalogue.carriersOf[effect] || [];
  const cards = carriers.map((ingredient) => {
    const chips = ingredient.effects.map((other) => {
      const classes = ['sky-chip'];
      if (other === effect) classes.push('sky-chip--tag');
      const applied = deviationFor(catalogue, ingredient.slug, other);
      if (applied !== 1) classes.push('is-boosted');
      const suffix = applied !== 1 ? `<b>&times;${formatMultiplier(applied)}</b>` : '';
      return `<li class="${classes.join(' ')}">${escapeHtml(catalogue.effectNames[other])}${suffix}</li>`;
    }).join('');
    return '<article class="sky-brew">' +
      `<ul class="sky-bis">${ingredientRow(catalogue, ingredient)}</ul>` +
      `<ul class="sky-chips">${chips}</ul></article>`;
  }).join('');
  // No count above this. The cards are on screen and countable, and a number nobody asked
  // for taking the first line of the answer is the label winning again.
  return `<div class="sky-brews sky-brews--plain">${cards}</div>`;
}

export function resultsMarkup(catalogue: Catalogue, result: SearchResult, wanted: number[], showExtra: boolean): string {
  const cards = headlines(result.winners);
  const extra = showExtra
    ? result.sample
        .filter((mixture) => !cards.some((card) => card.mixture === mixture))
        .sort(RANKINGS[0].compare)
        .slice(0, EXTRA_SHOWN)
    : [];
  const canExpand = result.sample.length > cards.length;

  return [
    `<div class="sky-brews">${cards.map((c) => mixtureCard(catalogue, c.mixture, wanted, c.labels.join(' · '))).join('')}</div>`,
    extra.length ? `<div class="sky-brews sky-brews--rest">${extra.map((m) => mixtureCard(catalogue, m, wanted)).join('')}</div>` : '',
    '<div class="sky-scr__foot">',
    `<p class="sky-hint">${result.total.toLocaleString('en-US')} brew${result.total === 1 ? '' : 's'} produce this.</p>`,
    canExpand ? `<button type="button" class="sky-go sky-go--ghost" data-more>${showExtra ? 'Show less' : 'Show more'}</button>` : '',
    '</div>',
  ].join('');
}

// ── Wiring ──────────────────────────────────────────────────────────────────

type Kind = 'good' | 'bad' | 'any';

/** Screen 2 has no way to show which side you asked for — every pill looks the same. */
const KIND_LABEL: Record<Kind, string> = { good: 'Potion', bad: 'Poison', any: 'Mixture' };

export function initBuilder(): void {
  for (const root of queryAll<HTMLElement>(document, '[data-builder]')) setUp(root);
}

function setUp(root: HTMLElement): void {
  const payloadScript = root.querySelector('[data-builder-data]');
  const results = root.querySelector<HTMLElement>('[data-results]');
  const heading = root.querySelector<HTMLElement>('[data-result-head]');
  const brewButton = root.querySelector<HTMLButtonElement>('[data-brew]');
  if (!payloadScript || !results || !brewButton) return;

  const catalogue = buildCatalogue(JSON.parse(payloadScript.textContent || '{}') as Payload);

  const effectButtons = queryAll<HTMLButtonElement>(root, '[data-fx]');
  const ingredientButtons = queryAll<HTMLButtonElement>(root, '[data-ing]');
  const live = root.querySelector<HTMLElement>('[data-live]');
  const mortar = root.querySelector<HTMLElement>('[data-mortar]');
  const filter = root.querySelector<HTMLInputElement>('[data-ing-filter]');
  const ingredientEmpty = root.querySelector<HTMLElement>('[data-ing-empty]');
  const dlcGroup = root.querySelector<HTMLElement>('[data-dlc-group]');
  const quickToggle = root.querySelector<HTMLButtonElement>('[data-quick-toggle]');
  const dlcToggles = queryAll<HTMLButtonElement>(root, '[data-dlc-toggle]');
  // Screen 5/6 — the effect index.
  const fxHead = root.querySelector<HTMLElement>('[data-fx-head]');
  const fxDetail = root.querySelector<HTMLElement>('[data-fx-detail]');
  const fxFilter = root.querySelector<HTMLInputElement>('[data-fx-filter]');
  const fxEmpty = root.querySelector<HTMLElement>('[data-fx-empty]');
  const fxInfoButtons = queryAll<HTMLButtonElement>(root, '[data-fxinfo]');
  const kindHead = root.querySelector<HTMLElement>('[data-kind-head]');
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
  let showExtra = false;
  /** Why the last tap did nothing. Cleared by anything that does something. */
  let refusal = '';

  /**
   * `search` walks up to ~85,000 candidate triples and ran twice per brew: once for the
   * reachability pass on the last effect click, then again in `renderResults` for the
   * same selection, with the first result thrown away. One slot is enough — the search is
   * pure in `wanted`, and the selection cannot change between those two calls.
   */
  let cacheKey = '';
  let cached: SearchResult | null = null;
  const searchFor = (selection: number[]): SearchResult => {
    const key = selection.join(',');
    if (!cached || key !== cacheKey) {
      cacheKey = key;
      cached = search(catalogue, selection);
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
    for (const button of effectButtons) {
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
    for (const button of effectButtons) {
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

  const refreshEffectGrid = (): void => {
    paintSelection();
    scheduleReachability();
  };

  /** The mortar: three slots, live, with everything useless greyed out. */
  const refreshIngredients = (): void => {
    const needle = (filter?.value || '').trim().toLowerCase();
    const full = chosen.length >= 3;
    // Add-ons the reader has turned off. A base-game ingredient carries no code and is
    // never hidden, and anything already in the mortar stays in it — the tray is a record
    // of what you picked, not a view that re-filters underneath you.
    // The quick rule only pairs against what is already in the mortar; the deep one looks
    // one slot ahead for an ingredient that could bridge. Both are computed per repaint,
    // not per pill.
    const quick = !quickToggle || quickToggle.getAttribute('aria-pressed') !== 'false';
    const bridge = quick ? null : bridgeMaskOf(catalogue, chosen);
    const hiddenDlc = new Set<string>();
    for (const box of dlcToggles) {
      if (box.getAttribute('aria-pressed') === 'false') hiddenDlc.add(box.dataset.dlcToggle || '');
    }
    let shown = 0;
    for (const button of ingredientButtons) {
      const ingredient = bySlug.get(button.dataset.ing || '');
      if (!ingredient) continue;
      const picked = chosen.indexOf(ingredient) !== -1;
      const item = button.closest('li');
      const excluded = !!ingredient.dlc && hiddenDlc.has(ingredient.dlc);
      const missed = excluded ||
        (!!needle && (haystack.get(ingredient.slug) || '').indexOf(needle) === -1);
      if (item) item.hidden = missed;
      if (!missed) shown++;
      button.classList.toggle('is-on', picked);
      button.setAttribute('aria-pressed', String(picked));
      // Same reasoning as the effect grid: stay focusable, carry the reason.
      const reachable = quick
        ? contributesTo(chosen, ingredient)
        : reachesWith(chosen, ingredient, bridge);
      const blocked = !picked && (full || !reachable);
      button.setAttribute('aria-disabled', String(blocked));
      button.title = blocked
        ? (full ? 'The mortar already holds three'
          : quick ? 'Shares no effect with what is already in the mortar'
            : 'No third ingredient can bridge these')
        : '';
    }
    if (ingredientEmpty) ingredientEmpty.hidden = shown > 0;
    const mixture = liveMixture(catalogue, chosen);
    if (mortar) mortar.innerHTML = mortarMarkup(catalogue, chosen, mixture);
    if (live) live.innerHTML = liveMarkup(catalogue, chosen) + guidanceMarkup(refusal);
  };

  const renderResults = (returnFocus = false): void => {
    if (heading) heading.textContent = wanted.map((effect) => catalogue.effectNames[effect]).join(' + ');
    const result = searchFor(wanted);
    if (!result.total) {
      results.innerHTML = '<p class="sky-hint">Nothing can produce that combination.</p>';
      return;
    }
    results.innerHTML = resultsMarkup(catalogue, result, wanted, showExtra);
    const moreButton = results.querySelector<HTMLButtonElement>('[data-more]');
    moreButton?.addEventListener('click', () => {
      showExtra = !showExtra;
      renderResults(true);
    });
    // The button that was pressed lives inside `results` and the rewrite destroys it, so
    // focus fell to <body> — the same silent jump to the top of a 22,000px page that
    // showScreen exists to prevent. Put it on the replacement, whose label has flipped to
    // "Show less", which is also the announcement worth having.
    if (returnFocus) moreButton?.focus();
  };

  for (const button of queryAll<HTMLButtonElement>(root, '.sky-pick__b[data-kind]')) {
    button.addEventListener('click', () => {
      kind = (button.dataset.kind as Kind) || 'any';
      if (kindHead) kindHead.textContent = KIND_LABEL[kind];
      wanted = [];
      refreshEffectGrid();
      showScreen(2);
    });
  }

  /** Substring match over the effect names, the same shape as the ingredient filter. */
  const refreshEffectIndex = (): void => {
    const needle = (fxFilter?.value || '').trim().toLowerCase();
    let shown = 0;
    for (const button of fxInfoButtons) {
      const missed = !!needle && (button.textContent || '').toLowerCase().indexOf(needle) === -1;
      const item = button.closest('li');
      if (item) item.hidden = missed;
      if (!missed) shown++;
    }
    if (fxEmpty) fxEmpty.hidden = shown > 0;
  };

  for (const button of fxInfoButtons) {
    button.addEventListener('click', () => {
      const effect = Number(button.dataset.fxinfo);
      if (fxHead) fxHead.textContent = catalogue.effectNames[effect];
      if (fxDetail) fxDetail.innerHTML = effectDetailMarkup(catalogue, effect);
      showScreen(6);
    });
  }

  fxFilter?.addEventListener('input', refreshEffectIndex);

  for (const button of queryAll<HTMLButtonElement>(root, '.sky-pick__b[data-mode="favorites"]')) {
    button.addEventListener('click', () => showScreen(7));
  }

  for (const button of queryAll<HTMLButtonElement>(root, '.sky-pick__b[data-mode="effects"]')) {
    button.addEventListener('click', () => {
      if (fxFilter) fxFilter.value = '';
      refreshEffectIndex();
      showScreen(5);
    });
  }

  for (const button of queryAll<HTMLButtonElement>(root, '.sky-pick__b[data-mode="ingredient"]')) {
    button.addEventListener('click', () => {
      chosen = [];
      refusal = '';
      if (filter) filter.value = '';
      refreshIngredients();
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
    refreshIngredients();
  };

  for (const button of ingredientButtons) {
    button.addEventListener('click', () => {
      // These stay focusable so a screen reader can find them and hear why; refusing the
      // click here is what `disabled` used to do. The refusal used to be silent in every
      // channel — no movement, no message, and a `title` a thumb cannot reach — on the one
      // screen where a single pick strikes through 127 other pills.
      if (button.getAttribute('aria-disabled') === 'true') {
        refusal = button.title;
        refreshIngredients();
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
    const tile = target?.closest<HTMLElement>('[data-drop]');
    if (!tile) return;
    const ingredient = bySlug.get(tile.dataset.drop || '');
    if (ingredient) toggleIngredient(ingredient);
  });

  // Typing is a new question; a refusal from the last tap should not survive it.
  filter?.addEventListener('input', () => {
    refusal = '';
    refreshIngredients();
  });

  // aria-pressed is the state, not a class: a toggle button's pressed-ness belongs in the
  // accessibility tree first, and the CSS keys off the same attribute so the two cannot
  // disagree the way a class and an aria attribute eventually do.
  if (dlcGroup) dlcGroup.hidden = false;
  if (quickToggle) {
    quickToggle.hidden = false;
    quickToggle.addEventListener('click', () => {
      quickToggle.setAttribute('aria-pressed', String(quickToggle.getAttribute('aria-pressed') === 'false'));
      refusal = '';
      refreshIngredients();
    });
  }
  for (const box of dlcToggles) {
    box.addEventListener('click', () => {
      box.setAttribute('aria-pressed', String(box.getAttribute('aria-pressed') === 'false'));
      refusal = '';
      refreshIngredients();
    });
  }

  for (const button of effectButtons) {
    button.addEventListener('click', () => {
      if (button.getAttribute('aria-disabled') === 'true') return;
      const effect = Number(button.dataset.fx);
      const at = wanted.indexOf(effect);
      if (at === -1) wanted.push(effect);
      else wanted.splice(at, 1);
      refreshEffectGrid();
    });
  }

  brewButton.addEventListener('click', () => {
    showExtra = false;
    renderResults();
    showScreen(3);
  });

  for (const button of queryAll<HTMLButtonElement>(root, '[data-back]')) {
    button.addEventListener('click', () => {
      // The ingredient screen hangs off screen 1 rather than following screen 3, so it
      // says where it goes instead of stepping back one.
      const explicit = button.dataset.back;
      const current = Number(root.getAttribute('data-screen')) || 1;
      showScreen(explicit ? Number(explicit) : Math.max(1, current - 1));
    });
  }

  refreshEffectGrid();
  refreshIngredients();
  refreshEffectIndex();
  showScreen(1, false);
}
