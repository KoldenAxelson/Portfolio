// garden.ts — the persistent core: pets, inventory, clock, save. Modules never
// touch it directly; they take a read-only ModuleInput and return a
// ModuleOutput that applyModuleResult() absorbs (design §6).

import type {
  Egg,
  Flavor,
  Grade,
  Inventory,
  ItemStack,
  Milestones,
  MineDispatch,
  ModuleInput,
  ModuleOutput,
  Pet,
  PowerUp,
  PowerUpKey,
  SaveFile,
  Stat,
  StatKey,
  Tier,
} from './types';
import { GRADES, STAT_KEYS, parsePowerUpKey, powerUpKey, zeroStats } from './types';
import {
  ADULT_AT,
  BREED_COOLDOWN,
  BREED_MIN_HAPPINESS,
  BREED_MUTATE_DOWN,
  BREED_MUTATE_UP,
  COCOON_AT,
  COCOON_DURATION,
  FLAVOR_ALIGNMENT,
  GARDEN_CAPACITY,
  GRADE_GAIN,
  HAPPINESS_DECAY_EVERY,
  HAPPINESS_FEED,
  HAPPINESS_PET,
  HAPPINESS_PET_CAP_PER_MIN,
  HAPPINESS_RETURN,
  JUVENILE_AT,
  MAX_LEVEL,
  MAX_VALUE,
  MODULE_MINE,
  SHOP_EGG_PRICE,
  STARTER_EGGS,
  TIER_POINTS,
  carryoverFraction,
  levelCost,
} from './rules';
import { Rng, randomSeed } from './rng';
import { evaluateForm, hatchEgg, makeEgg, makeStarterEgg } from './pet';
import { simulateMine } from '../modules/mine';
import type { MineRun } from '../modules/mine';
import { buyPrice, sellPrice } from '../modules/shop';

/** Things that happen on the clock, which no player action returns directly. */
type GardenEvent =
  | { type: 'evolved'; pet: Pet }
  | { type: 'cocooned'; pet: Pet }
  | { type: 'reincarnated'; name: string }
  | { type: 'milestone'; which: keyof Milestones };

type Listener = (e: GardenEvent) => void;

export interface FeedResult {
  ok: boolean;
  leveled: boolean;
  tier: Tier | 0;
}

export type Verdict = { ok: true } | { ok: false; reason: string };
const refuse = (reason: string): Verdict => ({ ok: false, reason });
const minutesLeft = (until: number, clock: number): number => Math.ceil((until - clock) / 60_000);

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export class Garden {
  clock = 0;
  coins = 0;
  pets: Pet[] = [];
  inventory: Inventory = { powerups: {}, eggs: [] };
  flags: string[] = [];
  dispatches: MineDispatch[] = [];
  milestones: Milestones = { firstHatch: false, firstEvolution: false, firstReincarnation: false };
  rng: Rng;

  private listeners: Listener[] = [];
  private decayAcc = 0;
  private dirty = false;

  constructor(seed = randomSeed()) {
    this.rng = new Rng(seed);
  }

  // ── lifecycle ─────────────────────────────────────────────────────────────

  static fresh(): Garden {
    const g = new Garden();
    for (let i = 0; i < STARTER_EGGS; i++) g.inventory.eggs.push(makeStarterEgg(g.rng));
    return g;
  }

  static fromSave(save: SaveFile): Garden {
    const g = new Garden(save.seed);
    g.clock = save.clock;
    g.coins = save.coins;
    g.pets = save.pets;
    g.inventory = save.inventory;
    g.flags = save.flags;
    g.dispatches = save.dispatches.filter((d) => save.pets.some((p) => p.id === d.petId));
    g.milestones = save.milestones;
    // Idle runs survive a reload; an active one (a night) does not — the pet
    // comes home with nothing, but comes home.
    const mining = new Set(g.dispatches.map((d) => d.petId));
    for (const p of g.pets) if (!mining.has(p.id)) p.away = null;
    return g;
  }

  toSave(): SaveFile {
    return {
      version: 1,
      clock: this.clock,
      coins: this.coins,
      pets: this.pets,
      inventory: this.inventory,
      flags: this.flags,
      dispatches: this.dispatches,
      milestones: this.milestones,
      seed: this.rng.state,
      savedAt: Date.now(),
    };
  }

  on(fn: Listener): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private emit(e: GardenEvent): void {
    for (const l of this.listeners) l(e);
  }

  private touch(): void {
    this.dirty = true;
  }

  /** True once since the last consumeDirty(); the save layer polls this. */
  consumeDirty(): boolean {
    const d = this.dirty;
    this.dirty = false;
    return d;
  }

  // ── time ──────────────────────────────────────────────────────────────────

  /** Advance active garden time. The caller clamps dt, so a stalled frame never becomes a stalled hour. */
  tick(dt: number): void {
    if (dt <= 0) return;
    this.clock += dt;
    const decaySteps = this.consumeDecay(dt);

    for (const pet of [...this.pets]) {
      if (pet.away) continue; // dispatched pets neither age nor decay
      pet.happiness = clamp(pet.happiness - decaySteps, 0, 100);
      pet.age += dt;
      this.advanceStage(pet);
    }
    if (decaySteps) this.touch();
  }

  private consumeDecay(dt: number): number {
    this.decayAcc += dt;
    const steps = Math.floor(this.decayAcc / HAPPINESS_DECAY_EVERY);
    this.decayAcc -= steps * HAPPINESS_DECAY_EVERY;
    return steps;
  }

  private advanceStage(pet: Pet): void {
    if (pet.stage === 'hatchling' && pet.age >= JUVENILE_AT) return this.evolve(pet, 'juvenile');
    if (pet.stage === 'juvenile' && pet.age >= ADULT_AT) return this.evolve(pet, 'adult');
    if (pet.stage === 'cocoon' && pet.age >= COCOON_AT + COCOON_DURATION) return this.reincarnate(pet);
    if (pet.stage !== 'adult' || pet.age < COCOON_AT) return;
    pet.stage = 'cocoon';
    this.touch();
    this.emit({ type: 'cocooned', pet });
  }

  private evolve(pet: Pet, stage: 'juvenile' | 'adult'): void {
    pet.stage = stage;
    pet.form = evaluateForm(pet);
    this.touch();
    this.emit({ type: 'evolved', pet });
    this.milestone('firstEvolution');
  }

  private reincarnate(pet: Pet): void {
    const frac = carryoverFraction(pet.happiness);
    const grades = {} as Record<StatKey, Grade>;
    const levels = {} as Record<StatKey, number>;
    for (const k of STAT_KEYS) {
      grades[k] = pet.stats[k].grade;
      levels[k] = Math.floor(pet.stats[k].level * frac);
    }
    const egg = makeEgg(grades, levels, pet.generation + 1);
    this.pets = this.pets.filter((p) => p !== pet);
    this.inventory.eggs.push(egg);
    this.touch();
    this.emit({ type: 'reincarnated', name: pet.name });
    this.milestone('firstReincarnation');
  }

  private milestone(which: keyof Milestones): void {
    if (this.milestones[which]) return;
    this.milestones[which] = true;
    this.touch();
    this.emit({ type: 'milestone', which });
  }

  // ── player actions ────────────────────────────────────────────────────────

  get isFull(): boolean {
    return this.pets.length >= GARDEN_CAPACITY;
  }

  hatch(eggId: string, x: number, y: number): Pet | null {
    if (this.isFull) return null;
    const idx = this.inventory.eggs.findIndex((e) => e.id === eggId);
    if (idx < 0) return null;
    const [egg] = this.inventory.eggs.splice(idx, 1);
    const pet = hatchEgg(egg, this.rng, x, y);
    this.pets.push(pet);
    this.touch();
    this.milestone('firstHatch');
    return pet;
  }

  /** Click-to-pet. Returns whether it counted against the per-minute cap. */
  pet(pet: Pet): boolean {
    if (this.clock - pet.petWindowStart >= 60_000) {
      pet.petWindowStart = this.clock;
      pet.petWindowCount = 0;
    }
    if (pet.petWindowCount >= HAPPINESS_PET_CAP_PER_MIN) return false;
    pet.petWindowCount += 1;
    pet.happiness = clamp(pet.happiness + HAPPINESS_PET, 0, 100);
    this.touch();
    return true;
  }

  /** Count of a flavor of a stat across all tiers. */
  countPowerUps(stat: StatKey, flavor: Flavor): number {
    let n = 0;
    for (const tier of [1, 2, 3] as Tier[]) n += this.inventory.powerups[powerUpKey(stat, tier, flavor)] ?? 0;
    return n;
  }

  countStat(stat: StatKey): number {
    return this.countPowerUps(stat, 'hero') + this.countPowerUps(stat, 'neutral') + this.countPowerUps(stat, 'dark');
  }

  totalPowerUps(): number {
    let n = 0;
    for (const v of Object.values(this.inventory.powerups)) n += v ?? 0;
    return n;
  }

  private bestTierInPouch(stat: StatKey, flavor: Flavor): Tier | 0 {
    return ([3, 2, 1] as Tier[]).find((t) => (this.inventory.powerups[powerUpKey(stat, t, flavor)] ?? 0) > 0) ?? 0;
  }

  private removePowerUps(key: PowerUpKey, count: number): void {
    const left = (this.inventory.powerups[key] ?? 0) - count;
    if (left > 0) this.inventory.powerups[key] = left;
    else delete this.inventory.powerups[key];
  }

  /** Feed the best-tier power-up of (stat, flavor) in the pouch to a pet. */
  feed(pet: Pet, stat: StatKey, flavor: Flavor): FeedResult {
    const refused: FeedResult = { ok: false, leveled: false, tier: 0 };
    if (pet.away || pet.stage === 'cocoon') return refused;
    const tier = this.bestTierInPouch(stat, flavor);
    if (!tier) return refused;
    this.removePowerUps(powerUpKey(stat, tier, flavor), 1);

    const leveled = this.addProgress(pet.stats[stat], TIER_POINTS[tier]);
    pet.alignment = clamp(pet.alignment + FLAVOR_ALIGNMENT[flavor], -100, 100);
    pet.happiness = clamp(pet.happiness + HAPPINESS_FEED, 0, 100);
    this.touch();
    return { ok: true, leveled, tier };
  }

  /** Fill the level bar; returns whether at least one Level was gained. */
  private addProgress(stat: Stat, points: number): boolean {
    if (stat.level >= MAX_LEVEL) return false;
    stat.progress += points;
    let leveled = false;
    while (stat.level < MAX_LEVEL && stat.progress >= levelCost(stat.level)) {
      stat.progress -= levelCost(stat.level);
      stat.level += 1;
      stat.value = clamp(stat.value + GRADE_GAIN[stat.grade], 0, MAX_VALUE);
      leveled = true;
    }
    if (stat.level >= MAX_LEVEL) stat.progress = 0;
    return leveled;
  }

  // ── modules (design §6) ───────────────────────────────────────────────────

  canDispatch(pet: Pet, moduleId: string): Verdict {
    if (pet.away) return refuse(`${pet.name} is already away`);
    if (pet.stage === 'cocoon') return refuse(`${pet.name} is cocooned`);
    const until = pet.cooldowns[moduleId] ?? 0;
    if (until > this.clock) return refuse(`${pet.name} needs to rest (${minutesLeft(until, this.clock)} min)`);
    return { ok: true };
  }

  dispatch(pet: Pet, moduleId: string): ModuleInput {
    pet.away = moduleId;
    this.touch();
    return { pet, inventory: this.inventory, flags: this.flags };
  }

  applyModuleResult(pet: Pet | null, moduleId: string, out: ModuleOutput, cooldown: number): void {
    this.coins += Math.max(0, Math.floor(out.currency));
    if (pet) {
      for (const k of STAT_KEYS) {
        const d = out.statDeltas[k] ?? 0;
        if (d) pet.stats[k].value = clamp(pet.stats[k].value + d, 0, MAX_VALUE);
      }
      pet.away = null;
      pet.happiness = clamp(pet.happiness + HAPPINESS_RETURN, 0, 100);
      pet.cooldowns[moduleId] = this.clock + cooldown;
    }
    for (const item of out.items) this.addItem(item);
    for (const f of out.flags) if (!this.flags.includes(f)) this.flags.push(f);
    this.touch();
  }

  addItem(item: ItemStack): void {
    if (item.kind === 'powerup') {
      const key = powerUpKey(item.stat, item.tier, item.flavor);
      this.inventory.powerups[key] = (this.inventory.powerups[key] ?? 0) + item.count;
    } else {
      this.inventory.eggs.push(item.egg);
    }
  }

  // ── the mine (idle; design §7) ───────────────────────────────────────────

  dispatchMine(pet: Pet, now = Date.now()): MineDispatch {
    this.dispatch(pet, MODULE_MINE);
    const d: MineDispatch = { module: 'mine', petId: pet.id, startedAt: now, seed: this.rng.int(1, 0x7fffffff) };
    this.dispatches.push(d);
    this.touch();
    return d;
  }

  miningPets(): Array<{ pet: Pet; dispatch: MineDispatch }> {
    const out: Array<{ pet: Pet; dispatch: MineDispatch }> = [];
    for (const d of this.dispatches) {
      const pet = this.pets.find((p) => p.id === d.petId);
      if (pet) out.push({ pet, dispatch: d });
    }
    return out;
  }

  /** Replay a run up to `now` without collecting — the live view. */
  previewMine(d: MineDispatch, now = Date.now()): MineRun {
    const pet = this.pets.find((p) => p.id === d.petId) ?? null;
    return simulateMine({ pet, inventory: this.inventory, flags: this.flags }, d.seed, now - d.startedAt);
  }

  /** Bring the pet up: resolve the run and absorb it. */
  collectMine(d: MineDispatch, now = Date.now()): MineRun | null {
    const pet = this.pets.find((p) => p.id === d.petId) ?? null;
    if (!pet) {
      this.dispatches = this.dispatches.filter((x) => x !== d);
      return null;
    }
    const run = this.previewMine(d, now);
    this.dispatches = this.dispatches.filter((x) => x !== d);
    this.applyModuleResult(pet, MODULE_MINE, run.output, 0);
    return run;
  }

  // ── breeding (design §3.6) ───────────────────────────────────────────────

  canBreed(a: Pet, b: Pet): Verdict {
    if (a === b) return refuse('A pet cannot pair with itself');
    for (const p of [a, b]) {
      if (p.stage !== 'adult') return refuse(`${p.name} is not an adult yet`);
      if (p.happiness < BREED_MIN_HAPPINESS) return refuse(`${p.name} is not happy enough (${p.happiness}/${BREED_MIN_HAPPINESS})`);
      if (p.away) return refuse(`${p.name} is away`);
      const until = p.cooldowns.breed ?? 0;
      if (until > this.clock) return refuse(`${p.name} needs a rest (${minutesLeft(until, this.clock)} min)`);
    }
    return { ok: true };
  }

  /** One parent's grade, or a one-step mutation past the better / below the worse (design §3.6). */
  private inheritGrade(a: Grade, b: Grade): Grade {
    const ia = GRADES.indexOf(a);
    const ib = GRADES.indexOf(b);
    const roll = this.rng.next();
    const mutateEnd = BREED_MUTATE_UP + BREED_MUTATE_DOWN;
    let index: number;
    if (roll < BREED_MUTATE_UP) index = Math.max(ia, ib) + 1;
    else if (roll < mutateEnd) index = Math.min(ia, ib) - 1;
    else index = roll < mutateEnd + (1 - mutateEnd) / 2 ? ia : ib;
    return GRADES[clamp(index, 0, GRADES.length - 1)];
  }

  breed(a: Pet, b: Pet): Egg | null {
    if (!this.canBreed(a, b).ok) return null;
    const grades = {} as Record<StatKey, Grade>;
    for (const k of STAT_KEYS) grades[k] = this.inheritGrade(a.stats[k].grade, b.stats[k].grade);
    const egg = makeEgg(grades, zeroStats(), Math.max(a.generation, b.generation) + 1);
    this.inventory.eggs.push(egg);
    a.cooldowns.breed = this.clock + BREED_COOLDOWN;
    b.cooldowns.breed = this.clock + BREED_COOLDOWN;
    this.touch();
    return egg;
  }

  // ── the shop (design §9) ─────────────────────────────────────────────────

  sell(stat: StatKey, tier: Tier, flavor: Flavor, count = 1): number {
    const key = powerUpKey(stat, tier, flavor);
    const sold = Math.min(this.inventory.powerups[key] ?? 0, count);
    if (sold <= 0) return 0;
    this.removePowerUps(key, sold);
    const earned = sold * sellPrice(tier);
    this.coins += earned;
    this.touch();
    return earned;
  }

  /** Shop stock is Neutral. Returns false when coins are short. */
  buy(stat: StatKey, tier: Tier): boolean {
    const price = buyPrice(tier);
    if (this.coins < price) return false;
    this.coins -= price;
    this.addItem({ kind: 'powerup', stat, tier, flavor: 'neutral', count: 1 });
    this.touch();
    return true;
  }

  /** The base egg: all E grades. The floor, never a shortcut past breeding. */
  buyEgg(): Egg | null {
    if (this.coins < SHOP_EGG_PRICE) return null;
    this.coins -= SHOP_EGG_PRICE;
    const egg = makeEgg({ swim: 'E', fly: 'E', run: 'E', power: 'E', stamina: 'E' }, zeroStats(), 1);
    this.inventory.eggs.push(egg);
    this.touch();
    return egg;
  }

  /** Every non-empty stack, for display. */
  stacks(): Array<PowerUp & { count: number }> {
    const out: Array<PowerUp & { count: number }> = [];
    for (const [key, count] of Object.entries(this.inventory.powerups) as Array<[PowerUpKey, number | undefined]>) {
      const p = parsePowerUpKey(key);
      if (p && count) out.push({ ...p, count });
    }
    return out;
  }
}
