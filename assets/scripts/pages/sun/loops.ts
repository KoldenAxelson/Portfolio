/* The 24 event loops (dwarfstar.online/play's loops[]): active-region loops traced through the field, each a 0-D
 * EBTEL plasma (plasma.ts) that stores free magnetic energy q = twist^2 + shear^2 + neighbour stress, flares as a
 * 12-strand arcade with footpoint ribbons when q passes 0.8, erupts as a flux rope (torus or kink unstable, or q past 3)
 * and launches the CME in cmes.ts that carries it. Cooling flare loops rain. The surface plasma feeds the loops through
 * the flow probe at their footpoints. ribbons.ts draws them into the loop layer in the five EUV views.
 *
 * Clocks (clock.ts): the plasma, glow, arcades, rain and the rope's rise run on the capped plasma clock (anim units);
 * free-energy injection and release, region-driven formation and loop lifetimes on the full star clock (sim units of
 * ANIM_UNIT_S star seconds, and days). */

import { ANIM_UNIT_S } from './clock';
import type { Clock } from './clock';
import type { Cmes, CmeState } from './cmes';
import { GM_SUN_KM3_S2, RSUN_KM } from './constants';
import type { StarField } from './field';
import type { SurfaceFlow } from './flow';
import type { LayerDrawer, LayerFrame } from './layer';
import { ARCADE_HEAT_TAU_S, CM_PER_RSUN, HEAT_TAU_S, N0, equilibrium, flareHeating, halfLengthCm, loopVolumeCm3, plasmaCore } from './plasma';
import type { PlasmaCell } from './plasma';
import { LoopRibbons, ROPE_FADE_LIFT, polylineLength } from './ribbons';
import type { RainStreak, RibbonScene } from './ribbons';
import { flareContrast } from './stars';
import type { Derived, StarPreset } from './stars';
import { add, angleBetween, cross, dot, length, lonLatOf, normalize, scale, tangentAt } from './vec';
import type { Vec3 } from './vec';
import { aiaResponse } from './views';

const MAX_LOOPS = 24;
const STRANDS_PER_LOOP = 3;
const POINTS_PER_STRAND = 32;
const EUV_CHANNELS = [0, 1, 2, 3, 4];
const SECONDS_PER_DAY = 86400;
const TWO_PI = 2 * Math.PI;
/** A loop's lifetime (sim units): stronger loops last longer. */
const lifeOf = (strength: number): number => 20 + 12 * strength;
const MAX_STRENGTH = 3;
/** Arcades a new star starts with, and their strength range and age spread (sim units). */
const SEEDED_ARCADES = 20;
const SEED_STRENGTH = 0.3, SEED_STRENGTH_SPREAD = 0.6, SEED_AGE_SPREAD = 20;
/** Closed field lines (R) shorter than this are too low to show; longer ones are not active-region loops. */
const MIN_LOOP_LENGTH = 0.04, MAX_LOOP_LENGTH = 2.2;
/** A side strand longer than this has wandered off the loop: the strand repeats the main line instead. */
const MAX_SIDE_STRAND_LENGTH = 2.5;
/** A side strand starts this far (R) from the loop's foot, up to twice it. */
const SIDE_STRAND_OFFSET = 0.012;
/** The quiet loop's temperature from the RTV scaling law, clamped to the corona's range (MK). */
const MIN_LOOP_MK = 0.75, MAX_LOOP_MK = 3;
/** The quiet corona's scale height per MK on the Sun (R): H = kT / mg, scaled to the star. */
const SOLAR_SCALE_HEIGHT_PER_MK = 0.07;
/** Formation e-fold time (sim units) per unit of field difference past the formation threshold. */
const FORMATION_TIME = 1.4;
/** A press within this angle (rad) of a loop's footpoint heats that loop instead of lighting a new one. */
const IMPACT_NEAR_RAD = 0.12;
const IMPACT_TRIES = 4;

/** Rain knots per unit of rain intensity per anim unit: the original's 40 per display second at the plasma cap
 *  (600 s/s); the same for the matter draining from a failed CME. */
const RAIN_PER_ANIM = 40 * ANIM_UNIT_S / 600;
const DRAIN_PER_ANIM = 18 * ANIM_UNIT_S / 600;
const MAX_RAIN_KNOTS = 700;
/** Drag holds a falling knot to this terminal speed. */
const RAIN_TERMINAL_KMS = 110;
/** A flare at least this large rains as its loop cools; the rain then fades at this rate per anim unit. */
const RAIN_FLARE_ENERGY = 1.2;
const RAIN_FADE_PER_ANIM = 0.25;
/** Only a CME stalled below this height (R) drains back as rain; one turning around further out disperses. */
const MAX_DRAIN_HEIGHT = 2.2;
const GLOW_RISE_PER_ANIM = 3, GLOW_FADE_PER_ANIM = 2;

/** Footpoint energy (heat + half the wave compression) below this is probe noise. */
const MIN_FOOT_ENERGY = 0.02;
/** Footpoint energy to impulsive heating (x 1e30 erg) and to flare size. */
const FOOT_HEATING_GAIN = 3, FOOT_FLARE_GAIN = 10;
/** A heating front holds its footpoint this long (anim units) before another can start. */
const FRONT_HOLD_ANIM = 3;
/** Absorbed footpoint energy per rope feed, and what each feed adds. */
const FEED_ENERGY = 0.08;
const FEED_LIFT = 0.28, FEED_TWIST = 0.35, FEED_STRENGTH = 0.3;
/** Critical decay index of the torus instability. */
const TORUS_CRITICAL_INDEX = 1.5;
/** Twist above which the rope is kink unstable: more than 3.5 pi. */
const KINK_TWIST = 1.75;
/** Flare energies (x 1e30 erg): from ARCADE_MIN_ENERGY a flare forms an arcade (with 10x the energy), below it the
 *  loop heats itself. */
const ARCADE_MIN_ENERGY = 0.3, ARCADE_ENERGY_SCALE = 10;
const FEED_FLARE_ENERGY = 0.5, ERUPTION_FLARE_ENERGY = 2, CONFINED_FLARE_ENERGY = 1.5, POST_FLARE_ENERGY = 1.5;
/** The post-flare arcade forms this long (star time) after an eruption, from this many loops. */
const POST_FLARE_DELAY_S = 360;
const POST_FLARE_LOOPS = 3;
/** An eruption snaps the strings rooted within this angle (rad). */
const SNAP_RADIUS_RAD = 0.35;

/** One quantity q, three thresholds: flare above `flare`, relax toward `relaxed`, erupt past `snap`; `form` forms
 *  loops. Helicity injection per day, the neighbour-stress gain, the flare energy scale, and the reconnection inflow
 *  (Alfven Mach number and speed). */
const FREE_ENERGY = { flare: 0.8, snap: 3.0, relaxed: 0.25, form: 0.6, helicityPerDay: 0.03, neighbourStress: 0.02, flareScale: 1.5, inflowMach: 0.018, alfvenKms: 1000 };
/** Fitted to the median timing of 33 M/X flares in AIA: 12 strands, impulsive (ARCADE_HEAT_TAU_S), half-lengths
 *  5 -> 12.6 Mm. */
const ARCADE = { strands: 12, lengthGrowth: 1.51, areaCm2: 5.9e19, referenceEnergyErg: 7.5e31, halfLengthMm: 12.6 };
/** Flare sizes follow dN/dE ~ E^-1.8 (Aschwanden et al. 2000; ~2 on M dwarfs, Hawley et al. 2014): each flare
 *  releases this power-law share, from FLARE_MIN_SHARE to all, of the loop's free energy above the relaxed level. */
const FLARE_INDEX = 1.8;
const FLARE_MIN_SHARE = 0.05;
/** Shear from the magnetofrictional stress (non-potential / potential energy near the loop): a region storing ~30 %
 *  of its field energy as free energy (the upper end measured before big flares) crosses the flare threshold. */
const FRICTIONAL_SHEAR_GAIN = Math.sqrt(0.8 / 0.3);

export interface ArcadeStrand extends PlasmaCell {
  readonly volumeCm3: number;
  /** Peak impulsive heating, erg/cm^3/s. */
  readonly peakHeating: number;
  /** When reconnection forms it (anim units). */
  readonly formsAtAnim: number;
}

export interface Arcade { readonly strands: ArcadeStrand[]; readonly bornAnim: number }

export interface EventLoop extends PlasmaCell {
  /** Its first strand's row in the strand points (slot * STRANDS_PER_LOOP). */
  readonly strandRow: number;
  readonly seed: number;
  /** 0..MAX_STRENGTH: the formation envelope, lifetime and brightness. */
  strength: number;
  bornAtSim: number;
  readonly strandCount: number;
  isErupting: boolean;
  eruptedAtSim: number;
  readonly foot: Vec3;
  readonly farFoot: Vec3;
  readonly apex: Vec3;
  readonly quietTemperatureMK: number;
  /** The quiet loop's density (N0). */
  readonly quietDensity: number;
  /** |B| just above the foot over the field's reference strength, at most 3. */
  readonly fieldStrength: number;
  readonly polarity: number;
  glow: number;
  isGlowRising: boolean;
  /** The rope's rise (in units of the loop's own height), with its speed and acceleration. */
  lift: number;
  liftSpeed: number;
  liftAcceleration: number;
  twist: number;
  shear: number;
  neighbourStress: number;
  /** Seconds over which the stored energy is being released after a flare (0: not releasing). */
  releaseS: number;
  /** The free energy the release relaxes to: what a flare of its drawn size leaves behind. */
  relaxTarget: number;
  feedCount: number;
  /** Torus decay index at the apex, once measured. */
  decayIndex: number | null;
  isKinkUnstable: boolean;
  hasCmeFailed: boolean;
  absorbedEnergy: number;
  /** Per EUV channel, the loop's and its arcade's log-scaled brightness (null before its first plasma step). */
  channelBrightness: number[] | null;
  arcade: Arcade | null;
  /** The largest recent flare's energy: a big enough one rains as the loop cools. */
  flareEnergy: number;
  frontStartAnim: number;
  /** The footpoint the heating front entered at (0: foot, 1: far foot). */
  frontFoot: 0 | 1;
  rainIntensity: number;
  rainBacklog: number;
  /** Drawn length of its first strand (km), kept by ribbons.ts for the heating front. */
  drawnLengthKm: number;
}

/** A cool knot: sliding down a post-flare loop's strand (`along` 0..1, `direction` +-1), or draining down a traced
 *  path under a failed CME (`travelled` along its cumulative `pathLength`, R). */
type RainKnot =
  | { kind: 'loop'; loop: EventLoop; strand: number; along: number; direction: number; speedKms: number; strandLengthKm: number; brightness: number }
  | { kind: 'drain'; path: Vec3[]; pathLength: number[]; travelled: number; speedKms: number; brightness: number };

interface Trace { isOpen: boolean; pts: Vec3[]; length: number }

interface RegionDipole { dir: Vec3; axis: Vec3; perp: Vec3 }

/** RK2 field-line trace from the surface, always leaving upward (field-flow.md 2.1); long closed lines count as open. */
function trace(field: StarField, start: Vec3, maxLen = 3, ds = 0.012, maxSteps = 700): Trace {
  let p = scale(normalize(start), 1.003);
  const sign = dot(field.fieldAt(p), p) >= 0 ? 1 : -1;
  const pts: Vec3[] = [normalize(p)];
  let travelled = 0, maxR = 1;
  for (let s = 0; s < maxSteps; s++) {
    const mid = add(p, normalize(field.fieldAt(p)), sign * ds / 2);
    p = add(p, normalize(field.fieldAt(mid)), sign * ds);
    travelled += ds;
    const r = length(p);
    maxR = Math.max(maxR, r);
    pts.push(p);
    if (r >= 2.5 || travelled > maxLen) return { isOpen: true, pts, length: travelled };
    if (r < 1) { pts[pts.length - 1] = normalize(p); return { isOpen: false, pts, length: maxR > 1.012 ? travelled : 0 }; }
  }
  return { isOpen: true, pts, length: travelled };
}

/** Arc-length uniform resampling to `count` points. */
function resample(pts: Vec3[], count: number): Vec3[] {
  const segments: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) { const l = length(add(pts[i], pts[i - 1], -1)); segments.push(l); total += l; }
  const out: Vec3[] = [];
  for (let k = 0, si = 0, covered = 0; k < count; k++) {
    const target = total * k / (count - 1);
    while (si < segments.length - 1 && covered + segments[si] < target) { covered += segments[si]; si++; }
    const fraction = segments[si] > 0 ? Math.min(1, (target - covered) / segments[si]) : 0;
    out.push(add(scale(pts[si], 1 - fraction), pts[si + 1], fraction));
  }
  return out;
}

const freeEnergy = (loop: EventLoop): number => loop.twist * loop.twist + loop.shear * loop.shear + loop.neighbourStress;

/** Star-frame strand points, POINTS_PER_STRAND per row, row = loop slot * STRANDS_PER_LOOP + strand. */
class StrandPoints {
  private readonly data = new Float32Array(MAX_LOOPS * STRANDS_PER_LOOP * POINTS_PER_STRAND * 3);

  clear(): void { this.data.fill(0); }

  write(row: number, pts: Vec3[]): void {
    pts.forEach((p, j) => this.data.set(p, (row * POINTS_PER_STRAND + j) * 3));
  }

  point(row: number, j: number): Vec3 {
    const o = (row * POINTS_PER_STRAND + j) * 3;
    return [this.data[o], this.data[o + 1], this.data[o + 2]];
  }

  /** The point a fraction `along` (0..1) of the way along a row. */
  at(row: number, along: number): Vec3 {
    const f = Math.max(0, Math.min(POINTS_PER_STRAND - 1.001, along * (POINTS_PER_STRAND - 1))), j = Math.floor(f), w = f - j;
    return add(scale(this.point(row, j), 1 - w), this.point(row, j + 1), w);
  }

  strand(row: number): Vec3[] { return Array.from({ length: POINTS_PER_STRAND }, (_, j) => this.point(row, j)); }
}

export class EventLoops implements LayerDrawer {
  /** Low tier: one strand per loop. */
  lite = false;
  /** An eruption snaps the strings rooted near it (strings.ts): direction, angular radius (rad), speed (km/s). */
  onSnapStrings: ((dir: Vec3, angleRad: number, speedKms: number) => void) | null = null;
  /** The magnetofrictional field (frictional.ts): the stored non-potential share of the magnetic energy within an
   *  angle of a direction (null while none has come back), and the release a flare or eruption gives it. */
  stressNear: ((dir: Vec3, angleRad: number) => number | null) | null = null;
  onRelaxField: ((dir: Vec3, angleRad: number, keep: number) => void) | null = null;

  private readonly loops: (EventLoop | null)[] = new Array<EventLoop | null>(MAX_LOOPS).fill(null);
  private readonly strands = new StrandPoints();
  private rain: RainKnot[] = [];
  private readonly drainBacklog = new WeakMap<CmeState, number>();
  private later: { atAnim: number; run: () => void }[] = [];
  private field: StarField | null = null;
  /** A flare kernel's continuum excess over this star's photosphere (stars.ts flareContrast). */
  private flareContrast = 0;
  private derived: Derived | null = null;
  private random: () => number = Math.random;
  private massSun = 1;
  private radiusSun = 1;
  private scaleHeightPerMK = SOLAR_SCALE_HEIGHT_PER_MK;
  private simT = 0;
  private anim = 0;
  private probeSerial = -1;
  private readonly ribbons: LoopRibbons;

  constructor(device: GPUDevice, private readonly cmes: Cmes) {
    this.ribbons = new LoopRibbons(device);
  }

  /** A new star (or a restart): clears every loop, knot and callback and the CMEs, then seeds the arcades. */
  reset(clock: Clock, field: StarField, derived: Derived, star: StarPreset, random: () => number): void {
    this.field = field;
    this.derived = derived;
    this.random = random;
    this.massSun = star.mass;
    this.radiusSun = star.radius;
    this.scaleHeightPerMK = SOLAR_SCALE_HEIGHT_PER_MK * star.radius / star.mass;
    this.flareContrast = flareContrast(star.teff);
    this.simT = clock.starSeconds / ANIM_UNIT_S;
    this.anim = clock.anim;
    this.loops.fill(null);
    this.strands.clear();
    this.rain = [];
    this.later = [];
    this.cmes.reset(star, field, derived);
    for (let k = 0; k < SEEDED_ARCADES; k++) this.spawnArcade(k, SEED_STRENGTH + SEED_STRENGTH_SPREAD * random(), SEED_AGE_SPREAD * random());
  }

  /** CPU physics for one frame. Call after the field evolved and before cmes.step (the order of the original). */
  step(clock: Clock, field: StarField, flow: SurfaceFlow | null): void {
    this.field = field;
    this.simT = clock.starSeconds / ANIM_UNIT_S;
    this.anim = clock.anim;
    if (clock.dDays > 0) {
      this.formAtRegions(clock.dDays * SECONDS_PER_DAY / ANIM_UNIT_S);
      this.stressNeighbours(clock.dDays);
    }
    this.deliverLater();
    for (let i = 0; i < MAX_LOOPS; i++) {
      const loop = this.loops[i];
      if (!loop) continue;
      if (!this.isAlive(loop)) { this.retire(i); continue; }
      this.stepPlasma(loop, clock.dAnim);
      if (clock.dDays > 0) this.stepFree(loop, clock.dDays);
      if (loop.isErupting) this.stepRope(loop, clock.dAnim);
    }
    this.stepRain(clock.dAnim);
    if (flow) this.couplePlasma(flow);
  }

  /** The 48 points the surface-flow probe should sample: each loop's two footpoints (index 2i, 2i + 1). */
  probePoints(): { lon: number; lat: number }[] {
    const unused: Vec3 = [0, 0, 1];
    return this.loops.flatMap((loop) => (loop ? [loop.foot, loop.farFoot] : [unused, unused]).map((p) => lonLatOf(p)));
  }

  /** Pointer press on the disc (star-frame direction): the flash and ring, and if no loop is rooted near it, the heated
   *  plasma lights field lines rooted there. (The flow splat is the caller's: flow.splat.) */
  impact(dirStarFrame: Vec3, energy = 1): void {
    const dir = normalize(dirStarFrame);
    this.cmes.disturb(dir, energy);
    const isNearLoop = this.liveLoops().some((loop) => Math.min(angleBetween(loop.foot, dir), angleBetween(loop.farFoot, dir)) < IMPACT_NEAR_RAD);
    if (isNearLoop) return;
    for (let tries = 0; tries < IMPACT_TRIES; tries++) {
      if (this.spawnAt(add(dir, tangentAt(dir, this.random() * TWO_PI), tries * 0.02), 1 + 0.5 * energy) >= 0) return;
    }
  }

  draw(pass: GPURenderPassEncoder, frame: LayerFrame): void {
    this.ribbons.draw(pass, frame, this.ribbonScene());
  }

  destroy(): void {
    this.ribbons.destroy();
  }

  private ribbonScene(): RibbonScene {
    return {
      loops: this.liveLoops(),
      derived: this.derived!,
      isLite: this.lite,
      simTime: this.simT,
      anim: this.anim,
      radiusSun: this.radiusSun,
      scaleHeightPerMK: this.scaleHeightPerMK,
      flareContrast: this.flareContrast,
      strand: (row) => this.strands.strand(row),
      lifetime: lifeOf,
      rainStreaks: () => this.rain.map((knot): RainStreak => {
        const pose = this.knotPose(knot);
        return { head: pose.head, tail: pose.tail, brightness: knot.brightness };
      }),
    };
  }

  // ---- lifecycle ----------------------------------------------------------------------------------------------

  private isAlive(loop: EventLoop): boolean {
    if (loop.strength <= 0) return false;
    return loop.isErupting ? loop.lift < ROPE_FADE_LIFT : this.simT - loop.bornAtSim < lifeOf(loop.strength);
  }

  private liveLoops(): EventLoop[] {
    return this.loops.filter((loop): loop is EventLoop => loop !== null && this.isAlive(loop));
  }

  private retire(i: number): void {
    const loop = this.loops[i];
    this.loops[i] = null;
    for (const cme of this.cmes.list) if (cme.rope === loop) cme.rope = null;
    this.rain = this.rain.filter((knot) => knot.kind !== 'loop' || knot.loop !== loop);
  }

  private freeSlot(): number {
    const empty = this.loops.findIndex((loop) => !loop || !this.isAlive(loop));
    if (empty >= 0) return empty;
    return this.loops.reduce((oldest, loop, i) => (loop!.bornAtSim < this.loops[oldest]!.bornAtSim ? i : oldest), 0);
  }

  /** The span the magnetofrictional stress is read and released over: the loop's own footprint. */
  private stressRadius(loop: EventLoop): number { return Math.max(0.12, 0.8 * angleBetween(loop.foot, loop.farFoot)); }

  /** A loop on the closed field line from `dirIn` at `strength`; `age` (sim units) back-dates it. Returns the slot
   *  or -1. */
  private spawnAt(dirIn: Vec3, strength: number, age = 0): number {
    const field = this.field!, derived = this.derived!, dir = normalize(dirIn);
    const main = trace(field, dir);
    if (main.isOpen || main.length < MIN_LOOP_LENGTH || main.length > MAX_LOOP_LENGTH) return -1;
    const slot = this.freeSlot();
    if (this.loops[slot]) this.retire(slot);
    const strandRow = slot * STRANDS_PER_LOOP, mainPts = resample(main.pts, POINTS_PER_STRAND);
    this.strands.write(strandRow, mainPts);
    let strandCount = 1;
    for (let k = 1; k < STRANDS_PER_LOOP; k++) {
      const side = trace(field, add(dir, tangentAt(dir, this.random() * TWO_PI), SIDE_STRAND_OFFSET + SIDE_STRAND_OFFSET * this.random()));
      const isUsable = !side.isOpen && side.length <= MAX_SIDE_STRAND_LENGTH;
      this.strands.write(strandRow + k, isUsable ? resample(side.pts, POINTS_PER_STRAND) : mainPts);
      if (isUsable) strandCount++;
    }
    // the RTV scaling law for the loop's temperature (1.6 MK for a 0.4 R loop at the reference field), then the EBTEL
    // equilibrium it holds
    const footField = length(field.fieldAt(dir)) / field.bref;
    const temperatureMK = Math.min(MAX_LOOP_MK, Math.max(MIN_LOOP_MK, 1.6 * Math.cbrt(footField * footField * (main.length / 0.4)) * Math.pow(derived.activity, 0.25)));
    const eq = equilibrium(temperatureMK, halfLengthCm(main.length, this.radiusSun));
    const fieldAbove = field.fieldAt(scale(dir, 1.01));
    const twist = 0.3 + 0.4 * this.random();
    this.loops[slot] = {
      strandRow, seed: this.random() * 100, strength, bornAtSim: this.simT - age, strandCount, isErupting: false, eruptedAtSim: 0,
      foot: dir, farFoot: mainPts[POINTS_PER_STRAND - 1], apex: mainPts[POINTS_PER_STRAND / 2],
      lengthR: main.length, temperatureMK, density: eq.density / N0, backgroundHeating: eq.heating, pulseHeating: 0,
      quietTemperatureMK: temperatureMK, quietDensity: eq.density / N0,
      fieldStrength: Math.min(3, length(fieldAbove) / Math.max(field.bref, 1e-9)), polarity: Math.sign(dot(fieldAbove, dir)) || 1,
      glow: 0, isGlowRising: false, lift: 0, liftSpeed: 0, liftAcceleration: 0, twist, shear: 0, neighbourStress: 0,
      releaseS: 0, relaxTarget: FREE_ENERGY.relaxed, feedCount: 0, decayIndex: null, isKinkUnstable: false, hasCmeFailed: false,
      absorbedEnergy: 0, channelBrightness: null, arcade: null,
      flareEnergy: 0, frontStartAnim: -Infinity, frontFoot: 0, rainIntensity: 0, rainBacklog: 0, drawnLengthKm: 0,
    };
    return slot;
  }

  private regionDipoles(): RegionDipole[] {
    const field = this.field!, out: RegionDipole[] = [];
    for (let k = 1; k < field.positions.length / 4; k++) {
      if (field.positions[k * 4 + 3] < 0.5) continue;
      const dir = normalize([field.positions[k * 4], field.positions[k * 4 + 1], field.positions[k * 4 + 2]]);
      const axis = normalize([field.moments[k * 4], field.moments[k * 4 + 1], field.moments[k * 4 + 2]]);
      out.push({ dir, axis, perp: normalize(cross(dir, axis)) });
    }
    return out;
  }

  /** A loop across region `regionIndex`'s inversion line (6 tries). */
  private spawnArcade(regionIndex: number, strength: number, age = 0): number {
    const dipoles = this.regionDipoles();
    if (dipoles.length === 0) return -1;
    const dipole = dipoles[regionIndex % dipoles.length];
    for (let tries = 0; tries < 6; tries++) {
      const along = (this.random() - 0.5) * 0.2, across = (this.random() < 0.5 ? -1 : 1) * (0.06 + 0.08 * this.random());
      const slot = this.spawnAt(normalize(add(add(dipole.dir, dipole.perp, along), dipole.axis, across)), strength, age);
      if (slot >= 0) return slot;
    }
    return -1;
  }

  /** Loops form where the field difference across a region's inversion line exceeds the formation threshold, each
   *  region at its own rate (Poisson per frame, so the rate does not depend on the frame rate). */
  private formAtRegions(dSim: number): void {
    const field = this.field!;
    this.regionDipoles().forEach((dipole, regionIndex) => {
      const centre = scale(dipole.dir, 1.01);
      const fieldDifference = length(add(field.fieldAt(add(centre, dipole.axis, 0.05)), field.fieldAt(add(centre, dipole.axis, -0.05)), -1)) / Math.max(field.bref, 1e-9);
      const excess = fieldDifference * fieldDifference - FREE_ENERGY.form;
      if (excess > 0 && this.random() < 1 - Math.exp(-excess * dSim / FORMATION_TIME)) this.spawnArcade(regionIndex, 0.3 + Math.min(0.6, 0.6 * excess));
    });
  }

  private deliverLater(): void {
    const due = this.later.filter((c) => this.anim >= c.atAnim);
    this.later = this.later.filter((c) => this.anim < c.atAnim);
    due.forEach((c) => c.run());
  }

  // ---- plasma ------------------------------------------------------------------------------------------------

  private stepPlasma(loop: EventLoop, dt: number): void {
    plasmaCore(loop, dt, this.radiusSun);
    loop.pulseHeating *= Math.exp(-dt * ANIM_UNIT_S / HEAT_TAU_S);
    const volume = loopVolumeCm3(loop.lengthR, this.radiusSun);
    const arcadeStrands = loop.arcade?.strands ?? [];
    if (loop.arcade) this.stepArcade(loop, loop.arcade, dt);
    const sources = [
      { emission: loop.density * loop.density * volume, temperatureMK: loop.temperatureMK },
      ...arcadeStrands.map((strand) => ({ emission: strand.density * strand.density * strand.volumeCm3, temperatureMK: strand.temperatureMK })),
    ];
    // per channel: emission measure x response, log-scaled as SDO's browse images are (a quiet loop ~1, an arcade ~5)
    const quietEmission = loop.quietDensity * loop.quietDensity * volume;
    loop.channelBrightness = EUV_CHANNELS.map((channel) =>
      Math.log10(1 + 9 * sources.reduce((sum, source) => sum + source.emission * aiaResponse(source.temperatureMK, channel), 0) / quietEmission));
    const glowBefore = loop.glow;
    if (loop.isGlowRising) {
      loop.glow = Math.min(1, loop.glow + GLOW_RISE_PER_ANIM * dt);
      loop.isGlowRising = loop.glow < 1;
    } else loop.glow = Math.max(0, loop.glow - GLOW_FADE_PER_ANIM * dt);
    // thermal instability once a real flare's heating is gone: cool knots condense near the top and slide down the legs
    if (glowBefore >= 0.5 && loop.glow < 0.5 && loop.flareEnergy >= RAIN_FLARE_ENERGY) { loop.rainIntensity = 1; loop.flareEnergy = 0; }
    loop.rainIntensity = Math.max(0, loop.rainIntensity - RAIN_FADE_PER_ANIM * dt);
  }

  private stepArcade(loop: EventLoop, arcade: Arcade, dt: number): void {
    let isHot = false;
    for (const strand of arcade.strands) {
      const sinceS = (this.anim - strand.formsAtAnim) * ANIM_UNIT_S;
      strand.pulseHeating = sinceS >= 0 ? strand.peakHeating * Math.exp(-sinceS / ARCADE_HEAT_TAU_S) : 0;
      plasmaCore(strand, dt, this.radiusSun, ARCADE_HEAT_TAU_S);   // the strand's own heating time, not the loop's
      if (strand.temperatureMK > 1.2 * loop.quietTemperatureMK || sinceS < 0) isHot = true;
    }
    if (!isHot && this.anim - arcade.bornAnim > 2) loop.arcade = null;   // cooled back to the corona's own state
  }

  /** The surface plasma heats the loops rooted in it: heat and wave compression arriving at a footpoint go into the
   *  loop's heating; enough of it, accumulated, feeds the rope (lift and twist). */
  private couplePlasma(flow: SurfaceFlow): void {
    if (flow.probeSerial === this.probeSerial) return;
    this.probeSerial = flow.probeSerial;
    const dtAnim = flow.lastProbeSpanAnim, probe = flow.lastProbe;
    if (!(dtAnim > 0)) return;
    this.loops.forEach((loop, i) => {
      if (!loop || !this.isAlive(loop)) return;
      // the probe holds (heat, compression) per footpoint, two footpoints per loop
      const energyAt = (end: number): number => Math.max(0, probe[(i * 2 + end) * 2]) + 0.5 * Math.max(0, probe[(i * 2 + end) * 2 + 1]);
      const end: 0 | 1 = energyAt(1) > energyAt(0) ? 1 : 0, energy = energyAt(end);
      if (energy < MIN_FOOT_ENERGY) return;
      this.startFront(loop, () => end);   // the heat enters at this footpoint
      loop.pulseHeating += flareHeating(loop, FOOT_HEATING_GAIN * energy, this.radiusSun) * dtAnim * ANIM_UNIT_S / HEAT_TAU_S;
      loop.flareEnergy = Math.max(loop.flareEnergy, FOOT_FLARE_GAIN * energy);
      loop.absorbedEnergy += energy * dtAnim;
      if (!loop.isErupting && loop.absorbedEnergy > FEED_ENERGY) { loop.absorbedEnergy -= FEED_ENERGY; this.feed(loop); }
    });
  }

  /** A heating front from the footpoint `pickFoot` names, unless one is still running. */
  private startFront(loop: EventLoop, pickFoot: () => 0 | 1): void {
    if (this.anim - loop.frontStartAnim <= FRONT_HOLD_ANIM) return;
    loop.frontStartAnim = this.anim;
    loop.frontFoot = pickFoot();
  }

  // ---- free energy, flares, eruptions -------------------------------------------------------------------------

  /** Torus-instability decay index n = -d ln B / d ln h at the (lifted) apex; `rise`: the rope's height over the apex. */
  private measureDecayIndex(loop: EventLoop, rise = 1): number {
    const field = this.field!, h = Math.max(length(loop.apex) - 1, 0.02) * (1 + loop.lift) * rise, dir = normalize(loop.apex);
    const lower = length(field.fieldAt(scale(dir, 1 + 0.8 * h))), upper = length(field.fieldAt(scale(dir, 1 + 1.25 * h)));
    return -Math.log(upper / lower) / Math.log(1.25 / 0.8);
  }

  /** Shear from the stress the magnetofrictional field has stored around the loop (the photosphere's shearing and
   *  twisting of its feet, relaxed toward force-free; the original integrated the Sun's differential rotation across
   *  the feet), twist from helicity injection; release after a flare, flare past the threshold (or erupt where torus
   *  unstable), erupt past the snap. Injection and release both run on the full star clock, so high warp cannot pile
   *  up energy and erupt in storms. */
  private stepFree(loop: EventLoop, dDays: number): void {
    if (loop.isErupting) return;
    const derived = this.derived!;
    const stress = loop.releaseS > 0 ? null : this.stressNear?.(normalize(loop.apex), this.stressRadius(loop)) ?? null;
    if (stress !== null) loop.shear = FRICTIONAL_SHEAR_GAIN * Math.sqrt(stress);
    loop.twist += FREE_ENERGY.helicityPerDay * Math.pow(Math.max(derived.activity, 0.1), 1.3) * dDays;
    if (loop.releaseS > 0) { this.stepRelease(loop, dDays); return; }
    const q = freeEnergy(loop);
    if (q > FREE_ENERGY.snap) { this.erupt(loop); return; }
    if (q <= FREE_ENERGY.flare) return;
    loop.decayIndex = this.measureDecayIndex(loop, 1 + 2 * q);   // the rope rises as it stores energy
    if (loop.decayIndex > TORUS_CRITICAL_INDEX) { this.erupt(loop); return; }   // torus unstable: a CME, not a confined flare
    const share = this.flareShare();
    const energy = FREE_ENERGY.flareScale * derived.flareEnergy * share * (q - FREE_ENERGY.relaxed) * loop.fieldStrength * loop.fieldStrength * Math.max(loop.lengthR, 0.05) / 0.2;
    this.flare(loop, energy, q - share * (q - FREE_ENERGY.relaxed));
  }

  private stepRelease(loop: EventLoop, dDays: number): void {
    const q = freeEnergy(loop), target = loop.relaxTarget + (q - loop.relaxTarget) * Math.exp(-dDays * SECONDS_PER_DAY / loop.releaseS);
    const keep = Math.sqrt(Math.max(target, 1e-6) / Math.max(q, 1e-6));
    loop.twist *= keep; loop.shear *= keep; loop.neighbourStress *= keep;
    if (q - loop.relaxTarget < 0.02) loop.releaseS = 0;
    if (freeEnergy(loop) > FREE_ENERGY.snap) this.erupt(loop);   // driven past the snap while releasing
  }

  /** A share of the free energy drawn from p(x) ~ x^-FLARE_INDEX on [FLARE_MIN_SHARE, 1]: mostly small flares. */
  private flareShare(): number {
    const k = 1 - FLARE_INDEX, lo = Math.pow(FLARE_MIN_SHARE, k);
    return Math.pow(lo + this.random() * (1 - lo), 1 / k);
  }

  /** Neighbouring loops whose currents run antiparallel press a current sheet between them. */
  private stressNeighbours(dDays: number): void {
    const quiet = this.liveLoops().filter((loop) => !loop.isErupting);
    quiet.forEach((a, ia) => {
      const currentA = a.twist * a.fieldStrength * a.polarity;
      for (const b of quiet.slice(ia + 1)) {
        const separation = angleBetween(normalize(a.apex), normalize(b.apex)), currentB = b.twist * b.fieldStrength * b.polarity;
        if (separation > 0.2 || currentA * currentB >= 0) continue;
        const stress = FREE_ENERGY.neighbourStress * Math.abs(currentA * currentB) / Math.max(separation, 0.02) * dDays;
        a.neighbourStress += stress; b.neighbourStress += stress;
      }
    });
  }

  /** A flare of `energy` (x 1e30 erg): an arcade from ARCADE_MIN_ENERGY up, else the loop heats itself; the free
   *  energy then relaxes to `relaxTarget`. */
  private flare(loop: EventLoop, energy: number, relaxTarget = FREE_ENERGY.relaxed): void {
    loop.relaxTarget = relaxTarget;
    // the field gives back the same share of its stress (B_np scales as the square root of the energy)
    this.onRelaxField?.(normalize(loop.apex), this.stressRadius(loop), Math.sqrt(Math.max(relaxTarget, 0) / Math.max(freeEnergy(loop), 1e-6)));
    if (energy >= ARCADE_MIN_ENERGY) this.makeArcade(loop, energy * ARCADE_ENERGY_SCALE);
    else {
      loop.pulseHeating += flareHeating(loop, energy, this.radiusSun);
      loop.releaseS = Math.max(loop.releaseS, HEAT_TAU_S);   // a small flare also takes its heating time to release
    }
    loop.flareEnergy = Math.max(loop.flareEnergy, energy);
    this.startFront(loop, () => (this.random() < 0.5 ? 0 : 1));
  }

  /** Reconnection forms the arcade strand by strand at the inflow speed M_A v_A, low and compact (half-lengths ~E^1/3). */
  private makeArcade(loop: EventLoop, energy: number): void {
    const energyErg = energy * 1e30, scaleUp = energyErg / ARCADE.referenceEnergyErg;
    const halfFullCm = ARCADE.halfLengthMm * 1e8 * Math.cbrt(scaleUp), areaCm2 = ARCADE.areaCm2 * Math.sqrt(scaleUp);
    const spreadS = (halfFullCm / 1e5) / (FREE_ENERGY.inflowMach * FREE_ENERGY.alfvenKms * Math.sqrt(Math.max(loop.fieldStrength, 0.05) / 0.5));
    loop.releaseS = spreadS;
    const strands: ArcadeStrand[] = [];
    for (let s = 0; s < ARCADE.strands; s++) {
      const halfCm = halfFullCm / (1 + ARCADE.lengthGrowth) * (1 + ARCADE.lengthGrowth * s / (ARCADE.strands - 1));
      const eq = equilibrium(loop.quietTemperatureMK, halfCm), volumeCm3 = areaCm2 / ARCADE.strands * 2 * halfCm;
      strands.push({
        lengthR: 2 * halfCm / (CM_PER_RSUN * this.radiusSun), temperatureMK: loop.quietTemperatureMK, density: eq.density / N0,
        backgroundHeating: eq.heating, pulseHeating: 0, volumeCm3,
        peakHeating: energyErg / ARCADE.strands / (volumeCm3 * ARCADE_HEAT_TAU_S),
        formsAtAnim: this.anim + spreadS / ANIM_UNIT_S * s / (ARCADE.strands - 1),
      });
    }
    loop.arcade = { strands, bornAnim: this.anim };
  }

  private feed(loop: EventLoop): void {
    if (loop.isErupting) return;
    loop.feedCount++;
    loop.lift += FEED_LIFT;
    loop.twist += FEED_TWIST;
    loop.strength = Math.min(MAX_STRENGTH, loop.strength + FEED_STRENGTH);
    loop.bornAtSim = this.simT - 0.5 * lifeOf(loop.strength);
    this.flare(loop, FEED_FLARE_ENERGY);
    loop.decayIndex = this.measureDecayIndex(loop);
    loop.isKinkUnstable = loop.twist > KINK_TWIST;
    if (loop.decayIndex > TORUS_CRITICAL_INDEX || loop.isKinkUnstable) this.erupt(loop);
  }

  private erupt(loop: EventLoop): void {
    if (loop.isErupting || !this.field) return;
    loop.isErupting = true;
    loop.liftAcceleration = 0.12 * (Math.max(loop.decayIndex ?? this.measureDecayIndex(loop), TORUS_CRITICAL_INDEX) - TORUS_CRITICAL_INDEX) + (loop.isKinkUnstable ? 0.10 : 0.04);
    loop.liftSpeed = 0.08;
    const cme = this.cmes.near(loop.foot, 0.3, 1.5) ?? this.cmes.launch(loop.foot, 2 + 0.3 * loop.feedCount, this.field);
    // the rope IS this CME's core: its height follows the front. The CME holds the loop, not its slot, so a reused
    // slot is never driven by an old CME.
    cme.rope = loop;
    loop.eruptedAtSim = this.simT;
    this.flare(loop, ERUPTION_FLARE_ENERGY);
    loop.isGlowRising = true;
    this.onSnapStrings?.(loop.foot, SNAP_RADIUS_RAD, 300 + 200 * loop.feedCount);
    const foot = loop.foot;
    this.later.push({ atAnim: this.anim + POST_FLARE_DELAY_S / ANIM_UNIT_S, run: () => this.formPostFlareArcade(foot) });
  }

  /** The post-flare arcade: short hot loops under the departing rope. */
  private formPostFlareArcade(foot: Vec3): void {
    for (let k = 0; k < POST_FLARE_LOOPS; k++) {
      const slot = this.spawnAt(add(foot, tangentAt(foot, this.random() * TWO_PI), 0.02 * this.random()), 1.2);
      if (slot >= 0) this.flare(this.loops[slot]!, POST_FLARE_ENERGY);
    }
  }

  /** The rising rope follows its CME (and falls back with it); a failed one settles and re-forms as a loop. */
  private stepRope(loop: EventLoop, dt: number): void {
    const cme = this.cmes.list.find((c) => c.active && c.rope === loop) ?? null;
    if (cme) loop.lift = Math.max((cme.r - 1) * 0.9, 0);
    else if (loop.hasCmeFailed) loop.lift = Math.max(0, loop.lift - 0.6 * dt);
    else { loop.liftSpeed += loop.liftAcceleration * dt * 12; loop.lift += loop.liftSpeed * dt * 8; }
    if (cme && cme.fail > 0) loop.hasCmeFailed = true;
    if (!loop.hasCmeFailed || (cme && cme.r >= 1.2) || loop.lift >= 0.25) return;
    // confined: the rope re-forms as a loop and flares in place
    loop.isErupting = false;
    loop.lift = 0.1;
    loop.liftSpeed = 0;
    loop.hasCmeFailed = false;
    loop.twist *= 0.5;
    this.flare(loop, CONFINED_FLARE_ENERGY);
    if (cme) cme.rope = null;
  }

  // ---- coronal rain --------------------------------------------------------------------------------------------

  /** Field line from `start` down to the surface, kept descending where it runs nearly horizontal. */
  private tracePathDown(start: Vec3): Vec3[] {
    const field = this.field!, pts: Vec3[] = [start];
    let p = start;
    for (let step = 0; step < 70 && length(p) >= 1.004; step++) {
      const r0 = length(p);
      let d = normalize(field.fieldAt(p));
      if (dot(d, p) > 0) d = scale(d, -1);
      if (dot(d, scale(p, -1 / r0)) < 0.15) d = normalize(add(d, p, -0.3 / r0));
      p = add(p, d, Math.max(0.008, (r0 - 1) * 0.12));
      pts.push(p);
    }
    return pts;
  }

  /** Cool knots sliding down post-flare loops and down field lines under a failed eruption: gravity along the path,
   *  drag holding the fall to the terminal speed. Plasma clock. */
  private stepRain(dt: number): void {
    this.spawnLoopRain(dt);
    this.spawnDrainRain(dt);
    const radiusKm = RSUN_KM * this.radiusSun, dtStar = dt * ANIM_UNIT_S;
    this.rain = this.rain.filter((knot) => {
      const { head, tangent } = this.knotPose(knot);
      const r0 = length(head), gravity = GM_SUN_KM3_S2 * this.massSun / (r0 * radiusKm) ** 2;
      const gravityAlong = gravity * Math.max(dot(tangent, scale(head, -1 / r0)), -0.2);
      const drag = knot.speedKms * Math.abs(knot.speedKms) / (RAIN_TERMINAL_KMS * RAIN_TERMINAL_KMS) * gravity;
      knot.speedKms = Math.max(1, knot.speedKms + (gravityAlong - drag) * dtStar);
      if (knot.kind === 'drain') {
        knot.travelled += knot.speedKms * dtStar / radiusKm;
        return knot.travelled < knot.pathLength[knot.pathLength.length - 1];
      }
      knot.along += knot.direction * knot.speedKms * dtStar / Math.max(knot.strandLengthKm, 1);
      return knot.along >= 0.02 && knot.along <= 0.98;
    });
  }

  private spawnLoopRain(dt: number): void {
    const radiusKm = RSUN_KM * this.radiusSun;
    for (const loop of this.loops) {
      if (!loop || loop.rainIntensity <= 0.02 || loop.isErupting) continue;
      loop.rainBacklog += loop.rainIntensity * RAIN_PER_ANIM * dt;
      for (; loop.rainBacklog > 1 && this.rain.length < MAX_RAIN_KNOTS; loop.rainBacklog -= 1) {
        const strand = Math.floor(this.random() * loop.strandCount);
        const along = 0.5 + (this.random() - 0.5) * 0.3;   // condensed near the top
        const strandLengthKm = polylineLength(this.strands.strand(loop.strandRow + strand)) * radiusKm;
        this.rain.push({
          kind: 'loop', loop, strand, along, direction: along < 0.5 ? -1 : 1, speedKms: 2 + 8 * this.random(), strandLengthKm,
          brightness: 0.6 + 0.6 * this.random() * loop.rainIntensity,
        });
      }
    }
  }

  private spawnDrainRain(dt: number): void {
    for (const cme of this.cmes.list) {
      if (!cme.active || !(cme.fail > 0) || cme.fail >= 0.98 || cme.r > MAX_DRAIN_HEIGHT) continue;
      let backlog = (this.drainBacklog.get(cme) ?? 0) + DRAIN_PER_ANIM * dt * (1 - cme.fail);
      for (; backlog > 1 && this.rain.length < MAX_RAIN_KNOTS; backlog -= 1) this.spawnDrainKnot(cme);
      this.drainBacklog.set(cme, backlog);
    }
  }

  /** A knot from somewhere in the stalled CME's front, down the field below it. */
  private spawnDrainKnot(cme: CmeState): void {
    const e1 = normalize(cross(cme.dir, [0, 1, 0])), e2 = cross(cme.dir, e1), spread = cme.kappa * Math.max(cme.r - 1, 0.1) * 0.8;
    const start = add(add(scale(cme.dir, cme.r), e1, (this.random() - 0.5) * 2 * spread), e2, (this.random() - 0.5) * 2 * spread);
    const path = this.tracePathDown(start);
    if (path.length < 3) return;
    const pathLength = [0];
    for (let j = 1; j < path.length; j++) pathLength.push(pathLength[j - 1] + length(add(path[j], path[j - 1], -1)));
    this.rain.push({ kind: 'drain', path, pathLength, travelled: 0, speedKms: 5 + 10 * this.random(), brightness: 0.5 + 0.5 * this.random() });
  }

  /** A knot's position (head), unit tangent (direction of travel along the path) and streak tail, star frame. */
  private knotPose(knot: RainKnot): { head: Vec3; tangent: Vec3; tail: Vec3 } {
    if (knot.kind === 'loop') {
      const row = knot.loop.strandRow + knot.strand, head = this.strands.at(row, knot.along);
      const tail = this.strands.at(row, knot.along - knot.direction * Math.min(0.08, 0.004 + 0.0005 * knot.speedKms));
      return { head, tangent: normalize(add(this.strands.at(row, knot.along + 0.01 * knot.direction), head, -1)), tail };
    }
    const j = Math.max(1, knot.pathLength.findIndex((c) => c >= knot.travelled));
    return { head: knot.path[j], tangent: normalize(add(knot.path[j], knot.path[j - 1], -1)), tail: knot.path[Math.max(0, j - 1 - Math.floor(knot.speedKms / 60))] };
  }
}
