// renderer.ts — all canvas drawing. Reads world state + a Camera and paints a
// frame. The camera projects each world point to its nearest wrapped copy, so a
// looping world renders seamlessly with no special-casing here. Holds no game
// logic, so it's untouched by a future multiplayer swap. Palette is pulled from
// the site's CSS custom properties so the game tracks the light/dark theme.

import { BULLET_COLOR, CONFIG, radiusOf, speedOf } from './config';
import type { Camera } from './camera';
import type { Bullet, Entity, Food } from './types';

interface Palette {
  bg: string;
  fg: string;
  muted: string;
  accent: string;
  border: string;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private cam: Camera;
  private palette: Palette;

  constructor(ctx: CanvasRenderingContext2D, cam: Camera) {
    this.ctx = ctx;
    this.cam = cam;
    this.palette = this.readPalette();
    // Re-read the palette if the OS theme flips, so canvas colours stay in sync.
    window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
      this.palette = this.readPalette();
    });
  }

  // The --c-* vars are space-separated rgb triples (e.g. "250 250 247").
  private readPalette(): Palette {
    const cs = getComputedStyle(document.documentElement);
    const v = (name: string, fallback: string): string => {
      const raw = cs.getPropertyValue(name).trim();
      return raw ? `rgb(${raw})` : fallback;
    };
    return {
      bg: v('--c-bg', 'rgb(9 9 11)'),
      fg: v('--c-fg', 'rgb(250 250 247)'),
      muted: v('--c-muted', 'rgb(160 160 160)'),
      accent: v('--c-accent', 'rgb(245 158 11)'),
      border: v('--c-border', 'rgb(60 60 66)'),
    };
  }

  refreshPalette(): void {
    this.palette = this.readPalette();
  }

  draw(
    entities: Entity[],
    food: Food[],
    bullets: Bullet[],
    player: Entity,
    now: number,
  ): void {
    const ctx = this.ctx;
    const cam = this.cam;
    const w = ctx.canvas.clientWidth || ctx.canvas.width;
    const h = ctx.canvas.clientHeight || ctx.canvas.height;

    ctx.fillStyle = this.palette.bg;
    ctx.fillRect(0, 0, w, h);

    this.drawGrid(w, h);

    // Food pellets (ejected dots render a touch brighter/larger).
    for (const f of food) {
      if (!f.alive) continue;
      const sx = cam.worldToScreenX(f.x);
      const sy = cam.worldToScreenY(f.y);
      const r = Math.max(1.5, (f.ejected ? 6.5 : 5) * cam.zoom);
      if (sx < -r || sy < -r || sx > w + r || sy > h + r) continue;
      ctx.beginPath();
      ctx.fillStyle = f.color;
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bullets — short accent tracers.
    for (const b of bullets) {
      const sx = cam.worldToScreenX(b.x);
      const sy = cam.worldToScreenY(b.y);
      if (sx < -20 || sy < -20 || sx > w + 20 || sy > h + 20) continue;
      const len = Math.hypot(b.vx, b.vy) || 1;
      const tailX = sx - (b.vx / len) * 10;
      const tailY = sy - (b.vy / len) * 10;
      ctx.strokeStyle = BULLET_COLOR;
      ctx.lineWidth = Math.max(2, CONFIG.BULLET_RADIUS * cam.zoom);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(sx, sy);
      ctx.stroke();
    }

    // Entities, smallest first so larger cells render on top.
    const order = entities.filter((e) => e.alive).sort((a, b) => a.mass - b.mass);
    for (const e of order) this.drawEntity(e, e === player, w, h, now);
  }

  private drawGrid(w: number, h: number): void {
    const ctx = this.ctx;
    const cam = this.cam;
    const step = 100;
    ctx.strokeStyle = this.palette.border;
    ctx.globalAlpha = 0.22;
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Grid lines anchored to the world (every `step` units) so they scroll with
    // motion. Spacing is constant, so the loop seam needs no special handling.
    const px = (v: number): number => v * cam.zoom;
    const startWorldX = Math.floor((cam.x - w / (2 * cam.zoom)) / step) * step;
    for (let x = startWorldX; px(x - cam.x) <= w; x += step) {
      const sx = cam.worldToScreenX(x);
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, h);
    }
    const startWorldY = Math.floor((cam.y - h / (2 * cam.zoom)) / step) * step;
    for (let y = startWorldY; px(y - cam.y) <= h; y += step) {
      const sy = cam.worldToScreenY(y);
      ctx.moveTo(0, sy);
      ctx.lineTo(w, sy);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  private drawEntity(e: Entity, isPlayer: boolean, w: number, h: number, now: number): void {
    const ctx = this.ctx;
    const cam = this.cam;
    const sx = cam.worldToScreenX(e.x);
    const sy = cam.worldToScreenY(e.y);
    const r = radiusOf(e.mass) * cam.zoom;
    if (sx < -r || sy < -r || sx > w + r || sy > h + r) return;

    const dashing = e.dashActiveUntil !== undefined && now < e.dashActiveUntil;

    // Dash halo — a bright, pulsing ring in the cell's own colour (also a
    // bullet-deflect shield). The glow is faked with layered translucent rings
    // rather than ctx.shadowBlur, which leaks GPU memory in Safari.
    if (dashing) {
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.03);
      const gap = 6 + 6 * pulse;
      ctx.save();
      // Soft glow: a translucent filled disc behind the cell.
      ctx.globalAlpha = 0.2 + 0.14 * pulse;
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(sx, sy, r + gap + 7, 0, Math.PI * 2);
      ctx.fill();
      // Bold coloured ring.
      ctx.globalAlpha = 1;
      ctx.lineWidth = Math.max(3, r * 0.22);
      ctx.strokeStyle = e.color;
      ctx.beginPath();
      ctx.arc(sx, sy, r + gap, 0, Math.PI * 2);
      ctx.stroke();
      // Thin white edge so the ring reads against a same-colour background.
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = Math.max(1.5, r * 0.07);
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.arc(sx, sy, r + gap + 1.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Body.
    ctx.beginPath();
    ctx.fillStyle = e.color;
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();

    // Outline — light ring for the player.
    ctx.lineWidth = isPlayer ? 3 : 2;
    ctx.strokeStyle = isPlayer ? this.palette.fg : 'rgba(0,0,0,0.25)';
    ctx.stroke();

    // Momentum dot — small marker offset toward the heading, distance scaled by
    // how fast the cell is moving relative to its top speed (ship-like cue).
    const sp = Math.hypot(e.vx, e.vy);
    if (sp > 4 && r > 6) {
      const top = speedOf(e.mass) || 1;
      const frac = Math.min(1, sp / top);
      const ox = (e.vx / sp) * r * 0.62 * frac;
      const oy = (e.vy / sp) * r * 0.62 * frac;
      const dotR = Math.max(2, r * 0.16);
      ctx.beginPath();
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1.5;
      ctx.arc(sx + ox, sy + oy, dotR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Name label.
    const fontSize = Math.max(9, Math.min(r * 0.5, 22));
    if (fontSize >= 8) {
      ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineJoin = 'round';
      const label = e.name;
      const fits = ctx.measureText(label).width <= r * 1.85;
      const ly = fits ? sy + fontSize * 0.35 : sy + r + fontSize + 2;
      ctx.lineWidth = Math.max(2, fontSize * 0.18);
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.strokeText(label, sx, ly);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, sx, ly);
    }
  }
}
