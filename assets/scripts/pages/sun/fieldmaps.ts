/* The GPU's copy of the field: every map the renderer and the flow solver read, rebuilt in one go when the field
 * moves (the dipoles by about 1 % rms, or the magnetofrictional field by a step's worth). WGSL in shaders/field.ts. */

import { BUFFER, TEXTURE, bindGroup, computePipeline, dispatch } from '../../site/gpu/device';
import { GM_SUN_KM3_S2 } from './constants';
import { MAX_DIPOLES } from './field';
import type { StarField } from './field';
import type { Derived } from './stars';
import { BLUR_SHADER, CORONA_DIR_SHADER, FRICTIONAL_SAMPLER_BINDING, FRICTIONAL_TEXTURE_BINDING, OPEN_SHADER, PARKER_SHADER, SURFACE_SHADER } from './shaders/field';

const FIELD_FLOATS = MAX_DIPOLES * 8 + 8;   // shaders/field.ts Field
const STORAGE = TEXTURE.STORAGE_BINDING | TEXTURE.TEXTURE_BINDING;

export class FieldMaps {
  /** B at r = 1 in bref units (.xyz) and the radial field minus the global dipole (.w); 256 x 128. */
  readonly surface: GPUTexture;
  /** The radial field of the regions' flux still in sunspots, bref units (.r); 256 x 128. */
  readonly spots: GPUTexture;
  /** Open fraction (3x3 blurred, .r), surface |B|/bref/4 (.g) and depth inside open field, rad (.b); 96 x 48. */
  readonly open: GPUTexture;
  /** Per direction: open fraction, surface |B|/bref/4, streamer-belt ratio at 1.35 R, striation phase; 256 x 128. */
  readonly corona: GPUTexture;
  /** A second striation phase (.r) and depth inside open field, rad (.g); 256 x 128. */
  readonly striation: GPUTexture;
  /** Parker wind v/1000 km/s: x = r over 1..8 R (64), y = latitude (12), z = longitude (24, wraps). */
  readonly parker: GPUTexture;
  /** Linear, wrapping in longitude (u), clamped in latitude. */
  readonly sampler: GPUSampler;
  /** Linear for the Parker volume: radius and latitude clamp, longitude (w) wraps. */
  readonly parkerSampler: GPUSampler;
  /** Unblurred open (1) / closed (0) per cell (.r) and surface |B|/bref/4 (.g); 96 x 48. */
  readonly openRaw: GPUTexture;

  /** The dipoles and star constants as shaders/field.ts's Field struct: bind it to reuse FIELD_WGSL's fieldAt. */
  readonly uniform: GPUBuffer;
  private readonly data = new Float32Array(FIELD_FLOATS);
  private readonly passes: { pipe: GPUComputePipeline; group: GPUBindGroup; size: [number, number] }[];
  private builtVersion = -1;

  constructor(private readonly device: GPUDevice, private readonly frictional: { view: GPUTextureView; sampler: GPUSampler }) {
    const tex2 = (w: number, h: number): GPUTexture => device.createTexture({ size: [w, h], format: 'rgba16float', usage: STORAGE });
    this.surface = tex2(256, 128);
    this.spots = tex2(256, 128);
    const openRaw = this.openRaw = tex2(96, 48);
    this.open = tex2(96, 48);
    this.corona = tex2(256, 128);
    this.striation = tex2(256, 128);
    this.parker = device.createTexture({ size: [64, 12, 24], dimension: '3d', format: 'rgba16float', usage: STORAGE });
    this.sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear', addressModeU: 'repeat', addressModeV: 'clamp-to-edge' });
    this.parkerSampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge', addressModeW: 'repeat' });
    this.uniform = device.createBuffer({ size: FIELD_FLOATS * 4, usage: BUFFER.UNIFORM | BUFFER.COPY_DST });
    const u = { buffer: this.uniform };
    // every pass but the blur reads the field through FIELD_WGSL
    const pass = (code: string, entry: string, resources: (GPUBindingResource | null)[], size: [number, number], readsField = true) => {
      const pipe = computePipeline(device, code, entry);
      return { pipe, group: bindGroup(device, pipe, readsField ? this.withFieldBindings(resources) : resources), size };
    };
    // order matters: open -> blur -> corona and parker read the blurred map
    this.passes = [
      pass(SURFACE_SHADER, 'surfaceMap', [u, this.surface.createView(), this.spots.createView()], [256 / 8, 128 / 8]),
      pass(OPEN_SHADER, 'openMap', [u, openRaw.createView()], [96 / 8, 48 / 8]),
      pass(BLUR_SHADER, 'blurOpen', [openRaw.createView(), this.open.createView()], [96 / 8, 48 / 8], false),
      pass(CORONA_DIR_SHADER, 'coronaDir', [u, this.open.createView(), this.sampler, this.corona.createView(), this.striation.createView()], [256 / 8, 128 / 8]),
      pass(PARKER_SHADER, 'parkerGrid', [u, this.open.createView(), this.parker.createView()], [3, 6]),
    ];
  }

  /** A pass's own resources (bindings 0, 1, ...) plus the magnetofrictional field FIELD_WGSL's fieldAt samples. */
  withFieldBindings(resources: (GPUBindingResource | null)[]): (GPUBindingResource | null)[] {
    const out = [...resources];
    while (out.length < FRICTIONAL_TEXTURE_BINDING) out.push(null);
    out[FRICTIONAL_TEXTURE_BINDING] = this.frictional.view;
    out[FRICTIONAL_SAMPLER_BINDING] = this.frictional.sampler;
    return out;
  }

  /** Re-run every map if the field has moved since the last build (`version`: the dipoles' and the
   *  magnetofrictional field's versions together). */
  update(encoder: GPUCommandEncoder, version: number, field: StarField, derived: Derived, massSun: number): void {
    if (version === this.builtVersion) return;
    this.builtVersion = version;
    this.data.set(field.positions, 0);
    this.data.set(field.moments, MAX_DIPOLES * 4);
    this.data.set([field.bref, GM_SUN_KM3_S2 * massSun, derived.radiusKm, derived.tcor[0], derived.tcor[1], derived.tcor[2], 0, 0], MAX_DIPOLES * 8);
    this.device.queue.writeBuffer(this.uniform, 0, this.data);
    for (const p of this.passes) dispatch(encoder, p.pipe, p.group, p.size[0], p.size[1]);
  }

  /** Force a rebuild on the next update (a new star). */
  invalidate(): void { this.builtVersion = -1; }

  destroy(): void {
    [this.surface, this.spots, this.openRaw, this.open, this.corona, this.striation, this.parker].forEach((t) => t.destroy());
    this.uniform.destroy();
  }
}
