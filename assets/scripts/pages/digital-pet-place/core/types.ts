// types.ts — the vocabulary of the garden (docs/digital-pet-place.md). core/ is
// plain data and pure functions, deliberately free of Phaser, so the rules can
// be reasoned about without a renderer.

export type StatKey = 'swim' | 'fly' | 'run' | 'power' | 'stamina';
export const STAT_KEYS: readonly StatKey[] = ['swim', 'fly', 'run', 'power', 'stamina'];

export type Grade = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
export const GRADES: readonly Grade[] = ['E', 'D', 'C', 'B', 'A', 'S'];

export type Flavor = 'hero' | 'neutral' | 'dark';
export const FLAVORS: readonly Flavor[] = ['hero', 'neutral', 'dark'];

export type Tier = 1 | 2 | 3;

export type Stage = 'hatchling' | 'juvenile' | 'adult' | 'cocoon';

/** Alignment bracket — the evolution input derived from the −100..+100 number. */
export type Bracket = 'hero' | 'neutral' | 'dark';

export interface Stat {
  /** 0–999. The number modules read. */
  value: number;
  /** 0–99. What feeding raises. */
  level: number;
  /** Fixed at birth; how much Value each Level is worth. */
  grade: Grade;
  /** Progress toward the next Level, in power-up points. */
  progress: number;
}

/** The visible record of how a pet was raised: highest stat + alignment bracket. */
export interface Form {
  stat: StatKey;
  bracket: Bracket;
}

export interface Pet {
  id: string;
  name: string;
  stats: Record<StatKey, Stat>;
  /** −100 (Dark) … 0 … +100 (Hero). */
  alignment: number;
  /** 0–100. */
  happiness: number;
  /** Active garden time lived, ms. Does not advance while dispatched. */
  age: number;
  stage: Stage;
  /** null until Juvenile. Re-evaluated at Adult. */
  form: Form | null;
  /** Module id the pet is currently dispatched to, or null when home. */
  away: string | null;
  /** Garden-clock timestamps (ms) before which a module will refuse this pet. */
  cooldowns: Partial<Record<string, number>>;
  /** Position in the garden, in game units. */
  x: number;
  y: number;
  /** Petting rate limiter: garden-clock window start + count inside it. */
  petWindowStart: number;
  petWindowCount: number;
  generation: number;
}

export interface Egg {
  id: string;
  grades: Record<StatKey, Grade>;
  /** Level carryover from a reincarnation; zero for a fresh egg. */
  levels: Record<StatKey, number>;
  generation: number;
}

/** Inventory key for a power-up stack: `${stat}:${tier}:${flavor}`. */
export type PowerUpKey = `${StatKey}:${Tier}:${Flavor}`;

export interface PowerUp {
  stat: StatKey;
  tier: Tier;
  flavor: Flavor;
}

export interface Inventory {
  powerups: Partial<Record<PowerUpKey, number>>;
  eggs: Egg[];
}

/** What a module may hand back. See §6 of the design — nothing else is legal. */
export type ItemStack =
  | { kind: 'powerup'; stat: StatKey; tier: Tier; flavor: Flavor; count: number }
  | { kind: 'egg'; egg: Egg };

export interface ModuleInput {
  pet: Readonly<Pet> | null;
  inventory: Readonly<Inventory>;
  flags: readonly string[];
}

export interface ModuleOutput {
  currency: number;
  statDeltas: Record<StatKey, number>;
  items: ItemStack[];
  flags: string[];
}

/** An idle-module run the garden is holding open (design §7.4). */
export interface MineDispatch {
  module: 'mine';
  petId: string;
  /** Wall-clock ms when the pet went down. Idle modules run on wall-clock. */
  startedAt: number;
  /** Seed for the deterministic replay: same elapsed + same seed = same haul. */
  seed: number;
}

export interface Milestones {
  firstHatch: boolean;
  firstEvolution: boolean;
  firstReincarnation: boolean;
}

export interface SaveFile {
  version: 1;
  /** Total active garden time, ms. The garden's clock. */
  clock: number;
  coins: number;
  pets: Pet[];
  inventory: Inventory;
  flags: string[];
  /** Open idle-module runs. Empty when every pet is home. */
  dispatches: MineDispatch[];
  milestones: Milestones;
  /** RNG state — advances on every roll so reloads don't replay the same luck. */
  seed: number;
  /** Wall-clock of the last save, for display only. */
  savedAt: number;
}

export function powerUpKey(stat: StatKey, tier: Tier, flavor: Flavor): PowerUpKey {
  return `${stat}:${tier}:${flavor}`;
}

export function parsePowerUpKey(key: string): PowerUp | null {
  const [stat, tier, flavor] = key.split(':');
  if (!STAT_KEYS.includes(stat as StatKey)) return null;
  const t = Number(tier);
  if (t !== 1 && t !== 2 && t !== 3) return null;
  if (!FLAVORS.includes(flavor as Flavor)) return null;
  return { stat: stat as StatKey, tier: t, flavor: flavor as Flavor };
}

export function zeroStats(): Record<StatKey, number> {
  return { swim: 0, fly: 0, run: 0, power: 0, stamina: 0 };
}

export type PowerUpStack = ItemStack & { kind: 'powerup' };

/** Accumulate one power-up into a keyed stack map (a module's haul). */
export function mergePowerUp(stacks: Map<PowerUpKey, PowerUpStack>, stat: StatKey, tier: Tier, flavor: Flavor): void {
  const key = powerUpKey(stat, tier, flavor);
  const existing = stacks.get(key);
  if (existing) {
    existing.count += 1;
    return;
  }
  stacks.set(key, { kind: 'powerup', stat, tier, flavor, count: 1 });
}

export function countPowerUps(items: readonly ItemStack[]): number {
  return items.reduce((n, item) => n + (item.kind === 'powerup' ? item.count : 0), 0);
}
