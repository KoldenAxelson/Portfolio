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

import { bridgeMaskOf, browsableCount, buildCatalogue, brewDetailMarkup, catalogueWithout, couldJoin, effectDetailMarkup, headlines, liveMarkup, liveMixture, maskToIndices, mortarMarkup, sharesEffectWith, overflowOrder, overflowPageMarkup, pageCount, pagerMarkup, resultsMarkup, search, winnerOf, type Catalogue } from './builder';
import { placeableFrom, planMarkupFor, potionOf, replay, roundsOf, solve, type Plan, type Settings } from './resto';
import { fairLoop, magnitudeOf, maximise, type MaxSettings, type Trick } from './enchant';
import { linkTargets, screenNames, skillXp, standingAt, xpToReach, type Levelling } from './john';

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
  // Grand unless a check says otherwise: every measured run used one, and pinning it keeps
  // the anchors comparable now that the gem is a lever.
  soulCharges: 3000,
};

/** Let the planner choose the gem — which is the shipping default. */
const ANY_SOUL: Settings = { ...MAXED, soulCharges: 0 };

function checkRestoMaths(): void {
  // UESP: a fully perked alchemist with no gear brews a 15% Fortify Enchanting potion,
  // and the natural ceiling on a base-8 skill enchantment is 25%.
  const bare = solve({ ...MAXED, pieces: 1, perPiece: 0 }, 1);
  near('natural cap on a base-8 enchantment is 25%', bare.natural, 25.06, 0.1);

  // THE MEASURED LADDER. Four 25% pieces, plain ingredients, all four worn every round,
  // no waiting. Observed 120 / 422 / 1948 / 26405 and a cash-out of 3,991% -> 9,831%.
  // Tolerances are 0.1% because the model now rounds the potion the way the game does;
  // before that it drifted half a percent high over four rounds.
  const run = replay(MAXED, [4, 4, 4, 4]);
  [120, 422, 1948, 26405].forEach((want, i) => {
    near(`round ${i + 1} brews ${want}%`, run[i].brewedPercent, want, want * 0.001);
  });
  const cashGear = run[3].piecePercent * 4;
  const fePotion = potionOf(MAXED, cashGear);
  near('cashes out on the measured 3,991% potion', fePotion, 3991, 4);
  near('which places the measured 9,831%', placeableFrom(MAXED, fePotion), 9831, 10);

  // THE TWO PLANS THAT WERE ACTUALLY RUN, pinned as sequences rather than as whatever the
  // search currently prefers. `solve` now proposes a four-round route to 235% instead of
  // this five-round one; both are correct, but only this one has a confirmed outcome
  // behind it. If it ever disagrees with the search, the search is not the authority —
  // do not "resync" this to match it.
  const confirmed = replay(MAXED, [0, 2, 2, 2, 2]);
  const confirmedFe = potionOf(MAXED, confirmed[4].piecePercent * 3);
  near('the confirmed 235% run still brews its 511.9% potion', confirmedFe, 511.9, 1);
  check('and still places 235%', Math.floor(placeableFrom(MAXED, confirmedFe)) === 235,
    `${placeableFrom(MAXED, confirmedFe).toFixed(2)}%`);

  // The 600% attempt, which came out at 887% / 587% in game. The model has to land on
  // that, not on the 900% / 600% it used to promise.
  const sixHundred = replay(MAXED, [0, 1, 2, 2, 2, 2]);
  check('the 600% attempt wastes no rounds', !sixHundred.some((r) => r.wasted));
  const sixFe = potionOf(MAXED, sixHundred[5].piecePercent);
  near('and brews the measured 887% potion', sixFe, 887, 2);
  near('placing the measured 587%', placeableFrom(MAXED, sixFe), 587, 2.5);

  // Wearing fewer pieces to brew is the only brake, so it has to actually bite.
  const braked = replay(MAXED, [4, 2]);
  check('brewing in two pieces makes a weaker potion than four',
    braked[1].brewedPercent < run[1].brewedPercent,
    `${braked[1].brewedPercent.toFixed(0)}% vs ${run[1].brewedPercent.toFixed(0)}%`);
  near('and brewing in nothing still gives the bare 60%', replay(MAXED, [0])[0].brewedPercent, 60, 0.05);

  // A POTION ONLY SUPERSEDES ONE IT BEATS IN THE BOTTLE. The comparison is between the
  // potions' OWN magnitudes, not the boost you are walking around with — so a second
  // "brew wearing nothing" round can never do anything, because naked always brews the
  // same 60%. A plan built on one overshot a 600% target to about 1,313% in game, and a
  // later version that avoided the overshoot by brewing naked twice UNDERSHOT to 204%.
  const hisRun = replay(MAXED, [0, 0, 3, 4, 3]);
  check('a second naked round is wasted', hisRun[1].wasted);
  near('and leaves the piece where round one left it', hisRun[1].piecePercent, 40.0, 0.05);
  near('so round 5 reaches ~3,918% rather than the 7,771% the old rule gave',
    hisRun[4].brewedPercent, 3917.7, 2);
  const hisGear = hisRun[4].piecePercent * 3;
  near('cashing out in three gives the measured 467% potion', potionOf(MAXED, hisGear), 467, 2);
  near('which places the measured 204%', placeableFrom(MAXED, potionOf(MAXED, hisGear)), 204, 2);

  // SOUL GEMS. On apparel the gem scales the magnitude by charges/3000, which gives the
  // planner five overlapping copies of an otherwise lumpy set. It is not a small effect:
  // several targets have NO landing on a grand soul and a comfortable one on another gem.
  for (const target of [200, 300, 600, 800, 1000, 1500]) {
    const grand = solve(MAXED, target);
    const any = solve(ANY_SOUL, target);
    // !!grand.best first: `Math.floor(undefined ?? 0) !== target` is true for every
    // target, so this passed just as happily when solve returned nothing at all — a
    // different and much worse fact than "no landing on this gem".
    check(`${target}% has no grand-soul landing`,
      !!grand.best && Math.floor(grand.best.value) !== target, `${grand.best?.value.toFixed(2)}%`);
    check(`but lands on a ${any.best?.soulLabel} soul`, Math.floor(any.best?.value ?? 0) === target,
      `${any.best?.value.toFixed(2)}%, ${any.best?.margin.toFixed(2)} inside`);
  }
  // The petty landing on 600% only exists above the old 30,000% gear ceiling, so it also
  // guards against that being tightened back down.
  const petty = solve({ ...MAXED, soulCharges: 250 }, 600);
  near('a petty soul reaches 600% from 22,580% gear', petty.best?.gearPercent ?? 0, 22580, 50);
  check('and lands 0.42 inside it', (petty.best?.margin ?? 0) > 0.4, `${petty.best?.value.toFixed(2)}%`);

  // And it never picks a gem that makes the landing worse than grand would.
  for (const target of [122, 235, 400, 500]) {
    const grand = solve(MAXED, target);
    const any = solve(ANY_SOUL, target);
    check(`${target}% is no worse for having the choice`,
      !!any.best && !!grand.best && any.best.margin >= grand.best.margin - 1e-9,
      `${any.best?.soulLabel} ${any.best?.margin.toFixed(2)} vs grand ${grand.best?.margin.toFixed(2)}`);
  }

  // MARGIN. The game floors, and the enchanting fit is soft to a few tenths of a percent,
  // so a landing that hugs the bottom edge of its whole number is a coin flip. A 500%
  // target used to pick 500.01% and came out as 499% in game. Every plan that claims to
  // read the target must now sit comfortably inside it.
  for (const target of [122, 235, 400, 500]) {
    const plan = solve(MAXED, target);
    if (Math.floor(plan.best?.value ?? 0) !== target) continue;
    check(`the ${target}% plan lands clear of the band edge`, (plan.best?.margin ?? 0) >= 0.15,
      `${plan.best?.value.toFixed(2)}%, ${plan.best?.margin.toFixed(2)} inside`);
  }
  // PLACING IT SOBER. `cashOut` always brews something — a maxed alchemist wearing nothing
  // still makes a 15% potion — so the potion-free placement has to be offered separately.
  // Without it the planner called the one number you get for free unreachable, on every
  // group, and then printed "place it with no potion at all" over a plan that wanted one.
  for (const [base, target] of [[8, 25], [13, 40], [15, 46], [20, 62]]) {
    const free = solve({ ...MAXED, baseMagnitude: base }, target);
    check(`base ${base} reaches ${target}% with no potion at all`,
      Math.floor(free.best?.value ?? 0) === target && free.best?.potionPercent === 0,
      `${free.best?.value.toFixed(2)}%, potion ${free.best?.potionPercent.toFixed(1)}%`);
    check(`and says so rather than listing a brew`,
      planMarkupFor(free, target).indexOf('Nothing to brew') !== -1);
  }
  // The converse: a plan that needs no LOOPS can still need a potion, and must print the
  // cash-out step. Gating the step list on plan.rounds dropped it silently.
  const oneBrew = solve({ ...MAXED, baseMagnitude: 8 }, 26);
  check('a no-loop plan that needs a potion still lists its brew',
    (oneBrew.best?.rounds ?? -1) === 0 && (oneBrew.best?.potionPercent ?? 0) > 0 &&
    planMarkupFor(oneBrew, 26).indexOf('sky-step--brew') !== -1,
    `${oneBrew.best?.value.toFixed(2)}%, potion ${oneBrew.best?.potionPercent.toFixed(1)}%`);
  check('and says why there are no rounds above it',
    planMarkupFor(oneBrew, 26).indexOf('No restoration loops needed') !== -1);

  const fiveHundred = solve(MAXED, 500);
  check('500% no longer picks the 500.01% landing', (fiveHundred.best?.value ?? 0) > 500.1,
    `${fiveHundred.best?.value.toFixed(2)}%`);

  // Every plan must be executable: no wasted rounds, and a naked brew only ever first.
  for (const target of [122, 200, 235, 300, 400, 500, 600, 800, 1000]) {
    const plan = solve(MAXED, target);
    const rounds = roundsOf(plan.best as Plan);
    check(`the ${target}% plan has no rounds that do nothing`, !rounds.some((r) => r.wasted),
      rounds.map((r) => r.wear).join(','));
    check(`and brews naked only as its opening move`,
      rounds.every((round, i) => round.wear > 0 || i === 0),
      rounds.map((r) => r.wear).join(','));
    // Not every target is reachable now that the supersede rule prunes the space. What
    // matters is that it never CLAIMS to have hit one it has not.
    const value = plan.best?.value ?? 0;
    check(`and ${target}% is either hit or honestly missed`,
      Math.floor(value) === target || planMarkupFor(plan, target).indexOf('Nothing reachable') !== -1,
      `${value.toFixed(2)}%`);
  }

  // A target under the natural cap should need no loop at all.
  const trivial = solve(MAXED, 25);
  check('a 25% target needs no rounds', trivial.best?.rounds === 0, `rounds=${trivial.best?.rounds}`);
}

/**
 * A HAND-MIRRORED COPY of data/skyrim/enchant-tricks.yaml, not a read of it — this module
 * never touches the page's [data-tricks] payload. So correcting a `value` in the YAML
 * leaves these assertions green against the old number, which is the one drift this file
 * cannot catch. Mirror any edit to that file here, or the alarm is off. (Labels are
 * shortened on purpose; only the numeric and side/kind fields are load-bearing.)
 */
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
  near('the confirmed 511.9% potion places 235%', magnitudeOf(looped, TRICKS), 235.0, 0.5);
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
  // .sky-plan__count is deliberately NOT in here any more: on a looped plan it used to
  // carry "Tap a step to see where every piece stands after it", and a list of buttons
  // does not need instructions for pressing one. It survives only where it says something
  // — the no-loop and nothing-to-brew cases, both asserted above.
  // .sky-plan__head and .sky-plan__meta are gone too: the heading restated the target box
  // and the meta row restated the steps. What is left is the answer and the plan.
  for (const cls of ['sky-plan__value', 'sky-steps']) {
    check(`plan markup contains .${cls}`, html.indexOf(cls) !== -1);
  }
  check('plan markup offers a cash-out step', html.indexOf('sky-step--brew') !== -1);
  // + 1 on each: the cash-out step carries the same two marks as a round.
  check('every step shows what to wear, as pips',
    (html.match(/sky-step__pips/g) || []).length === solution.best.rounds + 1);
  check('and what it brews',
    (html.match(/sky-step__brew/g) || []).length === solution.best.rounds + 1);
  check('and the pips count out the whole set every time',
    (html.match(/<i(?: class="is-on")?><\/i>/g) || []).length ===
      (solution.best.rounds + 1) * solution.best.pieceCount);
  check('no step carries a gem any more', html.indexOf('sky-step__gem') === -1);
  // Marks, not sentences — but a screen reader still gets the sentence.
  check('and the marks say themselves to a screen reader',
    html.indexOf('wear 0 of') !== -1 || html.indexOf('wear 1 of') !== -1 ||
    html.indexOf('wear 2 of') !== -1 || html.indexOf('wear 3 of') !== -1);
  // In plain sight, not only in the accessibility tree: five gems differ mostly by how
  // blue they are, and this is the one choice in the plan you cannot redo cheaply.
  check('the answer row names the soul gem where it can be read',
    html.indexOf(`<b>${solution.best.soulLabel}</b><span class="sky-sr"> soul gem.`) !== -1,
    solution.best.soulLabel);
  check('and the answer row is where it lives',
    html.indexOf('sky-plan__gem') !== -1 && html.indexOf('sky-plan__icon') !== -1);
  // The step used to carry the gear percentage and what a piece reads afterwards. Both
  // moved into the detail card, and a step that grew them back would be the regression.
  check('a step carries nothing but the round, the wear and the brew',
    html.indexOf('Fortify Alchemy)') === -1 && html.indexOf('then reads') === -1);
  check('plan markup has a slot for the round detail', html.indexOf('data-slot') !== -1);
}

function checkBuilder(catalogue: Catalogue): void {
  const idOf = (name: string): number => catalogue.effectNames.indexOf(name);

  check('the catalogue has 183 ingredients', catalogue.ingredients.length === 183, `${catalogue.ingredients.length}`);
  check('the catalogue has 59 effects', catalogue.effectNames.length === 59, `${catalogue.effectNames.length}`);

  // River Betty makes Damage Health INSTANTANEOUS — `dur: 0` in effects.yaml. Hugo's
  // `default` treats 0 as empty, so the payload shipped it as 1 for a while, which is a
  // factor of ~12.6 on the duration term of the gold cost and flipped 1,448 verdicts.
  // Pinned here because the template is the only thing standing between the YAML and this.
  const riverBetty = catalogue.deviations[idOf('Damage Health')]?.['river-betty'];
  check('a deliberate dur:0 survives the payload', riverBetty?.[1] === 0, `dur ${riverBetty?.[1]}`);
  check('and its x2.5 magnitude comes through with it', riverBetty?.[0] === 2.5, `mag ${riverBetty?.[0]}`);

  // Every effect must have two carriers or it could never reach a bottle. The
  // build asserts this too; here it guards the payload, not the YAML.
  const orphans = catalogue.effectNames.filter((_, i) => catalogue.carriersOf[i].length < 2);
  check('every effect has at least two carriers', orphans.length === 0, orphans.join(', '));

  // Each ingredient's bitmask must agree with its own effect list, decoded by the OTHER
  // decoder. This used to re-derive the mask with maskOf's own `1 << index` expression,
  // so it could not fail whatever arithmetic maskOf did — and because JS shifts are mod
  // 32, `1 << (i - 32)` and `1 << i` are the same value for i in 32..58, which made the
  // one off-by-32 the two halves exist to prevent invisible to it.
  const mismatched = catalogue.ingredients.filter((ingredient) => {
    const decoded = maskToIndices(ingredient.mask, catalogue.effectNames.length);
    const listed = ingredient.effects.slice().sort((a, b) => a - b);
    return decoded.length !== listed.length || decoded.some((v, i) => v !== listed[i]);
  });
  check('effect bitmasks round-trip through the other decoder', mismatched.length === 0,
    mismatched.map((i) => i.slug).join(', '));
  // And one that actually straddles the boundary, which is the point of the split: an
  // ingredient carrying both a low and a high effect must set a bit in each half.
  const straddler = catalogue.ingredients.filter((i) =>
    i.effects.some((e) => e < 32) && i.effects.some((e) => e >= 32))[0];
  check('an ingredient spanning both halves sets bits in both',
    !!straddler && straddler.mask.low !== 0 && straddler.mask.high !== 0, straddler?.slug || 'none found');

  // The impossible pair, which is the clearest expression of the two-carrier rule.
  const impossible = search(catalogue, [idOf('Fortify Sneak'), idOf('Fortify Marksman')]);
  check('Fortify Sneak + Fortify Marksman is impossible', impossible.total === 0, `${impossible.total} found`);

  // The three resists, counted by hand at 15.
  const resists = search(catalogue, [idOf('Resist Fire'), idOf('Resist Frost'), idOf('Resist Shock')]);
  check('the three resists have exactly 15 brews', resists.total === 15, `${resists.total}`);
  const clean = winnerOf(resists, 'Nothing extra');
  check('"Nothing extra" on the resists yields exactly 3 effects', clean?.effects.length === 3, `${clean?.effects.length}`);

  // Ranking must see the whole space: Salmon Roe's x12.5 sits well past any
  // sample cutoff, and losing it was a real bug.
  const magicka = search(catalogue, [idOf('Fortify Magicka')]);
  const potent = winnerOf(magicka, 'Most potent');
  check('"Most potent" Fortify Magicka finds Salmon Roe',
    !!potent?.ingredients.some((i) => i.slug === 'salmon-roe'),
    potent?.ingredients.map((i) => i.slug).join(' + ') || '');
  check('and reports its x12.5', potent?.multipliers[idOf('Fortify Magicka')] === 12.5,
    String(potent?.multipliers[idOf('Fortify Magicka')]));

  // Duration-only effects read the DURATION multiplier, magnitude being 0. Nothing used to
  // exercise that branch — both multiplier assertions pinned Fortify Magicka, whose base
  // magnitude is 4 — so inverting the ternary in `multiplierFor` left every assertion
  // green while each Paralysis and Waterbreathing multiplier vanished from the page.
  const paralysis = search(catalogue, [idOf('Paralysis')]);
  check('Paralysis is reachable', paralysis.total > 0, `${paralysis.total}`);
  check('and Paralysis has no base magnitude, so its strength is duration',
    catalogue.baseMagnitudes[idOf('Paralysis')] === 0);

  // CONTESTED means the deviating ingredients DISAGREE, not that there are several. Six of
  // Invisibility's seven deviators all carry the same x1.5, so a mixture holding two of
  // them is not contested — and counting rows instead of values used to demote the
  // gather-5 winner in favour of a gather-3 one with identical potency.
  const invisible = search(catalogue, [idOf('Invisibility')]);
  const potentInvisible = winnerOf(invisible, 'Most potent');
  check('agreeing deviators are not contested', potentInvisible?.contested === false);
  check('and "Most potent" still reports the x1.5',
    potentInvisible?.multipliers[idOf('Invisibility')] === 1.5);
  // This used to pin gatherScore 5. It is a different mixture now, and deliberately: among
  // equally potent brews a contradicting effect is a cost, and the old gather-5 winner was
  // a mixed bottle. Cleanliness first, gatherability after — so the assertion is now about
  // the rule rather than about which mixture the rule happened to pick.
  check('and carries nothing that fights its own verdict',
    !potentInvisible?.mixed, `${potentInvisible?.effects.length} effects, gather ${potentInvisible?.gatherScore}`);

  // NOTHING OFFERED CAN BE SHRUNK. Canis Root + Hanging Moss + Bear Claws was ranked as a
  // Fortify One-Handed potion, and ranked well, though Bear Claws is a third carrier of an
  // effect that already had two and changes nothing. A mixture stays only if dropping any
  // one ingredient would change the effects OR a multiplier.
  for (const wantedName of ['Fortify One-Handed', 'Restore Health', 'Damage Health']) {
    const found = search(catalogue, [idOf(wantedName)]);
    const offered = found.winners.filter(Boolean).concat(found.sample);
    let shrinkable = '';
    for (const mixture of offered) {
      if (!mixture || mixture.ingredients.length < 3 || shrinkable) continue;
      for (let index = 0; index < mixture.ingredients.length; index += 1) {
        const rest = mixture.ingredients.filter((_, other) => other !== index);
        const sub = liveMixture(catalogue, rest);
        if (!sub) continue;
        const sameSet = sub.effects.length === mixture.effects.length &&
          sub.effects.every((effect) => mixture.effects.indexOf(effect) !== -1);
        const sameMultipliers = mixture.effects.every((effect) =>
          (mixture.multipliers[effect] || 1) === (sub.multipliers[effect] || 1));
        if (sameSet && sameMultipliers) {
          shrinkable = `${mixture.ingredients.map((i) => i.name).join(' + ')} — drop ${mixture.ingredients[index].name}`;
          break;
        }
      }
    }
    check(`no ${wantedName} brew has an ingredient you could drop`, !shrinkable, shrinkable);
  }
  // The converse: a third ingredient that BUYS something is still offered. Salmon Roe's
  // x12.5 on Fortify Magicka is the case that would break if the filter got greedy.
  const roe = search(catalogue, [idOf('Fortify Magicka')]);
  check('but a third ingredient that buys a multiplier survives',
    roe.sample.some((mixture) => mixture.ingredients.length === 3 &&
      Object.keys(mixture.multipliers).length > 0));

  const markup = resultsMarkup(catalogue, resists, [idOf('Resist Fire')]);
  check('results markup renders a card per ranking', (markup.match(/sky-brew__badge/g) || []).length >= 3);
  // Screen 3 hands the rest to screen 9 rather than growing into it. If a card for every
  // sampled mixture ever reappears here, the results screen has quietly become the wall
  // the overflow exists to prevent.
  check('and hands the rest to the overflow rather than listing it',
    (markup.match(/sky-brew__open/g) || []).length <= 4 && markup.indexOf('data-more') !== -1,
    `${(markup.match(/sky-brew__open/g) || []).length} cards`);

  // ── What earns a headline ─────────────────────────────────────────────────
  // Reported from the live page: asking for Fortify One-Handed + Fortify Marksman as a
  // POTION led with a brew carrying Damage Stamina, badged "Most effects · Most potent",
  // above the clean two-effect brew. It had neither more of what was asked for nor more
  // potency — it counted a contradiction as an effect and tied on the rest.
  const beneficial = (mixture: { effects: number[] }) =>
    mixture.effects.filter((effect) => !catalogue.harmful[effect]).length;
  const fortify = search(catalogue,
    [idOf('Fortify One-Handed'), idOf('Fortify Marksman')], 'good');
  const fortifyCards = headlines(fortify);

  check('the benchmark leads the results', fortifyCards[0].labels[0] === 'Nothing extra',
    fortifyCards.map((card) => card.labels.join(' + ')).join(' | '));
  check('a potion headline is never won by a harmful passenger',
    fortifyCards.every((card) => beneficial(card.mixture) >= beneficial(fortifyCards[0].mixture)));
  check('and the reported Damage Stamina brew is off the headlines',
    fortifyCards.every((card) => card.mixture.effects.indexOf(idOf('Damage Stamina')) === -1));
  // The general rule behind both: a superlative is a claim to have BEATEN the benchmark.
  const potentCard = fortifyCards.filter((card) => card.labels.indexOf('Most potent') !== -1)[0];
  check('"Most potent" means more potent than the benchmark, not equal to it',
    !potentCard || potentCard.mixture === fortifyCards[0].mixture ||
    potentCard.mixture.potency > fortifyCards[0].mixture.potency);
  check('and every card that survives says something',
    fortifyCards.every((card) => card.labels.length > 0));

  // A poison asks the opposite question, and "most effects" has to flip with it.
  const poisonCards = headlines(search(catalogue, [idOf('Damage Magicka')], 'bad'));
  const mostCard = poisonCards.filter((card) => card.labels.indexOf('Most effects') !== -1)[0];
  check('on the poison side "most effects" counts the harmful ones',
    !mostCard || mostCard.mixture.harmfulCount > beneficial(mostCard.mixture),
    `${mostCard?.mixture.harmfulCount} harmful, ${mostCard ? beneficial(mostCard.mixture) : 0} not`);

  // ── Screen 9: the overflow, paged ─────────────────────────────────────────
  // The count on the button is what the button can REACH. `total` counts every mixture the
  // search walked past, which for a common effect is thousands the sample never kept, and
  // a control promising 2,318 that leads to 400 is exactly the dishonesty the sentence
  // under the results used to hide.
  check('the show-more count is the browsable sample, not the raw total',
    browsableCount(resists) === resists.sample.length && browsableCount(resists) <= resists.total);

  const { order, badges } = overflowOrder(resists);
  check('the overflow holds every sampled brew', order.length === resists.sample.length,
    `${order.length} of ${resists.sample.length}`);
  check('and no brew twice', new Set(order).size === order.length);
  // Page one has to be worth landing on: the ranking winners sort to the front, so the
  // index opens on the same brews screen 3 was showing rather than an arbitrary slice.
  check('with the ranking winners on page one',
    [...badges.keys()].every((winner) => order.indexOf(winner) < 8),
    `${badges.size} badged`);

  const pages = pageCount(order.length);
  check('paged eight at a time', pages === Math.ceil(order.length / 8), `${pages} pages`);
  const first = overflowPageMarkup(catalogue, order, [idOf('Resist Fire')], 0, badges, 'any', false);
  const last = overflowPageMarkup(catalogue, order, [idOf('Resist Fire')], pages - 1, badges, 'any', false);
  check('a page holds at most eight cards',
    (first.match(/sky-brew__open/g) || []).length === Math.min(8, order.length),
    `${(first.match(/sky-brew__open/g) || []).length}`);
  check('and the last page is never empty', (last.match(/sky-brew__open/g) || []).length > 0);
  // The card index is into the WHOLE list, not the page — a click on the last page has to
  // find its own mixture, not the one eight from the top.
  check('cards index into the whole list, not the page',
    last.indexOf(`data-brew-open="${(pages - 1) * 8}"`) !== -1);

  check('one page gets no pager at all', pagerMarkup(0, 1) === '');
  // `sky-pager__dot"` with the closing quote — the wrapper is `sky-pager__dots`, and a
  // bare substring match counts it as a sixth dot.
  check('a few pages get dots', (pagerMarkup(0, 5).match(/class="sky-pager__dot"/g) || []).length === 5);
  // Fifty dots is a texture, not an indicator.
  check('and many pages get a counter instead',
    pagerMarkup(3, 50).indexOf('sky-pager__dot') === -1 && pagerMarkup(3, 50).indexOf('sky-pager__count') !== -1);
  // The list is a ring — past the last page is the first — so neither arrow is ever dead.
  // A disabled control at each end asks the reader to work out which end they are on
  // before pressing anything, which is a job the dots already do.
  check('and neither end is a dead arrow',
    pagerMarkup(0, 5).indexOf('disabled') === -1 &&
    pagerMarkup(4, 5).indexOf('disabled') === -1);

  // ── The add-ons you actually own ──────────────────────────────────────────
  // The DLC toggles used to be a view filter on the mortar: they hid pills and changed
  // nothing else, so the search still built its best brew out of a Dragonborn ingredient a
  // base-game player cannot pick up. They filter the CATALOGUE now, which is the one thing
  // every screen's answer is drawn from.
  check('no exclusions is the same catalogue, not a copy of it',
    catalogueWithout(catalogue, new Set()) === catalogue);

  const noDb = catalogueWithout(catalogue, new Set(['DB']));
  const dbCount = catalogue.ingredients.filter((i) => i.dlc === 'DB').length;
  check('turning an add-on off drops its ingredients',
    dbCount > 0 && noDb.ingredients.length === catalogue.ingredients.length - dbCount,
    `${dbCount} from Dragonborn`);
  check('and drops them from the carrier lists too',
    noDb.carriersOf.every((list) => list.every((i) => i.dlc !== 'DB')) &&
    noDb.carriersOf.some((list, effect) => list.length < catalogue.carriersOf[effect].length));
  // Shared references, not copies — a Mixture found through the filtered catalogue has to
  // compare equal to the same one found through the full catalogue.
  check('the ingredients themselves are the same objects',
    noDb.ingredients[0] === catalogue.ingredients.filter((i) => i.dlc !== 'DB')[0]);
  // The point of all of it: nothing you cannot pick up comes back in an answer.
  const dbFree = search(noDb, [idOf('Fortify Sneak')], 'good');
  check('and no brew is built out of what you turned off',
    dbFree.sample.length > 0 && dbFree.sample.every((m) => m.ingredients.every((i) => i.dlc !== 'DB')),
    `${dbFree.sample.length} brews`);
  // Ashen Grass Pod is Dragonborn's, and it is in every headline brew on the full
  // catalogue for this pair — so this is the case that would have gone unnoticed.
  const withDb = search(catalogue, [idOf('Fortify Sneak')], 'good');
  check('which really does change the answer',
    withDb.total !== dbFree.total, `${withDb.total} -> ${dbFree.total}`);

  // ── The mortar: what a specific handful actually makes ────────────────────
  const bySlug = (slug: string) => catalogue.ingredients.filter((i) => i.slug === slug)[0];
  const garlic = bySlug('garlic');
  const salmon = bySlug('salmon-roe');
  const histcarp = bySlug('histcarp');

  // ── An empty slot is the easiest thing of all to find ─────────────────────
  // Reported: "Fewest ingredients" was usually also the easiest to gather, and lost the
  // label to a longer brew. A plain SUM punishes a mixture for being short — Bleeding
  // Crown + Tundra Cotton (5 + 5) scored 10 against the same pair plus a third 5 at 15,
  // though the pair needs a strict subset of the same walk.
  const crown = bySlug('bleeding-crown');
  const cotton = bySlug('tundra-cotton');
  const flower = bySlug('purple-mountain-flower');
  const two = liveMixture(catalogue, [crown, cotton]);
  const three = liveMixture(catalogue, [crown, cotton, flower]);
  check('an unused slot scores above the commonest ingredient',
    two?.gatherScore === crown.gatherScore + cotton.gatherScore + 6,
    `${two?.gatherScore}`);
  check('so a pair beats the same pair plus a third',
    (two?.gatherScore ?? 0) > (three?.gatherScore ?? 0),
    `${two?.gatherScore} vs ${three?.gatherScore}`);

  // ── A weakened effect is not the one you asked for ────────────────────────
  // Honeycomb takes Fortify Block to x0.5, and a bottle that does exactly what you asked
  // at half strength was winning "Nothing extra" over one that delivers it in full.
  const block = search(catalogue, [idOf('Fortify Block'), idOf('Restore Stamina')], 'any');
  const cleanest = block.winners[0];
  check('nothing equally clean is more potent than the benchmark',
    !!cleanest && block.sample.every((mixture) =>
      mixture.effects.length > cleanest.effects.length || mixture.potency <= cleanest.potency),
    `potency ${cleanest?.potency}`);

  // ── The table says WHICH ingredient carries the multiplier ────────────────
  // The bottle prints the deviation furthest from 1 among the ingredients carrying the
  // effect, so a x0.5 on the label named no culprit.
  const nerfed = liveMixture(catalogue, [bySlug('honeycomb'), bySlug('pearl')]);
  const detail = nerfed ? brewDetailMarkup(catalogue, nerfed) : '';
  check('the mixture really is nerfed to x0.5',
    nerfed?.multipliers[idOf('Fortify Block')] === 0.5);
  check('and the table prints that x0.5 on the ingredient applying it',
    (detail.match(/&times;0\.5/g) || []).length === 1);
  check('marking the cell the bottle took its number from',
    (detail.match(/is-applied/g) || []).length === 1);


  check('one ingredient makes nothing', liveMixture(catalogue, [garlic]) === null);
  // Show, do not tell: the tile goes up, the chip row stays empty. No prose either way.
  check('but its tile still goes in the mortar', mortarMarkup(catalogue, [garlic]).indexOf('sky-tile') !== -1);
  check('and the bottle stays empty rather than explaining itself',
    liveMarkup(catalogue, [garlic]) === '');
  check('an empty mortar renders nothing at all', mortarMarkup(catalogue, []) === '');
  // The tray's verdict disc is the way in to the ingredient table for a mixture you built
  // by hand — the only one the search never found and nothing else here can open. The
  // result cards' disc stays inert: the whole card is already the button, and a control
  // inside it would be a button nested in a button.
  check("the tray's verdict disc is a way in, not only a readout",
    mortarMarkup(catalogue, [salmon, histcarp], liveMixture(catalogue, [salmon, histcarp]))
      .indexOf('data-verdict-open') !== -1);
  check("but a result card's disc stays inert", markup.indexOf('data-verdict-open') === -1);

  // Salmon Roe + Histcarp share Fortify Magicka and Waterbreathing — and Salmon Roe
  // carries the x12.5, which is the whole reason the multiplier column exists.
  const pair = liveMixture(catalogue, [salmon, histcarp]);
  check('two that share an effect make a potion', !!pair, `${pair?.effects.length} effects`);
  check('and the mortar applies Salmon Roe\'s x12.5',
    pair?.multipliers[idOf('Fortify Magicka')] === 12.5,
    String(pair?.multipliers[idOf('Fortify Magicka')]));

  // Two strangers make nothing, and the module has to say why rather than go blank.
  const strangers = catalogue.ingredients.filter((a) =>
    catalogue.ingredients.some((b) => a !== b && !(a.mask.low & b.mask.low) && !(a.mask.high & b.mask.high)));
  if (strangers.length >= 2) {
    const a = strangers[0];
    const b = catalogue.ingredients.filter((c) =>
      c !== a && !(a.mask.low & c.mask.low) && !(a.mask.high & c.mask.high))[0];
    check('two that share nothing make nothing', liveMixture(catalogue, [a, b]) === null);
    // data-drop, not sky-tile: a tile carries `sky-tile sky-tile--drop`, so counting the
    // bare class name found two per tile and made this read four.
    check('and both tiles are still shown', (mortarMarkup(catalogue, [a, b]).match(/data-drop=/g) || []).length === 2);
    check('and such an ingredient greys out once the first is picked', !sharesEffectWith(b, [a]));
  }
  check('anything is allowed while the mortar is empty', sharesEffectWith(garlic, []));

  // The deep rule, on the pair that motivated it. Hanging Moss and Juniper Berries share
  // nothing; Canis Root shares Fortify One-Handed with the first and Fortify Marksman with
  // the second, so all three make a bottle and the quick rule cannot see it.
  const moss = bySlug('hanging-moss');
  const juniper = bySlug('juniper-berries');
  const canis = bySlug('canis-root');
  check('Hanging Moss and Juniper Berries share nothing', !sharesEffectWith(juniper, [moss]));
  check('but Canis Root bridges them',
    sharesEffectWith(canis, [moss]) && sharesEffectWith(canis, [juniper]));
  check('so the deep rule offers Juniper Berries anyway',
    couldJoin(juniper, [moss], bridgeMaskOf(catalogue, [moss])));
  check('and the three of them really do make something',
    liveMixture(catalogue, [moss, juniper, canis]) !== null);
  // With two picked there is no slot left to bridge with, so both rules must agree.
  check('with two in the mortar the deep rule is the quick one',
    bridgeMaskOf(catalogue, [moss, canis]) === null);
  check('and an empty mortar has nothing to bridge to',
    bridgeMaskOf(catalogue, []) === null);
  // A bridge has to reach BOTH sides. Something sharing nothing with the anchor's
  // neighbourhood at all stays struck through even in deep mode.
  const strangerToMoss = catalogue.ingredients.filter((ingredient) =>
    ingredient !== moss && !couldJoin(ingredient, [moss], bridgeMaskOf(catalogue, [moss])));
  check('deep mode still refuses what nothing can reach',
    strangerToMoss.every((ingredient) => !sharesEffectWith(ingredient, [moss])),
    `${strangerToMoss.length} still unreachable`);
  check('and a sharer stays enabled', sharesEffectWith(histcarp, [salmon]));

  // A tile draws its art when the file is there and falls back to the "?" disc until it
  // lands. WHICH branch a given ingredient takes depends on what is sitting in
  // assets/skyrim/ingredients today, so pin both against a catalogue with the images map
  // swapped rather than against whatever art happens to exist — asserting "salmon roe has
  // no art" was true right up until the art arrived, and then this went red for no reason.
  const bare = { ...catalogue, images: {} };
  const dressed = { ...catalogue, images: { [salmon.slug]: '/skyrim/ingredients/salmon-roe.png' } };
  check('a tile without art uses the placeholder',
    mortarMarkup(bare, [salmon]).indexOf('sky-ph__disc') !== -1);
  check('and draws the image once the file is there',
    mortarMarkup(dressed, [salmon]).indexOf('src="/skyrim/ingredients/salmon-roe.png"') !== -1);
  // The DLC badge is on the tile either way — it is what tints the name to match the pill.
  const salmonTile = mortarMarkup(catalogue, [salmon]);
  check('and tags its DLC for the colour coding', salmonTile.indexOf('data-dlc="HF"') !== -1);
  check('a base-game ingredient carries no DLC tag',
    mortarMarkup(catalogue, [garlic]).indexOf('data-dlc') === -1);

  // In the mortar the tile is how you take something back out, so it has to be a real
  // button with a real label — not a div with a click handler bolted on.
  const garlicTile = mortarMarkup(catalogue, [garlic]);
  check('a mortar tile is a button that drops its ingredient',
    garlicTile.indexOf('<button') !== -1 && garlicTile.indexOf('data-drop="garlic"') !== -1);
  check('and says so to a screen reader', garlicTile.indexOf('aria-label="Take Garlic out') !== -1);

  // ── Potion or poison ─────────────────────────────────────────────────────
  //
  // The costliest effect in the bottle decides, and it does not care how many effects are
  // on each side. Every case below is the classifier's whole job in one line.
  const verdict = (slugs: string[]): string => {
    const mixture = liveMixture(catalogue, slugs.map(bySlug));
    if (!mixture) return 'nothing';
    if (mixture.undecided) return 'either';
    return mixture.poison ? 'poison' : 'potion';
  };
  const boss = (slugs: string[]): string => {
    const mixture = liveMixture(catalogue, slugs.map(bySlug));
    return mixture ? catalogue.effectNames[mixture.dominant] : '';
  };

  check('all-good comes out a potion', verdict(['blue-mountain-flower', 'wheat']) === 'potion');
  check('and Fortify Health is what makes it one',
    boss(['blue-mountain-flower', 'wheat']) === 'Fortify Health');
  check('all-bad comes out a poison', verdict(['deathbell', 'nightshade']) === 'poison');
  // The two that matter: a mixture with effects on BOTH sides is decided by cost alone.
  check('a poison effect can outweigh a good one',
    verdict(['aloe-vera-leaves', 'butterfly-wing']) === 'poison');
  check('and Damage Magicka is why, not Restore Health',
    boss(['aloe-vera-leaves', 'butterfly-wing']) === 'Damage Magicka');
  check('a good effect can outweigh a poison one',
    verdict(['abecean-longfin', 'small-antlers']) === 'potion');
  check('and it is Fortify Restoration doing it',
    boss(['abecean-longfin', 'small-antlers']) === 'Fortify Restoration');
  // The single exact tie in the whole table, reachable 65 ways. Reported, not guessed.
  check('the Resist Magic / Weakness to Poison tie is reported as undecided',
    verdict(['abecean-longfin', 'bleeding-crown', 'chickens-egg']) === 'either');
  check('a mixture that makes nothing has no verdict', verdict(['garlic']) === 'nothing');

  const bottle = liveMarkup(catalogue, [bySlug('deathbell'), bySlug('nightshade')]);
  check('the live bottle speaks the verdict', bottle.indexOf('<p class="sky-sr">Poison</p>') !== -1);
  check('and marks the chip that decided it', bottle.indexOf('is-dominant') !== -1);
  // The verdict moved off a 36px word under the tiles and onto the tray itself, which is
  // markup nothing else asserts — exactly the kind of block that vanished once before.
  // Not `pair` — that name is already a Mixture forty lines up, and tsc caught the shadow.
  const nasty = [bySlug('deathbell'), bySlug('nightshade')];
  const tray = mortarMarkup(catalogue, nasty, liveMixture(catalogue, nasty));
  check('the tray is outlined with the verdict', tray.indexOf('<div class="sky-ings" data-tone="bad"') !== -1);
  check('and carries the verdict disc', tray.indexOf('sky-verdict') !== -1);
  // The word used to ride in a `.sky-sr` span inside the disc. The tray's disc is a button
  // now, and `aria-label` replaces its content outright, so the span would be an
  // unreachable second copy — the word moved into the label rather than out of the page.
  check('which says the word for a screen reader',
    tray.indexOf('aria-label="Poison &mdash; see what each ingredient carries"') !== -1 ||
    tray.indexOf('aria-label="Poison — see what each ingredient carries"') !== -1);
  check('a tray with nothing decided yet takes no colour',
    mortarMarkup(catalogue, [bySlug('garlic')], null).indexOf('data-tone') === -1);

  // Hue and glyph are two channels, and the pair that proves it is a bottle that is a
  // POTION and still carries something harmful — green would be a lie, a flask alone
  // would be a half-truth.
  const both = liveMixture(catalogue, [bySlug('abecean-longfin'), bySlug('small-antlers')]);
  check('a potion carrying a harmful effect is mixed', both?.mixed === true);
  check('and is still a potion', both?.poison === false);
  const mixedTray = mortarMarkup(catalogue, [bySlug('abecean-longfin'), bySlug('small-antlers')], both);
  check('so its tray reads mixed while its disc says potion',
    mixedTray.indexOf('data-tone="mixed"') !== -1 &&
    mixedTray.indexOf('aria-label="Potion') !== -1);
  // Derived from the catalogue rather than pinned to two named ingredients: the first
  // version of this asserted that Blue Mountain Flower + Blue Butterfly Wing was clean,
  // and it is not — Blue Mountain Flower carries Damage Magicka Regen. A fixture that has
  // to be right about the game is a fixture that will be wrong.
  const sample = search(catalogue, [idOf('Restore Health')]).sample.slice(0, 60);
  check('mixed means exactly some-harmful-and-some-benign, across 60 bottles',
    sample.length > 0 && sample.every((m) => {
      const harmful = m.effects.filter((e) => catalogue.harmful[e]).length;
      return m.mixed === (harmful > 0 && harmful < m.effects.length);
    }), `${sample.length} sampled`);
  check('and both sides of that actually occur in the sample',
    sample.some((m) => m.mixed) && sample.some((m) => !m.mixed));
}

/** Screen 6 — one effect, everything carrying it, and what else each brings. */
function checkEffectIndex(catalogue: Catalogue): void {
  const busiest = catalogue.carriersOf.reduce(
    (best, list, index) => (list.length > catalogue.carriersOf[best].length ? index : best), 0);
  const carriers = catalogue.carriersOf[busiest];
  const html = effectDetailMarkup(catalogue, busiest);
  check('the effect index lists every carrier',
    (html.match(/class="sky-brew"/g) || []).length === carriers.length,
    `${catalogue.effectNames[busiest]}: ${carriers.length}`);
  check('and shows all four effects of each one',
    (html.match(/<li class="sky-chip/g) || []).length === carriers.length * 4);
  check('and marks the effect that was asked for, once per carrier',
    (html.match(/sky-chip--tag/g) || []).length === carriers.length);

  // A Creation Club ingredient that inflates one of its own effects has to print the
  // multiplier — that number is the reason this screen is worth having over a flat list.
  let deviating = -1;
  for (let effect = 0; effect < catalogue.effectNames.length && deviating === -1; effect++) {
    const table = catalogue.deviations[effect];
    for (const slug of Object.keys(table || {})) {
      const row = table[slug];
      const applied = catalogue.baseMagnitudes[effect] === 0 ? row[1] : row[0];
      // Only counts if that ingredient actually carries the effect it deviates on.
      const carried = catalogue.carriersOf[effect].some((i) => i.slug === slug);
      if (applied !== 1 && carried) { deviating = effect; break; }
    }
  }
  check('some effect has a carrier that deviates on it', deviating !== -1);
  if (deviating !== -1) {
    check('and the index prints that multiplier',
      effectDetailMarkup(catalogue, deviating).indexOf('&times;') !== -1,
      catalogue.effectNames[deviating]);
  }
}

/**
 * John Skyrim — structure, and the one piece of arithmetic it does.
 *
 * The maths is the levelling model behind the perk slider, and it is worth pinning
 * because it replaced an assertion. This module used to open by announcing "42 perks",
 * which is what the build COSTS stated as though it were what you can AFFORD. The two
 * anchors below are UESP's own worked examples, so if the constants drift the page stops
 * agreeing with the game rather than quietly reporting a different level.
 */
function checkJohn(root: HTMLElement): void {
  const screens = screenNames(root);
  // Hub, Nord, the perk budget, seven skills, potions, gear, stones.
  check('the module renders its thirteen screens', screens.length === 13, `${screens.length}`);

  // A screen renamed in the shortcode without its links renamed with it is a dead button,
  // and a dead button is exactly what a screenshot cannot see.
  const dangling = linkTargets(root).filter((to) => screens.indexOf(to) === -1);
  check('every link points at a screen that exists', dangling.length === 0, dangling.join(', '));

  // ── the levelling model ───────────────────────────────────────────────────
  // UESP: "100 XP is needed to advance from level 1 to level 2" and "1,300 XP to advance
  // from level 49 to level 50". The second is the increment, not the total.
  check('reaching level 2 costs UESP\'s 100 XP', xpToReach(2, 75, 25) === 100, `${xpToReach(2, 75, 25)}`);
  check('and level 49 to 50 costs its 1,300',
    xpToReach(50, 75, 25) - xpToReach(49, 75, 25) === 1300,
    `${xpToReach(50, 75, 25) - xpToReach(49, 75, 25)}`);
  // Raising a skill grants the level you arrive at, so 21..100 off a Nord's +5 skill is
  // the sum of those integers. Closed form against the loop it replaces.
  let longhand = 0;
  for (let s = 21; s <= 100; s++) longhand += s;
  check('skill XP matches summing it the slow way', skillXp(20, 100) === longhand, `${skillXp(20, 100)}`);
  check('and a skill already at its level banks nothing', skillXp(100, 100) === 0);

  const payload = root.querySelector('[data-levelling]');
  if (payload) {
    const model = JSON.parse(payload.textContent || '{}') as Levelling;
    check('the payload carries all seven trees', model.skills.length === 7, `${model.skills.length}`);
    const capped = standingAt(model, 100);
    // The build is affordable, which is the answer the slider exists to establish rather
    // than assume. Pinned as a range: the exact level moves if the incidental list does.
    check('seven skills at 100 puts the character past level 50',
      capped.characterLevel >= 50, `level ${capped.characterLevel}`);
    check('and earns more perks than the build spends',
      capped.perksEarned >= capped.perksOwed,
      `${capped.perksEarned} earned vs ${capped.perksOwed} owed`);
    // Gated by skill level, so the cost is not owed before it can be paid.
    const early = standingAt(model, 30);
    check('a level-30 character is not yet owed the capstones',
      early.perksOwed < capped.perksOwed, `${early.perksOwed} vs ${capped.perksOwed}`);
    check('and the model is monotonic in skill level',
      standingAt(model, 60).characterLevel > early.characterLevel);

    // The drawing has to agree with the model: lit pips are points, and at 100 every
    // point the build spends is unlocked.
    const drawn = Array.from(root.querySelectorAll<HTMLElement>('.sky-tree')).reduce((sum, tree) =>
      sum + Array.from(tree.querySelectorAll('.sky-tree__node.is-on')).reduce(
        (points, node) => points + Math.max(1, node.querySelectorAll('.sky-tree__pip').length), 0), 0);
    check('the lit perks cost what the model says the build owes',
      drawn === capped.perksOwed, `${drawn} drawn vs ${capped.perksOwed} owed`);
  }

  check('there is a tree per skill', root.querySelectorAll('.sky-tree').length === 7);
  const wires = root.querySelectorAll('.sky-tree__wire').length;
  check('the trees draw their prerequisite edges', wires >= 45, `${wires}`);
  check('and some of them are on the taken route',
    root.querySelectorAll('.sky-tree__wire.is-on').length > 0);

  // ── the screens that are only structure ───────────────────────────────────
  check('Nord shows both escapes', root.querySelectorAll('.sky-face').length === 2);
  check('and exactly one is chosen', root.querySelectorAll('.sky-face.is-chosen').length === 1);

  // Swaps are positional: the row must have one socket per ingredient above it, or the
  // alignment that makes a swap mean "for THIS slot" carries nothing.
  let aligned = true;
  for (const swaps of Array.from(root.querySelectorAll<HTMLElement>('.sky-ings--swap'))) {
    const card = swaps.closest('.sky-card');
    const above = card?.querySelector('.sky-ings:not(.sky-ings--swap)');
    if (above && above.children.length !== swaps.children.length) aligned = false;
  }
  check('every swap row lines up with its ingredients', aligned);
  check('and at least one socket is deliberately empty',
    root.querySelectorAll('.sky-tile--empty').length > 0);

  // The doll: eight slots, three modes, and only one mode visible at a time.
  check('the gear doll has eight slots',
    root.querySelectorAll('.sky-doll__slot').length === 8,
    `${root.querySelectorAll('.sky-doll__slot').length}`);
  const visible = Array.from(root.querySelectorAll<HTMLElement>('.sky-doll__ench'))
    .filter((list) => !list.hidden).length;
  check('and shows exactly one plan at a time', visible === 8, `${visible} lists visible`);
  check('an unenchanted slot draws an open socket',
    root.querySelectorAll('.sky-doll__ench .is-empty').length > 0);

  // The stacked meter must not overflow its own track. --w by name, not "every digit in
  // the style attribute" — the segments also carry --a, and stripping non-digits glued
  // the two together into 753%.
  const width = Array.from(root.querySelectorAll<HTMLElement>('.sky-stack__seg')).reduce((sum, seg) => {
    const match = /--w:\s*([\d.]+)%/.exec(seg.getAttribute('style') || '');
    return sum + (match ? parseFloat(match[1]) : 0);
  }, 0);
  check('the resist stack fits inside 100%', width > 0 && width <= 100, `${width}%`);
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
  checkEffectIndex(catalogue);
  // Skipped rather than failed when the module is absent: this page mounts it hidden, but
  // the check should not turn red on a page that simply does not use the shortcode.
  const john = document.querySelector<HTMLElement>('[data-john]');
  if (john) checkJohn(john);

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
