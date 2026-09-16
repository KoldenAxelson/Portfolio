// icons.ts — small generated textures shared by the scenes. White shapes are
// tinted at runtime so the texture count stays small.

import type { Flavor, StatKey, Tier } from '../core/types';
import { STAT_COLOR } from '../core/rules';
import { GOLD, INK, VIOLET, darken, lighten } from './palette';

function once(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void): string {
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
  return key;
}

const GEM = 32;

/** Power-up gem: colour = stat, cut = tier, rim = flavor. */
export function ensureGemTexture(scene: Phaser.Scene, stat: StatKey, tier: Tier, flavor: Flavor): string {
  return once(scene, `gem:${stat}:${tier}:${flavor}`, GEM, GEM, (g) => {
    const c = STAT_COLOR[stat];
    const cx = GEM / 2;
    const cy = GEM / 2;
    if (flavor === 'hero') {
      g.lineStyle(3, GOLD, 1);
      g.strokeCircle(cx, cy, 14);
    } else if (flavor === 'dark') {
      g.lineStyle(3, VIOLET, 1);
      g.strokeCircle(cx, cy, 14);
    }
    g.lineStyle(2.5, INK, 1);
    g.fillStyle(c, 1);
    if (tier === 1) {
      g.fillCircle(cx, cy, 9);
      g.strokeCircle(cx, cy, 9);
    } else if (tier === 2) {
      const pts: Phaser.Math.Vector2[] = [];
      for (let i = 0; i < 6; i++) {
        const a = Phaser.Math.DegToRad(60 * i - 30);
        pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * 10.5, cy + Math.sin(a) * 10.5));
      }
      g.fillPoints(pts, true);
      g.strokePoints(pts, true);
    } else {
      const pts = [
        new Phaser.Math.Vector2(cx, cy - 12),
        new Phaser.Math.Vector2(cx + 11, cy),
        new Phaser.Math.Vector2(cx, cy + 12),
        new Phaser.Math.Vector2(cx - 11, cy),
      ];
      g.fillPoints(pts, true);
      g.strokePoints(pts, true);
      g.fillStyle(lighten(c, 0.6), 0.9);
      g.fillTriangle(cx, cy - 12, cx + 11, cy, cx, cy);
    }
    g.fillStyle(lighten(c, 0.65), 0.9);
    g.fillEllipse(cx - 3, cy - 4, 5, 3);
  });
}

/** Soft radial glow, white — tint it to the star's colour. */
export function ensureGlowTexture(scene: Phaser.Scene): string {
  const size = 96;
  return once(scene, 'glow', size, size, (g) => {
    const cx = size / 2;
    const steps = 28;
    for (let i = steps; i >= 1; i--) {
      const t = i / steps;
      g.fillStyle(0xffffff, 0.012 + (1 - t) * (1 - t) * 0.08);
      g.fillCircle(cx, cx, t * 44);
    }
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx, cx, 4.5);
  });
}

/** Four-point sparkle, white — the core of a catchable star. */
export function ensureSparkTexture(scene: Phaser.Scene): string {
  const size = 48;
  return once(scene, 'spark', size, size, (g) => {
    const c = size / 2;
    g.fillStyle(0xffffff, 1);
    const pts = [
      [c, c - 20],
      [c + 4, c - 4],
      [c + 20, c],
      [c + 4, c + 4],
      [c, c + 20],
      [c - 4, c + 4],
      [c - 20, c],
      [c - 4, c - 4],
    ].map(([x, y]) => new Phaser.Math.Vector2(x, y));
    g.fillPoints(pts, true);
    g.fillCircle(c, c, 5);
  });
}

/** Longer eight-point rays — rare stars wear this behind the sparkle. */
export function ensureRaysTexture(scene: Phaser.Scene): string {
  const size = 80;
  return once(scene, 'rays', size, size, (g) => {
    const c = size / 2;
    g.lineStyle(2, 0xffffff, 0.9);
    for (let i = 0; i < 8; i++) {
      const a = Phaser.Math.DegToRad(45 * i + 22.5);
      const r = i % 2 ? 22 : 34;
      g.lineBetween(c + Math.cos(a) * 6, c + Math.sin(a) * 6, c + Math.cos(a) * r, c + Math.sin(a) * r);
    }
  });
}

export function ensureHaloTexture(scene: Phaser.Scene, flavor: Flavor): string | null {
  if (flavor === 'neutral') return null;
  const size = 64;
  return once(scene, `halo:${flavor}`, size, size, (g) => {
    const c = size / 2;
    if (flavor === 'hero') {
      g.lineStyle(2, GOLD, 0.95);
      g.strokeCircle(c, c, 22);
    } else {
      g.lineStyle(2.5, lighten(VIOLET, 0.25), 0.95);
      for (let i = 0; i < 8; i++) {
        const a0 = Phaser.Math.DegToRad(45 * i);
        const a1 = Phaser.Math.DegToRad(45 * i + 24);
        g.beginPath();
        g.arc(c, c, 22, a0, a1, false);
        g.strokePath();
      }
    }
  });
}

export function ensureDotTexture(scene: Phaser.Scene): string {
  return once(scene, 'dot', 16, 16, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(8, 8, 7);
  });
}

export function ensureHeartTexture(scene: Phaser.Scene): string {
  const s = 24;
  return once(scene, 'heart', s, s, (g) => {
    g.fillStyle(0xff6b8a, 1);
    g.fillCircle(8, 9, 6);
    g.fillCircle(16, 9, 6);
    g.fillTriangle(2.5, 12, 21.5, 12, 12, 22);
    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(7, 7, 2);
  });
}

export function ensureMoonTexture(scene: Phaser.Scene): string {
  const s = 72;
  return once(scene, 'moon', s, s, (g) => {
    const c = s / 2;
    g.fillStyle(0xfff6d5, 1);
    g.fillCircle(c, c, 26);
    g.fillStyle(darken(0xfff6d5, 0.12), 1);
    g.fillCircle(c - 8, c - 6, 5);
    g.fillCircle(c + 9, c + 4, 7);
    g.fillCircle(c - 2, c + 12, 3.5);
  });
}

/** A tiny pouch for the night HUD. */
export function ensurePouchTexture(scene: Phaser.Scene): string {
  const s = 48;
  return once(scene, 'pouch', s, s, (g) => {
    g.lineStyle(3, INK, 1);
    g.fillStyle(0xc9a26b, 1);
    g.fillRoundedRect(8, 16, 32, 26, 10);
    g.strokeRoundedRect(8, 16, 32, 26, 10);
    g.fillStyle(0xa67c47, 1);
    g.fillRoundedRect(12, 10, 24, 12, 5);
    g.strokeRoundedRect(12, 10, 24, 12, 5);
  });
}

/** A coin, for the tray and the shop. */
export function ensureCoinTexture(scene: Phaser.Scene): string {
  const s = 28;
  return once(scene, 'coin', s, s, (g) => {
    const c = s / 2;
    g.lineStyle(2.5, darken(GOLD, 0.45), 1);
    g.fillStyle(GOLD, 1);
    g.fillCircle(c, c, 11);
    g.strokeCircle(c, c, 11);
    g.lineStyle(2, darken(GOLD, 0.3), 1);
    g.strokeCircle(c, c, 7);
    g.fillStyle(lighten(GOLD, 0.6), 0.9);
    g.fillEllipse(c - 4, c - 4, 5, 3);
  });
}

/** Pickaxe: head across the top, handle down. Origin is set by the caller. */
export function ensurePickaxeTexture(scene: Phaser.Scene): string {
  const w = 56;
  const h = 56;
  return once(scene, 'pickaxe', w, h, (g) => {
    g.lineStyle(3, INK, 1);
    g.fillStyle(0x9a6b3f, 1);
    g.fillRoundedRect(25, 12, 7, 42, 3);
    g.strokeRoundedRect(25, 12, 7, 42, 3);
    g.fillStyle(0xb9c0cc, 1);
    g.beginPath();
    g.moveTo(6, 16);
    g.lineTo(28, 6);
    g.lineTo(50, 16);
    g.lineTo(46, 20);
    g.lineTo(28, 13);
    g.lineTo(10, 20);
    g.closePath();
    g.fillPath();
    g.strokePath();
  });
}

/** An ore lump — grey rock with a coloured glint (tinted by the caller). */
export function ensureOreTexture(scene: Phaser.Scene): string {
  const s = 32;
  return once(scene, 'ore', s, s, (g) => {
    g.lineStyle(2.5, INK, 1);
    g.fillStyle(0x6b7280, 1);
    const pts = [
      [6, 22],
      [9, 11],
      [17, 6],
      [26, 12],
      [27, 22],
      [19, 28],
    ].map(([x, y]) => new Phaser.Math.Vector2(x, y));
    g.fillPoints(pts, true);
    g.strokePoints(pts, true);
    g.fillStyle(0xffffff, 0.85);
    g.fillTriangle(12, 14, 18, 10, 17, 17);
    g.fillCircle(21, 20, 2.5);
  });
}
