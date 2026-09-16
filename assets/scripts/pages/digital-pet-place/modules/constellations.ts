// constellations.ts — the rules half of Module 2 (design §8): the pet sets
// the odds, the player catches the stars. The scene (scenes/night.ts) owns
// the sky and the feel.

import type { Flavor, ModuleInput, ModuleOutput, PowerUpKey, PowerUpStack, StatKey, Tier } from '../core/types';
import { STAT_KEYS, mergePowerUp, zeroStats } from '../core/types';
import { rollFlavor } from '../core/rules';
import type { Rng } from '../core/rng';

export interface NightPlan {
  /** Spawn share per color — a Run pet fills the sky with green. */
  weights: Record<StatKey, number>;
  /** ms between spawns. Stronger pets get busier skies. */
  spawnEvery: number;
  /** Fly-driven: rarer star types, bigger rewards. */
  rareChance: number;
  /** Fly's general luck: tier bonus across every color. */
  luck: number;
}

export interface StarSpec {
  stat: StatKey;
  tier: Tier;
  flavor: Flavor;
  rare: boolean;
  /** Telegraph before the star is catchable, ms. */
  flickerMs: number;
  /** Catch window before it fades, ms. */
  liveMs: number;
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export function planNight(input: ModuleInput): NightPlan {
  const weights = {} as Record<StatKey, number>;
  let total = 0;
  for (const k of STAT_KEYS) {
    const v = input.pet ? input.pet.stats[k].value : 0;
    // A floor keeps a zero-stat hatchling's sky populated and balanced; value
    // on top of it is what specialises the sky.
    weights[k] = 12 + v;
    total += v;
  }
  const fly = input.pet ? input.pet.stats.fly.value : 0;
  return {
    weights,
    spawnEvery: clamp(1250 - total * 0.3, 480, 1250),
    rareChance: 0.035 + (fly / 999) * 0.2,
    luck: fly / 999,
  };
}

/** Tier odds for a star of `stat`: the stat's own value plus Fly's general luck. */
function rollTier(value: number, luck: number, rare: boolean, rng: Rng): Tier {
  const p3 = clamp((value - 150) / 900, 0, 0.35) + luck * 0.1;
  const p2 = clamp(value / 320, 0, 0.6) + luck * 0.15;
  let tier: Tier = 1;
  const r = rng.next();
  if (r < p3) tier = 3;
  else if (r < p3 + p2) tier = 2;
  if (rare && tier < 3) tier = (tier + 1) as Tier;
  return tier;
}

export function rollStar(plan: NightPlan, input: ModuleInput, rng: Rng): StarSpec {
  const stat = rng.weighted(plan.weights);
  const rare = rng.chance(plan.rareChance);
  const value = input.pet ? input.pet.stats[stat].value : 0;
  const tier = rollTier(value, plan.luck, rare, rng);
  return {
    stat,
    tier,
    flavor: rollFlavor(rng),
    rare,
    flickerMs: rare ? rng.range(2200, 3000) : rng.range(900, 1500),
    liveMs: rare ? rng.range(3000, 3600) : rng.range(2100, 2700),
  };
}

/** Fold the night's catches into the four-field contract. Items only (§6.4). */
export function collectNight(caught: readonly StarSpec[]): ModuleOutput {
  const stacks = new Map<PowerUpKey, PowerUpStack>();
  for (const star of caught) mergePowerUp(stacks, star.stat, star.tier, star.flavor);
  return {
    currency: 0,
    statDeltas: zeroStats(),
    items: [...stacks.values()],
    flags: caught.length ? ['constellations.first-night'] : [],
  };
}
