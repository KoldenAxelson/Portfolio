(function () {
  var canvas = document.getElementById("twDwarfstar");
  if (!canvas || !navigator.gpu) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // One preset of dwarfstar.online/play: "Gargantua-like" (#193/garg), a 1e8 Msun Kerr hole at spin 0.9,
  // thin disk (H/r 0.03) at 86 deg, spiral-arm gas, beaming off. Units are M (GM/c^2).
  //
  // The page re-solves every photon path every frame, because its camera orbits and follows the cursor.
  // This card's camera never moves, so the lens is traced once (trace) into per-pixel textures: where each
  // ray crosses the disk, how much slab it passes through there, and the lensed sky. A frame then only
  // re-renders the gas (gas) and reads it at those crossings (shade): a handful of taps a pixel.
  // The full simulation is for the black-hole misc page (content/misc/black-hole.md). The gas, blackbody and photon
  // orbit WGSL below is copied from assets/scripts/pages/black-hole/shaders.ts with this preset's numbers inlined;
  // keep the two in step when either changes.
  var common = `
const PI = 3.14159265; const TAU = 6.2831853;
const MPER = 11.547005; const INC = 1.5009832; const DM = 60.0; const ROUT = 40.0;
const KEXT = 24.0; const RISCO = 2.3209; const SPIN = 0.9; const T0 = 24576.0; const SLOPE = 0.5; const HR = 0.03;
const GAS_L0 = -0.0317; const GAS_L1 = 3.7377;   // log(RISCO * 0.95), log(ROUT * 1.05)
struct Frame { res: vec2f, center: vec2f, radius: f32, kTime: f32, expo: f32, skyZoom: f32 }
@group(0) @binding(0) var<uniform> F: Frame;
fn sstep(a: f32, b: f32, x: f32) -> f32 { let t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
fn kappa(rc: f32) -> f32 { return 14.0 * pow(RISCO / rc, 1.5); }   // vertical optical depth per unit Sigma: 14 at the ISCO
// the Page & Thorne (1974) zero-torque factor (shaders.ts pageThorneQ, at this preset's spin)
fn pageThorneQ(r: f32) -> f32 {
  let x = sqrt(r); let x0 = sqrt(RISCO); if (x <= x0) { return 0.0; }
  let th = acos(SPIN) / 3.0; let xr = vec3f(2.0 * cos(th - PI / 3.0), 2.0 * cos(th + PI / 3.0), -2.0 * cos(th));
  var br = x - x0 - 1.5 * SPIN * log(x / x0);
  for (var i = 0; i < 3; i++) { let xi = xr[i]; let xj = xr[(i + 1) % 3]; let xk = xr[(i + 2) % 3];
    br -= 3.0 * (xi - SPIN) * (xi - SPIN) / (xi * (xi - xj) * (xi - xk)) * log((x - xi) / (x0 - xi)); }
  return max(0.0, x * x / (x * x * x - 3.0 * x + 2.0 * SPIN) * br);
}
fn tempAt(rc: f32, sig: f32) -> f32 { return T0 * pow(rc, -SLOPE) * pow(RISCO, SLOPE - 0.75) * pow(pageThorneQ(rc), 0.25) * pow(sig, 0.25); }
fn wav3(p0: vec3f) -> f32 {
  let p = p0 + 0.9 * sin(p0.zxy * 0.47 + vec3f(1.3, 2.1, 0.7));
  let a = sin(dot(p, vec3f(0.913, 0.271, 0.305))) + sin(dot(p, vec3f(-0.402, 0.871, 0.282)) + 1.7) + sin(dot(p, vec3f(0.188, -0.517, 0.835)) + 4.1) + sin(dot(p, vec3f(-0.731, -0.373, -0.571)) + 2.3);
  let q = p * 2.137 + vec3f(3.1, 1.3, 5.7);
  let b = sin(dot(q, vec3f(0.613, 0.711, -0.345))) + sin(dot(q, vec3f(-0.866, 0.121, 0.485)) + 0.9) + sin(dot(q, vec3f(0.231, -0.902, -0.364)) + 2.6) + sin(dot(q, vec3f(0.104, 0.338, 0.935)) + 5.2);
  return 0.5 + (a * 0.6 + b * 0.4) * 0.125;
}`;

  // ---- gas and blackbody tables. Rows 0-251: Sigma(phi, log r) at this frame's disk time, six trailing arms
  // that are born, wind up with the shear and fade. Rows 252-253: blackbody chroma and log10 visible
  // intensity over log T, written once (the page's tools/bb_rules.js Chebyshev fits).
  var fieldSrc = common + `
@group(0) @binding(1) var field: texture_storage_2d<rgba16float, write>;
const ARM_LIFE = 240.0; const ARM_AMP = 1.2; const ARM_PITCH = -1.8; const ARM_WIDTH = 0.35;
fn spiralSigma(rc: f32, phi: f32) -> f32 {
  let om = 1.0 / (pow(rc, 1.5) + SPIN); let psi = phi - om * F.kTime; var sig = 1.0;
  for (var i = 0; i < 6; i++) {
    let fi = f32(i); let cyc = floor(F.kTime / ARM_LIFE - fi / 6.0);
    let born = (fi / 6.0 + cyc) * ARM_LIFE; var env = sin(PI * (F.kTime - born) / ARM_LIFE); env *= env;
    let pitch = ARM_PITCH * (0.8 + 0.4 * fract(fi * 0.618 + cyc * 0.37));
    let ph0 = fi * 2.3999 + 1.7 * cyc + 4.1 * fract(cyc * 0.713);
    var d = psi - (ph0 + pitch * log(rc) - om * born); d -= TAU * floor(d / TAU + 0.5);
    let x = clamp(abs(d) / (2.5 * ARM_WIDTH * (0.7 + 0.6 * fract(fi * 0.317))), 0.0, 1.0);
    let clump = 0.6 + 0.4 * sin(13.0 * psi + 2.1 * fi + 1.3 * cyc) * sin(7.0 * psi + 2.3 * log(rc) + 0.7 * fi);
    sig += ARM_AMP * env * clump * (0.6 + 0.4 * fract(fi * 0.531 + cyc * 0.29)) * (0.5 + 0.5 * cos(PI * x));
  }
  sig += 0.12 * sin(2.0 * (psi - 0.5 * ARM_PITCH * log(rc)) + 1.0) + 0.08 * sin(3.0 * (psi - 0.8 * ARM_PITCH * log(rc)) + 2.0);
  return max(sig, 0.05);
}
@compute @workgroup_size(8, 4) fn gas(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= 512u || id.y >= 252u) { return; }
  let lr = GAS_L0 + (f32(id.y) + 0.5) / 252.0 * (GAS_L1 - GAS_L0);
  textureStore(field, vec2i(id.xy), vec4f(spiralSigma(exp(lr), ((f32(id.x) + 0.5) / 512.0 - 0.5) * TAU), 0.0, 0.0, 1.0));
}
var<private> BBC: array<f32, 42> = array<f32, 42>(0.0488678732, -0.0801755211, 0.0769849919, -0.0705767939, 0.0607239187, -0.04842045, 0.0354867482, -0.0237505438, 0.01441335, -0.0078550999, 0.003794918, -0.0016034357, 0.0005949086, -0.0002122835, 0.3100890082, -0.1298907331, 0.1036960061, -0.0699336133, 0.0378150198, -0.0134389613, -0.0012503675, 0.0074860042, -0.0080216809, 0.005733703, -0.0028113916, 0.000499604, 0.0007840816, -0.0011568372, 0.2723557286, -0.0676822007, 0.0451067934, -0.0183901744, -0.0032580151, 0.0151065118, -0.0174173569, 0.0134788264, -0.0072086628, 0.0015670141, 0.0019896031, -0.0033097235, 0.0030124967, -0.0019426193);
fn cheb(sel: i32, t: f32) -> f32 { var b0 = 0.0; var b1 = 0.0;
  for (var k = 13; k >= 1; k--) { let v = 2.0 * t * b0 - b1 + BBC[sel * 14 + k]; b1 = b0; b0 = v; }
  return t * b0 - b1 + BBC[sel * 14]; }
@compute @workgroup_size(64) fn tables(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= 512u) { return; }
  let x = (f32(id.x) + 0.5) / 512.0; let T = pow(10.0, 3.0 + 6.5 * x); let t = x * 2.0 - 1.0;
  let xx = 1.438432e-2 / (555e-9 * T);
  let logY = 15.354480 - select(log(max(exp(xx) - 1.0, 1e-30)), xx, xx > 15.0) * 0.4342945 - 6.970942 + cheb(0, t);
  let cx = cheb(1, t); let cy = max(cheb(2, t), 0.02); let X = cx / cy; let Z = (1.0 - cx - cy) / cy;
  let rgb = max(vec3f(3.2406 * X - 1.5372 - 0.4986 * Z, -0.9689 * X + 1.8758 + 0.0415 * Z, 0.0557 * X - 0.2040 + 1.0570 * Z), vec3f(0.0));
  textureStore(field, vec2i(i32(id.x), 252), vec4f(rgb / max(max(rgb.r, rgb.g), max(rgb.b, 1e-6)), 1.0));
  textureStore(field, vec2i(i32(id.x), 253), vec4f(logY, 0.0, 0.0, 1.0));
}`;

  // ---- trace, once per canvas size: the page's lens-as-rules march with the gas held at its mean (Sigma = 1).
  // Per pixel and per disk image (the direct image, then the far side lensed over the shadow) it keeps the
  // optical depth through the slab at mean gas and the opacity-weighted radius, azimuth and Eddington temperature
  // factor, so a frame can re-light the crossing with the real Sigma. Plus the photon-ring crossing and the sky.
  var traceSrc = common + `
@group(0) @binding(1) var geo1: texture_storage_2d<rgba32float, write>;
@group(0) @binding(2) var geo2: texture_storage_2d<rgba32float, write>;
@group(0) @binding(3) var ring: texture_storage_2d<rgba32float, write>;
@group(0) @binding(4) var skyOut: texture_storage_2d<rgba16float, write>;
fn hash12(p: vec2f) -> f32 { var p3 = fract(vec3f(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
fn hash22(p: vec2f) -> vec2f { var p3 = fract(vec3f(p.xyx) * vec3f(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
fn vnoise(p: vec2f) -> f32 { let i = floor(p); var f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2f(1.0, 0.0)), f.x), mix(hash12(i + vec2f(0.0, 1.0)), hash12(i + vec2f(1.0, 1.0)), f.x), f.y); }
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
fn sky(uv: vec2f) -> vec3f {   // starfield, a faint Milky Way band with a dust lane, dense faint stars along it
  var c = starLayer(uv, 30.0, 1.0, 0.70) + starLayer(uv, 70.0, 2.0, 0.40);
  c += vec3f(0.08, 0.09, 0.13) * vnoise(uv * 3.0 + vec2f(1.7, 0.3)) * vnoise(uv * 7.0) * 0.25;
  let across = dot(uv, vec2f(-0.42, 0.91)) - 0.05; let along = dot(uv, vec2f(0.91, 0.42));
  let band = exp(-across * across / 0.045);
  let mott = wav3(vec3f(uv * 7.0, 1.3)) * 0.6 + wav3(vec3f(uv * 19.0, 4.1)) * 0.4;
  c += vec3f(0.55, 0.50, 0.46) * band * (0.035 + 0.09 * mott) * (1.0 - sstep(0.02, 0.0, abs(across + 0.03 * sin(along * 5.0))) * 0.75);
  return c + starLayer(uv, 150.0, 7.0, 0.12 + 0.45 * band);
}
// The exact Schwarzschild photon orbit, closed form: u(phi) = u1 + (u2 - u1) sn^2(s phi + c, k); K by AGM, F by Carlson's R_F,
// sn by its nome series (six sines).
fn agmK(k: f32) -> f32 { var a = 1.0; var g = sqrt(max(1.0 - k * k, 1e-12)); for (var i = 0; i < 6; i++) { let an = 0.5 * (a + g); g = sqrt(a * g); a = an; } return 1.5707963 / a; }
fn carlsonRF(x0: f32, y0: f32, z0: f32) -> f32 { var x = x0; var y = y0; var z = z0;
  for (var i = 0; i < 6; i++) { let l = sqrt(x * y) + sqrt(y * z) + sqrt(z * x); x = 0.25 * (x + l); y = 0.25 * (y + l); z = 0.25 * (z + l); }
  let mu = (x + y + z) / 3.0; let X = 1.0 - x / mu; let Y = 1.0 - y / mu; let Z = 1.0 - z / mu; let E2 = X * Y - Z * Z; let E3 = X * Y * Z;
  return (1.0 - E2 / 10.0 + E3 / 14.0 + E2 * E2 / 24.0 - 3.0 * E2 * E3 / 44.0) * inverseSqrt(mu); }
struct Orbit { u1: f32, u2: f32, s: f32, c: f32, K: f32, zExit: f32, alpha: f32, cq: vec4f, cq2: vec2f }
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
  let q1 = sqrt(q); let q3 = q1 * q; let q5 = q3 * q; let q7 = q5 * q; let q9 = q7 * q; let q11 = q9 * q;
  o.cq = vec4f(q1 / (1.0 - q1 * q1), q3 / (1.0 - q3 * q3), q5 / (1.0 - q5 * q5), q7 / (1.0 - q7 * q7)) * (TAU / (k * o.K));
  o.cq2 = vec2f(q9 / (1.0 - q9 * q9), q11 / (1.0 - q11 * q11)) * (TAU / (k * o.K));
  return o; }
fn orbitU(o: Orbit, ph: f32) -> f32 { let z = o.s * ph + o.c; if (z > o.zExit) { return -1.0; }
  let w = 1.5707963 * z / o.K;
  let sn = o.cq.x * sin(w) + o.cq.y * sin(3.0 * w) + o.cq.z * sin(5.0 * w) + o.cq.w * sin(7.0 * w) + o.cq2.x * sin(9.0 * w) + o.cq2.y * sin(11.0 * w);
  return o.u1 + (o.u2 - o.u1) * sn * sn; }
// The Kerr shadow edge (Bardeen 1973): the spherical photon orbit whose screen angle matches theta, bisected between the
// two equatorial photon orbits.
fn bardeen(r: f32, si: f32, ci: f32) -> vec2f {
  let a = SPIN; let xi = -(r * r * r - 3.0 * r * r + a * a * r + a * a) / (a * (r - 1.0));
  let et = -r * r * r * (r * r * r - 6.0 * r * r + 9.0 * r - 4.0 * a * a) / (a * a * (r - 1.0) * (r - 1.0));
  return vec2f(-xi / max(si, 1e-3), sqrt(max(et + a * a * ci * ci - xi * xi * ci * ci / max(si * si, 1e-6), 0.0))); }
fn rhoCrit(theta: f32) -> f32 {
  let si = abs(sin(INC)); let ci = cos(INC); let a = SPIN;
  var lo = 2.0 * (1.0 + cos(0.6666667 * acos(-a))); var hi = 2.0 * (1.0 + cos(0.6666667 * acos(a))); let r2 = hi;
  let sgn = select(-1.0, 1.0, sin(theta) >= 0.0);
  for (var i = 0; i < 10; i++) { if (bardeen(lo, si, ci).y > 0.0) { break; } let m = 0.5 * (lo + hi); if (bardeen(m, si, ci).y > 0.0) { hi = m; } else { lo = m; } }
  var lo2 = lo; var hi2 = r2;
  for (var i = 0; i < 10; i++) { if (bardeen(hi2, si, ci).y > 0.0) { break; } let m = 0.5 * (lo2 + hi2); if (bardeen(m, si, ci).y > 0.0) { lo2 = m; } else { hi2 = m; } }
  hi = hi2;
  let pl = bardeen(lo, si, ci); var aLo = atan2(sgn * pl.y, pl.x);
  for (var i = 0; i < 14; i++) { let m = 0.5 * (lo + hi); let p = bardeen(m, si, ci); let am = atan2(sgn * p.y, p.x);
    if ((am - theta) * (aLo - theta) <= 0.0) { hi = m; } else { lo = m; aLo = am; } }
  return length(bardeen(0.5 * (lo + hi), si, ci)); }
fn kerrG(r: f32, lam: f32) -> f32 { let om = 1.0 / (pow(r, 1.5) + SPIN);   // redshift of a prograde circular emitter for photon lambda
  return sqrt(max(1.0 - 3.0 / r + 2.0 * SPIN * pow(r, -1.5), 1e-4)) / (1.0 + SPIN * pow(r, -1.5)) / max(1.0 - om * lam, 0.05); }
fn gaussCDF(x: f32) -> f32 { let z = abs(x) * 0.70710678; let t = 1.0 / (1.0 + 0.3275911 * z);
  let e = 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * exp(-z * z);
  return 0.5 * (1.0 + select(-e, e, x >= 0.0)); }
var<private> RING_R: array<f32, 7> = array<f32, 7>(3.0, 3.2, 4.0, 6.0, 10.0, 20.0, 40.0);
var<private> RING_C: array<f32, 7> = array<f32, 7>(0.0, 3.0, 14.0, 30.0, 47.0, 63.0, 72.0);
fn ringC(r: f32) -> f32 { if (r <= RING_R[0]) { return 0.0; }
  for (var i = 1; i < 7; i++) { if (r <= RING_R[i]) { return mix(RING_C[i - 1], RING_C[i], (r - RING_R[i - 1]) / (RING_R[i] - RING_R[i - 1])); } }
  return RING_C[6]; }
fn ringR(c: f32) -> f32 {
  for (var i = 1; i < 7; i++) { if (c <= RING_C[i]) { return mix(RING_R[i - 1], RING_R[i], (c - RING_C[i - 1]) / (RING_C[i] - RING_C[i - 1])); } }
  return RING_R[6]; }
struct Image { tau: f32, w: f32, wr: f32, wc: f32, ws: f32, wt: f32 }
fn packImage(m: Image) -> vec4f {
  if (m.tau <= 0.0) { return vec4f(0.0); }
  let w = max(m.w, 1e-9);
  return vec4f(m.wr / w, atan2(m.ws, m.wc), m.tau, m.wt / w);
}
@compute @workgroup_size(8, 8) fn trace(@builtin(global_invocation_id) id: vec3u) {
  let size = vec2u(F.res);
  if (id.x >= size.x || id.y >= size.y) { return; }
  let px = vec2i(id.xy);
  let fc = vec2f(f32(id.x) + 0.5, F.res.y - f32(id.y) - 0.5);
  let p = (fc - 0.5 * F.res) / F.res.y;
  let R = F.radius / F.res.y;
  let c = (F.center - 0.5 * F.res) / F.res.y;
  let q = p - c; let r = length(q); let pv = q / R;
  let b = r / R * MPER; let qh = q / max(r, 1e-5);
  let n = vec3f(0.0, sin(INC), cos(INC)); let eh = vec3f(qh, 0.0);
  var phi0 = atan2(-n.z, dot(eh, n)); if (phi0 <= 0.0) { phi0 += PI; }
  let kb = pv * MPER / KEXT; let pxM = MPER / F.radius;
  let rhoC = select(5.0, rhoCrit(atan2(kb.y, kb.x)), b > 2.5 && b < 7.2);
  let cv = 1.0 - sstep(-0.6 * pxM, 0.6 * pxM, b - rhoC);
  let xb = vec3f(0.0, -cos(INC), sin(INC)); let yb = vec3f(1.0, 0.0, 0.0);
  // Beyond 24 M the weak-field series to b^-5 (1e-4); inside 3 sqrt 3 the Schwarzschild ray is captured.
  let escaping = b > 5.2116; let farRay = b > 24.0;
  let ub = 1.0 / b; var orb: Orbit; var alpha = ub * (4.0 + ub * (11.780972 + ub * (42.666667 + ub * (170.09180 + ub * 716.8))));
  if (escaping && !farRay) { orb = orbitOf(b); alpha = orb.alpha; }
  if (!escaping) { alpha = orbitOf(5.22).alpha; }
  var img: array<Image, 2>;
  var trans = 1.0;
  let inFoot = b < max(14.0, 0.6 * ROUT) || (b < ROUT * 1.15 && abs(pv.y) * MPER < ROUT * (abs(cos(INC)) * 1.25 + 3.0 * HR) + 1.0);
  if (inFoot) {
    var rkU = 0.0; var rkW = 1.0 / b; var phPrev = 0.0;
    let phE = select(PI + alpha, TAU, !escaping);
    let phS = asin(clamp(b / (ROUT * 1.4), 0.0, 1.0)) * 0.7;
    // three coarse segments for the volume, a fine window around each plane crossing phi0 + k pi
    let ehn = dot(eh, n); let ph1 = phi0; let ph2 = phi0 + PI;
    let w1 = min(2.2 * HR / max(abs(-sin(ph1) * n.z + cos(ph1) * ehn), 0.05), 0.6);
    let w2 = min(2.2 * HR / max(abs(-sin(ph2) * n.z + cos(ph2) * ehn), 0.05), 0.6);
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
      if (escaping && farRay) { uu = sin(ph) / b + pow(1.0 - cos(ph), 2.0) / (b * b); }
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
      let P = (1.0 / uu) * (cos(ph) * vec3f(0.0, 0.0, 1.0) + sin(ph) * eh);
      if (!havePrev) { Pprev = P; havePrev = true; }
      var dV = P - Pprev; let dl = length(dV); Pprev = P;
      if (dl < 1e-5) { continue; }
      dV /= dl;
      let z = dot(P, n); let Pp = P - z * n; let rc = length(Pp);
      if (rc < RISCO * 0.98 || rc > ROUT) { continue; }
      let H = HR * rc;
      if (abs(z) > 2.2 * H) { continue; }
      let sigEdge = sstep(RISCO, RISCO + 0.4, rc) * sstep(ROUT, ROUT * 0.96, rc);
      let col = sigEdge * exp(-0.5 * z * z / (H * H)) / (H * 2.5066) * sstep(2.2, 1.6, abs(z) / H) * dl;
      if (col <= 0.0) { continue; }
      let colAbove = select(1.0 - gaussCDF(z / H), gaussCDF(z / H), dot(dV, n) >= 0.0);
      let dtau = kappa(rc) * col;
      let a1 = 1.0 - exp(-dtau);
      let w = trans * a1 + 1e-6 * col;
      let phd = atan2(dot(Pp, yb), dot(Pp, xb));
      let i = select(1, 0, k < 36);
      img[i].tau += dtau; img[i].w += w; img[i].wr += w * rc; img[i].wc += w * cos(phd); img[i].ws += w * sin(phd);
      img[i].wt += w * pow(0.75 * (kappa(rc) * sigEdge * colAbove + 0.6667), 0.25);
      trans *= 1.0 - a1;
    }
  }
  textureStore(geo1, px, packImage(img[0]));
  textureStore(geo2, px, packImage(img[1]));
  // photon ring, orders 2 and 3 (shaders.ts has the sources): order n sits C(r_e) exp(-gamma (phi0 + n pi) / pi)
  // outside the critical curve; a pixel takes the share of its width the bands cover, with grey limb darkening at
  // mu = sqrt(Q) / r (no Kerr shift on this preset, as in the film)
  var ringOut = vec4f(0.0);
  let dM = b - rhoC;
  // (escaping rays only: this card's lens captures at 3 sqrt 3 whatever the spin, so on the flattened side the Kerr
  // curve lies inside its shadow)
  if (inFoot && escaping && dM > -pxM && dM < 1.2) {
    let gam = PI - 0.6 * SPIN * SPIN; let qM = kb * KEXT;
    let carter = qM.y * qM.y + (qM.x * qM.x - SPIN * SPIN) * cos(INC) * cos(INC);
    var cover = 0.0;
    for (var nn = 2; nn <= 3; nn++) {
      let ph = phi0 + f32(nn) * PI; let k = exp(-gam * ph / PI);
      let lo = max(dM - 0.5 * pxM, ringC(RISCO) * k); let hi = min(dM + 0.5 * pxM, ringC(ROUT) * k);
      if (hi <= lo) { continue; }
      let re = ringR(0.5 * (lo + hi) / k);
      if (cover == 0.0) {
        let X2 = re * (cos(ph) * vec3f(0.0, 0.0, 1.0) + sin(ph) * eh);
        let mue = clamp(sqrt(max(carter, 0.0)) / re, 0.0, 1.0);
        ringOut = vec4f(re, atan2(dot(X2, yb), dot(X2, xb)), 0.0, pow(0.75 * (mue + 0.6667), 0.25));
      }
      cover += (hi - lo) / pxM * sstep(RISCO, RISCO + 0.5, re) * sstep(ROUT, ROUT * 0.96, re);
    }
    ringOut.z = min(cover, 1.0);
  }
  textureStore(ring, px, ringOut);
  // sky through the lens equation (beta = theta - alpha), masked by the shadow
  var skyCol = vec3f(0.0);
  if (cv < 0.999) {
    let ps = atan(b / DM) - alpha; let dir = vec3f(qh * sin(ps), -cos(ps));
    let src = c + vec2f(atan2(dir.x, -dir.z), asin(clamp(dir.y, -1.0, 1.0))) * (DM / MPER * R);
    skyCol = sky(src * F.skyZoom) * (1.0 - 0.45 * sstep(0.35, 1.0, length(p))) * (1.0 - cv);
  }
  textureStore(skyOut, px, vec4f(skyCol, 1.0));
}`;

  // ---- shade, every frame: the two disk images front to back with this frame's Sigma, the ring, the sky behind.
  var shadeSrc = common + `
@group(0) @binding(1) var fieldTex: texture_2d<f32>;
@group(0) @binding(2) var lin: sampler;
@group(0) @binding(3) var geo1: texture_2d<f32>;
@group(0) @binding(4) var geo2: texture_2d<f32>;
@group(0) @binding(5) var ring: texture_2d<f32>;
@group(0) @binding(6) var skyTex: texture_2d<f32>;
@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  let p = vec2f(f32((i << 1u) & 2u), f32(i & 2u)) * 2.0 - 1.0; return vec4f(p, 0.0, 1.0); }
fn field(u: f32, row: f32) -> vec4f { return textureSampleLevel(fieldTex, lin, vec2f(u, row / 256.0), 0.0); }
fn gasAt(rc: f32, phi: f32) -> f32 { return field(phi / TAU + 0.5, clamp((log(rc) - GAS_L0) / (GAS_L1 - GAS_L0) * 252.0, 0.5, 251.5)).r; }
fn bbBand(T: f32) -> vec3f { let x = clamp((log(T) * 0.4342945 - 3.0) / 6.5, 0.5 / 512.0, 1.0 - 0.5 / 512.0);
  return field(x, 252.5).rgb * pow(10.0, field(x, 253.5).r - F.expo); }
fn hash12(p: vec2f) -> f32 { var p3 = fract(vec3f(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
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
  if (trans >= 0.5) {   // the page's 'struck' test: an opaque disk hides the ring and the sky
    let rg = textureLoad(ring, px, 0);
    if (rg.z > 0.0) { col += bbBand(tempAt(rg.x, max(gasAt(rg.x, rg.y), 0.2)) * rg.w) * rg.z * trans; }
    col += textureLoad(skyTex, px, 0).rgb * trans;
  }
  // filmic shoulder on the brightest channel (not luminance, so a blue disk would not clip first)
  let V = max(col.r, max(col.g, col.b)); let Vm = V / (1.0 + V * 0.55); let disp = 1.0 - exp(-1.6 * Vm);
  let cm = mix(col * (disp / max(V, 1e-5)), vec3f(disp), clamp((Vm - 0.9) * 2.0, 0.0, 0.85));
  return vec4f(pow(clamp(cm, vec3f(0.0), vec3f(1.0)), vec3f(1.0 / 1.1)) + (hash12(pos.xy) - 0.5) * 0.003, 1.0);
}`;

  // ---- bloom: bright pass and blur at quarter res, a wider blur at eighth, both added back at 0.35
  var postSrc = `
@group(0) @binding(0) var src: texture_2d<f32>;
@group(0) @binding(1) var lin: sampler;
@group(0) @binding(2) var glowA: texture_2d<f32>;
@group(0) @binding(3) var glowB: texture_2d<f32>;
struct V { @builtin(position) pos: vec4f, @location(0) uv: vec2f }
@vertex fn vs(@builtin(vertex_index) i: u32) -> V {
  let p = vec2f(f32((i << 1u) & 2u), f32(i & 2u)); var o: V;
  o.pos = vec4f(p * 2.0 - 1.0, 0.0, 1.0); o.uv = vec2f(p.x, 1.0 - p.y); return o; }
fn tap(uv: vec2f) -> vec3f { return textureSampleLevel(src, lin, uv, 0.0).rgb; }
@fragment fn bright(v: V) -> @location(0) vec4f { let c = tap(v.uv);
  return vec4f(c * smoothstep(0.8, 1.0, dot(c, vec3f(0.2126, 0.7152, 0.0722))), 1.0); }
fn blur(uv: vec2f, d: vec2f) -> vec4f {
  var w = array<f32, 5>(0.227, 0.194, 0.121, 0.054, 0.016); var acc = tap(uv) * w[0];
  for (var i = 1; i < 5; i++) { let o = d * f32(i) * 1.5; acc += (tap(uv + o) + tap(uv - o)) * w[i]; }
  return vec4f(acc, 1.0); }
@fragment fn blurH(v: V) -> @location(0) vec4f { return blur(v.uv, vec2f(1.0 / f32(textureDimensions(src).x), 0.0)); }
@fragment fn blurV(v: V) -> @location(0) vec4f { return blur(v.uv, vec2f(0.0, 1.0 / f32(textureDimensions(src).y))); }
@fragment fn composite(v: V) -> @location(0) vec4f {
  let glow = textureSampleLevel(glowA, lin, v.uv, 0.0).rgb + textureSampleLevel(glowB, lin, v.uv, 0.0).rgb;
  return vec4f(tap(v.uv) + glow * 0.35, 1.0); }`;

  // Where the page's live exposure meter settles for this preset; a card has no use for the meter's GPU readback.
  var EXPO = 5.98;
  // Disk clock in M per second. The page runs this preset at its cap, ~7 ISCO orbits a second, which on a card
  // reads as flicker; at this rate the inner disk turns about once a second and the outer arms visibly trail.
  var DISK_RATE = 26;
  // The shader turns kTime into orbital phase in f32, which loses precision as it grows (the page does the phase
  // per radius in f64 on the CPU instead). Wrapping it keeps that error under 0.004 rad at the ISCO; the period is
  // a whole number of arm lifetimes (240 M) so the arms carry on across the wrap, and at 26 M/s it comes round once
  // every ~2.7 hours, when the disk's rotation phase jumps once.
  var DISK_WRAP_M = 240 * 1050;

  async function start() {
    var adapter = await navigator.gpu.requestAdapter({ powerPreference: "low-power" });
    if (!adapter) return;
    var device = await adapter.requestDevice();
    var ctx = canvas.getContext("webgpu");
    if (!ctx) return;
    var format = navigator.gpu.getPreferredCanvasFormat();
    ctx.configure({ device: device, format: format, alphaMode: "opaque" });

    var frameBuf = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    var frameData = new Float32Array(8);
    var fieldTex = device.createTexture({ size: [512, 256], format: "rgba16float", usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING });
    var wrapLinear = device.createSampler({ magFilter: "linear", minFilter: "linear", addressModeU: "repeat" });
    var clampLinear = device.createSampler({ magFilter: "linear", minFilter: "linear" });

    function compute(code, entry) { return device.createComputePipeline({ layout: "auto", compute: { module: device.createShaderModule({ code: code }), entryPoint: entry } }); }
    function render(module, entry, target) { return device.createRenderPipeline({ layout: "auto", vertex: { module: module, entryPoint: "vs" }, fragment: { module: module, entryPoint: entry, targets: [{ format: target }] } }); }
    var gasPipe = compute(fieldSrc, "gas"), tablePipe = compute(fieldSrc, "tables"), tracePipe = compute(traceSrc, "trace");
    var shadePipe = render(device.createShaderModule({ code: shadeSrc }), "fs", "rgba16float");
    var postMod = device.createShaderModule({ code: postSrc });
    var brightPipe = render(postMod, "bright", "rgba16float"), blurHPipe = render(postMod, "blurH", "rgba16float"), blurVPipe = render(postMod, "blurV", "rgba16float"), compPipe = render(postMod, "composite", format);

    function group(pipe, resources) {
      return device.createBindGroup({ layout: pipe.getBindGroupLayout(0), entries: resources.map(function (resource, i) { return resource && { binding: i, resource: resource }; }).filter(Boolean) });
    }
    var frameRes = { buffer: frameBuf };
    var gasGroup = group(gasPipe, [frameRes, fieldTex.createView()]);
    var tableGroup = group(tablePipe, [null, fieldTex.createView()]);

    var targets = null;
    function tex(w, h, fmt, usage) { return device.createTexture({ size: [Math.max(1, w), Math.max(1, h)], format: fmt, usage: usage }); }
    function buildTargets(w, h) {
      if (targets) targets.all.forEach(function (t) { t.destroy(); });
      var RT = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING, ST = GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING;
      var t = {
        geo1: tex(w, h, "rgba32float", ST), geo2: tex(w, h, "rgba32float", ST), ring: tex(w, h, "rgba32float", ST), sky: tex(w, h, "rgba16float", ST),
        scene: tex(w, h, "rgba16float", RT), qA: tex(w >> 2, h >> 2, "rgba16float", RT), qB: tex(w >> 2, h >> 2, "rgba16float", RT),
        eA: tex(w >> 3, h >> 3, "rgba16float", RT), eB: tex(w >> 3, h >> 3, "rgba16float", RT)
      };
      t.all = [t.geo1, t.geo2, t.ring, t.sky, t.scene, t.qA, t.qB, t.eA, t.eB];
      t.trace = group(tracePipe, [frameRes, t.geo1.createView(), t.geo2.createView(), t.ring.createView(), t.sky.createView()]);
      t.shade = group(shadePipe, [frameRes, fieldTex.createView(), wrapLinear, t.geo1.createView(), t.geo2.createView(), t.ring.createView(), t.sky.createView()]);
      function post(pipe, from, glowA, glowB) { return group(pipe, [from.createView(), clampLinear, glowA && glowA.createView(), glowB && glowB.createView()]); }
      t.passes = [
        [brightPipe, post(brightPipe, t.scene), t.qA], [blurHPipe, post(blurHPipe, t.qA), t.qB], [blurVPipe, post(blurVPipe, t.qB), t.qA],
        [blurHPipe, post(blurHPipe, t.qA), t.eA], [blurVPipe, post(blurVPipe, t.eA), t.eB], [blurHPipe, post(blurHPipe, t.eB), t.eA], [blurVPipe, post(blurVPipe, t.eA), t.eB]
      ];
      t.composite = post(compPipe, t.scene, t.qA, t.eB);
      t.traced = false;
      targets = t;
    }

    function drawPass(enc, pipe, bind, view) {
      var pass = enc.beginRenderPass({ colorAttachments: [{ view: view, loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 1 } }] });
      pass.setPipeline(pipe); pass.setBindGroup(0, bind); pass.draw(3); pass.end();
    }
    function dispatch(enc, pipe, bind, x, y) {
      var pass = enc.beginComputePass(); pass.setPipeline(pipe); pass.setBindGroup(0, bind); pass.dispatchWorkgroups(x, y); pass.end();
    }

    // A frame is a few taps a pixel now, so render at the full device ratio (capped at 2).
    var pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    function resize() {
      var box = canvas.getBoundingClientRect();
      var w = Math.max(8, Math.round(box.width * pixelRatio)), h = Math.max(8, Math.round(box.height * pixelRatio));
      if (targets && canvas.width === w && canvas.height === h) return;
      canvas.width = w; canvas.height = h;
      buildTargets(w, h);
    }

    var kTime = 0, last = performance.now(), tablesDone = false;
    function frame(now) {
      if (!reduce) kTime = (kTime + Math.min(0.1, (now - last) / 1000) * DISK_RATE) % DISK_WRAP_M;
      last = now;
      resize();
      var w = canvas.width, h = canvas.height;
      // the 40 M disk spans 3.46 shadow radii each way: sized to fit the card's width
      var radius = Math.min(w * 0.13, h * 0.34);
      // the page lays its sky out in screen heights; a card a third as tall would crowd the stars 3x
      var skyZoom = h / pixelRatio / 600;
      frameData.set([w, h, w * 0.5, h * 0.52, radius, kTime, EXPO, skyZoom]);
      device.queue.writeBuffer(frameBuf, 0, frameData);
      var enc = device.createCommandEncoder();
      if (!tablesDone) { dispatch(enc, tablePipe, tableGroup, 8, 1); tablesDone = true; }
      if (!targets.traced) { dispatch(enc, tracePipe, targets.trace, Math.ceil(w / 8), Math.ceil(h / 8)); targets.traced = true; }
      dispatch(enc, gasPipe, gasGroup, 64, 63);
      drawPass(enc, shadePipe, targets.shade, targets.scene.createView());
      targets.passes.forEach(function (p) { drawPass(enc, p[0], p[1], p[2].createView()); });
      drawPass(enc, compPipe, targets.composite, ctx.getCurrentTexture().createView());
      device.queue.submit([enc.finish()]);
    }

    if (reduce) { kTime = 400; frame(performance.now()); return; }
    var visible = true;
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(canvas);
    function loop(now) {
      if (!canvas.isConnected) { device.destroy(); return; }   // hx-boost swapped the page out
      if (visible && !document.hidden) frame(now);
      else last = now;
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  start().catch(function () {});
})();
