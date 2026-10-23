/* The four black holes from dwarfstar.online/play, with the values the original's shader actually received
 * (its setStar merged each preset onto the previous one's state, so the effective values are listed here
 * in full instead). Units are M = GM/c^2 unless named otherwise.
 *
 * What the presets are, and aren't:
 * - Gargantua-like: Interstellar's renders used a = 0.6 and left Doppler shifts out (James et al. 2015,
 *   arXiv:1502.03808); a = 0.9 here, beaming off as in the film. At 3e-7 Eddington a real hole would hold a hot,
 *   thick ADAF, not a thin disk (Esin et al. 1997): the cool thin disk is the film's look, not a physical state.
 * - M87-like: the geometry is M87*'s (6.5e9 Msun, EHT 2019 Paper VI; ~17 deg, Walker et al. 2018). Its real flow
 *   is a hot, optically thin RIAF seen in synchrotron at ~2e-6 of Eddington (EHT 2021 Paper VIII), not this
 *   thin blackbody disk, and the EHT's bright crescent sits to the south: this is a hypothetical thin disk.
 * - X-ray binary: a = 0.9, H/r 0.08 (about the radiation-pressure thickness at 10 %), with the hardened
 *   (colour-corrected) blackbody a scattering atmosphere gives (colourCorrection). */

export type Band = 0 | 1 | 2;   // visible light, ultraviolet (100-300 nm), soft X-ray (0.1-2 keV)

export interface Preset {
  readonly key: string;
  readonly label: string;
  readonly note: string;
  /** Spin a/M. 0 is Schwarzschild. */
  readonly spin: number;
  /** Viewing inclination from the disk axis, degrees. */
  readonly incDeg: number;
  /** Mass in solar masses: sets the disk temperature and what one M of time is in seconds. */
  readonly massSun: number;
  /** Accretion rate as a fraction of the Eddington rate defined at efficiency 0.1. A spinning hole's disk radiates
   *  its own binding energy, 15.6 % at a = 0.9 (Page & Thorne 1974), so the X-ray binary's "10 %" is 15.6 % of
   *  L_Edd in light. */
  readonly mdotEdd: number;
  /** Disk outer radius; 0 for a hole with no disk. */
  readonly rOut: number;
  /** Disk aspect ratio H/r. */
  readonly hr: number;
  /** Radial temperature slope: 0.75 thin Novikov-Thorne, 0.5 an irradiated or flared disk. */
  readonly tSlope: number;
  /** 1 = the full Kerr shift g (Doppler beaming and colour, and the gravitational redshift); 0 = g = 1, no shift
   *  of either kind, as in the Interstellar render. */
  readonly beam: number;
  readonly band: Band;
  readonly bloom: number;
}

export const PRESETS: readonly Preset[] = [
  { key: 'garg', label: 'Gargantua-like', note: '10⁸ M☉ · quiescent · near edge-on', spin: 0.9, incDeg: 86, massSun: 1e8, mdotEdd: 3e-7, rOut: 40, hr: 0.03, tSlope: 0.5, beam: 0, band: 0, bloom: 0.35 },
  { key: 'bhd', label: 'M87-like', note: '6.5 × 10⁹ M☉ · near face-on · hypothetical thin disk', spin: 0.9, incDeg: 17, massSun: 6.5e9, mdotEdd: 1e-4, rOut: 20, hr: 0.06, tSlope: 0.5, beam: 1, band: 0, bloom: 0.7 },
  { key: 'kerr', label: 'X-ray binary', note: '10 M☉ · 10 % Eddington', spin: 0.9, incDeg: 80, massSun: 10, mdotEdd: 0.1, rOut: 20, hr: 0.08, tSlope: 0.75, beam: 1, band: 2, bloom: 0.6 },
  { key: 'bh', label: 'Isolated', note: 'no disk · lensing only', spin: 0, incDeg: 78, massSun: 10, mdotEdd: 0, rOut: 0, hr: 0.1, tSlope: 0.75, beam: 1, band: 0, bloom: 0.6 },
];

export const BAND_LABELS: readonly string[] = ['Visible', 'Ultraviolet', 'Soft X-ray'];

/** Seconds per M of time for a hole of this mass (G Msun / c^3 = 4.925 us). */
export const secondsPerM = (massSun: number): number => 4.925e-6 * massSun;

/** Prograde ISCO radius (Bardeen, Press & Teukolsky 1972). */
export function iscoRadius(spin: number): number {
  const z1 = 1 + Math.cbrt(1 - spin * spin) * (Math.cbrt(1 + spin) + Math.cbrt(1 - spin));
  const z2 = Math.sqrt(3 * spin * spin + z1 * z1);
  return 3 + z2 - Math.sqrt((3 - z1) * (3 + z1 + 2 * z2));
}

/** Orbital period of a prograde circular orbit at r, in M. */
export const orbitPeriodM = (r: number, spin: number): number => 2 * Math.PI * (Math.pow(r, 1.5) + spin);

/** Novikov-Thorne temperature scale T0 (K): T(r) = T0 r^-3/4 Q(r)^1/4 for r in M (pageThorneQ). */
export function temperatureScale(preset: Preset): number {
  const G = 6.674e-11, c = 2.998e8, sigma = 5.670e-8, mass = preset.massSun * 1.989e30, rg = G * mass / (c * c);
  const mdot = preset.mdotEdd * 1.26e31 * preset.massSun / (0.1 * c * c);
  return Math.pow(3 * G * mass * mdot / (8 * Math.PI * sigma * rg * rg * rg), 0.25);
}

/** Horizontal offset (M, screen x) of the Kerr shadow's middle from the hole. A spinning hole's shadow is
 *  flattened on the approaching side and bulges on the other, so its middle sits ~2 a sin i to one side.
 *  Its left and right edges are the two equatorial photon orbits, where Bardeen's beta = 0; the same
 *  curve as rhoCrit in shaders.ts, in double precision. */
export function shadowCentreOffset(spin: number, incRad: number): number {
  if (spin < 0.02) return 0;
  const a = spin, si = Math.max(Math.abs(Math.sin(incRad)), 0.02), ci = Math.cos(incRad);
  const xi = (r: number): number => -(r * r * r - 3 * r * r + a * a * r + a * a) / (a * (r - 1));
  const beta2 = (r: number): number => {
    const eta = -r * r * r * (r * r * r - 6 * r * r + 9 * r - 4 * a * a) / (a * a * (r - 1) * (r - 1));
    return eta + a * a * ci * ci - xi(r) * xi(r) * ci * ci / (si * si);
  };
  const r1 = 2 * (1 + Math.cos(2 / 3 * Math.acos(-a))), r2 = 2 * (1 + Math.cos(2 / 3 * Math.acos(a)));
  // beta^2 > 0 on a window that narrows toward face-on: find its peak (it is unimodal), then each edge
  let lo = r1, hi = r2;
  for (let i = 0; i < 48; i++) { const m1 = hi - 0.618034 * (hi - lo), m2 = lo + 0.618034 * (hi - lo); if (beta2(m1) < beta2(m2)) lo = m1; else hi = m2; }
  const peak = 0.5 * (lo + hi);
  const edge = (outside: number): number => {
    let lo = outside, hi = peak;
    for (let i = 0; i < 40; i++) { const m = 0.5 * (lo + hi); if (beta2(m) > 0) hi = m; else lo = m; }
    return -xi(0.5 * (lo + hi)) / si;
  };
  return 0.5 * (edge(r1) + edge(r2));
}

/** The Page & Thorne (1974) relativistic factor Q(r) in the thin disk's flux F = 3 Mdot Q / (8 pi r^3): zero at
 *  the ISCO, toward 1 far out. The Newtonian 1 - sqrt(r_isco/r) it replaces overstates the inner disk (by 5x at
 *  1.05 r_isco, 1.3x at 6 M for a = 0.9) and radiates 38 % more than the binding energy. shaders.ts pageThorneQ
 *  is the same formula. x = sqrt r, x_i the roots of x^3 - 3x + 2a. */
export function pageThorneQ(r: number, spinIn: number): number {
  const a = Math.max(spinIn, 1e-4), x = Math.sqrt(r), x0 = Math.sqrt(iscoRadius(spinIn));
  if (x <= x0) return 0;
  const th = Math.acos(a) / 3;
  const roots = [2 * Math.cos(th - Math.PI / 3), 2 * Math.cos(th + Math.PI / 3), -2 * Math.cos(th)];
  let bracket = x - x0 - 1.5 * a * Math.log(x / x0);
  for (let i = 0; i < 3; i++) {
    const xi = roots[i], xj = roots[(i + 1) % 3], xk = roots[(i + 2) % 3];
    bracket -= 3 * (xi - a) * (xi - a) / (xi * (xi - xj) * (xi - xk)) * Math.log((x - xi) / (x0 - xi));
  }
  return Math.max(0, x * x / (x * x * x - 3 * x + 2 * a) * bracket);
}

/** Colour correction f of a disk atmosphere at effective temperature T (K): electron scattering hardens the
 *  emergent spectrum to f^-4 B(f T). Done et al. 2012 (arXiv:1107.5429) eqs. 1-2: (72 keV / kT)^(1/9) above
 *  1e5 K, (T / 3e4 K)^0.82 between 3e4 and 1e5 K, 1 below (the two cool presets). shaders.ts colourCorrection. */
export function colourCorrection(temperature: number): number {
  if (temperature > 1e5) return Math.pow(72 / (8.617333e-8 * temperature), 1 / 9);
  if (temperature > 3e4) return Math.pow(temperature / 3e4, 0.82);
  return 1;
}

export function presetByKey(key: string): Preset | undefined {
  return PRESETS.find((p) => p.key === key);
}
