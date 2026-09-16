// rules.ts — every tunable in one place. Numbers marked "design" come straight
// from the gameplay doc; the rest are first guesses for the POC and are the
// things to twist during balancing.

import type { Bracket, Flavor, Grade, StatKey, Tier } from './types';
import type { Rng } from './rng';

const MIN = 60_000;
const HOUR = 60 * MIN;

export const GARDEN_CAPACITY = 16; // design

/** Value gained per Level, by Grade. (design) */
export const GRADE_GAIN: Record<Grade, number> = { E: 1, D: 2, C: 3, B: 4, A: 5, S: 6 };

export const MAX_VALUE = 999;
export const MAX_LEVEL = 99;

/** Progress-bar cost to reach the next Level from `level`. (design: 10 + L×2) */
export function levelCost(level: number): number {
  return 10 + level * 2;
}

/** Progress points a power-up contributes, by tier. (open question #7 — POC guess) */
export const TIER_POINTS: Record<Tier, number> = { 1: 6, 2: 14, 3: 32 };

/** Alignment shift when a flavored power-up is fed. (design: ±3) */
export const FLAVOR_ALIGNMENT: Record<Flavor, number> = { hero: 3, neutral: 0, dark: -3 };

/** Every module drop rolls a flavor with the same odds (design §3.3). */
export function rollFlavor(rng: Rng): Flavor {
  return rng.weighted<Flavor>({ hero: 30, neutral: 40, dark: 30 });
}

export function bracketOf(alignment: number): Bracket {
  if (alignment >= 40) return 'hero';
  if (alignment <= -40) return 'dark';
  return 'neutral';
}

// Happiness (design §3.4)
export const HAPPINESS_START = 50;
export const HAPPINESS_PET = 2;
export const HAPPINESS_PET_CAP_PER_MIN = 5; // pets that count per garden-minute
export const HAPPINESS_FEED = 3;
export const HAPPINESS_DECAY_EVERY = 5 * MIN; // −1 per 5 min active
export const HAPPINESS_RETURN = 5;

// Life cycle (design §3.5) — active garden time only.
export const JUVENILE_AT = 45 * MIN;
export const ADULT_AT = 2 * HOUR;
export const COCOON_AT = 5 * HOUR;
/** How long the cocoon sits in the garden before it resolves into an egg. */
export const COCOON_DURATION = 2 * MIN;

/** Level carryover on reincarnation, by happiness at cocooning. (design) */
export function carryoverFraction(happiness: number): number {
  if (happiness >= 80) return 0.3;
  if (happiness >= 40) return 0.2;
  return 0.1;
}

/** Grade odds for a starter / shop-floor egg. Mostly E and D; a C is a lucky start. */
export const STARTER_GRADE_WEIGHTS: Record<Grade, number> = { E: 45, D: 35, C: 15, B: 5, A: 0, S: 0 };
export const STARTER_EGGS = 2;

// Module ids
export const MODULE_CONSTELLATIONS = 'constellations';
export const MODULE_MINE = 'mine';

// Breeding (design §3.6)
export const BREED_MIN_HAPPINESS = 50;
export const BREED_COOLDOWN = 30 * MIN; // active garden time, per pet
export const BREED_MUTATE_UP = 0.05;
export const BREED_MUTATE_DOWN = 0.05;

// The Mine (design §7). Wall-clock; resolved on collection; capped.
export const MINE_CAP = 12 * HOUR; // open question #4 — proposed 12 h, taken as is
/** Time between swings: Run. 8 s for a zero pet, 2 s at Value 999. */
export function mineSwingMs(run: number): number {
  return Math.max(2000, 8000 - run * 6);
}
/** Swings before the pet must rest: Stamina. */
export function mineSwingsPerBout(stamina: number): number {
  return 3 + Math.floor(stamina / 25);
}
/** Rest between bouts: Swim clears it. 2 min for a zero pet, 20 s at 999. */
export function mineRestMs(swim: number): number {
  return Math.max(20_000, 120_000 - swim * 100);
}
/** Ore (coins) per plain swing: Power. */
export function mineOrePerSwing(power: number): number {
  return 1 + Math.floor(power / 40);
}
/** Chance a swing hits a power-up vein instead of ore: Fly. */
export function mineVeinChance(fly: number): number {
  return 0.06 + (fly / 999) * 0.24;
}
/** The first swing of every run is a vein, so a zero-stat first run still pays. */
export const MINE_FIRST_SWING_IS_VEIN = true;

// The Shop (design §9). Open question #1 resolved as tier-scaled: a flat rate
// would let commons be ground into rares at a fixed exchange.
export const SHOP_SELL: Record<Tier, number> = { 1: 10, 2: 25, 3: 60 };
export const SHOP_BUY_MULTIPLIER = 2; // two in, one out
export const SHOP_EGG_PRICE = 150;

// Constellations (design §8; session limits are the open question #3)
export const NIGHT_LENGTH = 90_000;
/** Pet rests this much active garden time between nights. */
export const NIGHT_COOLDOWN = 8 * MIN;

/** Colors, used consistently across every module. (design §3.1) */
export const STAT_COLOR: Record<StatKey, number> = {
  swim: 0x3b82f6,
  fly: 0xfacc15,
  run: 0x22c55e,
  power: 0xef4444,
  stamina: 0xa855f7,
};

export const STAT_LABEL: Record<StatKey, string> = {
  swim: 'Swim',
  fly: 'Fly',
  run: 'Run',
  power: 'Power',
  stamina: 'Stamina',
};

export const FLAVOR_LABEL: Record<Flavor, string> = { hero: 'Hero', neutral: 'Neutral', dark: 'Dark' };
export const FLAVOR_GLYPH: Record<Flavor, string> = { hero: '☀', neutral: '●', dark: '☾' };
