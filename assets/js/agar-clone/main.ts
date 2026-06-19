// main.ts — entry point. Registers the Alpine component that owns every piece of
// UI state outside the canvas (pre-game form, HUD leaderboard, toasts, game-over
// overlay) and bootstraps the Game on the canvas. The game loop itself is pure
// TypeScript in game.ts.

import { Game } from './game';
import { DUMMY_NAMES } from './names';
import type { GameStats, ToastKind } from './types';

declare global {
  interface Window {
    // Alpine is loaded as a vendor global, not an ES module. Declaration must
    // match assets/ts/network-panel.ts exactly (merged global).
    Alpine: { data: (name: string, factory: () => unknown) => void };
  }
}

interface Toast {
  id: number;
  msg: string;
  kind: ToastKind;
}

interface LeaderVM {
  name: string;
  score: number;
  isPlayer: boolean;
  isKonrad: boolean;
}

// Build the name pool: every real visitor name (never discarded) padded with the
// dummy list. Falls back entirely to the dummy list if the fetch fails.
async function buildNamePool(workerBase: string): Promise<string[]> {
  let real: string[] = [];
  if (workerBase) {
    try {
      const res = await fetch(`${workerBase}/agar/names`, { method: 'GET' });
      if (res.ok) {
        const data = (await res.json()) as { names?: unknown };
        if (Array.isArray(data.names)) {
          real = data.names.filter((n): n is string => typeof n === 'string' && n.length > 0);
        }
      }
    } catch {
      // Network/Worker unavailable — fall through to the dummy list only.
    }
  }
  const seen = new Set<string>();
  const pool: string[] = [];
  for (const n of [...real, ...DUMMY_NAMES]) {
    if (!seen.has(n)) {
      seen.add(n);
      pool.push(n);
    }
  }
  return pool;
}

// Best-effort submission of a real player name to the Worker. Errors are ignored
// — a failed write must never block starting the game.
async function submitName(workerBase: string, name: string): Promise<void> {
  if (!workerBase) return;
  try {
    await fetch(`${workerBase}/agar/names`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
  } catch {
    /* ignore */
  }
}

function agarGame() {
  let game: Game | null = null;
  let toastSeq = 0;
  let lastToastAt = 0;
  // Joystick tracking (non-reactive).
  let joyCx = 0;
  let joyCy = 0;
  let joyR = 1;
  let joyId = -1;

  return {
    phase: 'pre' as 'pre' | 'playing' | 'over',
    nameInput: '',
    score: 0,
    leaders: [] as LeaderVM[],
    toasts: [] as Toast[],
    gameOverScore: 0,
    workerBase: '',
    dashReady: true,
    fireUnlockAt: 50,
    isTouch: false,
    isFullscreen: false,
    fsSupported: false,
    joyActive: false,
    thumbX: 0,
    thumbY: 0,

    init(this: any): void {
      // $root is the component's root element (where x-data lives).
      const root = this.$root as HTMLElement | undefined;
      this.workerBase = (root?.dataset.workerBase || '').replace(/\/$/, '');

      const canvas = this.$refs.canvas as HTMLCanvasElement;
      game = new Game(canvas, {
        onToast: (msg: string, kind: ToastKind) => this.pushToast(msg, kind),
        onStats: (stats: GameStats) => {
          this.score = stats.score;
          this.leaders = stats.leaders;
        },
        onGameOver: (score: number) => {
          this.gameOverScore = score;
          this.phase = 'over';
        },
        onDash: (cooldownMs: number) => this.runDashMeter(cooldownMs),
      });

      void buildNamePool(this.workerBase).then((pool) => game?.setNamePool(pool));

      // Show touch controls on touch/coarse-pointer devices.
      this.isTouch =
        'ontouchstart' in window || (window.matchMedia?.('(pointer: coarse)').matches ?? false);

      const doc = document as any;
      this.fsSupported = !!(doc.fullscreenEnabled || doc.webkitFullscreenEnabled);
      const onFsChange = (): void => {
        this.isFullscreen = !!(document.fullscreenElement || doc.webkitFullscreenElement);
      };
      document.addEventListener('fullscreenchange', onFsChange);
      document.addEventListener('webkitfullscreenchange', onFsChange);
    },

    toggleFullscreen(this: any): void {
      const el = this.$refs.stage as any;
      const doc = document as any;
      if (!el) return;
      if (!(document.fullscreenElement || doc.webkitFullscreenElement)) {
        if (el.requestFullscreen) void el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      } else if (document.exitFullscreen) {
        void document.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      }
    },

    // ── Virtual joystick ──────────────────────────────────────────────────────
    joyStart(this: any, e: TouchEvent): void {
      e.preventDefault();
      const base = this.$refs.joyBase as HTMLElement;
      const rect = base.getBoundingClientRect();
      joyCx = rect.left + rect.width / 2;
      joyCy = rect.top + rect.height / 2;
      joyR = rect.width / 2;
      const t = e.changedTouches[0];
      joyId = t.identifier;
      this.joyActive = true;
      this.joyTo(t.clientX, t.clientY);
    },
    joyMove(this: any, e: TouchEvent): void {
      e.preventDefault();
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === joyId) {
          this.joyTo(t.clientX, t.clientY);
          return;
        }
      }
    },
    joyEnd(this: any): void {
      this.joyActive = false;
      this.thumbX = 0;
      this.thumbY = 0;
      joyId = -1;
      game?.clearSteer();
    },
    joyTo(this: any, cx: number, cy: number): void {
      let dx = cx - joyCx;
      let dy = cy - joyCy;
      const dist = Math.hypot(dx, dy);
      if (dist > joyR) {
        dx = (dx / dist) * joyR;
        dy = (dy / dist) * joyR;
      }
      this.thumbX = dx;
      this.thumbY = dy;
      game?.setSteer(dx / joyR, dy / joyR);
    },

    // ── Action buttons ──────────────────────────────────────────────────────
    dashBtn(): void {
      game?.dash();
    },
    explodeBtn(): void {
      game?.explode();
    },
    fireDown(this: any, e?: Event): void {
      e?.preventDefault();
      game?.setFiring(true);
    },
    fireUp(this: any, e?: Event): void {
      e?.preventDefault();
      game?.setFiring(false);
    },

    get topScore(): number {
      return this.leaders.length ? this.leaders[0].score : 1;
    },

    barWidth(this: any, score: number): string {
      const pct = Math.max(8, Math.round((score / Math.max(1, this.topScore)) * 100));
      return `${pct}%`;
    },

    play(this: any): void {
      const raw = this.nameInput.trim().slice(0, 32);
      const name = raw || `Player_${Math.floor(1000 + Math.random() * 9000)}`;
      if (raw) void submitName(this.workerBase, raw);
      this.phase = 'playing';
      // Let Alpine reveal the canvas (x-show) before we measure/size it.
      this.$nextTick(() => game?.start(name));
    },

    respawn(this: any): void {
      this.phase = 'playing';
      this.dashReady = true;
      const fill = this.$refs.dashFill as HTMLElement | undefined;
      if (fill) {
        fill.style.transition = 'none';
        fill.style.width = '100%';
      }
      game?.respawnPlayer();
    },

    // Drain the dash meter to empty, then refill it over the cooldown so the bar
    // visually tracks when dash becomes available again.
    runDashMeter(this: any, cooldownMs: number): void {
      this.dashReady = false;
      const fill = this.$refs.dashFill as HTMLElement | undefined;
      if (fill) {
        fill.style.transition = 'none';
        fill.style.width = '0%';
        void fill.offsetWidth; // force reflow so the next change animates
        requestAnimationFrame(() => {
          fill.style.transition = `width ${cooldownMs}ms linear`;
          fill.style.width = '100%';
        });
      }
      setTimeout(() => {
        this.dashReady = true;
      }, cooldownMs);
    },

    pushToast(this: any, msg: string, kind: ToastKind): void {
      // Throttle: in a busy firefight bots die/join many times per second, which
      // would churn DOM nodes and timers. Always let 'konrad' toasts through.
      const now = performance.now();
      if (kind !== 'konrad' && now - lastToastAt < 350) return;
      lastToastAt = now;

      const id = ++toastSeq;
      this.toasts.push({ id, msg, kind });
      if (this.toasts.length > 5) this.toasts.shift();
      setTimeout(() => {
        this.toasts = this.toasts.filter((t: Toast) => t.id !== id);
      }, 3000);
    },
  };
}

document.addEventListener('alpine:init', () => {
  window.Alpine?.data('agarGame', agarGame);
});
