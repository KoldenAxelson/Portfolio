// fx.ts — the few effects every scene reaches for: particle bursts, a scale
// bump, a float-and-fade, and the fade-through-colour scene change.

export interface BurstOpts {
  tint: number | number[];
  count: number;
  speed?: { min: number; max: number };
  angle?: { min: number; max: number };
  gravityY?: number;
  scale?: number;
  blendMode?: string;
  depth?: number;
}

export function burst(scene: Phaser.Scene, x: number, y: number, opts: BurstOpts): void {
  const emitter = scene.add.particles(x, y, 'dot', {
    speed: opts.speed ?? { min: 60, max: 180 },
    angle: opts.angle ?? { min: 0, max: 360 },
    scale: { start: opts.scale ?? 0.55, end: 0 },
    alpha: { start: 1, end: 0 },
    lifespan: { min: 300, max: 650 },
    gravityY: opts.gravityY ?? 160,
    tint: opts.tint,
    blendMode: opts.blendMode ?? 'NORMAL',
    emitting: false,
  });
  emitter.setDepth(opts.depth ?? 7000);
  emitter.explode(opts.count);
  scene.time.delayedCall(900, () => emitter.destroy());
}

export function bump(scene: Phaser.Scene, target: object, scale = 1.18): void {
  scene.tweens.add({ targets: target, scale, duration: 90, yoyo: true });
}

/** Drift a game object up while fading it, then destroy it. */
export function floatUp(scene: Phaser.Scene, target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject, dy: number, duration: number, delay = 0): void {
  scene.tweens.add({
    targets: target,
    y: target.y - dy,
    alpha: 0,
    duration,
    delay,
    ease: 'Quad.easeOut',
    onComplete: () => target.destroy(),
  });
}

export type FadeColor = [number, number, number];
export const NIGHT_FADE: FadeColor = [8, 10, 30];
export const MINE_FADE: FadeColor = [12, 8, 14];
export const SHOP_FADE: FadeColor = [240, 230, 210];

export function transitionTo(scene: Phaser.Scene, key: string, color: FadeColor, data?: object, duration = 400): void {
  scene.cameras.main.fadeOut(duration, ...color);
  scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => scene.scene.start(key, data));
}
