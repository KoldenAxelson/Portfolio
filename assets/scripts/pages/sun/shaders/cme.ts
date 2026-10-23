/* WGSL for CMEs, their shocks and the pointer's surface disturbances (the original frag.glsl cmeOne, cmeColumn,
 * shockColumn, vFast, disturbAt). The uniform is written by cmes.ts (writeUniform); keep the two in step.
 *
 * The host shader must provide hash12, wav3 and ss (shaders/noise.ts) and
 *   fn cmeOpenAt(d: vec3f) -> f32   the open-field fraction at a star-frame direction (star.ts: coronaTex .r),
 * which the sheath uses (swept-up plasma is heavier over closed field, i.e. streamers).
 * Each CME's 13-point axis and its across-frame t2 come precomputed (the original rebuilt them for every sample of
 * every pixel); cmeOne only finds the closest axis segment. */

import { CME_AXIS_POINTS, MAX_CMES, MAX_DISTURBANCES } from '../cmes';

/** Electron density normalised to 1 at the base: Baumbach's inner terms, and an r^-2 outflow tail matched to his
 *  r^-1.5 term at 2.5 R. Baumbach's tail held ~1000 cm^-3 at 1 AU, ~100x the solar wind's (Leblanc et al. 1998), and
 *  swamped CMEs against the wide coronagraph's background. */
export const CORONAL_DENSITY_WGSL = /* wgsl */ `
const DENSITY_TAIL = 0.0569;   // 0.036 sqrt(2.5)
fn baumbachN(rr: f32) -> f32 { return (1.55 * pow(rr, -6.0) + 2.99 * pow(rr, -16.0) + DENSITY_TAIL / (rr * rr)) / 4.58; }
// Thomson scattering of the limb-darkened photosphere by one electron at radius r whose radius vector makes angle chi
// with the line of sight (van de Hulst 1950; Billings 1966): 2((1-u)C + uD) - sin^2 chi ((1-u)A + uB), with the sun's
// angular radius Omega seen from r folded into A-D; u = 0.6 in the visible.
const THOMSON_LIMB_U = 0.6;
fn thomsonBrightness(r: f32, sin2Chi: f32) -> f32 {
  let so = min(1.0 / max(r, 1.0), 0.9999); let s2 = so * so; let co = sqrt(1.0 - s2);
  let lg = log((1.0 + so) / co); let k = co * co / so;
  let a = co * s2;
  let b = -0.125 * (1.0 - 3.0 * s2 - k * (1.0 + 3.0 * s2) * lg);
  let c = 4.0 / 3.0 - co - co * co * co / 3.0;
  let d = 0.125 * (5.0 + s2 - k * (5.0 - s2) * lg);
  let u = THOMSON_LIMB_U;
  return 2.0 * ((1.0 - u) * c + u * d) - sin2Chi * ((1.0 - u) * a + u * b);
}
// relative to an electron in the plane of the sky at the same impact parameter rho (1 there, falling along the line
// of sight with the dilution and the scattering angle)
fn thomsonWeight(r: f32, rho: f32) -> f32 {
  let sinChi = clamp(rho / max(r, 1e-4), 0.0, 1.0);
  return thomsonBrightness(r, sinChi * sinChi) / max(thomsonBrightness(max(rho, 1.0), 1.0), 1e-6);
}
`;

/** The uniform declaration and the functions, bound at `@group(group) @binding(binding)`. */
export function cmeWgsl(group: number, binding: number): string {
  return /* wgsl */ `
struct Cme {
  a: vec4f,       // direction (star frame), front height R
  b: vec4f,       // legs' half-angle alpha, tube ratio kappa, density amplitude, active
  c: vec4f,       // tilt, asymmetry, age (anim units), finger growth
  h1: vec4f,      // cross-section harmonic amplitudes 1..4
  h2: vec4f,      // their phases
  h3: vec4f,      // along-axis harmonics (b1, q1, b2, q2)
  shock: vec4f,   // shell centre along a.xyz (R), outer radius, thickness, speed over the wind (km/s); w = 0: none
  t2: vec4f,      // across the leg plane (xyz), angular cull limit (w)
  bound: vec4f,   // bounding-sphere centre (xyz) and radius (w)
  axis: array<vec4f, ${CME_AXIS_POINTS}>,   // axis polyline (xyz), its parameter u in [-1, 1] (w)
}
struct CmeUniform {
  head: vec4f,                                   // active count, reach of the CME column (R)
  dist: array<vec4f, ${MAX_DISTURBANCES}>,       // impact direction (star frame), age (anim units)
  distE: array<vec4f, ${MAX_DISTURBANCES}>,      // energy (0 = empty slot), ring speed (rad per anim unit)
  cme: array<Cme, ${MAX_CMES}>,
}
@group(${group}) @binding(${binding}) var<uniform> CM: CmeUniform;

${CORONAL_DENSITY_WGSL}// fast-mode speed (km/s): sound ~180 km/s and an Alfven speed peaking near 3.8 R; same law as cmes.ts fastModeKms
fn vFast(r: f32) -> f32 {
  let sm = ss(1.0, 3.8, r);
  let vA = 800.0 * pow(3.8 / max(r, 3.8), 0.8) * sm + 300.0 * (1.0 - sm);
  return sqrt(180.0 * 180.0 + vA * vA);
}
fn cmeSquare(x: f32) -> f32 { return x * x; }

// Density of CME i at star-frame point ps (rr = |ps|): a graduated-cylindrical-shell flux rope (Thernisien 2006) with a
// Fourier cross-section, a dense off-centre core, a cavity, internal strands, Rayleigh-Taylor fingers on its front and
// a swept-up sheath ahead, heavier in streamers. Nothing is axisymmetric.
fn cmeOne(ps: vec3f, rr: f32, i: u32) -> f32 {
  let ax = CM.cme[i].a.xyz;
  let lim = CM.cme[i].t2.w;
  let dirn = ps / rr;
  let angTot = acos(clamp(dot(dirn, ax), -1.0, 1.0));
  if (angTot > lim + 0.6) { return 0.0; }
  let taper = ss(lim + 0.6, lim, angTot);   // a soft margin: the sheath and fingers reach past the cone
  let cb = CM.cme[i].b; let cc = CM.cme[i].c; let H1 = CM.cme[i].h1; let H2 = CM.cme[i].h2; let H3 = CM.cme[i].h3;
  let t2 = CM.cme[i].t2.xyz;
  let kappa = cb.y; let asym = cc.y; let age = cc.z; let fing = cc.w;
  var best = 1e9; var ub = 0.0; var axb = ps;
  for (var k = 1; k < ${CME_AXIS_POINTS}; k++) {
    let p0 = CM.cme[i].axis[k - 1]; let p1 = CM.cme[i].axis[k];
    let ab = p1.xyz - p0.xyz;
    let tt = clamp(dot(ps - p0.xyz, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
    let q = p0.xyz + ab * tt; let dd = distance(ps, q);
    if (dd < best) { best = dd; ub = mix(p0.w, p1.w, tt); axb = q; }
  }
  let ha = max(length(axb) - 1.0, 0.0);
  let aub = abs(ub);
  let rho = kappa * (0.08 + ha) * (1.0 - 0.55 * aub * aub * aub);   // fat apex, thin legs
  let rel = ps - axb; let rl = max(length(rel), 1e-4); let rn = rel / rl;
  let up = normalize(axb);
  let phiT = atan2(dot(rn, t2), dot(rn, up));
  let outward = max(dot(rn, up), 0.0);
  let crossSection = 1.0 + H1.x * cos(phiT + H2.x + 0.05 * age) + H1.y * cos(2.0 * phiT + H2.y + 0.04 * age)
                   + H1.z * cos(3.0 * phiT + H2.z + 0.03 * age) + H1.w * cos(4.0 * phiT + H2.w + 0.02 * age);
  let along = 1.0 + H3.x * cos(3.14159 * ub + H3.y + 0.04 * age) + H3.z * cos(6.28318 * ub + H3.w + 0.03 * age);
  let fingers = fing * outward * (0.16 * cos(7.0 * phiT + H2.x * 3.0 + 0.08 * age) + 0.11 * cos(11.0 * phiT + H2.z * 2.0 - 0.06 * age)
              + 0.08 * cos(9.0 * phiT + 5.0 * ub + H2.y));
  let rhoF = rho * max(crossSection * along + fingers, 0.3);
  let shell = exp(-cmeSquare((rl - rhoF) / (0.14 * rho + 0.015)));
  let inner = exp(-cmeSquare(rl / (0.55 * rho))) * exp(-cmeSquare((ub - 0.4 * asym) / 0.55)) * 1.4;   // dense twisted core, off-centre
  let cav = -0.55 * ss(rhoF * 0.95, rhoF * 0.4, rl) * (1.0 - inner) * select(0.0, 1.0, rr >= 1.12);
  let strandN = 0.75 + 0.25 * cos(5.0 * phiT + 3.0 * ub + H2.w * 4.0 + 0.1 * age) + 0.18 * cos(8.0 * phiT - 2.0 * ub + H2.x * 6.0 - 0.07 * age)
              + 0.12 * cos(13.0 * phiT + H2.y * 9.0 + 0.05 * age);
  let closedF = 1.0 - cmeOpenAt(dirn);
  let ahead = exp(-cmeSquare((rl - rhoF * 1.12) / (0.16 * rho + 0.02))) * outward * (0.5 + 1.6 * closedF);
  let legW = ss(1.0, 0.85, aub);   // legs fade where they root
  return taper * cb.z * ((shell * strandN + 0.9 * inner + 0.7 * ahead) * legW + cav);
}

// The CME column along one ray A + B s, s in [z0, z1], over the stretch inside each CME's bounding sphere: 40 samples,
// offset per pixel and sample (fc: the fragment's pixel). Returns (int n ds Thomson-weighted, int (n^2 + 2 n0 n) ds).
// cool > 0 (EUV): no Thomson weight, and the plasma fades out of the band as exp(-age / cool).
fn cmeColumn(A: vec3f, B: vec3f, z0: f32, z1: f32, cool: f32, fc: vec2f) -> vec2f {
  var acc = vec2f(0.0);
  for (var i = 0u; i < ${MAX_CMES}u; i++) {
    if (CM.cme[i].b.w < 0.5) { continue; }
    let bound = CM.cme[i].bound;
    let oc = A - bound.xyz; let bq = dot(oc, B); let disc = bq * bq - (dot(oc, oc) - bound.w * bound.w);
    if (disc <= 0.0) { continue; }
    let sq0 = sqrt(disc); let za = max(-bq - sq0, z0); let zb = min(-bq + sq0, z1);
    if (zb <= za) { continue; }
    let dz = (zb - za) / 40.0;
    let fade = select(1.0, exp(-CM.cme[i].c.z / cool), cool > 0.0);
    for (var k = 0; k < 40; k++) {
      let jitter = hash12(floor(fc) + vec2f(f32(k) * 1031.0 + f32(i) * 211.0, f32(k) * 2713.0));
      let P = A + B * (za + (f32(k) + jitter) * dz); let rr = length(P);
      if (rr < 1.0) { continue; }
      let nc = max(cmeOne(P, rr, i), 0.0) * 0.3 * fade;
      // Thomson scattering (thomsonWeight): an electron off the plane of the sky scatters less of the
      // of the sky's share, which is why halo CMEs are faint; EUV is emission, unweighted
      let zq = dot(P, B);
      let wT = select(thomsonWeight(rr, sqrt(max(rr * rr - zq * zq, 0.0))), 1.0, cool > 0.0);
      acc += vec2f(nc * wT, nc * nc + 2.0 * baumbachN(rr) * nc) * dz;
    }
  }
  return acc;
}

// White-light column of the CME-driven shocks along A + B s (Baumbach units, Thomson-weighted): a thin shell of ambient
// corona compressed by X = 4 M^2 / (M^2 + 3) (Rankine-Hugoniot, gamma 5/3) where the flow normal to it is supersonic.
fn shockColumn(A: vec3f, B: vec3f) -> f32 {
  var acc = 0.0;
  for (var i = 0u; i < ${MAX_CMES}u; i++) {
    let S = CM.cme[i].shock;
    if (CM.cme[i].b.w < 0.5 || S.w <= 0.0) { continue; }
    let dir = CM.cme[i].a.xyz; let ce = dir * S.x; let Rb = S.y; let w = S.z;
    let oc = A - ce; let zc = -dot(oc, B); let q = length(oc + B * zc);
    if (q >= Rb) { continue; }
    let a = Rb - w;
    let chord = 2.0 * (sqrt(Rb * Rb - q * q) - sqrt(max(a * a - q * q, 0.0)));
    let Rm = Rb - 0.5 * w; let hz = sqrt(max(Rm * Rm - q * q, 0.0));
    for (var s = 0; s < 2; s++) {
      let P = A + B * (zc + select(hz, -hz, s == 0)); let rr = length(P);
      if (rr < 1.0) { continue; }
      let M = S.w * max(dot(normalize(P - ce), dir), 0.0) / vFast(rr);
      if (M <= 1.0) { continue; }
      let X = 4.0 * M * M / (M * M + 3.0);
      let zq = dot(P, B);
      acc += (X - 1.0) * baumbachN(rr) * 0.5 * chord * thomsonWeight(rr, sqrt(max(rr * rr - zq * zq, 0.0)));
    }
  }
  return acc;
}

// Pointer impacts at star-frame surface direction sf: (flash, EUV wave), each capped at 0.5 (a wave is a 10-30 %
// brightening, a flash a bright kernel, never a saturated disc).
fn disturbAt(sf: vec3f) -> vec2f {
  var fl = 0.0; var wv = 0.0;
  for (var i = 0; i < ${MAX_DISTURBANCES}; i++) {
    let D = CM.dist[i]; let E = CM.distE[i];
    let age = D.w;
    if (E.x <= 0.0 || age < 0.0 || age > 2.5) { continue; }
    let ang = acos(clamp(dot(sf, D.xyz), -1.0, 1.0));
    fl += E.x * 0.35 * exp(-cmeSquare(ang / 0.03)) * (1.0 - exp(-age / 0.08)) * exp(-age / 0.6);
    wv += E.x * 0.2 * exp(-cmeSquare((ang - E.y * age) / (0.05 + 0.25 * age))) * exp(-age / 0.5) * (0.6 + 0.4 * wav3(sf * 40.0 + vec3f(age * 8.0)));
  }
  return vec2f(min(fl, 0.5), min(wv, 0.5));
}
`;
}
