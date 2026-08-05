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

import { escapeHtml, formatMultiplier, queryAll } from './util';

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

function ingredientRow(ingredient: Ingredient): string {
  const dlc = ingredient.dlc ? `<i>${escapeHtml(ingredient.dlc)}</i>` : '';
  return `<li class="sky-bi"><b>${escapeHtml(ingredient.name)}</b>${dlc}<em>${gatherDots(ingredient.gatherScore)}</em></li>`;
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

const verdictKind = (mixture: Mixture): string =>
  mixture.undecided ? 'either' : mixture.poison ? 'bad' : 'good';

/** One word for what comes out of the mortar. Empty when the mixture makes nothing at all. */
function verdictTag(mixture: Mixture): string {
  if (mixture.dominant === -1) return '';
  const label = mixture.undecided ? 'Potion or poison' : mixture.poison ? 'Poison' : 'Potion';
  return `<p class="sky-brew__kind" data-kind="${verdictKind(mixture)}">${label}</p>`;
}

/**
 * The effect chips, tagged with the verdict so the chip that caused it can be tinted to
 * match — the word at the top says WHAT, this says WHICH.
 */
function chipsMarkup(names: string[], mixture: Mixture, wanted: number[]): string {
  return `<ul class="sky-chips" data-kind="${verdictKind(mixture)}">${mixture.effects
    .map((effect) => effectChip(names, mixture, effect, wanted))
    .join('')}</ul>`;
}

function mixtureCard(names: string[], mixture: Mixture, wanted: number[], badge?: string): string {
  return [
    '<article class="sky-brew">',
    '<div class="sky-brew__head">',
    badge ? `<p class="sky-brew__badge">${escapeHtml(badge)}</p>` : '',
    verdictTag(mixture),
    '</div>',
    `<ul class="sky-bis">${mixture.ingredients.map(ingredientRow).join('')}</ul>`,
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
  const dlc = ingredient.dlc
    ? `<span class="sky-ing__dlc" data-dlc="${escapeHtml(ingredient.dlc)}">${escapeHtml(ingredient.dlc)}</span>`
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

/** The tiles of whatever is in the mortar. Empty is empty — the grid below says the rest. */
export function mortarMarkup(catalogue: Catalogue, chosen: Ingredient[]): string {
  if (!chosen.length) return '';
  return `<div class="sky-ings">${chosen.map((i) => tileMarkup(catalogue, i, true)).join('')}</div>`;
}

/**
 * What the bottle currently holds. Nothing to say when it holds nothing: the tiles above
 * show what is in, and an absent chip row shows that it makes nothing yet.
 */
export function liveMarkup(catalogue: Catalogue, chosen: Ingredient[]): string {
  const mixture = liveMixture(catalogue, chosen);
  if (!mixture) return '';
  return chipsMarkup(catalogue.effectNames, mixture, []) + verdictTag(mixture);
}

export function resultsMarkup(names: string[], result: SearchResult, wanted: number[], showExtra: boolean): string {
  const cards = headlines(result.winners);
  const extra = showExtra
    ? result.sample
        .filter((mixture) => !cards.some((card) => card.mixture === mixture))
        .sort(RANKINGS[0].compare)
        .slice(0, EXTRA_SHOWN)
    : [];
  const canExpand = result.sample.length > cards.length;

  return [
    `<div class="sky-brews">${cards.map((c) => mixtureCard(names, c.mixture, wanted, c.labels.join(' · '))).join('')}</div>`,
    extra.length ? `<div class="sky-brews sky-brews--rest">${extra.map((m) => mixtureCard(names, m, wanted)).join('')}</div>` : '',
    '<div class="sky-scr__foot">',
    `<p class="sky-hint">${result.total.toLocaleString('en-US')} brew${result.total === 1 ? '' : 's'} produce this.</p>`,
    canExpand ? `<button type="button" class="sky-go sky-go--ghost" data-more>${showExtra ? 'Show less' : 'Show more'}</button>` : '',
    '</div>',
  ].join('');
}

// ── Wiring ──────────────────────────────────────────────────────────────────

type Kind = 'good' | 'bad' | 'any';

export function initBuilder(): void {
  for (const root of queryAll<HTMLElement>(document, '[data-builder]')) setUp(root);
}

function setUp(root: HTMLElement): void {
  const payloadScript = root.querySelector('[data-builder-data]');
  const results = root.querySelector<HTMLElement>('[data-results]');
  const heading = root.querySelector<HTMLElement>('[data-result-head]');
  const selection = root.querySelector<HTMLElement>('[data-picked]');
  const brewButton = root.querySelector<HTMLButtonElement>('[data-brew]');
  if (!payloadScript || !results || !selection || !brewButton) return;

  const catalogue = buildCatalogue(JSON.parse(payloadScript.textContent || '{}') as Payload);

  const effectButtons = queryAll<HTMLButtonElement>(root, '[data-fx]');
  const ingredientButtons = queryAll<HTMLButtonElement>(root, '[data-ing]');
  const live = root.querySelector<HTMLElement>('[data-live]');
  const mortar = root.querySelector<HTMLElement>('[data-mortar]');
  const filter = root.querySelector<HTMLInputElement>('[data-ing-filter]');
  const bySlug = new Map(catalogue.ingredients.map((ingredient) => [ingredient.slug, ingredient]));
  let kind: Kind = 'any';
  let wanted: number[] = [];
  let chosen: Ingredient[] = [];
  let showExtra = false;

  const showScreen = (screen: number): void => {
    root.setAttribute('data-screen', String(screen));
    for (const section of queryAll<HTMLElement>(root, '[data-scr]')) {
      section.hidden = section.getAttribute('data-scr') !== String(screen);
    }
  };

  const refreshEffectGrid = (): void => {
    const { reachable } = search(catalogue, wanted);
    for (const button of effectButtons) {
      const effect = Number(button.dataset.fx);
      const selected = wanted.indexOf(effect) !== -1;
      const item = button.closest('li');
      if (item) item.hidden = kind !== 'any' && button.dataset.kind !== kind;
      button.classList.toggle('is-on', selected);
      button.disabled = !selected && !reachable.has(effect);
    }
    selection.textContent = wanted.length
      ? wanted.map((effect) => catalogue.effectNames[effect]).join(' + ')
      : 'Pick one. Anything that cannot share a bottle with it will grey out.';
    brewButton.disabled = !wanted.length;
  };

  /** The mortar: three slots, live, with everything useless greyed out. */
  const refreshIngredients = (): void => {
    const needle = (filter?.value || '').trim().toLowerCase();
    const full = chosen.length >= 3;
    for (const button of ingredientButtons) {
      const ingredient = bySlug.get(button.dataset.ing || '');
      if (!ingredient) continue;
      const picked = chosen.indexOf(ingredient) !== -1;
      const item = button.closest('li');
      if (item) item.hidden = !!needle && ingredient.name.toLowerCase().indexOf(needle) === -1;
      button.classList.toggle('is-on', picked);
      button.disabled = !picked && (full || !contributesTo(chosen, ingredient));
    }
    if (mortar) mortar.innerHTML = mortarMarkup(catalogue, chosen);
    if (live) live.innerHTML = liveMarkup(catalogue, chosen);
  };

  const renderResults = (): void => {
    if (heading) heading.textContent = wanted.map((effect) => catalogue.effectNames[effect]).join(' + ');
    const result = search(catalogue, wanted);
    if (!result.total) {
      results.innerHTML = '<p class="sky-hint">Nothing can produce that combination.</p>';
      return;
    }
    results.innerHTML = resultsMarkup(catalogue.effectNames, result, wanted, showExtra);
    results.querySelector('[data-more]')?.addEventListener('click', () => {
      showExtra = !showExtra;
      renderResults();
    });
  };

  for (const button of queryAll<HTMLButtonElement>(root, '.sky-pick__b[data-kind]')) {
    button.addEventListener('click', () => {
      kind = (button.dataset.kind as Kind) || 'any';
      wanted = [];
      refreshEffectGrid();
      showScreen(2);
    });
  }

  for (const button of queryAll<HTMLButtonElement>(root, '.sky-pick__b[data-mode="ingredient"]')) {
    button.addEventListener('click', () => {
      chosen = [];
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
    refreshIngredients();
  };

  for (const button of ingredientButtons) {
    button.addEventListener('click', () => {
      const ingredient = bySlug.get(button.dataset.ing || '');
      if (ingredient) toggleIngredient(ingredient);
    });
  }

  // The tiles are rewritten on every change, so this is delegated to the container that
  // survives. Clicking the picture takes that ingredient back out — the same thing the
  // pill below does, in the place you are already looking.
  mortar?.addEventListener('click', (event) => {
    const tile = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-drop]');
    if (!tile) return;
    const ingredient = bySlug.get(tile.dataset.drop || '');
    if (ingredient) toggleIngredient(ingredient);
  });

  filter?.addEventListener('input', refreshIngredients);

  for (const button of effectButtons) {
    button.addEventListener('click', () => {
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
  showScreen(1);
}
