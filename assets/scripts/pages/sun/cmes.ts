/* Coronal mass ejections, their shocks and the pointer's surface disturbances (dwarfstar.online/play's stepCMEs,
 * shockOf, launchCME, disturb). CPU state, at most 8 CMEs and 6 disturbances; shaders/cme.ts draws them from the
 * uniform written here.
 *
 * Kinematics: drag-based (Vrsnak et al. 2013) against the Parker wind that is actually there, plus gravity, a Lorentz
 * drive gated by the torus instability (decay index of the overlying field) and a confinement term (overlying
 * magnetic energy against the eruption's), so strongly magnetised M dwarfs hold small eruptions down and they fail.
 * The rope deflects toward weaker field and its flank in faster wind runs ahead. Heliosphere clock (star seconds).
 *
 * - CMEs retire at a physical radius (32 R), whatever view is open, and fade out against the same radius.
 * - A CME holds the loop object whose rope it carries (`rope`), never a slot index that could be reused.
 * - reset() clears everything, so a new star starts without the old star's CMEs.
 * - The EUV corona march keeps its 2.6 R radius; the CME column has its own reach (uniform head.y).
 * - Each CME's 13-point axis and its frame are built here once per frame, not per sample per pixel.
 * Wind: a CPU copy of the GPU Parker grid (shaders/field.ts PARKER_SHADER), its open/closed cells from a CPU trace of
 * StarField at the grid's own 12 x 24 cell centres, one latitude row per frame after the field moves (no readback). */

import { BUFFER } from '../../site/gpu/device';
import { ANIM_UNIT_S } from './clock';
import type { Clock } from './clock';
import type { StarField } from './field';
import { waveSpeedRadPerAnim } from './flow';
import type { LayerFrame } from './layer';
import { GM_SUN_KM3_S2, RSUN_KM } from './constants';
import { add, angleBetween, cross, dot, length, lonLatOf, normalize, rotY, scale } from './vec';
import type { Vec3 } from './vec';
import type { Derived, StarPreset } from './stars';
import type { View } from './views';

const fieldStrength = (field: StarField, p: Vec3): number => length(field.fieldAt(p));

/** Fast-mode speed of the ambient corona (km/s): sound ~180 km/s and an Alfven speed peaking near 3.8 R. */
export function fastModeKms(r: number): number {
  const t = Math.min(1, Math.max(0, (r - 1) / 2.8)), sm = t * t * (3 - 2 * t);
  const alfven = 800 * Math.pow(3.8 / Math.max(r, 3.8), 0.8) * sm + 300 * (1 - sm);
  return Math.sqrt(180 * 180 + alfven * alfven);
}

// ---- Parker wind on the CPU ------------------------------------------------------------------------------------

/** WSA terminal speed (km/s) and acceleration length (R): shaders/field.ts wsaTerminalKms / wsaAccelR. */
const wsaTerminalKms = (fs: number, thetaBDeg: number): number => {
  const edge = 1 - 0.8 * Math.exp(-Math.pow(Math.max(thetaBDeg / 2.8, 1e-6), 1.25));
  return 285 + 625 / Math.pow(1 + fs, 2 / 9) * edge * edge * edge;
};
const wsaSpeedKms = (vinf: number, r: number): number =>
  vinf * (1 - Math.exp(-Math.max(r - 1.2, 0) / (1.5 + 6 * Math.min(1, Math.max(0, (650 - vinf) / 330)))));

const PARKER_LATS = 12, PARKER_LONS = 24, PARKER_RADII = 64, PARKER_R_MAX = 8;

/** Coarse topology trace, the GPU open map's (shaders/field.ts isOpen): open if it reaches 2.5 R or runs long. */
function isOpenFieldLine(field: StarField, start: Vec3): boolean {
  let p = scale(start, 1.003);
  const up = dot(field.fieldAt(p), p) >= 0 ? 1 : -1;
  for (let i = 0, lineR = 0; i < 90; i++) {
    const mid = add(p, normalize(field.fieldAt(p)), up * 0.025);
    p = add(p, normalize(field.fieldAt(mid)), up * 0.05);
    lineR += 0.05;
    const r = length(p);
    if (r >= 2.5 || lineR > 4) return true;
    if (r < 1) return false;
  }
  return true;
}

/** Isothermal Parker wind through the critical point, as PARKER_SHADER integrates it (same RK2, step cap and gap
 *  fill), so the CPU drag and the GPU corona see one wind. Writes PARKER_RADII speeds (km/s) into `out`. */
function parkerProfile(out: Float32Array, temperatureMK: number, isOpen: boolean, gmKm: number, radiusKm: number): void {
  const cs2 = 1.380649e-23 * temperatureMK * 1e6 / (0.6 * 1.6726e-27) / 1e6, cs = Math.sqrt(cs2);
  const rc = gmKm / (2 * cs2) / radiusKm;
  for (let k = 0; k < PARKER_RADII; k++) out[k] = 5 + 10 * k / 64;
  if (!isOpen || rc > 40) return;
  out.fill(-1);
  const dvdr = (v: number, rKm: number): number => {
    const den = v - cs2 / v;
    return Math.abs(den) < 1e-6 ? 0 : (2 * cs2 / rKm - gmKm / (rKm * rKm)) / den * radiusKm;
  };
  for (const dir of [-1, 1]) {
    const h = 0.025 * dir;
    let r = rc, v = cs + cs / rc * 0.01 * dir;
    for (let s = 0; s < 400 && !(dir > 0 && r >= PARKER_R_MAX) && !(dir < 0 && r <= 1); s++) {
      const vm = Math.max(v + 0.5 * h * dvdr(v, r * radiusKm), 0.5);
      v = Math.max(v + h * dvdr(vm, (r + 0.5 * h) * radiusKm), 0.5);
      r += h;
      const k = Math.round((r - 1) / (PARKER_R_MAX - 1) * (PARKER_RADII - 1));
      if (k >= 0 && k < PARKER_RADII) out[k] = v;
    }
  }
  let last = 0.5;
  for (let k = 0; k < PARKER_RADII; k++) {
    if (out[k] < 0) out[k] = last; else last = out[k];
    if (rc < 1) out[k] = Math.max(out[k], cs);
  }
}

class ParkerGrid {
  private readonly speedKms = new Float32Array(PARKER_LATS * PARKER_LONS * PARKER_RADII);
  /** Per cell: open (1) or closed (0), the WSA terminal speed over open field (km/s; 0 closed), base expansion. */
  private readonly isOpen = new Uint8Array(PARKER_LATS * PARKER_LONS);
  private readonly vinfKms = new Float32Array(PARKER_LATS * PARKER_LONS);
  private readonly expansion = new Float32Array(PARKER_LATS * PARKER_LONS);
  private builtVersion = -1;
  private nextRow = -1;   // -1: idle
  private gmKm = GM_SUN_KM3_S2;
  private radiusKm = RSUN_KM;
  private radiusSun = 1;
  private tcor: readonly [number, number, number] = [1, 1, 1];

  reset(field: StarField, derived: Derived, star: StarPreset): void {
    this.gmKm = GM_SUN_KM3_S2 * star.mass;
    this.radiusKm = derived.radiusKm;
    this.radiusSun = star.radius;
    this.tcor = derived.tcor;
    this.builtVersion = field.version;
    for (let j = 0; j < PARKER_LATS; j++) this.buildRow(field, j);
    this.nextRow = -1;
  }

  /** One latitude row (24 traces and profiles) per call while a rebuild is due. */
  update(field: StarField): void {
    if (this.nextRow < 0 && field.version === this.builtVersion) return;
    if (this.nextRow < 0) { this.nextRow = 0; this.builtVersion = field.version; }
    this.buildRow(field, this.nextRow);
    this.nextRow = this.nextRow + 1 < PARKER_LATS ? this.nextRow + 1 : -1;
  }

  /** km/s, nearest cell; open field carries at least its WSA wind; above the source surface closed directions carry
   *  the slow wind Sheeley et al. (1997) tracked in LASCO, v^2 = 2 a (r - 1.5 R), a = 4 m/s^2. */
  speedAt(dir: Vec3, r: number): number {
    const { lon, lat } = lonLatOf(normalize(dir));
    const i = Math.min(PARKER_LONS - 1, Math.floor((lon / (2 * Math.PI) + 0.5) * PARKER_LONS));
    const j = Math.min(PARKER_LATS - 1, Math.floor((lat / Math.PI + 0.5) * PARKER_LATS));
    const k = Math.max(0, Math.min(PARKER_RADII - 1, Math.round((r - 1) / (PARKER_R_MAX - 1) * (PARKER_RADII - 1))));
    const slowWind = r > 2.5 ? Math.sqrt(2 * 4 * (r - 1.5) * RSUN_KM * 1000 * this.radiusSun) / 1000 : 0;
    const cell = j * PARKER_LONS + i;
    return Math.max(this.speedKms[cell * PARKER_RADII + k], wsaSpeedKms(this.vinfKms[cell], r), slowWind);
  }

  private buildRow(field: StarField, j: number): void {
    const lat = (j + 0.5) / PARKER_LATS * Math.PI - Math.PI / 2;
    for (let i = 0; i < PARKER_LONS; i++) {
      const lon = (i + 0.5) / PARKER_LONS * 2 * Math.PI - Math.PI;
      const d: Vec3 = [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)];
      const isOpen = isOpenFieldLine(field, d);
      const bn = Math.min(3, fieldStrength(field, d) / field.bref * 8);
      const t = this.tcor, temperatureMK = isOpen ? Math.max(1.4, 1.8 * t[0]) : t[1] + (t[2] - t[1]) * Math.min(1, bn * 0.5);
      parkerProfile(this.speedKms.subarray((j * PARKER_LONS + i) * PARKER_RADII, (j * PARKER_LONS + i + 1) * PARKER_RADII), temperatureMK, isOpen, this.gmKm, this.radiusKm);
      this.isOpen[j * PARKER_LONS + i] = isOpen ? 1 : 0;
      this.expansion[j * PARKER_LONS + i] = Math.max(1, fieldStrength(field, d) / Math.max(fieldStrength(field, scale(d, 2.5)) * 6.25, 1e-9));
    }
    for (let i = 0; i < PARKER_LONS; i++) this.vinfKms[j * PARKER_LONS + i] = this.wsaOf(j, i);
  }

  /** The cell's WSA terminal speed, theta_b from this coarse grid's own open flags (to the nearest closed cell's
   *  centre, less half a cell): good enough for drag on a CME, which crosses many cells. */
  private wsaOf(j: number, i: number): number {
    const cell = j * PARKER_LONS + i;
    if (!this.isOpen[cell]) return 0;
    const centre = (jj: number, ii: number): Vec3 => {
      const lat = (jj + 0.5) / PARKER_LATS * Math.PI - Math.PI / 2, lon = (ii + 0.5) / PARKER_LONS * 2 * Math.PI - Math.PI;
      return [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)];
    };
    const here = centre(j, i);
    let nearest = -1;
    for (let jj = 0; jj < PARKER_LATS; jj++) for (let ii = 0; ii < PARKER_LONS; ii++) {
      if (!this.isOpen[jj * PARKER_LONS + ii]) nearest = Math.max(nearest, dot(here, centre(jj, ii)));
    }
    const thetaBDeg = Math.max(0, Math.acos(Math.min(1, nearest)) * 180 / Math.PI - 90 / PARKER_LATS);
    return wsaTerminalKms(this.expansion[cell], thetaBDeg);
  }
}

// ---- CMEs ------------------------------------------------------------------------------------------------------

export const MAX_CMES = 8;
export const MAX_DISTURBANCES = 6;
export const CME_AXIS_POINTS = 13;
/** vec4s per CME in the uniform: a, b, c, h1, h2, h3, shock, t2, bound, then the axis (shaders/cme.ts Cme). */
const CME_VEC4S = 9 + CME_AXIS_POINTS;
export const CME_UNIFORM_FLOATS = 4 + MAX_DISTURBANCES * 8 + MAX_CMES * CME_VEC4S * 4;
/** Retirement radius, R: physics only; the views cull by their own field. */
const CME_RETIRE_R = 32;
const LAUNCH_R = 1.15;
const QUIET_MARCH_R = 2.6;
const DISTURBANCE_LIFE_ANIM = 2.5;

export interface CmeState {
  dir: Vec3;
  /** Front height, R, and speed, km/s. */
  r: number;
  v: number;
  readonly energy: number;
  readonly mass: number;
  readonly drive: number;
  alpha: number;
  readonly kappa: number;
  tilt: number;
  readonly asym0: number;
  /** Rope shape: cross-section harmonics (amplitudes, phases) and two along-axis harmonics (b1, q1, b2, q2). */
  readonly h1: readonly number[];
  readonly h2: readonly number[];
  readonly h3: readonly number[];
  aw: number;
  asym: number;
  fing: number;
  /** Anim units since launch (the EUV cooling and the shape drift run on it). */
  age: number;
  /** Star seconds simulated, and when the field terms were last evaluated. */
  t: number;
  magT: number;
  ndec: number;
  conf: number;
  /** 0..1: how far a stalled eruption has drained and faded. */
  fail: number;
  active: boolean;
  /** Shock (centre along dir, outer radius, thickness, speed over the wind km/s), all zero without one. */
  shock: [number, number, number, number];
  /** The event loop whose flux rope is this CME's core (loops.ts compares identity), or null. */
  rope: object | null;
}

interface Disturbance { dir: Vec3; bornAnim: number; energy: number }

export class Cmes {
  readonly uniform: GPUBuffer;
  readonly list: CmeState[] = [];
  private readonly data = new Float32Array(CME_UNIFORM_FLOATS);
  private readonly wind = new ParkerGrid();
  private readonly disturbances: Disturbance[] = [];
  private launchCount = 0;
  private massSun = 1;
  private radiusSun = 1;
  private bLargeGauss = 1.5;
  private animClock = 0;

  constructor(device: GPUDevice) {
    this.uniform = device.createBuffer({ size: CME_UNIFORM_FLOATS * 4, usage: BUFFER.UNIFORM | BUFFER.COPY_DST });
  }

  reset(star: StarPreset, field: StarField, derived: Derived): void {
    this.list.length = 0;
    this.disturbances.length = 0;
    this.launchCount = 0;
    this.massSun = star.mass;
    this.radiusSun = star.radius;
    this.bLargeGauss = derived.bLarge;
    this.wind.reset(field, derived, star);
  }

  windSpeedAt(dir: Vec3, r: number): number { return this.wind.speedAt(dir, r); }

  step(clock: Clock, field: StarField, derived: Derived): void {
    this.animClock = clock.anim;
    this.wind.update(field);
    // ejecta fly radially in inertial space: in the co-rotating frame they counter-rotate by the star's own turn
    const turn = -derived.omega * clock.dDays;
    for (const c of this.list) {
      if (!c.active) continue;
      if (turn !== 0) c.dir = rotY(c.dir, turn);
      this.stepOne(c, clock.dWind, field);
      c.shock = c.active ? this.shockOf(c) : [0, 0, 0, 0];
    }
  }

  /** A new CME at the surface point `dir` (star frame); `energy` 3 is the original's default. */
  launch(dir: Vec3, energy: number, field: StarField): CmeState {
    let slot = this.list.findIndex((c) => !c.active);
    if (slot < 0 && this.list.length < MAX_CMES) slot = this.list.length;
    if (slot < 0) slot = this.list.reduce((far, c, i) => (c.r > this.list[far].r ? i : far), 0);   // retire the one furthest out
    const c = this.makeCme(normalize(dir), energy, field);
    this.list[slot] = c;
    return c;
  }

  /** An active CME still low (r < maxR) within `angleRad` of `dir`, which an eruption there joins. */
  near(dir: Vec3, angleRad: number, maxR: number): CmeState | null {
    return this.list.find((c) => c.active && c.r < maxR && angleBetween(c.dir, dir) < angleRad) ?? null;
  }

  /** Pointer press on the disc: a flash and a 300 km/s EUV ring (shaders/cme.ts disturbAt). */
  disturb(dirStarFrame: Vec3, strength: number): void {
    const dir = normalize(dirStarFrame), now = this.animClock;
    let slot = this.disturbances.findIndex((d) => now - d.bornAnim > DISTURBANCE_LIFE_ANIM);
    if (slot < 0 && this.disturbances.length < MAX_DISTURBANCES) slot = this.disturbances.length;
    if (slot < 0) slot = this.disturbances.reduce((old, d, i) => (d.bornAnim < this.disturbances[old].bornAnim ? i : old), 0);
    this.disturbances[slot] = { dir, bornAnim: now, energy: strength };
  }

  /** Line-of-sight radius the star shader's corona march should use in this view. The EUV march keeps the quiet
   *  2.6 R (the CME column has its own reach, uniform head.y); HMI and the coronagraphs follow the CMEs out. */
  marchRadius(view: View): number {
    if (view.kind === 'euv' || view.kind === 'he304') return QUIET_MARCH_R;
    const cap = view.wide ? 30 : 12;
    let far = view.kind !== 'coronagraph' ? QUIET_MARCH_R : view.wide ? 30 : 10;
    for (const c of this.list) if (c.active) far = Math.max(far, Math.min(cap, c.r * (1 + c.kappa) + 0.4));
    return far;
  }

  writeUniform(queue: GPUQueue, frame: LayerFrame): void {
    const d = this.data;
    d.fill(0);
    let activeCount = 0, reach = 0;
    this.disturbances.forEach((s, i) => {
      d.set([...s.dir, frame.animClock - s.bornAnim], 4 + i * 4);
      d.set([s.energy, waveSpeedRadPerAnim(this.radiusSun), 0, 0], 4 + MAX_DISTURBANCES * 4 + i * 4);
    });
    this.list.forEach((c, i) => {
      if (!c.active) return;
      activeCount++;
      reach = Math.max(reach, this.writeCme(c, 4 + MAX_DISTURBANCES * 8 + i * CME_VEC4S * 4));
    });
    d.set([activeCount, Math.min(reach, CME_RETIRE_R), 0, 0], 0);
    queue.writeBuffer(this.uniform, 0, d);
  }

  destroy(): void { this.uniform.destroy(); }

  // ---- internals ----

  private makeCme(dir: Vec3, energy: number, field: StarField): CmeState {
    // its own random stream (a hash of the launch count), so a CME never shifts the sequence the loops draw from
    let state = (++this.launchCount * 2654435761) >>> 0;
    const rnd = (): number => {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    let tilt = rnd() * Math.PI;
    // the tilt follows the source region's inversion line when one is near (draw order kept: rnd() first)
    const source = this.regionAxisNear(field, dir);
    if (source) {
      const e1 = normalize(cross(dir, [0, 1, 0])), e2 = cross(dir, e1);
      tilt = Math.atan2(dot(source, e2), dot(source, e1));
    }
    const asym0 = (rnd() < 0.5 ? -1 : 1) * (0.35 + 0.45 * rnd());
    const h1 = [0, 1, 2, 3].map((k) => (0.38 / (k + 1)) * (0.6 + 0.8 * rnd()) * (rnd() < 0.5 ? -1 : 1));
    const h2 = [0, 1, 2, 3].map(() => rnd() * 6.2832);
    const h3 = [0.28 * (0.5 + rnd()), rnd() * 6.2832, 0.16 * (0.5 + rnd()), rnd() * 6.2832];
    return {
      dir, r: LAUNCH_R, v: 150 + 120 * energy, energy, mass: energy,
      drive: (0.08 + 0.05 * energy) * Math.sqrt(this.massSun) / this.radiusSun,
      alpha: 0.12 + 0.05 * energy, kappa: 0.28 + 0.04 * energy, tilt, asym0, h1, h2, h3,
      aw: 0, asym: 0, fing: 0, age: 0, t: 0, magT: -Infinity, ndec: 1.5, conf: 0, fail: 0, active: true,
      shock: [0, 0, 0, 0], rope: null,
    };
  }

  /** Axis of the first region dipole within 0.3 rad of `dir` (the original's dip[1..] scan). */
  private regionAxisNear(field: StarField, dir: Vec3): Vec3 | null {
    for (let k = 1; k < field.positions.length / 4; k++) {
      if (field.positions[k * 4 + 3] < 0.5) continue;
      const at = normalize([field.positions[k * 4], field.positions[k * 4 + 1], field.positions[k * 4 + 2]]);
      if (angleBetween(at, dir) < 0.3) return normalize([field.moments[k * 4], field.moments[k * 4 + 1], field.moments[k * 4 + 2]]);
    }
    return null;
  }

  /** Torus decay index along the path and the confinement by the overlying field; every 600 s of CME time. */
  private updateMagnetics(c: CmeState, field: StarField): void {
    const hA = Math.max(c.r - 1, 0.03), h1 = hA * 0.8, h2 = hA * 1.25;
    const b1 = fieldStrength(field, scale(c.dir, 1 + h1)), b2 = fieldStrength(field, scale(c.dir, 1 + h2));
    c.ndec = -Math.log(Math.max(b2, 1e-12) / Math.max(b1, 1e-12)) / Math.log(h2 / h1);
    const overlying = this.bLargeGauss * fieldStrength(field, scale(c.dir, c.r)) / Math.max(fieldStrength(field, scale(c.dir, 1.02)), 1e-12);
    c.conf = overlying * overlying / (overlying * overlying + 900 * c.energy);
    c.magT = c.t;
  }

  private stepOne(c: CmeState, dtStar: number, field: StarField): void {
    if (c.t - c.magT > 600) this.updateMagnetics(c, field);
    const rkm = RSUN_KM * this.radiusSun;
    const torus = Math.max(-1, Math.min(1, c.ndec - 1));
    for (let remaining = dtStar; remaining > 0;) {
      const h = Math.min(remaining, 60);
      remaining -= h;
      const rKm = c.r * rkm;
      const gravity = -GM_SUN_KM3_S2 * this.massSun / (rKm * rKm);
      // Lorentz push fading within ~1 R, against the strapping field holding it down
      const drive = c.drive * Math.exp(-(c.r - 1) / 0.7) * (1 - c.conf) * torus - 1.3 * c.drive * c.conf * Math.exp(-(c.r - 1) / 1.2);
      const dv = c.v - this.wind.speedAt(c.dir, c.r);
      const drag = 2e-7 / Math.max(c.mass, 0.5);   // 1/km: lighter CMEs couple harder
      c.v += (gravity + drive - drag * dv * Math.abs(dv)) * h;
      c.r += c.v * h / rkm;
      c.t += h;
    }
    c.age += dtStar / ANIM_UNIT_S;
    c.alpha = Math.min(0.9, 0.12 + 0.05 * c.energy + 0.10 * (c.r - LAUNCH_R));   // legs open as it rises
    this.deflect(c, dtStar, field);
    this.flank(c, dtStar);
    if (c.v < 0) c.fail = Math.min(1, c.fail + dtStar / 14400);
    if (c.v < 0 && c.r > 2.2) c.v = Math.max(c.v, -20);   // far-out material does not fall back: it drifts and disperses
    if (c.v < 0 && c.r < LAUNCH_R) { c.v = 0; c.r = LAUNCH_R; c.fail = Math.max(c.fail, 0.6); }
    if (c.r > CME_RETIRE_R || c.fail >= 1) c.active = false;
  }

  /** Toward weaker field at the apex height (magnetic pressure gradient), ~1/r^2. */
  private deflect(c: CmeState, dtStar: number, field: StarField): void {
    const apex = scale(c.dir, c.r), e1 = normalize(cross(c.dir, [0, 1, 0])), e2 = cross(c.dir, e1), eps = 0.05;
    const g1 = fieldStrength(field, add(apex, e1, eps)) - fieldStrength(field, add(apex, e1, -eps));
    const g2 = fieldStrength(field, add(apex, e2, eps)) - fieldStrength(field, add(apex, e2, -eps));
    const k = 0.6 * dtStar / ANIM_UNIT_S / (c.r * c.r) / Math.max(field.bref, 1e-6) / (2 * eps);
    c.dir = normalize(add(add(c.dir, e1, -g1 * k), e2, -g2 * k));
  }

  /** The flank in faster wind runs ahead; the rope rotates slowly with its lopsidedness; RT fingers grow. */
  private flank(c: CmeState, dtStar: number): void {
    const e1 = normalize(cross(c.dir, [0, 1, 0])), e2 = cross(c.dir, e1);
    const t1 = add(scale(e1, Math.cos(c.tilt)), e2, Math.sin(c.tilt));
    const windA = this.wind.speedAt(normalize(add(c.dir, t1, 0.4)), c.r), windB = this.wind.speedAt(normalize(add(c.dir, t1, -0.4)), c.r);
    c.aw += ((windA - windB) / 400 - c.aw) * Math.min(1, dtStar / 3600);
    c.asym = c.asym0 + c.aw;
    c.tilt += 0.02 * c.asym * dtStar / ANIM_UNIT_S;
    c.fing = Math.min(1, 0.35 * c.age);
  }

  /** Standoff ahead of the leading edge from the nose Mach number (Farris & Russell 1994), a shell enveloping the
   *  driver (its tube or its legs' spread, whichever is wider). */
  private shockOf(c: CmeState): [number, number, number, number] {
    const relativeKms = c.v - this.wind.speedAt(c.dir, Math.min(c.r, 7.9));
    const tubeR = Math.max(0.05, c.kappa * Math.max(c.r - 0.92, 0.05)), leadingEdge = c.r + tubeR;
    const mach = relativeKms / fastModeKms(leadingEdge);
    if (!(mach > 1.02)) return [0, 0, 0, 0];
    const gamma = 5 / 3, m2 = mach * mach;
    const standoff = Math.min(1.5 * tubeR, 0.81 * tubeR * ((gamma - 1) * m2 + 2) / ((gamma + 1) * (m2 - 1)));
    const outerR = Math.max(tubeR, 0.8 * c.r * Math.sin(Math.min(c.alpha, 1.2))) + standoff;
    return [Math.max(0, leadingEdge + standoff - outerR), outerR, Math.max(0.04 * outerR, 0.5 * standoff), relativeKms];
  }

  /** One CME's uniform block at float offset `o`; returns how far out its bounding sphere reaches (R). */
  private writeCme(c: CmeState, o: number): number {
    const d = this.data, h = Math.max(c.r - 1, 0);
    const volume = (c.kappa * Math.max(c.r - 1, 0.05)) ** 2 * (c.r - 1 + 0.2) * (0.5 + c.alpha);
    const fadeOut = Math.min(1, Math.max(0, (CME_RETIRE_R - c.r) / (0.35 * CME_RETIRE_R)));
    const amp = Math.min(6, 0.09 * c.mass / Math.max(volume, 0.004) * fadeOut * (1 - c.fail));
    // the GLSL frame (its e1 carries a 1e-4 nudge, so it differs from the kinematics' e1 at the poles only)
    const ax = c.dir, e1 = normalize(add(cross(ax, [0, 1, 0]), [1e-4, 0, 0])), e2 = cross(ax, e1);
    const t1 = add(scale(e1, Math.cos(c.tilt)), e2, Math.sin(c.tilt)), t2 = add(scale(e1, -Math.sin(c.tilt)), e2, Math.cos(c.tilt));
    const coneLimit = c.alpha + 1.2 * c.kappa * h + 0.25;
    const a2 = c.alpha + 0.95, mid = 0.5 * (1 + c.r);
    const boundR = Math.max(Math.hypot(mid - Math.cos(a2), Math.sin(a2)), c.r + 1.3 * c.kappa * (0.08 + h) - mid) * 1.15 + 0.35;
    d.set([...ax, c.r, c.alpha, c.kappa, amp, 1, c.tilt, c.asym, c.age, c.fing, ...c.h1, ...c.h2, ...c.h3, ...c.shock,
      ...t2, coneLimit, ...scale(ax, mid), boundR], o);
    for (let k = 0; k < CME_AXIS_POINTS; k++) {
      const u = k / 6 - 1, au = Math.abs(u), su = Math.sign(u) * Math.pow(au, 1.4);
      const lean = c.alpha * su * (1 + 0.35 * c.asym * (1 - au)) * (1 + 0.45 * c.asym * Math.sign(u));
      const height = 1 + h * (1 - Math.pow(au, 2.2)) * (1 + 0.3 * c.asym * u + 0.12 * Math.sin(Math.PI * u + 5 * c.tilt));
      const along = normalize(add(scale(ax, Math.cos(lean)), t1, Math.sin(lean)));
      const p = add(scale(along, height), t2, 0.03 * h * Math.sin(3 * u + c.age));   // slight writhe
      d.set([...p, u], o + 36 + k * 4);
    }
    return mid + boundR;
  }
}
