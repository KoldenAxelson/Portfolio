/* The six stars from dwarfstar.online/play and everything the simulation derives from them (its derive()).
 * Solar units unless named; Prot is the equatorial rotation period in days (sidereal), Bdip the large-scale field (G),
 * V - Ks the colour that sets the convective turnover time. */

import { RSUN_KM } from './constants';

export interface StarPreset {
  readonly key: string;
  readonly label: string;
  readonly note: string;
  readonly mass: number;
  readonly radius: number;
  readonly teff: number;
  readonly protDays: number;
  readonly bdipGauss: number;
  readonly vMinusK: number;
}

export const STARS: readonly StarPreset[] = [
  // the Sun's equator turns in 24.47 d (Snodgrass & Ulrich's 14.713 deg/day); 25.4 d is the Carrington rate at ~26 deg
  { key: 'sun', label: 'Sun', note: 'G2V', mass: 1.0, radius: 1.0, teff: 5772, protDays: 24.47, bdipGauss: 1.5, vMinusK: 1.56 },
  { key: 'k5', label: 'K5V', note: 'orange dwarf', mass: 0.68, radius: 0.68, teff: 4400, protDays: 20.0, bdipGauss: 10, vMinusK: 3.0 },
  { key: 'm3', label: 'AD Leo', note: 'M3.5V · flare star', mass: 0.42, radius: 0.44, teff: 3400, protDays: 2.23, bdipGauss: 300, vMinusK: 4.93 },
  { key: 'm5', label: 'YZ CMi', note: 'M4.5V · fully convective', mass: 0.31, radius: 0.29, teff: 3100, protDays: 2.77, bdipGauss: 1000, vMinusK: 4.57 },
  { key: 'm8', label: 'TRAPPIST-1', note: 'M8V', mass: 0.09, radius: 0.12, teff: 2566, protDays: 3.3, bdipGauss: 600, vMinusK: 8.5 },
  { key: 'proxima', label: 'Proxima', note: 'M5.5V · slow rotator', mass: 0.12, radius: 0.15, teff: 3000, protDays: 83.0, bdipGauss: 200, vMinusK: 6.75 },
];

/** Camera distance in stellar radii (the lens and the camera orbit both use it). */
export const CAMERA_DISTANCE_R = 30;
const G = 6.674e-11, C = 2.998e8, MSUN = 1.989e30, RSUN = RSUN_KM * 1000;

export interface Derived {
  /** Surface gravity, solar units. */
  readonly gravity: number;
  /** Magnetic activity relative to the Sun, (Ro / Ro_sun)^-0.9; saturates at 14.6. */
  readonly activity: number;
  readonly rossby: number;
  /** Linear limb-darkening coefficient u in I = 1 - u (1 - mu), visible band. */
  readonly limbU: number;
  /** The same per display channel (R, G, B): the limb darkens more in the blue, so it reddens. */
  readonly limbRgb: readonly [number, number, number];
  /** Continuum brightness over the photosphere's (HMI, 617 nm) of a small spot's umbra, a large one's, the penumbra;
   *  and the faculae's limb contrast. Spots on cool stars are only a few hundred K cooler than their surroundings. */
  readonly spot: readonly [number, number, number, number];
  /** Granule and network scale relative to the Sun. */
  readonly granScale: number;
  /** Photosphere colour, sRGB-encoded, brightest channel 1. */
  readonly bbColor: readonly [number, number, number];
  /** Coronal temperatures, MK: over open field (holes), quiet closed field, over strong field. */
  readonly tcor: readonly [number, number, number];
  /** Einstein radius of the star's lens for a camera at CAMERA_DISTANCE_R, in stellar radii. */
  readonly thetaE: number;
  /** Equatorial rotation, rad per star day. */
  readonly omega: number;
  /** Target number of active regions. */
  readonly regionCount: number;
  readonly flareEnergy: number;
  readonly fullyConvective: boolean;
  /** Differential-rotation scale against the Snodgrass shape at this star's omega: equator-to-pole shear
   *  dOmega = 0.073 (Teff / 5772)^8.92 rad/day (Barnes et al. 2005), floored at V374 Peg's 0.0063. */
  readonly diffRot: number;
  /** Expected activity-cycle length, years. */
  readonly cycleYears: number;
  readonly dipoleBoost: number;
  /** Highest active-region latitude, rad. */
  readonly latHigh: number;
  /** Small-scale mixed-polarity flux, fraction of bref. */
  readonly carpet: number;
  /** Field normalisation: |B| of an active-region footpoint. */
  readonly bref: number;
  /** Large-scale field driving the wind, G. */
  readonly bLarge: number;
  readonly radiusKm: number;
}

/** Convective turnover time from V - Ks (Wright et al. 2018, valid 1.1 - 7.0). The original's Cranmer & Saar fit is
 *  calibrated only above 3300 K: it gave Proxima Ro = 1.2 and barely any more activity than the Sun. */
const convectiveTurnoverDays = (vMinusK: number): number => Math.pow(10, 0.64 + 0.25 * Math.min(7, Math.max(1.1, vMinusK)));
const SUN_ROSSBY = STARS[0].protDays / convectiveTurnoverDays(STARS[0].vMinusK);
/** Activity saturates below this Rossby number, at 14.6 x the Sun (the original's ratio of the two). */
const SATURATION_ROSSBY = 0.0507 * SUN_ROSSBY;
/** The activity a saturated star reaches (sim.ts labels it). */
export const SATURATED_ACTIVITY = Math.pow(SATURATION_ROSSBY / SUN_ROSSBY, -0.9);
/** hc / (lambda k) at HMI's 617.3 nm, K. */
const PLANCK_617_K = 23310;
/** Solar spot brightness at 617 nm (Mathew et al. 2007): small umbra, large umbra, penumbra. */
const SOLAR_SPOT_BRIGHTNESS = [0.35, 0.12, 0.82] as const;
const SUN_TEFF = 5772;
const SUN_DOMEGA_RAD_PER_DAY = 0.073;
const SNODGRASS_SHEAR = (2.396 + 1.787) / 14.713;

/** Photosphere - spot temperature difference, K: ~2000 K for G stars, a few hundred for M dwarfs (Berdyugina 2005). */
const spotContrastK = (teff: number): number => Math.max(250, 200 + 1800 * (teff - 3000) / (SUN_TEFF - 3000));
const planck617 = (t: number): number => 1 / Math.expm1(PLANCK_617_K / t);

/** Continuum excess at 617 nm of a hot flare kernel over this photosphere, (B(flare) - B(photosphere)) / B(photosphere):
 *  the same 9,000 K kernel (Kowalski et al. 2013) is a few times the Sun's surface but ~80 times an M dwarf's. */
export function flareContrast(teff: number, flareK = 9000): number { return planck617(flareK) / planck617(teff) - 1; }

/** The solar spot brightnesses carried to another star: each solar temperature deficit scaled by spotContrastK. */
function spotBrightness(teff: number): [number, number, number, number] {
  const scale = spotContrastK(teff) / spotContrastK(SUN_TEFF);
  const [small, large, penumbra] = SOLAR_SPOT_BRIGHTNESS.map((b) => {
    const solarSpotT = PLANCK_617_K / Math.log1p(1 / (b * planck617(SUN_TEFF)));
    const spotT = teff - (SUN_TEFF - solarSpotT) * scale;
    return planck617(spotT) / planck617(teff);
  });
  // faculae: +8 % near the solar limb, weaker as the spot contrast falls
  return [small, large, penumbra, 0.08 * scale];
}

export function derive(star: StarPreset): Derived {
  const gravity = star.mass / (star.radius * star.radius);
  const rossby = star.protDays / convectiveTurnoverDays(star.vMinusK);
  const activity = Math.pow(Math.max(rossby, SATURATION_ROSSBY) / SUN_ROSSBY, -0.9);
  const fullyConvective = star.mass < 0.35;
  const lensDistance = CAMERA_DISTANCE_R * star.radius * RSUN;
  const omega = 2 * Math.PI / star.protDays;
  // visible-band linear u: 0.645 for the Sun (Neckel & Labs), a little stronger for cooler photospheres
  const limbU = Math.min(0.8, Math.max(0.45, 0.645 + (SUN_TEFF - star.teff) * 0.00003));
  const dOmega = Math.max(0.0063, SUN_DOMEGA_RAD_PER_DAY * Math.pow(star.teff / SUN_TEFF, 8.92));
  return {
    gravity, activity, rossby, limbU,
    limbRgb: [limbU * 0.85, limbU, limbU * 1.16],
    spot: spotBrightness(star.teff),
    granScale: (star.teff / 5772) / (gravity * star.radius),
    bbColor: blackbodyColor(star.teff),
    // holes, quiet Sun, active-region cores (3-4 MK on the Sun)
    tcor: [0.8 * Math.pow(activity, 0.3), 1.1 * Math.pow(activity, 0.5), 3.0 * Math.pow(activity, 0.6)],
    thetaE: Math.sqrt(4 * G * star.mass * MSUN * lensDistance / (C * C)) / (star.radius * RSUN),
    omega,
    regionCount: Math.min(8, Math.max(1, Math.round(1.5 + 1.2 * activity))),
    // the largest flares grow ~100-fold from the Sun to a saturated M dwarf (1e32 -> 1e34 erg)
    flareEnergy: 0.62 * Math.pow(activity, 1.7),
    fullyConvective,
    diffRot: dOmega / (omega * SNODGRASS_SHEAR),
    // the Sun's 11 years; observed M-dwarf cycles cluster around 7 (Proxima ~7, Wargelin et al. 2017)
    cycleYears: fullyConvective || star.teff < 3800 ? 7 : star.teff < 5000 ? 9 : 11,
    dipoleBoost: fullyConvective ? 2.2 : 1,
    latHigh: Math.min(1.45, 0.4 + 0.12 * activity),
    carpet: Math.min(0.45, 0.10 + 0.03 * activity),
    bref: 0.0065 * activity / (0.18 * 0.18 * 0.18) * 0.55,
    bLarge: star.bdipGauss || Math.min(1.5 * Math.pow(Math.max(activity, 1), 2), 1000),
    radiusKm: RSUN_KM * star.radius,
  };
}

/** Planck spectrum through CIE 1931 (piecewise-Gaussian fits, Wyman et al. 2013) to sRGB, brightest channel 1. */
export function blackbodyColor(teff: number): [number, number, number] {
  const h = 6.626e-34, kB = 1.381e-23;
  const g = (x: number, mu: number, s1: number, s2: number): number => { const t = (x - mu) / (x < mu ? s1 : s2); return Math.exp(-0.5 * t * t); };
  let X = 0, Y = 0, Z = 0;
  for (let nm = 380; nm <= 780; nm += 5) {
    const lm = nm * 1e-9, B = 1 / (Math.pow(lm, 5) * Math.expm1(Math.min(h * C / (lm * kB * teff), 700)));
    X += B * (1.056 * g(nm, 599.8, 37.9, 31.0) + 0.362 * g(nm, 442.0, 16.0, 26.7) - 0.065 * g(nm, 501.1, 20.4, 26.2));
    Y += B * (0.821 * g(nm, 568.8, 46.9, 40.5) + 0.286 * g(nm, 530.9, 16.3, 31.1));
    Z += B * (1.217 * g(nm, 437.0, 11.8, 36.0) + 0.681 * g(nm, 459.0, 26.0, 13.8));
  }
  const rgb = [3.2406 * X - 1.5372 * Y - 0.4986 * Z, -0.9689 * X + 1.8758 * Y + 0.0415 * Z, 0.0557 * X - 0.2040 * Y + 1.0570 * Z].map((v) => Math.max(v, 0));
  const top = Math.max(...rgb, 1e-30);
  const encode = (v: number): number => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
  return [encode(rgb[0] / top), encode(rgb[1] / top), encode(rgb[2] / top)];
}

export function starByKey(key: string): StarPreset | undefined {
  return STARS.find((s) => s.key === key);
}

/** The EUV corona's density scale height against the Sun's: H ~ T R / M (the EUV fits were made on the Sun's quiet
 *  corona), so a hot, low-gravity M-dwarf corona stands several times further out. */
export function coronaHeightScale(star: StarPreset, derived: Derived): number {
  return derived.tcor[1] / derive(STARS[0]).tcor[1] * star.radius / star.mass;
}
