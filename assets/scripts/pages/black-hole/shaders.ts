/* WGSL for the black-hole renderer (sim.ts builds the pipelines). Five programs:
 *   field  — compute, every frame: the gas Sigma(phi, log r); on band change: the blackbody table.
 *   trace  — compute, only when the view changes: each pixel's bent ray, reduced to what a frame needs.
 *   shade  — render, every frame: re-light the traced crossings with this frame's gas, draw the drifting sky, tone-map.
 *   meter  — compute, every few frames: auto exposure on the GPU (no readback).
 *   post   — render: bloom from shade's linear glow, at quarter and eighth resolution; composite.
 * The Params struct is written by sim.ts (writeParams); keep the two layouts in step. */

import { BB_CHEBYSHEV, BAND_EDGES } from './blackbody';

/** Lifetime of one spiral arm in M; sim.ts ages the arms on this clock. */
export const ARM_LIFE_M = 240;
/** Gas texture rows (log r); rows 252-253 hold the blackbody table. */
export const GAS_ROWS = 252;

const params = /* wgsl */ `
struct Params {
  res: vec2f, center: vec2f,
  pxPerM: f32, inc: f32, spin: f32, risco: f32,
  rout: f32, hr: f32, t0: f32, slope: f32,
  beam: f32, band: f32, spinLens: f32, expo: f32,
  skyZoom: f32, bloom: f32, gasL0: f32, gasL1: f32,
  skyDrift: vec2f, skyParallax: vec2f,
}
@group(0) @binding(0) var<uniform> P: Params;
const PI = 3.14159265; const TAU = 6.2831853; const SHADOW_SCHW = 5.1961524;
fn sstep(a: f32, b: f32, x: f32) -> f32 { let t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
fn kappa(rc: f32) -> f32 { return 14.0 * pow(P.risco / rc, 1.5); }   // vertical optical depth per unit Sigma: 14 at the ISCO
fn tempAt(rc: f32, sig: f32) -> f32 { return P.t0 * pow(rc, -P.slope) * pow(P.risco, P.slope - 0.75) * pow(max(1.0 - sqrt(P.risco / rc), 0.0), 0.25) * pow(sig, 0.25); }
fn hash12(p: vec2f) -> f32 { var p3 = fract(vec3f(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
fn wav3(p0: vec3f) -> f32 {   // quasi-periodic sine sum: a seam-free stand-in for 3D noise
  let p = p0 + 0.9 * sin(p0.zxy * 0.47 + vec3f(1.3, 2.1, 0.7));
  let a = sin(dot(p, vec3f(0.913, 0.271, 0.305))) + sin(dot(p, vec3f(-0.402, 0.871, 0.282)) + 1.7) + sin(dot(p, vec3f(0.188, -0.517, 0.835)) + 4.1) + sin(dot(p, vec3f(-0.731, -0.373, -0.571)) + 2.3);
  let q = p * 2.137 + vec3f(3.1, 1.3, 5.7);
  let b = sin(dot(q, vec3f(0.613, 0.711, -0.345))) + sin(dot(q, vec3f(-0.866, 0.121, 0.485)) + 0.9) + sin(dot(q, vec3f(0.231, -0.902, -0.364)) + 2.6) + sin(dot(q, vec3f(0.104, 0.338, 0.935)) + 5.2);
  return 0.5 + (a * 0.6 + b * 0.4) * 0.125;
}
`;

const f = (v: number): string => v.toPrecision(10);

// The sky, drawn by shade each frame at the point traced for each pixel.
const skyLib = /* wgsl */ `
fn hash22(p: vec2f) -> vec2f { var p3 = fract(vec3f(p.xyx) * vec3f(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
fn vnoise(p: vec2f) -> f32 { let i = floor(p); var g = fract(p); g = g * g * (3.0 - 2.0 * g);
  return mix(mix(hash12(i), hash12(i + vec2f(1.0, 0.0)), g.x), mix(hash12(i + vec2f(0.0, 1.0)), hash12(i + vec2f(1.0, 1.0)), g.x), g.y); }
fn starLayer(uv: vec2f, density: f32, seed: f32, brightness: f32) -> vec3f {
  let g = uv * density; let cell = floor(g); var col = vec3f(0.0);
  for (var y = -1; y <= 1; y++) { for (var x = -1; x <= 1; x++) {
    let c = cell + vec2f(f32(x), f32(y));
    if (hash12(c * 1.7 + seed + 9.1) < 0.84) { continue; }
    let d = length(g - (c + 0.15 + hash22(c + seed) * 0.7)) / density;
    let mag = pow(hash12(c + seed + 3.3), 3.0);
    let warm = step(0.82, hash12(c + seed + 7.7));
    col += mix(vec3f(0.90, 0.93, 1.0), vec3f(0.95, 0.72, 0.30), warm) * exp(-pow(d / max(0.0007 + mag * 0.0022, 0.0035), 2.0) * 2.0) * (0.22 + mag) * brightness;
  } }
  return col;
}
// Starfield, a faint Milky Way band with a dust lane, dense faint stars along it. par shifts the layers by
// depth (the original's parallax: near stars 0.35, far 0.7, the band 0.5).
fn sky(uv: vec2f, par: vec2f) -> vec3f {
  var c = starLayer(uv + par * 0.35, 30.0, 1.0, 0.70) + starLayer(uv + par * 0.70, 70.0, 2.0, 0.40);
  c += vec3f(0.08, 0.09, 0.13) * vnoise(uv * 3.0 + par + vec2f(1.7, 0.3)) * vnoise(uv * 7.0 - par * 0.5) * 0.25;
  let bu = uv + par * 0.5;
  let across = dot(bu, vec2f(-0.42, 0.91)) - 0.05; let along = dot(bu, vec2f(0.91, 0.42));
  let band = exp(-across * across / 0.045);
  let mott = wav3(vec3f(bu * 7.0, 1.3)) * 0.6 + wav3(vec3f(bu * 19.0, 4.1)) * 0.4;
  c += vec3f(0.55, 0.50, 0.46) * band * (0.035 + 0.09 * mott) * (1.0 - sstep(0.02, 0.0, abs(across + 0.03 * sin(along * 5.0))) * 0.75);
  return c + starLayer(bu, 150.0, 7.0, 0.12 + 0.45 * band);
}

`;

// ---- field ------------------------------------------------------------------------------------------------
export const fieldShader = params + /* wgsl */ `
@group(0) @binding(1) var field: texture_storage_2d<rgba16float, write>;
const ARM_LIFE = ${ARM_LIFE_M.toFixed(1)};
const ARM_AMP = 1.2; const ARM_PITCH = -1.8; const ARM_WIDTH = 0.35;
// Six trailing arms, each born as a log spiral at a staggered time, wound up by the shear at the rate Omega(r)
// sets, faded on a sin^2 envelope before it winds too tight; two weak m = 2, 3 spirals underneath.
// The clock comes in reduced form from sim.ts (gasClock): each row's orbital phase Omega(r) t mod 2 pi and each
// arm's cycle and age, worked out in double precision. The original kept t itself in f32, which grows without
// bound, so after an hour the inner disk's phase was quantised and the gas started to judder.
@group(0) @binding(2) var<storage, read> gasClock: array<f32>;   // [0, 252): row phase; then (cycle, age) x 6
fn spiralSigma(row: u32, rc: f32, phi: f32) -> f32 {
  let om = 1.0 / (pow(rc, 1.5) + P.spin); let psi = phi - gasClock[row]; var sig = 1.0;
  for (var i = 0u; i < 6u; i++) {
    let fi = f32(i); let cyc = gasClock[252u + 2u * i]; let age = gasClock[253u + 2u * i];
    var env = sin(PI * age / ARM_LIFE); env *= env;
    let pitch = ARM_PITCH * (0.8 + 0.4 * fract(fi * 0.618 + cyc * 0.37));
    let ph0 = fi * 2.3999 + 1.7 * cyc + 4.1 * fract(cyc * 0.713);
    var d = phi - om * age - ph0 - pitch * log(rc); d -= TAU * floor(d / TAU + 0.5);
    let x = clamp(abs(d) / (2.5 * ARM_WIDTH * (0.7 + 0.6 * fract(fi * 0.317))), 0.0, 1.0);
    let clump = 0.6 + 0.4 * sin(13.0 * psi + 2.1 * fi + 1.3 * cyc) * sin(7.0 * psi + 2.3 * log(rc) + 0.7 * fi);
    sig += ARM_AMP * env * clump * (0.6 + 0.4 * fract(fi * 0.531 + cyc * 0.29)) * (0.5 + 0.5 * cos(PI * x));
  }
  sig += 0.12 * sin(2.0 * (psi - 0.5 * ARM_PITCH * log(rc)) + 1.0) + 0.08 * sin(3.0 * (psi - 0.8 * ARM_PITCH * log(rc)) + 2.0);
  return max(sig, 0.05);
}
@compute @workgroup_size(8, 4) fn gas(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= 512u || id.y >= 252u) { return; }
  let lr = P.gasL0 + (f32(id.y) + 0.5) / 252.0 * (P.gasL1 - P.gasL0);
  textureStore(field, vec2i(id.xy), vec4f(spiralSigma(id.y, exp(lr), ((f32(id.x) + 0.5) / 512.0 - 0.5) * TAU), 0.0, 0.0, 1.0));
}

var<private> BBC: array<f32, 42> = array<f32, 42>(${BB_CHEBYSHEV.map(f).join(', ')});
fn cheb(sel: i32, t: f32) -> f32 { var b0 = 0.0; var b1 = 0.0;
  for (var k = 13; k >= 1; k--) { let v = 2.0 * t * b0 - b1 + BBC[sel * 14 + k]; b1 = b0; b0 = v; }
  return t * b0 - b1 + BBC[sel * 14]; }
fn seriesSmall(x: f32) -> f32 { let x3 = x * x * x; return x3 / 3.0 - x3 * x / 8.0 + x3 * x * x / 60.0 - x3 * x3 * x / 5040.0 + x3 * x3 * x3 / 272160.0; }
fn logQ(x: f32) -> f32 { var s = 0.0;
  for (var n = 1; n <= 5; n++) { let fn_ = f32(n); s += exp(-(fn_ - 1.0) * x) * (x * x * x / fn_ + 3.0 * x * x / (fn_ * fn_) + 6.0 * x / (fn_ * fn_ * fn_) + 6.0 / (fn_ * fn_ * fn_ * fn_)); }
  return -x * 0.4342945 + log(s) * 0.4342945; }
fn logBand(x0: f32, x1: f32) -> f32 {   // log10 (Q(x0) - Q(x1)), x0 < x1, series-to-series so nothing cancels
  if (x1 < 2.0) { return log(max(seriesSmall(x1) - seriesSmall(x0), 1e-30)) * 0.4342945; }
  if (x0 < 2.0) { return log(max(6.4939394 - seriesSmall(x0) - pow(10.0, logQ(x1)), 1e-30)) * 0.4342945; }
  let q0 = logQ(x0); let q1 = logQ(x1); return q0 + log(max(1.0 - pow(10.0, q1 - q0), 1e-6)) * 0.4342945; }
// The observatories' false-colour ramp for UV and X-ray: red where the soft sub-band dominates, to blue-white hard.
fn hardnessRamp(h: f32) -> vec3f {
  let k = min(floor(h), 4.0); let t = h - k;
  var c = array<vec3f, 6>(vec3f(0.55, 0.05, 0.0), vec3f(1.0, 0.45, 0.05), vec3f(0.9, 0.85, 0.3), vec3f(0.3, 0.9, 0.7), vec3f(0.3, 0.6, 1.0), vec3f(0.85, 0.9, 1.0));
  return mix(c[i32(k)], c[i32(k) + 1], t); }
@compute @workgroup_size(64) fn tables(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= 512u) { return; }
  let x = (f32(id.x) + 0.5) / 512.0; let lt = 3.0 + 6.5 * x; let T = pow(10.0, lt); let t = x * 2.0 - 1.0;
  var chroma: vec3f; var logY: f32;
  if (P.band < 0.5) {
    let xx = 1.438432e-2 / (555e-9 * T);
    logY = 15.354480 - select(log(max(exp(xx) - 1.0, 1e-30)), xx, xx > 15.0) * 0.4342945 - 6.970942 + cheb(0, t);
    let cx = cheb(1, t); let cy = max(cheb(2, t), 0.02); let X = cx / cy; let Z = (1.0 - cx - cy) / cy;
    let rgb = max(vec3f(3.2406 * X - 1.5372 - 0.4986 * Z, -0.9689 * X + 1.8758 + 0.0415 * Z, 0.0557 * X - 0.2040 + 1.0570 * Z), vec3f(0.0));
    chroma = rgb / max(max(rgb.r, rgb.g), max(rgb.b, 1e-6));
  } else {
    let lam = select(vec4f(${BAND_EDGES[2].map(f).join(', ')}), vec4f(${BAND_EDGES[1].map(f).join(', ')}), P.band < 1.5);
    let a = 1.438432e-2 / T;
    let s0 = logBand(a / lam.y, a / lam.x); let s1 = logBand(a / lam.z, a / lam.y); let s2 = logBand(a / lam.w, a / lam.z);
    let sm = max(s0, max(s1, s2)); let e0 = pow(10.0, s0 - sm); let tot = e0 + pow(10.0, s1 - sm) + pow(10.0, s2 - sm);
    logY = -8.555613 + 4.0 * lt + sm + log(tot) * 0.4342945;
    chroma = hardnessRamp(clamp((e0 / tot) / 0.6, 0.0, 1.0) * 5.0);
  }
  textureStore(field, vec2i(i32(id.x), 252), vec4f(chroma, 1.0));
  textureStore(field, vec2i(i32(id.x), 253), vec4f(logY, 0.0, 0.0, 1.0));
}
`;

// ---- trace -----------------------------------------------------------------------------------------------
export const traceShader = params + /* wgsl */ `
@group(0) @binding(1) var geo1: texture_storage_2d<rgba32float, write>;
@group(0) @binding(2) var geo2: texture_storage_2d<rgba32float, write>;
@group(0) @binding(3) var ring: texture_storage_2d<rgba32float, write>;
@group(0) @binding(4) var skyOut: texture_storage_2d<rgba32float, write>;
// The exact Schwarzschild photon orbit, closed form: u(phi) = u1 + (u2 - u1) sn^2(s phi + c, k); K by AGM,
// F by Carlson's R_F, sn by its nome series (four sines).
fn agmK(k: f32) -> f32 { var a = 1.0; var g = sqrt(max(1.0 - k * k, 1e-12)); for (var i = 0; i < 6; i++) { let an = 0.5 * (a + g); g = sqrt(a * g); a = an; } return 1.5707963 / a; }
fn carlsonRF(x0: f32, y0: f32, z0: f32) -> f32 { var x = x0; var y = y0; var z = z0;
  for (var i = 0; i < 6; i++) { let l = sqrt(x * y) + sqrt(y * z) + sqrt(z * x); x = 0.25 * (x + l); y = 0.25 * (y + l); z = 0.25 * (z + l); }
  let mu = (x + y + z) / 3.0; let X = 1.0 - x / mu; let Y = 1.0 - y / mu; let Z = 1.0 - z / mu; let E2 = X * Y - Z * Z; let E3 = X * Y * Z;
  return (1.0 - E2 / 10.0 + E3 / 14.0 + E2 * E2 / 24.0 - 3.0 * E2 * E3 / 44.0) * inverseSqrt(mu); }
struct Orbit { u1: f32, u2: f32, s: f32, c: f32, K: f32, zExit: f32, alpha: f32, cq: vec4f }
fn orbitOf(b: f32) -> Orbit { var o: Orbit;
  let qc = 1.0 / (2.0 * b * b) - 1.0 / 108.0; let th = acos(clamp(-108.0 * qc, -1.0, 1.0)) / 3.0;
  let t1 = cos(th - 2.0943951) / 3.0; let t2 = cos(th - 4.1887902) / 3.0; let u3 = cos(th) / 3.0 + 1.0 / 6.0;
  o.u1 = min(t1, t2) + 1.0 / 6.0; o.u2 = max(t1, t2) + 1.0 / 6.0;
  let k2 = (o.u2 - o.u1) / (u3 - o.u1); let k = sqrt(k2); let kp = sqrt(max(1.0 - k2, 1e-12));
  o.K = agmK(k); let q = exp(-PI * agmK(kp) / o.K);
  o.s = sqrt((u3 - o.u1) * 0.5);
  let sp = sqrt(clamp(-o.u1 / (o.u2 - o.u1), 0.0, 1.0)); let cp = sqrt(1.0 - sp * sp);
  o.c = sp * carlsonRF(cp * cp, 1.0 - k2 * sp * sp, 1.0);
  o.zExit = 2.0 * o.K - o.c; o.alpha = (2.0 * o.K - 2.0 * o.c) / o.s - PI;
  let q1 = sqrt(q); let q3 = q1 * q; let q5 = q3 * q; let q7 = q5 * q;
  o.cq = vec4f(q1 / (1.0 - q1 * q1), q3 / (1.0 - q3 * q3), q5 / (1.0 - q5 * q5), q7 / (1.0 - q7 * q7)) * (TAU / (k * o.K));
  return o; }
fn orbitU(o: Orbit, ph: f32) -> f32 { let z = o.s * ph + o.c; if (z > o.zExit) { return -1.0; }
  let w = 1.5707963 * z / o.K;
  let sn = o.cq.x * sin(w) + o.cq.y * sin(3.0 * w) + o.cq.z * sin(5.0 * w) + o.cq.w * sin(7.0 * w);
  return o.u1 + (o.u2 - o.u1) * sn * sn; }
fn deflection(b: f32) -> f32 {   // total bend of an escaping ray: 4/b + 15 pi/4b^2 + 128/3b^3 beyond 24 M (0.1 %)
  if (b > 24.0) { return 4.0 / b + 11.780972 / (b * b) + 42.666667 / (b * b * b); }   // the original stopped at b^-2: 1.9 % short at 24 M, a seam in the stars
  return orbitOf(max(b, 5.22)).alpha; }
// The Kerr shadow edge (Bardeen 1973): spherical photon orbits at r between the two equatorial ones project to
// (alpha, beta) = (-xi/sin i, +-sqrt(beta^2)); rho_c(theta) is the distance of the one whose screen angle is theta.
fn bardeenXi(r: f32) -> f32 { let a = P.spin; return -(r * r * r - 3.0 * r * r + a * a * r + a * a) / (a * (r - 1.0)); }
fn bardeenB2(r: f32, si: f32, ci: f32) -> f32 {
  let a = P.spin; let xi = bardeenXi(r);
  let et = -r * r * r * (r * r * r - 6.0 * r * r + 9.0 * r - 4.0 * a * a) / (a * a * (r - 1.0) * (r - 1.0));
  return et + a * a * ci * ci - xi * xi * ci * ci / (si * si); }
fn bardeenAngle(r: f32, si: f32, ci: f32, sgn: f32) -> f32 {
  // keep beta off zero: atan2(-0, x < 0) is +pi on some GPUs instead of -pi, which mirrored half the shadow
  return atan2(sgn * max(sqrt(max(bardeenB2(r, si, ci), 0.0)), 1e-6), -bardeenXi(r) / si); }
fn rhoCrit(theta: f32) -> f32 {
  if (P.spin < 0.02) { return SHADOW_SCHW; }
  let si = max(abs(sin(P.inc)), 0.02); let ci = cos(P.inc); let a = P.spin;
  let r1 = 2.0 * (1.0 + cos(0.6666667 * acos(-a))); let r2 = 2.0 * (1.0 + cos(0.6666667 * acos(a)));
  // beta^2 > 0 only on a window of r that narrows toward face-on (to ~0.1 M at 6 deg). The original bisected
  // from the window's ends and lost it below ~6 deg tilt, returning a shadow that filled the screen. Find the
  // window's peak first (beta^2 is unimodal there), then each edge from it.
  var lo = r1; var hi = r2;
  for (var i = 0; i < 28; i++) {
    let m1 = hi - 0.618034 * (hi - lo); let m2 = lo + 0.618034 * (hi - lo);
    if (bardeenB2(m1, si, ci) < bardeenB2(m2, si, ci)) { lo = m1; } else { hi = m2; }
  }
  let peak = 0.5 * (lo + hi);
  var ra = peak; var out = r1;
  for (var i = 0; i < 24; i++) { let m = 0.5 * (out + ra); if (bardeenB2(m, si, ci) > 0.0) { ra = m; } else { out = m; } }
  var rb = peak; out = r2;
  for (var i = 0; i < 24; i++) { let m = 0.5 * (out + rb); if (bardeenB2(m, si, ci) > 0.0) { rb = m; } else { out = m; } }
  let sgn = select(-1.0, 1.0, sin(theta) >= 0.0);
  var l = ra; var h = rb; var aL = bardeenAngle(l, si, ci, sgn); let aH = bardeenAngle(h, si, ci, sgn);
  // in f32 the curve can stop a hair short of +-pi: a target outside the bracket takes the nearer end
  if ((aL - theta) * (aH - theta) > 0.0) { l = select(h, l, abs(aL - theta) < abs(aH - theta)); h = l; }
  for (var i = 0; i < 24; i++) {
    let m = 0.5 * (l + h); let am = bardeenAngle(m, si, ci, sgn);
    if ((am - theta) * (aL - theta) <= 0.0) { h = m; } else { l = m; aL = am; }
  }
  let r = 0.5 * (l + h);
  return length(vec2f(-bardeenXi(r) / si, sqrt(max(bardeenB2(r, si, ci), 0.0))));
}
fn kerrG(r: f32, lam: f32) -> f32 {   // redshift of a prograde circular emitter at r for a photon of axial angular momentum lam
  let om = 1.0 / (pow(r, 1.5) + P.spin);
  return sqrt(max(1.0 - 3.0 / r + 2.0 * P.spin * pow(r, -1.5), 1e-4)) / (1.0 + P.spin * pow(r, -1.5)) / max(1.0 - om * lam, 0.05); }
fn gaussCDF(x: f32) -> f32 { let z = abs(x) * 0.70710678; let t = 1.0 / (1.0 + 0.3275911 * z);
  let e = 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * exp(-z * z);
  return 0.5 * (1.0 + select(-e, e, x >= 0.0)); }
struct Image { tau: f32, w: f32, wr: f32, wc: f32, ws: f32, wt: f32 }
fn packImage(m: Image) -> vec4f {
  if (m.tau <= 0.0) { return vec4f(0.0); }
  let w = max(m.w, 1e-9);
  return vec4f(m.wr / w, atan2(m.ws, m.wc), m.tau, m.wt / w);
}
// Per pixel and per disk image (the direct one, then the far side lensed over the shadow): optical depth through
// the slab at mean gas, and the opacity-weighted radius, azimuth and temperature factor (Eddington depth times
// the Kerr redshift g^beam), so a frame re-lights each crossing with the real Sigma in two taps.
@compute @workgroup_size(8, 8) fn trace(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= u32(P.res.x) || id.y >= u32(P.res.y)) { return; }
  let px = vec2i(id.xy);
  let q = (vec2f(f32(id.x) + 0.5, P.res.y - f32(id.y) - 0.5) - P.center) / P.pxPerM;   // screen offset in M
  let b = length(q); let qh = q / max(b, 1e-5);
  let n = vec3f(0.0, sin(P.inc), cos(P.inc)); let eh = vec3f(qh, 0.0);
  var phi0 = atan2(-n.z, dot(eh, n)); if (phi0 <= 0.0) { phi0 += PI; }
  let pxM = 1.0 / P.pxPerM;
  // spinLens off: the whole lens is drawn as if the hole did not spin, a round centred shadow (the original's
  // look, minus its stars showing through where its Kerr mask and round disk disagreed)
  let rhoC = select(SHADOW_SCHW, rhoCrit(atan2(q.y, q.x)), P.spinLens > 0.5);
  let cv = 1.0 - sstep(-0.6 * pxM, 0.6 * pxM, b - rhoC);
  // The orbits are Schwarzschild; with spin the shadow is Bardeen's. Rescaling the impact parameter so the
  // orbit's capture radius sits on the Kerr shadow edge keeps the disk images, the sky and the silhouette
  // agreeing (the original captured rays at 3 sqrt 3 whatever the spin, leaving a band between the two edges).
  // The shift fades as exp(-(b - rho_c)/4): d bEff/db = 1 - (3 sqrt 3 - rho_c)/4 exp(..) stays positive because
  // the shift is under 2.4 M for any spin, so the map never folds (a rescale that blended back to 1 did, and
  // painted doubled images as dark lumps along the flattened side).
  // Inside the shadow it scales instead, so a captured ray keeps a positive impact parameter; both meet at the edge.
  let bEff = select(b + (SHADOW_SCHW - rhoC) * exp(-(b - rhoC) / 4.0), b * SHADOW_SCHW / rhoC, b < rhoC);
  let escaping = bEff > 5.2116; let farRay = bEff > 24.0;
  var orb: Orbit; if (escaping && !farRay) { orb = orbitOf(bEff); }
  let alpha = deflection(bEff);
  let xb = vec3f(0.0, -cos(P.inc), sin(P.inc)); let yb = vec3f(1.0, 0.0, 0.0);
  // the photon's axial angular momentum. Negative x is the approaching, prograde side (where the Kerr shadow is
  // flattened); the original had the sign flipped, so its Doppler boost lit the receding side.
  let lamPh = -q.x * sin(P.inc);
  var img: array<Image, 2>;
  var trans = 1.0;
  let inFoot = P.rout > 0.0 && (b < max(14.0, 0.6 * P.rout) || (b < P.rout * 1.15 && abs(q.y) < P.rout * (abs(cos(P.inc)) * 1.25 + 3.0 * P.hr) + 1.0));
  if (inFoot) {
    var rkU = 0.0; var rkW = 1.0 / bEff; var phPrev = 0.0;
    let phE = select(PI + alpha, TAU, !escaping);
    let phS = asin(clamp(bEff / (P.rout * 1.4), 0.0, 1.0)) * 0.7;
    // three coarse segments for the volume, a fine window of 2.2 H / |dz/dphi| around each plane crossing
    let ehn = dot(eh, n); let ph1 = phi0; let ph2 = phi0 + PI;
    let w1 = min(2.2 * P.hr / max(abs(-sin(ph1) * n.z + cos(ph1) * ehn), 0.05), 0.6);
    let w2 = min(2.2 * P.hr / max(abs(-sin(ph2) * n.z + cos(ph2) * ehn), 0.05), 0.6);
    let s0 = phS; let s1 = max(ph1 - w1, phS); let s2 = min(ph1 + w1, phE); let s3 = max(ph2 - w2, s2); let s4 = min(ph2 + w2, phE); let s5 = phE;
    var Pprev = vec3f(0.0); var havePrev = false;
    for (var k = 0; k < 64; k++) {
      var ph: f32;
      if (k < 8) { ph = s0 + (f32(k) + 0.5) / 8.0 * (s1 - s0); }
      else if (k < 28) { ph = s1 + (f32(k - 8) + 0.5) / 20.0 * (s2 - s1); }
      else if (k < 36) { ph = s2 + (f32(k - 28) + 0.5) / 8.0 * (s3 - s2); }
      else if (k < 56) { ph = s3 + (f32(k - 36) + 0.5) / 20.0 * (s4 - s3); }
      else { ph = s4 + (f32(k - 56) + 0.5) / 8.0 * (s5 - s4); }
      if (ph > phE) { break; }
      var uu: f32;
      if (escaping && farRay) { uu = sin(ph) / bEff + pow(1.0 - cos(ph), 2.0) / (bEff * bEff); }
      else if (escaping) { uu = orbitU(orb, ph); }
      else {   // captured: u'' = -u + 3u^2 by RK4, four substeps a sample
        let hh = (ph - phPrev) * 0.25;
        for (var ss = 0; ss < 4; ss++) {
          let k1u = rkW; let k1w = -rkU + 3.0 * rkU * rkU;
          let u2t = rkU + 0.5 * hh * k1u; let k2u = rkW + 0.5 * hh * k1w; let k2w = -u2t + 3.0 * u2t * u2t;
          let u3t = rkU + 0.5 * hh * k2u; let k3u = rkW + 0.5 * hh * k2w; let k3w = -u3t + 3.0 * u3t * u3t;
          let u4t = rkU + hh * k3u; let k4u = rkW + hh * k3w; let k4w = -u4t + 3.0 * u4t * u4t;
          rkU += hh / 6.0 * (k1u + 2.0 * k2u + 2.0 * k3u + k4u); rkW += hh / 6.0 * (k1w + 2.0 * k2w + 2.0 * k3w + k4w);
        }
        phPrev = ph; uu = rkU;
      }
      if (uu >= 0.45) { break; }
      if (uu <= 1e-4) { if (ph > 1.5) { break; } continue; }
      let pos = (1.0 / uu) * (cos(ph) * vec3f(0.0, 0.0, 1.0) + sin(ph) * eh);
      if (!havePrev) { Pprev = pos; havePrev = true; }
      var dV = pos - Pprev; let dl = length(dV); Pprev = pos;
      if (dl < 1e-5) { continue; }
      dV /= dl;
      let z = dot(pos, n); let Pp = pos - z * n; let rc = length(Pp);
      if (rc < P.risco * 0.98 || rc > P.rout) { continue; }
      let H = P.hr * rc;
      if (abs(z) > 2.2 * H) { continue; }
      let sigEdge = sstep(P.risco, P.risco + 0.4, rc) * sstep(P.rout, P.rout * 0.96, rc);
      let dtau = kappa(rc) * sigEdge * exp(-0.5 * z * z / (H * H)) / (H * 2.5066) * sstep(2.2, 1.6, abs(z) / H) * dl;
      if (dtau <= 0.0) { continue; }
      let colAbove = select(1.0 - gaussCDF(z / H), gaussCDF(z / H), dot(dV, n) >= 0.0);
      let a1 = 1.0 - exp(-dtau);
      let w = trans * a1 + 1e-6 * dtau;
      let phd = atan2(dot(Pp, yb), dot(Pp, xb));
      let tf = pow(0.75 * (kappa(rc) * sigEdge * colAbove + 0.6667), 0.25) * pow(kerrG(rc, lamPh), P.beam);
      let i = select(1, 0, k < 36);
      img[i].tau += dtau; img[i].w += w; img[i].wr += w * rc; img[i].wc += w * cos(phd); img[i].ws += w * sin(phd); img[i].wt += w * tf;
      trans *= 1.0 - a1;
    }
  }
  textureStore(geo1, px, packImage(img[0]));
  textureStore(geo2, px, packImage(img[1]));
  // photon ring: orders 2-3 converging on the shadow edge, lit by the disk they image (Gaussian, e^-pi per order)
  var ringOut = vec4f(0.0);
  let dM = b - rhoC;
  if (inFoot && dM > -2.0 * pxM && dM < 1.2) {
    let ph = phi0 + PI;
    for (var kk = 1; kk <= 6; kk++) {
      let u2 = orbitU(orbitOf(SHADOW_SCHW + 0.15 * f32(kk)), ph);   // in bEff space the capture radius is 3 sqrt 3
      if (u2 <= 0.0 || u2 >= 0.4995) { continue; }
      let r2 = 1.0 / u2; if (r2 < P.risco || r2 > P.rout) { continue; }
      let X2 = r2 * (cos(ph) * vec3f(0.0, 0.0, 1.0) + sin(ph) * eh);
      let g2 = kerrG(r2, lamPh);
      let mue = clamp(abs(n.z) * g2, 0.03, 1.0);
      var prof = 0.0;
      for (var nn = 2; nn <= 3; nn++) {
        let wn = 1.5 * exp(-PI * f32(nn - 1)); let sg = max(wn, 0.8 * pxM);
        prof += exp(-pow((dM - wn * 1.2) / sg, 2.0)) * (wn / sg);
      }
      ringOut = vec4f(r2, atan2(dot(X2, yb), dot(X2, xb)), prof * (1.0 + 2.06 * mue) / 3.06 * sstep(P.risco, P.risco + 0.5, r2) * sstep(P.rout, P.rout * 0.96, r2), pow(g2, P.beam));
      break;
    }
  }
  textureStore(ring, px, ringOut);
  // the sky through the lens equation (beta = theta - alpha, source at infinity), masked by the shadow
  // the sky is drawn per frame (it drifts): store where on it this pixel's bent ray lands, and how much shows
  var skyAt = vec4f(0.0);
  if (cv < 0.999) {
    let D = 60.0;
    let ps = atan(b / D) - alpha; let dir = vec3f(qh * sin(ps), -cos(ps));
    let src = vec2f(atan2(dir.x, -dir.z), asin(clamp(dir.y, -1.0, 1.0))) * D * P.pxPerM / P.res.y;
    let vig = 1.0 - 0.45 * sstep(0.35, 1.0, length((vec2f(f32(id.x), P.res.y - f32(id.y)) - 0.5 * P.res) / P.res.y));
    skyAt = vec4f(src * P.skyZoom, vig * (1.0 - cv), 0.0);
  }
  textureStore(skyOut, px, skyAt);
}
`;

// ---- shade -----------------------------------------------------------------------------------------------
export const shadeShader = params + /* wgsl */ `
@group(0) @binding(1) var fieldTex: texture_2d<f32>;
@group(0) @binding(2) var wrapLinear: sampler;
@group(0) @binding(3) var geo1: texture_2d<f32>;
@group(0) @binding(4) var geo2: texture_2d<f32>;
@group(0) @binding(5) var ring: texture_2d<f32>;
@group(0) @binding(6) var skyTex: texture_2d<f32>;
@group(0) @binding(7) var<storage, read> meter: array<f32>;
@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  let p = vec2f(f32((i << 1u) & 2u), f32(i & 2u)) * 2.0 - 1.0; return vec4f(p, 0.0, 1.0); }
${skyLib}
fn field(u: f32, row: f32) -> vec4f { return textureSampleLevel(fieldTex, wrapLinear, vec2f(u, row / 256.0), 0.0); }
fn gasAt(rc: f32, phi: f32) -> f32 { return field(phi / TAU + 0.5, clamp((log(rc) - P.gasL0) / (P.gasL1 - P.gasL0) * 252.0, 0.5, 251.5)).r; }
fn bbBand(T: f32) -> vec3f { let x = clamp((log(T) * 0.4342945 - 3.0) / 6.5, 0.5 / 512.0, 1.0 - 0.5 / 512.0);
  return field(x, 252.5).rgb * pow(10.0, field(x, 253.5).r - P.expo - meter[0]); }
struct Shaded { @location(0) display: vec4f, @location(1) glow: vec4f }
@fragment fn fs(@builtin(position) pos: vec4f) -> Shaded {
  let px = vec2i(pos.xy);
  var col = vec3f(0.0); var trans = 1.0;
  for (var i = 0; i < 2; i++) {
    let g = select(textureLoad(geo2, px, 0), textureLoad(geo1, px, 0), i == 0);
    if (g.z <= 0.0) { continue; }
    let sig = gasAt(g.x, g.y);
    let a = 1.0 - exp(-sig * g.z);
    col += trans * a * bbBand(tempAt(g.x, sig) * g.w);
    trans *= 1.0 - a;
  }
  if (trans >= 0.5) {   // an opaque disk hides the ring and the sky behind it
    let rg = textureLoad(ring, px, 0);
    if (rg.z > 0.0) { col += bbBand(tempAt(rg.x, max(gasAt(rg.x, rg.y), 0.2)) * rg.w) * rg.z * trans; }
    let at = textureLoad(skyTex, px, 0);
    if (at.z > 0.0) { col += sky(at.xy + P.skyDrift, P.skyParallax) * at.z * trans; }
  }
  // filmic shoulder on the brightest channel, not luminance, so a Rayleigh-Jeans blue does not clip first
  let V = max(col.r, max(col.g, col.b)); let Vm = V / (1.0 + V * 0.55); let disp = 1.0 - exp(-1.6 * Vm);
  let cm = mix(col * (disp / max(V, 1e-5)), vec3f(disp), clamp((Vm - 0.9) * 2.0, 0.0, 0.85));
  var out: Shaded;
  out.display = vec4f(pow(clamp(cm, vec3f(0.0), vec3f(1.0)), vec3f(1.0 / 1.1)) + (hash12(pos.xy) - 0.5) * 0.003, 1.0);
  // bloom source: the linear light above the shoulder. The original thresholded the tone-mapped image, which
  // tops out near 0.95, so only bleached white ever bloomed and the presets' bloom settings did little.
  out.glow = vec4f(min(col * sstep(1.2, 5.0, V), vec3f(16.0)), 1.0);
  return out;
}
`;

// ---- meter -----------------------------------------------------------------------------------------------
// The camera meters the image: the highlight-weighted (L^2) log-mean of the lit pixels' brightest channel is
// pulled toward 0.42 of white, at most 0.15 dex a step and within 1.5 dex of the seed. One workgroup over a
// 96 x 54 grid: the original did the same with a readPixels every 20 frames, stalling the GPU each time.
export const meterShader = /* wgsl */ `
@group(0) @binding(0) var scene: texture_2d<f32>;
@group(0) @binding(1) var<storage, read_write> meter: array<f32>;
var<workgroup> wSum: array<f32, 256>;
var<workgroup> lSum: array<f32, 256>;
var<workgroup> lit: array<f32, 256>;
@compute @workgroup_size(256) fn meterStep(@builtin(local_invocation_index) t: u32) {
  let size = vec2f(textureDimensions(scene));
  var w = 0.0; var l = 0.0; var n = 0.0;
  for (var i = t; i < 5184u; i += 256u) {
    let uv = (vec2f(f32(i % 96u), f32(i / 96u)) + 0.5) / vec2f(96.0, 54.0);
    let c = textureLoad(scene, vec2i(uv * size), 0).rgb;
    let L = max(c.r, max(c.g, c.b));
    if (L > 0.08) { w += L * L; l += L * L * log(L) * 0.4342945; n += 1.0; }
  }
  wSum[t] = w; lSum[t] = l; lit[t] = n;
  workgroupBarrier();
  for (var s = 128u; s > 0u; s >>= 1u) {
    if (t < s) { wSum[t] += wSum[t + s]; lSum[t] += lSum[t + s]; lit[t] += lit[t + s]; }
    workgroupBarrier();
  }
  if (t != 0u || lit[0] < 50.0 || wSum[0] <= 0.0) { return; }
  let err = -0.3767507 - lSum[0] / wSum[0];   // log10 0.42 minus the log-mean
  meter[0] = clamp(meter[0] - 0.5 * clamp(err, -0.3, 0.3), -1.5, 1.5);
}
`;

// ---- post ------------------------------------------------------------------------------------------------
export const postShader = /* wgsl */ `
@group(0) @binding(0) var src: texture_2d<f32>;
@group(0) @binding(1) var clampLinear: sampler;
@group(0) @binding(2) var glowA: texture_2d<f32>;
@group(0) @binding(3) var glowB: texture_2d<f32>;
@group(0) @binding(4) var<uniform> strength: vec4f;
struct V { @builtin(position) pos: vec4f, @location(0) uv: vec2f }
@vertex fn vs(@builtin(vertex_index) i: u32) -> V {
  let p = vec2f(f32((i << 1u) & 2u), f32(i & 2u)); var o: V;
  o.pos = vec4f(p * 2.0 - 1.0, 0.0, 1.0); o.uv = vec2f(p.x, 1.0 - p.y); return o; }
fn tap(uv: vec2f) -> vec3f { return textureSampleLevel(src, clampLinear, uv, 0.0).rgb; }
@fragment fn down(v: V) -> @location(0) vec4f { return vec4f(tap(v.uv), 1.0); }
fn blur(uv: vec2f, d: vec2f) -> vec4f {
  var w = array<f32, 5>(0.227, 0.194, 0.121, 0.054, 0.016); var acc = tap(uv) * w[0];
  for (var i = 1; i < 5; i++) { let o = d * f32(i) * 1.5; acc += (tap(uv + o) + tap(uv - o)) * w[i]; }
  return vec4f(acc, 1.0); }
@fragment fn blurH(v: V) -> @location(0) vec4f { return blur(v.uv, vec2f(1.0 / f32(textureDimensions(src).x), 0.0)); }
@fragment fn blurV(v: V) -> @location(0) vec4f { return blur(v.uv, vec2f(0.0, 1.0 / f32(textureDimensions(src).y))); }
@fragment fn composite(v: V) -> @location(0) vec4f {
  let glow = textureSampleLevel(glowA, clampLinear, v.uv, 0.0).rgb + textureSampleLevel(glowB, clampLinear, v.uv, 0.0).rgb;
  return vec4f(tap(v.uv) + glow / (1.0 + glow) * strength.x, 1.0); }
`;
