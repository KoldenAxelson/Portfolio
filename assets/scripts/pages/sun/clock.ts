/* The simulation's clocks. One display second is `rate` star seconds; slower processes are capped so they stay
 * watchable at high warp (the original's PLASMA_CAP and HELIO_CAP). All phases that feed trig on the GPU are
 * reduced here in double precision. */

import { RSUN_KM } from './constants';
import { CAMERA_DISTANCE_R } from './stars';
import type { Derived, StarPreset } from './stars';

export const RATES: readonly { seconds: number; label: string }[] = [
  { seconds: 0, label: 'Pause' },
  { seconds: 1, label: 'Real time' },
  { seconds: 60, label: '1 min/s' },
  { seconds: 600, label: '10 min/s' },
  { seconds: 3600, label: '1 h/s' },
  { seconds: 6660, label: '1.85 h/s' },
  { seconds: 21600, label: '6 h/s' },
  { seconds: 86400, label: '1 day/s' },
  { seconds: 604800, label: '1 week/s' },
];
export const DEFAULT_RATE_INDEX = 5;
/** One "anim" unit: the surface and loop plasma clock counts in display seconds at the default rate. */
export const ANIM_UNIT_S = 6660;
const PLASMA_CAP = 600;
const HELIO_CAP = 3600;
/** The wind displacement wraps over this many star seconds, in two phases half a period apart (see windPhases). */
const WIND_PERIOD_S = 2e5;

export class Clock {
  rateIndex = DEFAULT_RATE_INDEX;
  starSeconds = 0;
  /** Capped plasma clock, anim units: granulation, the surface flow, loop plasma. */
  anim = 0;
  /** Rotation angle, rad, wrapped. */
  rotation = 0;
  /** Heliosphere clock, star seconds: outflow, CMEs. */
  wind = 0;
  /** Steps of the last advance, for the integrators. */
  dDays = 0;
  dAnim = 0;
  dWind = 0;

  constructor(private star: StarPreset, private derived: Derived) {}

  setStar(star: StarPreset, derived: Derived): void { this.star = star; this.derived = derived; }

  get rate(): number { return RATES[this.rateIndex].seconds; }
  get isPaused(): boolean { return this.rate === 0; }
  /** Heliosphere star seconds per display second: capped so the wind crosses three radii in no less than a second. */
  get windRate(): number { return Math.min(this.rate, HELIO_CAP, 3 * RSUN_KM * this.star.radius / 400); }

  /** Advance by dt display seconds (clamped, so a stalled tab does not lurch). */
  advance(dtDisplay: number): void {
    const dt = Math.min(0.1, Math.max(0, dtDisplay)), rate = this.rate;
    const dStar = dt * rate;
    this.starSeconds += dStar;
    this.dDays = dStar / 86400;
    this.dAnim = dt * Math.min(rate, PLASMA_CAP) / ANIM_UNIT_S;
    this.anim += this.dAnim;
    // the star turns at its own rate; the original subtracted the camera's orbit, which outran a slow rotator's
    // spin and made the Sun, K5, TRAPPIST-1 and Proxima all turn backwards
    this.rotation = (this.rotation + this.derived.omega * this.dDays) % (2 * Math.PI);
    this.dWind = dt * this.windRate;
    this.wind += this.dWind;
  }

  /** Camera orbit at CAMERA_DISTANCE_R (Kepler), rad: it only drifts the background sky now. */
  get cameraAngle(): number {
    const a = CAMERA_DISTANCE_R * this.star.radius * 6.957e8;
    const period = 2 * Math.PI * Math.sqrt(a * a * a / (6.674e-11 * this.star.mass * 1.989e30));
    return 2 * Math.PI * (this.starSeconds / period % 1e4);
  }

  /** Two wrapped copies of the wind displacement half a period apart, and the weight of the first: the
   *  renderer cross-fades them so the outflow pattern never wraps visibly and never shears without bound. */
  get windPhases(): { a: number; b: number; weightA: number } {
    const f = this.wind / WIND_PERIOD_S;
    const s = Math.sin(Math.PI * (f % 1));
    return { a: (f % 1) * WIND_PERIOD_S, b: ((f + 0.5) % 1) * WIND_PERIOD_S, weightA: s * s };
  }
}
