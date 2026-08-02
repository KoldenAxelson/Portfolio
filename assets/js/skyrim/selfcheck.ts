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
import { placeableFrom, planMarkupFor, potionOf, replay, roundsOf, solve, type Plan, type Settings } from './resto';
import { fairLoop, magnitudeOf, maximise, type MaxSettings, type Trick } from './enchant';

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
  // UESP: a fully perked alchemist with no gear brews a 15% Fortify Enchanting potion,
  // and the natural ceiling on a base-8 skill enchantment is 25%.
  const bare = solve({ ...MAXED, pieces: 1, perPiece: 0 }, 1);
  near('natural cap on a base-8 enchantment is 25%', bare.natural, 25.06, 0.1);

  // THE MEASURED RUN. Four 25% pieces, plain ingredients, all four worn every round, no
  // waiting. Observed 120 / 422 / 1948 / 26405 and 54 / 130 / 512 / 6626, then a 3,991%
  // Fortify Enchanting potion placing 9,831%. Tolerances are 0.5% because the game floors
  // each magnitude and this does not, which drifts slightly high over four rounds.
  const run = replay(MAXED, [4, 4, 4, 4]);
  const observed = [
    { gear: 100, potion: 120, piece: 54 },
    { gear: 220, potion: 422, piece: 130 },
    { gear: 522, potion: 1948, piece: 512 },
    { gear: 2051, potion: 26405, piece: 6626 },
  ];
  observed.forEach((want, i) => {
    near(`round ${i + 1} brews in ${want.gear}% gear`, run[i].brewGearPercent, want.gear, want.gear * 0.005);
    near(`round ${i + 1} makes a ${want.potion}% potion`, run[i].brewedPercent, want.potion, want.potion * 0.005);
    near(`round ${i + 1} leaves a piece at ${want.piece}%`, run[i].piecePercent, want.piece, want.piece * 0.02);
  });

  // End to end: the cash-out potion and the enchantment it places. This is the only check
  // that exercises the enchanting quadratic anywhere near this magnitude.
  const finalGear = run[3].piecePercent * 4;
  const fePotion = potionOf(MAXED, finalGear);
  near('cashes out near the measured 3,991% potion', fePotion, 3991, 3991 * 0.005);
  near('which places the measured 9,831%', placeableFrom(MAXED, fePotion), 9831, 9831 * 0.005);

  // Wearing fewer pieces to brew is the only brake, so it has to actually bite.
  const braked = replay(MAXED, [4, 2]);
  check('brewing in two pieces makes a weaker potion than four',
    braked[1].brewedPercent < run[1].brewedPercent,
    `${braked[1].brewedPercent.toFixed(0)}% vs ${run[1].brewedPercent.toFixed(0)}%`);
  near('and brewing in nothing still gives the bare 60%', replay(MAXED, [0])[0].brewedPercent, 60, 0.05);

  // THE PLAN THAT WAS ACTUALLY EXECUTED AND WORKED: 235% Fortify Alchemy placed on a
  // pair of gloves, off the fixed 4x25% set with plain ingredients. Pinned move by move,
  // because this is the one plan in here that has been confirmed end to end in game and
  // any drift in the model would silently change it.
  const confirmed = solve(MAXED, 235);
  check('the confirmed 235% plan still reads 235%',
    Math.floor(confirmed.best?.value ?? 0) === 235, `${confirmed.best?.value.toFixed(2)}%`);
  check('and is still the five-round plan that was run',
    confirmed.best?.rounds === 5 && confirmed.best?.cashOutWear === 3,
    `${confirmed.best?.rounds} rounds, cash out in ${confirmed.best?.cashOutWear}`);
  const wear = roundsOf(confirmed.best as Plan).map((round) => round.wear);
  check('brewing in 0, 2, 2, 2, 2 pieces', wear.join(',') === '0,2,2,2,2', wear.join(','));
  const potions = roundsOf(confirmed.best as Plan).map((round) => Math.round(round.brewedPercent));
  check('for potions of 60, 173, 387, 1003, 4315%',
    potions.join(',') === '60,173,387,1003,4315', potions.join(','));
  near('cashing out at a 511.7% Fortify Enchanting potion',
    confirmed.best?.potionPercent ?? 0, 511.7, 0.2);

  // The other two targets asked for along the way.
  for (const target of [122, 200]) {
    const found = solve(MAXED, target);
    check(`${target}% is reachable and reads ${target}%`,
      Math.floor(found.best?.value ?? 0) === target,
      `${found.best?.value.toFixed(2)}% in ${found.best?.rounds} rounds`);
  }

  // A WEAKER POTION DOES NOT TAKE, so no plan may ever step the boost backwards. This is
  // the bug that turned a 600% target into about 1,313% in game: the plan's third round
  // brewed in nothing to drop the boost, which the game ignored, and everything after it
  // compounded off the higher number.
  for (const target of [122, 200, 235, 300, 400, 500, 600, 800, 1000]) {
    const plan = solve(MAXED, target);
    const rounds = roundsOf(plan.best as Plan);
    const rising = rounds.every((round, i) => i === 0 || round.brewedPercent > rounds[i - 1].brewedPercent);
    check(`the ${target}% plan only ever raises the boost`, rising && !rounds.some((r) => r.wasted),
      rounds.map((r) => Math.round(r.brewedPercent)).join(' -> '));
    check(`and ${target}% still reads ${target}%`, Math.floor(plan.best?.value ?? 0) === target,
      `${plan.best?.value.toFixed(2)}%`);
  }

  // The rule itself, in isolation: past ~150% live, brewing in nothing does nothing.
  const noop = replay(MAXED, [4, 4, 0]);
  near('a third round brewed in nothing cannot lower a 422% boost',
    noop[2].piecePercent, noop[1].piecePercent, 0.01);
  check('and is reported as wasted rather than as a step', noop[2].wasted);

  // A target under the natural cap should need no loop at all.
  const trivial = solve(MAXED, 25);
  check('a 25% target needs no rounds', trivial.best?.rounds === 0, `rounds=${trivial.best?.rounds}`);
}

/** The tricks as data/skyrim/enchant-tricks.yaml ships them. */
const TRICKS: Trick[] = [
  { id: 'shadows', label: 'Seeker of Shadows', note: '', side: 'alchemy', kind: 'mult', value: 1.1, excludes: ['sorcery'], dlc: 'DB', sure: true },
  { id: 'sorcery', label: 'Seeker of Sorcery', note: '', side: 'enchant', kind: 'mult', value: 1.1, excludes: ['shadows'], dlc: 'DB', sure: true },
  { id: 'dreugh', label: 'Dreugh Wax', note: '', side: 'alchemy', kind: 'potionbase', value: 2, excludes: [], dlc: 'CC', sure: true },
  { id: 'necromage', label: 'Necromage', note: '', side: 'both', kind: 'mult', value: 1.25, excludes: [], dlc: '', sure: true },
  { id: 'ahzidal', label: "Ahzidal's Genius", note: '', side: 'enchant', kind: 'mult', value: 1.1, excludes: [], dlc: 'DB', sure: false },
];

const MAX_BASE: MaxSettings = {
  enchanting: 100, enchanter: 5, baseMagnitude: 8, categoryPerk: true,
  potionPercent: 0, fairLoop: false,
  alchemy: 100, alchemist: 5, benefactor: true, pieces: 4,
  active: new Set<string>(),
};

function checkEnchantMax(): void {
  // Agrees with the natural cap the resto planner reports, which is UESP's 25%.
  near('bare, a base-8 enchantment caps at 25.06%', magnitudeOf(MAX_BASE, TRICKS), 25.06, 0.05);

  // THE CROSS-CHECK THAT MATTERS: the 511.7% potion from the confirmed resto plan has to
  // land on the same 235% here. Two modules, two code paths, one number that was placed
  // on a pair of gloves in game.
  const looped = { ...MAX_BASE, potionPercent: 511.7 };
  near('the confirmed 511.7% potion places 235%', magnitudeOf(looped, TRICKS), 235.0, 0.5);
  const solved = solve(MAXED, 235);
  near('and the resto planner agrees to within a rounding error',
    magnitudeOf({ ...MAX_BASE, potionPercent: solved.best?.potionPercent ?? 0 }, TRICKS),
    solved.best?.value ?? 0, 0.05);

  // Flat multipliers are flat: Necromage on its own is exactly x1.25.
  const necro = { ...looped, active: new Set(['necromage']) };
  near('Necromage is exactly x1.25', magnitudeOf(necro, TRICKS), magnitudeOf(looped, TRICKS) * 1.25, 0.01);

  // The breakdown must be ordered by what each lever is actually worth, and the potion
  // must top it — that ordering is the whole point of the module.
  const all = maximise({ ...looped, active: new Set(TRICKS.map((t) => t.id)) }, TRICKS);
  const worths = all.contributions.map((c) => c.worth);
  check('the breakdown is ordered by worth',
    worths.every((w, i) => i === 0 || worths[i - 1] >= w), worths.map((w) => w.toFixed(0)).join(' > '));
  check('and the potion is worth the most of anything',
    all.contributions[0].label.indexOf('potion') !== -1, all.contributions[0].label);

  // Same +10% trick, two very different characters. This is the claim the page makes.
  const bareSorcery = maximise({ ...MAX_BASE, active: new Set(['sorcery']) }, TRICKS);
  const loopedSorcery = maximise({ ...looped, active: new Set(['sorcery']) }, TRICKS);
  const bareWorth = bareSorcery.contributions.find((c) => c.label.indexOf('Sorcery') !== -1);
  const loopedWorth = loopedSorcery.contributions.find((c) => c.label.indexOf('Sorcery') !== -1);
  check('a flat +10% is worth ten times more on a looped character',
    (loopedWorth?.worth ?? 0) > (bareWorth?.worth ?? 0) * 9,
    `${bareWorth?.worth.toFixed(1)} vs ${loopedWorth?.worth.toFixed(1)}`);

  // Effective skill is what the quadratic sees, not what the perk tree says.
  near('effective skill counts the potion', loopedSorcery.effectiveSkill, 611.7, 0.1);

  // THE FAIR LOOP. Plain, it has to settle on UESP's documented pair — 29% Fortify
  // Alchemy a piece off a 32% potion — which is a real check rather than a fitted one.
  const fairBase = { ...MAX_BASE, fairLoop: true };
  const plain = fairLoop(fairBase, TRICKS);
  check('the fair loop converges', !plain.runaway, `${plain.rounds} passes`);
  near('on UESP\'s 29% Fortify Alchemy a piece', plain.piecePercent, 29, 0.5);
  near('off a 32.4% potion', plain.potionPercent, 32.4, 0.2);

  // The Anniversary ingredients are the biggest fair lever, doubling the potion's base
  // magnitude before any alchemist multiplier touches it.
  const curios = fairLoop({ ...fairBase, active: new Set(['dreugh']) }, TRICKS);
  near('Dreugh Wax takes it to 35% a piece', curios.piecePercent, 35, 0.5);
  near('and a 72% potion', curios.potionPercent, 72.0, 0.5);

  const everything = fairLoop({ ...fairBase, active: new Set(['shadows', 'dreugh', 'necromage']) }, TRICKS);
  near('all three fair levers reach 70% a piece', everything.piecePercent, 70, 0.5);
  near('and a 156.8% potion', everything.potionPercent, 156.8, 0.5);

  // Five slots and every fair lever and it stops settling — no glitch required.
  const fifth = fairLoop({ ...fairBase, pieces: 5, active: new Set(['shadows', 'dreugh', 'necromage']) }, TRICKS);
  check('on five slots the fair loop runs away on its own', fifth.runaway);

  // THE SEEKER DECISION, which is the point of tracking which side a trick lands on:
  // same +10%, but Shadows compounds through the loop and Sorcery applies once.
  const withShadows = magnitudeOf({ ...fairBase, active: new Set(['shadows', 'dreugh', 'necromage']) }, TRICKS);
  const withSorcery = magnitudeOf({ ...fairBase, active: new Set(['sorcery', 'dreugh', 'necromage']) }, TRICKS);
  // Sorcery edges it, because it boosts the Fortify Alchemy gear the loop is building
  // as well as the final enchantment. Pinned because the first version of this file
  // claimed the opposite on the strength of a hand calculation.
  check('Seeker of Sorcery beats Seeker of Shadows', withSorcery > withShadows,
    `${withSorcery.toFixed(2)}% vs ${withShadows.toFixed(2)}%`);
  near('Shadows places 70.83%', withShadows, 70.83, 0.05);
  near('Sorcery places 74.63%', withSorcery, 74.63, 0.05);
}

function checkRestoMarkup(): void {
  // The regression that shipped once: two blocks vanished from the plan and the
  // screenshot taken minutes later did not give it away.
  const solution = solve(MAXED, 235);
  if (!solution.best) return check('plan markup', false, 'no plan');
  const html = planMarkupFor(solution, 235);
  for (const cls of ['sky-plan__head', 'sky-plan__value', 'sky-plan__meta', 'sky-plan__count', 'sky-steps']) {
    check(`plan markup contains .${cls}`, html.indexOf(cls) !== -1);
  }
  check('plan markup offers a cash-out step', html.indexOf('sky-step--brew') !== -1);
  check('every round says how many pieces to brew in',
    (html.match(/potion wearing/g) || []).length === solution.best.rounds);
  check('every round says what a piece will read afterwards',
    (html.match(/you put on now reads/g) || []).length === solution.best.rounds);
  check('and the cash-out names its Fortify Enchanting potion',
    html.indexOf('Fortify Enchanting potion') !== -1);
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
  checkEnchantMax();
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
