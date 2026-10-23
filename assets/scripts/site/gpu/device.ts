/* WebGPU setup shared by /misc/sun/ and /misc/black-hole/: the device, a canvas context, the adapter's real limits,
 * and a quality tier picked from them plus a short benchmark (tier.ts). */

import { pickTier } from './tier';
import type { Tier } from './tier';

// The WebGPU spec's flag values, not the GPUBufferUsage/GPUTextureUsage/GPUShaderStage/GPUMapMode globals: a browser
// without WebGPU has no such globals, and reading them at module load threw before the WebGL2 fallback could start.
// The type checker's lib.dom does not declare them either, so any use of them fails `make typecheck`.
export const BUFFER = { MAP_READ: 0x1, COPY_SRC: 0x4, COPY_DST: 0x8, UNIFORM: 0x40, STORAGE: 0x80, QUERY_RESOLVE: 0x200 } as const;
export const TEXTURE = { COPY_SRC: 0x1, COPY_DST: 0x2, TEXTURE_BINDING: 0x4, STORAGE_BINDING: 0x8, RENDER_ATTACHMENT: 0x10 } as const;
export const SHADER_STAGE = { VERTEX: 0x1, FRAGMENT: 0x2, COMPUTE: 0x4 } as const;
export const MAP_MODE = { READ: 0x1, WRITE: 0x2 } as const;

export interface Gpu {
  readonly device: GPUDevice;
  readonly context: GPUCanvasContext;
  readonly format: GPUTextureFormat;
  readonly tier: Tier;
  /** Present when the adapter offers 'timestamp-query': per-pass GPU timings for dynamic resolution. */
  readonly hasTimestamps: boolean;
}

export type GpuFailure = 'no-webgpu' | 'no-adapter' | 'no-context';

/** Ask for the adapter's real limits rather than the defaults (the defaults cap a storage binding at 128 MB,
 *  which a 128^3 multi-field grid needs more than). `onLost` runs when the device is lost for any reason but
 *  our own destroy(), so the page can say so. */
export async function startGpu(canvas: HTMLCanvasElement, onLost: () => void): Promise<Gpu | GpuFailure> {
  if (!navigator.gpu) return 'no-webgpu';
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) return 'no-adapter';
  const hasTimestamps = adapter.features.has('timestamp-query');
  const { limits } = adapter;
  const device = await adapter.requestDevice({
    requiredFeatures: hasTimestamps ? ['timestamp-query'] : [],
    requiredLimits: {
      maxStorageBufferBindingSize: limits.maxStorageBufferBindingSize,
      maxBufferSize: limits.maxBufferSize,
      maxTextureDimension3D: limits.maxTextureDimension3D,
      maxComputeWorkgroupStorageSize: limits.maxComputeWorkgroupStorageSize,
      maxComputeInvocationsPerWorkgroup: limits.maxComputeInvocationsPerWorkgroup,
    },
  });
  const context = canvas.getContext('webgpu') as GPUCanvasContext | null;
  if (!context) { device.destroy(); return 'no-context'; }
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: 'opaque' });
  void device.lost.then((info) => { if (info.reason !== 'destroyed') onLost(); });
  const tier = await pickTier(device);
  return { device, context, format, tier, hasTimestamps };
}

/** Bind resources to slots 0..n in order; `null` skips a slot the pipeline's auto layout left out. */
export function bindGroup(device: GPUDevice, pipe: GPURenderPipeline | GPUComputePipeline, resources: (GPUBindingResource | null)[], group = 0): GPUBindGroup {
  const entries: GPUBindGroupEntry[] = [];
  resources.forEach((resource, binding) => { if (resource) entries.push({ binding, resource }); });
  return device.createBindGroup({ layout: pipe.getBindGroupLayout(group), entries });
}

/** The fullscreen-triangle vertex stage every pass here uses: one triangle, uv with y down. */
export const FULLSCREEN_VS = /* wgsl */ `
struct FullscreenOut { @builtin(position) pos: vec4f, @location(0) uv: vec2f }
@vertex fn vs(@builtin(vertex_index) i: u32) -> FullscreenOut {
  let p = vec2f(f32((i << 1u) & 2u), f32(i & 2u)); var o: FullscreenOut;
  o.pos = vec4f(p * 2.0 - 1.0, 0.0, 1.0); o.uv = vec2f(p.x, 1.0 - p.y); return o;
}`;

export function computePipeline(device: GPUDevice, code: string, entryPoint: string): GPUComputePipeline {
  return device.createComputePipeline({ layout: 'auto', compute: { module: device.createShaderModule({ code }), entryPoint } });
}

export function dispatch(encoder: GPUCommandEncoder, pipe: GPUComputePipeline, group: GPUBindGroup, x: number, y = 1, z = 1): void {
  const pass = encoder.beginComputePass();
  pass.setPipeline(pipe); pass.setBindGroup(0, group); pass.dispatchWorkgroups(x, y, z); pass.end();
}
