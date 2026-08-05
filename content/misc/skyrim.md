---
# ── Page front matter ────────────────────────────────────────────────────────
# icon / blurb   : what the card on /misc/ shows.
# container wide : full-width column, so the recipe grid gets three across.
# prose true     : Tailwind Typography for the writing. Every widget root
#                  carries `not-prose` so it keeps its hands off them.
# sections       : drives BOTH the desktop jump-to-section FAB
#                  (partials/section-nav.html) and the mobile navbar list
#                  (partials/topnav.html). Each id must match a heading id
#                  below — the `{#combat}` suffixes pin them.
# desktopFab     : suppress the centered navbar toolbar; the FAB covers desktop.
# ─────────────────────────────────────────────────────────────────────────────
title: "Skyrim"
description: "The Skyrim reference I actually use — the potion recipes I keep coming back to, with the exact ingredients, what each brew really does, and the notes on where to farm them. Anniversary Edition, Creation Club content on, no mods."
lead: "The recipes I keep coming back to, and the notes that go with them."
blurb: "My working Skyrim reference — go-to potion recipes, their real effects, and where to farm the ingredients."
icon: "wrench-screwdriver"
container: "wide"
prose: true
updated: 2026-07-29
desktopFab: true
toolsIcon: "book-open"
sections:
  - { id: "potions", label: "Potions",    icon: "sparkles" }
  - { id: "builder", label: "Builder",    icon: "puzzle-piece" }
  - { id: "resto",   label: "Resto loop", icon: "fire" }
  - { id: "ceiling", label: "Enchant max", icon: "arrow-trending-up" }
---

Anniversary Edition, Creation Club on, no mods. Rare Curios ingredients are
marked `CC`. Effects on each card are computed from its ingredients rather than
typed in, so they cannot drift.

## Potions {#potions}

{{< potion-filter >}}

{{< potions >}}

## Builder {#builder}

{{< potion-builder >}}

<details class="sky-more">
<summary>Why some of those come out as poisons</summary>

Not the number of good effects against bad ones, and not which pills you picked on the
first screen. **The single costliest effect in the bottle is in charge** — it names the
result, and if it is a harmful one the mortar hands you a poison no matter what else is in
there. Each card says which it is, and outlines the effect responsible.

```text
cost = floor( baseCost × max(magnitude^1.1, 1) × (duration/10)^1.1 )
```

The duration term drops out for an instantaneous effect. Aloe Vera Leaves and Butterfly
Wing share Restore Health and Damage Magicka; Damage Magicka costs 7.37 against 2.94, so
that is a **poison** with a Restore Health passenger. It runs the other way too — Abecean
Longfin with Small Antlers carries Weakness to Poison and is still a potion, because
Fortify Restoration is worth more than twice as much.

**Your alchemy is deliberately not in that formula**, and that is exact rather than a
shortcut. Skill, gear and Fortify Alchemy multiply an effect's magnitude — or its
duration, for the five effects that have no magnitude — and either route puts the same
`M^1.1` in front of every effect's cost. A common factor cannot change which one is
largest, so a level 15 alchemist and a looped one get the same verdict. Perks are out for
a better reason: the game leaves them out too, which is what stops Benefactor from
silently converting a poison into a potion.

Two pairs collide, and only one of them matters. Resist Magic costs *exactly* the same as
Weakness to Poison **and** as Weakness to Magic, all three at 7.1774. No ingredient carries
Resist Magic and Weakness to Magic together, so that pair needs a fourth slot and never
comes up; the other turns up as the costliest pair in 65 of the 635,068 three-ingredient
mixtures that make anything. Nothing documents what the game does with a tie, so those read
**Potion or poison** rather than a guess.

</details>

## Resto loop {#resto}

{{< resto-loop target="235" effect="Fortify Alchemy" >}}

<details class="sky-more">
<summary>The formulae, and why the gear count is the throttle</summary>

**Alchemy** — the magnitude of a potion you brew:

```text
mag = BaseMag × 4 × (1 + Skill/200) × (1 + Gear/100)
              × (1 + Alchemist/100) × (1 + Benefactor/100) × (1 + Seeker/100)
```

`Gear` is the *summed* Fortify Alchemy across everything you are wearing.
Fortify Restoration has BaseMag 4 and Fortify Enchanting has BaseMag 1, which is
why the restoration potion is always exactly four times the enchanting one.

**Enchanting** — the magnitude you can place, given a Fortify Enchanting potion:

```text
mag = floor( BaseMag × skillMult × (1 + Enchanter) × (1 + categoryPerk) × (1 + Sorcery) )

skillMult = 1 + x(x − 0.14)/3.4      where  x = Skill × (1 + potion/100) / 100
```

The load-bearing detail: **the potion does not multiply the finished
enchantment.** It scales your effective skill *inside* a quadratic, so the
enchantment comes out quadratic in potion strength. `BaseMag` runs 8 / 10 / 13 / 15 / 20 / 25
across the picker's ten groups — 8 for Fortify Destruction, 13 for Fortify One-Handed, 15
for the elemental resists, 20 for the attributes, 25 for Resist Disease — and the groups
are split by base *and* by which +25% perk applies, because three of them (Resist Magic,
Carry Weight, Fortify Magicka Regen) take no perk at all.

**The loop.** A Fortify Restoration potion boosts every `Fortify <Skill>` enchantment
you are **wearing** while it runs, because those enchantments are internally
school-of-Restoration. Not the ones in your pack, and it does not matter which pieces or
in what order you put them on — if it is on your body it reads `base × (1 + the live
boost)`. There is no per-piece history to keep track of.

And because you never wait for the potion to expire, one is always live, which is what
makes it compound: the potion you drink is scaled by the one already running.

```text
brewed = round( 0.6 × (1 + wear × 25% × (1 + x)) )   the potion's OWN magnitude
takes  = brewed > the last potion's own magnitude
piece  = 25% × (1 + x)
x      = brewed × (1 + x)                            only if it takes
```

That `round` is the game rounding the potion to a whole percent as you brew it, and it is
worth more than it looks — leaving it out drifts half a percent high over four rounds and
one and a half over six, which is the difference between a plan reading 600% and one
reading 587%.

So a round offers exactly **one** choice: how many pieces you have on while you brew.
Fewer pieces, weaker potion, smaller step. That is the only brake there is, and with
growth this violent it is the only reason landing on an exact number is possible at all.

**Whether a round takes at all is bottle against bottle.** Two potions of the same effect
do not stack, and the new one only supersedes the old if *its own magnitude* beats the old
one's — not the boost you are walking around with. Which means brewing with **nothing on**
always makes the same bare 60% potion, so it can only ever be the opening move; a second
naked round does nothing whatsoever.

Two wrong versions of this died on a 600% target, both caught in play. The first treated a
weak brew as a way to step *backwards*: the plan dropped the boost from 277% to 226%
mid-run, that round did nothing in game, the rest compounded off the higher number and it
landed near **1,313%**. The second tested the new potion against the live boost instead of
against the last bottle, which let a plan open with two naked rounds — the second did
nothing, everything after ran a step behind, and the same target came out at **204%** off a
467% potion. Both runs are now pinned as assertions.

Measured in game — four 25% pieces, plain ingredients, all four worn every round:

```text
observed        modelled
  100% gear →     120%        120.0%
  220% gear →     422%        422.4%
  522% gear →   1,948%      1,948.6%
2,049% gear →  26,405%     26,405.8%
cash out   →    3,991%      3,990.9% Fortify Enchanting
               9,831%       9,831%   placed
```

The 9,831% is the strongest check here — it exercises the enchanting quadratic four orders
of magnitude past any published example and lands on the nose.

The enchanting step is the soft one. A second run cashed out at a measured **887%** potion
against a modelled 887.4, and placed **587%** against a modelled 585.3. UESP flags the
`0.14` and `3.4` as an empirical fit and that is about its size: a few tenths of a percent,
which becomes a couple of points once you are up at 600.

**A five-round plan has been run.** Brewing in 0, 2, 2, 2, 2 pieces, then cashing out in
three for a 511.9% Fortify Enchanting potion, it placed **235% Fortify Alchemy** on a pair
of gloves. That exact sequence is pinned in the module's self-check as a replay, so if the
maths ever drifts the plan stops matching and something goes red. The planner above now
proposes a shorter four-round route to the same number — both are right, but only the
five-round one has an in-game outcome behind it.

**One thing this deliberately does not cover: waiting.** Let the potion lapse between
rounds and the boost stops compounding. The potions still climb, just geometrically rather
than explosively — 120% → 192% → 235% → 261% → 277% → 286% → … converging on **300%**, off
gear that settles at 4 × 100%. Mind which number is which: what converges on a hard
**36.6%** is the *enchantment* you can place off that settled set, not the potion series.
Waiting also brings back per-piece history, because a value written while a potion was up
*sticks* after it expires. That is a different, slower routine.

That 235% in the waiting sequence is a *potion*, and it is the number this module spent
several wrong models chasing as though it were an enchantment; the same run places about
33%. The enchanting formula feeds the potion into a quadratic on effective skill, so a
potion percentage and an enchantment percentage are never close.

**The soul gem is the finest control there is.** On apparel the gem scales the magnitude
directly — the engine's term is `soulCharges / 3000`, so a common soul places exactly a
third of a grand one, and a petty soul a twelfth. (On weapons it buys charges instead,
which is where the "always use grand" habit comes from.) Since the set of reachable
numbers is discrete and lumpy, five gems give five overlapping copies of it, and that
turns targets with *no* landing into comfortable ones:

```text
target   grand soul only        best gem
  200%   no landing             200.70   0.30 inside   Greater
  300%   no landing             300.55   0.45 inside   Greater
  400%   400.82, 0.18 inside    400.40   0.40 inside   Petty
  600%   no landing             600.42   0.42 inside   Petty
 1000%   no landing            1000.48   0.48 inside   Common
 1500%   no landing            1500.52   0.48 inside   Lesser
```

The planner picks the gem for you by default and names it in the last step. It applies to
the final enchantment only — the Fortify Alchemy gear you wear is whatever you made it.

**Two ways this is wrong for you.** If you run the Unofficial Patch none of it
works: USSEP takes the Fortify effects out of the Restoration school and
separately turns the enchanting potion into a flat multiplier. And the `0.14` and
`3.4` above are UESP's empirical fit rather than extracted engine values — moving
`3.4` to `3.3` shifts a 121% result to 124% — so treat the last digit of any
enchantment as soft. Everything upstream of the enchanting step is exact.

</details>

## Enchant max {#ceiling}

Every trick that makes an enchantment come out stronger, and — the part worth having —
what each one is actually worth once the others are already on. Tick what you have.

{{< enchant-max effect="Fortify Alchemy" >}}

**The fair loop is most of it.** No glitch: brew the best Fortify Enchanting potion you
can, place better Fortify Alchemy gear with it, and that gear brews a better potion. It
converges, which is exactly what makes it fair — plain, on 29% pieces and a 32.4% potion,
which are UESP's own figures. The Anniversary ingredients move it a long way:

```text
plain                       29% a piece    32.4% potion   places 29.2%
+ Dreugh Wax (×2 base)      35%            72.0%          places 36.0%
+ Necromage                 39%            48.0%          places 39.6%
Dreugh + Necromage          60%           127.5%          places 60.7%
+ Seeker of Sorcery         74%           148.5%          places 74.6%
everything, Ahzidal too     97%           183.0%          places 98.0%
on FIVE slots               runaway — no fixed point, no glitch involved
```

**Both Seeker boons compound, and Sorcery wins.** Shadows is inside the loop so it brews
a better potion; Sorcery boosts every enchantment you place, *including the Fortify
Alchemy gear the loop is building*, so it compounds too — and by more, 74.6% against
70.8%. You can only hold one, and the module enforces that. I had this backwards until
the self-check caught it.

The ordering in the breakdown is the point. A flat +10% is a flat +10%, but the Fortify
Enchanting potion scales your *skill* inside a quadratic, so it is worth a couple of
points on a bare character and hundreds on a looped one. Anything that adds skill
*points* rather than a percentage lands in that same privileged spot, which is why it
matters whether Ahzidal's Genius is +10% or +10 skill — and nobody seems to know.
