/* Tone mapping, last: the original's curve (Narkowicz's ACES fit, then gamma 0.95, display-referred colours on a
 * non-sRGB target) with the mip-chain bloom (site/gpu/bloom.ts) added in linear light before it. */

export const POST_SHADER = /* wgsl */ `
struct Post { bloom: f32, pad0: f32, pad1: f32, pad2: f32 }
@group(0) @binding(0) var scene: texture_2d<f32>;
@group(0) @binding(1) var glow: texture_2d<f32>;
@group(0) @binding(2) var smp: sampler;
@group(0) @binding(3) var<uniform> P: Post;
fn hash12(p: vec2f) -> f32 { var p3 = fract(vec3f(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
@fragment fn tonemap(v: FullscreenOut) -> @location(0) vec4f {
  var c = textureLoad(scene, vec2i(v.pos.xy), 0).rgb + textureSampleLevel(glow, smp, v.uv, 0.0).rgb * P.bloom;
  c = max(c, vec3f(0.0));
  c = (c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14);
  c = pow(c, vec3f(0.95));
  // static dither in the original's GL pixel frame, so the grain pattern matches it
  let fc = vec2f(v.pos.x, f32(textureDimensions(scene).y) - v.pos.y);
  return vec4f(c + (hash12(fc) - 0.5) * 0.003, 1.0);
}`;
