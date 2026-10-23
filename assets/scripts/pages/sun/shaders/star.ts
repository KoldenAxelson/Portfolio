/* The star image, one pipeline per view (override VIEW, so each carries only its own branch: the original ran
 * the shared disc work in every view, including C3, which then blacked it out). Writes linear light to an HDR
 * target; shaders/post.ts tone-maps. The Frame struct is written by sim.ts (writeFrame); keep them in step.
 * Views: 0-4 AIA 171/193/211/304/131, 5 HMI continuum, 6 HMI magnetogram, 7 corona (C2), 8 wide corona (C3). */

import { PARALLAX } from '../framing';
import { aiaResponseWgsl } from '../views';
import { cmeWgsl } from './cme';
import { HASH_WGSL, WAV3 } from './noise';

export const FRAME_FLOATS = 60;

export const STAR_SHADER = HASH_WGSL + WAV3 + aiaResponseWgsl() + cmeWgsl(0, 9) + /* wgsl */ `
override VIEW: u32 = 0u;
const PI = 3.14159265; const TAU = 6.2831853;
struct Frame {
  res: vec2f, star: vec2f,
  radius: f32, t: f32, rot: f32, thetaE: f32,
  cam: vec2f, mouse: vec2f,
  expo: f32, activity: f32, pad1: f32, gran: f32,
  carpet: f32, marchR: f32, windA: f32, windB: f32,
  tcor: vec3f, rkm: f32,
  bbcol: vec3f, windMix: f32,
  disc: vec4f, disc2: vec4f,
  limbAbs: f32, shellH: f32, wz: f32, lite: f32,
  pad2: f32, stringsDrawn: f32, renderScale: f32, pad0: f32,
  amb0: vec4f, amb1: vec4f,
  spot: vec4f,      // continuum brightness of a small umbra, a large umbra, the penumbra; facular limb contrast
  limbRgb: vec4f,   // linear limb darkening per display channel
}
@group(0) @binding(0) var<uniform> F: Frame;
@group(0) @binding(1) var surfaceTex: texture_2d<f32>;
@group(0) @binding(2) var coronaTex: texture_2d<f32>;
@group(0) @binding(3) var striationTex: texture_2d<f32>;
@group(0) @binding(4) var parkerTex: texture_3d<f32>;
@group(0) @binding(5) var flowTex: texture_2d<f32>;
@group(0) @binding(6) var chartSmp: sampler;     // linear, longitude wraps
@group(0) @binding(7) var parkerSmp: sampler;    // linear, radius clamps, longitude wraps
@group(0) @binding(8) var loopTex: texture_2d<f32>;
@group(0) @binding(10) var spotsTex: texture_2d<f32>;   // the regions' flux still in sunspots (fieldmaps.ts spots)

fn isEuv() -> bool { return VIEW < 5u; }
fn cmeOpenAt(d: vec3f) -> f32 { return sampleChart(coronaTex, d).r; }   // cme.ts: a CME's sheath is heavier over closed field
fn isCoronagraph() -> bool { return VIEW >= 7u; }
fn chart(d: vec3f) -> vec2f { return vec2f(atan2(d.x, d.z) / TAU + 0.5, asin(clamp(d.y, -1.0, 1.0)) / PI + 0.5); }
fn sampleChart(tex: texture_2d<f32>, d: vec3f) -> vec4f { return textureSampleLevel(tex, chartSmp, chart(d), 0.0); }
fn rotY(a: f32, v: vec3f) -> vec3f { let c = cos(a); let s = sin(a); return vec3f(c * v.x + s * v.z, v.y, -s * v.x + c * v.z); }

// ---- sky ---------------------------------------------------------------------------------------------------
fn starLayer(uv: vec2f, density: f32, seed: f32, brightness: f32) -> vec3f {
  let g = uv * density; let cell = floor(g); var col = vec3f(0.0);
  let px = 1.0 / F.res.y;
  for (var y = -1; y <= 1; y++) { for (var x = -1; x <= 1; x++) {
    let c = cell + vec2f(f32(x), f32(y));
    if (hash12(c * 1.7 + seed + 9.1) < 0.84) { continue; }
    let dd = length(g - (c + 0.15 + hash22(c + seed) * 0.7)) / density;
    let mag = pow(hash12(c + seed + 3.3), 3.0);
    let size = max(0.0007 + mag * 0.0022, max(2.4 * F.renderScale, 1.6) * px);
    let warm = step(0.82, hash12(c + seed + 7.7));
    col += mix(vec3f(0.90, 0.93, 1.0), vec3f(0.95, 0.72, 0.30), warm) * exp(-(dd / size) * (dd / size) * 2.0) * (0.22 + mag) * brightness;
  } }
  return col;
}
fn sky(uv: vec2f, par: vec2f) -> vec3f {
  return starLayer(uv + par * 0.35, 30.0, 1.0, 0.70) + starLayer(uv + par * 0.70, 70.0, 2.0, 0.40)
    + vec3f(0.08, 0.09, 0.13) * 0.25 * vnoise(uv * 3.0 + par + vec2f(1.7, 0.3)) * vnoise(uv * 7.0 - par * 0.5);
}

// ---- corona model --------------------------------------------------------------------------------------------
fn windKms(d: vec3f, rr: f32) -> f32 {
  let uv = chart(d);
  let r = ((rr - 1.0) / 7.0 * 63.0 + 0.5) / 64.0;   // texel k holds r = 1 + 7k/63 (the original read it half a texel off)
  return textureSampleLevel(parkerTex, parkerSmp, vec3f(r, uv.y, uv.x), 0.0).r * 1000.0;
}
fn striationAt(rco: f32, wavFine: f32, phase: f32) -> f32 {
  return 0.75 + 0.55 * (wavFine - 0.5) + 0.25 * sin(rco * 9.0 + phase * TAU);
}
struct Plasma { n: f32, T: f32 }
fn coronaAt(p: vec3f, rr: f32) -> Plasma {
  let d = p / rr;
  let c = sampleChart(coronaTex, d);
  let openF = c.r;
  let bn = clamp(c.g * 32.0 / (rr * rr * rr), 0.0, 3.0);
  var density = baumbachN(rr);
  var structure = 1.0;
  if (isEuv()) {
    if (F.disc2.x > 0.0) { density = exp(-(rr - 1.0) / (F.disc2.x * rr)); }   // hydrostatic, H growing as r
    // structure carried out by the wind. The displacement is kept in two phases that wrap and cross-fade: the
    // original's grew without bound, shearing neighbouring directions into ever finer stripes over a long session.
    let drift = windKms(d, rr) / F.rkm * mix(0.3, 1.0, openF);
    let phase = textureSampleLevel(striationTex, chartSmp, chart(d), 0.0).r;
    structure = mix(striationAt(rr - F.windB * drift, c.a, phase), striationAt(rr - F.windA * drift, c.a, phase), F.windMix);
  }
  let n = max(density * mix(1.0, 0.55, openF) * (0.6 + 0.6 * bn) * structure * sqrt(0.6 + 0.6 * F.activity), 0.0);
  return Plasma(n, mix(F.tcor.y, F.tcor.x, openF) + (F.tcor.z - F.tcor.y) * clamp(bn * 0.5, 0.0, 1.0));
}

// ---- the disc ----------------------------------------------------------------------------------------------------
fn ramp(v0: f32, tint: vec3f) -> vec3f {   // EUV display mapping: tinted, bleaching to white when saturated
  let v = max(v0, 0.0);
  return mix(tint * pow(v, 1.15) * 0.95, vec3f(1.0, 0.98, 0.94), ss(0.85, 1.6, v));
}
fn tintOf() -> vec3f {
  switch (VIEW) {
    case 1u: { return vec3f(0.95, 0.62, 0.30); }
    case 2u: { return vec3f(0.72, 0.48, 0.95); }
    case 3u: { return vec3f(1.00, 0.30, 0.06); }
    case 4u: { return vec3f(0.30, 0.78, 0.92); }
    default: { return vec3f(1.00, 0.74, 0.22); }
  }
}
fn tracerAt(d: vec3f) -> f32 {   // the flow's network tracer, with the original's half-texel box filter
  let uv = chart(d); let h = 0.5 / vec2f(textureDimensions(flowTex));
  let s = textureSampleLevel(flowTex, chartSmp, uv + h, 0.0).b + textureSampleLevel(flowTex, chartSmp, uv - h, 0.0).b
        + textureSampleLevel(flowTex, chartSmp, uv + vec2f(h.x, -h.y), 0.0).b + textureSampleLevel(flowTex, chartSmp, uv + vec2f(-h.x, h.y), 0.0).b;
  return clamp(s * 0.25, 0.0, 1.0);
}
// wav3 at freq cycles per radius, faded to its mean once its finest wavelength (2 pi / 2.137 freq R) spans under
// ~3 pixels, and skipped under 1.5: no shimmer on a small or foreshortened disc, and no work for detail nobody sees
var<private> pxPerR: f32;
fn lodOf(freq: f32) -> f32 { return ss(1.5, 3.0, pxPerR * 2.94 / freq); }
fn wavLod(p: vec3f, freq: f32) -> f32 {
  let lod = lodOf(freq);
  if (lod <= 0.0) { return 0.5; }
  return mix(0.5, wav3(p), lod);
}
// a ridged wav3, (1 - |2 w - 1|)^n, fading to its own mean (measured over wav3's distribution) rather than to the
// ridge's crest, which is what wav3's mean of 0.5 would give
fn ridgeLod(p: vec3f, freq: f32, n: f32, mean: f32) -> f32 {
  let lod = lodOf(freq);
  if (lod <= 0.0) { return mean; }
  return mix(mean, pow(1.0 - abs(2.0 * wav3(p) - 1.0), n), lod);
}
fn disc(pv: vec2f, d: f32) -> vec3f {
  let t = F.t; let gs = F.gran; let tint = tintOf();
  let z = sqrt(max(0.0, 1.0 - d * d));
  pxPerR = F.radius * max(z, 0.15);   // the surface is foreshortened toward the limb
  let sf = rotY(-F.rot, vec3f(pv, z));
  let dst = disturbAt(sf);   // a press on the disc: (flash, ring)
  let s = sampleChart(surfaceTex, sf);
  let Bs = s.xyz; let Br = dot(Bs, sf); let BrA = s.w;
  let net = tracerAt(sf);
  let lane0 = pow(1.0 - abs(2.0 * net - 1.0), 2.0);
  let Bc = F.carpet * (wavLod(sf * 38.0 / gs + vec3f(0.0, 0.0, t * 0.01), 38.0 / gs) - 0.5) * 2.0 * (0.4 + 1.2 * lane0);
  if (VIEW == 6u) {   // magnetogram: line-of-sight field (white north), the radial carpet foreshortened by mu
    let Bv = rotY(F.rot, Bs);
    let m = (Bv.z + Bc * z) * 1.4 + 0.04 * (wavLod(sf * 120.0, 120.0) - 0.5);
    return vec3f(clamp(0.5 + m, 0.0, 1.0)) * 0.9 * (0.75 + 0.25 * z);
  }
  let Bu = abs(select(Br, BrA, isEuv()) + 0.6 * Bc) + 0.12 * abs(Bc);
  let Bh = Bs - Br * sf; let bh = Bh / max(length(Bh), 1e-5);
  let fs = clamp(F.radius / 420.0, 0.35, 1.0);
  let fine = wavLod(sf * 110.0 * fs / gs - vec3f(t * 8.0), 110.0 * fs / gs);
  let ps3 = sf * 70.0 / gs; let fibP = ps3 - bh * dot(ps3, bh) * 0.92;   // squashed along the horizontal field: fibrils
  let fib = ridgeLod(fibP + vec3f(t * 0.05), 70.0 / gs, 4.0, 0.478) * ss(0.08, 0.5, Bu);
  if (VIEW == 5u) {   // HMI continuum: granulation, spots, faculae, limb darkening that reddens toward the limb
    let gran = 0.93 + 0.07 * fine + 0.03 * (net - 0.5);
    let spotK = 0.6 + 0.4 * pow(F.activity, 0.35);
    let spotB = abs(sampleChart(spotsTex, sf).r) * spotK;   // spots fade within weeks; plage (faculae) keeps the flux
    let plageB = abs(Br) * spotK;
    let umbra = ss(1.0, 1.45, spotB);
    let penum = ss(0.6, 1.0, spotB) * (1.0 - umbra);
    // a big spot's umbra is darker than a pore's (Mathew et al. 2007); the penumbra's filaments ripple about its mean
    let umbraLevel = mix(F.spot.x, F.spot.y, ss(1.45, 2.6, spotB));
    let penumLevel = clamp(F.spot.z - 0.08 + 0.16 * fib, 0.0, 1.0);
    // faculae: magnetic plage between the spots, invisible at disc centre, ~+8 % near the limb (Yeo et al. 2013)
    let facula = ss(0.12, 0.4, plageB) * (1.0 - ss(0.5, 0.75, spotB)) * F.spot.w * 1.6 * (1.0 - z) * (1.0 - z) * ss(0.0, 0.12, z);
    let v = gran * mix(1.0, umbraLevel, umbra) * mix(1.0, penumLevel, penum) * (1.0 + facula);
    let limb = vec3f(1.0) - F.limbRgb.xyz * (1.0 - z);
    return F.bbcol * limb * v * 1.25 + vec3f(1.0, 0.98, 0.95) * dst.x * 1.2 / max(dot(F.bbcol, vec3f(0.3, 0.6, 0.1)), 0.15);
  }
  // coronal holes darken by depth inside open field, not by the open fraction (see shaders/field.ts blurOpen)
  let openF = ss(0.20, 0.50, sampleChart(striationTex, sf).g);   // from ~11 to ~29 deg inside: Sun-sized polar holes
  let plage = clamp(pow(Bu, 0.8), 0.0, 1.6);
  let lanes = pow(1.0 - abs(2.0 * net - 1.0), 6.0) * 0.55 + 0.25 * ridgeLod(sf * 46.0 * fs / gs + vec3f(t * 0.03), 46.0 * fs / gs, 3.0, 0.553);
  let mott = 0.26 + 0.50 * net * F.disc2.y + 0.26 * lanes * F.disc2.z + 0.06 * fine * F.disc2.w;
  let brn = Br / 0.02;   // x*x, never pow(x, 2): Br is signed and WGSL's pow is undefined for a negative base
  let pil = exp(-brn * brn) * ss(0.2, 0.5, length(Bh)) * ss(0.60, 0.70, wav3(sf * 2.6 + vec3f(4.0))) * ss(0.45, 0.62, wav3(sf * 7.0 + vec3f(1.0)));
  let channel = clamp(pil * 1.3, 0.0, 1.0) * (1.0 - ss(0.7, 1.2, Bu));
  let unresolved = F.disc.x * pow(max(mott, 0.0) / 0.6, F.disc.y);
  if (VIEW == 3u) {   // He II 304: chromospheric network, plage, filaments dark
    var v = (0.30 + 0.75 * net + 0.35 * lanes + 0.12 * fine + 0.55 * plage + 0.35 * fib * plage) * (1.0 - 0.75 * channel) * (1.0 - 0.2 * openF) * 0.85 * unresolved;
    v += 1.5 * dst.x + 0.5 * dst.y;
    return mix(ramp(v, tint), vec3f(0.35, 0.08, 0.02), 0.5 * channel);
  }
  let flick = 0.8 + 0.4 * wavLod(sf * 60.0 * fs + vec3f(t * 0.9), 60.0 * fs);
  let Tlow = F.tcor.y + (F.tcor.z - F.tcor.y) * clamp(Bu - 0.4, 0.0, 1.0);
  let emis = plage * (0.5 + 0.6 * resp(Tlow, VIEW) + 0.5 * resp(F.tcor.y, VIEW)) + 0.3 * fib * plage;
  let qr = max(resp(F.tcor.y, VIEW), max(resp(F.tcor.y * 0.72, VIEW), 0.6 * resp(F.tcor.y * 1.4, VIEW)));
  let base = select(mott * 0.45 * (0.45 + 0.55 * qr), 0.10 + 0.16 * mott, VIEW == 4u) * unresolved;
  var v = base + (0.55 * emis + 0.4 * flick * ss(1.0, 1.5, Bu) * resp(Tlow, VIEW)) * sqrt(F.expo) - 0.5 * channel;
  v *= 1.0 - select(0.62, 0.45, VIEW == 4u) * openF;   // coronal holes
  v += (2.0 * dst.x * (0.3 + resp(8.0, VIEW) + 0.5 * resp(F.tcor.z, VIEW)) + 0.9 * dst.y * (0.4 + resp(F.tcor.y * 1.3, VIEW))) * sqrt(F.expo);
  return ramp(v, tint);
}

// ---- EUV corona: line-of-sight emission measure times the channel response, plus the transition-region shell --
fn euvCorona(fc: vec2f, pv: vec2f, d: f32, q: vec2f, r: f32) -> vec3f {
  let tint = tintOf(); let t = F.t;
  var em = 0.0;
  if (d < F.marchR) {
    let zFar = sqrt(max(F.marchR * F.marchR - d * d, 0.0));
    let zNear = select(-zFar, sqrt(max(0.0, 1.0 - d * d)), d < 1.0);
    let steps = select(12, 6, F.lite > 0.5);
    let dz = (zFar - zNear) / f32(steps);
    let jit = (fract(52.9829189 * fract(dot(fc, vec2f(0.06711056, 0.00583715)))) - 0.5) * 0.2;
    let farAtt = select(1.0, exp(-F.limbAbs * exp(-(d - 1.0) / 0.006)), d >= 1.0);   // far half hidden behind spicules
    for (var k = 0; k < steps; k++) {
      let zz = zFar - (f32(k) + 0.5 + jit) * dz;
      let p3 = rotY(-F.rot, vec3f(pv, zz)); let rr = length(p3);
      let pl = coronaAt(p3, rr);
      em += pl.n * pl.n * resp(pl.T, VIEW) * dz * select(1.0, farAtt, zz < 0.0);
    }
  }
  if (CM.head.x > 0.5 && d < CM.head.y) {   // CME plasma at the quiet-corona temperature, in front of the disc only on it
    let zFarC = sqrt(max(CM.head.y * CM.head.y - d * d, 0.0));
    let zDisc = sqrt(max(0.0, 1.0 - d * d));
    let cc = cmeColumn(rotY(-F.rot, vec3f(pv, 0.0)), rotY(-F.rot, vec3f(0.0, 0.0, -1.0)), -zFarC, select(zFarC, -zDisc, d < 1.0), 1.5, fc);
    em += select(0.5 * cc.y, 0.04 * log(1.0 + cc.y), d < 1.0) * resp(F.tcor.y, VIEW);
  }
  let e = max(d - 1.0, 0.0);
  var hs = F.shellH; var o2 = (1.0 + hs) * (1.0 + hs) - d * d;
  var shell = 0.0;
  if (o2 > 0.0) {
    shell = select(sqrt(o2) * (1.0 + exp(-F.limbAbs * exp(-e / 0.006))), sqrt(o2) - sqrt(max(0.0, 1.0 - d * d)), d < 1.0) / hs * 0.1;
  }
  if (VIEW == 3u) {   // He II: optically thick spicule forest with a ragged top
    let qd = q / max(r, 1e-5);
    hs *= 0.45 + 1.1 * wav3(vec3f(qd * 55.0, t * 0.15)) * (0.6 + 0.8 * wav3(vec3f(qd * 9.0, 3.0)));
    o2 = (1.0 + hs) * (1.0 + hs) - d * d;
    if (o2 > 0.0) {
      let Lp = select(2.0 * sqrt(o2), sqrt(o2) - sqrt(max(0.0, 1.0 - d * d)), d < 1.0);
      shell = select(0.6 * (1.0 - exp(-Lp / (0.5 * hs))) * ss(1.0 + hs, 1.0 + 0.6 * hs, d), 0.0, d < 1.0);
    }
  }
  let emChrom = shell * select(0.35 * resp(0.4, VIEW) + 0.25, 1.2, VIEW == 3u);
  // this corona darkens over its coronal holes, which the original's never did; that left 171's diffuse halo at a
  // third of the original's, so it is lifted back to the original's measured brightness at 1.02-1.2 R
  let gain = select(select(7.5, 4.5, VIEW == 1u), 15.5, VIEW == 0u);
  let corona = em * gain * select(1.0, 0.25, VIEW == 3u) * F.expo * F.disc.z + emChrom * F.disc.w;
  let hue = select(mix(tint, mix(tint, vec3f(1.0), 0.5), exp(-e * 6.0)), tint, VIEW == 3u);   // whitened toward the limb
  return hue * corona;
}

// ---- white-light corona (C2, C3): Thomson-scattered K corona, streamer belt, F corona, occulter ------------------
fn whiteLight(fc: vec2f, pv: vec2f, d: f32, col0: vec3f) -> vec3f {
  let wide = VIEW == 8u;
  let kz = select(1.0, F.wz, wide); let dd = d * kz; let pz = pv * kz;
  let rb = select(max(F.marchR, 40.0), 150.0, wide);   // line-of-sight half-length, R
  let wl = F.bbcol / max(max(F.bbcol.r, F.bbcol.g), max(F.bbcol.b, 1e-4));
  let occR = select(1.25, 3.7, wide);
  let cover = ss(occR, occR - 0.06 * kz, dd);
  var col = col0;
  if (dd < occR + 0.1 * kz) { col *= 1.0 - cover; }
  if (dd < occR - 0.06 * kz || dd >= rb) { return col; }
  let zFar = sqrt(max(rb * rb - dd * dd, 0.0));
  var thQ = 0.0;
  var colBT = 0.0;   // the Baumbach column, Thomson-weighted the same way: what every column here is measured against
  for (var k = 0; k < 40; k++) {
    let s01 = (f32(k) + hash12(floor(fc) + vec2f(f32(k) * 1031.0, f32(k) * 2713.0))) / 40.0 * 2.0 - 1.0;
    let zz = zFar * s01 * abs(s01);   // dense near the plane of the sky, where the Thomson column lives
    let wz = 2.0 * zFar * abs(s01) * 2.0 / 40.0;
    let p3 = rotY(-F.rot, vec3f(pz, zz)); let rr = length(p3);
    let pl = coronaAt(p3, rr);
    let ratio = sampleChart(coronaTex, p3 / rr).b;
    let wBelt = mix(0.30, 0.12, ss(1.3, 3.0, rr));
    thQ += pl.n * (F.amb0.x + F.amb0.y * exp(-ratio * ratio / (wBelt * wBelt))) * thomsonWeight(rr, dd) * wz;
  }
  // the same column through the smooth Baumbach corona, on fixed samples (no jitter: everything is divided by it)
  for (var k = 0; k < 32; k++) {
    let s01 = (f32(k) + 0.5) / 32.0 * 2.0 - 1.0;
    let rr = length(vec2f(dd, zFar * s01 * abs(s01)));
    colBT += baumbachN(rr) * thomsonWeight(rr, dd) * 2.0 * zFar * abs(s01) * 2.0 / 32.0;
  }
  // strings carry a fraction of the electrons once they are drawn into loopTex (.r, x1000); until then the
  // diffuse march keeps them all
  thQ *= 1.0 - F.amb0.z * F.stringsDrawn;
  let strC = textureLoad(loopTex, vec2i(i32(fc.x), i32(F.res.y - fc.y)), 0).r * 0.001 * F.stringsDrawn;   // loopTex rows run top-down
  let colB = max(colBT, 1e-9);
  let rayA = rotY(-F.rot, vec3f(pz, 0.0)); let rayB = rotY(-F.rot, vec3f(0.0, 0.0, 1.0));
  let thC = cmeColumn(rayA, rayB, -min(zFar, 40.0), min(zFar, 40.0), 0.0, fc).x / 0.3;
  let shk = shockColumn(rayA, rayB) * (1.0 - F.amb0.z * F.stringsDrawn);   // drawn strings carry and sweep their own share
  let cme = (0.01175 * thC + shk) / colB;
  var b = 0.32 * (thQ / colB + strC / colB + cme) / sqrt(max(F.activity, 1.0)) * pow(occR / dd, 0.3);
  b += F.amb1.y * pow(dd / 5.0, F.amb1.z);   // F corona (dust)
  b = b / (1.0 + 0.25 * b);
  let x = 1.0 - exp(-1.3 * b * F.amb1.x);
  var wlF = wl * vec3f(1.0, 0.92, 0.80); wlF /= max(wlF.r, max(wlF.g, wlF.b));
  let wlr = mix(wl, wlF, 0.7 * ss(2.5, 8.0, dd));
  return col * (1.0 - 0.7 * x) + wlr * x * (1.0 - cover);
}

@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  let p = vec2f(f32((i << 1u) & 2u), f32(i & 2u)) * 2.0 - 1.0; return vec4f(p, 0.0, 1.0);
}
@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let fc = vec2f(pos.x, F.res.y - pos.y);   // the original's GL coordinates: y up
  let p = (fc - 0.5 * F.res) / F.res.y;
  let R = F.radius / F.res.y;
  let par = F.mouse * 0.012;
  let c = (F.star - 0.5 * F.res) / F.res.y + F.mouse * vec2f(${PARALLAX[0]}, ${PARALLAX[1]});
  let q = p - c; let r = length(q); let pv = q / R; let d = r / R;
  let drawsDisc = !isCoronagraph();
  let discOpaque = drawsDisc && d < 1.0 - 2.0 / F.radius;
  var col = vec3f(0.0);
  if (!discOpaque) {   // the sky only where it can show (the original drew it under the disc too)
    let thetaE = R * F.thetaE;
    var src = p - q * (thetaE * thetaE) / (dot(q, q) + 1e-5);   // point-mass lens: beta = theta - thetaE^2/theta
    let roll = 0.06 * sin(F.cam.x * 0.5);
    src = vec2f(cos(roll) * src.x + sin(roll) * src.y, -sin(roll) * src.x + cos(roll) * src.y);
    col = sky(src + vec2f(-F.cam.x * 0.25, F.cam.y * 0.25), par) * (1.0 - 0.45 * ss(0.35, 1.0, length(p)));
  }
  if (drawsDisc && d < 1.0) { col = mix(col, disc(pv, d), ss(1.0, 1.0 - 2.0 / F.radius, d)); }
  if (isEuv()) {
    col += euvCorona(fc, pv, d, q, r);
    col += textureLoad(loopTex, vec2i(pos.xy), 0).rgb;
  } else if (VIEW == 5u) {
    col += F.bbcol * 0.05 * exp(-max(d - 1.0, 0.0) * 2.0);
    col += textureLoad(loopTex, vec2i(pos.xy), 0).rgb;   // white-light flare kernels (loops.ts)
    if (CM.head.x > 0.5 && d > 1.0 && d < F.marchR) {   // a CME in flight, Thomson-scattered photosphere light
      let zFar = sqrt(max(F.marchR * F.marchR - d * d, 0.0));
      let th = cmeColumn(rotY(-F.rot, vec3f(pv, 0.0)), rotY(-F.rot, vec3f(0.0, 0.0, 1.0)), -zFar, zFar, 0.0, fc).x / 0.3;
      col += vec3f(0.95, 0.97, 1.0) * th * 0.35;
    }
  } else if (isCoronagraph()) {
    col = whiteLight(fc, pv, d, col);
  }
  return vec4f(col, 1.0);
}
`;
