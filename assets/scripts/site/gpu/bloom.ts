/* Mip-chain HDR bloom (Jimenez 2014, the Call of Duty filter): each level is the one above it downsampled with a
 * 13-tap filter, then the chain is walked back up with a 3x3 tent, each level added onto the next larger one.
 * The first downsample applies a soft threshold and a Karis average, so a single bright pixel cannot flare the
 * whole frame. The result is `output` (half resolution); the page's tonemap pass adds it onto its scene. */

import { BUFFER, TEXTURE, FULLSCREEN_VS, bindGroup } from './device';

const SHADER = FULLSCREEN_VS + /* wgsl */ `
struct BloomParams { threshold: f32, knee: f32, radius: f32, pad: f32 }
@group(0) @binding(0) var src: texture_2d<f32>;
@group(0) @binding(1) var smp: sampler;
@group(0) @binding(2) var<uniform> B: BloomParams;
fn tap(uv: vec2f) -> vec3f { return textureSampleLevel(src, smp, uv, 0.0).rgb; }
fn luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn karis(c: vec3f) -> f32 { return 1.0 / (1.0 + luma(c)); }
fn down13(uv: vec2f, firstLevel: bool) -> vec3f {
  let t = 1.0 / vec2f(textureDimensions(src));
  let a = tap(uv + t * vec2f(-2.0, -2.0)); let b = tap(uv + t * vec2f(0.0, -2.0)); let c = tap(uv + t * vec2f(2.0, -2.0));
  let d = tap(uv + t * vec2f(-2.0, 0.0)); let e = tap(uv); let f = tap(uv + t * vec2f(2.0, 0.0));
  let g = tap(uv + t * vec2f(-2.0, 2.0)); let h = tap(uv + t * vec2f(0.0, 2.0)); let i = tap(uv + t * vec2f(2.0, 2.0));
  let j = tap(uv + t * vec2f(-1.0, -1.0)); let k = tap(uv + t * vec2f(1.0, -1.0)); let l = tap(uv + t * vec2f(-1.0, 1.0)); let m = tap(uv + t * vec2f(1.0, 1.0));
  // five overlapping 2x2 boxes: the centre one weighted 0.5, the four corners 0.125 each
  var g0 = (j + k + l + m) * 0.25; var g1 = (a + b + d + e) * 0.25; var g2 = (b + c + e + f) * 0.25;
  var g3 = (d + e + g + h) * 0.25; var g4 = (e + f + h + i) * 0.25;
  if (!firstLevel) { return g0 * 0.5 + (g1 + g2 + g3 + g4) * 0.125; }
  let w0 = karis(g0) * 0.5; let w1 = karis(g1) * 0.125; let w2 = karis(g2) * 0.125; let w3 = karis(g3) * 0.125; let w4 = karis(g4) * 0.125;
  return (g0 * w0 + g1 * w1 + g2 * w2 + g3 * w3 + g4 * w4) / (w0 + w1 + w2 + w3 + w4);
}
@fragment fn first(v: FullscreenOut) -> @location(0) vec4f {
  let c = down13(v.uv, true);
  let l = luma(c);
  // soft-knee threshold: a quadratic ramp across [threshold - knee, threshold + knee]
  let soft = clamp(l - B.threshold + B.knee, 0.0, 2.0 * B.knee);
  let w = max(soft * soft / (4.0 * B.knee + 1e-5), l - B.threshold) / max(l, 1e-5);
  return vec4f(c * w, 1.0);
}
@fragment fn down(v: FullscreenOut) -> @location(0) vec4f { return vec4f(down13(v.uv, false), 1.0); }
@fragment fn up(v: FullscreenOut) -> @location(0) vec4f {
  let t = B.radius / vec2f(textureDimensions(src));
  var s = tap(v.uv) * 4.0;
  s += (tap(v.uv + vec2f(-t.x, 0.0)) + tap(v.uv + vec2f(t.x, 0.0)) + tap(v.uv + vec2f(0.0, -t.y)) + tap(v.uv + vec2f(0.0, t.y))) * 2.0;
  s += tap(v.uv + vec2f(-t.x, -t.y)) + tap(v.uv + vec2f(t.x, -t.y)) + tap(v.uv + vec2f(-t.x, t.y)) + tap(v.uv + vec2f(t.x, t.y));
  return vec4f(s / 16.0, 1.0);
}`;

const FORMAT: GPUTextureFormat = 'rgba16float';

export interface BloomSettings {
  /** Luminance (linear, after exposure) where bloom starts. */
  threshold: number;
  knee: number;
  /** Tent radius in texels of the level being upsampled. */
  radius: number;
}

export class Bloom {
  private readonly firstPipe: GPURenderPipeline;
  private readonly downPipe: GPURenderPipeline;
  private readonly upPipe: GPURenderPipeline;
  private readonly sampler: GPUSampler;
  private readonly params: GPUBuffer;
  private levels: GPUTexture[] = [];
  private groups: { down: GPUBindGroup[]; up: GPUBindGroup[] } = { down: [], up: [] };

  constructor(private readonly device: GPUDevice, settings: BloomSettings) {
    const module = device.createShaderModule({ code: SHADER });
    const make = (entryPoint: string, additive: boolean): GPURenderPipeline => device.createRenderPipeline({
      layout: 'auto', vertex: { module, entryPoint: 'vs' },
      fragment: { module, entryPoint, targets: [additive
        ? { format: FORMAT, blend: { color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' }, alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' } } }
        : { format: FORMAT }] },
    });
    this.firstPipe = make('first', false);
    this.downPipe = make('down', false);
    this.upPipe = make('up', true);
    this.sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });
    this.params = device.createBuffer({ size: 16, usage: BUFFER.UNIFORM | BUFFER.COPY_DST });
    this.set(settings);
  }

  set(settings: BloomSettings): void {
    this.device.queue.writeBuffer(this.params, 0, new Float32Array([settings.threshold, settings.knee, settings.radius, 0]));
  }

  /** The bloom at half the scene's resolution, valid after encode(). */
  get output(): GPUTexture { return this.levels[0]; }

  /** Rebuild the chain for a new scene size. */
  resize(scene: GPUTexture): void {
    this.levels.forEach((t) => t.destroy());
    const count = Math.max(1, Math.min(7, Math.floor(Math.log2(Math.min(scene.width, scene.height))) - 3));
    this.levels = Array.from({ length: count }, (_, i) => this.device.createTexture({
      size: [Math.max(1, scene.width >> (i + 1)), Math.max(1, scene.height >> (i + 1))], format: FORMAT,
      usage: TEXTURE.RENDER_ATTACHMENT | TEXTURE.TEXTURE_BINDING,
    }));
    // the plain downsample reads no settings, so its auto layout has no slot 2
    const group = (pipe: GPURenderPipeline, from: GPUTexture): GPUBindGroup =>
      bindGroup(this.device, pipe, [from.createView(), this.sampler, pipe === this.downPipe ? null : { buffer: this.params }]);
    this.groups = {
      down: this.levels.map((_, i) => group(i === 0 ? this.firstPipe : this.downPipe, i === 0 ? scene : this.levels[i - 1])),
      up: this.levels.slice(1).map((level) => group(this.upPipe, level)),
    };
  }

  encode(encoder: GPUCommandEncoder): void {
    this.levels.forEach((level, i) => this.pass(encoder, i === 0 ? this.firstPipe : this.downPipe, this.groups.down[i], level, 'clear'));
    for (let i = this.levels.length - 1; i >= 1; i--) this.pass(encoder, this.upPipe, this.groups.up[i - 1], this.levels[i - 1], 'load');
  }

  destroy(): void { this.levels.forEach((t) => t.destroy()); this.params.destroy(); }

  private pass(encoder: GPUCommandEncoder, pipe: GPURenderPipeline, group: GPUBindGroup, target: GPUTexture, loadOp: GPULoadOp): void {
    const pass = encoder.beginRenderPass({ colorAttachments: [{ view: target.createView(), loadOp, storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 1 } }] });
    pass.setPipeline(pipe); pass.setBindGroup(0, group); pass.draw(3); pass.end();
  }
}
