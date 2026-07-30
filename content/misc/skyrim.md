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

{{< resto-loop target="200" effect="Fortify Destruction" >}}

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

**The loop.** Every `Fortify <Skill>` effect, potion and apparel enchantment
alike, is internally school-of-Restoration. So a Fortify Restoration potion
boosts them. With `x` the active boost and `e` the summed gear, both as fractions:

```text
x[n+1] = r × (1 + e) × (1 + x[n])          x[0] = 0
             \_ brewed _/   \_ applied _/
```

Two compounding factors per round — the gear you are wearing is worth more, *and*
the new potion is itself a Restoration effect so drinking it on top of the live
one multiplies it again. Growth is quadratic, not geometric.

**A piece has no memory.** Drinking recomputes the Fortify Alchemy magnitude of
everything you are wearing *at that moment*, from its base. So a piece is worth
either 25% × (1 + current boost) or a flat 25% — never some stale value from an
earlier, smaller boost. You cannot bank a 243% item and come back to it.

That recurrence is a derivation, not something published. Solving `x[n+1] = x[n]`
gives a discriminant of `(1−r)² − 4re`, so "no fixed point" is exactly UESP's
documented divergence condition `e > (1−r)²/(4r)`. It also reproduces all three
of UESP's worked examples.

**The throttle.** Wearing everything every round overshoots wildly — 121% at
three rounds, 9,874% at four. Each round you choose two separate things: what you
wear **while brewing**, which sets the potion's strength, and what you wear
**before drinking**, which decides only which pieces come out boosted. Dropping a
piece for a round costs you its boost entirely, and that is what makes fine
targets reachable.

**Two ways this is wrong for you.** If you run the Unofficial Patch none of it
works: USSEP takes the Fortify effects out of the Restoration school and
separately turns the enchanting potion into a flat multiplier. And the `0.14` and
`3.4` above are UESP's empirical fit rather than extracted engine values — moving
`3.4` to `3.3` shifts a 121% result to 124%, so treat the last digit as soft.
Everything upstream of the enchanting step is exact.

</details>
