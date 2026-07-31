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
enchantment comes out quadratic in potion strength. `BaseMag` is 8 for Fortify
Destruction, 13 for Fortify One-Handed, 15 for the elemental resists, 20 for the
attributes — which is what the picker's groups are.

**The loop.** A Fortify Restoration potion boosts every `Fortify <Skill>` enchantment
you are **wearing** while it runs, because those enchantments are internally
school-of-Restoration. Not the ones in your pack, and it does not matter which pieces or
in what order you put them on — if it is on your body it reads `base × (1 + the live
boost)`. There is no per-piece history to keep track of.

And because you never wait for the potion to expire, one is always live, which is what
makes it compound: the potion you drink is scaled by the one already running.

```text
piece  = 25% × (1 + x)
x[n+1] = 0.6 × (1 + wear × 25% × (1 + x[n])) × (1 + x[n])
```

So a round offers exactly **one** choice: how many pieces you have on while you brew.
Fewer pieces, weaker potion. That is the only brake there is, and with growth this
violent it is the only reason landing on an exact number is possible at all.

Measured in game — four 25% pieces, plain ingredients, all four worn every round:

```text
observed                    modelled
  100% gear →    120%         120%      → 54% a piece   (55%)
  220% gear →    422%         422%      → 130%          (131%)
  522% gear →  1,948%       1,951%      → 512%          (513%)
2,051% gear → 26,405%      26,466%      → 6,626%        (6,642%)
cash out    →  3,991% Fortify Enchanting → 9,831% placed
                4,000%                     9,874%
```

Everything inside half a percent, drifting slightly high because the game floors each
magnitude and the model does not.

**The five-round plan below has been run.** Brewing in 0, 2, 2, 2, 2 pieces, then cashing
out in three for a 511.7% Fortify Enchanting potion, it placed **235% Fortify Alchemy** on
a pair of gloves. That exact sequence is pinned in the module's self-check, so if the
maths ever drifts the plan stops matching and something goes red.

**One thing this deliberately does not cover: waiting.** Let the potion lapse between
rounds and the boost stops compounding, growth goes linear, and four 25% pieces converge
on a hard **36.6%** ceiling — 120% → 192% → 235% → 261% and no further. Waiting also
brings back per-piece history, because a value written while a potion was up *sticks*
after it expires. That is a different, slower routine.

That 235% in the waiting sequence is a *potion*, and it is the number this module spent
several wrong models chasing as though it were an enchantment; the same run places about
33%. The enchanting formula feeds the potion into a quadratic on effective skill, so a
potion percentage and an enchantment percentage are never close.

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
