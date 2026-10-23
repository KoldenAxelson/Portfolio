/* The star's magnetic field: active regions that emerge, drift with differential rotation and the meridional
 * flow, spread and decay, and a global dipole fed by their decay (Babcock-Leighton). The cycle runs on its own clock
 * (the dynamo's period): each cycle's emergence rate follows Hathaway's amplitude curve and its latitude drifts
 * equatorward (the butterfly diagram), consecutive cycles overlap, and the polar field the decaying regions build
 * reverses near maximum. The field is one
 * central dipole plus a sub-surface dipole per region (shaders/field.ts sums them, blended to radial between
 * 1 and 2.5 R). Star frame: y is the rotation axis, direction(lon, lat) = (cos lat sin lon, sin lat, cos lat cos lon). */

import { RSUN_KM } from './constants';
import type { Derived } from './stars';
import { cross, direction, normalize } from './vec';
import type { Vec3 } from './vec';

export const MAX_DIPOLES = 10;   // the global one + 9 regions; shaders/field.ts loops over this many
const MAX_REGIONS = 8;
const DAYS_PER_YEAR = 365.25;
/** Hathaway (2015): amplitude F(t) = t^3 / (exp(t^2 / b^2) - 0.71), b ~ 0.41 of the cycle period; the emergence
 *  latitude falls as lambda0 exp(-t / (0.68 P)) (28 deg -> 7 deg over a solar cycle), scattered by ~6 deg. */
const HATHAWAY_B = 0.41;
const HATHAWAY_C = 0.71;
const LATITUDE_FALL = 0.68;
const LATITUDE_SCATTER = 0.2;
/** Joy's-law tilt scatter (rad, ~15 deg) and the share of anti-Hale regions. */
const TILT_SCATTER_RAD = 0.26;
const ANTI_HALE_SHARE = 0.05;
/** Babcock-Leighton gain is re-fitted each cycle so the polar field swings about +-1; it also decays over 2 cycles. */
const POLAR_SWING = 2.0;
const POLAR_DECAY_CYCLES = 2;
/** Global dipole tilt from the axis at a polar-field maximum (rad); it swings to the equator through a reversal. */
const DIPOLE_EQUATOR_SHARE = 0.25;
/** Spot lifetimes for the smallest and largest regions (peak flux 0.6 and 1.2), days: each region stands for a major
 *  group of a few hundred to a thousand millionths of the hemisphere, whose spots last weeks to a couple of months. */
const SPOT_LIFE_DAYS = [15, 60] as const;
/** A star opens somewhere in this part of its cycle (fractions of the period): the rise to just past maximum. */
const OPENING_PHASE = [0.3, 0.6] as const;

interface Cycle {
  /** Sign of the cycle's northern leading polarity, its age and period (days). */
  readonly sign: number;
  ageDays: number;
  readonly periodDays: number;
}
export interface Region {
  lon: number;
  lat: number;
  /** Peak flux at emergence; `flux` decays from it. */
  readonly peakFlux: number;
  flux: number;
  ageDays: number;
  readonly lifeDays: number;
  /** Tilt at birth (rad): positive when the leading spot sits nearer the equator (Joy's law), negative against it. */
  readonly tilt: number;
  /** Footpoint separation (rad of arc). */
  sep: number;
  /** Polarity of the leading spot (+1 / -1): Hale's law, opposite in the two hemispheres. */
  readonly sign: number;
  /** How long its sunspots last, days: spots lose area at a steady rate (Gnevyshev-Waldmeier, ~10 MSH a day), so a
   *  big region's spots last weeks, a small one's days, while its plage carries the flux for months. */
  readonly spotLifeDays: number;
}


/** Unit vectors toward increasing longitude and latitude at a point. The original built an arbitrary tangent
 *  frame here (which pointed west and south in places and flipped axis at 64 deg latitude), so Joy's-law tilt
 *  came out mirrored in one hemisphere. */
export function eastNorth(d: Vec3): { east: Vec3; north: Vec3 } {
  const east = Math.abs(d[1]) > 0.9999 ? [1, 0, 0] as Vec3 : normalize(cross([0, 1, 0], d));
  return { east, north: cross(d, east) };
}

/** Small seeded generator, so a star looks the same each time it is opened (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class StarField {
  regions: Region[] = [];
  /** The cycle on the rise and the one before it, whose tail overlaps it. */
  private cycle: Cycle;
  private previous: Cycle;
  /** The polar field, signed: about +-1 at a cycle minimum, through zero near maximum. */
  private axialDipole: number;
  /** Babcock-Leighton gain, and this cycle's source so far (re-fits the gain at the next cycle). */
  private gain = 0.12;
  private cycleSource = 0;
  private isFirstCycle = true;
  /** Bumped whenever the dipoles move by ~1 % rms; the GPU maps retrace on a change. */
  version = 0;
  readonly positions = new Float32Array(MAX_DIPOLES * 4);
  readonly moments = new Float32Array(MAX_DIPOLES * 4);
  private snapshot: { positions: Float32Array; moments: Float32Array } | null = null;

  constructor(private readonly derived: Derived, private readonly radiusSun: number, private readonly random: () => number) {
    // each star opens at its own point on the way up to, or just past, its cycle maximum
    const sign = this.random() < 0.5 ? -1 : 1;
    this.cycle = { sign, ageDays: 0, periodDays: this.newPeriod() };
    this.cycle.ageDays = (OPENING_PHASE[0] + (OPENING_PHASE[1] - OPENING_PHASE[0]) * this.random()) * this.cycle.periodDays;
    this.previous = { sign: -sign, ageDays: this.cycle.ageDays + this.cycle.periodDays, periodDays: this.cycle.periodDays };
    this.axialDipole = sign * Math.cos(Math.PI * Math.min(1, this.cycle.ageDays / (0.9 * this.cycle.periodDays)));
    const count = Math.min(MAX_REGIONS, Math.max(1, Math.round(this.targetRegions())));
    for (let i = 0; i < count; i++) this.emergeFromCycles(0.6 + 0.6 * this.random(), this.random() * 15);
    this.buildDipoles();
  }

  get bref(): number { return this.derived.bref; }

  /** Advance by dDays star days (any size: the decay is closed form). */
  evolve(dDays: number): void {
    if (dDays <= 0) return;
    const d = this.derived;
    this.advanceCycle(dDays);
    for (let i = this.regions.length - 1; i >= 0; i--) {
      const r = this.regions[i];
      r.ageDays += dDays;
      r.lon = wrapAngle(r.lon + (this.angularVelocity(r.lat) - d.omega) * dDays);
      r.lat += this.meridionalRadPerDay(r.lat) * dDays;
      r.sep = 0.08 + 0.06 * Math.sqrt(r.ageDays / 10);
      const flux = r.peakFlux * Math.exp(-r.ageDays / r.lifeDays);
      // Babcock-Leighton: the decaying, tilted flux of a cycle's regions builds polar field opposite to the cycle
      const source = (r.flux - flux) * Math.sin(r.tilt) * (Math.sign(r.lat) || 1) * r.sign;
      this.axialDipole -= this.gain * source;
      this.cycleSource += source * this.cycle.sign;   // positive for the rising cycle's regions
      r.flux = flux;
      if (r.flux < 0.08 * r.peakFlux || Math.abs(r.lat) > 1.2) this.regions.splice(i, 1);
    }
    this.axialDipole *= Math.exp(-dDays / (POLAR_DECAY_CYCLES * this.cycle.periodDays));
    this.axialDipole = Math.max(-1.2, Math.min(1.2, this.axialDipole));
    const emergencesPerDay = Math.max(0, (0.6 + 0.4 * (this.targetRegions() - this.regions.length)) * (0.05 + d.activity / 20));
    if (this.regions.length < MAX_REGIONS && this.random() < emergencesPerDay * dDays) {
      this.emergeFromCycles(0.7 + 0.5 * this.random(), 0);
    }
    this.buildDipoles();
  }

  /** Equatorial-to-polar angular velocity at a latitude, rad per day (Snodgrass shape, this star's shear). */
  angularVelocity(lat: number): number {
    const s = Math.sin(lat), s2 = s * s;
    return (14.713 - (2.396 * s2 + 1.787 * s2 * s2) * this.derived.diffRot) / 14.713 * this.derived.omega;
  }

  /** Per dipole slot (as buildDipoles fills them): the longitude and latitude drift its region moves with, rad per
   *  day in the star frame; zero for the global dipole. */
  dipoleDrifts(): Float32Array {
    const out = new Float32Array(MAX_DIPOLES * 4);
    this.regions.slice(0, MAX_DIPOLES - 1).forEach((r, k) => out.set([this.angularVelocity(r.lat) - this.derived.omega, this.meridionalRadPerDay(r.lat)], (k + 1) * 4));
    return out;
  }

  /** Where the star is in its cycle: 0 at the start of the rising cycle's activity, 1 at the next. */
  get cyclePhase(): number { return this.cycle.ageDays / this.cycle.periodDays; }

  private newPeriod(): number { return this.derived.cycleYears * DAYS_PER_YEAR * (0.9 + 0.2 * this.random()); }

  /** The dynamo's clock: a new cycle of opposite polarity begins every period; the Babcock-Leighton gain is re-fitted
   *  from the cycle just finished so the polar field swings about +-1 whatever the star's emergence rate. */
  private advanceCycle(dDays: number): void {
    this.cycle.ageDays += dDays;
    this.previous.ageDays += dDays;
    if (this.cycle.ageDays < this.cycle.periodDays) return;
    if (!this.isFirstCycle && this.cycleSource > 1e-3) this.gain = Math.min(2, Math.max(0.02, 0.4 * this.gain + 0.6 * POLAR_SWING / this.cycleSource));
    this.isFirstCycle = false;
    this.cycleSource = 0;
    this.previous = this.cycle;
    this.cycle = { sign: -this.cycle.sign, ageDays: this.cycle.ageDays - this.cycle.periodDays, periodDays: this.newPeriod() };
  }

  /** Hathaway's cycle amplitude, 1 at its peak. */
  private amplitude(c: Cycle): number {
    const b = HATHAWAY_B * c.periodDays, t = Math.max(0, c.ageDays);
    const shape = (x: number): number => x * x * x / (Math.exp(x * x / (b * b)) - HATHAWAY_C);
    return shape(t) / shape(1.1 * b);   // the curve peaks near t = 1.1 b
  }

  /** Active regions the star tends toward now: a few at maximum, almost none at minimum. */
  private targetRegions(): number {
    return this.derived.regionCount * 2.2 * Math.pow(this.amplitude(this.cycle) + this.amplitude(this.previous), 1.6);
  }

  /** A new region from whichever cycle is producing (the old cycle's tail overlaps the new one's rise), at that
   *  cycle's butterfly latitude, Joy's-law tilt with scatter, and Hale polarity but for a few anti-Hale regions. */
  private emergeFromCycles(peakFlux: number, ageDays: number): void {
    const a = this.amplitude(this.cycle), b = this.amplitude(this.previous);
    const c = this.random() * (a + b) < a ? this.cycle : this.previous;
    const lat0 = this.derived.latHigh * Math.exp(-c.ageDays / (LATITUDE_FALL * c.periodDays));
    const lat = Math.max(0.03, Math.min(this.derived.latHigh, lat0 * (1 + LATITUDE_SCATTER * this.gaussian())));
    const signedLat = this.random() < 0.5 ? -lat : lat;
    const hale = this.random() < ANTI_HALE_SHARE ? -1 : 1;
    const sign = (signedLat >= 0 ? c.sign : -c.sign) * hale;
    const tilt = 0.5 * lat + TILT_SCATTER_RAD * this.gaussian();
    this.emerge(this.random() * 2 * Math.PI - Math.PI, signedLat, peakFlux, ageDays, tilt, sign);
  }

  private gaussian(): number {
    return Math.sqrt(-2 * Math.log(1 - this.random())) * Math.cos(2 * Math.PI * this.random());
  }

  /** The corona's non-potential field at a point, bref units (frictional.ts nonPotentialAt), or null without one. */
  nonPotential: ((p: Vec3) => Vec3 | null) | null = null;

  /** Field at a point (CPU copy of shaders/field.ts fieldAt, for the CPU-side consumers: the event loops' traces and
   *  eruption tests, the CMEs' deflection, the CPU wind grid). */
  fieldAt(p: Vec3): Vec3 {
    const b: Vec3 = [0, 0, 0];
    const np = this.nonPotential?.(p);
    if (np) { b[0] = np[0] * this.derived.bref; b[1] = np[1] * this.derived.bref; b[2] = np[2] * this.derived.bref; }
    for (let i = 0; i < MAX_DIPOLES; i++) {
      if (this.positions[i * 4 + 3] < 0.5) continue;
      const rx = p[0] - this.positions[i * 4], ry = p[1] - this.positions[i * 4 + 1], rz = p[2] - this.positions[i * 4 + 2];
      const r2 = Math.max(rx * rx + ry * ry + rz * rz, 1e-4), ir = 1 / Math.sqrt(r2), ir3 = ir * ir * ir;
      const hx = rx * ir, hy = ry * ir, hz = rz * ir, mx = this.moments[i * 4], my = this.moments[i * 4 + 1], mz = this.moments[i * 4 + 2];
      const mdot = mx * hx + my * hy + mz * hz;
      b[0] += (3 * mdot * hx - mx) * ir3; b[1] += (3 * mdot * hy - my) * ir3; b[2] += (3 * mdot * hz - mz) * ir3;
    }
    const rr = Math.hypot(p[0], p[1], p[2]), a0 = Math.min(1, Math.max(0, (rr - 1) / 1.5)), a = a0 * a0 * (3 - 2 * a0);
    const radial = (b[0] * p[0] + b[1] * p[1] + b[2] * p[2]) / (rr * rr);
    return [b[0] * (1 - a) + a * radial * p[0], b[1] * (1 - a) + a * radial * p[1], b[2] * (1 - a) + a * radial * p[2]];
  }

  private emerge(lon: number, lat: number, peakFlux: number, ageDays: number, tilt: number, sign: number): void {
    const lifeDays = 25 + 25 * this.random();
    this.regions.push({
      lon, lat, peakFlux, flux: peakFlux * Math.exp(-ageDays / lifeDays), ageDays, lifeDays,
      tilt, sep: 0.08 + 0.06 * Math.sqrt(ageDays / 10), sign,
      spotLifeDays: SPOT_LIFE_DAYS[0] + (SPOT_LIFE_DAYS[1] - SPOT_LIFE_DAYS[0]) * Math.min(1, Math.max(0, (peakFlux - 0.6) / 0.6)),
    });
  }

  /** Poleward meridional flow, 11 m/s at mid-latitudes, as rad per day. */
  private meridionalRadPerDay(lat: number): number {
    return 11 * Math.sin(2 * lat) * 86400 / (RSUN_KM * 1000 * this.radiusSun);
  }

  private buildDipoles(): void {
    const d = this.derived;
    this.positions.fill(0); this.moments.fill(0);
    // the axial part is the polar field; through a reversal the dipole swings across the equator rather than
    // vanishing (the original held it at 0.15 and flipped its sign in one step)
    const gm = 0.075 * d.activity * d.dipoleBoost, a = this.axialDipole;
    const equatorial = Math.max(DIPOLE_EQUATOR_SHARE * Math.abs(a), 0.35 * Math.sqrt(Math.max(0, 1 - a * a)));
    this.positions.set([0, 0, 0, 1], 0);
    this.moments.set([equatorial * gm, a * gm, 0, 0], 0);
    this.regions.slice(0, MAX_DIPOLES - 1).forEach((r, k) => {
      const dir = direction(r.lon, r.lat), { east, north } = eastNorth(dir);
      // Joy's law: the leading spot (ahead in the rotation: solar west) sits nearer the equator for a positive tilt
      const toward = -(Math.sign(r.lat) || 1), t = r.tilt;
      const axis = normalize([east[0] * Math.cos(t) + north[0] * Math.sin(t) * toward, east[1] * Math.cos(t) + north[1] * Math.sin(t) * toward, east[2] * Math.cos(t) + north[2] * Math.sin(t) * toward]);
      const depth = 1 - (0.14 + 0.5 * r.sep), strength = 0.0065 * r.flux * r.sign * d.activity;
      this.positions.set([dir[0] * depth, dir[1] * depth, dir[2] * depth, 1], (k + 1) * 4);
      // .w: the share of the region's flux still in sunspots (shaders/field.ts surfaceMap)
      const spots = Math.max(0, 1 - r.ageDays / r.spotLifeDays);
      this.moments.set([axis[0] * strength, axis[1] * strength, axis[2] * strength, spots], (k + 1) * 4);
    });
    this.bumpVersionOnChange();
  }

  private bumpVersionOnChange(): void {
    const s = this.snapshot;
    const moved = (now: Float32Array, then: Float32Array): boolean => {
      let change = 0, scale = 0;
      for (let i = 0; i < now.length; i++) { change += (now[i] - then[i]) ** 2; scale += then[i] ** 2; }
      return change > 1e-4 * scale;
    };
    if (s && !moved(this.positions, s.positions) && !moved(this.moments, s.moments)) return;
    this.snapshot = { positions: this.positions.slice(), moments: this.moments.slice() };
    this.version++;
  }
}

function wrapAngle(a: number): number {
  return a - 2 * Math.PI * Math.floor((a + Math.PI) / (2 * Math.PI));
}
