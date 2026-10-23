/* Blackbody band intensity as rules, the same model shaders.ts tabulates (fieldShader's tables), so the exposure
 * seeded here and the image agree. The original seeded its exposure from a different visible-band integral
 * (a CIE curve fit) than the one its shader drew with, then leaned on a GPU readback meter to hide the gap.
 *
 * Visible: CIE Y = B_lambda(555 nm) W 10^delta(log T), delta a 14-term Chebyshev fit of the exact integral.
 * UV and soft X: three sub-bands of int B_nu dnu, Q(x) = int_x^inf t^3/(e^t - 1) dt in series. */

import type { Band } from './presets';

/** Chebyshev coefficients on t = (log10 T - 3) / 6.5 * 2 - 1: delta (14), then the Planckian locus x (14) and y (14). */
export const BB_CHEBYSHEV: readonly number[] = [
  0.0488678732, -0.0801755211, 0.0769849919, -0.0705767939, 0.0607239187, -0.04842045, 0.0354867482, -0.0237505438, 0.01441335, -0.0078550999, 0.003794918, -0.0016034357, 0.0005949086, -0.0002122835,
  0.3100890082, -0.1298907331, 0.1036960061, -0.0699336133, 0.0378150198, -0.0134389613, -0.0012503675, 0.0074860042, -0.0080216809, 0.005733703, -0.0028113916, 0.000499604, 0.0007840816, -0.0011568372,
  0.2723557286, -0.0676822007, 0.0451067934, -0.0183901744, -0.0032580151, 0.0151065118, -0.0174173569, 0.0134788264, -0.0072086628, 0.0015670141, 0.0019896031, -0.0033097235, 0.0030124967, -0.0019426193,
];

/** Sub-band edges in metres for UV and soft X (the observatories' hardness split). */
export const BAND_EDGES: Readonly<Record<1 | 2, readonly number[]>> = {
  1: [100e-9, 170e-9, 230e-9, 300e-9],
  2: [0.62e-9, 1.24e-9, 3.1e-9, 12.4e-9],
};

const LOG10E = Math.LOG10E;
const HC_K = 1.438432e-2;

function chebyshev(offset: number, t: number): number {
  let b0 = 0, b1 = 0;
  for (let k = 13; k >= 1; k--) { const v = 2 * t * b0 - b1 + BB_CHEBYSHEV[offset + k]; b1 = b0; b0 = v; }
  return t * b0 - b1 + BB_CHEBYSHEV[offset];
}

const seriesSmall = (x: number): number => { const x3 = x * x * x; return x3 / 3 - x3 * x / 8 + x3 * x * x / 60 - x3 * x3 * x / 5040 + x3 * x3 * x3 / 272160; };
function logQ(x: number): number {
  let sum = 0;
  for (let n = 1; n <= 5; n++) sum += Math.exp(-(n - 1) * x) * (x * x * x / n + 3 * x * x / (n * n) + 6 * x / (n * n * n) + 6 / (n * n * n * n));
  return -x * LOG10E + Math.log10(sum);
}
/** log10 (Q(x0) - Q(x1)) for x0 < x1, taken series-to-series so nothing cancels. */
function logBand(x0: number, x1: number): number {
  if (x1 < 2) return Math.log10(Math.max(seriesSmall(x1) - seriesSmall(x0), 1e-300));
  if (x0 < 2) return Math.log10(Math.max(6.4939394 - seriesSmall(x0) - Math.pow(10, logQ(x1)), 1e-300));
  const q0 = logQ(x0), q1 = logQ(x1);
  return q0 + Math.log10(Math.max(1 - Math.pow(10, q1 - q0), 1e-6));
}

/** log10 of a blackbody's intensity at temperature T in the band, in the shaders' units. */
export function logBandIntensity(temperature: number, band: Band): number {
  const logT = Math.log10(temperature), t = Math.min(1, Math.max(-1, (logT - 3) / 6.5 * 2 - 1));
  if (band === 0) {
    const x = HC_K / (555e-9 * temperature);
    const logB = 15.354480 - (x > 15 ? x * LOG10E : Math.log10(Math.max(Math.expm1(x), 1e-300)));
    return logB - 6.970942 + chebyshev(0, t);
  }
  const lam = BAND_EDGES[band], a = HC_K / temperature;
  const s0 = logBand(a / lam[1], a / lam[0]), s1 = logBand(a / lam[2], a / lam[1]), s2 = logBand(a / lam[3], a / lam[2]);
  const top = Math.max(s0, s1, s2);
  return -8.555613 + 4 * logT + top + Math.log10(Math.pow(10, s0 - top) + Math.pow(10, s1 - top) + Math.pow(10, s2 - top));
}
