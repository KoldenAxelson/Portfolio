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
#
# description / blurb / the first body line all used to open with "Anniversary
# Edition, Creation Club on, no mods". Only one of them is ever read by a person
# who is on the page, so that is the one that still says it.
# ─────────────────────────────────────────────────────────────────────────────
title: "Skyrim"
description: "Potion recipes, a mixture builder, and planners for the Restoration loop and the enchanting ceiling. Anniversary Edition, Creation Club on, no mods."
lead: "The recipes I keep coming back to, and the notes that go with them."
blurb: "My working Skyrim reference — go-to potion recipes, their real effects, and where to farm the ingredients."
icon: "wrench-screwdriver"
container: "wide"
prose: true
updated: 2026-08-06
desktopFab: true
toolsIcon: "book-open"
# Three sections, not four: the recipe cards are the builder's Favorites screen now, so
# there is no longer a Potions section for the FAB to jump to. `arrow-trending-up` is not
# in data/icons.yaml and never was — svg-icon.html renders nothing for an unknown name, so
# Enchant max has been showing a gap in this list.
sections:
  - { id: "alchemy", label: "Alchemy",    icon: "sparkles" }
  - { id: "resto",   label: "Resto loop", icon: "fire" }
  - { id: "ceiling", label: "Enchant max", icon: "puzzle-piece" }
---

## Alchemy {#alchemy}

{{< potion-builder >}}

<details class="sky-more">
<summary>Why some of those come out as poisons</summary>

**The costliest effect in the bottle is in charge.** It names the result, and if it is a
harmful one the mortar hands you a poison no matter what else is in there. Each card
outlines the effect responsible.

{{< formula "gold-cost" >}}

Aloe Vera Leaves and Butterfly Wing share Restore Health and Damage Magicka; Damage
Magicka costs 7.37 against 2.94, so that is a **poison** with a Restore Health passenger.
It runs the other way too — Abecean Longfin with Small Antlers carries Weakness to Poison
and is still a potion, because Fortify Restoration is worth more than twice as much.

**Your alchemy is deliberately not in that formula**, and that is exact rather than a
shortcut. Skill, gear and Fortify Alchemy all put the same `M^1.1` in front of every
effect's cost, and a common factor cannot change which one is largest. Perks are out for a
better reason: the game leaves them out too, which is what stops Benefactor from silently
converting a poison into a potion.

Resist Magic, Weakness to Poison and Weakness to Magic all cost *exactly* 7.1774. Nothing
documents what the game does with a tie, so the 65 mixtures where one decides the bottle
read **Potion or poison** rather than a guess.

</details>

## Resto loop {#resto}

{{< resto-loop target="235" effect="Fortify Alchemy" >}}

<details class="sky-more">
<summary>The formulae, and why the gear count is the throttle</summary>

{{< formula "alchemy-magnitude" >}}

{{< formula "enchanting-magnitude" >}}

**The loop.** A Fortify Restoration potion boosts every `Fortify <Skill>` enchantment you
are **wearing** while it runs, because those enchantments are internally
school-of-Restoration. Not the ones in your pack, and it does not matter which pieces or in
what order you put them on — if it is on your body it reads `base × (1 + the live boost)`.
And because you never wait for the potion to expire, one is always live, which is what
makes it compound: the potion you drink is scaled by the one already running.

{{< formula "resto-round" >}}

So a round offers exactly **one** choice: how many pieces you have on while you brew. With
growth this violent, that brake is the only reason landing on an exact number is possible
at all.

**Whether a round takes at all is bottle against bottle.** Two potions of the same effect
do not stack, and the new one only supersedes the old if *its own magnitude* beats the old
one's — not the boost you are walking around with. Which means brewing with **nothing on**
always makes the same bare 60% potion, so it can only ever be the opening move.

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

The enchanting step is the soft one. A second run cashed out at a measured **887%** potion
against a modelled 887.4, and placed **587%** against a modelled 585.3.

**The soul gem is the finest control there is.** On apparel the gem scales the magnitude
directly — the engine's term is `soulCharges / 3000`, so a common soul places exactly a
third of a grand one. Since the set of reachable numbers is discrete and lumpy, five gems
give five overlapping copies of it, and that turns targets with *no* landing into
comfortable ones:

```text
target   grand soul only        best gem
  200%   no landing             200.70   0.30 inside   Greater
  300%   no landing             300.55   0.45 inside   Greater
  400%   400.82, 0.18 inside    400.40   0.40 inside   Petty
  600%   no landing             600.42   0.42 inside   Petty
 1000%   no landing            1000.48   0.48 inside   Common
 1500%   no landing            1500.52   0.48 inside   Lesser
```

It applies to the final enchantment only — the Fortify Alchemy gear you wear is whatever
you made it.

**One thing this deliberately does not cover: waiting.** Let the potion lapse between
rounds and the boost stops compounding. The potions still climb, just geometrically rather
than explosively — 120% → 192% → 235% → 261% → 277% → 286% → … converging on **300%**, off
gear that settles at 4 × 100%. Mind which number is which: what converges on a hard
**36.6%** is the *enchantment* you can place off that settled set, not the potion series.
Waiting also brings back per-piece history, because a value written while a potion was up
*sticks* after it expires. That is a different, slower routine.

**Two ways this is wrong for you.** If you run the Unofficial Patch none of it works:
USSEP takes the Fortify effects out of the Restoration school and separately turns the
enchanting potion into a flat multiplier. And the last digit of any enchantment is soft,
for the reason in that formula's legend. Everything upstream of the enchanting step is
exact.

</details>

## Enchant max {#ceiling}

{{< enchant-max effect="Fortify Alchemy" >}}

<details class="sky-more">
<summary>Why the order in that breakdown is the whole point</summary>

A flat +10% is a flat +10%. But the Fortify Enchanting potion scales your *skill* inside a
quadratic, so it is worth a couple of points on a bare character and hundreds on a looped
one. Anything that adds skill *points* rather than a percentage lands in that same
privileged spot, which is why it matters whether Ahzidal's Genius is +10% or +10 skill —
and nobody seems to know.

**The fair loop is most of it, and it is no glitch:** brew the best Fortify Enchanting
potion you can, place better Fortify Alchemy gear with it, and that gear brews a better
potion. It converges, which is exactly what makes it fair. On five slots it does not — each
pass makes better gear than the last, forever, still with no Restoration glitch involved.

**Both Seeker boons compound, and Sorcery wins.** Shadows is inside the loop, so it brews a
better potion; Sorcery boosts every enchantment you place, *including the Fortify Alchemy
gear the loop is building*, so it compounds too — and by more. You can only hold one, and
the module enforces that.

</details>
