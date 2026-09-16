// mine.ts — The Mine, the scene half (design §7). Nothing here simulates:
// each lane replays its run up to "now" once a second (modules/mine.ts) and
// shows the haul so far. Collect resolves the run for real.

import type { MineDispatch, Pet } from '../core/types';
import { STAT_KEYS, countPowerUps } from '../core/types';
import { MINE_CAP, STAT_COLOR } from '../core/rules';
import type { MineRun } from '../modules/mine';
import { H, W, saveNow, world } from '../state';
import { ensurePetTexture, petScale } from '../art/pets';
import { ensureCoinTexture, ensureDotTexture, ensureGemTexture, ensureGlowTexture, ensureOreTexture, ensurePickaxeTexture } from '../art/icons';
import { GOLD, INK, darken, lighten, mix } from '../art/palette';
import { chimePop } from '../art/chime';
import { MINE_FADE, burst, transitionTo } from '../fx';
import { DARK_BUTTON, backToMeadowButton, button, pager, paginate, panelBox, text } from '../ui';

const ROCK = 0x2b2331;
const ROCK_LIGHT = 0x3a3040;
const TUNNEL = 0x1a1420;
const BEAM = 0x8a5a3a;
const CHALK = 0xf3ead8;
const CHALK_DIM = 0xb9aec6;
const LANE_H = 92;
const LANE_TOP = 108;
const LANES_PER_PAGE = 6;
const RECEIPT_ROWS = 4;

const fmtDuration = (ms: number): string => {
  const m = Math.floor(ms / 60_000);
  if (m < 1) return `${Math.floor(ms / 1000)} s`;
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
};

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

interface Lane {
  dispatch: MineDispatch;
  pet: Pet;
  objects: Phaser.GameObjects.GameObject[];
  pick: Phaser.GameObjects.Image;
  sprite: Phaser.GameObjects.Image;
  since: Phaser.GameObjects.Text;
  haul: Phaser.GameObjects.Text;
  snore: Phaser.GameObjects.Text;
  swing: Phaser.Tweens.Tween;
  resting: boolean;
}

export class MineScene extends Phaser.Scene {
  private lanes: Lane[] = [];
  private page = 0;
  private coinsText!: Phaser.GameObjects.Text;
  private pageObjects: Phaser.GameObjects.GameObject[] = [];
  private receipt: Phaser.GameObjects.GameObject[] = [];
  private tick = 0;

  constructor() {
    super('mine');
  }

  create(): void {
    ensureDotTexture(this);
    ensureGlowTexture(this);
    ensureCoinTexture(this);
    ensurePickaxeTexture(this);
    ensureOreTexture(this);
    this.page = 0;
    this.lanes = [];
    this.pageObjects = [];
    this.receipt = [];
    this.cameras.main.fadeIn(420, ...MINE_FADE);
    this.drawRock();
    this.drawHeader();
    this.buildLanes();
  }

  update(_time: number, delta: number): void {
    this.tick += delta;
    if (this.tick < 1000) return;
    this.tick = 0;
    this.refreshLanes();
  }

  // ── drawing ─────────────────────────────────────────────────────────────

  private drawRock(): void {
    const g = this.add.graphics().setDepth(-100);
    g.fillStyle(ROCK, 1);
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) {
      g.fillStyle(i % 3 ? darken(ROCK, 0.25) : ROCK_LIGHT, 0.5);
      g.fillEllipse((i * 197) % W, (i * 131) % H, 30 + (i % 5) * 12, 16 + (i % 4) * 6);
    }
    for (let i = 0; i < 18; i++) {
      const x = 20 + ((i * 251) % (W - 40));
      const y = 60 + ((i * 173) % (H - 120));
      this.add
        .image(x, y, 'ore')
        .setScale(0.5 + (i % 3) * 0.15)
        .setAlpha(0.7)
        .setDepth(-90)
        .setTint(mix(0x6b7280, STAT_COLOR[STAT_KEYS[i % 5]], 0.45));
    }
    g.fillStyle(BEAM, 1);
    g.lineStyle(3, INK, 1);
    g.fillRect(0, 78, W, 12);
    g.strokeRect(-2, 78, W + 4, 12);
  }

  private drawHeader(): void {
    text(this, 24, 22, 'The Mine', 22, CHALK, 700);
    text(this, 24, 50, 'Runs while you are away, up to 12 hours. Collect to bring a pet home.', 12, CHALK_DIM, 500);
    this.add.image(W - 250, 34, 'coin').setScale(0.9);
    this.coinsText = text(this, W - 234, 34, String(world.garden.coins), 16, CHALK, 700).setOrigin(0, 0.5);
    backToMeadowButton(this, W - 100, 34, () => transitionTo(this, 'garden', MINE_FADE), DARK_BUTTON);
  }

  // ── lanes ───────────────────────────────────────────────────────────────

  private buildLanes(): void {
    for (const lane of this.lanes) {
      lane.swing.stop();
      for (const o of lane.objects) o.destroy();
    }
    for (const o of this.pageObjects) o.destroy();

    const page = paginate(world.garden.miningPets(), this.page, LANES_PER_PAGE);
    this.page = page.page;
    this.lanes = page.items.map(({ pet, dispatch }, i) => this.makeLane(pet, dispatch, LANE_TOP + i * LANE_H));
    this.pageObjects = pager(this, W / 2, H - 20, page, (dir) => this.turnPage(dir), { ...DARK_BUTTON, color: CHALK_DIM });
    if (page.items.length === 0) {
      this.pageObjects.push(
        text(this, W / 2, H / 2 - 16, 'Nobody is down here.', 18, CHALK, 700).setOrigin(0.5),
        text(this, W / 2, H / 2 + 14, 'Drag a pet onto the mine entrance in the meadow to start a run.', 13, CHALK_DIM, 500).setOrigin(0.5),
      );
    }
    this.refreshLanes();
  }

  private turnPage(dir: number): void {
    this.page += dir;
    this.buildLanes();
  }

  private makeLane(pet: Pet, dispatch: MineDispatch, y: number): Lane {
    const tunnel = this.add.graphics();
    tunnel.fillStyle(TUNNEL, 1);
    tunnel.fillRoundedRect(24, y, W - 48, LANE_H - 10, 18);
    tunnel.fillStyle(BEAM, 1);
    tunnel.lineStyle(2, INK, 1);
    for (const bx of [30, W - 38]) {
      tunnel.fillRect(bx, y + 6, 8, LANE_H - 22);
      tunnel.strokeRect(bx, y + 6, 8, LANE_H - 22);
    }
    const lantern = this.add.image(112, y + 42, 'glow').setTint(0xffb35c).setScale(2.2).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD);
    const sprite = this.add.image(104, y + 46, ensurePetTexture(this, pet)).setOrigin(0.5, 0.6).setScale(petScale(pet.stage) * 0.8);
    const pick = this.add.image(134, y + 40, 'pickaxe').setOrigin(0.5, 0.85).setScale(0.8).setAngle(-40);
    const swing = this.tweens.add({
      targets: pick,
      angle: 35,
      duration: 260,
      yoyo: true,
      hold: 60,
      repeat: -1,
      repeatDelay: 420,
      ease: 'Quad.easeIn',
      onYoyo: () => this.chip(pet, 152, y + 56),
    });
    const snore = text(this, 140, y + 14, 'z z', 14, CHALK_DIM, 700).setVisible(false);
    const name = text(this, 190, y + 14, pet.name, 16, CHALK, 700);
    const since = text(this, 190, y + 36, '', 12, CHALK_DIM, 500);
    const haul = text(this, 190, y + 56, '', 12, CHALK, 500);
    const collect = button(this, W - 120, y + 41, 'Collect', () => this.collect(dispatch), { w: 120, h: 34, size: 13, fill: mix(GOLD, 0x000000, 0.1), line: darken(GOLD, 0.4), color: INK });
    return { dispatch, pet, objects: [tunnel, lantern, sprite, pick, snore, name, since, haul, collect], pick, sprite, since, haul, snore, swing, resting: false };
  }

  private refreshLanes(): void {
    const now = Date.now();
    for (const lane of this.lanes) {
      const run = world.garden.previewMine(lane.dispatch, now);
      const elapsed = fmtDuration(now - lane.dispatch.startedAt);
      lane.since.setText(run.capped ? `down for ${elapsed} · capped at ${fmtDuration(MINE_CAP)}` : `down for ${elapsed}`);
      lane.haul.setText(`so far · ${run.ore} ore · ${plural(countPowerUps(run.output.items), 'power-up')} · ${run.swings} swings`);
      this.setResting(lane, run.phase === 'resting' || run.capped);
    }
    this.coinsText.setText(String(world.garden.coins));
  }

  private setResting(lane: Lane, resting: boolean): void {
    if (resting === lane.resting) return;
    lane.resting = resting;
    lane.snore.setVisible(resting);
    if (!resting) {
      lane.swing.resume();
      lane.sprite.clearTint();
      return;
    }
    lane.swing.pause();
    lane.pick.setAngle(70);
    lane.sprite.setTint(0x9a90a8);
  }

  private chip(pet: Pet, x: number, y: number): void {
    const stat = pet.form?.stat ?? 'power';
    burst(this, x, y, { tint: [CHALK_DIM, lighten(STAT_COLOR[stat], 0.3)], count: 5, speed: { min: 40, max: 120 }, angle: { min: 200, max: 340 }, gravityY: 300, scale: 0.25, depth: 10 });
  }

  private collect(dispatch: MineDispatch): void {
    const run = world.garden.collectMine(dispatch);
    saveNow();
    this.buildLanes();
    if (!run) return;
    chimePop(true);
    const pet = world.garden.pets.find((p) => p.id === dispatch.petId);
    this.showReceipt(run, pet?.name ?? 'Your pet');
  }

  private showReceipt(run: MineRun, name: string): void {
    this.closeReceipt();
    const items = run.output.items.slice(0, RECEIPT_ROWS);
    const pw = 440;
    const ph = 96 + items.length * 26;
    const px = W / 2 - pw / 2;
    const py = H / 2 - ph / 2;
    const keep = <T extends Phaser.GameObjects.GameObject>(obj: T): T => {
      this.receipt.push(obj);
      return obj;
    };
    keep(panelBox(this, px, py, pw, ph, TUNNEL, 0x5a4c62, 0.97).setDepth(600));
    keep(text(this, W / 2, py + 26, `${name} is back up`, 17, CHALK, 700).setOrigin(0.5).setDepth(601));
    const summary = `${run.ore} ore → coins · ${plural(countPowerUps(run.output.items), 'power-up')} · ${fmtDuration(run.elapsed)} of digging`;
    keep(text(this, W / 2, py + 52, summary, 12, CHALK_DIM, 500).setOrigin(0.5).setDepth(601));
    items.forEach((item, i) => {
      if (item.kind !== 'powerup') return;
      const ry = py + 82 + i * 26;
      keep(this.add.image(px + 40, ry, ensureGemTexture(this, item.stat, item.tier, item.flavor)).setDepth(601).setScale(0.8));
      keep(text(this, px + 60, ry, `${item.stat} · tier ${item.tier} · ${item.flavor} ×${item.count}`, 12, CHALK, 500).setOrigin(0, 0.5).setDepth(601));
    });
    const hidden = run.output.items.length - items.length;
    if (hidden > 0) keep(text(this, px + pw - 24, py + ph - 20, `+${hidden} more stacks`, 11, CHALK_DIM, 500).setOrigin(1, 0.5).setDepth(601));
    keep(button(this, W / 2, py + ph - 24, 'Nice', () => this.closeReceipt(), { w: 90, h: 28, size: 12, ...DARK_BUTTON }).setDepth(602));
    this.time.delayedCall(6000, () => this.closeReceipt());
  }

  private closeReceipt(): void {
    for (const o of this.receipt) o.destroy();
    this.receipt = [];
  }
}
