// types.ts — shared entity/food shapes. Kept separate so bot.ts, game.ts and
// renderer.ts can all import the types without creating an import cycle.

import type { DashStyle, Personality } from './config';

export type EntityKind = 'player' | 'konrad' | 'bot';

// What a bot is actively doing this tick (live-swapped by the AI state machine).
export type BotState = 'chase' | 'flee' | 'gather' | 'wander';

export interface Entity {
  id: number;
  kind: EntityKind;
  name: string;
  x: number;
  y: number;
  // Current movement velocity (world units / sec).
  vx: number;
  vy: number;
  mass: number;
  color: string;
  alive: boolean;

  // Heading (unit vector) — the momentum indicator and the direction shots fire.
  facingX?: number;
  facingY?: number;

  // Bots only: scheduled respawn time (ms epoch) while dead.
  respawnAt?: number;

  // Bots only: behavioural personality + dash habit (drive the AI).
  personality?: Personality;
  dashStyle?: DashStyle;
  state?: BotState; // current FSM state (observable for debugging/feel)

  // Visitor/dummy-bot behavioural noise + roaming state.
  hesitateUntil?: number; // paused until this timestamp
  fleeReadyAt?: number; // delayed flee reaction unlocks at this timestamp
  wanderX?: number; // current roam target
  wanderY?: number;
  wanderUntil?: number; // pick a fresh roam target after this timestamp

  // Abilities (any entity). Timestamps are ms-epoch (performance.now()).
  dashActiveUntil?: number; // dashing while now < this (drives the glow)
  dashReadyAt?: number; // dash usable again at this time
  lastFireAt?: number; // last bullet fired — fire-rate gate (player + bots)
  pickupLockUntil?: number; // after a hit, can't eat food/points until this time
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: number; // entity id that fired it (never hits its owner)
  damage: number; // mass removed from whatever it hits
  dieAt: number; // ms-epoch despawn time
}

export interface Food {
  x: number;
  y: number;
  color: string;
  alive: boolean;
  // Ejected dots (from an ESC explosion) move and aren't respawned when eaten.
  vx?: number;
  vy?: number;
  ejected?: boolean;
  mass?: number; // mass granted when eaten (defaults to CONFIG.FOOD_MASS)
}

// One row of the live leaderboard handed to the UI layer.
export interface LeaderRow {
  name: string;
  score: number; // mass, rounded
  isPlayer: boolean;
  isKonrad: boolean;
}

// Everything the canvas-free UI (Alpine) needs each tick.
export interface GameStats {
  score: number;
  leaders: LeaderRow[];
}

export type ToastKind = 'eaten' | 'joined' | 'konrad';

export interface GameCallbacks {
  onToast(message: string, kind: ToastKind): void;
  onStats(stats: GameStats): void;
  onGameOver(score: number): void;
  // Fired when the player triggers a dash; cooldownMs lets the UI animate the meter.
  onDash(cooldownMs: number): void;
}
