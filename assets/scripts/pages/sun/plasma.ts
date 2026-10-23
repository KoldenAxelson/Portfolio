/* The event loops' plasma (loops.ts): each loop, and each strand of a flare arcade, is a 0-D EBTEL cell (Klimchuk et
 * al. 2008, Cargill et al. 2012) that holds its static equilibrium until heating drives it hot and dense. Plasma
 * clock (anim units, clock.ts). */

import { ANIM_UNIT_S } from './clock';
import { RSUN_KM } from './constants';

export const CM_PER_RSUN = RSUN_KM * 1e5;
/** The unit of a cell's density, cm^-3. */
export const N0 = 1e9;
/** E-fold of a loop's impulsive heating, s. */
export const HEAT_TAU_S = 300;
/** E-fold of an arcade strand's impulsive heating, s: the impulsive phase of the arcade fit in loops.ts. */
export const ARCADE_HEAT_TAU_S = 56;

const BOLTZMANN = 1.380649e-16;
/** Spitzer conductivity coefficient (cgs) and EBTEL's c1 (conductive / radiative loss), c2 (mean / apex
 *  temperature) and c3 (base / apex temperature). */
const KAPPA0 = 1e-6, C1 = 2, C2 = 0.9, C3 = 0.6;
/** Cross-section of a loop bundle 5 Mm across, cm^2. */
const BUNDLE_AREA_CM2 = 2e17;
/** Sub-step cap for one cell step: enough for a hot, tenuous loop's stiff conduction at the largest frame step. */
const MAX_SUBSTEPS = 2000;
/** The largest fractional change of pressure or density one explicit sub-step may make. */
const MAX_SUBSTEP_CHANGE = 0.05;
const MIN_PRESSURE = 1e-4;
const MIN_DENSITY_CM3 = 1e7, MAX_DENSITY_CM3 = 1e13;
const MIN_TEMPERATURE_K = 2e4, MAX_TEMPERATURE_K = 1e8;

/** A 0-D coronal plasma: full length (stellar radii), temperature (MK), density (N0), background and impulsive
 *  heating (erg/cm^3/s). */
export interface PlasmaCell {
  lengthR: number;
  temperatureMK: number;
  density: number;
  backgroundHeating: number;
  pulseHeating: number;
}

/** Klimchuk et al. (2008) radiative loss, erg cm^3 s^-1, T in K. */
function radiativeLoss(T: number): number {
  const logT = Math.log10(T);
  if (logT <= 4.97) return 1.09e-31 * T * T;
  if (logT <= 5.67) return 8.87e-17 / T;
  if (logT <= 6.18) return 1.90e-22;
  if (logT <= 6.55) return 3.53e-13 * Math.pow(T, -1.5);
  if (logT <= 6.90) return 3.46e-25 * Math.pow(T, 1 / 3);
  if (logT <= 7.63) return 5.49e-16 / T;
  return 1.96e-27 * Math.sqrt(T);
}

/** Conductive flux F_c out of a loop of apex temperature T (K) and half-length `halfCm`. */
const conductiveFlux = (T: number, halfCm: number): number => (2 / 7) * KAPPA0 * Math.pow(T / C2, 3.5) / halfCm;

export const halfLengthCm = (lengthR: number, radiusSun: number): number => Math.max(0.01, lengthR) * 0.5 * CM_PER_RSUN * radiusSun;

export const loopVolumeCm3 = (lengthR: number, radiusSun: number): number => BUNDLE_AREA_CM2 * 2 * halfLengthCm(lengthR, radiusSun);

/** The static loop a field line of half-length `halfCm` holds at `temperatureMK`: F_c = c1 R_c, Q L = (1 + c1) R_c.
 *  Density in cm^-3, heating in erg/cm^3/s. */
export function equilibrium(temperatureMK: number, halfCm: number): { density: number; heating: number } {
  const T = temperatureMK * 1e6;
  const density = Math.sqrt(conductiveFlux(T, halfCm) / (C1 * radiativeLoss(T) * halfCm));
  return { density, heating: (1 + C1) * density * density * radiativeLoss(T) };
}

/** Heating (erg/cm^3/s) that delivers `energy` x 1e30 erg over HEAT_TAU_S to the cell's bundle. */
export const flareHeating = (cell: PlasmaCell, energy: number, radiusSun: number): number =>
  energy * 1e30 / (loopVolumeCm3(cell.lengthR, radiusSun) * HEAT_TAU_S);

/** Advance one cell by dtAnim, explicit Euler with at most MAX_SUBSTEP_CHANGE of p or n per sub-step (conduction is
 *  stiff in a hot tenuous loop). `tauS`: e-fold of the impulsive heating within the step. T, n, p and Q are the
 *  cell's temperature (K), density (cm^-3), pressure and heating. */
export function plasmaCore(cell: PlasmaCell, dtAnim: number, radiusSun: number, tauS = HEAT_TAU_S): void {
  const halfCm = halfLengthCm(cell.lengthR, radiusSun), totalS = dtAnim * ANIM_UNIT_S;
  let left = totalS, T = cell.temperatureMK * 1e6, n = cell.density * N0, p = 2 * n * BOLTZMANN * T;
  for (let it = 0; it < MAX_SUBSTEPS && left > 1e-3; it++) {
    const Q = cell.backgroundHeating + Math.max(0, cell.pulseHeating) * Math.exp(-(totalS - left) / tauS);
    const radiation = n * n * radiativeLoss(T) * halfCm, conduction = conductiveFlux(T, halfCm);
    const dp = (2 / 3) * (Q - (1 + C1) * radiation / halfCm), dn = C2 / (5 * C3 * BOLTZMANN * T * halfCm) * (conduction - C1 * radiation);
    let h = left;
    if (Math.abs(dp) * h > MAX_SUBSTEP_CHANGE * p) h = MAX_SUBSTEP_CHANGE * p / Math.abs(dp);
    if (Math.abs(dn) * h > MAX_SUBSTEP_CHANGE * n) h = MAX_SUBSTEP_CHANGE * n / Math.abs(dn);
    p = Math.max(MIN_PRESSURE, p + dp * h);
    n = Math.min(MAX_DENSITY_CM3, Math.max(MIN_DENSITY_CM3, n + dn * h));
    T = Math.min(MAX_TEMPERATURE_K, Math.max(MIN_TEMPERATURE_K, p / (2 * n * BOLTZMANN)));
    left -= h;
  }
  cell.temperatureMK = T / 1e6;
  cell.density = n / N0;
}
