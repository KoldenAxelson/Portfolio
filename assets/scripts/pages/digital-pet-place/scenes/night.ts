// night.ts — Constellations, the scene half (design §8). Quiet and still:
// stars flicker into being, you pin them before they fade, and the sky itself
// is the combo meter. No numbers on screen except the pouch.

import type { ModuleInput, Pet } from '../core/types';
import { STAT_KEYS } from '../core/types';
import { FLAVOR_GLYPH, MODULE_CONSTELLATIONS, NIGHT_COOLDOWN, NIGHT_LENGTH, STAT_COLOR, STAT_LABEL } from '../core/rules';
import { Rng, randomSeed } from '../core/rng';
import { collectNight, planNight, rollStar } from '../modules/constellations';
import type { NightPlan, StarSpec } from '../modules/constellations';
import { H, W, saveNow, world } from '../state';
import { ensurePetTexture, petScale } from '../art/pets';
import { ensureDotTexture, ensureGemTexture, ensureGlowTexture, ensureHaloTexture, ensureMoonTexture, ensurePouchTexture, ensureRaysTexture, ensureSparkTexture } from '../art/icons';
import { NIGHT_BOTTOM, NIGHT_TOP, lighten, mix } from '../art/palette';
import { chimeCatch, chimeMiss } from '../art/chime';
import { NIGHT_FADE, bump, burst, transitionTo } from '../fx';
import { Toaster, button, panelBox, text } from '../ui';

interface NightData {
  input: ModuleInput;
  petId: string;
}

const SKY = { x1: 50, y1: 56, x2: W - 50, y2: 470 };
const POUCH = { x: W - 52, y: 46 };
const HIT_RADIUS = 34; // fingers, not cursors, are the target
const MAX_STREAK_GLOW = 8;
const INK_LIGHT = 0xe6e9ff;
const INK_DIM = 0xaab2e6;
const NIGHT_BUTTON = { fill: 0x141a3d, line: 0x2f3a78, color: 0xc7cdf5 };

class Star extends Phaser.GameObjects.Container {
  phase: 'flicker' | 'live' | 'gone' = 'flicker';
  private spark: Phaser.GameObjects.Image;

  constructor(scene: NightScene, x: number, y: number, public spec: StarSpec) {
    super(scene, x, y);
    const color = STAT_COLOR[spec.stat];
    const halo = ensureHaloTexture(scene, spec.flavor);
    if (spec.rare) this.add(scene.add.image(0, 0, 'rays').setTint(lighten(color, 0.5)).setAlpha(0.9));
    this.add(scene.add.image(0, 0, 'glow').setTint(color).setBlendMode(Phaser.BlendModes.ADD));
    this.spark = scene.add.image(0, 0, 'spark').setTint(lighten(color, 0.55)).setScale(0.55);
    this.add(this.spark);
    if (halo) this.add(scene.add.image(0, 0, halo).setScale(spec.rare ? 1.3 : 1));
    this.setScale(spec.rare ? 0.6 : 0.45).setAlpha(0.2);
    scene.add.existing(this);

    // The flicker is the telegraph: a watching player reads it before the bloom.
    scene.tweens.add({ targets: this, alpha: { from: 0.15, to: 0.6 }, duration: spec.rare ? 420 : 190, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    scene.time.delayedCall(spec.flickerMs, () => this.bloom(scene));
  }

  private bloom(scene: NightScene): void {
    if (this.phase !== 'flicker') return;
    this.phase = 'live';
    scene.tweens.killTweensOf(this);
    scene.tweens.add({ targets: this, alpha: 1, scale: this.spec.rare ? 1.25 : 1, duration: 260, ease: 'Back.easeOut' });
    scene.tweens.add({ targets: this.spark, angle: 90, duration: this.spec.liveMs, ease: 'Linear' });
    this.setInteractive({ hitArea: new Phaser.Geom.Circle(0, 0, HIT_RADIUS), hitAreaCallback: Phaser.Geom.Circle.Contains, useHandCursor: true });
    this.on('pointerdown', () => scene.catchStar(this));
    scene.time.delayedCall(this.spec.liveMs, () => this.fade(scene));
  }

  private fade(scene: NightScene): void {
    if (this.phase !== 'live') return;
    this.take();
    scene.missStar();
    scene.tweens.add({ targets: this, alpha: 0, scale: 0.5, duration: 520, ease: 'Quad.easeIn', onComplete: () => this.destroy() });
  }

  take(): void {
    this.phase = 'gone';
    this.disableInteractive();
  }
}

export class NightScene extends Phaser.Scene {
  private moduleInput!: ModuleInput;
  private petId = '';
  private plan!: NightPlan;
  private rng = new Rng(randomSeed());
  private stars: Star[] = [];
  private caught: StarSpec[] = [];
  private streak = 0;
  private elapsed = 0;
  private ending = false;
  private over = false;
  private spawnIn = 700;
  private brightness!: Phaser.GameObjects.Rectangle;
  private moon!: Phaser.GameObjects.Image;
  private pouchCount!: Phaser.GameObjects.Text;
  private pouch!: Phaser.GameObjects.Image;
  private toast!: Toaster;
  private bgStars: Phaser.GameObjects.Image[] = [];

  constructor() {
    super('night');
  }

  init(data: NightData): void {
    this.moduleInput = data.input;
    this.petId = data.petId;
    this.plan = planNight(data.input);
    this.stars = [];
    this.caught = [];
    this.streak = 0;
    this.elapsed = 0;
    this.ending = false;
    this.over = false;
    this.spawnIn = 700;
    this.bgStars = [];
  }

  create(): void {
    ensureGlowTexture(this);
    ensureSparkTexture(this);
    ensureRaysTexture(this);
    ensureDotTexture(this);
    ensureMoonTexture(this);
    ensurePouchTexture(this);
    this.cameras.main.fadeIn(600, ...NIGHT_FADE);
    this.drawSky();
    this.drawGround();
    this.drawHud();
    this.toast = new Toaster(this, W / 2, H - 40, true);
    const name = this.moduleInput.pet?.name;
    this.time.delayedCall(700, () => this.toast.show(name ? `${name} looks up. Watch for the flicker.` : 'Watch for the flicker.', 2600));
  }

  update(time: number, delta: number): void {
    if (this.over) return;
    const dt = Math.min(delta, 250);
    if (!this.ending) this.advanceNight(dt);
    // The moon arcs across the sky; it is the clock.
    const t = Math.min(1, this.elapsed / NIGHT_LENGTH);
    this.moon.setPosition(80 + t * (W - 160), 430 - Math.sin(t * Math.PI) * 360);
    this.bgStars.forEach((s, i) => (s.alpha = 0.35 + 0.3 * Math.sin(time / 900 + i * 1.7)));
  }

  private advanceNight(dt: number): void {
    this.elapsed += dt;
    this.spawnIn -= dt;
    if (this.spawnIn <= 0) {
      this.spawn();
      this.spawnIn = this.plan.spawnEvery * this.rng.range(0.75, 1.25);
    }
    if (this.elapsed >= NIGHT_LENGTH) this.endNight();
  }

  // ── drawing ─────────────────────────────────────────────────────────────

  private drawSky(): void {
    const g = this.add.graphics().setDepth(-100);
    const bands = 60;
    for (let i = 0; i < bands; i++) {
      g.fillStyle(mix(NIGHT_TOP, NIGHT_BOTTOM, i / (bands - 1)), 1);
      g.fillRect(0, (i * H) / bands, W, H / bands + 1);
    }
    for (let i = 0; i < 70; i++) {
      const x = 10 + ((i * 331) % (W - 20));
      const y = 10 + ((i * 197) % 470);
      this.bgStars.push(this.add.image(x, y, 'dot').setScale(0.08 + ((i * 7) % 5) * 0.03).setAlpha(0.5).setDepth(-90));
    }
    this.moon = this.add.image(80, 430, 'moon').setDepth(-80).setAlpha(0.95);
    this.brightness = this.add.rectangle(W / 2, H / 2, W, H, 0xb9c6ff, 0).setDepth(-70).setBlendMode(Phaser.BlendModes.ADD);
  }

  private drawGround(): void {
    const g = this.add.graphics().setDepth(-60);
    g.fillStyle(0x0a0d22, 1);
    g.fillEllipse(W * 0.25, H + 40, 900, 320);
    g.fillEllipse(W * 0.8, H + 60, 800, 300);
    g.fillStyle(0x05071a, 1);
    g.fillEllipse(W / 2, H + 90, 1100, 300);
    const pet = this.moduleInput.pet;
    if (!pet) return;
    const img = this.add.image(W / 2, H - 78, ensurePetTexture(this, pet)).setOrigin(0.5, 0.6).setScale(petScale(pet.stage) * 0.95).setDepth(-50).setTint(0x8f97c9);
    this.tweens.add({ targets: img, y: img.y - 4, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private drawHud(): void {
    this.pouch = this.add.image(POUCH.x, POUCH.y, 'pouch').setDepth(500);
    this.pouchCount = text(this, POUCH.x - 34, POUCH.y, '0', 16, INK_LIGHT, 700).setOrigin(1, 0.5).setDepth(500);
    button(this, 70, 30, 'Leave early', () => this.endNight(), { w: 110, h: 30, size: 12, ...NIGHT_BUTTON }).setDepth(500);
  }

  // ── stars ───────────────────────────────────────────────────────────────

  private spawn(): void {
    const spec = rollStar(this.plan, this.moduleInput, this.rng);
    const spot = this.openSkySpot();
    const star = new Star(this, spot.x, spot.y, spec);
    star.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.stars = this.stars.filter((s) => s !== star);
      if (this.ending && this.stars.length === 0) this.finish();
    });
    this.stars.push(star);
  }

  /** A spot clear of the moon and other stars; gives up after a few tries. */
  private openSkySpot(): { x: number; y: number } {
    let spot = { x: 0, y: 0 };
    for (let tries = 0; tries < 12; tries++) {
      spot = { x: this.rng.range(SKY.x1, SKY.x2), y: this.rng.range(SKY.y1, SKY.y2) };
      const clearOfMoon = Phaser.Math.Distance.Between(spot.x, spot.y, this.moon.x, this.moon.y) > 70;
      const clearOfStars = this.stars.every((s) => Phaser.Math.Distance.Between(s.x, s.y, spot.x, spot.y) >= 80);
      if (clearOfMoon && clearOfStars) break;
    }
    return spot;
  }

  catchStar(star: Star): void {
    if (star.phase !== 'live' || this.over) return;
    star.take();
    this.caught.push(star.spec);
    this.streak += 1;
    chimeCatch(star.spec.stat, this.streak - 1, star.spec.rare);
    this.catchFlash(star);
    this.flyGemToPouch(star);
    this.setBrightness(Math.min(this.streak, MAX_STREAK_GLOW) / MAX_STREAK_GLOW);
  }

  missStar(): void {
    if (this.over) return;
    if (this.streak > 0) chimeMiss();
    this.streak = 0;
    this.setBrightness(0);
  }

  private catchFlash(star: Star): void {
    const color = STAT_COLOR[star.spec.stat];
    // Drawn at the origin and positioned, so the scale tween expands it in place.
    const ring = this.add.graphics({ x: star.x, y: star.y }).setDepth(400);
    ring.lineStyle(3, lighten(color, 0.4), 1);
    ring.strokeCircle(0, 0, 14);
    this.tweens.add({ targets: ring, scale: star.spec.rare ? 3.4 : 2.4, alpha: 0, duration: 520, ease: 'Quad.easeOut', onComplete: () => ring.destroy() });
    burst(this, star.x, star.y, {
      tint: [color, lighten(color, 0.6), 0xffffff],
      count: star.spec.rare ? 26 : 14,
      speed: { min: 40, max: 160 },
      gravityY: 0,
      scale: 0.35,
      blendMode: 'ADD',
      depth: 400,
    });
    this.tweens.add({ targets: star, scale: star.scale * 1.6, alpha: 0, duration: 220, ease: 'Quad.easeOut', onComplete: () => star.destroy() });
  }

  private flyGemToPouch(star: Star): void {
    const { stat, tier, flavor } = star.spec;
    const gem = this.add.image(star.x, star.y, ensureGemTexture(this, stat, tier, flavor)).setDepth(450).setScale(0.6);
    const from = new Phaser.Math.Vector2(star.x, star.y);
    const to = new Phaser.Math.Vector2(POUCH.x, POUCH.y);
    const control = new Phaser.Math.Vector2((from.x + to.x) / 2, Math.min(from.y, to.y) - 120);
    const arc = new Phaser.Curves.QuadraticBezier(from, control, to);
    const follower = { t: 0 };
    this.tweens.add({
      targets: follower,
      t: 1,
      duration: 620,
      ease: 'Quad.easeIn',
      onUpdate: () => {
        const p = arc.getPoint(follower.t);
        gem.setPosition(p.x, p.y).setScale(0.6 + follower.t * 0.4);
      },
      onComplete: () => {
        gem.destroy();
        this.pouchCount.setText(String(this.caught.length));
        bump(this, this.pouch);
      },
    });
  }

  /** The sky brightens a step per catch — no counter, just atmosphere. */
  private setBrightness(level: number): void {
    this.tweens.killTweensOf(this.brightness);
    this.tweens.add({ targets: this.brightness, fillAlpha: level * 0.16, duration: level ? 260 : 900, ease: 'Sine.easeOut' });
  }

  // ── end ─────────────────────────────────────────────────────────────────

  private endNight(): void {
    if (this.ending) return;
    this.ending = true;
    // Stars already in the sky get to play out.
    if (this.stars.length === 0) this.finish();
    else this.time.delayedCall(4000, () => this.finish());
  }

  private finish(): void {
    if (this.over) return;
    this.over = true;
    for (const s of this.stars) s.destroy();
    this.stars = [];
    const pet = world.garden.pets.find((p) => p.id === this.petId) ?? null;
    world.garden.applyModuleResult(pet, MODULE_CONSTELLATIONS, collectNight(this.caught), NIGHT_COOLDOWN);
    saveNow();
    this.showResults(pet);
  }

  private showResults(pet: Pet | null): void {
    const rows = STAT_KEYS.filter((k) => this.caught.some((c) => c.stat === k));
    const pw = 420;
    const ph = 150 + rows.length * 34;
    const px = W / 2 - pw / 2;
    const py = H / 2 - ph / 2 - 20;
    const name = pet?.name ?? 'Your pet';
    const n = this.caught.length;
    const summary = n ? `${name} brought home ${n} power-up${n === 1 ? '' : 's'}:` : `${name} watched a quiet sky. Nothing tonight.`;
    panelBox(this, px, py, pw, ph, 0x0f1433, 0x33407f, 0.96).setDepth(600);
    text(this, W / 2, py + 30, 'The night is over', 20, INK_LIGHT, 700).setOrigin(0.5).setDepth(601);
    text(this, W / 2, py + 58, summary, 13, INK_DIM, 500).setOrigin(0.5).setDepth(601);
    rows.forEach((stat, i) => this.resultRow(stat, px, pw, py + 92 + i * 34));
    button(this, W / 2, py + ph - 34, 'Back to the meadow', () => transitionTo(this, 'garden', NIGHT_FADE), { w: 200, h: 36, size: 13, fill: 0x2a3480, line: 0x4a56b8, color: 0xffffff }).setDepth(602);
  }

  private resultRow(stat: (typeof STAT_KEYS)[number], px: number, pw: number, ry: number): void {
    const mine = this.caught.filter((c) => c.stat === stat);
    const tierCount = (t: number): number => mine.filter((c) => c.tier === t).length;
    const flavorCount = (f: StarSpec['flavor']): number => mine.filter((c) => c.flavor === f).length;
    const detail = [
      tierCount(3) ? `${tierCount(3)} tier 3` : '',
      tierCount(2) ? `${tierCount(2)} tier 2` : '',
      flavorCount('hero') ? `${FLAVOR_GLYPH.hero} ${flavorCount('hero')}` : '',
      flavorCount('dark') ? `${FLAVOR_GLYPH.dark} ${flavorCount('dark')}` : '',
    ]
      .filter(Boolean)
      .join(' · ');
    this.add.image(px + 36, ry, ensureGemTexture(this, stat, 1, 'neutral')).setDepth(601).setScale(0.9);
    text(this, px + 58, ry, STAT_LABEL[stat], 14, INK_LIGHT, 600).setOrigin(0, 0.5).setDepth(601);
    text(this, px + 150, ry, `×${mine.length}`, 14, lighten(STAT_COLOR[stat], 0.35), 700).setOrigin(0, 0.5).setDepth(601);
    text(this, px + pw - 24, ry, detail, 11, INK_DIM, 500).setOrigin(1, 0.5).setDepth(601);
  }
}
