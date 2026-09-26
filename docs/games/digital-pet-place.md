# Digital Pet Place (DPP) — Gameplay Design

## 1. Concept

A browser-based digital pet garden with a modular expansion structure.

The **Garden** is the persistent core. It owns the pets, their stats, the player's inventory, and the save file. Everything else is a **Module**: a self-contained side experience that borrows a pet, produces rewards, and hands the pet back.

The governing principle is that **a module never changes a pet — it produces outcomes the garden absorbs.** A race, a mine, a shop: each one takes a pet, reads it, and returns a defined set of results. The garden applies them. This is what allows modules to be added over time without touching the core, and it is formalized as a contract in §6.

---

## 2. The Garden (Core)

- **Capacity:** 16 pets maximum.
- **Eggs** are inventory items and do **not** count against the cap. They can be held indefinitely or placed in the garden as decoration.
- **Hatching** is blocked while the garden holds 16 pets. The egg stays in inventory; no loss, no penalty.
- **Time model:** garden time advances **only while the tab is the active window.** Aging, happiness decay, and evolution progress pause when the player is away.
- Pets currently dispatched to a module still **occupy their garden slot** but **do not age** while away.

### 2.1 Time model implications

The split model is deliberate. It exists so that a player who disappears for two months does not return to a garden of dead pets — a common failure mode for browser pet games.

Two consequences to be aware of during balancing:

- A pet kept perpetually employed effectively never ages. Treat "employment as life extension" as an intentional feature (you can preserve a favorite by keeping it working) or add a soft cap if it proves degenerate in testing.
- Idle modules run on wall-clock time while the garden does not. Offline mining progress must be capped (see §7.4) so the two clocks don't drift into absurdity.

---

## 3. Pets

### 3.1 The Five Stats

Every pet has five stats: **Swim, Fly, Run, Power, Stamina.** Each has an associated color, used consistently across every module:

| Stat | Color |
|---|---|
| Swim | Blue |
| Fly | Yellow |
| Run | Green |
| Power | Red |
| Stamina | Purple |

Each stat has three tracked numbers:

| Field | Range | Meaning |
|---|---|---|
| **Value** | 0–999 | The number modules actually use |
| **Level** | 0–99 | How many times the stat has leveled up |
| **Grade** | E, D, C, B, A, S | How much Value is gained per Level |

**Value** is what a module reads. **Level** is what feeding raises. **Grade** is fixed at birth and determines how efficiently Levels convert into Value.

### 3.2 Feeding and Leveling

Stats rise only one way: **feeding power-ups to a pet in the garden.** Modules produce power-ups; the garden consumes them.

- Each stat has a progress bar toward its next Level.
- Feeding a power-up of that stat's color fills the bar by an amount set by the power-up's tier.
- When the bar fills, the stat gains **one Level**, and Value increases by the amount set by Grade:

| Grade | Value gained per Level |
|---|---|
| E | 1 |
| D | 2 |
| C | 3 |
| B | 4 |
| A | 5 |
| S | 6 |

- The bar cost to reach the next Level scales with current Level, so late Levels take noticeably more feeding than early ones. *(Tunable. Suggested starting curve: cost = 10 + Level × 2.)*

A maxed E-grade stat reaches Value 99. A maxed S-grade stat reaches 594. Grade is therefore the dominant long-term factor, and **Grade can only be improved by breeding** (§3.6). This is the core progression spine:

> Modules produce power-ups → power-ups raise Levels → Levels are capped in usefulness by Grade → Grade improves only through breeding → breeding requires a garden of raised pets.

### 3.3 Alignment

Alignment is a single number from **−100 (Dark)** through **0 (Neutral)** to **+100 (Hero)**.

Since there are no player characters to raise a pet, **alignment is carried by the power-ups themselves.** Every power-up drop rolls a flavor:

| Flavor | Effect when fed |
|---|---|
| Hero | Alignment +3 |
| Neutral | No change |
| Dark | Alignment −3 |

*(Values tunable.)* Flavor is independent of stat color — a Hero-flavored Red power-up and a Dark-flavored Red power-up raise Power identically and pull alignment in opposite directions.

Alignment brackets for evolution purposes:

| Bracket | Range |
|---|---|
| Hero | +40 and above |
| Neutral | −39 to +39 |
| Dark | −40 and below |

This keeps alignment entirely inside the module reward contract. A module influences alignment only by choosing which flavors it drops, never by touching the pet.

### 3.4 Happiness

A single value from **0 to 100**, starting at 50.

| Action | Effect |
|---|---|
| Petting (click) | +2, with a per-minute cap so mashing doesn't trivialize it |
| Feeding a power-up | +3 |
| Passive decay | −1 per 5 minutes of active garden time |
| Returning from a module dispatch | +5 |

Happiness does not affect module performance. It affects **reincarnation carryover** (§3.5) and **breeding eligibility** (§3.6). Its job is to make sure a player who ignores their pets entirely gets a worse long-term outcome than one who engages with them, without punishing anyone mid-session.

### 3.5 Life Cycle

A pet's life is measured in **active garden time only** (§2). Time spent dispatched to a module does not count.

| Stage | Trigger | Description |
|---|---|---|
| **Egg** | — | Inventory item. Can be placed as decoration. |
| **Hatchling** | Hatch | Undifferentiated. All pets look alike at this stage. |
| **Juvenile** | 45 min active time | Takes a form based on **highest Value stat** + **alignment bracket** |
| **Adult** | 2 hrs active time | Form re-evaluated against current highest stat + alignment |
| **Cocoon** | 5 hrs active time | End of lifespan |
| **Reincarnation** | Cocoon resolves | Becomes an egg again |

*(All durations tunable.)*

**Form** is cosmetic, but it is the visible record of how a pet was raised. Because Adult form is re-evaluated at the second threshold, a player who shifts a pet's focus between Juvenile and Adult gets a visibly different creature than one who stayed the course — 15 Juvenile forms (5 stats × 3 alignments), 15 Adult forms.

**Cocoon and reincarnation.** Pets do not permanently die. When the lifespan elapses, the pet enters a cocoon and emerges as an egg. Happiness at the moment of cocooning determines how much carries over:

| Happiness | Level carryover |
|---|---|
| 80–100 | 30% of each stat's Level |
| 40–79 | 20% |
| 0–39 | 10% |

Grades always carry over in full. Alignment resets to 0. The reincarnated egg counts as a new pet and does not occupy a slot until hatched.

Permanent death is deliberately absent. In a browser game with no server and no account recovery, losing a pet you spent hours on is the point at which players close the tab for good.

### 3.6 Breeding and Inheritance

Two **Adult** pets with Happiness of 50 or above can be paired in the garden to produce an egg.

- The egg appears in inventory immediately. It does not count against the 16-pet cap and will not hatch until a slot is free.
- Pairing has a cooldown per pet *(suggested: 30 min active garden time)*.

**The offspring's Grades are rolled per stat, independently:**

| Outcome | Chance |
|---|---|
| Inherits Parent A's Grade for that stat | 45% |
| Inherits Parent B's Grade for that stat | 45% |
| **Mutates up one Grade** (above the better parent) | 5% |
| Mutates down one Grade (below the worse parent) | 5% |

*(Rates tunable.)* Grades cannot exceed S or fall below E.

The offspring starts at **Level 0 in every stat**, with **Alignment 0** and **Happiness 50**. It inherits nothing but Grades.

This makes breeding the only path to a higher ceiling, and makes an S-grade pet a genuine multi-generation achievement rather than a purchase.

---

## 4. Player Interaction

The garden is a single web page.

- **Click** a pet to pet it.
- **Drag** a pet to move it around the garden.
- **Drag a pet into the Info Area** to open its detail panel: stat Values, Levels, Grades, alignment, happiness, age, life stage.
- From the Info Area, **feed power-ups** to the pet from inventory.
- **Drag a pet onto a module entrance** to dispatch it there.
- **Drag two pets together** to pair them for breeding.

Eggs can also be dragged and placed as garden decoration.

---

## 5. Economy Overview

Two faucets, deliberately different in texture:

| Module | Texture | Driven by |
|---|---|---|
| **The Mine** | Idle, patient, runs while away | The pet |
| **Constellations** | Active, twitchy, short sessions | The player (pet sets the rates) |

One sink:

| Module | Role |
|---|---|
| **The Shop** | Lossy conversion of surplus power-ups, plus egg purchase |

**Design constraint:** the modules are currently the *only* source of stat power-ups, and stats are what make the modules productive. This bootstrap loop is intentional — early runs are slow and improvement is immediately visible — but it means a zero-stat pet must still produce a satisfying first run. The mine's early drop rates set the pacing of the entire game.

---

## 6. The Module Contract

**This is the most important section of this document.** Every module, present and future, conforms to it. A module that cannot express itself in this vocabulary is a module that will break the core.

### 6.1 Input

A module receives:

```
{
  pet: Pet | null,        // the dispatched pet, read-only
  inventory: Inventory,   // read-only
  flags: UnlockFlags      // read-only
}
```

A module **may** borrow a pet. All modules specified in this document do, but the contract permits `null` so that a future pet-less module (a pure minigame, a puzzle) remains legal.

### 6.2 Output

A module may return **only** these four things:

```
{
  currency:   number,        // coins earned
  statDeltas: { swim, fly, run, power, stamina },  // direct Value change
  items:      ItemStack[],   // power-ups, eggs, dyes, materials
  flags:      string[]       // unlocks triggered
}
```

### 6.3 Rules

1. A module **never mutates a pet directly.** It reads the pet and returns results. The garden applies them.
2. A module **never writes to the save file.** The garden owns persistence.
3. A module **never reads another module's internal state.** Cross-module communication happens only through inventory, currency, and flags.
4. A module may run on wall-clock time if it declares itself idle. The garden does not.

### 6.4 Note on `statDeltas`

All three launch modules return **items only**, never direct stat deltas. This is deliberate: it preserves the feeding ritual, keeps power-ups tradable at the shop, and routes all stat gain through a single choke point in the garden.

`statDeltas` exists in the contract for a future module that trains a pet directly — a dojo, a gym, a meditation retreat — where handing back an item would feel wrong. Note that it bypasses Grade entirely, adding raw Value, so it is powerful and should be used sparingly.

---

## 7. Module 1 — The Mine

**Type:** Idle. Runs on wall-clock time, including while the tab is closed.

Send a pet down the mine; it swings a pickaxe on a loop until you collect it.

### 7.1 Stat Mapping

| Stat | Effect in the Mine |
|---|---|
| **Power** | Material acquired per swing |
| **Run** | Swing speed (time between swings) |
| **Stamina** | How many swings before hitting the cooldown |
| **Swim** | How fast the cooldown clears |
| **Fly** | Luck — frequency of power-up veins vs. plain material |

### 7.2 The Loop

The pet swings at a rate set by Run. Each swing yields material scaled by Power and depletes a stamina bar. When the bar empties, the pet rests; Swim governs how quickly it recovers and resumes. Throughout the run, Fly rolls against vein type: a plain vein yields currency material, a **power-up vein** yields a stat power-up instead.

Power-up veins drop power-ups of a rolled stat color, carrying a rolled alignment flavor (§3.3).

### 7.3 Simultaneous Runs

Multiple pets may mine at once. Each dispatched pet runs its own independent simulation. Each continues to occupy a garden slot while away.

### 7.4 Offline Resolution

The mine does not tick in real time. On collection, the module computes elapsed wall-clock time and simulates the loop deterministically from a stored seed. Same elapsed time plus same seed always yields the same result.

Accrual is capped at a fixed maximum window (**proposed: 12 hours**) so that a week away does not produce a week of ore.

---

## 8. Module 2 — Constellations

**Type:** Active. Short sessions, player skill, immediate feedback.

You take a pet out into the night. Stars flicker into view across a dark sky; you point at them. Each star you catch grants a power-up in that star's color.

### 8.1 Stat Mapping

The pet does not play — it sets the odds. **Each stat governs the spawn rate and value of its own color of star.**

A Run-focused pet produces a sky full of **green** stars granting large Run power-ups. A balanced pet produces an even but unremarkable spread. This makes constellations a **specialist's tool**: the best way to double down on a pet's existing strength, rather than a way to round it out.

**Fly** additionally acts as general luck: rarer star types, bonus events, and higher-tier power-ups across all colors.

### 8.2 Feel

Constellations is small in scope and must survive on juice alone. The target sensation is spotting a real star flickering at the edge of vision and pinning it before it fades.

- Every star **telegraphs with a flicker** before it becomes clickable. The flicker is the skill — a player who watches the whole sky catches more than one who stares at the center.
- Stars **fade out** if not caught. Missing costs nothing but the star.
- Catching produces an immediate **burst of light in the star's color**, a rising chime pitched to the color, and the power-up icon arcing toward the inventory.
- **Consecutive catches build a streak.** The sky brightens slightly with each, the chime climbs in pitch, and a broken streak dims everything back down. No numeric combo counter on screen — the feedback should be entirely atmospheric.
- **Rare stars** (Fly-driven) announce themselves differently: a longer, slower flicker and a lower tone, so an attentive player feels the pull before they know what it is.
- Restraint on screen shake. This module is quiet and still, not explosive.

### 8.3 Session Limits

Unlimited free stargazing would undercut the mine entirely. A limiter is required.

**Proposed:** a session is a single "night" of fixed length (~90 seconds). After a night, the pet must rest before it can stargaze again. The cooldown is on the *pet*, not the player, so a larger garden means more sessions — which gives breeding a purpose beyond grade-chasing.

---

## 9. Module 3 — The Shop (v1)

**Type:** Interface only. Does not borrow a pet.

Scope for v1 is deliberately minimal.

### 9.1 Power-Up Exchange

Coins are the intermediary currency and exist to facilitate this trade.

- **Selling** a power-up yields coins.
- **Buying** a power-up costs twice the sell value.

Net effect: **two power-ups in, one power-up out.** The shop is a lossy laundering service that converts a stat you don't need into a stat you do, at a 2:1 penalty.

**Open:** whether the rate is flat across power-up tiers or scales by tier. A flat rate means commons can be ground into rares at a fixed exchange, which quietly sets the pace of the late economy. Rate-by-tier closes that path.

### 9.2 Base Egg

A plain egg purchasable with coins. It produces a hatchling with **all E grades** — functional, but the floor. Its purpose is to guarantee a player can always repopulate an empty garden, and to give coins a use beyond the exchange. It is never a shortcut past breeding, because Grade is the thing breeding produces and the shop cannot sell.

### 9.3 Deferred

- **Dyes** for recoloring pets — mechanics undecided (whole-body vs. part-based, consumable vs. permanent).
- **Cosmetics Shop (v2)** — hats and accessories, likely a separate module.

---

## 10. Persistence

No server. Everything lives on the client.

- **Primary storage:** browser local storage.
- **Format:** plain, readable JSON. Not obfuscated.
- **Export:** the player can download their save file at any time.
- **Import:** the player can upload a save file to restore.

### 10.1 Notes

Plain JSON means a motivated player can edit their save. In a single-player game with no leaderboards and no server, nobody is harmed by this, and readable saves make debugging vastly easier. Accepted.

The real risk is **accidental loss** — a cleared cache wipes a garden. The game should prompt the player to export a backup at natural milestones (first hatch, first evolution, first reincarnation) rather than nagging on a timer.

---

## 11. Open Questions

| # | Question | Status |
|---|---|---|
| 1 | Shop exchange rate — flat, or scaled by power-up tier? | §9.1 |
| 2 | Dye mechanics — whole pet or parts? Consumable? | §9.3 |
| 3 | Constellations session length and pet cooldown duration | §8.3, proposed |
| 4 | Mine offline accrual cap | §7.4, proposed 12h |
| 5 | Does perpetual employment as a life-extension strategy need a soft cap? | §2.1 |
| 6 | Does the mine have fixed-duration dispatches, or is it open-ended until collected? | Currently open-ended |
| 7 | How many power-up tiers exist, and what does each contribute to a Level bar? | §3.2 |

---

## 12. Future Modules

Any new module must fit §6. Candidates discussed:

- **Dojo / training** — the natural first use of `statDeltas`.
- **Cosmetics shop** — hats and accessories.
- **Racing** — pets compete on a course; different stats gate different obstacles.
