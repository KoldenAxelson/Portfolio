/* The corona's non-potential field: a magnetofrictional model (shaders/frictional.ts) on a shell grid over the
 * dipole model's potential field. The photosphere's flows shear and twist the field lines rooted in it, the field
 * relaxes toward force-free in between, and the stress it stores is what powers the loops' flares and eruptions
 * (loops.ts reads it back as a map of each column's energies; a flare or eruption gives part of it back). fieldAt adds it everywhere the field
 * is traced (shaders/field.ts), so the strings show the sheared arcades and S-shaped sigmoids it builds; a
 * half-resolution copy comes back for the CPU's field (nonPotentialAt), which loops.ts and cmes.ts trace and test.
 *
 * Time steps are in star days and capped per frame: at the highest warps the corona relaxes behind the clock rather
 * than going unstable. Nothing waits on the GPU: the energies come back through a ring of mapped buffers. */

import { BUFFER, MAP_MODE, TEXTURE, bindGroup, computePipeline, dispatch } from '../../site/gpu/device';
import { ANIM_UNIT_S } from './clock';
import type { StarField } from './field';
import { FLOW_GAIN } from './flow';
import {
  ADVANCE_SHADER, CLEAR_SHADER, COARSEN_SHADER, CURL_SHADER, ELECTRIC_SHADER, FRICTIONAL_FLOATS, MAX_RELAX, MEASURE_SHADER,
  POTENTIAL_SHADER, RELAX_SHADER, WORKGROUP_3D,
} from './shaders/frictional';
import { MAX_DIPOLES } from './field';
import { angleBetween } from './vec';
import type { Vec3 } from './vec';


export type FrictionalGrid = readonly [lon: number, lat: number, r: number];

/** Friction (day / R^2): sets how fast the field relaxes; a stressed active region settles in about half a day. */
const FRICTION = 30;
/** Resistivity (R^2 / day), kept under the explicit step's limit on the thinnest cells. */
const RESISTIVITY = 0.002;
/** Relaxation speed cap, R per day, and the field floor (bref) that keeps weak-field cells from racing. */
const MAX_SPEED_R_PER_DAY = 1.5;
const FIELD_FLOOR = 0.05;
/** Stress older than about two weeks has diffused and cancelled away (regions live 25-50 days). */
const DECAY_PER_DAY = 1 / 15;
/** Above this latitude the grid's cells get too thin for the step: the polar caps stay potential. */
const ACTIVE_LAT_RAD = 75 * Math.PI / 180;
/** Largest step (days) and steps per frame; past them the corona relaxes behind the clock. */
const MAX_STEP_DAYS = 0.005;
const MAX_STEPS_PER_FRAME = 16;
/** The traced field (maps, strings) catches up after this much evolution, but not more often than every few frames. */
const RETRACE_DAYS = 0.05;
const RETRACE_MIN_FRAMES = 8;
const FLOW_TO_R_PER_DAY = 86400 / ANIM_UNIT_S / FLOW_GAIN;
const READBACK_RING = 3;
const STATE_FORMAT: GPUTextureFormat = 'rgba32float';

interface Readback { readonly buffer: GPUBuffer; stage: 'idle' | 'encoded' | 'mapping'; requestedSerial: number }

export class FrictionalField {
  /** Bumped when the field has evolved enough to retrace what depends on it. */
  version = 0;
  /** The float16 B_np that FIELD_WGSL samples, with its sampler (longitude wraps). */
  readonly sampledView: GPUTextureView;
  readonly sampler: GPUSampler;

  private readonly dims: Uint32Array;
  private readonly potentialA: GPUTexture[];
  private readonly field32: GPUTexture;
  private readonly sampled: GPUTexture;
  private readonly electricTex: GPUTexture;
  private readonly potential: GPUTexture;
  private readonly uniform: GPUBuffer;
  private readonly data = new ArrayBuffer(FRICTIONAL_FLOATS * 4);
  private readonly pipes: Record<'potential' | 'curl' | 'electric' | 'advance' | 'relax' | 'clear' | 'measure' | 'coarsen', GPUComputePipeline>;
  private readonly groups: { curl: GPUBindGroup[]; advance: GPUBindGroup[]; relax: GPUBindGroup[]; clear: GPUBindGroup[]; measure: GPUBindGroup; coarsen: GPUBindGroup };
  private readonly electricGroups = new Map<GPUTextureView, GPUBindGroup>();
  private potentialGroup: GPUBindGroup | null = null;
  private fieldUniform: GPUBuffer | null = null;
  private readonly energies: GPUBuffer;
  private readonly readbacks: Readback[];
  /** The latest map read back: per lon/lat column (row-major from the south), non-potential and potential energy. */
  private readonly lastEnergies: Float32Array;
  private current = 0;
  private needsClear = true;
  private builtFieldVersion = -1;
  private daysSinceRetrace = 0;
  private framesSinceRetrace = 0;
  private relaxQueue: { dir: Vec3; angleRad: number; keep: number }[] = [];
  private querySerial = 0;
  /** Relaxes newer than the latest map: a map requested before one predates its release on the GPU, so the same
   *  release is applied to it on arrival (and at once to the map in hand) rather than letting it undo the flare. */
  private pendingRelaxes: { dir: Vec3; angleRad: number; keep: number; serial: number }[] = [];
  private acceptedSerial = -1;
  /** The half-resolution B_np the CPU samples (bref units, vec4 per cell), its buffers, and whether it holds one. */
  private readonly coarseDims: [number, number, number];
  private readonly coarse: GPUBuffer;
  private readonly coarseReadbacks: Readback[];
  private readonly cpuField: Float32Array;
  private hasCpuField = false;
  /** Counts resets, so a copy requested for the previous star is dropped. */
  private generation = 0;
  private isDestroyed = false;

  constructor(private readonly device: GPUDevice, grid: FrictionalGrid) {
    this.dims = new Uint32Array(grid);
    const energyBytes = grid[0] * grid[1] * 2 * 4;
    this.lastEnergies = new Float32Array(grid[0] * grid[1] * 2);
    this.coarseDims = [grid[0] >> 1, grid[1] >> 1, grid[2] >> 1];
    const coarseBytes = this.coarseDims[0] * this.coarseDims[1] * this.coarseDims[2] * 16;
    this.cpuField = new Float32Array(coarseBytes / 4);
    const make = (format: GPUTextureFormat): GPUTexture => device.createTexture({
      size: [grid[0], grid[1], grid[2]], dimension: '3d', format, usage: TEXTURE.STORAGE_BINDING | TEXTURE.TEXTURE_BINDING,
    });
    this.potentialA = [make(STATE_FORMAT), make(STATE_FORMAT)];
    this.field32 = make(STATE_FORMAT);
    this.electricTex = make(STATE_FORMAT);
    this.potential = make(STATE_FORMAT);
    this.sampled = make('rgba16float');
    this.sampledView = this.sampled.createView();
    this.sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear', addressModeU: 'repeat', addressModeV: 'clamp-to-edge', addressModeW: 'clamp-to-edge' });
    this.uniform = device.createBuffer({ size: FRICTIONAL_FLOATS * 4, usage: BUFFER.UNIFORM | BUFFER.COPY_DST });
    this.energies = device.createBuffer({ size: energyBytes, usage: BUFFER.STORAGE | BUFFER.COPY_SRC });
    this.coarse = device.createBuffer({ size: coarseBytes, usage: BUFFER.STORAGE | BUFFER.COPY_SRC });
    this.coarseReadbacks = Array.from({ length: 2 }, () => ({
      buffer: device.createBuffer({ size: coarseBytes, usage: BUFFER.MAP_READ | BUFFER.COPY_DST }), stage: 'idle' as const, requestedSerial: 0,
    }));
    this.readbacks = Array.from({ length: READBACK_RING }, () => ({
      buffer: device.createBuffer({ size: energyBytes, usage: BUFFER.MAP_READ | BUFFER.COPY_DST }), stage: 'idle' as const, requestedSerial: 0,
    }));
    this.pipes = {
      potential: computePipeline(device, POTENTIAL_SHADER, 'potential'),
      curl: computePipeline(device, CURL_SHADER, 'curl'),
      electric: computePipeline(device, ELECTRIC_SHADER, 'electric'),
      advance: computePipeline(device, ADVANCE_SHADER, 'advance'),
      relax: computePipeline(device, RELAX_SHADER, 'relax'),
      clear: computePipeline(device, CLEAR_SHADER, 'clearField'),
      measure: computePipeline(device, MEASURE_SHADER, 'measure'),
      coarsen: computePipeline(device, COARSEN_SHADER, 'coarsen'),
    };
    const u = { buffer: this.uniform }, view = (t: GPUTexture): GPUTextureView => t.createView();
    const [a0, a1] = this.potentialA;
    // index = the A texture currently holding the field; each pass that writes A writes the other
    this.groups = {
      curl: [a0, a1].map((a) => bindGroup(device, this.pipes.curl, [null, u, null, view(a), view(this.field32), view(this.sampled)])),
      advance: [[a0, a1], [a1, a0]].map(([from, to]) => bindGroup(device, this.pipes.advance, [null, u, null, view(from), null, null, null, null, null, null, view(this.electricTex), view(to)])),
      relax: [[a0, a1], [a1, a0]].map(([from, to]) => bindGroup(device, this.pipes.relax, [null, u, null, view(from), null, null, null, null, null, null, null, view(to)])),
      clear: [a0, a1].map((a) => bindGroup(device, this.pipes.clear, [null, u, null, null, null, null, null, null, null, null, null, view(a)])),
      measure: bindGroup(device, this.pipes.measure, [null, u, null, view(this.field32), null, null, view(this.potential), null, null, null, null, null, null, null, { buffer: this.energies }]),
      coarsen: bindGroup(device, this.pipes.coarsen, [null, u, null, view(this.field32), null, null, null, null, null, null, null, null, null, null, null, { buffer: this.coarse }]),
    };
  }

  /** A new star: no stress anywhere. */
  reset(): void {
    this.needsClear = true;
    this.builtFieldVersion = -1;
    this.relaxQueue = [];
    this.lastEnergies.fill(0);
    this.hasCpuField = false;
    this.cpuField.fill(0);
    this.generation++;
    this.pendingRelaxes = [];
    this.acceptedSerial = -1;
    this.version++;
  }

  /** A flare or eruption near `dir`: B_np there is scaled to `keep` at the centre, fading out over `angleRad`. */
  relax(dir: Vec3, angleRad: number, keep: number): void {
    if (this.relaxQueue.length >= MAX_RELAX) return;
    const relax = { dir, angleRad, keep: Math.max(0, Math.min(1, keep)) };
    this.relaxQueue.push(relax);
    const pending = { ...relax, serial: this.querySerial + 1 };
    this.pendingRelaxes.push(pending);
    this.relaxMap(pending);
  }

  /** Evolve by dDays star days, driven by the surface flow. `fieldUniform`: the field maps' dipole uniform
   *  (FieldMaps.uniform, shaders/field.ts Field), written for this frame before this encoder runs. */
  step(encoder: GPUCommandEncoder, dDays: number, field: StarField, fieldUniform: GPUBuffer, flowState: GPUTextureView): void {
    this.bindField(fieldUniform);
    const groups3 = Array.from(this.dims, (n) => Math.ceil(n / WORKGROUP_3D));
    const run = (pipe: GPUComputePipeline, group: GPUBindGroup): void => dispatch(encoder, pipe, group, groups3[0], groups3[1], groups3[2]);
    const steps = Math.min(MAX_STEPS_PER_FRAME, Math.ceil(Math.max(dDays, 0) / MAX_STEP_DAYS));
    const dt = steps > 0 ? Math.min(MAX_STEP_DAYS, dDays / steps) : 0;
    this.writeUniform(dt, field);
    if (this.needsClear) { run(this.pipes.clear, this.groups.clear[this.current]); this.needsClear = false; }
    if (field.version !== this.builtFieldVersion) { run(this.pipes.potential, this.potentialGroup!); this.builtFieldVersion = field.version; }
    if (this.relaxQueue.length > 0) {
      run(this.pipes.relax, this.groups.relax[this.current]);
      this.current = 1 - this.current;
      this.relaxQueue = [];
    }
    for (let s = 0; s < steps; s++) {
      run(this.pipes.curl, this.groups.curl[this.current]);
      run(this.pipes.electric, this.electricGroup(flowState));
      run(this.pipes.advance, this.groups.advance[this.current]);
      this.current = 1 - this.current;
    }
    run(this.pipes.curl, this.groups.curl[this.current]);   // B_np for this frame's sampling and measuring
    this.daysSinceRetrace += dt * steps;
    this.framesSinceRetrace++;
    if (this.daysSinceRetrace >= RETRACE_DAYS && this.framesSinceRetrace >= RETRACE_MIN_FRAMES) {
      this.version++;
      this.daysSinceRetrace = 0;
      this.framesSinceRetrace = 0;
      this.readBackCoarse(encoder, groups3);
    }
  }

  /** Request a new energy map; it arrives a few frames later for stressNear(). Call after step() in the same encoder. */
  measure(encoder: GPUCommandEncoder): void {
    if (this.isDestroyed) return;
    this.startReadbacks();
    const slot = this.readbacks.find((r) => r.stage === 'idle');
    if (!slot) return;
    dispatch(encoder, this.pipes.measure, this.groups.measure, Math.ceil(this.dims[0] / 8), Math.ceil(this.dims[1] / 8));
    encoder.copyBufferToBuffer(this.energies, 0, slot.buffer, 0, slot.buffer.size);
    slot.stage = 'encoded';
    slot.requestedSerial = ++this.querySerial;
  }

  /** Non-potential over potential magnetic energy within angleRad of dir, below 1.6 R (the stored free energy's
   *  share), or null before the first map has come back. */
  stressNear(dir: Vec3, angleRad: number): number | null {
    if (this.acceptedSerial < 0) return null;
    const [nx, ny] = this.dims, cosMax = Math.cos(angleRad);
    const lat = Math.asin(Math.max(-1, Math.min(1, dir[1]))), lon = Math.atan2(dir[0], dir[2]);
    const j0 = Math.max(0, Math.floor(((lat - angleRad) / Math.PI + 0.5) * ny)), j1 = Math.min(ny - 1, Math.ceil(((lat + angleRad) / Math.PI + 0.5) * ny));
    const halfLon = Math.min(Math.PI, angleRad / Math.max(Math.cos(Math.min(Math.abs(lat) + angleRad, 1.5)), 0.05));
    const span = Math.min(nx, 2 * Math.ceil(halfLon / (2 * Math.PI) * nx) + 1), i0 = Math.floor((lon / (2 * Math.PI) + 0.5) * nx) - (span >> 1);
    let np = 0, pot = 0;
    for (let j = j0; j <= j1; j++) {
      const cLat = (j + 0.5) / ny * Math.PI - Math.PI / 2;
      for (let e = 0; e < span; e++) {
        const i = (((i0 + e) % nx) + nx) % nx, cLon = (i + 0.5) / nx * 2 * Math.PI - Math.PI;
        const d: Vec3 = [Math.cos(cLat) * Math.sin(cLon), Math.sin(cLat), Math.cos(cLat) * Math.cos(cLon)];
        if (d[0] * dir[0] + d[1] * dir[1] + d[2] * dir[2] < cosMax) continue;
        const w = Math.cos(cLat), k = (j * nx + i) * 2;   // a column's solid angle goes as cos(lat)
        np += this.lastEnergies[k] * w; pot += this.lastEnergies[k + 1] * w;
      }
    }
    return pot > 0 ? np / pot : null;
  }

  destroy(): void {
    this.isDestroyed = true;
    [...this.potentialA, this.field32, this.electricTex, this.potential, this.sampled].forEach((t) => t.destroy());
    [this.uniform, this.energies, this.coarse, ...this.readbacks.map((r) => r.buffer), ...this.coarseReadbacks.map((r) => r.buffer)].forEach((b) => b.destroy());
  }

  private bindField(fieldUniform: GPUBuffer): void {
    if (fieldUniform === this.fieldUniform) return;
    this.fieldUniform = fieldUniform;
    this.potentialGroup = bindGroup(this.device, this.pipes.potential, [{ buffer: fieldUniform }, { buffer: this.uniform }, this.potential.createView()]);
    this.electricGroups.clear();
  }

  private electricGroup(flowState: GPUTextureView): GPUBindGroup {
    let group = this.electricGroups.get(flowState);
    if (!group) {
      if (this.electricGroups.size > 4) this.electricGroups.clear();   // a rebuilt flow brings new views
      group = bindGroup(this.device, this.pipes.electric, [
        { buffer: this.fieldUniform! }, { buffer: this.uniform }, null, this.field32.createView(), null, null,
        this.potential.createView(), flowState, this.sampler, this.electricTex.createView(),
      ]);
      this.electricGroups.set(flowState, group);
    }
    return group;
  }

  private writeUniform(dt: number, field: StarField): void {
    const f = new Float32Array(this.data), u = new Uint32Array(this.data);
    u.set([this.dims[0], this.dims[1], this.dims[2], 0], 0);
    f.set([dt, FRICTION, RESISTIVITY, MAX_SPEED_R_PER_DAY, FIELD_FLOOR, DECAY_PER_DAY, FLOW_TO_R_PER_DAY, ACTIVE_LAT_RAD], 4);
    u[12] = this.relaxQueue.length;
    f.set(field.dipoleDrifts(), 16);
    const relaxBase = 16 + 4 * MAX_DIPOLES;
    this.relaxQueue.forEach((r, i) => {
      f.set([...r.dir, r.angleRad], relaxBase + i * 4);
      f.set([r.keep, 0, 0, 0], relaxBase + (MAX_RELAX + i) * 4);
    });
    this.device.queue.writeBuffer(this.uniform, 0, this.data);
  }

  /** B_np at a point for the CPU's field, bref units (trilinear on the half-resolution copy), or null before one
   *  has come back. Zero outside the shell, faded toward the source surface as shaders/field.ts frictionalAt. */
  nonPotentialAt(p: Vec3): Vec3 | null {
    if (!this.hasCpuField) return null;
    const rr = Math.hypot(p[0], p[1], p[2]);
    if (rr >= 2.5 || rr <= 0) return [0, 0, 0];
    const [nx, ny, nz] = this.coarseDims;
    const s = 0.5 * (Math.sqrt(1 + 16 * Math.max(rr - 1, 0) / 3) - 1);
    const x = (Math.atan2(p[0], p[2]) / (2 * Math.PI) + 0.5) * nx - 0.5;
    const y = Math.min(ny - 1, Math.max(0, (Math.asin(Math.max(-1, Math.min(1, p[1] / rr))) / Math.PI + 0.5) * ny - 0.5));
    const z = Math.min(nz - 1, Math.max(0, s * nz - 0.5));
    const x0 = Math.floor(x), y0 = Math.min(ny - 2, Math.floor(y)), z0 = Math.min(nz - 2, Math.floor(z));
    const fx = x - x0, fy = y - y0, fz = z - z0, out: Vec3 = [0, 0, 0];
    for (let e = 0; e < 8; e++) {
      const dx = e & 1, dy = (e >> 1) & 1, dz = e >> 2;
      const w = (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy) * (dz ? fz : 1 - fz);
      const k = (((z0 + dz) * ny + y0 + dy) * nx + ((x0 + dx) % nx + nx) % nx) * 4;
      out[0] += w * this.cpuField[k]; out[1] += w * this.cpuField[k + 1]; out[2] += w * this.cpuField[k + 2];
    }
    const t = Math.min(1, Math.max(0, (2.5 - rr) / 0.5)), fade = t * t * (3 - 2 * t);
    return [out[0] * fade, out[1] * fade, out[2] * fade];
  }

  private readBackCoarse(encoder: GPUCommandEncoder, groups3: number[]): void {
    this.coarseReadbacks.filter((r) => r.stage === 'encoded').forEach((r) => {
      r.stage = 'mapping';
      r.buffer.mapAsync(MAP_MODE.READ).then(() => {
        if (this.isDestroyed) return;
        if (r.requestedSerial === this.generation) {   // not from before a reset
          this.cpuField.set(new Float32Array(r.buffer.getMappedRange()));
          this.hasCpuField = true;
        }
        r.buffer.unmap();
        r.stage = 'idle';
      }, () => { r.stage = 'idle'; });
    });
    const slot = this.coarseReadbacks.find((r) => r.stage === 'idle');
    if (!slot) return;
    dispatch(encoder, this.pipes.coarsen, this.groups.coarsen, Math.ceil(groups3[0] / 2), Math.ceil(groups3[1] / 2), Math.ceil(groups3[2] / 2));
    encoder.copyBufferToBuffer(this.coarse, 0, slot.buffer, 0, slot.buffer.size);
    slot.stage = 'encoded';
    slot.requestedSerial = this.generation;
  }

  /** The relax shader's scaling of B_np, on the energy map: non-potential energy goes as its square. */
  private relaxMap(relax: { dir: Vec3; angleRad: number; keep: number }): void {
    const [nx, ny] = this.dims;
    for (let j = 0; j < ny; j++) {
      const lat = (j + 0.5) / ny * Math.PI - Math.PI / 2;
      for (let i = 0; i < nx; i++) {
        const lon = (i + 0.5) / nx * 2 * Math.PI - Math.PI;
        const x = angleBetween([Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)], relax.dir) / relax.angleRad;
        if (x > 3) continue;
        const scale = 1 + (relax.keep - 1) * Math.exp(-x * x);
        this.lastEnergies[(j * nx + i) * 2] *= scale * scale;
      }
    }
  }

  /** Map the buffers encoded on earlier frames (their encoders have been submitted by now). */
  private startReadbacks(): void {
    this.readbacks.filter((r) => r.stage === 'encoded').forEach((r) => {
      r.stage = 'mapping';
      r.buffer.mapAsync(MAP_MODE.READ).then(() => {
        if (this.isDestroyed) return;
        if (r.requestedSerial > this.acceptedSerial) {
          this.lastEnergies.set(new Float32Array(r.buffer.getMappedRange()));
          this.acceptedSerial = r.requestedSerial;
          this.pendingRelaxes = this.pendingRelaxes.filter((p) => p.serial > this.acceptedSerial);
          this.pendingRelaxes.forEach((p) => this.relaxMap(p));
        }
        r.buffer.unmap();
        r.stage = 'idle';
      }, () => { r.stage = 'idle'; });
    });
  }
}
