# Skyrim — prose cut, for review

Everything removed from `/misc/skyrim/` in the visual-rework pass, kept verbatim so it can
be re-sited, rewritten, or thrown away deliberately rather than by omission. Nothing here
is referenced by the build.

Three things account for almost all of it:

1. **Said twice.** The same fact in the page prose and in a widget's own hint, or in the
   page prose and in a shortcode comment.
2. **Narrating the visible.** A sentence describing a strikethrough, a chevron, or a state
   the reader is looking at.
3. **Development narrative.** What the module used to get wrong, and how it was caught.
   A changelog addressed to the author, in the reader's document.

Where a symbol definition moved into a formula legend, it is marked **→ legend**; those are
not really cuts, they moved to the thing they describe.

---

## Front matter

`description` and `blurb` both opened by restating the body's first line.

> The Skyrim reference I actually use — the potion recipes I keep coming back to, with the
> exact ingredients, what each brew really does, and the notes on where to farm them.
> Anniversary Edition, Creation Club content on, no mods.

`description` now names what is actually on the page (four modules) and keeps the edition
line, since that is the one place it earns its keep for search.

---

## Intro

> Rare Curios ingredients are marked `CC`.

The badge carries its own accessible name, `(Creation Club)`, and the same badge appears on
183 ingredient pills, every recipe tile, and every trick row. A legend for it in the page's
first paragraph is a caption for something the reader has not seen yet.

---

## Builder — "Why some of those come out as poisons"

> Not the number of good effects against bad ones, and not which pills you picked on the
> first screen.

Opens the section by ruling out two things nobody proposed.

> The duration term drops out for an instantaneous effect.

**→ legend** (`duration`).

> **Your alchemy is deliberately not in that formula** […] Skill, gear and Fortify Alchemy
> multiply an effect's magnitude — or its duration, for the five effects that have no
> magnitude — and either route puts the same `M^1.1` in front of every effect's cost. A
> common factor cannot change which one is largest, so a level 15 alchemist and a looped
> one get the same verdict.

Kept, minus the parenthetical and minus the level-15 restatement — the sentence before it
already says a common factor cannot change the ranking.

> Two pairs collide, and only one of them matters. […] No ingredient carries Resist Magic
> and Weakness to Magic together, so that pair needs a fourth slot and never comes up; the
> other turns up as the costliest pair in 65 of the 635,068 three-ingredient mixtures that
> make anything.

The pair that never comes up is 40 words about a case the reader cannot reach. The 635,068
denominator went with it; 65 mixtures reads as "rare" either way.

---

## Resto loop — "The formulae, and why the gear count is the throttle"

> `Gear` is the *summed* Fortify Alchemy across everything you are wearing. Fortify
> Restoration has BaseMag 4 and Fortify Enchanting has BaseMag 1, which is why the
> restoration potion is always exactly four times the enchanting one.

**→ legend** (`Gear`, `BaseMag`).

> The load-bearing detail: **the potion does not multiply the finished enchantment.** It
> scales your effective skill *inside* a quadratic, so the enchantment comes out quadratic
> in potion strength.

**→ formula note**, on the formula it is about.

> `BaseMag` runs 8 / 10 / 13 / 15 / 20 / 25 across the picker's ten groups — 8 for Fortify
> Destruction, 13 for Fortify One-Handed, 15 for the elemental resists, 20 for the
> attributes, 25 for Resist Disease — and the groups are split by base *and* by which +25%
> perk applies, because three of them (Resist Magic, Carry Weight, Fortify Magicka Regen)
> take no perk at all.

**→ legend** in part ("8 to 25, across the picker's ten groups"). The rest is the picker's
own `<optgroup>` labels written out in a paragraph — the widget already groups by base and
by perk, visibly, and names each group.

> There is no per-piece history to keep track of.

The two sentences before it already say it does not matter which pieces or in what order.

> That `round` is the game rounding the potion to a whole percent as you brew it, and it is
> worth more than it looks — leaving it out drifts half a percent high over four rounds and
> one and a half over six, which is the difference between a plan reading 600% and one
> reading 587%.

**→ formula note**, shortened to the six-round figure.

> Fewer pieces, weaker potion, smaller step. That is the only brake there is, and with
> growth this violent it is the only reason landing on an exact number is possible at all.

Condensed to one clause. The full version is also said, nearly word for word, by
`roundDetail()` in `resto.ts` on every step the reader opens.

> Two wrong versions of this died on a 600% target, both caught in play. The first treated
> a weak brew as a way to step *backwards*: the plan dropped the boost from 277% to 226%
> mid-run, that round did nothing in game, the rest compounded off the higher number and it
> landed near **1,313%**. The second tested the new potion against the live boost instead of
> against the last bottle, which let a plan open with two naked rounds — the second did
> nothing, everything after ran a step behind, and the same target came out at **204%** off a
> 467% potion. Both runs are now pinned as assertions.

135 words of development narrative. The rule it exists to justify — bottle against bottle,
a naked round is only ever an opening move — is stated directly above it and survives.

> The 9,831% is the strongest check here — it exercises the enchanting quadratic four orders
> of magnitude past any published example and lands on the nose.

Commentary on the table's own last row.

> UESP flags the `0.14` and `3.4` as an empirical fit and that is about its size: a few
> tenths of a percent, which becomes a couple of points once you are up at 600.

**→ legend** (`3.4`).

> **A five-round plan has been run.** Brewing in 0, 2, 2, 2, 2 pieces, then cashing out in
> three for a 511.9% Fortify Enchanting potion, it placed **235% Fortify Alchemy** on a pair
> of gloves. That exact sequence is pinned in the module's self-check as a replay, so if the
> maths ever drifts the plan stops matching and something goes red. The planner above now
> proposes a shorter four-round route to the same number — both are right, but only the
> five-round one has an in-game outcome behind it.

The strongest candidate here for keeping in some form — it is evidence, and the page's
default target is that same 235%. But it is written as a note-to-self about the self-check,
and the last sentence exists to apologise for the planner disagreeing with it.

> That 235% in the waiting sequence is a *potion*, and it is the number this module spent
> several wrong models chasing as though it were an enchantment; the same run places about
> 33%. The enchanting formula feeds the potion into a quadratic on effective skill, so a
> potion percentage and an enchantment percentage are never close.

The warning is real and the paragraph above it now carries it ("mind which number is
which"). The confession is not.

> The planner picks the gem for you by default and names it in the last step.

The planner's last step visibly names the gem, and the picker's default option reads "Best
available".

> And the `0.14` and `3.4` above are UESP's empirical fit rather than extracted engine
> values — moving `3.4` to `3.3` shifts a 121% result to 124% — so treat the last digit of
> any enchantment as soft.

**→ legend** (`3.4`). The page now points at the legend rather than repeating it.

---

## Enchant max

> It converges, which is exactly what makes it fair — plain, on 29% pieces and a 32.4%
> potion, which are UESP's own figures. The Anniversary ingredients move it a long way:
>
> ```text
> plain                       29% a piece    32.4% potion   places 29.2%
> + Dreugh Wax (×2 base)      35%            72.0%          places 36.0%
> + Necromage                 39%            48.0%          places 39.6%
> Dreugh + Necromage          60%           127.5%          places 60.7%
> + Seeker of Sorcery         74%           148.5%          places 74.6%
> everything, Ahzidal too     97%           183.0%          places 98.0%
> on FIVE slots               runaway — no fixed point, no glitch involved
> ```

Every row of this is a state of the widget forty lines above it, which computes all of it
live and shows the same three numbers. The runaway row survives as a sentence, because that
one is a *result* rather than a reading.

> and by more, 74.6% against 70.8%

Two numbers the widget produces on demand.

> I had this backwards until the self-check caught it.

> The ordering in the breakdown is the point.

Now the summary of the disclosure it sits in.

---

## Inside the modules

Rendered by the widgets themselves, or printed into a settings panel.

### resto-loop.html — the Fortify Alchemy gear fieldset

> On apparel the soul gem scales the magnitude directly — a common soul places exactly a
> third of a grand one. It is the finest control here, because it gives the planner five
> overlapping copies of an otherwise lumpy set of reachable numbers. Applies to the final
> enchantment only; the gear you wear is whatever "Each, %" says.

47 words, in a drawer that is collapsed by default, restating the page's soul-gem paragraph
including its table. Reduced to the two facts you need with your hand on the control.

> 25% is the natural cap — what you can enchant without drinking anything. Raise it if your
> pieces are already bootstrapped. A fifth slot needs the helmet + circlet bug. **Which**
> pieces you wear never matters, only how many.

The last sentence went: the field above it is labelled "Pieces worn", the plan says "wearing
any 2 pieces", and the page says it too.

### enchant-max.html — the Alchemy fieldset

> It **converges** — plain, on 29% pieces and a 32.4% potion, which are UESP's own figures.
> […] e.g. one the Restoration planner above produces. While it is ticked the Potion&nbsp;%
> box above shows what the loop settled on.

The convergence figures belong to the page. The last sentence describes a box the reader can
see, which is visibly filled and visibly not typeable — that was the point of the dashed
border and the tinted fill.

### builder.ts — `guidanceMarkup`

> Anything that shares nothing with this is struck through.

A sentence describing a strikethrough, printed above the strikethrough.

### resto.ts — `stepList`

> Brew a **X%** potion wearing any **N** pieces (**Y%** Fortify Alchemy). Drink it. Every
> piece you put on now reads **Z%**.

The frame is printed once per round, up to twelve times in one list, so every word in it
costs twelve lines. "Drink it" goes because the clause after it presupposes it; the gear
percentage goes because the detail card one tap away is where it already lives. Now:
*Wearing any **N** pieces, brew a **X%** potion. Every piece then reads **Z%**.*

### resto.ts — `roundDetail`

> — so wearing fewer pieces while brewing is the only brake there is.

Ends the detail card, ends the paragraph under the widget, and is now also the `wear` legend
row on the loop formula. Three copies; the card's was the least useful of them.

### resto.ts — `planMarkup`

> Tap a step to see where every piece stands after it.

Instructions for pressing a button, over a list of buttons that hover, focus, and carry a
pointer cursor. The zero-round message beside it survives, because that one is the plan.

### enchant.ts — `resultMarkup`

> without it: 42.0%

Fifteen rows, fifteen copies of the label. The visible text is now the number alone and the
line above the list names the column; a screen reader still gets "without it:" from a
`.sky-sr` span, because it arrives at the row without the heading in view.

> What each one is worth, with everything else still on:

Kept, but made to earn its place by naming both columns rather than only the first.

---

## Resto loop — the settings drawer, second pass

Both survived the first cut and did not survive the second.

> The gem scales the magnitude directly: a common soul places a third of a grand one.
> Final enchantment only.

> 25% is the natural cap without drinking anything — raise it if your pieces are already
> bootstrapped. A fifth slot needs the helmet + circlet bug.

The soul-gem paragraph on the page carries the first, with the landing table under it. The
helmet + circlet bug is the only fact here with nowhere else to live — it is the one way to
get a fifth slot, and the field it belonged to (`Pieces worn`, max 5) now offers a fifth
with no explanation of how you would ever wear one.

---

## Enchant max — the last of it

> Every trick that makes an enchantment come out stronger, and — the part worth having —
> what each one is actually worth once the others are already on. Tick what you have.

The section intro. The widget is a list of tricks with a number beside each.

> Brew the best Fortify Enchanting potion you can, place better gear with it, and that gear
> brews a better potion. Untick to type a potion strength in by hand.

> Strongest this enchantment gets · reads 32% in game · effective skill 134.2 · ×1.3 from
> the potion · The fair loop settles after 3 passes at 32.0% Fortify Alchemy a piece —
> 128.0% worn, brewing a 34.2% Fortify Enchanting potion. · What each is worth with
> everything else on, and what you would place without it:

A heading restating the widget's question, a metadata row, the loop's three numbers spelled
out in a sentence, and a label over a list that is self-evidently a list of levers. The two
numbers worth keeping — the potion and the gear — are in the answer row under a vial and a
shirt. **`effective skill` and `reads N in game` left with it**; the first is the quantity
the whole quadratic turns on, and the second is what the game shows you, neither of which
is now anywhere on screen.

### The five trick notes

Still in `data/skyrim/enchant-tricks.yaml`, no longer rendered — two or three sentences
each, five of them stacked inside the panel that is the widget's main question. The one
fact in them that is not on the page: **Ahzidal's Genius may be +10 skill rather than +10%,
which would make it worth far more with a strong potion.** The page's derivation says this
in its own words, so it survives; the other four are gone from the interface entirely.

---

## Still open

- The two `” ```text ” ` tables in the resto derivation — the measured run and the gem
  landings — are real tables rendered as grey code blocks. They want the treatment the
  formulae just got, or to become actual tables.
- `content/misc/skyrim-check.md` repeats its shortcode's "same modules, not the same
  artefact" comment almost verbatim. One of the two should go; the page is the one a person
  reads.
