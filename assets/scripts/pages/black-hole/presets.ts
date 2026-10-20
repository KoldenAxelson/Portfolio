/* The four black holes from dwarfstar.online/play, with the values the original's shader actually received
 * (its setStar merged each preset onto the previous one's state, so the effective values are listed here
 * in full instead). Units are M = GM/c^2 unless named otherwise. */

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
  /** Accretion rate as a fraction of Eddington (efficiency 0.1). */
  readonly mdotEdd: number;
  /** Disk outer radius; 0 for a hole with no disk. */
  readonly rOut: number;
  /** Disk aspect ratio H/r. */
  readonly hr: number;
  /** Radial temperature slope: 0.75 thin Novikov-Thorne, 0.5 an irradiated or flared disk. */
  readonly tSlope: number;
  /** 1 = relativistic beaming and Doppler colour; 0 = off, as in the Interstellar render. */
  readonly beam: number;
  readonly band: Band;
  readonly bloom: number;
}

export const PRESETS: readonly Preset[] = [
  { key: 'garg', label: 'Gargantua-like', note: '10⁸ M☉ · quiescent · near edge-on', spin: 0.9, incDeg: 86, massSun: 1e8, mdotEdd: 3e-7, rOut: 40, hr: 0.03, tSlope: 0.5, beam: 0, band: 0, bloom: 0.35 },
  { key: 'bhd', label: 'M87-like', note: '6.5 × 10⁹ M☉ · near face-on', spin: 0.9, incDeg: 17, massSun: 6.5e9, mdotEdd: 1e-4, rOut: 20, hr: 0.06, tSlope: 0.5, beam: 1, band: 0, bloom: 0.7 },
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

/** Novikov-Thorne temperature scale T0 (K): T(r) = T0 r^-3/4 (1 - sqrt(r_isco/r))^1/4 for r in M. */
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

export function presetByKey(key: string): Preset | undefined {
  return PRESETS.find((p) => p.key === key);
}
