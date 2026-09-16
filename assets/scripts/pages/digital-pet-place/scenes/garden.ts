// garden.ts — the Garden scene (design §2, §4). Pets wander a meadow; the
// player pets them, drags them into the panel to feed, onto the observatory
// or the mine to dispatch, and onto each other to pair. Everything shown is
// rebuilt from `world.garden` on create(), so returning from a module is just
// scene.start('garden').

import type { Egg, Flavor, Pet, StatKey, Tier } from '../core/types';
import { FLAVORS, GRADES, STAT_KEYS } from '../core/types';
import type { Verdict } from '../core/garden';
import {
  ADULT_AT,
  COCOON_AT,
  FLAVOR_GLYPH,
  GARDEN_CAPACITY,
  JUVENILE_AT,
  MODULE_CONSTELLATIONS,
  MODULE_MINE,
  STAT_COLOR,
  STAT_LABEL,
  bracketOf,
  levelCost,
} from '../core/rules';
import { bestGrade, bracketLabel } from '../core/pet';
import { exportSave, importSave } from '../core/save';
import { H, W, replaceWorld, resetWorld, saveIfDirty, saveNow, world } from '../state';
import { ensureEggTexture, ensurePetTexture, petScale } from '../art/pets';
import { ensureCoinTexture, ensureDotTexture, ensureGemTexture, ensureHeartTexture, ensurePickaxeTexture } from '../art/icons';
import { CREAM, GOLD, GRASS, GRASS_DARK, HILL_FAR, HILL_NEAR, INK, MUTED, PANEL, PANEL_LINE, SKY_BOTTOM, SKY_TOP, VIOLET, darken, lighten, mix } from '../art/palette';
import { chimeHatch, chimePop, isMuted, setMuted } from '../art/chime';
import { MINE_FADE, NIGHT_FADE, SHOP_FADE, burst, floatUp, transitionTo } from '../fx';
import { Toaster, bar, button, panelBox, text, tintedButton } from '../ui';
import type { Bar, Button } from '../ui';

// ── layout ──────────────────────────────────────────────────────────────────

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const TOP_H = 52;
const PLAY: Rect = { x: 0, y: TOP_H, w: 644, h: 588 };
const HORIZON = 330;
const GROUND = { x1: 56, y1: 372, x2: 596, y2: 596 };
const OBS: Rect = { x: 34, y: 176, w: 176, h: 176 };
const OBS_CENTER = { x: OBS.x + OBS.w / 2, y: 300 };
const MINE: Rect = { x: 440, y: 214, w: 180, h: 130 };
const MINE_MOUTH = { x: MINE.x + MINE.w / 2, y: 322 };
const PANEL_RECT: Rect = { x: 660, y: 64, w: 284, h: 568 };
const TRAY: Rect = { x: 16, y: 650, w: 628, h: 60 };
const PORTRAIT = { x: PANEL_RECT.x + PANEL_RECT.w / 2, y: PANEL_RECT.y + 78 };

const DEPTH_DOCKED = 3000;
const DEPTH_DRAGGED = 5000;
const DEPTH_FX = 6000;
const PAIR_RADIUS = 48;
const TAP_SLOP = 8;

const inRect = (px: number, py: number, r: Rect): boolean => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
const onGround = (x: number, y: number): { x: number; y: number } => ({
  x: Phaser.Math.Clamp(x, GROUND.x1, GROUND.x2),
  y: Phaser.Math.Clamp(y, GROUND.y1, GROUND.y2),
});

const fmtAge = (ms: number): string => {
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
};

const NEXT_STAGE_AT: Partial<Record<Pet['stage'], number>> = { hatchling: JUVENILE_AT, juvenile: ADULT_AT, adult: COCOON_AT };

// ── pet actor ───────────────────────────────────────────────────────────────

class PetActor extends Phaser.GameObjects.Container {
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  target: { x: number; y: number } | null = null;
  rest = 0;
  dragging = false;
  docked = false;
  private phase = Math.random() * 10;
  private textureKey = '';

  constructor(scene: Phaser.Scene, public pet: Pet) {
    super(scene, pet.x, pet.y);
    // The container origin is the body centre so Phaser's centred hit box
    // covers the pet; the shadow hangs below at the feet.
    this.shadow = scene.add.ellipse(0, 30, 54, 16, 0x000000, 0.14);
    this.sprite = scene.add.image(0, 0, ensurePetTexture(scene, pet)).setOrigin(0.5, 0.6);
    this.add([this.shadow, this.sprite]);
    this.refreshTexture();
    this.setSize(80, 84);
    this.setInteractive({ draggable: true, useHandCursor: true });
    scene.add.existing(this);
  }

  get scaleForStage(): number {
    return petScale(this.pet.stage);
  }

  get isStill(): boolean {
    return this.dragging || this.docked || this.pet.stage === 'cocoon';
  }

  refreshTexture(): void {
    const key = ensurePetTexture(this.scene, this.pet);
    if (key !== this.textureKey) {
      this.textureKey = key;
      this.sprite.setTexture(key);
    }
    const s = this.scaleForStage;
    this.sprite.setScale(s);
    this.shadow.setScale(s * 1.1, s);
    this.shadow.y = 34 * s;
  }

  /** Place on the meadow and record the spot on the pet. */
  settle(x: number, y: number, rest = Phaser.Math.Between(800, 2500)): void {
    const spot = onGround(x, y);
    this.setPosition(spot.x, spot.y);
    this.pet.x = spot.x;
    this.pet.y = spot.y;
    this.setDepth(spot.y);
    this.target = null;
    this.rest = rest;
  }

  wander(dt: number, time: number): void {
    this.animate(time);
    if (this.isStill) return;
    if (this.target) this.stepToward(this.target, dt);
    else this.idle(dt);
  }

  private animate(time: number): void {
    const t = time / 1000 + this.phase;
    const walking = !!this.target && !this.isStill;
    if (walking) {
      this.sprite.y = -Math.abs(Math.sin(t * 9)) * 6;
      return;
    }
    this.sprite.y = 0;
    this.sprite.scaleY = this.scaleForStage * (1 + Math.sin(t * 2.2) * 0.015);
  }

  private idle(dt: number): void {
    this.rest -= dt;
    if (this.rest > 0) return;
    const reach = 150;
    this.target = onGround(this.x + Phaser.Math.Between(-reach, reach), this.y + Phaser.Math.Between(-reach / 2, reach / 2));
  }

  private stepToward(target: { x: number; y: number }, dt: number): void {
    const speed = this.pet.form?.stat === 'run' ? 78 : this.pet.form?.stat === 'stamina' ? 34 : 48;
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    const step = (speed * dt) / 1000;
    if (dist <= step) {
      this.settle(target.x, target.y, Phaser.Math.Between(1200, 4200));
      return;
    }
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
    if (Math.abs(dx) > 2) this.sprite.setFlipX(dx < 0);
    this.setDepth(this.y);
  }
}

// ── info panel ──────────────────────────────────────────────────────────────

class InfoPanel {
  actor: PetActor | null = null;
  private items: Phaser.GameObjects.GameObject[] = [];
  private bars = new Map<string, Bar>();
  private labels = new Map<string, Phaser.GameObjects.Text>();
  private chips = new Map<string, Button>();
  private placeholder: Array<Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Visible> = [];
  private drawAlignment: (() => void) | null = null;

  constructor(private scene: GardenScene) {
    this.drawPlaceholder();
  }

  get isOpen(): boolean {
    return this.actor !== null;
  }

  private drawPlaceholder(): void {
    const { x, y, w, h } = PANEL_RECT;
    const box = panelBox(this.scene, x, y, w, h, PANEL, PANEL_LINE, 0.55);
    const title = text(this.scene, x + w / 2, y + h / 2 - 12, 'Drop a pet here', 17, MUTED, 600).setOrigin(0.5);
    const sub = text(this.scene, x + w / 2, y + h / 2 + 14, 'to see its stats and feed it', 13, MUTED, 500).setOrigin(0.5);
    this.placeholder = [box, title, sub];
  }

  open(actor: PetActor): void {
    if (this.actor && this.actor !== actor) this.close();
    this.actor = actor;
    actor.docked = true;
    actor.target = null;
    actor.setDepth(DEPTH_DOCKED);
    actor.sprite.setFlipX(false);
    this.scene.tweens.add({ targets: actor, x: PORTRAIT.x, y: PORTRAIT.y, duration: 220, ease: 'Quad.easeOut' });
    for (const p of this.placeholder) p.setVisible(false);
    this.build();
  }

  close(): void {
    const actor = this.actor;
    this.actor = null;
    this.clear();
    for (const p of this.placeholder) p.setVisible(true);
    if (!actor) return;
    actor.docked = false;
    const home = onGround(actor.pet.x, actor.pet.y);
    this.scene.tweens.add({ targets: actor, ...home, duration: 260, ease: 'Quad.easeOut', onComplete: () => actor.setDepth(actor.y) });
  }

  private clear(): void {
    for (const it of this.items) it.destroy();
    for (const b of this.bars.values()) b.destroy();
    this.items = [];
    this.bars.clear();
    this.labels.clear();
    this.chips.clear();
    this.drawAlignment = null;
  }

  private keep<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.items.push(obj);
    return obj;
  }

  private build(): void {
    this.clear();
    const { x, y, w, h } = PANEL_RECT;
    const pet = this.actor!.pet;
    this.keep(panelBox(this.scene, x, y, w, h));
    this.keep(this.scene.add.ellipse(PORTRAIT.x, PORTRAIT.y + 10, 128, 44, mix(PANEL, GRASS, 0.35), 1));
    this.keep(text(this.scene, x + w / 2, y + 138, pet.name, 20, INK, 700).setOrigin(0.5));
    this.labels.set('sub', this.keep(text(this.scene, x + w / 2, y + 162, '', 12, MUTED, 500).setOrigin(0.5)));
    this.buildMeters(pet, y + 186);
    STAT_KEYS.forEach((k, i) => this.buildStatRow(pet, k, y + 218 + i * 62));
    this.keep(button(this.scene, x + w / 2, y + h - 30, 'Back to the meadow', () => this.close(), { w: 190, h: 34, size: 13 }));
    this.refresh();
  }

  private buildMeters(pet: Pet, rowY: number): void {
    const { x, w } = PANEL_RECT;
    this.keep(text(this.scene, x + 16, rowY - 8, 'Happiness', 11, MUTED, 600));
    const happy = bar(this.scene, x + 16, rowY + 8, 118, 8, 0xff6b8a);
    this.bars.set('happy', happy);
    this.keep(happy.gfx);
    this.labels.set('happy', this.keep(text(this.scene, x + 134, rowY + 4, '', 11, INK, 600).setOrigin(1, 0.5)));

    this.keep(text(this.scene, x + 150, rowY - 8, 'Alignment', 11, MUTED, 600));
    this.labels.set('align', this.keep(text(this.scene, x + w - 16, rowY + 4, '', 11, INK, 600).setOrigin(1, 0.5)));
    const slider = this.keep(this.scene.add.graphics());
    const sx = x + 150;
    const sy = rowY + 12;
    const sw = 82;
    this.drawAlignment = () => {
      slider.clear();
      slider.fillStyle(VIOLET, 0.55);
      slider.fillRoundedRect(sx, sy - 3, sw / 2, 6, 3);
      slider.fillStyle(GOLD, 0.7);
      slider.fillRoundedRect(sx + sw / 2, sy - 3, sw / 2, 6, 3);
      const knob = sx + ((pet.alignment + 100) / 200) * sw;
      slider.fillStyle(INK, 1);
      slider.fillCircle(knob, sy, 5);
      slider.fillStyle(CREAM, 1);
      slider.fillCircle(knob, sy, 2.5);
    };
  }

  private buildStatRow(pet: Pet, stat: StatKey, ry: number): void {
    const { x } = PANEL_RECT;
    const color = STAT_COLOR[stat];
    const swatch = this.keep(this.scene.add.graphics());
    swatch.fillStyle(color, 1);
    swatch.fillRoundedRect(x + 16, ry + 2, 10, 30, 4);
    this.keep(text(this.scene, x + 34, ry, STAT_LABEL[stat], 13, INK, 700));
    this.labels.set(`${stat}:val`, this.keep(text(this.scene, x + 34, ry + 17, '', 11, MUTED, 500)));
    const progress = bar(this.scene, x + 34, ry + 36, 100, 6, color);
    this.bars.set(`${stat}:prog`, progress);
    this.keep(progress.gfx);
    // One feed chip per flavor; the best tier in the pouch is fed first.
    FLAVORS.forEach((flavor, j) => {
      const chip = button(this.scene, x + 168 + j * 44, ry + 20, '', () => this.scene.feed(pet, stat, flavor), { w: 40, h: 26, size: 11, ...tintedButton(color) });
      this.chips.set(`${stat}:${flavor}`, this.keep(chip));
    });
  }

  refresh(): void {
    if (!this.actor) return;
    const pet = this.actor.pet;
    const form = pet.form ? `${bracketLabel(pet.form.bracket)} ${STAT_LABEL[pet.form.stat]}` : 'undifferentiated';
    const stage = pet.stage.charAt(0).toUpperCase() + pet.stage.slice(1);
    const nextAt = NEXT_STAGE_AT[pet.stage];
    const eta = nextAt ? ` · next in ${fmtAge(Math.max(0, nextAt - pet.age))}` : '';
    this.labels.get('sub')?.setText(`${stage} · ${form} · gen ${pet.generation}${eta}`);
    this.bars.get('happy')?.set(pet.happiness / 100);
    this.labels.get('happy')?.setText(String(pet.happiness));
    this.labels.get('align')?.setText(`${pet.alignment > 0 ? '+' : ''}${pet.alignment} ${bracketLabel(bracketOf(pet.alignment))}`);
    this.drawAlignment?.();
    for (const k of STAT_KEYS) this.refreshStatRow(pet, k);
  }

  private refreshStatRow(pet: Pet, stat: StatKey): void {
    const s = pet.stats[stat];
    this.labels.get(`${stat}:val`)?.setText(`${s.value}  ·  Lv ${s.level}  ·  Grade ${s.grade}`);
    this.bars.get(`${stat}:prog`)?.set(s.level >= 99 ? 1 : s.progress / levelCost(s.level));
    for (const flavor of FLAVORS) {
      const count = world.garden.countPowerUps(stat, flavor);
      const chip = this.chips.get(`${stat}:${flavor}`);
      chip?.setLabel(`${FLAVOR_GLYPH[flavor]} ${count}`);
      chip?.setEnabled(count > 0 && pet.stage !== 'cocoon');
    }
  }
}

// ── scene ───────────────────────────────────────────────────────────────────

export class GardenScene extends Phaser.Scene {
  private actors: PetActor[] = [];
  private panel!: InfoPanel;
  private toast!: Toaster;
  private trayItems: Phaser.GameObjects.GameObject[] = [];
  private dropGlows: Phaser.GameObjects.Graphics[] = [];
  private mineBadge!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private petCount!: Phaser.GameObjects.Text;
  private saveTimer = 0;
  private hintTimer = 0;
  private resetArmedAt = -Infinity;
  private dragStart = { x: 0, y: 0 };

  constructor() {
    super('garden');
  }

  create(): void {
    ensureDotTexture(this);
    ensureHeartTexture(this);
    ensureCoinTexture(this);
    ensurePickaxeTexture(this);
    this.dropGlows = [];
    this.drawMeadow();
    this.drawObservatory();
    this.drawMine();
    this.drawTopBar();
    this.panel = new InfoPanel(this);
    this.toast = new Toaster(this, PLAY.x + PLAY.w / 2, PLAY.y + PLAY.h - 150);
    this.hint = text(this, PLAY.x + PLAY.w / 2, PLAY.y + 22, '', 13, INK, 600).setOrigin(0.5).setAlpha(0.8).setDepth(900);

    // Pets down the mine are not in the meadow; the entrance badge counts them.
    this.actors = [];
    for (const pet of world.garden.pets) if (!pet.away) this.spawnActor(pet);
    this.buildTray();
    this.wireDrag();
    this.wireGardenEvents();

    if (!world.persistent) this.time.delayedCall(600, () => this.toast.show('Storage is unavailable here — progress will not be saved.', 4000));
    this.updateHint(true);
  }

  update(time: number, delta: number): void {
    // The clamp keeps a stalled frame from becoming a stalled hour of garden time.
    const dt = Math.min(delta, 250);
    world.garden.tick(dt);
    for (const a of this.actors) a.wander(dt, time);

    this.saveTimer += dt;
    if (this.saveTimer > 2000) {
      this.saveTimer = 0;
      saveIfDirty();
      this.panel.refresh();
    }
    this.hintTimer += dt;
    if (this.hintTimer > 1500) {
      this.hintTimer = 0;
      this.updateHint(false);
    }
  }

  private wireGardenEvents(): void {
    const unsubscribe = world.garden.on((e) => {
      if (e.type === 'evolved') return this.onEvolved(e.pet);
      if (e.type === 'cocooned') return this.onCocooned(e.pet);
      if (e.type === 'reincarnated') return this.onReincarnated(e.name);
      if (world.persistent) this.time.delayedCall(2600, () => this.toast.show('Milestone — a good moment to export a backup.', 3200));
    });
    const flush = (): void => saveNow();
    this.game.events.on(Phaser.Core.Events.HIDDEN, flush);
    window.addEventListener('pagehide', flush);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.HIDDEN, flush);
      window.removeEventListener('pagehide', flush);
      unsubscribe();
    });
  }

  private onEvolved(pet: Pet): void {
    const actor = this.actorOf(pet);
    actor?.refreshTexture();
    if (actor) burst(this, actor.x, actor.y - 30, { tint: GOLD, count: 16 });
    this.toast.show(`${pet.name} grew into a ${pet.stage}!`);
  }

  private onCocooned(pet: Pet): void {
    this.actorOf(pet)?.refreshTexture();
    this.toast.show(`${pet.name} has spun a cocoon.`);
  }

  private onReincarnated(name: string): void {
    const gone = this.actors.filter((a) => !world.garden.pets.includes(a.pet));
    for (const actor of gone) {
      if (this.panel.actor === actor) this.panel.close();
      burst(this, actor.x, actor.y - 30, { tint: lighten(VIOLET, 0.4), count: 22 });
      this.removeActor(actor);
    }
    this.buildTray();
    this.toast.show(`${name} returned as an egg.`, 3000);
  }

  // ── world drawing ───────────────────────────────────────────────────────

  private drawMeadow(): void {
    const g = this.add.graphics().setDepth(-100);
    // Sky in bands: gradient fills are renderer-dependent, bands are not.
    const bands = 14;
    const skyH = HORIZON - PLAY.y;
    for (let i = 0; i < bands; i++) {
      g.fillStyle(mix(SKY_TOP, SKY_BOTTOM, i / (bands - 1)), 1);
      g.fillRect(PLAY.x, PLAY.y + (i * skyH) / bands, PLAY.w, skyH / bands + 1);
    }
    g.fillStyle(0xfff3b0, 0.9);
    g.fillCircle(520, 128, 34);
    g.fillStyle(0xfff9d6, 0.5);
    g.fillCircle(520, 128, 46);
    g.fillStyle(0xffffff, 0.85);
    for (const [cx, cy, s] of [
      [180, 120, 1],
      [400, 90, 0.8],
      [610, 200, 0.7],
    ]) {
      g.fillEllipse(cx, cy, 90 * s, 30 * s);
      g.fillEllipse(cx - 24 * s, cy + 4 * s, 60 * s, 24 * s);
      g.fillEllipse(cx + 26 * s, cy + 2 * s, 64 * s, 26 * s);
    }
    g.fillStyle(HILL_FAR, 1);
    g.fillEllipse(140, HORIZON + 40, 420, 150);
    g.fillEllipse(470, HORIZON + 50, 520, 150);
    g.fillStyle(GRASS, 1);
    g.fillRect(PLAY.x, HORIZON, PLAY.w, PLAY.y + PLAY.h - HORIZON);
    g.fillStyle(HILL_NEAR, 1);
    g.fillEllipse(330, HORIZON + 8, 760, 70);
    for (let i = 0; i < 46; i++) this.drawTuft(g, 20 + ((i * 137) % 600), HORIZON + 40 + ((i * 89) % 250), i % 7 === 0 ? i % 4 : -1);
    g.lineStyle(2, mix(GRASS_DARK, INK, 0.2), 0.35);
    g.lineBetween(PLAY.x + PLAY.w, PLAY.y, PLAY.x + PLAY.w, PLAY.y + PLAY.h);
  }

  private drawTuft(g: Phaser.GameObjects.Graphics, x: number, y: number, flower: number): void {
    g.lineStyle(2, GRASS_DARK, 0.7);
    g.lineBetween(x, y, x - 3, y - 8);
    g.lineBetween(x, y, x + 3, y - 9);
    g.lineBetween(x, y, x, y - 11);
    if (flower < 0) return;
    g.fillStyle([0xffe08a, 0xffb8d0, 0xffffff, 0xbfe0ff][flower], 0.9);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      g.fillCircle(x + 9 + Math.cos(a) * 3, y - 7 + Math.sin(a) * 3, 2);
    }
    g.fillStyle(0xffc857, 1);
    g.fillCircle(x + 9, y - 7, 1.6);
  }

  private drawObservatory(): void {
    const g = this.add.graphics().setDepth(-50);
    const cx = OBS_CENTER.x;
    const base = 322;
    g.fillStyle(darken(HILL_NEAR, 0.06), 0.55);
    g.fillEllipse(cx, base + 24, 200, 60);
    g.lineStyle(3, INK, 1);
    g.fillStyle(0xf2e6d0, 1);
    g.fillRoundedRect(cx - 40, base - 62, 80, 64, 8);
    g.strokeRoundedRect(cx - 40, base - 62, 80, 64, 8);
    g.fillStyle(0xc9cbe6, 1);
    g.beginPath();
    g.arc(cx, base - 62, 44, Math.PI, 0, false);
    g.closePath();
    g.fillPath();
    g.strokePath();
    g.fillStyle(darken(0xc9cbe6, 0.45), 1);
    g.fillRoundedRect(cx - 5, base - 104, 10, 40, 4);
    g.lineStyle(7, INK, 1);
    g.lineBetween(cx, base - 84, cx + 26, base - 118);
    g.lineStyle(4, 0xffffff, 0.7);
    g.lineBetween(cx + 2, base - 88, cx + 22, base - 114);
    g.lineStyle(3, INK, 1);
    g.fillStyle(0x8a6a4a, 1);
    g.fillRoundedRect(cx - 12, base - 28, 24, 30, 6);
    g.strokeRoundedRect(cx - 12, base - 28, 24, 30, 6);
    g.fillStyle(0xbfe3ff, 1);
    g.fillCircle(cx + 24, base - 40, 8);
    g.strokeCircle(cx + 24, base - 40, 8);
    g.fillStyle(GOLD, 0.9);
    for (const [sx, sy, r] of [
      [cx - 46, base - 130, 3],
      [cx + 52, base - 140, 2.5],
      [cx + 8, base - 150, 2],
    ]) {
      g.fillCircle(sx, sy, r);
    }
    text(this, cx, base + 12, 'Stargaze', 12, INK, 700).setOrigin(0.5).setDepth(-49).setAlpha(0.85);
    this.dropGlows.push(this.drawDropGlow(OBS));
  }

  private drawMine(): void {
    const g = this.add.graphics().setDepth(-50);
    const cx = MINE_MOUTH.x;
    const base = MINE_MOUTH.y;
    g.fillStyle(darken(HILL_NEAR, 0.08), 1);
    g.fillEllipse(cx, base + 14, 200, 76);
    g.fillStyle(0x7d7468, 1);
    g.lineStyle(3, INK, 1);
    g.fillEllipse(cx, base - 16, 120, 90);
    g.strokeEllipse(cx, base - 16, 120, 90);
    g.fillStyle(0x9a8f80, 1);
    g.fillEllipse(cx - 22, base - 36, 40, 26);
    const mouth = { tl: 30, tr: 30, bl: 0, br: 0 };
    g.fillStyle(0x1a1420, 1);
    g.fillRoundedRect(cx - 30, base - 44, 60, 52, mouth);
    g.strokeRoundedRect(cx - 30, base - 44, 60, 52, mouth);
    g.fillStyle(0x8a5a3a, 1);
    for (const [bx, by, bw, bh] of [
      [cx - 38, base - 50, 76, 9],
      [cx - 38, base - 50, 9, 58],
      [cx + 29, base - 50, 9, 58],
    ]) {
      g.fillRect(bx, by, bw, bh);
      g.strokeRect(bx, by, bw, bh);
    }
    g.lineStyle(3, 0x5b5148, 1);
    g.lineBetween(cx - 14, base + 8, cx - 26, base + 40);
    g.lineBetween(cx + 14, base + 8, cx + 26, base + 40);
    g.lineStyle(2, 0x5b5148, 1);
    for (let i = 0; i < 4; i++) g.lineBetween(cx - 16 - i * 3, base + 14 + i * 8, cx + 16 + i * 3, base + 14 + i * 8);
    g.fillStyle(0xffd27a, 1);
    g.lineStyle(2, INK, 1);
    g.fillCircle(cx + 44, base - 30, 6);
    g.strokeCircle(cx + 44, base - 30, 6);
    this.add.image(cx - 50, base - 30, 'pickaxe').setScale(0.55).setAngle(-30).setDepth(-49);
    text(this, cx, base + 46, 'The Mine', 12, INK, 700).setOrigin(0.5).setDepth(-49).setAlpha(0.85);
    this.mineBadge = text(this, cx, base - 66, '', 11, INK, 700).setOrigin(0.5).setDepth(-49).setPadding(6, 3, 6, 3).setBackgroundColor('rgba(255,250,240,0.9)');
    this.dropGlows.push(this.drawDropGlow(MINE));

    // Below the pets in depth, so a drag across the entrance still belongs to the pet.
    const zone = this.add.zone(MINE.x + MINE.w / 2, MINE.y + MINE.h / 2, MINE.w, MINE.h).setInteractive({ useHandCursor: true }).setDepth(-47);
    zone.on('pointerup', (p: Phaser.Input.Pointer) => p.getDistance() < TAP_SLOP && this.openMine());
    this.refreshMineBadge();
  }

  private drawDropGlow(rect: Rect): Phaser.GameObjects.Graphics {
    const glow = this.add.graphics().setDepth(-48).setAlpha(0);
    glow.lineStyle(3, GOLD, 0.9);
    glow.fillStyle(GOLD, 0.12);
    glow.fillRoundedRect(rect.x, rect.y, rect.w, rect.h, 20);
    glow.strokeRoundedRect(rect.x, rect.y, rect.w, rect.h, 20);
    return glow;
  }

  private refreshMineBadge(): void {
    const digging = world.garden.miningPets().length;
    this.mineBadge.setText(digging ? `${digging} digging · tap to look in` : 'tap to look in');
  }

  private drawTopBar(): void {
    const g = this.add.graphics().setDepth(-90);
    g.fillStyle(CREAM, 1);
    g.fillRect(0, 0, W, TOP_H);
    g.fillStyle(mix(CREAM, 0xffffff, 0.5), 1);
    g.fillRect(PLAY.x + PLAY.w, TOP_H, W - PLAY.w, H - TOP_H);
    g.fillStyle(mix(GRASS, CREAM, 0.7), 1);
    g.fillRect(0, TRAY.y - 8, PLAY.w, H - TRAY.y + 8);
    g.lineStyle(2, PANEL_LINE, 1);
    g.lineBetween(0, TOP_H, W, TOP_H);

    text(this, 18, 16, 'Digital Pet Place', 18, INK, 700);
    this.petCount = text(this, 196, 20, '', 12, MUTED, 600);

    const topButton = (x: number, label: string, w: number, onClick: () => void): Button => button(this, x, TOP_H / 2, label, onClick, { w, h: 30, size: 12 });
    topButton(W - 40, '⛶', 44, () => this.toggleFullscreen());
    const soundLabel = (): string => (isMuted() ? 'Sound off' : 'Sound on');
    const sound = topButton(W - 92, soundLabel(), 84, () => {
      setMuted(!isMuted());
      sound.setLabel(soundLabel());
    });
    topButton(W - 170, 'Export', 64, () => this.exportGarden());
    topButton(W - 240, 'Import', 64, () => void this.importGarden());
    topButton(W - 322, 'New garden', 90, () => this.resetGarden());
  }

  private toggleFullscreen(): void {
    if (this.scale.isFullscreen) this.scale.stopFullscreen();
    else this.scale.startFullscreen();
  }

  private exportGarden(): void {
    saveNow();
    exportSave(world.garden.toSave());
    this.toast.show('Save file downloaded.');
  }

  private async importGarden(): Promise<void> {
    const save = await importSave();
    if (!save) {
      this.toast.show('That file is not a garden save.');
      return;
    }
    replaceWorld(save);
    this.scene.restart();
  }

  /** Two taps within three seconds, so a stray tap never wipes a garden. */
  private resetGarden(): void {
    if (this.time.now - this.resetArmedAt < 3000) {
      resetWorld();
      this.scene.restart();
      return;
    }
    this.resetArmedAt = this.time.now;
    this.toast.show('Tap "New garden" again to start over. Everything here will be lost.', 3000);
  }

  // ── tray (eggs, coins, pouch, shop) ─────────────────────────────────────

  buildTray(): void {
    for (const it of this.trayItems) it.destroy();
    this.trayItems = [];
    const garden = world.garden;
    const cy = TRAY.y + TRAY.h / 2;
    const add = <T extends Phaser.GameObjects.GameObject>(obj: T): T => {
      this.trayItems.push(obj);
      return obj;
    };

    const eggs = garden.inventory.eggs;
    add(text(this, TRAY.x, TRAY.y - 2, eggs.length ? `Eggs · ${eggs.length}` : 'No eggs', 11, MUTED, 600));
    const shown = eggs.slice(0, 6);
    shown.forEach((egg, i) => add(this.eggIcon(egg, TRAY.x + 24 + i * 46, cy + 6)));
    if (eggs.length > shown.length) add(text(this, TRAY.x + 24 + shown.length * 46, cy, `+${eggs.length - shown.length}`, 12, MUTED, 600).setOrigin(0, 0.5));

    add(text(this, 306, TRAY.y - 2, 'Coins', 11, MUTED, 600));
    add(this.add.image(318, cy + 6, 'coin').setScale(0.85));
    add(text(this, 334, cy + 6, String(garden.coins), 13, INK, 700).setOrigin(0, 0.5));

    add(text(this, 380, TRAY.y - 2, `Power-ups · ${garden.totalPowerUps()}`, 11, MUTED, 600));
    STAT_KEYS.forEach((k, i) => {
      const x = 380 + i * 41;
      add(this.add.image(x + 10, cy + 6, ensureGemTexture(this, k, 1, 'neutral')).setScale(0.72));
      add(text(this, x + 24, cy + 6, String(garden.countStat(k)), 12, INK, 700).setOrigin(0, 0.5));
    });

    // The shop borrows no pet, so it is a button rather than a place.
    add(button(this, 616, cy + 6, 'Shop', () => this.openShop(), { w: 48, h: 28, size: 12 }));
    this.petCount.setText(`${garden.pets.length} / ${GARDEN_CAPACITY} pets`);
  }

  private eggIcon(egg: Egg, x: number, y: number): Phaser.GameObjects.Image {
    const { stat, grade } = bestGrade(egg.grades);
    const key = ensureEggTexture(this, stat, GRADES.indexOf(grade) + 1, egg.generation > 1);
    const img = this.add.image(x, y, key).setScale(0.58).setInteractive({ useHandCursor: true });
    img.on('pointerup', () => this.hatch(egg, img));
    img.on('pointerover', () => img.setScale(0.64));
    img.on('pointerout', () => img.setScale(0.58));
    return img;
  }

  private hatch(egg: Egg, img: Phaser.GameObjects.Image): void {
    if (world.garden.isFull) {
      this.toast.show(`The meadow is full (${GARDEN_CAPACITY}). The egg will keep.`);
      return;
    }
    const x = Phaser.Math.Between(GROUND.x1 + 60, GROUND.x2 - 60);
    const y = Phaser.Math.Between(GROUND.y1 + 20, GROUND.y2 - 20);
    const pet = world.garden.hatch(egg.id, x, y);
    if (!pet) return;
    img.disableInteractive();
    this.tweens.add({ targets: img, x, y, scale: 0.9, duration: 420, ease: 'Quad.easeInOut', onComplete: () => this.onHatched(pet, img) });
  }

  private onHatched(pet: Pet, eggImage: Phaser.GameObjects.Image): void {
    eggImage.destroy();
    burst(this, pet.x, pet.y - 20, { tint: CREAM, count: 18 });
    const actor = this.spawnActor(pet).setScale(0.2);
    this.tweens.add({ targets: actor, scale: 1, duration: 320, ease: 'Back.easeOut' });
    chimeHatch();
    this.toast.show(`${pet.name} hatched!`);
    this.buildTray();
    this.updateHint(true);
  }

  private spawnActor(pet: Pet): PetActor {
    const actor = new PetActor(this, pet);
    actor.setDepth(actor.y);
    this.actors.push(actor);
    return actor;
  }

  private removeActor(actor: PetActor): void {
    this.actors = this.actors.filter((a) => a !== actor);
    actor.destroy();
  }

  private actorOf(pet: Pet): PetActor | undefined {
    return this.actors.find((a) => a.pet === pet);
  }

  // ── drag & drop ─────────────────────────────────────────────────────────

  private wireDrag(): void {
    this.input.on('dragstart', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      if (!(obj instanceof PetActor)) return;
      obj.dragging = true;
      obj.target = null;
      this.dragStart = { x: obj.x, y: obj.y };
      obj.setDepth(DEPTH_DRAGGED);
      this.tweens.add({ targets: obj.sprite, scale: obj.scaleForStage * 1.1, duration: 120 });
      if (obj.pet.stage !== 'cocoon') this.tweens.add({ targets: this.dropGlows, alpha: 1, duration: 200 });
    });
    this.input.on('drag', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject, x: number, y: number) => {
      if (obj instanceof PetActor) obj.setPosition(x, y);
    });
    this.input.on('dragend', (p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      if (!(obj instanceof PetActor)) return;
      obj.dragging = false;
      this.tweens.add({ targets: obj.sprite, scale: obj.scaleForStage, duration: 120 });
      this.tweens.add({ targets: this.dropGlows, alpha: 0, duration: 200 });
      const moved = Phaser.Math.Distance.Between(this.dragStart.x, this.dragStart.y, obj.x, obj.y) > TAP_SLOP;
      if (moved) this.drop(obj, p.x, p.y);
      else this.tap(obj);
    });
  }

  private tap(actor: PetActor): void {
    actor.setPosition(this.dragStart.x, this.dragStart.y);
    actor.setDepth(actor.docked ? DEPTH_DOCKED : actor.y);
    const counted = world.garden.pet(actor.pet);
    this.tweens.add({ targets: actor.sprite, scaleX: actor.scaleForStage * 1.12, scaleY: actor.scaleForStage * 0.9, duration: 90, yoyo: true });
    const heart = this.add.image(actor.x + Phaser.Math.Between(-14, 14), actor.y - 46, 'heart').setDepth(DEPTH_FX).setScale(counted ? 0.9 : 0.55).setAlpha(counted ? 1 : 0.5);
    floatUp(this, heart, 40, 800);
    if (counted) chimePop(true);
    if (this.panel.actor === actor) this.panel.refresh();
  }

  private drop(actor: PetActor, px: number, py: number): void {
    const mate = this.findMate(actor, px, py);
    if (mate) return this.pair(actor, mate);
    if (actor.pet.stage !== 'cocoon' && inRect(px, py, MINE)) return this.dispatchOrExplain(actor, MODULE_MINE, () => this.sendDown(actor));
    if (actor.pet.stage !== 'cocoon' && inRect(px, py, OBS)) return this.dispatchOrExplain(actor, MODULE_CONSTELLATIONS, () => this.startNight(actor));
    if (inRect(px, py, PANEL_RECT)) return this.panel.open(actor);
    if (actor.docked) this.panel.close();
    const onMeadow = px >= GROUND.x1 - 30 && px <= GROUND.x2 + 30 && py >= HORIZON && py <= TRAY.y;
    if (!onMeadow) return this.snapBack(actor);
    actor.settle(px, py);
  }

  /** Only adults pair, so dropping a hatchling beside a friend is just a drop (design §3.6). */
  private findMate(actor: PetActor, px: number, py: number): PetActor | undefined {
    if (actor.pet.stage !== 'adult') return undefined;
    return this.actors.find((o) => o !== actor && !o.docked && o.pet.stage === 'adult' && Phaser.Math.Distance.Between(o.x, o.y, px, py) < PAIR_RADIUS);
  }

  private dispatchOrExplain(actor: PetActor, moduleId: string, go: () => void): void {
    this.explainOr(world.garden.canDispatch(actor.pet, moduleId), actor, go);
  }

  private explainOr(verdict: Verdict, actor: PetActor, go: () => void): void {
    if (verdict.ok) return go();
    this.toast.show(verdict.reason);
    this.snapBack(actor);
  }

  private snapBack(actor: PetActor): void {
    const to = actor.docked ? PORTRAIT : this.dragStart;
    this.tweens.add({ targets: actor, x: to.x, y: to.y, duration: 220, ease: 'Quad.easeOut', onComplete: () => actor.setDepth(actor.docked ? DEPTH_DOCKED : actor.y) });
  }

  feed(pet: Pet, stat: StatKey, flavor: Flavor): void {
    const result = world.garden.feed(pet, stat, flavor);
    if (!result.ok) return;
    chimePop(result.leveled);
    this.panel.refresh();
    this.buildTray();
    const actor = this.actorOf(pet);
    if (!actor) return;
    const gem = this.add.image(actor.x, actor.y + 40, ensureGemTexture(this, stat, (result.tier || 1) as Tier, flavor)).setDepth(DEPTH_FX);
    this.tweens.add({
      targets: gem,
      y: actor.y - 10,
      scale: 0.3,
      alpha: 0,
      duration: 380,
      ease: 'Quad.easeIn',
      onComplete: () => {
        gem.destroy();
        this.tweens.add({ targets: actor.sprite, scaleY: actor.scaleForStage * 1.14, duration: 110, yoyo: true });
        if (result.leveled) this.celebrateLevel(actor, stat);
      },
    });
  }

  private celebrateLevel(actor: PetActor, stat: StatKey): void {
    burst(this, actor.x, actor.y - 34, { tint: STAT_COLOR[stat], count: 20 });
    this.toast.show(`${actor.pet.name}'s ${STAT_LABEL[stat]} reached level ${actor.pet.stats[stat].level}!`);
  }

  private pair(actor: PetActor, mate: PetActor): void {
    this.explainOr(world.garden.canBreed(actor.pet, mate.pet), actor, () => {
      world.garden.breed(actor.pet, mate.pet);
      if (actor.docked) this.panel.close();
      actor.settle(mate.x + (actor.x < mate.x ? -56 : 56), mate.y, 3000);
      mate.target = null;
      mate.rest = 3000;
      for (let i = 0; i < 6; i++) {
        const heart = this.add.image((actor.x + mate.x) / 2 + Phaser.Math.Between(-24, 24), mate.y - 30, 'heart').setDepth(DEPTH_FX).setScale(0.7);
        floatUp(this, heart, 60 + i * 6, 900 + i * 80, i * 60);
      }
      chimeHatch();
      saveNow();
      this.buildTray();
      this.toast.show(`${actor.pet.name} and ${mate.pet.name} made an egg. It is in your tray.`, 3200);
    });
  }

  private sendDown(actor: PetActor): void {
    if (this.panel.actor === actor) this.panel.close();
    actor.disableInteractive();
    world.garden.dispatchMine(actor.pet);
    saveNow();
    this.actors = this.actors.filter((a) => a !== actor);
    this.tweens.add({ targets: actor, x: MINE_MOUTH.x, y: MINE_MOUTH.y - 24, scale: 0.45, alpha: 0, duration: 420, ease: 'Quad.easeIn', onComplete: () => actor.destroy() });
    this.refreshMineBadge();
    this.buildTray();
    this.toast.show(`${actor.pet.name} went down the mine. Tap the entrance to look in.`, 3000);
  }

  private startNight(actor: PetActor): void {
    if (this.panel.actor === actor) this.panel.close();
    actor.disableInteractive();
    const input = world.garden.dispatch(actor.pet, MODULE_CONSTELLATIONS);
    saveNow();
    this.tweens.add({ targets: actor, x: OBS_CENTER.x, y: OBS_CENTER.y - 10, scale: 0.4, alpha: 0, duration: 380, ease: 'Quad.easeIn' });
    transitionTo(this, 'night', NIGHT_FADE, { input, petId: actor.pet.id }, 520);
  }

  private openMine(): void {
    saveNow();
    transitionTo(this, 'mine', MINE_FADE);
  }

  private openShop(): void {
    saveNow();
    transitionTo(this, 'shop', SHOP_FADE, undefined, 300);
  }

  // ── hints ───────────────────────────────────────────────────────────────

  private nextHint(): string {
    const g = world.garden;
    const home = g.pets.filter((p) => !p.away);
    if (g.pets.length === 0 && g.inventory.eggs.length) return 'Tap an egg to hatch it.';
    if (g.pets.length && !g.flags.includes('constellations.first-night')) return 'Drag a pet onto the observatory to go stargazing.';
    if (home.length && !g.flags.includes('mine.first-run') && g.dispatches.length === 0) return 'Drag a pet onto the mine — it keeps digging while you are away.';
    const anyoneFed = g.pets.some((p) => STAT_KEYS.some((k) => p.stats[k].level > 0));
    if (g.totalPowerUps() > 0 && !this.panel.isOpen && !anyoneFed) return 'Drag a pet into the panel to feed it what you caught.';
    return '';
  }

  private updateHint(force: boolean): void {
    const msg = this.nextHint();
    if (msg === this.hint.text && !force) return;
    this.hint.setText(msg).setAlpha(0);
    if (msg) this.tweens.add({ targets: this.hint, alpha: 0.85, duration: 400 });
  }
}
