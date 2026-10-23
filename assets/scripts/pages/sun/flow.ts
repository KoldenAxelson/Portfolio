/* The star's surface plasma (dwarfstar.online/play's advect.glsl + stepFlow) as WebGPU compute: a compressible
 * shallow fluid on the lon/lat chart, MacCormack advection with a limiter, pressure from density and heat, supergranule
 * and active-region forcing, field-dependent drag, vorticity confinement and a tracer the renderer draws as the network.
 *
 * Time is in anim units (6660 star seconds).
 * - The wave speed is the physical 300 km/s, the same speed the drawn EUV ring uses (waveSpeedRadPerAnim()), so the
 *   plasma wave and the ring arrive together.
 * - The sub-step comes from the wave CFL on the coarsened polar cell; past MAX_SUBSTEPS_PER_FRAME the remainder is
 *   carried into the next frame (at most one frame's worth, so a slow device loses time, never stability).
 * - Supergranules are outflow cells (Rincon & Rieutord 2018): a mass source at each cell's centre, sinks in its lanes,
 *   ~30 Mm across and a day or two old, with only a weak Coriolis swirl that scales with the star's spin.
 * - The probe reads back through a ring of mapAsync buffers; nothing waits on the GPU. */

import { BUFFER, MAP_MODE, TEXTURE, bindGroup, computePipeline, dispatch } from '../../site/gpu/device';
import { RSUN_KM } from './constants';
import {
  BODY_WGSL, CONTINUITY_WGSL, CORRECT_WGSL, FORCE_HEIGHT, FORCE_WIDTH, FORCING_WGSL, INIT_WGSL, MAX_FORCED_REGIONS,
  MAX_PROBES, MAX_SPLATS, PREDICT_WGSL, PROBE_WGSL, SUPERGRANULE_FREQUENCY, WORKGROUP_EDGE,
} from './shaders/flow';


export interface FlowRegion { lon: number; lat: number; flux: number; sep: number; sign: number; tilt: number; age: number }
export interface FlowStar { radiusSun: number; omegaRadPerDay: number; diffRot: number; activity: number; granScale: number }
/** A local injection (pointer press, drag or API push), delivered over the next step. Original values: a press is
 *  { radiusRad 0.06, heat 6, dye 4 }; a drag { radiusRad 0.05, heat 0, dye 1.5, vLon, vLat in rad per anim unit }. */
export interface FlowSplat { lon: number; lat: number; radiusRad: number; heat: number; dye: number; vLon?: number; vLat?: number }

const ANIM_SECONDS = 6660;
/** The flow runs this many times faster than the physical Sun's, so its patterns read at the default warp. */
export const FLOW_GAIN = 6;
const WAVE_SPEED_KMS = 300;
const STATE_FORMAT: GPUTextureFormat = 'rgba16float';
const MAX_SUBSTEPS_PER_FRAME = 24;
const MAX_STEP_ANIM = 0.05;
const WAVE_COURANT = 0.5;
const PROBE_RING = 3;
const PROBE_BYTES = MAX_PROBES * 2 * 4;
/** Header floats ahead of the region and splat arrays (shaders/flow.ts FlowParams). */
const PARAM_HEADER = 12;
const PARAM_FLOATS = PARAM_HEADER + 4 * (MAX_FORCED_REGIONS + 2 * MAX_SPLATS);
/** Coriolis is capped at this many times the Sun's: the explicit step stays stable on a fast rotator. */
const MAX_CORIOLIS_SUNS = 3;
const MIN_CELL_TEXELS = 3;

/** The compressive wave's speed, rad of arc per anim unit; the EUV ring must use the same. */
export function waveSpeedRadPerAnim(radiusSun: number): number {
  return WAVE_SPEED_KMS * ANIM_SECONDS / (RSUN_KM * radiusSun);
}

interface StarConstants { shearAmp: number; coriolisAmp: number; regionForceAmp: number; waveSpeed: number; granScale: number; activity: number }

type ProbeStage = 'idle' | 'encoded' | 'mapping';
interface ProbeSlot { readonly points: GPUBuffer; readonly readback: GPUBuffer; readonly groups: GPUBindGroup[]; stage: ProbeStage; sampledAtAnim: number }

export class SurfaceFlow {
  readonly lastProbe = new Float32Array(MAX_PROBES * 2);
  private completedProbes = 0;
  private probeSpanAnim = 0;

  private readonly width: number;
  private readonly height: number;
  private readonly params = new Float32Array(PARAM_FLOATS);
  private readonly paramWords = new Uint32Array(this.params.buffer);
  private readonly paramBuffer: GPUBuffer;
  private readonly sampler: GPUSampler;
  private readonly textures: GPUTexture[] = [];
  private readonly stateViews: GPUTextureView[];
  private readonly presViews: GPUTextureView[];
  private readonly predictedView: GPUTextureView;
  private readonly curlView: GPUTextureView;
  private readonly bodyView: GPUTextureView;
  private readonly forcePipe: GPUComputePipeline;
  private readonly bodyPipe: GPUComputePipeline;
  private readonly initPipe: GPUComputePipeline;
  private readonly predictPipe: GPUComputePipeline;
  private readonly correctPipe: GPUComputePipeline;
  private readonly continuityPipe: GPUComputePipeline;
  private readonly probePipe: GPUComputePipeline;
  private readonly forceGroup: GPUBindGroup;
  private readonly bodyGroup: GPUBindGroup;
  private readonly initGroups: GPUBindGroup[];
  private readonly predictGroups: GPUBindGroup[];
  private readonly continuityGroups: GPUBindGroup[];
  private correctGroups: GPUBindGroup[] = [];
  private correctFieldView: GPUTextureView | null = null;
  private readonly probeOut: GPUBuffer;
  private readonly probeSlots: ProbeSlot[];
  private readonly splats: FlowSplat[] = [];
  private star: StarConstants | null = null;
  private current = 0;
  private needsInit = true;
  private carriedAnim = 0;
  private plasmaTimeAnim = 0;
  private lastProbeSampledAnim = 0;
  private isDestroyed = false;

  constructor(private readonly device: GPUDevice, width: 512 | 256) {
    this.width = width;
    this.height = width / 2;
    this.paramBuffer = device.createBuffer({ size: PARAM_FLOATS * 4, usage: BUFFER.UNIFORM | BUFFER.COPY_DST });
    this.sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear', addressModeU: 'repeat', addressModeV: 'clamp-to-edge' });
    const chartView = (w: number, h: number): GPUTextureView => {
      const texture = device.createTexture({ size: [w, h], format: STATE_FORMAT, usage: TEXTURE.STORAGE_BINDING | TEXTURE.TEXTURE_BINDING | TEXTURE.COPY_SRC });
      this.textures.push(texture);
      return texture.createView();
    };
    const fullView = (): GPUTextureView => chartView(this.width, this.height);
    this.stateViews = [fullView(), fullView()];
    this.presViews = [fullView(), fullView()];
    this.predictedView = fullView();
    this.curlView = fullView();
    this.bodyView = fullView();
    const forceView = chartView(FORCE_WIDTH, FORCE_HEIGHT);

    this.forcePipe = computePipeline(device, FORCING_WGSL, 'forcing');
    this.bodyPipe = computePipeline(device, BODY_WGSL, 'body');
    this.initPipe = computePipeline(device, INIT_WGSL, 'init');
    this.predictPipe = computePipeline(device, PREDICT_WGSL, 'predict');
    this.correctPipe = computePipeline(device, CORRECT_WGSL, 'correct');
    this.continuityPipe = computePipeline(device, CONTINUITY_WGSL, 'continuity');
    this.probePipe = computePipeline(device, PROBE_WGSL, 'probe');

    const uniform = { buffer: this.paramBuffer };
    this.forceGroup = bindGroup(device, this.forcePipe, [uniform, forceView]);
    this.bodyGroup = bindGroup(device, this.bodyPipe, [uniform, this.sampler, forceView, this.bodyView]);
    // index = parity of the current state; a sub-step flips state and pressure together
    this.initGroups = [0, 1].map((p) => bindGroup(device, this.initPipe, [this.bodyView, this.stateViews[p], this.presViews[p]]));
    this.predictGroups = [0, 1].map((p) => bindGroup(device, this.predictPipe, [uniform, this.sampler, this.stateViews[p], this.predictedView, this.curlView]));
    this.continuityGroups = [0, 1].map((p) => bindGroup(device, this.continuityPipe, [uniform, this.sampler, this.stateViews[1 - p], this.presViews[p], this.presViews[1 - p], this.bodyView]));

    this.probeOut = device.createBuffer({ size: PROBE_BYTES, usage: BUFFER.STORAGE | BUFFER.COPY_SRC });
    this.probeSlots = Array.from({ length: PROBE_RING }, () => {
      const points = device.createBuffer({ size: PROBE_BYTES, usage: BUFFER.STORAGE | BUFFER.COPY_DST });
      const readback = device.createBuffer({ size: PROBE_BYTES, usage: BUFFER.MAP_READ | BUFFER.COPY_DST });
      const groups = [0, 1].map((p) => bindGroup(device, this.probePipe, [this.sampler, this.stateViews[p], this.presViews[p], { buffer: points }, { buffer: this.probeOut }]));
      return { points, readback, groups, stage: 'idle' as ProbeStage, sampledAtAnim: 0 };
    });
  }

  get state(): GPUTextureView { return this.stateViews[this.current]; }
  /** Counts completed probe readbacks: a change means lastProbe holds new values. */
  get probeSerial(): number { return this.completedProbes; }
  /** Plasma time between the samples of the two most recent completed probes (the original's probeAcc). */
  get lastProbeSpanAnim(): number { return this.probeSpanAnim; }

  reset(star: FlowStar): void {
    this.star = {
      shearAmp: 0.0042 * star.diffRot * FLOW_GAIN * (star.omegaRadPerDay / 0.247),
      coriolisAmp: 2 * 0.6 * 0.0042 * FLOW_GAIN * Math.min(MAX_CORIOLIS_SUNS, star.omegaRadPerDay / 0.247),
      regionForceAmp: 0.006 * FLOW_GAIN * Math.min(2, Math.sqrt(star.activity)),
      waveSpeed: waveSpeedRadPerAnim(star.radiusSun),
      // supergranules (shaders/flow.ts, 20 / granScale per radius) kept at least MIN_CELL_TEXELS across on this grid
      granScale: Math.max(star.granScale, SUPERGRANULE_FREQUENCY * 2 * Math.PI * MIN_CELL_TEXELS / this.width),
      activity: star.activity,
    };
    this.needsInit = true;
    this.carriedAnim = 0;
    this.splats.length = 0;
  }

  splat(s: FlowSplat): void {
    this.splats.push(s);
    if (this.splats.length > MAX_SPLATS) this.splats.shift();
  }

  /** One call per submitted encoder: the uniforms are written through the queue, so a second call before the submit
   *  would overwrite the first's. */
  step(encoder: GPUCommandEncoder, dtAnim: number, regions: readonly FlowRegion[], fieldMap: GPUTextureView): void {
    if (!this.star || this.isDestroyed) return;
    const dueAnim = this.carriedAnim + Math.max(0, dtAnim);
    const maxStepAnim = this.maxStepAnim();
    const substeps = Math.min(MAX_SUBSTEPS_PER_FRAME, Math.ceil(dueAnim / maxStepAnim));
    const stepAnim = substeps > 0 ? Math.min(maxStepAnim, dueAnim / substeps) : 0;
    const simulatedAnim = stepAnim * substeps;
    this.carriedAnim = Math.min(Math.max(0, dueAnim - simulatedAnim), MAX_SUBSTEPS_PER_FRAME * maxStepAnim);

    this.writeParams(this.star, regions, stepAnim, simulatedAnim);
    this.splats.length = 0;
    this.bindField(fieldMap);
    const groupsX = Math.ceil(this.width / WORKGROUP_EDGE), groupsY = Math.ceil(this.height / WORKGROUP_EDGE);
    dispatch(encoder, this.forcePipe, this.forceGroup, FORCE_WIDTH / WORKGROUP_EDGE, FORCE_HEIGHT / WORKGROUP_EDGE);
    dispatch(encoder, this.bodyPipe, this.bodyGroup, groupsX, groupsY);
    if (this.needsInit) {
      dispatch(encoder, this.initPipe, this.initGroups[this.current], groupsX, groupsY);
      this.needsInit = false;
    }
    for (let k = 0; k < substeps; k++) {
      dispatch(encoder, this.predictPipe, this.predictGroups[this.current], groupsX, groupsY);
      dispatch(encoder, this.correctPipe, this.correctGroups[this.current], groupsX, groupsY);
      dispatch(encoder, this.continuityPipe, this.continuityGroups[this.current], groupsX, groupsY);
      this.current = 1 - this.current;
    }
    this.plasmaTimeAnim += simulatedAnim;
  }

  /** Samples (heat, density excess) at up to 48 points into lastProbe, asynchronously. The readback is started on the
   *  next probe() call (after the caller has submitted this encoder), so results trail by one probe call plus the map. */
  probe(encoder: GPUCommandEncoder, points: readonly { lon: number; lat: number }[]): void {
    if (this.isDestroyed) return;
    this.startReadbacks();
    const slot = this.probeSlots.find((s) => s.stage === 'idle');
    if (!slot) return;   // all buffers in flight: skip this sample rather than wait
    const lonLat = new Float32Array(MAX_PROBES * 2);
    points.slice(0, MAX_PROBES).forEach((p, i) => lonLat.set([p.lon, p.lat], i * 2));
    this.device.queue.writeBuffer(slot.points, 0, lonLat);
    dispatch(encoder, this.probePipe, slot.groups[this.current], 1);
    encoder.copyBufferToBuffer(this.probeOut, 0, slot.readback, 0, PROBE_BYTES);
    slot.stage = 'encoded';
    slot.sampledAtAnim = this.plasmaTimeAnim;
  }

  destroy(): void {
    this.isDestroyed = true;
    this.textures.forEach((t) => t.destroy());
    this.probeSlots.forEach((s) => { s.points.destroy(); s.readback.destroy(); });
    this.probeOut.destroy();
    this.paramBuffer.destroy();
  }

  /** Wave Courant 0.5 on the smallest wave cell (the coarsened polar cap); a drag's speed under one cell per step. */
  private maxStepAnim(): number {
    const star = this.star;
    if (!star) return MAX_STEP_ANIM;
    const polarCellRad = Math.min(2 * Math.PI / this.width * 0.25, Math.PI / this.height);
    const splatSpeed = Math.max(0, ...this.splats.map((s) => Math.hypot(s.vLon ?? 0, s.vLat ?? 0)));
    const splatLimit = splatSpeed > 0 ? polarCellRad / splatSpeed : MAX_STEP_ANIM;
    return Math.min(MAX_STEP_ANIM, WAVE_COURANT * polarCellRad / star.waveSpeed, splatLimit);
  }

  private writeParams(star: StarConstants, regions: readonly FlowRegion[], stepAnim: number, simulatedAnim: number): void {
    const p = this.params;
    p.fill(0);
    p.set([star.shearAmp, star.regionForceAmp, star.waveSpeed, star.granScale, this.plasmaTimeAnim, stepAnim, 0, 0, star.coriolisAmp]);
    const forced = regions.slice(0, MAX_FORCED_REGIONS);
    const splats = simulatedAnim > 0 ? this.splats : [];
    this.paramWords[6] = forced.length;
    this.paramWords[7] = splats.length;
    forced.forEach((r, i) => {
      const cosLat = Math.cos(r.lat);
      // the original's |moment| * 200 with moment 0.0065 flux activity
      p.set([cosLat * Math.sin(r.lon), Math.sin(r.lat), cosLat * Math.cos(r.lon), 1.3 * Math.abs(r.flux) * star.activity], PARAM_HEADER + i * 4);
    });
    const splatBase = PARAM_HEADER + MAX_FORCED_REGIONS * 4, rateBase = splatBase + MAX_SPLATS * 4;
    // a splat's total momentum, heat and dye are delivered over the time this step actually simulates
    splats.forEach((s, i) => {
      p.set([s.lon, s.lat, (s.vLon ?? 0) / simulatedAnim, (s.vLat ?? 0) / simulatedAnim], splatBase + i * 4);
      p.set([s.radiusRad, s.heat * 0.02 / simulatedAnim, s.dye * 0.02 / simulatedAnim, 0], rateBase + i * 4);
    });
    this.device.queue.writeBuffer(this.paramBuffer, 0, p);
  }

  private bindField(fieldMap: GPUTextureView): void {
    if (fieldMap === this.correctFieldView) return;
    this.correctFieldView = fieldMap;
    this.correctGroups = [0, 1].map((p) => bindGroup(this.device, this.correctPipe, [
      { buffer: this.paramBuffer }, this.sampler, this.stateViews[p], this.predictedView, this.presViews[p], this.curlView,
      this.bodyView, fieldMap, this.stateViews[1 - p],
    ]));
  }

  private startReadbacks(): void {
    this.probeSlots.filter((s) => s.stage === 'encoded').forEach((slot) => {
      slot.stage = 'mapping';
      slot.readback.mapAsync(MAP_MODE.READ).then(() => this.acceptProbe(slot), () => { slot.stage = 'idle'; });
    });
  }

  private acceptProbe(slot: ProbeSlot): void {
    if (this.isDestroyed) return;
    if (slot.sampledAtAnim >= this.lastProbeSampledAnim) {
      this.lastProbe.set(new Float32Array(slot.readback.getMappedRange()));
      this.probeSpanAnim = slot.sampledAtAnim - this.lastProbeSampledAnim;
      this.lastProbeSampledAnim = slot.sampledAtAnim;
      this.completedProbes++;
    }
    slot.readback.unmap();
    slot.stage = 'idle';
  }
}
