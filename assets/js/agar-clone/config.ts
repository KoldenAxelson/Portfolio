// config.ts — single source of truth for the game's tunables. Everything that
// shapes the simulation is read from here, so the bot engine can later be swapped
// for a real server without the renderer / camera / UI ever caring.

export const CONFIG = {
  // ── Spec-level knobs ──────────────────────────────────────────────────────
  TOTAL_ENTITIES: 20, // includes the player + the Konrad bot
  WORLD_SIZE: 3000, // world is a WORLD_SIZE × WORLD_SIZE square
  FOOD_COUNT: 300, // pellets kept alive at all times (respawn on eat)
  KONRAD_SIZE_ADVANTAGE: 3.5, // multiplier over the default start mass
  BOT_RESPAWN_DELAY_MS: 2000, // dummy/visitor bot respawn delay after death

  // ── Derived / physics knobs ──────────────────────────────────────────────
  START_MASS: 24, // default spawn mass for player + dummy bots
  FOOD_MASS: 1.2, // mass gained per pellet
  RADIUS_SCALE: 4.0, // radius = sqrt(mass) * RADIUS_SCALE  (in world units)
  EAT_RATIO: 1.1, // eater radius must be ≥ this × prey radius
  // Eat once the eater covers the prey's centre: distance < eaterR − EAT_OVERLAP·preyR.
  // Small value ⇒ eating triggers on solid overlap, not near-perfect concentricity.
  EAT_OVERLAP: 0.15,

  // Movement: top speed (world units / second) tapers as mass grows. Velocity
  // is eased toward the desired heading (inertia), so cells steer like ships.
  BASE_SPEED: 320,
  SPEED_FALLOFF: 0.30, // speed = BASE_SPEED * (START_MASS / mass) ^ SPEED_FALLOFF
  KONRAD_SPEED_PENALTY: 0.78, // extra multiplier on Konrad's speed — he lumbers
  STEER_ACCEL: 3.0, // how fast velocity chases the desired heading (lower = floatier)
  MIN_MASS: 6, // a cell can never be reduced below this

  // Dash (SPACE for the player; bots dash by personality): an instant impulse in
  // the heading direction, then a cooldown. DASH_DURATION is just the glow.
  DASH_IMPULSE: 900, // velocity kick (world units / sec) added on dash
  DASH_DURATION_MS: 180,
  DASH_COOLDOWN_MS: 2600,

  // Bullets (SHIFT): unlock at FIRE_MIN_MASS points, cost FIRE_COST_FRAC of your
  // mass per shot, and deal BULLET_DAMAGE_MULT × that cost in damage on hit.
  FIRE_MIN_MASS: 50, // points needed before bullets unlock
  FIRE_COST_FRAC: 1 / 50, // mass spent per shot
  FIRE_COOLDOWN_MS: 280, // min gap between the player's shots
  BULLET_SPEED: 720, // world units / sec
  BULLET_LIFE_MS: 1100, // bullet despawns after this
  BULLET_RADIUS: 7, // world units
  BULLET_DAMAGE_MULT: 2, // damage = this × the mass spent firing
  HIT_PICKUP_LOCK_MS: 750, // after being shot, can't pick up points for this long

  // Bot shooting.
  BOT_FIRE_RANGE: 560, // bots only shoot at targets within this range
  BOT_FIRE_COOLDOWN_MS: 1100, // min gap between a bot's shots

  // AI search + parry tuning.
  FOOD_SCAN_RADIUS: 420, // how far a bot looks for a pellet (local grid search)
  PARRY_SCAN_RANGE: 160, // parry bots react to bullets within this distance
  PARRY_ALIGN: 0.78, // ...that are heading within this cosine of straight at them
  FACING_MIN_SPEED: 25, // below this speed, keep the last heading for aiming

  // Dropped-loot dots (from bullet damage): how they scatter as collectable food.
  EXPLODE_DOT_MASS: 5, // mass per scattered dot
  EXPLODE_MAX_DOTS: 60,
  EXPLODE_SPEED: 260, // initial outward speed of dots (world units / sec)
  EJECTED_FRICTION: 4.0, // per-second velocity decay for moving dots

  // Slow mass bleed so the largest cells don't grow without bound (Agar-ish).
  MASS_DECAY_PER_SEC: 0.0016, // fraction of mass lost per second, above START_MASS

  // Bot AI tuning.
  BOT_VISION: 620, // how far a bot "sees" prey / threats (world units)
  KONRAD_VISION: 820,

  // Behavioural noise for the visitor/dummy bots (makes them feel human).
  NOISE_HESITATE_MIN_MS: 50,
  NOISE_HESITATE_MAX_MS: 200,
  NOISE_HESITATE_CHANCE: 0.012, // per-update chance to begin a hesitation
  NOISE_JITTER_DEG: 15, // ±degrees of aim jitter
  NOISE_FLEE_LAG_MIN_MS: 100,
  NOISE_FLEE_LAG_MAX_MS: 300,
} as const;

// Fixed, immediately-recognisable accent for the Konrad bot.
export const KONRAD_COLOR = '#f59e0b';

// Bullets are always red; red is excluded from cell/food colours (see randColor)
// so bullets read unambiguously as projectiles.
export const BULLET_COLOR = '#ef4444';

// radius (world units) for a given mass.
export function radiusOf(mass: number): number {
  return Math.sqrt(mass) * CONFIG.RADIUS_SCALE;
}

// movement speed (world units / second) for a given mass.
export function speedOf(mass: number): number {
  return CONFIG.BASE_SPEED * Math.pow(CONFIG.START_MASS / mass, CONFIG.SPEED_FALLOFF);
}

// ── Bot personalities ────────────────────────────────────────────────────────
// Each visitor/dummy bot is assigned one of these on spawn, so the field feels
// like a roomful of differently-behaved players rather than one cloned brain.

export type Personality =
  | 'aggressive'
  | 'cautious'
  | 'forager'
  | 'wanderer'
  | 'hunter'
  | 'opportunist';

export interface Traits {
  visionMul: number; // multiplies the base vision radius
  aggression: number; // 0–1 — how far it will commit to chasing prey
  caution: number; // 0–1 — how early / far it reacts to threats
  foodFocus: number; // 0–1 — preference for pellets over hunting cells
  wander: number; // 0–1 — tendency to roam when nothing's nearby
  fleeLagMul: number; // multiplies the human flee-reaction delay (lower = snappier)
  targetsBiggest: boolean; // hunters lock the largest edible prey, not the nearest
}

export const PERSONALITIES: Record<Personality, Traits> = {
  aggressive: { visionMul: 1.2, aggression: 0.95, caution: 0.25, foodFocus: 0.2, wander: 0.35, fleeLagMul: 0.6, targetsBiggest: false },
  cautious: { visionMul: 1.3, aggression: 0.4, caution: 0.95, foodFocus: 0.6, wander: 0.45, fleeLagMul: 1.4, targetsBiggest: false },
  forager: { visionMul: 1.0, aggression: 0.4, caution: 0.65, foodFocus: 0.95, wander: 0.55, fleeLagMul: 1.0, targetsBiggest: false },
  wanderer: { visionMul: 0.9, aggression: 0.5, caution: 0.5, foodFocus: 0.5, wander: 0.95, fleeLagMul: 1.0, targetsBiggest: false },
  hunter: { visionMul: 1.4, aggression: 0.9, caution: 0.45, foodFocus: 0.15, wander: 0.2, fleeLagMul: 0.8, targetsBiggest: true },
  opportunist: { visionMul: 1.1, aggression: 0.7, caution: 0.6, foodFocus: 0.55, wander: 0.4, fleeLagMul: 0.9, targetsBiggest: false },
};

export const PERSONALITY_KEYS = Object.keys(PERSONALITIES) as Personality[];

// Konrad's apex brain — wide-eyed, fearless, always hunting.
export const KONRAD_TRAITS: Traits = {
  visionMul: 1.0,
  aggression: 1.0,
  caution: 0.15,
  foodFocus: 0.25,
  wander: 0.25,
  fleeLagMul: 0.5,
  targetsBiggest: true,
};

export function randomPersonality(): Personality {
  return PERSONALITY_KEYS[Math.floor(Math.random() * PERSONALITY_KEYS.length)];
}

// ── Bot dash styles ──────────────────────────────────────────────────────────
// Independent of personality so the field has a believable spread of skill:
//   spammer     — dashes the instant it's off cooldown when engaged
//   opportunist — dashes to close a kill or escape a threat
//   parry       — saves the dash to deflect incoming bullets (and to escape)
//   noob        — never figured out you can dash
export type DashStyle = 'spammer' | 'opportunist' | 'parry' | 'noob';

export function randomDashStyle(): DashStyle {
  const r = Math.random();
  if (r < 0.24) return 'spammer';
  if (r < 0.58) return 'opportunist';
  if (r < 0.8) return 'parry';
  return 'noob';
}

// ── Toroidal (looping) world geometry ────────────────────────────────────────
// The world wraps at every edge, so there are no walls or corners to hide in.

// Wrap a coordinate back into [0, WORLD_SIZE).
export function wrapCoord(v: number): number {
  const w = CONFIG.WORLD_SIZE;
  return ((v % w) + w) % w;
}

// Shortest signed delta from `from` to `target` across the seam (range ±W/2).
export function wrapDelta(target: number, from: number): number {
  const w = CONFIG.WORLD_SIZE;
  let d = target - from;
  if (d > w / 2) d -= w;
  else if (d < -w / 2) d += w;
  return d;
}

// Squared wrap-aware distance between two points.
export function torusDist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = wrapDelta(ax, bx);
  const dy = wrapDelta(ay, by);
  return dx * dx + dy * dy;
}
