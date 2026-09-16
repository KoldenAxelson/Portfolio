// ui.ts — the in-canvas widgets the scenes share: text, pill buttons, bars,
// toasts, panels, pagination. Kept small; the game's UI is mostly the world.

import { INK, MUTED, PANEL, PANEL_LINE, hex, mix } from './art/palette';

const FONT = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif';

export function text(scene: Phaser.Scene, x: number, y: number, str: string, size: number, color: number = INK, weight = 500): Phaser.GameObjects.Text {
  return scene.add.text(x, y, str, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: String(weight), color: hex(color) });
}

export interface ButtonStyle {
  fill?: number;
  line?: number;
  color?: number;
}

export interface ButtonOpts extends ButtonStyle {
  w: number;
  h?: number;
  size?: number;
  weight?: number;
}

export interface Button extends Phaser.GameObjects.Container {
  setLabel(s: string): void;
  setEnabled(v: boolean): void;
}

/** Buttons on the dark scenes (night, mine). */
export const DARK_BUTTON: ButtonStyle = { fill: 0x3a3040, line: 0x5a4c62, color: 0xf3ead8 };

/** A button tinted toward a stat colour (feed chips, shop rows). */
export function tintedButton(color: number): ButtonStyle {
  return { fill: mix(PANEL, color, 0.16), line: mix(PANEL_LINE, color, 0.35) };
}

export function button(scene: Phaser.Scene, x: number, y: number, label: string, onClick: () => void, opts: ButtonOpts): Button {
  const { w } = opts;
  const h = opts.h ?? 34;
  const fill = opts.fill ?? PANEL;
  const line = opts.line ?? PANEL_LINE;
  const bg = scene.add.graphics();
  let enabled = true;
  const draw = (hover: boolean): void => {
    bg.clear();
    bg.lineStyle(2, line, enabled ? 1 : 0.5);
    bg.fillStyle(fill, hover ? 0.85 : 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  };
  draw(false);
  const label$ = text(scene, 0, 0, label, opts.size ?? 14, opts.color ?? INK, opts.weight ?? 600).setOrigin(0.5);
  const container = scene.add.container(x, y, [bg, label$]) as Button;
  container.setSize(w, h);
  container.setInteractive({ useHandCursor: true });
  container.on('pointerover', () => draw(true));
  container.on('pointerout', () => draw(false));
  container.on('pointerup', () => enabled && onClick());
  container.setLabel = (s) => label$.setText(s);
  container.setEnabled = (v) => {
    enabled = v;
    label$.setAlpha(v ? 1 : 0.45);
    draw(false);
    if (v) container.setInteractive({ useHandCursor: true });
    else container.disableInteractive();
  };
  return container;
}

export function backToMeadowButton(scene: Phaser.Scene, x: number, y: number, onClick: () => void, style: ButtonStyle = {}): Button {
  return button(scene, x, y, 'Back to the meadow', onClick, { w: 170, h: 34, size: 13, ...style });
}

export interface Bar {
  set(frac: number): void;
  destroy(): void;
  gfx: Phaser.GameObjects.Graphics;
}

export function bar(scene: Phaser.Scene, x: number, y: number, w: number, h: number, color: number, track = PANEL_LINE): Bar {
  const gfx = scene.add.graphics();
  const set = (frac: number): void => {
    const f = Phaser.Math.Clamp(frac, 0, 1);
    gfx.clear();
    gfx.fillStyle(track, 1);
    gfx.fillRoundedRect(x, y, w, h, h / 2);
    if (f <= 0) return;
    gfx.fillStyle(color, 1);
    gfx.fillRoundedRect(x, y, Math.max(h, w * f), h, h / 2);
  };
  set(0);
  return { set, destroy: () => gfx.destroy(), gfx };
}

/** Short message that rises and fades. One at a time per scene, replacing. */
export class Toaster {
  private current: Phaser.GameObjects.Text | null = null;

  constructor(
    private scene: Phaser.Scene,
    private x: number,
    private y: number,
    private dark = false,
  ) {}

  show(msg: string, ms = 2200): void {
    this.current?.destroy();
    const t = text(this.scene, this.x, this.y, msg, 15, this.dark ? 0xe6e9ff : INK, 600)
      .setOrigin(0.5)
      .setDepth(1000)
      .setPadding(10, 6, 10, 6)
      .setBackgroundColor(this.dark ? 'rgba(10,14,40,0.75)' : 'rgba(255,250,240,0.92)');
    this.current = t;
    this.scene.tweens.add({
      targets: t,
      y: this.y - 18,
      alpha: { from: 1, to: 0 },
      delay: ms - 500,
      duration: 500,
      onComplete: () => {
        if (this.current === t) this.current = null;
        t.destroy();
      },
    });
  }
}

export function panelBox(scene: Phaser.Scene, x: number, y: number, w: number, h: number, fill = PANEL, line = PANEL_LINE, alpha = 1): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(fill, alpha);
  g.lineStyle(2, line, 1);
  g.fillRoundedRect(x, y, w, h, 16);
  g.strokeRoundedRect(x, y, w, h, 16);
  return g;
}

export interface Page<T> {
  items: T[];
  page: number;
  pages: number;
}

export function paginate<T>(all: readonly T[], requested: number, perPage: number): Page<T> {
  const pages = Math.max(1, Math.ceil(all.length / perPage));
  const page = Phaser.Math.Clamp(requested, 0, pages - 1);
  return { items: all.slice(page * perPage, (page + 1) * perPage), page, pages };
}

/** "‹ 1 / 3 ›" — only rendered when there is more than one page. */
export function pager(scene: Phaser.Scene, x: number, y: number, page: Page<unknown>, onTurn: (dir: -1 | 1) => void, style: ButtonStyle = {}): Phaser.GameObjects.GameObject[] {
  if (page.pages <= 1) return [];
  const arrow = { w: 40, h: 26, size: 14, ...style };
  return [
    text(scene, x, y, `${page.page + 1} / ${page.pages}`, 12, style.color ?? MUTED, 500).setOrigin(0.5),
    button(scene, x - 70, y, '‹', () => onTurn(-1), arrow),
    button(scene, x + 70, y, '›', () => onTurn(1), arrow),
  ];
}
