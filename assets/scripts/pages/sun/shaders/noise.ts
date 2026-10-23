/* Shared WGSL noise and hashes (the original's, kept bit-for-bit so the patterns match its look). */

export const HASH_WGSL = /* wgsl */ `
fn hash12(p: vec2f) -> f32 { var p3 = fract(vec3f(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
fn hash22(p: vec2f) -> vec2f { var p3 = fract(vec3f(p.xyx) * vec3f(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
fn vnoise(p: vec2f) -> f32 { let i = floor(p); var f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2f(1.0, 0.0)), f.x), mix(hash12(i + vec2f(0.0, 1.0)), hash12(i + vec2f(1.0, 1.0)), f.x), f.y); }
// smoothstep that also takes reversed edges (a > b), which the original leaned on and WGSL leaves undefined
fn ss(a: f32, b: f32, x: f32) -> f32 { let t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
`;

/** Quasi-periodic sine sum on four incommensurate directions, two octaves, range [0, 1]: the original's only
 *  noise for the star (11 sines, seam-free on the sphere). */
export const WAV3 = /* wgsl */ `
fn wav3(p0: vec3f) -> f32 {
  let p = p0 + 0.9 * sin(p0.zxy * 0.47 + vec3f(1.3, 2.1, 0.7));
  let a = sin(dot(p, vec3f(0.913, 0.271, 0.305))) + sin(dot(p, vec3f(-0.402, 0.871, 0.282)) + 1.7)
        + sin(dot(p, vec3f(0.188, -0.517, 0.835)) + 4.1) + sin(dot(p, vec3f(-0.731, -0.373, -0.571)) + 2.3);
  let q = p * 2.137 + vec3f(3.1, 1.3, 5.7);
  let b = sin(dot(q, vec3f(0.613, 0.711, -0.345))) + sin(dot(q, vec3f(-0.866, 0.121, 0.485)) + 0.9)
        + sin(dot(q, vec3f(0.231, -0.902, -0.364)) + 2.6) + sin(dot(q, vec3f(0.104, 0.338, 0.935)) + 5.2);
  return 0.5 + (a * 0.6 + b * 0.4) * 0.125;
}
`;
