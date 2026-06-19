// game.ts — world state + the local simulation loop. This is the ONE file that
// a future multiplayer build replaces: swap `simulate()` for a WebSocket
// `onmessage` handler that applies server-authoritative state, and renderer.ts /
// camera.ts / config.ts / the Alpine UI all keep working unchanged.

import {
  CONFIG,
  KONRAD_COLOR,
  radiusOf,
  randomDashStyle,
  randomPersonality,
  speedOf,
  torusDist2,
  wrapCoord,
  wrapDelta,
} from './config';
import { steerBot } from './bot';
import { Camera } from './camera';
import { FoodGrid } from './grid';
import { Renderer } from './renderer';
import type { Bullet, Entity, Food, GameCallbacks, LeaderRow } from './types';

const DUMMY_BOT_COUNT = Math.max(0, CONFIG.TOTAL_ENTITIES - 2); // minus player + Konrad

function randColor(): string {
  // Keep hue in [35, 320] so cells/food never look red — red is reserved for bullets.
  const h = 35 + Math.floor(Math.random() * 286);
  return `hsl(${h} 70% 58%)`;
}

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cb: GameCallbacks;
  private cam = new Camera();
  private renderer: Renderer;

  private entities: Entity[] = [];
  private food: Food[] = [];
  private bullets: Bullet[] = [];
  private grid = new FoodGrid();
  private player!: Entity;
  private konrad!: Entity;
  private nextId = 0;

  // Name pool (real KV names + dummy padding). `used` tracks live names so two
  // cells don't share one until the pool is exhausted.
  private namePool: string[] = [];
  private used = new Set<string>();

  // Input.
  private pointer: { x: number; y: number } | null = null;
  private keys = new Set<string>();
  // Touch / external control state (set by the on-screen mobile controls).
  private touchSteer: { x: number; y: number } | null = null;
  private touchFiring = false;

  private running = false;
  private rafId = 0;
  private lastTs = 0;
  private statsAccum = 0;
  private lastErrorLog = 0;

  private resizeObserver?: ResizeObserver;
  private boundResize = (): void => this.resize();

  constructor(canvas: HTMLCanvasElement, callbacks: GameCallbacks) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    this.ctx = ctx;
    this.cb = callbacks;
    this.renderer = new Renderer(this.ctx, this.cam);
    this.attachInput();
  }

  setNamePool(names: string[]): void {
    this.namePool = names.slice();
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  start(playerName: string): void {
    this.resize();
    this.spawnFood();
    this.entities = [];
    this.bullets = [];
    this.used.clear();
    this.nextId = 0;

    // Player (id 0).
    this.player = this.makeEntity('player', playerName, CONFIG.START_MASS, randColor());
    this.entities.push(this.player);

    // Konrad (permanent, oversized, lumbering, fixed colour).
    this.konrad = this.makeEntity(
      'konrad',
      'Konrad',
      CONFIG.START_MASS * CONFIG.KONRAD_SIZE_ADVANTAGE,
      KONRAD_COLOR,
    );
    this.entities.push(this.konrad);

    // Visitor / dummy bots.
    for (let i = 0; i < DUMMY_BOT_COUNT; i++) {
      this.entities.push(this.makeEntity('bot', this.drawName(), CONFIG.START_MASS, randColor()));
    }

    // Snap (don't ease) the camera onto the player so the world doesn't slide in
    // and look like the player is auto-moving.
    this.cam.snapTo(this.player.x, this.player.y, radiusOf(this.player.mass));

    this.running = true;
    this.lastTs = performance.now();
    this.statsAccum = 0;
    cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame((t) => this.tick(t));
  }

  // Reset the player after a game-over; the rest of the world keeps running.
  respawnPlayer(): void {
    const p = this.player;
    p.mass = CONFIG.START_MASS;
    p.color = randColor();
    const pos = this.randomSpawnPos();
    p.x = pos.x;
    p.y = pos.y;
    p.vx = 0;
    p.vy = 0;
    p.alive = true;
    // Clear ability state on respawn.
    p.dashActiveUntil = 0;
    p.dashReadyAt = 0;
    p.lastFireAt = 0;
    p.pickupLockUntil = 0;
    this.cam.snapTo(p.x, p.y, radiusOf(p.mass));
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.detachInput();
  }

  // ── Mobile / external control API ──────────────────────────────────────────
  // Steer vector: magnitude 0..1 sets throttle, direction sets heading.
  setSteer(x: number, y: number): void {
    this.touchSteer = { x, y };
  }
  clearSteer(): void {
    this.touchSteer = null;
  }
  setFiring(on: boolean): void {
    this.touchFiring = on;
  }
  dash(): void {
    this.tryDash();
  }

  // Halt the loop without tearing down input listeners, so start() can run again
  // for a clean restart.
  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  // ── entity helpers ──────────────────────────────────────────────────────────

  private makeEntity(kind: Entity['kind'], name: string, mass: number, color: string): Entity {
    const pos = this.randomSpawnPos();
    return {
      id: this.nextId++,
      kind,
      name,
      x: pos.x,
      y: pos.y,
      vx: 0,
      vy: 0,
      mass,
      color,
      alive: true,
      facingX: 1,
      facingY: 0,
      personality: kind === 'bot' ? randomPersonality() : undefined,
      dashStyle: kind === 'bot' ? randomDashStyle() : undefined,
      dashReadyAt: 0,
    };
  }

  private randomSpawnPos(): { x: number; y: number } {
    const m = 80;
    return {
      x: m + Math.random() * (CONFIG.WORLD_SIZE - 2 * m),
      y: m + Math.random() * (CONFIG.WORLD_SIZE - 2 * m),
    };
  }

  // Draw an unused name from the pool; fall back to reuse / a generated handle.
  private drawName(): string {
    const free = this.namePool.filter((n) => !this.used.has(n));
    const src = free.length ? free : this.namePool;
    let name: string;
    if (src.length) {
      name = src[Math.floor(Math.random() * src.length)];
    } else {
      name = `guest_${Math.floor(1000 + Math.random() * 9000)}`;
    }
    this.used.add(name);
    return name;
  }

  private spawnFood(): void {
    this.food = [];
    for (let i = 0; i < CONFIG.FOOD_COUNT; i++) {
      this.food.push(this.makeFood());
    }
  }

  private makeFood(): Food {
    const pos = this.randomSpawnPos();
    return { x: pos.x, y: pos.y, color: randColor(), alive: true };
  }

  // ── input ────────────────────────────────────────────────────────────────────

  private attachInput(): void {
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mouseleave', this.onMouseLeave);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('resize', this.boundResize);
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(this.boundResize);
      this.resizeObserver.observe(this.canvas);
    }
  }

  private detachInput(): void {
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mouseleave', this.onMouseLeave);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('resize', this.boundResize);
    this.resizeObserver?.disconnect();
  }

  private onMouseMove = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  private onMouseLeave = (): void => {
    this.pointer = null;
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    // Don't hijack WASD while the player is typing (e.g. the name input) or
    // before the game is actually running.
    if (!this.running) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'a' || k === 's' || k === 'd') {
      this.keys.add(k);
      e.preventDefault();
    } else if (k === ' ' || k === 'spacebar' || e.code === 'Space') {
      // Hijack space so the page never scrolls; dash if it's ready.
      e.preventDefault();
      this.tryDash();
    } else if (k === 'shift') {
      // Held-fire: the loop fires while shift is down, rate-limited by cooldown.
      this.keys.add('shift');
      e.preventDefault();
    }
  };

  // Apply a dash: an instant velocity impulse in (dx,dy), plus glow + cooldown.
  private applyDash(e: Entity, now: number, dx: number, dy: number): void {
    if (now < (e.dashReadyAt ?? 0)) return;
    const l = Math.hypot(dx, dy) || 1;
    e.vx += (dx / l) * CONFIG.DASH_IMPULSE;
    e.vy += (dy / l) * CONFIG.DASH_IMPULSE;
    e.dashActiveUntil = now + CONFIG.DASH_DURATION_MS;
    e.dashReadyAt = now + CONFIG.DASH_COOLDOWN_MS;
  }

  // Player dash (SPACE) — lunges in the current aim direction.
  private tryDash(): void {
    const now = performance.now();
    const p = this.player;
    if (!p?.alive || now < (p.dashReadyAt ?? 0)) return;
    const aim = this.playerAim();
    this.applyDash(p, now, aim.dx, aim.dy);
    this.cb.onDash(CONFIG.DASH_COOLDOWN_MS);
  }

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key.toLowerCase());
  };

  // Normalised direction the player is currently aiming (keyboard > cursor > drift).
  private playerAim(): { dx: number; dy: number } {
    const p = this.player;
    let kx = 0;
    let ky = 0;
    if (this.keys.has('w')) ky -= 1;
    if (this.keys.has('s')) ky += 1;
    if (this.keys.has('a')) kx -= 1;
    if (this.keys.has('d')) kx += 1;
    if (kx || ky) {
      const l = Math.hypot(kx, ky);
      return { dx: kx / l, dy: ky / l };
    }
    if (this.pointer) {
      const dx = wrapDelta(this.cam.screenToWorldX(this.pointer.x), p.x);
      const dy = wrapDelta(this.cam.screenToWorldY(this.pointer.y), p.y);
      const l = Math.hypot(dx, dy) || 1;
      if (l > 1) return { dx: dx / l, dy: dy / l };
    }
    const vl = Math.hypot(p.vx, p.vy);
    if (vl > 1) return { dx: p.vx / vl, dy: p.vy / vl };
    return { dx: 1, dy: 0 };
  }

  // Spawn a bullet from `e` in (dx,dy). Spends FIRE_COST_FRAC of mass; the bullet
  // carries BULLET_DAMAGE_MULT × that cost as damage. Returns false if it can't fire.
  private spawnBullet(e: Entity, now: number, dx: number, dy: number, cooldownMs: number): boolean {
    if (e.mass < CONFIG.FIRE_MIN_MASS) return false;
    if (now - (e.lastFireAt ?? 0) < cooldownMs) return false;
    const l = Math.hypot(dx, dy);
    if (l < 0.001) return false;

    const cost = e.mass * CONFIG.FIRE_COST_FRAC;
    e.mass -= cost;
    e.lastFireAt = now;

    // Hard cap so a long firefight can never grow the array without bound.
    if (this.bullets.length >= 400) this.bullets.shift();

    const nx = dx / l;
    const ny = dy / l;
    const muzzle = radiusOf(e.mass) + CONFIG.BULLET_RADIUS + 2;
    this.bullets.push({
      x: wrapCoord(e.x + nx * muzzle),
      y: wrapCoord(e.y + ny * muzzle),
      vx: nx * CONFIG.BULLET_SPEED,
      vy: ny * CONFIG.BULLET_SPEED,
      ownerId: e.id,
      damage: cost * CONFIG.BULLET_DAMAGE_MULT,
      dieAt: now + CONFIG.BULLET_LIFE_MS,
    });
    return true;
  }

  // SHIFT — fire along the player's heading (the momentum indicator), so you
  // can't fire opposite to your travel by juking the keys.
  private fireBullet(): void {
    const p = this.player;
    if (!p?.alive) return;
    this.spawnBullet(p, performance.now(), p.facingX ?? 1, p.facingY ?? 0, CONFIG.FIRE_COOLDOWN_MS);
  }

  // Scatter `amount` of mass as collectable ground dots around (x,y).
  private dropPoints(x: number, y: number, amount: number, color: string): void {
    if (amount <= 0) return;
    // Safety cap so sustained firefights can't balloon the food array.
    if (this.food.length > 1400) return;
    const dots = Math.max(1, Math.min(CONFIG.EXPLODE_MAX_DOTS, Math.round(amount / CONFIG.EXPLODE_DOT_MASS)));
    const dotMass = amount / dots;
    for (let i = 0; i < dots; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = CONFIG.EXPLODE_SPEED * (0.4 + Math.random() * 0.8);
      this.food.push({
        x: wrapCoord(x + Math.cos(ang) * 8),
        y: wrapCoord(y + Math.sin(ang) * 8),
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        color,
        alive: true,
        ejected: true,
        mass: dotMass,
      });
    }
  }

  private resize(): void {
    // Cap DPR: at 3× on a large fullscreen display the backing store balloons to
    // tens of MB of GPU memory, which (with the canvas repainting every frame)
    // is a real crash risk in Safari. 2× is visually plenty.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cam.setViewport(w, h);
  }

  // ── main loop ──────────────────────────────────────────────────────────────

  private tick(ts: number): void {
    if (!this.running) return;
    let dt = (ts - this.lastTs) / 1000;
    this.lastTs = ts;
    if (dt > 0.05) dt = 0.05; // clamp big gaps (tab was backgrounded)

    // A thrown error must never take the page down — log it (throttled) and keep
    // the loop alive so a single bad frame can't cascade into a crash/reload.
    try {
      this.simulate(dt, ts);
      this.cam.follow(this.player.x, this.player.y, radiusOf(this.player.mass), dt);
      this.renderer.draw(this.entities, this.food, this.bullets, this.player, ts);

      this.statsAccum += dt;
      if (this.statsAccum >= 1) {
        this.statsAccum = 0;
        this.emitStats();
      }
    } catch (err) {
      if (ts - this.lastErrorLog > 1000) {
        this.lastErrorLog = ts;
        // eslint-disable-next-line no-console
        console.error('[agar] frame error:', err);
      }
    }

    this.rafId = requestAnimationFrame((t) => this.tick(t));
  }

  // THE SEAM: replace the body of simulate() with a server-state apply step for
  // real multiplayer. Everything outside this method is presentation only.
  private simulate(dt: number, now: number): void {
    this.grid.rebuild(this.food); // spatial index for this frame's food lookups
    if (this.keys.has('shift') || this.touchFiring) this.fireBullet(); // held-fire
    this.steerAll(now, dt);
    this.integrate(dt);
    this.integrateFood(dt);
    this.updateBullets(dt, now);
    this.resolveFood(now);
    this.resolveEating(now);
    this.handleRespawns(now);
    // Drop eaten ejected dots, but only reallocate the array when something
    // actually died (permanent pellets respawn in place and stay alive).
    if (this.food.some((f) => !f.alive)) {
      this.food = this.food.filter((f) => f.alive);
    }
  }

  // Set each entity's *desired* velocity from its controls/AI. Actual velocity
  // chases the desired one with inertia in integrate(), so cells steer like ships.
  private steerAll(now: number, dt: number): void {
    for (const e of this.entities) {
      if (!e.alive) continue;

      // dirX/dirY: unit heading the entity wants; throttle: 0..1 of top speed.
      let dirX = 0;
      let dirY = 0;
      let throttle = 0;

      if (e.kind === 'player') {
        let kx = 0;
        let ky = 0;
        if (this.keys.has('w')) ky -= 1;
        if (this.keys.has('s')) ky += 1;
        if (this.keys.has('a')) kx -= 1;
        if (this.keys.has('d')) kx += 1;
        if (kx || ky) {
          const l = Math.hypot(kx, ky);
          dirX = kx / l;
          dirY = ky / l;
          throttle = 1;
        } else if (this.touchSteer) {
          const mag = Math.hypot(this.touchSteer.x, this.touchSteer.y);
          if (mag > 0.06) {
            dirX = this.touchSteer.x / mag;
            dirY = this.touchSteer.y / mag;
            throttle = Math.min(1, mag);
          }
        } else if (this.pointer) {
          const px = wrapDelta(this.cam.screenToWorldX(this.pointer.x), e.x);
          const py = wrapDelta(this.cam.screenToWorldY(this.pointer.y), e.y);
          const l = Math.hypot(px, py);
          // Rest when the cursor sits on the cell; otherwise steer toward it.
          if (l > radiusOf(e.mass)) {
            dirX = px / l;
            dirY = py / l;
            throttle = 1;
          }
        }
      } else {
        const s = steerBot(e, this.entities, this.grid, this.bullets, now);
        const dx = wrapDelta(s.tx, e.x);
        const dy = wrapDelta(s.ty, e.y);
        const l = Math.hypot(dx, dy);
        if (l > 4) {
          dirX = dx / l;
          dirY = dy / l;
          throttle = 1;
        }
        if (s.dash) this.applyDash(e, now, dx, dy);
        // Bots fire along their heading (like the player), so shots track where
        // they're actually going — typically straight at the prey they're chasing.
        if (s.fire) this.spawnBullet(e, now, e.facingX ?? dx, e.facingY ?? dy, CONFIG.BOT_FIRE_COOLDOWN_MS);
      }

      let top = speedOf(e.mass);
      if (e.kind === 'konrad') top *= CONFIG.KONRAD_SPEED_PENALTY;

      // Ease current velocity toward the desired velocity (inertia).
      const desiredX = dirX * top * throttle;
      const desiredY = dirY * top * throttle;
      const k = 1 - Math.exp(-CONFIG.STEER_ACCEL * dt);
      e.vx += (desiredX - e.vx) * k;
      e.vy += (desiredY - e.vy) * k;
    }
  }

  private integrate(dt: number): void {
    for (const e of this.entities) {
      if (!e.alive) continue;
      // World loops at every edge — wrap rather than clamp.
      e.x = wrapCoord(e.x + e.vx * dt);
      e.y = wrapCoord(e.y + e.vy * dt);

      // Track heading for the momentum indicator + shot direction; keep the last
      // heading when nearly stopped so aim doesn't snap around at low speed.
      const sp = Math.hypot(e.vx, e.vy);
      if (sp > CONFIG.FACING_MIN_SPEED) {
        e.facingX = e.vx / sp;
        e.facingY = e.vy / sp;
      }

      // Slow mass bleed above the start size keeps giants from snowballing.
      if (e.mass > CONFIG.START_MASS) {
        e.mass -= e.mass * CONFIG.MASS_DECAY_PER_SEC * dt;
        if (e.mass < CONFIG.START_MASS) e.mass = CONFIG.START_MASS;
      }
    }
  }

  // Move ejected explosion dots; they coast outward then settle as normal food.
  private integrateFood(dt: number): void {
    const decay = Math.exp(-CONFIG.EJECTED_FRICTION * dt);
    for (const f of this.food) {
      if (!f.vx && !f.vy) continue;
      f.x = wrapCoord(f.x + (f.vx ?? 0) * dt);
      f.y = wrapCoord(f.y + (f.vy ?? 0) * dt);
      f.vx = (f.vx ?? 0) * decay;
      f.vy = (f.vy ?? 0) * decay;
      if (Math.hypot(f.vx ?? 0, f.vy ?? 0) < 6) {
        f.vx = 0;
        f.vy = 0;
      }
    }
  }

  private updateBullets(dt: number, now: number): void {
    if (!this.bullets.length) return;
    const live = this.entities.filter((e) => e.alive);
    const keep: Bullet[] = [];
    for (const b of this.bullets) {
      if (now >= b.dieAt) continue;
      b.x = wrapCoord(b.x + b.vx * dt);
      b.y = wrapCoord(b.y + b.vy * dt);

      let consumed = false;
      for (const e of live) {
        if (e.id === b.ownerId) continue;
        const reach = radiusOf(e.mass) + CONFIG.BULLET_RADIUS;
        if (torusDist2(b.x, b.y, e.x, e.y) > reach * reach) continue;

        if (now < (e.dashActiveUntil ?? 0)) {
          // Dash halo deflects the shot: bounce it outward, now owned by the
          // deflector (so it can hit the original shooter and won't re-hit here).
          let ox = wrapDelta(b.x, e.x);
          let oy = wrapDelta(b.y, e.y);
          let ol = Math.hypot(ox, oy);
          if (ol < 0.001) {
            ox = -b.vx;
            oy = -b.vy;
            ol = Math.hypot(ox, oy) || 1;
          }
          ox /= ol;
          oy /= ol;
          b.x = wrapCoord(e.x + ox * (reach + 2));
          b.y = wrapCoord(e.y + oy * (reach + 2));
          b.vx = ox * CONFIG.BULLET_SPEED;
          b.vy = oy * CONFIG.BULLET_SPEED;
          b.ownerId = e.id;
          b.dieAt = now + CONFIG.BULLET_LIFE_MS;
          break; // keep the (reflected) bullet
        }

        // Normal hit: knock points off the target and drop them as loot. The
        // target briefly can't pick anything up, so it can't vacuum its own
        // dropped points straight back.
        const drop = Math.min(b.damage, e.mass - CONFIG.MIN_MASS);
        if (drop > 0) {
          e.mass -= drop;
          e.pickupLockUntil = now + CONFIG.HIT_PICKUP_LOCK_MS;
          this.dropPoints(b.x, b.y, drop, e.color);
        }
        consumed = true;
        break;
      }
      if (!consumed) keep.push(b);
    }
    this.bullets = keep;
  }

  private resolveFood(now: number): void {
    for (const e of this.entities) {
      if (!e.alive) continue;
      if (now < (e.pickupLockUntil ?? 0)) continue; // recently shot — can't collect yet
      const r = radiusOf(e.mass);
      const r2 = r * r;
      // Only test pellets in the cells the cell actually overlaps.
      this.grid.forEachNear(e.x, e.y, r, (f) => {
        if (!f.alive) return;
        if (torusDist2(f.x, f.y, e.x, e.y) < r2) {
          e.mass += f.mass ?? CONFIG.FOOD_MASS;
          if (f.ejected) {
            // Explosion dots are consumed for good (pruned in simulate()).
            f.alive = false;
          } else {
            // Permanent pellets respawn elsewhere so the count stays constant.
            const pos = this.randomSpawnPos();
            f.x = pos.x;
            f.y = pos.y;
            f.color = randColor();
          }
        }
      });
    }
  }

  private resolveEating(now: number): void {
    const live = this.entities.filter((e) => e.alive);
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        const a = live[i];
        const b = live[j];
        if (!a.alive || !b.alive) continue;
        const ra = radiusOf(a.mass);
        const rb = radiusOf(b.mass);
        const d = Math.sqrt(torusDist2(a.x, a.y, b.x, b.y));

        // Determine eater/prey by size; require both the ratio and real overlap.
        let eater: Entity | null = null;
        let prey: Entity | null = null;
        if (ra >= rb * CONFIG.EAT_RATIO && d < ra - rb * CONFIG.EAT_OVERLAP) {
          eater = a;
          prey = b;
        } else if (rb >= ra * CONFIG.EAT_RATIO && d < rb - ra * CONFIG.EAT_OVERLAP) {
          eater = b;
          prey = a;
        }
        if (eater && prey) this.consume(eater, prey, now);
      }
    }
  }

  private consume(eater: Entity, prey: Entity, now: number): void {
    eater.mass += prey.mass;
    prey.alive = false;

    if (prey.kind === 'player') {
      this.cb.onGameOver(Math.round(prey.mass));
    } else if (prey.kind === 'konrad') {
      // Konrad never stays dead — respawn instantly at full advantage.
      this.cb.onToast('Konrad respawned', 'konrad');
      this.reviveKonrad();
    } else {
      // Visitor/dummy bot: announce the kill and schedule a respawn.
      this.used.delete(prey.name);
      this.cb.onToast(`${prey.name} was eaten`, 'eaten');
      prey.respawnAt = now + CONFIG.BOT_RESPAWN_DELAY_MS;
    }
  }

  private reviveKonrad(): void {
    const k = this.konrad;
    const pos = this.randomSpawnPos();
    k.x = pos.x;
    k.y = pos.y;
    k.vx = 0;
    k.vy = 0;
    k.mass = CONFIG.START_MASS * CONFIG.KONRAD_SIZE_ADVANTAGE;
    k.alive = true;
  }

  private handleRespawns(now: number): void {
    for (const e of this.entities) {
      if (e.alive || e.kind !== 'bot') continue;
      if (e.respawnAt !== undefined && now >= e.respawnAt) {
        const pos = this.randomSpawnPos();
        e.x = pos.x;
        e.y = pos.y;
        e.vx = 0;
        e.vy = 0;
        e.mass = CONFIG.START_MASS;
        e.color = randColor();
        e.name = this.drawName(); // a different name on respawn
        e.personality = randomPersonality(); // ...and a fresh temperament
        e.dashStyle = randomDashStyle();
        e.hesitateUntil = undefined;
        e.fleeReadyAt = undefined;
        e.wanderX = undefined;
        e.wanderY = undefined;
        e.wanderUntil = undefined;
        e.dashActiveUntil = 0;
        e.dashReadyAt = 0;
        e.lastFireAt = 0;
        e.pickupLockUntil = 0;
        e.alive = true;
        e.respawnAt = undefined;
        this.cb.onToast(`${e.name} joined`, 'joined');
      }
    }
  }

  private emitStats(): void {
    const ranked = this.entities
      .filter((e) => e.alive)
      .sort((a, b) => b.mass - a.mass)
      .slice(0, 5);

    const leaders: LeaderRow[] = ranked.map((e) => ({
      name: e.name,
      score: Math.round(e.mass),
      isPlayer: e.kind === 'player',
      isKonrad: e.kind === 'konrad',
    }));

    this.cb.onStats({
      score: this.player.alive ? Math.round(this.player.mass) : 0,
      leaders,
    });
  }
}
