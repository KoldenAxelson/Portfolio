/* The nine instrument views: five SDO/AIA EUV channels, two SDO/HMI products and two LASCO-style
 * coronagraph fields. Fitted constants are the original's (its EUVS and AMB tables): the shared fit serves
 * 171, 193 and 211 (and the white-light views, which read only the parts that apply), 131 and 304 have their own. */

export type ViewKind = 'euv' | 'he304' | 'continuum' | 'magnetogram' | 'coronagraph';

export interface EuvFit {
  /** Unresolved disc level, network contrast exponent, diffuse corona level, transition-region rim level. */
  readonly disc: readonly [number, number, number, number];
  /** EUV scale height H (R, at r = 1; H grows as r), network, lane and granule weights. */
  readonly disc2: readonly [number, number, number, number];
  /** Spicule absorption of the far side for grazing rays. */
  readonly limbAbs: number;
  /** Thickness of the emitting shell (R). */
  readonly shellH: number;
  /** EUV string brightness gain and the density factor of open strings (the original's per-channel k and q). */
  readonly stringK: number;
  readonly stringQ: number;
}

export interface View {
  readonly key: string;
  readonly label: string;
  /** Index the shaders branch on (the original's u_filter). */
  readonly index: number;
  readonly kind: ViewKind;
  /** The view picker's accent colour, and for EUV the channel's display tint. */
  readonly chip: string;
  readonly tint: readonly [number, number, number];
  readonly fit: EuvFit;
  /** Coronagraph only: occulter radius (R), and whether the field is the wide one. */
  readonly occulter?: number;
  readonly wide?: boolean;
  readonly note: string;
}

const SHARED_FIT: EuvFit = { disc: [0.2029, 1.3105, 0.3491, 0.6362], disc2: [0.1419, 0.638, 1.4352, 3.789], limbAbs: 1.358, shellH: 0.0111, stringK: 403.8, stringQ: 1.8213 };
const FIT_131: EuvFit = { disc: [0.4202, 2.3829, 0.44, 0.1975], disc2: [0.2148, 0.525, 2.2507, 3.1796], limbAbs: 0.07, shellH: 0.0074, stringK: 453.7, stringQ: 2.0058 };
const FIT_304: EuvFit = { disc: [0.5116, 1.047, 0.6041, 0.25], disc2: [0.0913, 0.1218, 2.2901, 2.953], limbAbs: 1.387, shellH: 0.051, stringK: 11123, stringQ: 1.1629 };

export const VIEWS: readonly View[] = [
  { key: '171', label: 'AIA 171', index: 0, kind: 'euv', chip: '#f2b84b', tint: [1.00, 0.74, 0.22], fit: SHARED_FIT, note: 'Fe IX · ~0.7 MK quiet corona and loops' },
  { key: '193', label: 'AIA 193', index: 1, kind: 'euv', chip: '#e0a36a', tint: [0.95, 0.62, 0.30], fit: SHARED_FIT, note: 'Fe XII · 1.5 MK corona, coronal holes dark' },
  { key: '211', label: 'AIA 211', index: 2, kind: 'euv', chip: '#c9a0f0', tint: [0.72, 0.48, 0.95], fit: SHARED_FIT, note: 'Fe XIV · 2 MK active regions' },
  { key: '304', label: 'AIA 304', index: 3, kind: 'he304', chip: '#ff6a3d', tint: [1.00, 0.30, 0.06], fit: FIT_304, note: 'He II · chromosphere, spicules, filaments' },
  { key: '131', label: 'AIA 131', index: 4, kind: 'euv', chip: '#6fd3e6', tint: [0.30, 0.78, 0.92], fit: FIT_131, note: 'Fe VIII / XXI · flare plasma at 10 MK' },
  { key: 'hmi', label: 'HMI continuum', index: 5, kind: 'continuum', chip: '#ffb347', tint: [1, 1, 1], fit: SHARED_FIT, note: 'white-light photosphere: granulation, spots' },
  { key: 'mag', label: 'HMI magnetogram', index: 6, kind: 'magnetogram', chip: '#cfd2d8', tint: [0.80, 0.80, 0.82], fit: SHARED_FIT, note: 'line-of-sight field: white north, black south' },
  { key: 'c2', label: 'Corona', index: 7, kind: 'coronagraph', chip: '#e8e4da', tint: [1, 1, 1], fit: SHARED_FIT, occulter: 1.25, note: 'white-light K + F corona, 1.25-40 R' },
  { key: 'c3', label: 'Corona · wide', index: 8, kind: 'coronagraph', chip: '#cfcabd', tint: [1, 1, 1], fit: SHARED_FIT, occulter: 3.7, wide: true, note: 'wide field to ~22 R, the wind and CMEs' },
];

/** The white-light corona constants (the original's AMB): streamer-belt base and amplitude, the fraction of
 *  electrons carried on the drawn strings; exposure, F-corona level at 5 R and its slope. */
export const WHITE_LIGHT = { beltBase: 0.1181, beltAmp: 8.0, stringFraction: 0.525, exposure: 1.0533, fAmp: 0.0303, fSlope: 1.0937 } as const;

/** SDO/AIA temperature responses, as sums of Gaussians in log10 T (MK): (amplitude, centre, width). */
export const AIA_RESPONSE: Readonly<Record<number, readonly (readonly [number, number, number])[]>> = {
  0: [[0.9556, -0.068, 0.168], [0.0820, -0.223, 0.401], [0.0047, -0.979, 0.228]],
  1: [[0.9310, 0.168, 0.122], [0.2199, -0.234, 0.491], [0.0229, 1.355, 0.356]],
  2: [[0.9117, 0.266, 0.126], [0.1786, -0.252, 0.565]],
  3: [[0.9329, -1.068, 0.143], [0.2283, -0.803, 0.270], [0.0195, -0.068, 0.406]],
  4: [[1.0129, -0.239, 0.206], [0.2213, 1.074, 0.162], [0.0318, 0.011, 0.481], [0.0045, 1.438, 1.326]],
};

export function aiaResponse(temperatureMK: number, view: number): number {
  const l = Math.log10(Math.max(temperatureMK, 0.01));
  return (AIA_RESPONSE[view] ?? []).reduce((sum, [a, m, s]) => sum + a * Math.exp(-((l - m) / s) * ((l - m) / s)), 0);
}

/** WGSL for the same responses, generated from the table so the two never drift apart. */
export function aiaResponseWgsl(): string {
  const branch = (view: number): string => (AIA_RESPONSE[view] ?? [])
    .map(([a, m, s]) => `${a} * gauss((l - (${m})) / ${s})`).join(' + ') || '0.0';
  // gauss(x) = exp(-x*x), never pow(x, 2): WGSL's pow is undefined for a negative base
  return `fn gauss(x: f32) -> f32 { return exp(-x * x); }
fn resp(T: f32, view: u32) -> f32 {
  let l = log2(max(T, 0.01)) * 0.30103;
  switch (view) {
${[0, 1, 2, 3, 4].map((v) => `    case ${v}u: { return ${branch(v)}; }`).join('\n')}
    default: { return 0.0; }
  }
}`;
}

/** The camera exposure for an EUV channel: brighter, hotter coronae are stopped down so each channel's
 *  quiet corona sits at the same display level. White-light views use 1. */
export function euvExposure(view: View, activity: number, tcor: readonly [number, number, number]): number {
  if (view.index > 4) return 1;
  return 1 / (Math.pow(Math.max(activity, 1), 0.5) * (1 + 0.8 * activity * aiaResponse(tcor[2], view.index) + 0.4 * activity * aiaResponse(tcor[1], view.index)));
}

export function viewByKey(key: string): View | undefined {
  return VIEWS.find((v) => v.key === key.toLowerCase());
}
