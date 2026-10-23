/* GLSL ES 3.00 for the WebGL2 fallback (webgl2.ts): a port of ../shaders.ts, program for program, and of
 * site/gpu/bloom.ts. Keep it in step with shaders.ts: every formula here is that file's, and the sizes, the
 * blackbody fit and the band edges are interpolated from the same exports, so only the code needs porting.
 *
 * The compute passes become fragment passes: field draws its gas rows and its two table rows into the 512 x 256
 * field target, trace writes its four rgba32float targets as one 4-output pass. What has no WebGL2 form is left
 * out: meter (a workgroup reduction) is gone, so the exposure is sim.ts's CPU seed alone.
 *
 * Orientation: GL's window y runs up, WebGPU's down. trace's screen offset (res.y - id.y - 0.5) is exactly
 * gl_FragCoord.y, and every target is written and read in GL's order, so the image only flips once, on the way
 * to the canvas, where the browser expects it. Params is a std140 uniform block, which lays the 24 floats out as
 * WGSL's uniform struct does, so sim.ts's Float32Array uploads unchanged. */

import { BAND_EDGES, BB_CHEBYSHEV } from '../blackbody';
import { ARM_LIFE_M, FIELD_HEIGHT, FIELD_WIDTH, GAS_ROWS } from '../layout';

const CHROMA_ROW = GAS_ROWS, LOG_Y_ROW = GAS_ROWS + 1;
/** The clock texture's width: shaders.ts gasClock, a phase per gas row then (cycle, age) for six arms. */
export const CLOCK_TEXELS = GAS_ROWS + 12;
/** The rows of the field target the tables pass draws (shaders.ts tables: chroma, then log intensity). */
export const TABLE_ROW = CHROMA_ROW;

const f = (v: number): string => v.toPrecision(10);

const HEADER = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
`;

export const FULLSCREEN_VERTEX = /* glsl */ `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

// shaders.ts params
const PARAMS = /* glsl */ `
layout(std140) uniform Params {
  vec2 res; vec2 center;
  float pxPerM; float inc; float spin; float risco;
  float rout; float hr; float t0; float slope;
  float beam; float band; float spinLens; float expo;
  float skyZoom; float bloom; float gasL0; float gasL1;
  vec2 skyDrift; vec2 skyParallax;
} P;
const float PI = 3.14159265; const float TAU = 6.2831853; const float SHADOW_SCHW = 5.1961524;
float sstep(float a, float b, float x) { float t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
float kappa(float rc) { return 14.0 * pow(P.risco / rc, 1.5); }
float pageThorneQ(float r) {
  float a = max(P.spin, 1e-4); float x = sqrt(r); float x0 = sqrt(P.risco);
  if (x <= x0) { return 0.0; }
  float th = acos(a) / 3.0;
  vec3 xr = vec3(2.0 * cos(th - PI / 3.0), 2.0 * cos(th + PI / 3.0), -2.0 * cos(th));
  float br = x - x0 - 1.5 * a * log(x / x0);
  for (int i = 0; i < 3; i++) {
    float xi = xr[i]; float xj = xr[(i + 1) % 3]; float xk = xr[(i + 2) % 3];
    br -= 3.0 * (xi - a) * (xi - a) / (xi * (xi - xj) * (xi - xk)) * log((x - xi) / (x0 - xi));
  }
  return max(0.0, x * x / (x * x * x - 3.0 * x + 2.0 * a) * br);
}
float tempAt(float rc, float sig) { return P.t0 * pow(rc, -P.slope) * pow(P.risco, P.slope - 0.75) * pow(pageThorneQ(rc), 0.25) * pow(sig, 0.25); }
float colourCorrection(float T) {
  if (T > 1e5) { return pow(72.0 / (8.617333e-8 * T), 1.0 / 9.0); }
  if (T > 3e4) { return pow(T / 3e4, 0.82); }
  return 1.0;
}
float hash12(vec2 p) { vec3 p3 = fract(p.xyx * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float wav3(vec3 p0) {
  vec3 p = p0 + 0.9 * sin(p0.zxy * 0.47 + vec3(1.3, 2.1, 0.7));
  float a = sin(dot(p, vec3(0.913, 0.271, 0.305))) + sin(dot(p, vec3(-0.402, 0.871, 0.282)) + 1.7) + sin(dot(p, vec3(0.188, -0.517, 0.835)) + 4.1) + sin(dot(p, vec3(-0.731, -0.373, -0.571)) + 2.3);
  vec3 q = p * 2.137 + vec3(3.1, 1.3, 5.7);
  float b = sin(dot(q, vec3(0.613, 0.711, -0.345))) + sin(dot(q, vec3(-0.866, 0.121, 0.485)) + 0.9) + sin(dot(q, vec3(0.231, -0.902, -0.364)) + 2.6) + sin(dot(q, vec3(0.104, 0.338, 0.935)) + 5.2);
  return 0.5 + (a * 0.6 + b * 0.4) * 0.125;
}
`;

// shaders.ts skyLib
const SKY_LIB = /* glsl */ `
vec2 hash22(vec2 p) { vec3 p3 = fract(p.xyx * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vnoise(vec2 p) { vec2 i = floor(p); vec2 g = fract(p); g = g * g * (3.0 - 2.0 * g);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), g.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), g.x), g.y); }
vec3 starLayer(vec2 uv, float density, float seed, float brightness, float foot) {
  float resolved = 1.0 - sstep(1.0, 2.5, foot * density);
  vec3 mean = 0.16 * density * density * 1.924e-5 * 0.47 * brightness * vec3(0.908, 0.893, 0.874);
  if (resolved <= 0.0) { return mean; }
  vec2 g = uv * density; vec2 cell = floor(g); vec3 col = vec3(0.0);
  for (int y = -1; y <= 1; y++) { for (int x = -1; x <= 1; x++) {
    vec2 c = cell + vec2(float(x), float(y));
    if (hash12(c * 1.7 + seed + 9.1) < 0.84) { continue; }
    float d = length(g - (c + 0.15 + hash22(c + seed) * 0.7)) / density;
    float mag = pow(hash12(c + seed + 3.3), 3.0);
    float warm = step(0.82, hash12(c + seed + 7.7));
    col += mix(vec3(0.90, 0.93, 1.0), vec3(0.95, 0.72, 0.30), warm) * exp(-pow(d / max(0.0007 + mag * 0.0022, 0.0035), 2.0) * 2.0) * (0.22 + mag) * brightness;
  } }
  return col * resolved + mean * (1.0 - resolved);
}
vec3 sky(vec2 uv, vec2 par, float foot) {
  vec3 c = starLayer(uv + par * 0.35, 30.0, 1.0, 0.70, foot) + starLayer(uv + par * 0.70, 70.0, 2.0, 0.40, foot);
  c += vec3(0.08, 0.09, 0.13) * vnoise(uv * 3.0 + par + vec2(1.7, 0.3)) * vnoise(uv * 7.0 - par * 0.5) * 0.25;
  vec2 bu = uv + par * 0.5;
  float across = dot(bu, vec2(-0.42, 0.91)) - 0.05; float along = dot(bu, vec2(0.91, 0.42));
  float band = exp(-across * across / 0.045);
  float mott = wav3(vec3(bu * 7.0, 1.3)) * 0.6 + wav3(vec3(bu * 19.0, 4.1)) * 0.4;
  c += vec3(0.55, 0.50, 0.46) * band * (0.035 + 0.09 * mott) * (1.0 - sstep(0.02, 0.0, abs(across + 0.03 * sin(along * 5.0))) * 0.75);
  return c + starLayer(bu, 150.0, 7.0, 0.12 + 0.45 * band, foot);
}
`;

// ---- field --------------------------------------------------------------------------------------------------
/** shaders.ts gas, drawn into the field target's rows [0, GAS_ROWS). The clock is an R32F texture, one texel each. */
export const GAS_FRAGMENT = HEADER + PARAMS + /* glsl */ `
uniform sampler2D uClock;
out vec4 outColor;
const float ARM_LIFE = ${ARM_LIFE_M.toFixed(1)};
const float ARM_AMP = 1.2; const float ARM_PITCH = -1.8; const float ARM_WIDTH = 0.35;
float clockAt(int i) { return texelFetch(uClock, ivec2(i, 0), 0).r; }
float spiralSigma(int row, float rc, float phi) {
  float om = 1.0 / (pow(rc, 1.5) + P.spin); float psi = phi - clockAt(row); float sig = 1.0;
  for (int i = 0; i < 6; i++) {
    float fi = float(i); float cyc = clockAt(${GAS_ROWS} + 2 * i); float age = clockAt(${GAS_ROWS + 1} + 2 * i);
    float env = sin(PI * age / ARM_LIFE); env *= env;
    float pitch = ARM_PITCH * (0.8 + 0.4 * fract(fi * 0.618 + cyc * 0.37));
    float ph0 = fi * 2.3999 + 1.7 * cyc + 4.1 * fract(cyc * 0.713);
    float d = phi - om * age - ph0 - pitch * log(rc); d -= TAU * floor(d / TAU + 0.5);
    float x = clamp(abs(d) / (2.5 * ARM_WIDTH * (0.7 + 0.6 * fract(fi * 0.317))), 0.0, 1.0);
    float clump = 0.6 + 0.4 * sin(13.0 * psi + 2.1 * fi + 1.3 * cyc) * sin(7.0 * psi + 2.3 * log(rc) + 0.7 * fi);
    sig += ARM_AMP * env * clump * (0.6 + 0.4 * fract(fi * 0.531 + cyc * 0.29)) * (0.5 + 0.5 * cos(PI * x));
  }
  sig += 0.12 * sin(2.0 * (psi - 0.5 * ARM_PITCH * log(rc)) + 1.0) + 0.08 * sin(3.0 * (psi - 0.8 * ARM_PITCH * log(rc)) + 2.0);
  return max(sig, 0.05);
}
void main() {
  ivec2 id = ivec2(gl_FragCoord.xy);
  float lr = P.gasL0 + (float(id.y) + 0.5) / ${GAS_ROWS}.0 * (P.gasL1 - P.gasL0);
  outColor = vec4(spiralSigma(id.y, exp(lr), ((float(id.x) + 0.5) / ${FIELD_WIDTH}.0 - 0.5) * TAU), 0.0, 0.0, 1.0);
}`;

/** shaders.ts tables, drawn into the field target's two rows from TABLE_ROW: chroma, then log intensity. */
export const TABLES_FRAGMENT = HEADER + PARAMS + /* glsl */ `
out vec4 outColor;
const float BBC[42] = float[42](${BB_CHEBYSHEV.map(f).join(', ')});
float cheb(int sel, float t) { float b0 = 0.0; float b1 = 0.0;
  for (int k = 13; k >= 1; k--) { float v = 2.0 * t * b0 - b1 + BBC[sel * 14 + k]; b1 = b0; b0 = v; }
  return t * b0 - b1 + BBC[sel * 14]; }
float seriesSmall(float x) { float x3 = x * x * x; return x3 / 3.0 - x3 * x / 8.0 + x3 * x * x / 60.0 - x3 * x3 * x / 5040.0 + x3 * x3 * x3 / 272160.0; }
float logQ(float x) { float s = 0.0;
  for (int n = 1; n <= 5; n++) { float fn_ = float(n); s += exp(-(fn_ - 1.0) * x) * (x * x * x / fn_ + 3.0 * x * x / (fn_ * fn_) + 6.0 * x / (fn_ * fn_ * fn_) + 6.0 / (fn_ * fn_ * fn_ * fn_)); }
  return -x * 0.4342945 + log(s) * 0.4342945; }
float logBand(float x0, float x1) {
  if (x1 < 2.0) { return log(max(seriesSmall(x1) - seriesSmall(x0), 1e-30)) * 0.4342945; }
  if (x0 < 2.0) { return log(max(6.4939394 - seriesSmall(x0) - pow(10.0, logQ(x1)), 1e-30)) * 0.4342945; }
  float q0 = logQ(x0); float q1 = logQ(x1); return q0 + log(max(1.0 - pow(10.0, q1 - q0), 1e-6)) * 0.4342945; }
vec3 hardnessRamp(float h) {
  float k = min(floor(h), 4.0); float t = h - k;
  vec3 c[6] = vec3[6](vec3(0.55, 0.05, 0.0), vec3(1.0, 0.45, 0.05), vec3(0.9, 0.85, 0.3), vec3(0.3, 0.9, 0.7), vec3(0.3, 0.6, 1.0), vec3(0.85, 0.9, 1.0));
  return mix(c[int(k)], c[int(k) + 1], t); }
void main() {
  float x = (floor(gl_FragCoord.x) + 0.5) / ${FIELD_WIDTH}.0; float lt = 3.0 + 6.5 * x; float T = pow(10.0, lt); float t = x * 2.0 - 1.0;
  vec3 chroma; float logY;
  if (P.band < 0.5) {
    float xx = 1.438432e-2 / (555e-9 * T);
    logY = 15.354480 - (xx > 15.0 ? xx : log(max(exp(xx) - 1.0, 1e-30))) * 0.4342945 - 6.970942 + cheb(0, t);
    float cx = cheb(1, t); float cy = max(cheb(2, t), 0.02); float X = cx / cy; float Z = (1.0 - cx - cy) / cy;
    vec3 rgb = max(vec3(3.2406 * X - 1.5372 - 0.4986 * Z, -0.9689 * X + 1.8758 + 0.0415 * Z, 0.0557 * X - 0.2040 + 1.0570 * Z), vec3(0.0));
    chroma = rgb / max(max(rgb.r, rgb.g), max(rgb.b, 1e-6));
  } else {
    vec4 lam = P.band < 1.5 ? vec4(${BAND_EDGES[1].map(f).join(', ')}) : vec4(${BAND_EDGES[2].map(f).join(', ')});
    float a = 1.438432e-2 / T;
    float s0 = logBand(a / lam.y, a / lam.x); float s1 = logBand(a / lam.z, a / lam.y); float s2 = logBand(a / lam.w, a / lam.z);
    float sm = max(s0, max(s1, s2)); float e0 = pow(10.0, s0 - sm); float tot = e0 + pow(10.0, s1 - sm) + pow(10.0, s2 - sm);
    logY = -8.555613 + 4.0 * lt + sm + log(tot) * 0.4342945;
    chroma = hardnessRamp(clamp((e0 / tot) / 0.6, 0.0, 1.0) * 5.0);
  }
  outColor = int(gl_FragCoord.y) == ${CHROMA_ROW} ? vec4(chroma, 1.0) : vec4(logY, 0.0, 0.0, 1.0);
}`;

// ---- trace --------------------------------------------------------------------------------------------------
/** shaders.ts trace: one pass, its four storage textures as four outputs. */
export const TRACE_FRAGMENT = HEADER + PARAMS + /* glsl */ `
layout(location = 0) out vec4 outGeo1;
layout(location = 1) out vec4 outGeo2;
layout(location = 2) out vec4 outRing;
layout(location = 3) out vec4 outSky;
float agmK(float k) { float a = 1.0; float g = sqrt(max(1.0 - k * k, 1e-12)); for (int i = 0; i < 6; i++) { float an = 0.5 * (a + g); g = sqrt(a * g); a = an; } return 1.5707963 / a; }
float carlsonRF(float x0, float y0, float z0) { float x = x0; float y = y0; float z = z0;
  for (int i = 0; i < 6; i++) { float l = sqrt(x * y) + sqrt(y * z) + sqrt(z * x); x = 0.25 * (x + l); y = 0.25 * (y + l); z = 0.25 * (z + l); }
  float mu = (x + y + z) / 3.0; float X = 1.0 - x / mu; float Y = 1.0 - y / mu; float Z = 1.0 - z / mu; float E2 = X * Y - Z * Z; float E3 = X * Y * Z;
  return (1.0 - E2 / 10.0 + E3 / 14.0 + E2 * E2 / 24.0 - 3.0 * E2 * E3 / 44.0) * inversesqrt(mu); }
struct Orbit { float u1; float u2; float s; float c; float K; float zExit; float alpha; vec4 cq; vec2 cq2; };
Orbit orbitOf(float b) { Orbit o;
  float qc = 1.0 / (2.0 * b * b) - 1.0 / 108.0; float th = acos(clamp(-108.0 * qc, -1.0, 1.0)) / 3.0;
  float t1 = cos(th - 2.0943951) / 3.0; float t2 = cos(th - 4.1887902) / 3.0; float u3 = cos(th) / 3.0 + 1.0 / 6.0;
  o.u1 = min(t1, t2) + 1.0 / 6.0; o.u2 = max(t1, t2) + 1.0 / 6.0;
  float k2 = (o.u2 - o.u1) / (u3 - o.u1); float k = sqrt(k2); float kp = sqrt(max(1.0 - k2, 1e-12));
  o.K = agmK(k); float q = exp(-PI * agmK(kp) / o.K);
  o.s = sqrt((u3 - o.u1) * 0.5);
  float sp = sqrt(clamp(-o.u1 / (o.u2 - o.u1), 0.0, 1.0)); float cp = sqrt(1.0 - sp * sp);
  o.c = sp * carlsonRF(cp * cp, 1.0 - k2 * sp * sp, 1.0);
  o.zExit = 2.0 * o.K - o.c; o.alpha = (2.0 * o.K - 2.0 * o.c) / o.s - PI;
  float q1 = sqrt(q); float q3 = q1 * q; float q5 = q3 * q; float q7 = q5 * q; float q9 = q7 * q; float q11 = q9 * q;
  o.cq = vec4(q1 / (1.0 - q1 * q1), q3 / (1.0 - q3 * q3), q5 / (1.0 - q5 * q5), q7 / (1.0 - q7 * q7)) * (TAU / (k * o.K));
  o.cq2 = vec2(q9 / (1.0 - q9 * q9), q11 / (1.0 - q11 * q11)) * (TAU / (k * o.K));
  return o; }
float orbitU(Orbit o, float ph) { float z = o.s * ph + o.c; if (z > o.zExit) { return -1.0; }
  float w = 1.5707963 * z / o.K;
  float sn = o.cq.x * sin(w) + o.cq.y * sin(3.0 * w) + o.cq.z * sin(5.0 * w) + o.cq.w * sin(7.0 * w) + o.cq2.x * sin(9.0 * w) + o.cq2.y * sin(11.0 * w);
  return o.u1 + (o.u2 - o.u1) * sn * sn; }
float deflection(float b) {
  if (b > 24.0) { float u = 1.0 / b; return u * (4.0 + u * (11.780972 + u * (42.666667 + u * (170.09180 + u * 716.8)))); }
  return orbitOf(max(b, 5.22)).alpha; }
float bardeenXi(float r) { float a = P.spin; return -(r * r * r - 3.0 * r * r + a * a * r + a * a) / (a * (r - 1.0)); }
float bardeenB2(float r, float si, float ci) {
  float a = P.spin; float xi = bardeenXi(r);
  float et = -r * r * r * (r * r * r - 6.0 * r * r + 9.0 * r - 4.0 * a * a) / (a * a * (r - 1.0) * (r - 1.0));
  return et + a * a * ci * ci - xi * xi * ci * ci / (si * si); }
float bardeenAngle(float r, float si, float ci, float sgn) {
  return atan(sgn * max(sqrt(max(bardeenB2(r, si, ci), 0.0)), 1e-6), -bardeenXi(r) / si); }
float rhoCrit(float theta) {
  if (P.spin < 0.02) { return SHADOW_SCHW; }
  float si = max(abs(sin(P.inc)), 0.02); float ci = cos(P.inc); float a = P.spin;
  float r1 = 2.0 * (1.0 + cos(0.6666667 * acos(-a))); float r2 = 2.0 * (1.0 + cos(0.6666667 * acos(a)));
  float lo = r1; float hi = r2;
  for (int i = 0; i < 28; i++) {
    float m1 = hi - 0.618034 * (hi - lo); float m2 = lo + 0.618034 * (hi - lo);
    if (bardeenB2(m1, si, ci) < bardeenB2(m2, si, ci)) { lo = m1; } else { hi = m2; }
  }
  float peak = 0.5 * (lo + hi);
  float ra = peak; float outer = r1;
  for (int i = 0; i < 24; i++) { float m = 0.5 * (outer + ra); if (bardeenB2(m, si, ci) > 0.0) { ra = m; } else { outer = m; } }
  float rb = peak; outer = r2;
  for (int i = 0; i < 24; i++) { float m = 0.5 * (outer + rb); if (bardeenB2(m, si, ci) > 0.0) { rb = m; } else { outer = m; } }
  float sgn = sin(theta) >= 0.0 ? 1.0 : -1.0;
  float l = ra; float h = rb; float aL = bardeenAngle(l, si, ci, sgn); float aH = bardeenAngle(h, si, ci, sgn);
  if ((aL - theta) * (aH - theta) > 0.0) { l = abs(aL - theta) < abs(aH - theta) ? l : h; h = l; }
  for (int i = 0; i < 24; i++) {
    float m = 0.5 * (l + h); float am = bardeenAngle(m, si, ci, sgn);
    if ((am - theta) * (aL - theta) <= 0.0) { h = m; } else { l = m; aL = am; }
  }
  float r = 0.5 * (l + h);
  return length(vec2(-bardeenXi(r) / si, sqrt(max(bardeenB2(r, si, ci), 0.0))));
}
float kerrG(float r, float lam) {
  float om = 1.0 / (pow(r, 1.5) + P.spin);
  return sqrt(max(1.0 - 3.0 / r + 2.0 * P.spin * pow(r, -1.5), 1e-4)) / (1.0 + P.spin * pow(r, -1.5)) / max(1.0 - om * lam, 0.05); }
float gaussCDF(float x) { float z = abs(x) * 0.70710678; float t = 1.0 / (1.0 + 0.3275911 * z);
  float e = 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * exp(-z * z);
  return 0.5 * (1.0 + (x >= 0.0 ? e : -e)); }
const float RING_R[7] = float[7](3.0, 3.2, 4.0, 6.0, 10.0, 20.0, 40.0);
const float RING_C[7] = float[7](0.0, 3.0, 14.0, 30.0, 47.0, 63.0, 72.0);
float ringC(float r) {
  if (r <= RING_R[0]) { return 0.0; }
  for (int i = 1; i < 7; i++) { if (r <= RING_R[i]) { return mix(RING_C[i - 1], RING_C[i], (r - RING_R[i - 1]) / (RING_R[i] - RING_R[i - 1])); } }
  return RING_C[6];
}
float ringR(float c) {
  for (int i = 1; i < 7; i++) { if (c <= RING_C[i]) { return mix(RING_R[i - 1], RING_R[i], (c - RING_C[i - 1]) / (RING_C[i] - RING_C[i - 1])); } }
  return RING_R[6];
}
struct Image { float tau; float w; float wr; float wc; float ws; float wt; };
vec4 packImage(Image m) {
  if (m.tau <= 0.0) { return vec4(0.0); }
  float w = max(m.w, 1e-9);
  return vec4(m.wr / w, atan(m.ws, m.wc), m.tau, m.wt / w);
}
void main() {
  // WebGPU's (id.x + 0.5, res.y - id.y - 0.5) is GL's fragment centre: y already runs up
  vec2 q = (gl_FragCoord.xy - P.center) / P.pxPerM;
  float b = length(q); vec2 qh = q / max(b, 1e-5);
  vec3 n = vec3(0.0, sin(P.inc), cos(P.inc)); vec3 eh = vec3(qh, 0.0);
  float phi0 = atan(-n.z, dot(eh, n)); if (phi0 <= 0.0) { phi0 += PI; }
  float pxM = 1.0 / P.pxPerM;
  float rhoC = P.spinLens > 0.5 ? rhoCrit(atan(q.y, q.x)) : SHADOW_SCHW;
  float cv = 1.0 - sstep(-0.6 * pxM, 0.6 * pxM, b - rhoC);
  float bEff = b < rhoC ? b * SHADOW_SCHW / rhoC : b + (SHADOW_SCHW - rhoC) * exp(-(b - rhoC) / 4.0);
  bool escaping = bEff > 5.2116; bool farRay = bEff > 24.0;
  Orbit orb; if (escaping && !farRay) { orb = orbitOf(bEff); }
  float alpha = deflection(bEff);
  vec3 xb = vec3(0.0, -cos(P.inc), sin(P.inc)); vec3 yb = vec3(1.0, 0.0, 0.0);
  float lamPh = -q.x * sin(P.inc);
  Image img[2];
  img[0] = Image(0.0, 0.0, 0.0, 0.0, 0.0, 0.0); img[1] = img[0];
  float trans = 1.0;
  bool inFoot = P.rout > 0.0 && (b < max(14.0, 0.6 * P.rout) || (b < P.rout * 1.15 && abs(q.y) < P.rout * (abs(cos(P.inc)) * 1.25 + 3.0 * P.hr) + 1.0));
  if (inFoot) {
    float rkU = 0.0; float rkW = 1.0 / bEff; float phPrev = 0.0;
    float phE = escaping ? PI + alpha : TAU;
    float phS = asin(clamp(bEff / (P.rout * 1.4), 0.0, 1.0)) * 0.7;
    float ehn = dot(eh, n); float ph1 = phi0; float ph2 = phi0 + PI;
    float w1 = min(2.2 * P.hr / max(abs(-sin(ph1) * n.z + cos(ph1) * ehn), 0.05), 0.6);
    float w2 = min(2.2 * P.hr / max(abs(-sin(ph2) * n.z + cos(ph2) * ehn), 0.05), 0.6);
    float s0 = phS; float s1 = max(ph1 - w1, phS); float s2 = min(ph1 + w1, phE); float s3 = max(ph2 - w2, s2); float s4 = min(ph2 + w2, phE); float s5 = phE;
    vec3 Pprev = vec3(0.0); bool havePrev = false;
    for (int k = 0; k < 64; k++) {
      float ph;
      if (k < 8) { ph = s0 + (float(k) + 0.5) / 8.0 * (s1 - s0); }
      else if (k < 28) { ph = s1 + (float(k - 8) + 0.5) / 20.0 * (s2 - s1); }
      else if (k < 36) { ph = s2 + (float(k - 28) + 0.5) / 8.0 * (s3 - s2); }
      else if (k < 56) { ph = s3 + (float(k - 36) + 0.5) / 20.0 * (s4 - s3); }
      else { ph = s4 + (float(k - 56) + 0.5) / 8.0 * (s5 - s4); }
      if (ph > phE) { break; }
      float uu;
      if (escaping && farRay) { uu = sin(ph) / bEff + pow(1.0 - cos(ph), 2.0) / (bEff * bEff); }
      else if (escaping) { uu = orbitU(orb, ph); }
      else {
        float hh = (ph - phPrev) * 0.25;
        for (int ss = 0; ss < 4; ss++) {
          float k1u = rkW; float k1w = -rkU + 3.0 * rkU * rkU;
          float u2t = rkU + 0.5 * hh * k1u; float k2u = rkW + 0.5 * hh * k1w; float k2w = -u2t + 3.0 * u2t * u2t;
          float u3t = rkU + 0.5 * hh * k2u; float k3u = rkW + 0.5 * hh * k2w; float k3w = -u3t + 3.0 * u3t * u3t;
          float u4t = rkU + hh * k3u; float k4u = rkW + hh * k3w; float k4w = -u4t + 3.0 * u4t * u4t;
          rkU += hh / 6.0 * (k1u + 2.0 * k2u + 2.0 * k3u + k4u); rkW += hh / 6.0 * (k1w + 2.0 * k2w + 2.0 * k3w + k4w);
        }
        phPrev = ph; uu = rkU;
      }
      if (uu >= 0.45) { break; }
      if (uu <= 1e-4) { if (ph > 1.5) { break; } continue; }
      vec3 pos = (1.0 / uu) * (cos(ph) * vec3(0.0, 0.0, 1.0) + sin(ph) * eh);
      if (!havePrev) { Pprev = pos; havePrev = true; }
      vec3 dV = pos - Pprev; float dl = length(dV); Pprev = pos;
      if (dl < 1e-5) { continue; }
      dV /= dl;
      float z = dot(pos, n); vec3 Pp = pos - z * n; float rc = length(Pp);
      if (rc < P.risco * 0.98 || rc > P.rout) { continue; }
      float H = P.hr * rc;
      if (abs(z) > 2.2 * H) { continue; }
      float sigEdge = sstep(P.risco, P.risco + 0.4, rc) * sstep(P.rout, P.rout * 0.96, rc);
      float dtau = kappa(rc) * sigEdge * exp(-0.5 * z * z / (H * H)) / (H * 2.5066) * sstep(2.2, 1.6, abs(z) / H) * dl;
      if (dtau <= 0.0) { continue; }
      float colAbove = dot(dV, n) >= 0.0 ? gaussCDF(z / H) : 1.0 - gaussCDF(z / H);
      float a1 = 1.0 - exp(-dtau);
      float w = trans * a1 + 1e-6 * dtau;
      float phd = atan(dot(Pp, yb), dot(Pp, xb));
      float tf = pow(0.75 * (kappa(rc) * sigEdge * colAbove + 0.6667), 0.25) * pow(kerrG(rc, lamPh), P.beam);
      int i = k < 36 ? 0 : 1;
      img[i].tau += dtau; img[i].w += w; img[i].wr += w * rc; img[i].wc += w * cos(phd); img[i].ws += w * sin(phd); img[i].wt += w * tf;
      trans *= 1.0 - a1;
    }
  }
  outGeo1 = packImage(img[0]);
  outGeo2 = packImage(img[1]);
  vec4 ringOut = vec4(0.0);
  float dM = b - rhoC;
  if (inFoot && dM > -pxM && dM < 1.2) {
    float gam = PI - 0.6 * P.spin * P.spin;
    float carter = q.y * q.y + (q.x * q.x - P.spin * P.spin) * cos(P.inc) * cos(P.inc);
    float cover = 0.0;
    for (int nn = 2; nn <= 3; nn++) {
      float ph = phi0 + float(nn) * PI; float k = exp(-gam * ph / PI);
      float lo = max(dM - 0.5 * pxM, ringC(P.risco) * k); float hi = min(dM + 0.5 * pxM, ringC(P.rout) * k);
      if (hi <= lo) { continue; }
      float re = ringR(0.5 * (lo + hi) / k);
      float edge = sstep(P.risco, P.risco + 0.5, re) * sstep(P.rout, P.rout * 0.96, re);
      if (cover == 0.0) {
        vec3 X2 = re * (cos(ph) * vec3(0.0, 0.0, 1.0) + sin(ph) * eh);
        float g2 = kerrG(re, lamPh);
        float mue = clamp(g2 * sqrt(max(carter, 0.0)) / re, 0.0, 1.0);
        ringOut = vec4(re, atan(dot(X2, yb), dot(X2, xb)), 0.0, pow(0.75 * (mue + 0.6667), 0.25) * pow(g2, P.beam));
      }
      cover += (hi - lo) / pxM * edge;
    }
    ringOut.z = min(cover, 1.0);
  }
  outRing = ringOut;
  vec4 skyAt = vec4(0.0);
  if (cv < 0.999) {
    float D = 60.0;
    float ps = atan(b / D) - alpha; vec3 dir = vec3(qh * sin(ps), -cos(ps));
    vec2 src = vec2(atan(dir.x, -dir.z), asin(clamp(dir.y, -1.0, 1.0))) * D * P.pxPerM / P.res.y;
    // WebGPU's (id.x, res.y - id.y) in GL's window coordinates
    vec2 corner = vec2(floor(gl_FragCoord.x), floor(gl_FragCoord.y) + 1.0);
    float vig = 1.0 - 0.45 * sstep(0.35, 1.0, length((corner - 0.5 * P.res) / P.res.y));
    skyAt = vec4(src * P.skyZoom, vig * (1.0 - cv), 0.0);
  }
  outSky = skyAt;
}`;

// ---- shade --------------------------------------------------------------------------------------------------
/** shaders.ts shade, less the meter: the exposure is P.expo alone. Two outputs, display and glow. */
export const SHADE_FRAGMENT = HEADER + PARAMS + SKY_LIB + /* glsl */ `
uniform sampler2D uField; uniform sampler2D uGeo1; uniform sampler2D uGeo2; uniform sampler2D uRing; uniform sampler2D uSky;
layout(location = 0) out vec4 outDisplay;
layout(location = 1) out vec4 outGlow;
// explicit level 0 throughout: these taps sit in branches, where implicit derivatives are undefined
vec4 field(float u, float row) { return textureLod(uField, vec2(u, row / ${FIELD_HEIGHT}.0), 0.0); }
float gasAt(float rc, float phi) { return field(phi / TAU + 0.5, clamp((log(rc) - P.gasL0) / (P.gasL1 - P.gasL0) * ${GAS_ROWS}.0, 0.5, ${GAS_ROWS - 0.5})).r; }
vec3 bbBand(float T) { float x = clamp((log(T) * 0.4342945 - 3.0) / 6.5, 0.5 / ${FIELD_WIDTH}.0, 1.0 - 0.5 / ${FIELD_WIDTH}.0);
  return field(x, ${CHROMA_ROW + 0.5}).rgb * pow(10.0, field(x, ${LOG_Y_ROW + 0.5}).r - P.expo); }
vec3 diskLight(float te, float factor) { float fc = colourCorrection(te); return bbBand(fc * te * factor) / (fc * fc * fc * fc); }
void main() {
  ivec2 px = ivec2(gl_FragCoord.xy);
  // derivatives need uniform control flow, so the sky's footprint is taken here, before any branch. With an odd
  // height GL's 2x2 quads (counted from the bottom) put the top row beside a helper row outside the target, whose
  // out-of-range fetch reads zero and faded that row's stars; clamped, it reads its neighbour, as WebGPU's
  // robust textureLoad does
  vec4 skyAt = texelFetch(uSky, min(px, textureSize(uSky, 0) - 1), 0);
  float skyFoot = max(length(dFdx(skyAt.xy)), length(dFdy(skyAt.xy)));
  vec3 col = vec3(0.0); float trans = 1.0;
  for (int i = 0; i < 2; i++) {
    vec4 g = i == 0 ? texelFetch(uGeo1, px, 0) : texelFetch(uGeo2, px, 0);
    if (g.z <= 0.0) { continue; }
    float sig = gasAt(g.x, g.y);
    float a = 1.0 - exp(-sig * g.z);
    col += trans * a * diskLight(tempAt(g.x, sig), g.w);
    trans *= 1.0 - a;
  }
  if (trans >= 0.5) {
    vec4 rg = texelFetch(uRing, px, 0);
    if (rg.z > 0.0) { col += diskLight(tempAt(rg.x, max(gasAt(rg.x, rg.y), 0.2)), rg.w) * rg.z * trans; }
    if (skyAt.z > 0.0) { col += sky(skyAt.xy + P.skyDrift, P.skyParallax, skyFoot) * skyAt.z * trans; }
  }
  float V = max(col.r, max(col.g, col.b)); float Vm = V / (1.0 + V * 0.55); float disp = 1.0 - exp(-1.6 * Vm);
  vec3 cm = mix(col * (disp / max(V, 1e-5)), vec3(disp), clamp((Vm - 0.9) * 2.0, 0.0, 0.85));
  // the dither hashes WebGPU's top-down pixel position, so the two renderers dither alike
  outDisplay = vec4(pow(clamp(cm, vec3(0.0), vec3(1.0)), vec3(1.0 / 1.1)) + (hash12(vec2(gl_FragCoord.x, P.res.y - gl_FragCoord.y)) - 0.5) * 0.003, 1.0);
  outGlow = vec4(min(col * sstep(1.2, 5.0, V), vec3(16.0)), 1.0);
}`;

// ---- bloom --------------------------------------------------------------------------------------------------
// site/gpu/bloom.ts (as the sun fallback ports it): 13-tap downsample, Karis-averaged and soft-thresholded on the
// first level, then a 3x3 tent upsample added back up the chain
const BLOOM_COMMON = HEADER + /* glsl */ `
uniform sampler2D uSrc; uniform vec2 uTexel; uniform float uThreshold; uniform float uKnee; uniform float uRadius;
in vec2 vUv;
out vec4 outColor;
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float karis(vec3 c) { return 1.0 / (1.0 + luma(c)); }
vec3 tap(vec2 uv) { return texture(uSrc, uv).rgb; }
`;

function down13(isFirst: boolean): string {
  return /* glsl */ `
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

export const BLOOM_FIRST_FRAGMENT = BLOOM_COMMON + down13(true) + /* glsl */ `
void main() {
  vec3 c = down13(vUv);
  float l = luma(c);
  float soft = clamp(l - uThreshold + uKnee, 0.0, 2.0 * uKnee);
  float w = max(soft * soft / (4.0 * uKnee + 1e-5), l - uThreshold) / max(l, 1e-5);
  outColor = vec4(c * w, 1.0);
}`;

export const BLOOM_DOWN_FRAGMENT = BLOOM_COMMON + down13(false) + /* glsl */ `
void main() { outColor = vec4(down13(vUv), 1.0); }`;

export const BLOOM_UP_FRAGMENT = BLOOM_COMMON + /* glsl */ `
void main() {
  vec2 t = uRadius * uTexel;
  vec3 s = tap(vUv) * 4.0;
  s += (tap(vUv + vec2(-t.x, 0.0)) + tap(vUv + vec2(t.x, 0.0)) + tap(vUv + vec2(0.0, -t.y)) + tap(vUv + vec2(0.0, t.y))) * 2.0;
  s += tap(vUv + vec2(-t.x, -t.y)) + tap(vUv + vec2(t.x, -t.y)) + tap(vUv + vec2(-t.x, t.y)) + tap(vUv + vec2(t.x, t.y));
  outColor = vec4(s / 16.0, 1.0);
}`;

// ---- post ---------------------------------------------------------------------------------------------------
/** shaders.ts composite: the scene plus its bloom, compressed and scaled by the preset's strength. */
export const COMPOSITE_FRAGMENT = HEADER + PARAMS + /* glsl */ `
uniform sampler2D uScene; uniform sampler2D uBloom;
in vec2 vUv;
out vec4 outColor;
void main() {
  vec3 glow = textureLod(uBloom, vUv, 0.0).rgb;
  outColor = vec4(textureLod(uScene, vUv, 0.0).rgb + glow / (1.0 + glow) * P.bloom, 1.0);
}`;
