// bot.ts — bot AI built as an explicit state machine. Every tick a bot re-picks
// one of four states — FLEE, CHASE, GATHER, WANDER — from what's around it, and
// that state sets where it wants to go. Personality traits tune the thresholds;
// the dash *style* decides how it spends its dash (spam / opportunist / parry /
// noob). Food is found via a local grid query, not a full scan. Pure logic.

import {
  CONFIG,
  KONRAD_TRAITS,
  PERSONALITIES,
  radiusOf,
  torusDist2,
  wrapCoord,
  wrapDelta,
  type Traits,
} from './config';
import type { FoodGrid } from './grid';
import type { Bullet, BotState, Entity } from './types';

export interface Steer {
  tx: number; // world-space point the entity wants to move toward
  ty: number;
  dash: boolean; // wants to dash this frame (game gates on cooldown)
  fire: boolean; // wants to shoot this frame (game gates on mass + cooldown)
}

function traitsFor(self: Entity): Traits {
  if (self.kind === 'konrad') return KONRAD_TRAITS;
  return PERSONALITIES[self.personality ?? 'wanderer'];
}

function wanderTarget(self: Entity, traits: Traits, now: number): { tx: number; ty: number } {
  const reached =
    self.wanderX === undefined ||
    self.wanderY === undefined ||
    (self.wanderUntil !== undefined && now >= self.wanderUntil) ||
    torusDist2(self.x, self.y, self.wanderX, self.wanderY) < 70 * 70;
  if (reached) {
    const ang = Math.random() * Math.PI * 2;
    const reach = 300 + Math.random() * 900 * (0.4 + traits.wander);
    self.wanderX = wrapCoord(self.x + Math.cos(ang) * reach);
    self.wanderY = wrapCoord(self.y + Math.sin(ang) * reach);
    self.wanderUntil = now + 900 + Math.random() * 1800;
  }
  return { tx: self.wanderX as number, ty: self.wanderY as number };
}

// Is an enemy bullet bearing down on `self` right now? (Used by parry bots.)
function bulletIncoming(self: Entity, bullets: Bullet[]): boolean {
  const range2 = CONFIG.PARRY_SCAN_RANGE * CONFIG.PARRY_SCAN_RANGE;
  for (const b of bullets) {
    if (b.ownerId === self.id) continue;
    const dx = wrapDelta(self.x, b.x); // bullet → self
    const dy = wrapDelta(self.y, b.y);
    const d2 = dx * dx + dy * dy;
    if (d2 > range2) continue;
    const d = Math.sqrt(d2) || 1;
    const bs = Math.hypot(b.vx, b.vy) || 1;
    // Cosine between the bullet's heading and the direction to us.
    const align = (b.vx * dx + b.vy * dy) / (bs * d);
    if (align > CONFIG.PARRY_ALIGN) return true;
  }
  return false;
}

export function steerBot(
  self: Entity,
  entities: Entity[],
  grid: FoodGrid,
  bullets: Bullet[],
  now: number,
): Steer {
  const isKonrad = self.kind === 'konrad';
  const traits = traitsFor(self);
  const baseVision = isKonrad ? CONFIG.KONRAD_VISION : CONFIG.BOT_VISION;
  const vision = baseVision * traits.visionMul;
  const selfR = radiusOf(self.mass);

  // ── Human noise (dummy bots only): occasional distracted pauses ───────────
  if (!isKonrad) {
    if (self.hesitateUntil && now < self.hesitateUntil) {
      self.state = 'wander';
      return { tx: self.x, ty: self.y, dash: false, fire: false };
    }
    if (!self.hesitateUntil && Math.random() < CONFIG.NOISE_HESITATE_CHANCE) {
      const span =
        CONFIG.NOISE_HESITATE_MIN_MS +
        Math.random() * (CONFIG.NOISE_HESITATE_MAX_MS - CONFIG.NOISE_HESITATE_MIN_MS);
      self.hesitateUntil = now + span;
      self.state = 'wander';
      return { tx: self.x, ty: self.y, dash: false, fire: false };
    }
    if (self.hesitateUntil && now >= self.hesitateUntil) self.hesitateUntil = undefined;
  }

  const threatRange = vision * (0.7 + 0.5 * traits.caution);
  const preyRange = vision * (0.4 + 0.6 * traits.aggression);
  const threatRange2 = threatRange * threatRange;
  const preyRange2 = preyRange * preyRange;

  // ── Perceive: nearest threat + best prey among entities ───────────────────
  let threat: Entity | null = null;
  let threatD2 = Infinity;
  let prey: Entity | null = null;
  let preyScore = -Infinity;

  for (const e of entities) {
    if (e === self || !e.alive) continue;
    const d2 = torusDist2(self.x, self.y, e.x, e.y);
    const eR = radiusOf(e.mass);
    if (eR >= selfR * CONFIG.EAT_RATIO) {
      if (d2 < threatRange2 && d2 < threatD2) {
        threatD2 = d2;
        threat = e;
      }
    } else if (selfR >= eR * CONFIG.EAT_RATIO && d2 < preyRange2) {
      const score = traits.targetsBiggest ? e.mass - d2 / 50000 : -d2;
      if (score > preyScore) {
        preyScore = score;
        prey = e;
      }
    }
  }

  // Nearest pellet via a *local* grid search (not a full food scan).
  const food = grid.nearest(self.x, self.y, CONFIG.FOOD_SCAN_RADIUS);

  // Flee reaction delay (dummies hesitate before bolting; Konrad reacts instantly).
  let reactingToThreat = false;
  if (threat) {
    if (isKonrad) {
      reactingToThreat = true;
    } else {
      if (!self.fleeReadyAt) {
        const lag =
          (CONFIG.NOISE_FLEE_LAG_MIN_MS +
            Math.random() * (CONFIG.NOISE_FLEE_LAG_MAX_MS - CONFIG.NOISE_FLEE_LAG_MIN_MS)) *
          traits.fleeLagMul;
        self.fleeReadyAt = now + lag;
      }
      reactingToThreat = self.fleeReadyAt !== undefined && now >= self.fleeReadyAt;
    }
  } else {
    self.fleeReadyAt = undefined;
  }

  // ── Decide state (the live-swapped FSM) ───────────────────────────────────
  let state: BotState;
  if (threat && reactingToThreat) {
    state = 'flee';
  } else {
    const preyDist = prey ? Math.sqrt(torusDist2(self.x, self.y, prey.x, prey.y)) : Infinity;
    const preyValue = prey ? traits.aggression / (1 + preyDist / vision) : -1;
    const foodDist = food ? Math.sqrt(torusDist2(self.x, self.y, food.x, food.y)) : Infinity;
    const foodValue = food ? traits.foodFocus / (1 + foodDist / vision) : -1;
    if (prey && preyValue >= foodValue) state = 'chase';
    else if (food && foodValue > 0) state = 'gather';
    else state = 'wander';
  }
  self.state = state;

  // ── Act: turn the state into a movement target ────────────────────────────
  let tx: number;
  let ty: number;
  switch (state) {
    case 'flee': {
      // World loops, so straight away from the threat is always an escape.
      const ax = -wrapDelta((threat as Entity).x, self.x);
      const ay = -wrapDelta((threat as Entity).y, self.y);
      const al = Math.hypot(ax, ay) || 1;
      tx = wrapCoord(self.x + (ax / al) * 400);
      ty = wrapCoord(self.y + (ay / al) * 400);
      break;
    }
    case 'chase':
      tx = (prey as Entity).x;
      ty = (prey as Entity).y;
      break;
    case 'gather':
      tx = (food as { x: number; y: number }).x;
      ty = (food as { x: number; y: number }).y;
      break;
    default: {
      const w = wanderTarget(self, traits, now);
      tx = w.tx;
      ty = w.ty;
    }
  }

  // Imprecise targeting (dummy bots only): a few degrees of aim jitter.
  if (!isKonrad) {
    const jitter = ((Math.random() * 2 - 1) * CONFIG.NOISE_JITTER_DEG * Math.PI) / 180;
    const dx = wrapDelta(tx, self.x);
    const dy = wrapDelta(ty, self.y);
    const ang = Math.atan2(dy, dx) + jitter;
    const reach = Math.hypot(dx, dy) || 1;
    tx = wrapCoord(self.x + Math.cos(ang) * reach);
    ty = wrapCoord(self.y + Math.sin(ang) * reach);
  }

  // ── Dash decision (by dash style + state) ─────────────────────────────────
  const dashReady = now >= (self.dashReadyAt ?? 0);
  let dash = false;
  if (dashReady) {
    switch (self.dashStyle) {
      case 'spammer':
        dash = state === 'flee' || state === 'chase';
        break;
      case 'opportunist':
        if (state === 'flee') dash = true;
        else if (state === 'chase' && prey) {
          const pd2 = torusDist2(self.x, self.y, prey.x, prey.y);
          const close = selfR + radiusOf(prey.mass) + 90;
          dash = pd2 > close * close;
        }
        break;
      case 'parry':
        // Spend the dash to deflect a shot; otherwise only to escape.
        dash = bulletIncoming(self, bullets) || state === 'flee';
        break;
      default: // 'noob'
        dash = false;
    }
  }

  // ── Fire decision ─────────────────────────────────────────────────────────
  // Only while chasing (so the shot, which flies along the heading, goes at prey)
  // and within range; cadence scales with aggression. Game gates mass + cooldown.
  let fire = false;
  if (state === 'chase' && prey) {
    const pd2 = torusDist2(self.x, self.y, prey.x, prey.y);
    if (pd2 < CONFIG.BOT_FIRE_RANGE * CONFIG.BOT_FIRE_RANGE && Math.random() < traits.aggression * 0.05) {
      fire = true;
    }
  }

  return { tx, ty, dash, fire };
}
