// pets.ts — procedural pet art. Each form is drawn once into a generated
// texture keyed by stage + form, so 32 forms cost nothing on disk. The
// silhouette is the stat and the face is the alignment, so how a pet was
// raised can be read at a glance (design §3.5).

import type { Bracket, Form, Pet, Stage, StatKey } from '../core/types';
import { STAT_COLOR } from '../core/rules';
import { CREAM, GOLD, INK, PINK, darken, lighten } from './palette';

const PET_TEX = 160;
const CX = 80;
const CY = 96;

function petTextureKey(stage: Stage, form: Form | null): string {
  if (stage === 'cocoon') return 'pet:cocoon';
  if (stage === 'hatchling' || !form) return 'pet:hatchling';
  return `pet:${stage}:${form.stat}:${form.bracket}`;
}

export function petScale(stage: Stage): number {
  switch (stage) {
    case 'hatchling':
      return 0.62;
    case 'juvenile':
      return 0.78;
    case 'adult':
      return 0.92;
    case 'cocoon':
      return 0.8;
  }
}

export function ensurePetTexture(scene: Phaser.Scene, pet: Pick<Pet, 'stage' | 'form'>): string {
  const key = petTextureKey(pet.stage, pet.form);
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  if (pet.stage === 'cocoon') drawCocoon(g);
  else if (pet.stage === 'hatchling' || !pet.form) drawHatchling(g);
  else drawForm(g, pet.stage, pet.form.stat, pet.form.bracket);
  g.generateTexture(key, PET_TEX, PET_TEX);
  g.destroy();
  return key;
}

function outlined(g: Phaser.GameObjects.Graphics, fill: number, draw: () => void): void {
  g.lineStyle(4, INK, 1);
  g.fillStyle(fill, 1);
  draw();
}

function ellipse(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
  g.fillEllipse(x, y, w, h);
  g.strokeEllipse(x, y, w, h);
}

function tri(g: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): void {
  g.fillTriangle(x1, y1, x2, y2, x3, y3);
  g.strokeTriangle(x1, y1, x2, y2, x3, y3);
}

function roundRect(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, r: number): void {
  g.fillRoundedRect(x, y, w, h, r);
  g.strokeRoundedRect(x, y, w, h, r);
}

function face(g: Phaser.GameObjects.Graphics, bracket: Bracket, bodyW: number, big = false): void {
  const ex = bodyW * 0.2;
  const ey = CY - 8;
  const eyeR = big ? 9 : 7.5;
  if (bracket === 'dark') {
    for (const s of [-1, 1]) {
      g.fillStyle(0xffffff, 1);
      g.lineStyle(3, INK, 1);
      g.fillEllipse(CX + s * ex, ey, eyeR * 2.1, eyeR * 1.3);
      g.strokeEllipse(CX + s * ex, ey, eyeR * 2.1, eyeR * 1.3);
      g.fillStyle(INK, 1);
      g.fillEllipse(CX + s * ex + s * 1.5, ey, 3.5, eyeR * 1.1);
      g.lineStyle(3.5, INK, 1);
      g.lineBetween(CX + s * (ex - eyeR), ey - eyeR - 2, CX + s * (ex + eyeR * 0.6), ey - eyeR + 3);
    }
    g.lineStyle(3, INK, 1);
    g.lineBetween(CX - 5, CY + 9, CX + 5, CY + 8);
    return;
  }
  for (const s of [-1, 1]) {
    g.fillStyle(0xffffff, 1);
    g.lineStyle(3, INK, 1);
    g.fillCircle(CX + s * ex, ey, eyeR);
    g.strokeCircle(CX + s * ex, ey, eyeR);
    g.fillStyle(INK, 1);
    g.fillCircle(CX + s * ex + s * 1.5, ey + 1, eyeR * 0.62);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(CX + s * ex - 1 + s * 1.5, ey - 2, eyeR * 0.26);
    if (bracket === 'hero') g.fillCircle(CX + s * ex + 3 + s * 1.5, ey + 3, eyeR * 0.14);
  }
  g.fillStyle(PINK, 0.75);
  g.fillEllipse(CX - ex - 4, CY + 4, 11, 6);
  g.fillEllipse(CX + ex + 4, CY + 4, 11, 6);
  g.lineStyle(3, INK, 1);
  g.beginPath();
  g.arc(CX, CY + 6, 6, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160), false);
  g.strokePath();
}

function halo(g: Phaser.GameObjects.Graphics, y: number): void {
  g.lineStyle(4, GOLD, 1);
  g.strokeEllipse(CX, y, 46, 12);
  g.lineStyle(1.5, lighten(GOLD, 0.5), 1);
  g.strokeEllipse(CX, y - 1, 40, 8);
}

function horns(g: Phaser.GameObjects.Graphics, bodyW: number, top: number, color: number): void {
  outlined(g, darken(color, 0.35), () => {
    const dx = bodyW * 0.28;
    tri(g, CX - dx - 6, top + 10, CX - dx + 6, top + 12, CX - dx - 2, top - 12);
    tri(g, CX + dx + 6, top + 10, CX + dx - 6, top + 12, CX + dx + 2, top - 12);
  });
}

function drawHatchling(g: Phaser.GameObjects.Graphics): void {
  outlined(g, CREAM, () => ellipse(g, CX, CY, 66, 60));
  g.lineStyle(3.5, 0x4e9e5c, 1);
  g.beginPath();
  g.arc(CX + 6, CY - 34, 8, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(270), false);
  g.strokePath();
  g.fillStyle(0x6fbf7a, 1);
  g.lineStyle(3, 0x3f8a4c, 1);
  g.fillEllipse(CX + 4, CY - 44, 14, 8);
  g.strokeEllipse(CX + 4, CY - 44, 14, 8);
  face(g, 'neutral', 66, true);
}

function drawCocoon(g: Phaser.GameObjects.Graphics): void {
  const c = 0xb8a9d9;
  outlined(g, c, () => ellipse(g, CX, CY - 4, 60, 78));
  g.lineStyle(3, darken(c, 0.3), 0.9);
  for (let i = 0; i < 4; i++) {
    const y = CY - 30 + i * 16;
    g.beginPath();
    g.arc(CX, y + 12, 30, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340), false);
    g.strokePath();
  }
  g.fillStyle(lighten(c, 0.5), 0.6);
  g.fillEllipse(CX - 14, CY - 30, 12, 20);
}

interface Body {
  g: Phaser.GameObjects.Graphics;
  adult: boolean;
  w: number;
  h: number;
  top: number;
  bottom: number;
  fill: number;
  accent: number;
}

const BODY_SIZE: Partial<Record<StatKey, [number, number]>> = { power: [82, 66], stamina: [74, 70], run: [62, 58] };

/** Silhouette parts drawn behind the body, per dominant stat. */
const BACK_FEATURES: Record<StatKey, (b: Body) => void> = {
  fly: ({ g, adult, accent, fill }) => {
    const span = adult ? 58 : 44;
    const lift = adult ? 40 : 28;
    outlined(g, accent, () => {
      tri(g, CX - 18, CY - 6, CX - span, CY - lift, CX - span + 8, CY + 14);
      tri(g, CX + 18, CY - 6, CX + span, CY - lift, CX + span - 8, CY + 14);
    });
    if (!adult) return;
    outlined(g, fill, () => {
      tri(g, CX - 20, CY + 2, CX - span + 6, CY - lift + 18, CX - span + 14, CY + 16);
      tri(g, CX + 20, CY + 2, CX + span - 6, CY - lift + 18, CX + span - 14, CY + 16);
    });
  },
  swim: ({ g, adult, accent, w, top }) => {
    const tail = CX + w / 2 + (adult ? 34 : 26);
    outlined(g, accent, () => {
      tri(g, CX - 10, top + 6, CX + 12, top + 6, CX + 2, top - (adult ? 26 : 18));
      tri(g, CX + w / 2 - 8, CY + 6, tail, CY - 14, tail, CY + 22);
    });
  },
  run: ({ g, adult, accent, top, bottom }) => {
    const earTip = top - (adult ? 24 : 16);
    const legH = adult ? 30 : 22;
    outlined(g, accent, () => {
      tri(g, CX - 22, top + 12, CX - 6, top + 8, CX - 24, earTip);
      tri(g, CX + 22, top + 12, CX + 6, top + 8, CX + 24, earTip);
      roundRect(g, CX - 22, bottom - 10, 14, legH, 6);
      roundRect(g, CX + 8, bottom - 10, 14, legH, 6);
    });
  },
  stamina: ({ g, accent, bottom }) => {
    outlined(g, accent, () => {
      roundRect(g, CX - 28, bottom - 12, 16, 18, 6);
      roundRect(g, CX + 12, bottom - 12, 16, 18, 6);
    });
  },
  power: ({ g, accent, w }) => {
    outlined(g, accent, () => {
      roundRect(g, CX - w / 2 - 14, CY - 4, 20, 26, 8);
      roundRect(g, CX + w / 2 - 6, CY - 4, 20, 26, 8);
    });
  },
};

/** Parts drawn over the body, per dominant stat. */
const FRONT_FEATURES: Record<StatKey, (b: Body) => void> = {
  swim: ({ g, accent, fill, w }) => {
    outlined(g, accent, () => tri(g, CX - w / 2 + 6, CY + 4, CX - w / 2 - 16, CY - 4, CX - w / 2 - 12, CY + 18));
    g.fillStyle(lighten(fill, 0.5), 0.6);
    g.fillCircle(CX - 16, CY - 20, 4);
    g.fillCircle(CX + 12, CY - 24, 3);
  },
  stamina: ({ g, adult, accent, w, top }) => {
    g.lineStyle(4, INK, 1);
    g.fillStyle(accent, 1);
    g.beginPath();
    g.arc(CX, CY - 6, w / 2 - 1, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340), false);
    g.closePath();
    g.fillPath();
    g.strokePath();
    if (!adult) return;
    g.lineStyle(3, darken(accent, 0.3), 1);
    g.lineBetween(CX - 14, top + 6, CX - 10, top + 20);
    g.lineBetween(CX + 14, top + 6, CX + 10, top + 20);
    g.lineBetween(CX, top + 2, CX, top + 22);
  },
  power: ({ g, adult, accent, top }) => {
    g.lineStyle(4, INK, 1);
    g.lineBetween(CX - 26, top + 22, CX - 8, top + 20);
    g.lineBetween(CX + 26, top + 22, CX + 8, top + 20);
    if (adult) outlined(g, accent, () => tri(g, CX - 8, top + 4, CX + 8, top + 4, CX, top - 18));
  },
  fly: ({ g, adult, accent, top }) => {
    outlined(g, accent, () => {
      tri(g, CX - 4, top + 6, CX + 8, top + 4, CX + 10, top - 16);
      if (adult) tri(g, CX - 10, top + 8, CX - 2, top + 4, CX - 12, top - 12);
    });
  },
  run: ({ g, adult, accent }) => {
    if (!adult) return;
    g.lineStyle(3.5, accent, 1);
    g.lineBetween(CX - 16, CY - 18, CX + 16, CY - 22);
  },
};

function drawForm(g: Phaser.GameObjects.Graphics, stage: 'juvenile' | 'adult', stat: StatKey, bracket: Bracket): void {
  const adult = stage === 'adult';
  const base = STAT_COLOR[stat];
  const [w0, h0] = BODY_SIZE[stat] ?? [70, 62];
  const w = w0 + (adult ? 8 : 0);
  const h = h0 + (adult ? 6 : 0);
  const body: Body = {
    g,
    adult,
    w,
    h,
    top: CY - h / 2,
    bottom: CY + h / 2,
    fill: bracket === 'hero' ? lighten(base, 0.18) : bracket === 'dark' ? darken(base, 0.3) : base,
    accent: bracket === 'dark' ? darken(base, 0.5) : lighten(base, 0.35),
  };

  BACK_FEATURES[stat](body);
  outlined(g, body.fill, () => ellipse(g, CX, CY, w, h));
  g.fillStyle(lighten(body.fill, 0.45), 0.85);
  g.fillEllipse(CX, CY + h * 0.2, w * 0.5, h * 0.42);
  FRONT_FEATURES[stat](body);

  face(g, bracket, w, false);
  if (bracket === 'hero') halo(g, body.top - 14);
  if (bracket === 'dark') horns(g, w, body.top, base);
}

const EGG_TEX_W = 64;
const EGG_TEX_H = 80;

/** One texture per (speckle colour, speckle count) — reads best grade + stat. */
export function ensureEggTexture(scene: Phaser.Scene, stat: StatKey, speckles: number, reborn: boolean): string {
  const key = `egg:${stat}:${speckles}:${reborn ? 'r' : 'f'}`;
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const cx = EGG_TEX_W / 2;
  const cy = EGG_TEX_H / 2 + 2;
  const shell = reborn ? lighten(0xd9cdea, 0.2) : CREAM;
  g.fillStyle(shell, 1);
  g.fillEllipse(cx, cy + 4, 50, 60);
  g.fillEllipse(cx, cy - 6, 40, 52);
  g.lineStyle(4, INK, 1);
  g.beginPath();
  g.arc(cx, cy + 4, 25, Phaser.Math.DegToRad(0), Phaser.Math.DegToRad(180), false);
  g.strokePath();
  g.beginPath();
  g.arc(cx, cy - 6, 20, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360), false);
  g.strokePath();
  g.lineBetween(cx - 20, cy - 6, cx - 25, cy + 4);
  g.lineBetween(cx + 20, cy - 6, cx + 25, cy + 4);
  const c = STAT_COLOR[stat];
  g.fillStyle(c, 0.9);
  const spots: Array<[number, number, number]> = [
    [cx - 10, cy - 12, 5],
    [cx + 9, cy + 2, 6],
    [cx - 6, cy + 14, 4],
    [cx + 12, cy - 16, 3.5],
    [cx - 15, cy + 2, 3.5],
    [cx + 2, cy - 2, 3],
  ];
  for (let i = 0; i < Math.min(speckles, spots.length); i++) {
    const [x, y, r] = spots[i];
    g.fillCircle(x, y, r);
  }
  if (reborn) {
    g.lineStyle(2.5, darken(0xd9cdea, 0.35), 1);
    g.beginPath();
    g.arc(cx, cy + 4, 8, 0, Phaser.Math.DegToRad(300), false);
    g.strokePath();
  }
  g.fillStyle(0xffffff, 0.55);
  g.fillEllipse(cx - 10, cy - 18, 8, 14);
  g.generateTexture(key, EGG_TEX_W, EGG_TEX_H);
  g.destroy();
  return key;
}
