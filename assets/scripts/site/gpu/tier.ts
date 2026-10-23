/* Quality tier, chosen once at startup from a ~10 ms ALU benchmark. `?tier=low|medium|high`
 * in the URL overrides it, for testing a tier on any machine. */

export type TierName = 'low' | 'medium' | 'high';

export interface Tier {
  readonly name: TierName;
  /** Measured sustained throughput, TFLOPS (fp32 FMA = 2 flops). */
  readonly tflops: number;
  /** Largest render scale (render px per CSS px) dynamic resolution may climb to. */
  readonly maxScale: number;
  /** Magnetofrictional grid, longitude x latitude x radius cells. */
  readonly frictionalGrid: readonly [number, number, number];
}

const TIERS: Readonly<Record<TierName, Omit<Tier, 'tflops'>>> = {
  low: { name: 'low', maxScale: 1, frictionalGrid: [96, 48, 24], },
  medium: { name: 'medium', maxScale: 1.5, frictionalGrid: [128, 64, 32], },
  high: { name: 'high', maxScale: 2, frictionalGrid: [160, 80, 40], },
};

/** Effective TFLOPS at which a tier holds 60 fps with headroom (about 40 % of peak: an integrated laptop GPU
 *  measures ~0.8, a mid-range discrete card 6-12). */
const MEDIUM_FROM_TFLOPS = 1.5;
const HIGH_FROM_TFLOPS = 4;

export async function pickTier(device: GPUDevice): Promise<Tier> {
  const tflops = await benchmark(device);
  const forced = new URLSearchParams(location.search).get('tier');
  const name: TierName = forced === 'low' || forced === 'medium' || forced === 'high' ? forced
    : tflops >= HIGH_FROM_TFLOPS ? 'high' : tflops >= MEDIUM_FROM_TFLOPS ? 'medium' : 'low';
  return { ...TIERS[name], tflops };
}

/** Time a fixed block of dependent FMAs. The first submission warms the pipeline up and is not counted. */
async function benchmark(device: GPUDevice): Promise<number> {
  const invocations = 256 * 1024, iterations = 512, vec4FmasPerIteration = 2;
  const module = device.createShaderModule({ code: /* wgsl */ `
@group(0) @binding(0) var<storage, read_write> sink: array<f32>;
@compute @workgroup_size(256) fn main(@builtin(global_invocation_id) id: vec3u) {
  var a = vec4f(f32(id.x) * 1e-7, 0.5, 0.25, 0.125); var b = a.wzyx;
  for (var i = 0u; i < ${iterations}u; i++) { a = fma(a, b, vec4f(0.999)); b = fma(b, a, vec4f(-0.999)); }
  if (dot(a, b) == 12345.678) { sink[id.x] = a.x; }   // keeps the loop alive; never true in practice
}` });
  const pipe = device.createComputePipeline({ layout: 'auto', compute: { module, entryPoint: 'main' } });
  const sink = device.createBuffer({ size: invocations * 4, usage: 0x80 /* STORAGE */ });
  const group = device.createBindGroup({ layout: pipe.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: sink } }] });
  const run = async (): Promise<number> => {
    const encoder = device.createCommandEncoder(), pass = encoder.beginComputePass();
    pass.setPipeline(pipe); pass.setBindGroup(0, group); pass.dispatchWorkgroups(invocations / 256); pass.end();
    const t0 = performance.now();
    device.queue.submit([encoder.finish()]);
    await device.queue.onSubmittedWorkDone();
    return performance.now() - t0;
  };
  await run();
  const ms = Math.min(await run(), await run());
  sink.destroy();
  const flops = invocations * iterations * vec4FmasPerIteration * 4 /* lanes */ * 2;
  return flops / (Math.max(ms, 0.05) * 1e-3) / 1e12;
}
