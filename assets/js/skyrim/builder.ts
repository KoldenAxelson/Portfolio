// The three-screen potion builder on /misc/skyrim/.
//
// WHY THE SEARCH IS SHAPED LIKE THIS
//   An effect only reaches the bottle when two or more ingredients in the mortar
//   carry it. So every valid mixture must contain two carriers of the rarest
//   effect you asked for — which means we can enumerate from that effect's
//   carriers (6-31 ingredients) instead of all 183. Worst case is ~85,000
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
interface EffectMask { low: number; high: number }

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
   * Two or more DEVIATING ingredients carry a requested effect. The game then
   * uses only the higher-priority one, and priority is that ingredient's cost
   * for the effect rather than its magnitude — so the larger multiplier can
   * lose. Ranked below unambiguous mixtures so a printed multiplier is one the
   * mortar will actually deliver.
   */
  contested: boolean;
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
 *   YAML            payload   catalogue
 *   name            n         name
 *   value           v         (dropped — nothing ranks on gold)
 *   avail           a         gatherScore
 *   dlc             d         dlc
 *   effects         f         effects (indices into `e`)
 *   effects.mult    x         deviations
 *   effects.baseMag bm        baseMagnitudes
 */
interface Payload {
  e: string[];
  bm: number[];
  x: Record<string, [number, number]>[];
  i: { s: string; n: string; v: number; a: number; d: string; f: number[] }[];
  /** slug -> resolved image URL, for the few that have art yet. */
  g?: Record<string, string>;
}

export interface Catalogue {
  effectNames: string[];
  baseMagnitudes: number[];
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

function maskToIndices(mask: EffectMask, effectCount: number): number[] {
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
function multiplierFor(catalogue: Catalogue, mixture: Ingredient[], effect: number): number {
  const table = catalogue.deviations[effect];
  if (!table) return 1;
  const readDuration = catalogue.baseMagnitudes[effect] === 0;
  let applied = 1;
  for (const ingredient of mixture) {
    const row = table[ingredient.slug];
    if (!row) continue;
    const candidate = readDuration ? row[1] : row[0];
    if (Math.abs(candidate - 1) > Math.abs(applied - 1)) applied = candidate;
  }
  return applied;
}

function describe(catalogue: Catalogue, mixture: Ingredient[], produced: EffectMask, wanted: number[]): Mixture {
  const effects = maskToIndices(produced, catalogue.effectNames.length);
  const multipliers: Record<number, number> = {};
  for (const effect of effects) {
    const applied = multiplierFor(catalogue, mixture, effect);
    if (applied !== 1) multipliers[effect] = applied;
  }
  return {
    ingredients: mixture,
    effects,
    gatherScore: mixture.reduce((total, i) => total + i.gatherScore, 0),
    multipliers,
    potency: wanted.reduce((total, effect) => total + (multipliers[effect] || 1), 0),
    contested: wanted.some((effect) => {
      const table = catalogue.deviations[effect];
      return !!table && mixture.filter((i) => table[i.slug]).length > 1;
    }),
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
  const dlc = ingredient.dlc ? `<i>${ingredient.dlc}</i>` : '';
  return `<li class="sky-bi"><b>${escapeHtml(ingredient.name)}</b>${dlc}<em>${gatherDots(ingredient.gatherScore)}</em></li>`;
}

function effectChip(names: string[], mixture: Mixture, effect: number, wanted: number[]): string {
  const applied = mixture.multipliers[effect];
  const classes = ['sky-chip'];
  if (wanted.indexOf(effect) !== -1) classes.push('sky-chip--tag');
  if (applied > 1) classes.push('is-boosted');
  const suffix = applied ? `<b>×${formatMultiplier(applied)}</b>` : '';
  return `<li class="${classes.join(' ')}">${escapeHtml(names[effect])}${suffix}</li>`;
}

function mixtureCard(names: string[], mixture: Mixture, wanted: number[], badge?: string): string {
  return [
    '<article class="sky-brew">',
    badge ? `<p class="sky-brew__badge">${escapeHtml(badge)}</p>` : '',
    `<ul class="sky-bis">${mixture.ingredients.map(ingredientRow).join('')}</ul>`,
    `<ul class="sky-chips">${mixture.effects.map((e) => effectChip(names, mixture, e, wanted)).join('')}</ul>`,
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
function tileMarkup(catalogue: Catalogue, ingredient: Ingredient): string {
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
  return (
    `<div class="sky-ing"><span class="sky-tile">${art}</span>` +
    `<span class="sky-ing__name">${escapeHtml(ingredient.name)}${dlc}</span></div>`
  );
}

/** The tiles of whatever is in the mortar. Empty is empty — the grid below says the rest. */
export function mortarMarkup(catalogue: Catalogue, chosen: Ingredient[]): string {
  if (!chosen.length) return '';
  return `<div class="sky-ings">${chosen.map((i) => tileMarkup(catalogue, i)).join('')}</div>`;
}

/**
 * What the bottle currently holds. Nothing to say when it holds nothing: the tiles above
 * show what is in, and an absent chip row shows that it makes nothing yet.
 */
export function liveMarkup(catalogue: Catalogue, chosen: Ingredient[]): string {
  const mixture = liveMixture(catalogue, chosen);
  if (!mixture) return '';
  return `<ul class="sky-chips">${mixture.effects
    .map((effect) => effectChip(catalogue.effectNames, mixture, effect, []))
    .join('')}</ul>`;
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

  for (const button of ingredientButtons) {
    button.addEventListener('click', () => {
      const ingredient = bySlug.get(button.dataset.ing || '');
      if (!ingredient) return;
      const at = chosen.indexOf(ingredient);
      if (at === -1) {
        if (chosen.length >= 3) return;
        chosen.push(ingredient);
      } else {
        chosen.splice(at, 1);
      }
      refreshIngredients();
    });
  }

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
