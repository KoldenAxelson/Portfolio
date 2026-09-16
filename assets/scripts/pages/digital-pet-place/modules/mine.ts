// mine.ts — Module 1, The Mine (design §7). Nothing ticks in real time: a run
// is replayed deterministically from its seed whenever it is looked at, so the
// same elapsed time and seed always give the same haul (§7.4), and accrual is
// capped so a week away is not a week of ore.

import type { ModuleInput, ModuleOutput, PowerUpKey, PowerUpStack, StatKey, Tier } from '../core/types';
import { STAT_KEYS, mergePowerUp, zeroStats } from '../core/types';
import {
  MINE_CAP,
  MINE_FIRST_SWING_IS_VEIN,
  mineOrePerSwing,
  mineRestMs,
  mineSwingMs,
  mineSwingsPerBout,
  mineVeinChance,
  rollFlavor,
} from '../core/rules';
import { Rng } from '../core/rng';

// A 12 h run at 2 s swings is 21 600 iterations; the ceiling only exists so a
// hand-edited save cannot hang the tab.
const MAX_SWINGS = 100_000;

interface MinePlan {
  swingMs: number;
  swingsPerBout: number;
  restMs: number;
  orePerSwing: number;
  veinChance: number;
}

export interface MineRun {
  /** ms of the run actually simulated (elapsed, capped). */
  elapsed: number;
  capped: boolean;
  swings: number;
  ore: number;
  veins: number;
  /** What the pet is doing at the end of the simulated window. */
  phase: 'swinging' | 'resting';
  output: ModuleOutput;
}

function planMine(input: ModuleInput): MinePlan {
  const v = (k: StatKey): number => (input.pet ? input.pet.stats[k].value : 0);
  return {
    swingMs: mineSwingMs(v('run')),
    swingsPerBout: mineSwingsPerBout(v('stamina')),
    restMs: mineRestMs(v('swim')),
    orePerSwing: mineOrePerSwing(v('power')),
    veinChance: mineVeinChance(v('fly')),
  };
}

/** Power-up tier from a vein: Power digs deeper; Fly's luck helps. */
function rollTier(power: number, fly: number, rng: Rng): Tier {
  const luck = fly / 999;
  const p3 = Math.max(0, (power - 200) / 1200) + luck * 0.06;
  const p2 = Math.min(0.55, power / 400) + luck * 0.12;
  const r = rng.next();
  if (r < p3) return 3;
  if (r < p3 + p2) return 2;
  return 1;
}

/** Replay a run. The cap is applied here so collection and preview agree. */
export function simulateMine(input: ModuleInput, seed: number, elapsedMs: number): MineRun {
  const plan = planMine(input);
  const rng = new Rng(seed);
  const power = input.pet ? input.pet.stats.power.value : 0;
  const fly = input.pet ? input.pet.stats.fly.value : 0;
  const capped = elapsedMs > MINE_CAP;
  const elapsed = Math.max(0, Math.min(elapsedMs, MINE_CAP));

  const stacks = new Map<PowerUpKey, PowerUpStack>();
  let t = 0;
  let swings = 0;
  let ore = 0;
  let veins = 0;
  let swingsThisBout = 0;
  let phase: MineRun['phase'] = 'swinging';

  while (t + plan.swingMs <= elapsed && swings < MAX_SWINGS) {
    t += plan.swingMs;
    swings += 1;
    swingsThisBout += 1;

    const hitVein = (MINE_FIRST_SWING_IS_VEIN && swings === 1) || rng.chance(plan.veinChance);
    if (hitVein) {
      veins += 1;
      mergePowerUp(stacks, rng.pick(STAT_KEYS), rollTier(power, fly, rng), rollFlavor(rng));
    } else {
      ore += plan.orePerSwing;
    }

    if (swingsThisBout < plan.swingsPerBout) continue;
    swingsThisBout = 0;
    if (t + plan.restMs > elapsed) {
      phase = 'resting';
      break;
    }
    t += plan.restMs;
  }

  return {
    elapsed,
    capped,
    swings,
    ore,
    veins,
    phase,
    output: {
      currency: ore,
      statDeltas: zeroStats(),
      items: [...stacks.values()],
      flags: swings > 0 ? ['mine.first-run'] : [],
    },
  };
}
