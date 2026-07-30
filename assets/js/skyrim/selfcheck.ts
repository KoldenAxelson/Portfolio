// Assertions for the Skyrim modules, run in the browser by /misc/skyrim-check/.
//
// WHY THIS EXISTS
//   Two bugs shipped in one day and both were caught by a throwaway script:
//   a rendering regression that dropped two lines from the resto plan, and a
//   panel that closed itself because blurring a number input fires `change`.
//   Neither would have survived a check like this.
//
// WHY IT IS A PAGE AND NOT A TEST RUNNER
//   The site's build is deliberately Node-free — pinned Hugo and Tailwind
//   binaries, Hugo's own esbuild. A test framework would be the first thing to
//   break that. This runs on the same bundle the site ships, in a real browser,
//   with no new tooling: open the page and it is green or it is not. It is also
//   automatable later by any headless driver that can read the exit marker in
//   `document.title`.
//
// WHAT TO ASSERT HERE
//   Numbers that are documented somewhere (UESP's anchors, a measured field
//   report) and structure that a refactor could silently drop. Not appearance.

import { buildCatalogue, resultsMarkup, search, type Catalogue } from './builder';
import { planMarkupFor, roundsOf, solve, type Settings } from './resto';

interface Check { name: string; pass: boolean; detail: string }

const results: Check[] = [];

function check(name: string, pass: boolean, detail = ''): void {
  results.push({ name, pass, detail });
}

/** Tolerant compare — these are floats out of a fitted curve, not integers. */
function near(name: string, actual: number, expected: number, tolerance: number): void {
  const pass = Math.abs(actual - expected) <= tolerance;
  check(name, pass, `${actual.toFixed(2)} vs ${expected}${pass ? '' : ` (±${tolerance})`}`);
}

const MAXED: Settings = {
  alchemy: 100, alchemist: 5, benefactor: true, seekerShadows: false,
  enchanting: 100, enchanter: 5, seekerSorcery: false,
  pieces: 4, perPiece: 25, baseMagnitude: 8, categoryPerk: true,
};

function checkRestoMaths(): void {
  // UESP: a fully perked alchemist with no gear brews a 15% Fortify Enchanting
  // potion, and the natural ceiling on a base-8 skill enchantment is 25%.
  const bare = solve({ ...MAXED, pieces: 1, perPiece: 0 }, 1);
  near('natural cap on a base-8 enchantment is 25%', bare.natural, 25.06, 0.1);

  // The field report this planner was built against: 3 rounds, 4x25% gear.
  const three = solve(MAXED, 121);
  near('3 rounds reaches the measured 122% (model says 121.6)', three.best?.value ?? 0, 121.59, 0.2);

  // The answer the page ships with.
  const target = solve(MAXED, 200);
  check('200% is reachable exactly', Math.floor(target.best?.value ?? 0) === 200, `${target.best?.value?.toFixed(2)}`);
  check('200% needs at most 4 rounds', (target.best?.rounds ?? 9) <= 4, `rounds=${target.best?.rounds}`);

  // No plan may hold a piece at a value the game will not give it: every piece is
  // base x (1 + the boost active at that point), or base. This is the bug that
  // shipped, and it only shows up on mixed-wear plans.
  if (target.best) {
    const perPiece = MAXED.perPiece;
    const bad = roundsOf(target.best).filter((round) => {
      const boosted = perPiece * (1 + round.appliedPercent / 100);
      return round.piecePercents.some((p) =>
        Math.abs(p - boosted) > 0.01 && Math.abs(p - perPiece) > 0.01);
    });
    check('no plan holds a piece at a stale value', bad.length === 0,
      bad.map((r) => `round ${r.index}`).join(', '));
  }

  // A target under the natural cap should need no loop at all.
  const trivial = solve(MAXED, 25);
  check('a 25% target needs no rounds', trivial.best?.rounds === 0, `rounds=${trivial.best?.rounds}`);
}

function checkRestoMarkup(): void {
  // The regression that shipped: these two blocks vanished from the plan and the
  // screenshot taken minutes later did not give it away.
  const solution = solve(MAXED, 200);
  if (!solution.best) return check('plan markup', false, 'no plan');
  const html = planMarkupFor(solution, 200);
  for (const cls of ['sky-plan__head', 'sky-plan__value', 'sky-plan__meta', 'sky-plan__count', 'sky-steps']) {
    check(`plan markup contains .${cls}`, html.indexOf(cls) !== -1);
  }
  check('plan markup offers a cash-out step', html.indexOf('sky-step--brew') !== -1);
  // "wearing only A B" for a uniform wear, "wearing A (boosted) with B C D" for a
  // mixed one — so count the shared stem, across the rounds plus the cash-out.
  check('every step names what to wear while brewing',
    (html.match(/potion wearing/g) || []).length === solution.best.rounds + 1);
  check('every step names what to equip before drinking', (html.match(/then drink it/g) || []).length === solution.best.rounds);
  check('every step gives the gear total to check against the game',
    (html.match(/Fortify Alchemy/g) || []).length === solution.best.rounds + 1);

  // Mixing boosted pieces with ones at base is a real lever (three at 300% plus
  // one at 25% is 925%, not 900% or 1,200%). Assert the search uses it and that
  // the arithmetic is the plain sum.
  const rounds = roundsOf(solution.best);
  const mixes = rounds.filter((r) => r.brewBoostedLetters && r.brewBaseLetters);
  check('the plan uses at least one mixed boosted/base brew', mixes.length > 0,
    mixes.map((r) => `round ${r.index}`).join(', '));
  const wrong = rounds.filter((round) => {
    const boostedCount = round.brewBoostedLetters ? round.brewBoostedLetters.split(' ').length : 0;
    const baseCount = round.brewBaseLetters ? round.brewBaseLetters.split(' ').length : 0;
    const previousBoost = rounds[round.index - 2]?.appliedPercent ?? 0;
    const expected = boostedCount * MAXED.perPiece * (1 + previousBoost / 100) + baseCount * MAXED.perPiece;
    return Math.abs(round.brewGearPercent - expected) > 0.01;
  });
  check('mixed gear is the plain sum of boosted and base pieces', wrong.length === 0,
    wrong.map((r) => `round ${r.index}`).join(', '));
  check('plan markup has a slot for the round detail', html.indexOf('data-slot') !== -1);
}

function checkBuilder(catalogue: Catalogue): void {
  const idOf = (name: string): number => catalogue.effectNames.indexOf(name);

  check('the catalogue has 183 ingredients', catalogue.ingredients.length === 183, `${catalogue.ingredients.length}`);
  check('the catalogue has 59 effects', catalogue.effectNames.length === 59, `${catalogue.effectNames.length}`);

  // Every effect must have two carriers or it could never reach a bottle. The
  // build asserts this too; here it guards the payload, not the YAML.
  const orphans = catalogue.effectNames.filter((_, i) => catalogue.carriersOf[i].length < 2);
  check('every effect has at least two carriers', orphans.length === 0, orphans.join(', '));

  // Each ingredient's bitmask must agree with its own effect list.
  const mismatched = catalogue.ingredients.filter((ingredient) => {
    const bits = ingredient.effects.filter((index) =>
      index < 32 ? ingredient.mask.low & (1 << index) : ingredient.mask.high & (1 << (index - 32)));
    return bits.length !== ingredient.effects.length;
  });
  check('effect bitmasks match the effect lists', mismatched.length === 0, mismatched.map((i) => i.slug).join(', '));

  // The impossible pair, which is the clearest expression of the two-carrier rule.
  const impossible = search(catalogue, [idOf('Fortify Sneak'), idOf('Fortify Marksman')]);
  check('Fortify Sneak + Fortify Marksman is impossible', impossible.total === 0, `${impossible.total} found`);

  // The three resists, counted by hand at 15.
  const resists = search(catalogue, [idOf('Resist Fire'), idOf('Resist Frost'), idOf('Resist Shock')]);
  check('the three resists have exactly 15 brews', resists.total === 15, `${resists.total}`);
  const clean = resists.winners[1]; // "Nothing extra"
  check('"Nothing extra" on the resists yields exactly 3 effects', clean?.effects.length === 3, `${clean?.effects.length}`);

  // Ranking must see the whole space: Salmon Roe's x12.5 sits well past any
  // sample cutoff, and losing it was a real bug.
  const magicka = search(catalogue, [idOf('Fortify Magicka')]);
  const potent = magicka.winners[3]; // "Most potent"
  check('"Most potent" Fortify Magicka finds Salmon Roe',
    !!potent?.ingredients.some((i) => i.slug === 'salmon-roe'),
    potent?.ingredients.map((i) => i.slug).join(' + ') || '');
  check('and reports its x12.5', potent?.multipliers[idOf('Fortify Magicka')] === 12.5,
    String(potent?.multipliers[idOf('Fortify Magicka')]));

  // Duration-only effects read the duration multiplier, magnitude being 0.
  const paralysis = search(catalogue, [idOf('Paralysis')]);
  check('Paralysis is reachable', paralysis.total > 0, `${paralysis.total}`);

  const markup = resultsMarkup(catalogue.effectNames, resists, [idOf('Resist Fire')], false);
  check('results markup renders a card per ranking', (markup.match(/sky-brew__badge/g) || []).length >= 3);
}

export function runSelfCheck(mount: HTMLElement): void {
  const payloadScript = document.querySelector('[data-builder-data]');
  if (!payloadScript) {
    mount.innerHTML = '<p class="sky-hint">No builder payload on this page — nothing to check.</p>';
    return;
  }

  const catalogue = buildCatalogue(JSON.parse(payloadScript.textContent || '{}'));
  checkRestoMaths();
  checkRestoMarkup();
  checkBuilder(catalogue);

  const failed = results.filter((r) => !r.pass);
  const rows = results
    .map((r) => `<li class="sky-chk${r.pass ? '' : ' is-bad'}"><b>${r.pass ? 'PASS' : 'FAIL'}</b><span>${r.name}</span><em>${r.detail}</em></li>`)
    .join('');

  mount.innerHTML =
    `<p class="sky-chk__sum${failed.length ? ' is-bad' : ''}">` +
    `${results.length - failed.length} of ${results.length} passed` +
    `</p><ul class="sky-chks">${rows}</ul>`;

  // A marker a headless driver can read without parsing the page.
  document.title = failed.length ? `FAIL (${failed.length}) — self-check` : 'PASS — self-check';
}
