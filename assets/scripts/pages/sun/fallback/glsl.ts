/* GLSL ES 3.00 for the WebGL2 fallback (webgl2.ts): the star image per view, the traced field lines, the bloom
 * chain and the tone map. Ports of shaders/star.ts, shaders/noise.ts, shaders/post.ts and site/gpu/bloom.ts without
 * what needs compute: the surface flow, the Parker wind, the loop layer, CMEs and disturbances. The field maps
 * become the dipole sum per pixel (uniform arrays) and a coarse CPU chart (fieldtrace.ts). Keep the formulas in
 * step with those files; tables and counts come from the same TS constants. */

import { MAX_DIPOLES } from '../field';
import { AIA_RESPONSE } from '../views';
import { CHART_DEPTH_MAX_RAD } from './fieldtrace';

/** The EUV corona's line-of-sight reach, R (cmes.ts QUIET_MARCH_R: no CMEs here, so always the quiet one). */
const QUIET_MARCH_R = 2.6;
/** Network pattern frequency per radius at the Sun's granulation scale: shaders/flow.ts's tracer source (fbm3 at 28). */
const NETWORK_FREQUENCY = 28;

/** A number as a GLSL float literal (an integer literal would be an int and fail to type-check). */
const glslFloat = (n: number): string => (Number.isInteger(n) ? n.toFixed(1) : String(n));

/** The AIA responses from views.ts's table, as views.ts aiaResponseWgsl() does for WGSL. */
function aiaResponseGlsl(): string {
  const branch = (view: number): string => (AIA_RESPONSE[view] ?? [])
    .map(([a, m, s]) => `${glslFloat(a)} * gauss((l - (${glslFloat(m)})) / ${glslFloat(s)})`).join(' + ') || '0.0';
  return `float gauss(float x) { return exp(-x * x); }
float resp(float T, int view) {
  float l = log2(max(T, 0.01)) * 0.30103;
  switch (view) {
${[0, 1, 2, 3, 4].map((v) => `    case ${v}: return ${branch(v)};`).join('\n')}
    default: return 0.0;
  }
}
`;
}

/** Every program's preamble. An RGBA8 scene (no EXT_color_buffer_float) stores c / (1 + c), so it keeps the
 *  highlights; the passes that read the scene decode it. */
function header(isLdrScene: boolean): string {
  return `#version 300 es
precision highp float;
precision highp sampler2D;
#define SCENE_LDR ${isLdrScene ? 1 : 0}
vec3 encodeScene(vec3 c) { return SCENE_LDR == 1 ? c / (1.0 + c) : c; }
vec3 decodeScene(vec3 e) { return SCENE_LDR == 1 ? e / max(1.0 - e, 1e-3) : e; }
float ss(float a, float b, float x) { float t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
float hash12(vec2 p) { vec3 p3 = fract(p.xyx * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
`;
}

// shaders/noise.ts, bit for bit (ss and hash12 are in the header)
const NOISE = /* glsl */ `
vec2 hash22(vec2 p) { vec3 p3 = fract(p.xyx * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vnoise(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), f.x), f.y); }
float wav3(vec3 p0) {
  vec3 p = p0 + 0.9 * sin(p0.zxy * 0.47 + vec3(1.3, 2.1, 0.7));
  float a = sin(dot(p, vec3(0.913, 0.271, 0.305))) + sin(dot(p, vec3(-0.402, 0.871, 0.282)) + 1.7)
          + sin(dot(p, vec3(0.188, -0.517, 0.835)) + 4.1) + sin(dot(p, vec3(-0.731, -0.373, -0.571)) + 2.3);
  vec3 q = p * 2.137 + vec3(3.1, 1.3, 5.7);
  float b = sin(dot(q, vec3(0.613, 0.711, -0.345))) + sin(dot(q, vec3(-0.866, 0.121, 0.485)) + 0.9)
          + sin(dot(q, vec3(0.231, -0.902, -0.364)) + 2.6) + sin(dot(q, vec3(0.104, 0.338, 0.935)) + 5.2);
  return 0.5 + (a * 0.6 + b * 0.4) * 0.125;
}
`;

// shaders/cme.ts CORONAL_DENSITY_WGSL
const CORONAL_DENSITY = /* glsl */ `
const float DENSITY_TAIL = 0.0569;
float baumbachN(float rr) { return (1.55 * pow(rr, -6.0) + 2.99 * pow(rr, -16.0) + DENSITY_TAIL / (rr * rr)) / 4.58; }
float baumbachColumn(float d) { return (1.55 * 1.1781 * pow(d, -5.0) + 2.99 * 0.6581 * pow(d, -15.0) + DENSITY_TAIL * 3.14159265 / d) / 4.58; }
`;

const ROT_Y = /* glsl */ `
vec3 rotY(float a, vec3 v) { float c = cos(a); float s = sin(a); return vec3(c * v.x + s * v.z, v.y, -s * v.x + c * v.z); }
`;

export const FULLSCREEN_VERTEX = /* glsl */ `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

/** The star image for one view (shaders/star.ts fs with VIEW fixed). The uniforms are set by webgl2.ts drawStar. */
export function starFragment(viewIndex: number, isLdrScene: boolean): string {
  return header(isLdrScene) + NOISE + CORONAL_DENSITY + ROT_Y + aiaResponseGlsl() + /* glsl */ `
#define VIEW ${viewIndex}
#define MAX_DIPOLES ${MAX_DIPOLES}
const float PI = 3.14159265; const float TAU = 6.2831853;
const float QUIET_MARCH_R = ${glslFloat(QUIET_MARCH_R)};
uniform vec2 uRes; uniform vec2 uCentre; uniform vec2 uMouse;
uniform float uRadius; uniform float uT; uniform float uRot; uniform float uThetaE;
uniform float uExpo; uniform float uActivity; uniform float uGran; uniform float uCarpet;
uniform vec3 uTcor; uniform vec3 uBb; uniform vec3 uTint;
uniform vec4 uDisc; uniform vec4 uDisc2;
uniform float uLimbAbs; uniform float uShellH; uniform float uWz; uniform float uOcculter; uniform float uRenderScale;
uniform vec3 uStriation;   // the two wrapped striation displacements (R) and the first one's weight
uniform vec3 uBelt; uniform vec3 uWhite;   // views.ts WHITE_LIGHT: belt base, amplitude, string fraction; exposure, F-corona level, slope
uniform vec4 uSpot; uniform vec3 uLimbRgb;
uniform vec4 uDipolePos[MAX_DIPOLES]; uniform vec4 uDipoleMoment[MAX_DIPOLES]; uniform float uBref;
uniform sampler2D uChart;
out vec4 outColor;

// ---- the field: the dipole sum (shaders/field.ts dipoleSum) and the CPU chart ---------------------------------
vec3 dipoleField(int i, vec3 p) {
  vec3 r = p - uDipolePos[i].xyz; float ir = inversesqrt(max(dot(r, r), 1e-4)); vec3 h = r * ir; vec3 m = uDipoleMoment[i].xyz;
  return (3.0 * dot(m, h) * h - m) * ir * ir * ir;
}
vec3 dipoleSum(vec3 p) {
  vec3 b = vec3(0.0);
  for (int i = 0; i < MAX_DIPOLES; i++) { if (uDipolePos[i].w >= 0.5) { b += dipoleField(i, p); } }
  return b;
}
struct Chart { float open; float bMag; float belt; float depth; };
Chart chartAt(vec3 d) {
  vec4 c = texture(uChart, vec2(atan(d.x, d.z) / TAU + 0.5, asin(clamp(d.y, -1.0, 1.0)) / PI + 0.5));
  return Chart(c.r, c.g, c.b * 2.0 - 1.0, c.a * ${glslFloat(CHART_DEPTH_MAX_RAD)});   // fieldtrace.ts's encoding
}

// ---- sky ---------------------------------------------------------------------------------------------------------
vec3 starLayer(vec2 uv, float density, float seed, float brightness) {
  vec2 g = uv * density; vec2 cell = floor(g); vec3 col = vec3(0.0);
  float px = 1.0 / uRes.y;
  for (int y = -1; y <= 1; y++) { for (int x = -1; x <= 1; x++) {
    vec2 c = cell + vec2(float(x), float(y));
    if (hash12(c * 1.7 + seed + 9.1) < 0.84) { continue; }
    float dd = length(g - (c + 0.15 + hash22(c + seed) * 0.7)) / density;
    float mag = pow(hash12(c + seed + 3.3), 3.0);
    float size = max(0.0007 + mag * 0.0022, max(2.4 * uRenderScale, 1.6) * px);
    float warm = step(0.82, hash12(c + seed + 7.7));
    col += mix(vec3(0.90, 0.93, 1.0), vec3(0.95, 0.72, 0.30), warm) * exp(-(dd / size) * (dd / size) * 2.0) * (0.22 + mag) * brightness;
  } }
  return col;
}
vec3 sky(vec2 uv, vec2 par) {
  return starLayer(uv + par * 0.35, 30.0, 1.0, 0.70) + starLayer(uv + par * 0.70, 70.0, 2.0, 0.40)
    + vec3(0.08, 0.09, 0.13) * 0.25 * vnoise(uv * 3.0 + par + vec2(1.7, 0.3)) * vnoise(uv * 7.0 - par * 0.5);
}

// ---- corona model ------------------------------------------------------------------------------------------------
float striationAt(float rco, float wavFine, float phase) {
  return 0.75 + 0.55 * (wavFine - 0.5) + 0.25 * sin(rco * 9.0 + phase * TAU);
}
struct Plasma { float n; float T; };
Plasma coronaAt(vec3 p, float rr, Chart c) {
  vec3 d = p / rr;
  float bn = clamp(c.bMag * 32.0 / (rr * rr * rr), 0.0, 3.0);
  float density = baumbachN(rr);
  float structure = 1.0;
  if (VIEW < 5) {
    if (uDisc2.x > 0.0) { density = exp(-(rr - 1.0) / (uDisc2.x * rr)); }
    // no Parker grid here: the striations drift at one speed, slower over closed field, in two cross-faded phases
    float drift = mix(0.3, 1.0, c.open);
    float fine = wav3(d * 22.0); float phase = wav3(d * 9.0);
    structure = mix(striationAt(rr - uStriation.y * drift, fine, phase), striationAt(rr - uStriation.x * drift, fine, phase), uStriation.z);
  }
  float n = max(density * mix(1.0, 0.55, c.open) * (0.6 + 0.6 * bn) * structure * sqrt(0.6 + 0.6 * uActivity), 0.0);
  return Plasma(n, mix(uTcor.y, uTcor.x, c.open) + (uTcor.z - uTcor.y) * clamp(bn * 0.5, 0.0, 1.0));
}

// ---- the disc ----------------------------------------------------------------------------------------------------
vec3 ramp(float v0, vec3 tint) {
  float v = max(v0, 0.0);
  return mix(tint * pow(v, 1.15) * 0.95, vec3(1.0, 0.98, 0.94), ss(0.85, 1.6, v));
}
float pxPerR;
float lodOf(float freq) { return ss(1.5, 3.0, pxPerR * 2.94 / freq); }
float wavLod(vec3 p, float freq) {
  float lod = lodOf(freq);
  if (lod <= 0.0) { return 0.5; }
  return mix(0.5, wav3(p), lod);
}
float ridgeLod(vec3 p, float freq, float n, float mean) {
  float lod = lodOf(freq);
  if (lod <= 0.0) { return mean; }
  return mix(mean, pow(1.0 - abs(2.0 * wav3(p) - 1.0), n), lod);
}
// stands in for the surface flow's network tracer (shaders/flow.ts): its source pattern at its scale, unadvected,
// stretched to the tracer's contrast and a little above its mean (the flow piles the dye up in the lanes)
float networkAt(vec3 sf) {
  float f = ${glslFloat(NETWORK_FREQUENCY)} / uGran;
  return clamp(0.55 + 2.0 * (wavLod(sf * f + vec3(0.0, 0.0, uT * 0.003), f) - 0.5), 0.0, 1.0);
}
vec3 disc(vec2 pv, float d) {
  float t = uT; float gs = uGran; vec3 tint = uTint;
  float z = sqrt(max(0.0, 1.0 - d * d));
  pxPerR = uRadius * max(z, 0.15);
  vec3 sf = rotY(-uRot, vec3(pv, z));
  // shaders/field.ts surfaceMap: B at r = 1 in bref units, and the radial field less the global dipole
  vec3 Bs = clamp(dipoleSum(sf) / uBref, vec3(-4.0), vec3(4.0));
  float Br = dot(Bs, sf); float BrA = dot(Bs - dipoleField(0, sf) / uBref, sf);
  float net = networkAt(sf);
  float lane0 = pow(1.0 - abs(2.0 * net - 1.0), 2.0);
  float Bc = uCarpet * (wavLod(sf * 38.0 / gs + vec3(0.0, 0.0, t * 0.01), 38.0 / gs) - 0.5) * 2.0 * (0.4 + 1.2 * lane0);
  if (VIEW == 6) {
    vec3 Bv = rotY(uRot, Bs);
    float m = (Bv.z + Bc * z) * 1.4 + 0.04 * (wavLod(sf * 120.0, 120.0) - 0.5);
    return vec3(clamp(0.5 + m, 0.0, 1.0)) * 0.9 * (0.75 + 0.25 * z);
  }
  float Bu = abs((VIEW < 5 ? BrA : Br) + 0.6 * Bc) + 0.12 * abs(Bc);
  vec3 Bh = Bs - Br * sf; vec3 bh = Bh / max(length(Bh), 1e-5);
  float fs = clamp(uRadius / 420.0, 0.35, 1.0);
  float fine = wavLod(sf * 110.0 * fs / gs - vec3(t * 8.0), 110.0 * fs / gs);
  vec3 ps3 = sf * 70.0 / gs; vec3 fibP = ps3 - bh * dot(ps3, bh) * 0.92;
  float fib = ridgeLod(fibP + vec3(t * 0.05), 70.0 / gs, 4.0, 0.478) * ss(0.08, 0.5, Bu);
  if (VIEW == 5) {
    float gran = 0.93 + 0.07 * fine + 0.03 * (net - 0.5);
    float spotK = 0.6 + 0.4 * pow(uActivity, 0.35);
    float spotB = abs(Br) * spotK;
    float umbra = ss(1.0, 1.45, spotB);
    float penum = ss(0.6, 1.0, spotB) * (1.0 - umbra);
    float umbraLevel = mix(uSpot.x, uSpot.y, ss(1.45, 2.6, spotB));
    float penumLevel = clamp(uSpot.z - 0.08 + 0.16 * fib, 0.0, 1.0);
    float facula = ss(0.12, 0.4, spotB) * (1.0 - ss(0.5, 0.75, spotB)) * uSpot.w * 1.6 * (1.0 - z) * (1.0 - z) * ss(0.0, 0.12, z);
    float v = gran * mix(1.0, umbraLevel, umbra) * mix(1.0, penumLevel, penum) * (1.0 + facula);
    vec3 limb = vec3(1.0) - uLimbRgb * (1.0 - z);
    return uBb * limb * v * 1.25;
  }
  float openF = ss(0.20, 0.50, chartAt(sf).depth);
  float plage = clamp(pow(Bu, 0.8), 0.0, 1.6);
  float lanes = pow(1.0 - abs(2.0 * net - 1.0), 6.0) * 0.55 + 0.25 * ridgeLod(sf * 46.0 * fs / gs + vec3(t * 0.03), 46.0 * fs / gs, 3.0, 0.553);
  float mott = 0.26 + 0.50 * net * uDisc2.y + 0.26 * lanes * uDisc2.z + 0.06 * fine * uDisc2.w;
  float brn = Br / 0.02;
  float pil = exp(-brn * brn) * ss(0.2, 0.5, length(Bh)) * ss(0.60, 0.70, wav3(sf * 2.6 + vec3(4.0))) * ss(0.45, 0.62, wav3(sf * 7.0 + vec3(1.0)));
  float channel = clamp(pil * 1.3, 0.0, 1.0) * (1.0 - ss(0.7, 1.2, Bu));
  float unresolved = uDisc.x * pow(max(mott, 0.0) / 0.6, uDisc.y);
  if (VIEW == 3) {
    float v = (0.30 + 0.75 * net + 0.35 * lanes + 0.12 * fine + 0.55 * plage + 0.35 * fib * plage) * (1.0 - 0.75 * channel) * (1.0 - 0.2 * openF) * 0.85 * unresolved;
    return mix(ramp(v, tint), vec3(0.35, 0.08, 0.02), 0.5 * channel);
  }
  float flick = 0.8 + 0.4 * wavLod(sf * 60.0 * fs + vec3(t * 0.9), 60.0 * fs);
  float Tlow = uTcor.y + (uTcor.z - uTcor.y) * clamp(Bu - 0.4, 0.0, 1.0);
  float emis = plage * (0.5 + 0.6 * resp(Tlow, VIEW) + 0.5 * resp(uTcor.y, VIEW)) + 0.3 * fib * plage;
  float qr = max(resp(uTcor.y, VIEW), max(resp(uTcor.y * 0.72, VIEW), 0.6 * resp(uTcor.y * 1.4, VIEW)));
  float base = (VIEW == 4 ? 0.10 + 0.16 * mott : mott * 0.45 * (0.45 + 0.55 * qr)) * unresolved;
  float v = base + (0.55 * emis + 0.4 * flick * ss(1.0, 1.5, Bu) * resp(Tlow, VIEW)) * sqrt(uExpo) - 0.5 * channel;
  v *= 1.0 - (VIEW == 4 ? 0.45 : 0.62) * openF;
  return ramp(v, tint);
}

// ---- EUV corona: line-of-sight emission measure times the channel response, plus the transition-region shell ----
vec3 euvCorona(vec2 fc, vec2 pv, float d, vec2 q, float r) {
  vec3 tint = uTint; float t = uT;
  float em = 0.0;
  if (d < QUIET_MARCH_R) {
    float zFar = sqrt(max(QUIET_MARCH_R * QUIET_MARCH_R - d * d, 0.0));
    float zNear = d < 1.0 ? sqrt(max(0.0, 1.0 - d * d)) : -zFar;
    const int steps = 12;
    float dz = (zFar - zNear) / float(steps);
    float jit = (fract(52.9829189 * fract(dot(fc, vec2(0.06711056, 0.00583715)))) - 0.5) * 0.2;
    float farAtt = d >= 1.0 ? exp(-uLimbAbs * exp(-(d - 1.0) / 0.006)) : 1.0;
    for (int k = 0; k < steps; k++) {
      float zz = zFar - (float(k) + 0.5 + jit) * dz;
      vec3 p3 = rotY(-uRot, vec3(pv, zz)); float rr = length(p3);
      Plasma pl = coronaAt(p3, rr, chartAt(p3 / rr));
      em += pl.n * pl.n * resp(pl.T, VIEW) * dz * (zz < 0.0 ? farAtt : 1.0);
    }
  }
  float e = max(d - 1.0, 0.0);
  float hs = uShellH; float o2 = (1.0 + hs) * (1.0 + hs) - d * d;
  float shell = 0.0;
  if (o2 > 0.0) {
    shell = (d < 1.0 ? sqrt(o2) - sqrt(max(0.0, 1.0 - d * d)) : sqrt(o2) * (1.0 + exp(-uLimbAbs * exp(-e / 0.006)))) / hs * 0.1;
  }
  if (VIEW == 3) {
    vec2 qd = q / max(r, 1e-5);
    hs *= 0.45 + 1.1 * wav3(vec3(qd * 55.0, t * 0.15)) * (0.6 + 0.8 * wav3(vec3(qd * 9.0, 3.0)));
    o2 = (1.0 + hs) * (1.0 + hs) - d * d;
    if (o2 > 0.0) {
      float Lp = d < 1.0 ? sqrt(o2) - sqrt(max(0.0, 1.0 - d * d)) : 2.0 * sqrt(o2);
      shell = d < 1.0 ? 0.0 : 0.6 * (1.0 - exp(-Lp / (0.5 * hs))) * ss(1.0 + hs, 1.0 + 0.6 * hs, d);
    }
  }
  float emChrom = shell * (VIEW == 3 ? 1.2 : 0.35 * resp(0.4, VIEW) + 0.25);
  float corona = em * (VIEW == 1 ? 4.5 : 7.5) * (VIEW == 3 ? 0.25 : 1.0) * uExpo * uDisc.z + emChrom * uDisc.w;
  vec3 hue = VIEW == 3 ? tint : mix(tint, mix(tint, vec3(1.0), 0.5), exp(-e * 6.0));
  return hue * corona;
}

// ---- white-light corona (C2, C3): Thomson-scattered K corona, streamer belt, F corona, occulter --------------------
vec3 whiteLight(vec2 fc, vec2 pv, float d, vec3 col0) {
  bool wide = VIEW == 8;
  float kz = wide ? uWz : 1.0; float dd = d * kz; vec2 pz = pv * kz;
  float rb = wide ? 150.0 : 40.0;   // line-of-sight half-length, R (star.ts: max(marchR, 40), marchR <= 12 in C2)
  vec3 wl = uBb / max(max(uBb.r, uBb.g), max(uBb.b, 1e-4));
  float occR = uOcculter;
  float cover = ss(occR, occR - 0.06 * kz, dd);
  vec3 col = col0;
  if (dd < occR + 0.1 * kz) { col *= 1.0 - cover; }
  if (dd < occR - 0.06 * kz || dd >= rb) { return col; }
  float zFar = sqrt(max(rb * rb - dd * dd, 0.0));
  float thQ = 0.0;
  for (int k = 0; k < 40; k++) {
    float s01 = (float(k) + hash12(floor(fc) + vec2(float(k) * 1031.0, float(k) * 2713.0))) / 40.0 * 2.0 - 1.0;
    float zz = zFar * s01 * abs(s01);
    float wz = 2.0 * zFar * abs(s01) * 2.0 / 40.0;
    vec3 p3 = rotY(-uRot, vec3(pz, zz)); float rr = length(p3);
    Chart c = chartAt(p3 / rr);
    Plasma pl = coronaAt(p3, rr, c);
    float wBelt = mix(0.30, 0.12, ss(1.3, 3.0, rr));
    thQ += pl.n * (uBelt.x + uBelt.y * exp(-c.belt * c.belt / (wBelt * wBelt))) * wz;
  }
  // the strings' share of the electrons: the WebGPU build spreads it over its open tubes, nearly a plain Baumbach
  // column, so here that column broken into rays by a ridged wav3 on the sky-plane direction, turning with the star
  thQ *= 1.0 - uBelt.z;
  vec3 skyDir = normalize(rotY(-uRot, vec3(pz, 0.0)));
  float rays = 0.55 + 0.9 * ss(0.3, 0.75, wav3(skyDir * 30.0 + vec3(0.0, 0.0, log(dd) * 1.5)));
  float colB = baumbachColumn(dd);
  float b = 0.32 * (thQ / max(colB, 1e-9) + uBelt.z * rays) / sqrt(max(uActivity, 1.0)) * pow(occR / dd, 0.3);
  b += uWhite.y * pow(dd / 5.0, uWhite.z);
  b = b / (1.0 + 0.25 * b);
  float x = 1.0 - exp(-1.3 * b * uWhite.x);
  vec3 wlF = wl * vec3(1.0, 0.92, 0.80); wlF /= max(wlF.r, max(wlF.g, wlF.b));
  vec3 wlr = mix(wl, wlF, 0.7 * ss(2.5, 8.0, dd));
  return col * (1.0 - 0.7 * x) + wlr * x * (1.0 - cover);
}

void main() {
  vec2 fc = gl_FragCoord.xy;
  vec2 p = (fc - 0.5 * uRes) / uRes.y;
  float R = uRadius / uRes.y;
  vec2 par = uMouse * 0.012;
  vec2 c = (uCentre - 0.5 * uRes) / uRes.y;
  vec2 q = p - c; float r = length(q); vec2 pv = q / R; float d = r / R;
  bool drawsDisc = VIEW < 7;
  bool discOpaque = drawsDisc && d < 1.0 - 2.0 / uRadius;
  vec3 col = vec3(0.0);
  if (!discOpaque) {
    float thetaE = R * uThetaE;
    vec2 src = p - q * (thetaE * thetaE) / (dot(q, q) + 1e-5);
    col = sky(src, par) * (1.0 - 0.45 * ss(0.35, 1.0, length(p)));
  }
  if (drawsDisc && d < 1.0) { col = mix(col, disc(pv, d), ss(1.0, 1.0 - 2.0 / uRadius, d)); }
#if VIEW < 5
  col += euvCorona(fc, pv, d, q, r);
#elif VIEW == 5
  col += uBb * 0.05 * exp(-max(d - 1.0, 0.0) * 2.0);
#elif VIEW >= 7
  col = whiteLight(fc, pv, d, col);
#endif
  outColor = vec4(encodeScene(col), 1.0);
}`;
}

/** Traced field lines (fieldtrace.ts segments), additive into the scene. Star frame in, view = rotY(rotation).
 *  A closed loop's apex temperature rises over strong field (coronaAt's law) and runs through a nanoflare cycle of
 *  its own, cooling and filling (shaders/strings.ts euvLoop), so loops come and go in each channel. */
export const LINE_VERTEX = `#version 300 es
precision highp float;
` + ROT_Y + /* glsl */ `
in vec4 aNode;    // star-frame position (R), the foot's |B| / bref
in float aSeed;   // per line, 0..1
uniform vec2 uRes; uniform vec2 uCentre; uniform float uRadiusPx; uniform float uRot; uniform float uT; uniform vec3 uTcor;
out vec3 vQ; out float vR; out float vWeight; out float vT; out float vCooling;
void main() {
  vec3 q = rotY(uRot, aNode.xyz);
  vQ = q; vR = length(aNode.xyz); vWeight = aNode.w;
  float apex = uTcor.y + (uTcor.z - uTcor.y) * clamp(aNode.w * 0.5, 0.0, 1.0);
  float cycle = 0.15 + 0.45 * aSeed;   // anim units: the strings' 1000-4000 s
  vT = apex * (0.45 + 0.55 * exp(-fract(uT / cycle + aSeed * 7.31) / 0.35));
  vCooling = sqrt(apex / vT);
  gl_Position = vec4((uCentre + q.xy * uRadiusPx) / uRes * 2.0 - 1.0, 0.0, 1.0);
}`;

/** EUV: closed loops lit as n^2 R(T), n at the loop temperature's scale height; coronagraphs: open lines, a faint
 *  constant white past the occulter. */
export function lineFragment(isLdrScene: boolean): string {
  return header(isLdrScene) + aiaResponseGlsl() + /* glsl */ `
uniform int uView; uniform vec3 uColor; uniform float uExpo; uniform float uLimbAbs; uniform float uGain; uniform float uOcculter;
in vec3 vQ; in float vR; in float vWeight; in float vT; in float vCooling;
out vec4 outColor;
void main() {
  float pr = length(vQ.xy);
  if (uView >= 7) {
    if (pr < uOcculter) { discard; }
    outColor = vec4(encodeScene(uColor * uGain * ss(uOcculter, uOcculter * 1.2, pr)), 1.0);
    return;
  }
  if (vQ.z < 0.0 && pr < 1.0) { discard; }
  float n = vCooling * exp(-max(vR - 1.0, 0.0) / (0.0675 * vT));
  float absorbed = vQ.z < 0.0 ? exp(-uLimbAbs * exp(-(pr - 1.0) / 0.006)) : 1.0;
  float intensity = uGain * sqrt(vWeight) * n * n * resp(vT, uView) * uExpo * absorbed;
  outColor = vec4(encodeScene(uColor * intensity), 1.0);
}`;
}

// site/gpu/bloom.ts: 13-tap downsample (Karis-averaged and soft-thresholded on the first level), 3x3 tent upsample
const BLOOM_COMMON = /* glsl */ `
uniform sampler2D uSrc; uniform vec2 uTexel; uniform float uThreshold; uniform float uKnee; uniform float uRadius;
in vec2 vUv;
out vec4 outColor;
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float karis(vec3 c) { return 1.0 / (1.0 + luma(c)); }
`;

function down13(isFirst: boolean): string {
  return /* glsl */ `
vec3 tap(vec2 uv) { return ${isFirst ? 'decodeScene(texture(uSrc, uv).rgb)' : 'texture(uSrc, uv).rgb'}; }
vec3 down13(vec2 uv) {
  vec2 t = uTexel;
  vec3 a = tap(uv + t * vec2(-2.0, -2.0)); vec3 b = tap(uv + t * vec2(0.0, -2.0)); vec3 c = tap(uv + t * vec2(2.0, -2.0));
  vec3 d = tap(uv + t * vec2(-2.0, 0.0)); vec3 e = tap(uv); vec3 f = tap(uv + t * vec2(2.0, 0.0));
  vec3 g = tap(uv + t * vec2(-2.0, 2.0)); vec3 h = tap(uv + t * vec2(0.0, 2.0)); vec3 i = tap(uv + t * vec2(2.0, 2.0));
  vec3 j = tap(uv + t * vec2(-1.0, -1.0)); vec3 k = tap(uv + t * vec2(1.0, -1.0)); vec3 l = tap(uv + t * vec2(-1.0, 1.0)); vec3 m = tap(uv + t * vec2(1.0, 1.0));
  vec3 g0 = (j + k + l + m) * 0.25; vec3 g1 = (a + b + d + e) * 0.25; vec3 g2 = (b + c + e + f) * 0.25;
  vec3 g3 = (d + e + g + h) * 0.25; vec3 g4 = (e + f + h + i) * 0.25;
${isFirst ? `  float w0 = karis(g0) * 0.5; float w1 = karis(g1) * 0.125; float w2 = karis(g2) * 0.125; float w3 = karis(g3) * 0.125; float w4 = karis(g4) * 0.125;
  return (g0 * w0 + g1 * w1 + g2 * w2 + g3 * w3 + g4 * w4) / (w0 + w1 + w2 + w3 + w4);` : '  return g0 * 0.5 + (g1 + g2 + g3 + g4) * 0.125;'}
}
`;
}

export function bloomFirstFragment(isLdrScene: boolean): string {
  return header(isLdrScene) + BLOOM_COMMON + down13(true) + /* glsl */ `
void main() {
  vec3 c = down13(vUv);
  float l = luma(c);
  float soft = clamp(l - uThreshold + uKnee, 0.0, 2.0 * uKnee);
  float w = max(soft * soft / (4.0 * uKnee + 1e-5), l - uThreshold) / max(l, 1e-5);
  outColor = vec4(c * w, 1.0);
}`;
}

export function bloomDownFragment(isLdrScene: boolean): string {
  return header(isLdrScene) + BLOOM_COMMON + down13(false) + /* glsl */ `
void main() { outColor = vec4(down13(vUv), 1.0); }`;
}

export function bloomUpFragment(isLdrScene: boolean): string {
  return header(isLdrScene) + BLOOM_COMMON + /* glsl */ `
vec3 tap(vec2 uv) { return texture(uSrc, uv).rgb; }
void main() {
  vec2 t = uRadius * uTexel;
  vec3 s = tap(vUv) * 4.0;
  s += (tap(vUv + vec2(-t.x, 0.0)) + tap(vUv + vec2(t.x, 0.0)) + tap(vUv + vec2(0.0, -t.y)) + tap(vUv + vec2(0.0, t.y))) * 2.0;
  s += tap(vUv + vec2(-t.x, -t.y)) + tap(vUv + vec2(t.x, -t.y)) + tap(vUv + vec2(-t.x, t.y)) + tap(vUv + vec2(t.x, t.y));
  outColor = vec4(s / 16.0, 1.0);
}`;
}

/** shaders/post.ts tonemap: bloom added in linear light, Narkowicz's ACES fit, gamma 0.95, static dither. */
export function tonemapFragment(isLdrScene: boolean): string {
  return header(isLdrScene) + /* glsl */ `
uniform sampler2D uScene; uniform sampler2D uGlow; uniform float uBloom;
in vec2 vUv;
out vec4 outColor;
void main() {
  vec3 c = decodeScene(texelFetch(uScene, ivec2(gl_FragCoord.xy), 0).rgb) + texture(uGlow, vUv).rgb * uBloom;
  c = max(c, vec3(0.0));
  c = (c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14);
  c = pow(c, vec3(0.95));
  outColor = vec4(c + (hash12(gl_FragCoord.xy) - 0.5) * 0.003, 1.0);
}`;
}
