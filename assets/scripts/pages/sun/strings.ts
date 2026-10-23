/* The strings: thousands of traced field lines that carry the corona's matter, drawn additively into the loop
 * layer. In the EUV views they are the coronal loops that give the disc and the limb their fine structure; in
 * the coronagraphs the open ones are the wind streamers that carry half the electrons. Seeding, tracing, the WSA
 * wind and the loop physics run on the GPU (shaders/strings.ts), a batch of strings per frame whenever the field
 * moves. While anything moves the corona (a CME's shock, an eruption, a drag across the sky) the motion kernel
 * bends them with Alfven waves and snaps the over-strained; nothing is read back. */

import { BUFFER, bindGroup, computePipeline, dispatch } from '../../site/gpu/device';
import type { FieldMaps } from './fieldmaps';
import { ADDITIVE, LAYER_FORMAT } from './layer';
import type { LayerDrawer, LayerFrame } from './layer';
import type { CmeState } from './cmes';
import { RSUN_KM } from './constants';
import type { Vec3 } from './vec';
import {
  DRAW_PARAMS_BYTES, DRAW_SHADER, MAX_PATH_NODES, MAX_SHOCKS, MAX_SNAPS, MAX_TRACE_NODES, MOTION_BYTES, MOTION_PARAMS_BYTES,
  MOTION_SHADER, PATH_NODE_BYTES, SNAP_FADE_S, STRING_STATE_BYTES, TRACE_PARAMS_BYTES, TRACE_SHADER, TRACE_WORKGROUP,
  WAVE_DAMP_S, WIND_CLOCK_WRAP_S,
} from './shaders/strings';
import { WHITE_LIGHT } from './views';
import type { View } from './views';

export interface StringStar { radiusSun: number; radiusKm: number; massSun: number; activity: number; bref: number }

/** Strings (re)traced per frame: a full sweep of the original's 3400 takes 6 frames. */
const STRINGS_PER_FRAME = 600;
/** The original's counts, which the EUV brightness fit (k, q) was made with. */
const FIT_CORONA_COUNT = 1400;
const FIT_EUV_COUNT = 2000;
/** White-light tube angular radius (AMB.a0) and parcel density contrast (AMB.pc). */
const TUBE_RADIUS = 0.08;
const PARCEL_CONTRAST = 1.5;
/** Strings narrower than this many pixels (half-width) are widened to it at constant total light. */
const MIN_HALF_WIDTH_PX = 0.8;
/** After the last push the motion kernel keeps running until every bump has died (~6 e-folds) and every string
 *  snapped meanwhile has faded; faded strings come back on a trace sweep every RESEED_SWEEP_S. */
const MOTION_TAIL_S = 6 * WAVE_DAMP_S + SNAP_FADE_S;
const RESEED_SWEEP_S = 1800;
/** The post-shock flow is this fraction of the shock's speed relative to the wind. */
const POST_SHOCK_FLOW = 0.6;

/** What moves the corona this frame: the heliosphere clock (unwrapped, star s) and its step, the camera rotation. */
export interface MotionFrame { readonly windS: number; readonly dWindS: number; readonly rotation: number }

const enum Mode { WhiteLight = 0, Euv = 1 }

function modeFor(view: View): Mode | null {
  if (view.index < 5) return Mode.Euv;
  if (view.index >= 7) return Mode.WhiteLight;
  return null;   // HMI continuum and magnetogram: no strings
}

export class Strings implements LayerDrawer {
  private readonly total: number;
  private readonly states: GPUBuffer;
  private readonly nodes: GPUBuffer;
  private readonly openCount: GPUBuffer;
  private readonly traceParams: GPUBuffer;
  private readonly drawParams: GPUBuffer;
  private readonly tracePipe: GPUComputePipeline;
  private readonly traceGroup: GPUBindGroup;
  private readonly drawPipe: GPURenderPipeline;
  private readonly drawGroup: GPUBindGroup;
  private readonly traceData = new Uint32Array(TRACE_PARAMS_BYTES / 4);
  private readonly drawData = new ArrayBuffer(DRAW_PARAMS_BYTES);
  private readonly motion: GPUBuffer;
  private readonly motionParams: GPUBuffer;
  private readonly motionPipe: GPUComputePipeline;
  private readonly motionGroup: GPUBindGroup;
  private readonly motionData = new ArrayBuffer(MOTION_PARAMS_BYTES);
  private readonly snaps: { dir: Vec3; angleRad: number; speedKms: number }[] = [];
  private pushRequest: { at: [number, number]; radius: number; velocity: Vec3 } | null = null;
  private moveUntilS = -Infinity;
  private nextSweepS = Infinity;
  private radiusKm = RSUN_KM;
  private seed = 0;
  private needsClear = true;
  private tracedVersion = -1;
  private cursor = 0;
  private pending = 0;

  /** coronaCount open/wind strings + euvCount closed EUV loops (original: 1400 + 2000). */
  constructor(private readonly device: GPUDevice, maps: FieldMaps, private readonly coronaCount: number, private readonly euvCount: number) {
    this.total = coronaCount + euvCount;
    const storage = BUFFER.STORAGE | BUFFER.COPY_DST | BUFFER.COPY_SRC;
    this.states = device.createBuffer({ size: this.total * STRING_STATE_BYTES, usage: storage });
    this.nodes = device.createBuffer({ size: this.total * MAX_PATH_NODES * PATH_NODE_BYTES, usage: storage });
    this.openCount = device.createBuffer({ size: 4, usage: storage });
    this.traceParams = device.createBuffer({ size: TRACE_PARAMS_BYTES, usage: BUFFER.UNIFORM | BUFFER.COPY_DST });
    this.drawParams = device.createBuffer({ size: DRAW_PARAMS_BYTES, usage: BUFFER.UNIFORM | BUFFER.COPY_DST });
    this.motion = device.createBuffer({ size: this.total * MOTION_BYTES, usage: storage });
    this.motionParams = device.createBuffer({ size: MOTION_PARAMS_BYTES, usage: BUFFER.UNIFORM | BUFFER.COPY_DST });
    this.tracePipe = computePipeline(device, TRACE_SHADER, 'traceStrings');
    this.traceGroup = bindGroup(device, this.tracePipe, maps.withFieldBindings([
      { buffer: maps.uniform }, { buffer: this.traceParams }, maps.openRaw.createView(),
      { buffer: this.states }, { buffer: this.nodes }, { buffer: this.openCount }, { buffer: this.motion },
    ]));
    this.motionPipe = computePipeline(device, MOTION_SHADER, 'moveStrings');
    this.motionGroup = bindGroup(device, this.motionPipe, [
      { buffer: this.motionParams }, { buffer: this.states }, { buffer: this.nodes }, { buffer: this.motion }, { buffer: this.openCount },
    ]);
    const module = device.createShaderModule({ code: DRAW_SHADER });
    this.drawPipe = device.createRenderPipeline({
      layout: 'auto',
      vertex: { module, entryPoint: 'vs' },
      fragment: { module, entryPoint: 'fs', targets: [{ format: LAYER_FORMAT, blend: ADDITIVE }] },
      primitive: { topology: 'triangle-strip' },
    });
    this.drawGroup = bindGroup(device, this.drawPipe, [
      { buffer: this.drawParams }, { buffer: this.states }, { buffer: this.nodes }, { buffer: this.openCount }, { buffer: this.motion },
    ]);
  }

  /** New star: reseed everything (deterministic per star key seed). */
  reset(star: StringStar, seed: number): void {
    this.radiusKm = star.radiusKm;
    this.seed = seed >>> 0;
    this.needsClear = true;
    this.snaps.length = 0;
    this.pushRequest = null;
    this.moveUntilS = -Infinity;
    this.nextSweepS = Infinity;
  }

  /** An eruption: the closed strings rooted within angleRad of dir snap and fly out at speedKms (loops.ts). */
  snapNear(dir: Vec3, angleRad: number, speedKms: number): void {
    if (this.snaps.length < MAX_SNAPS) this.snaps.push({ dir, angleRad, speedKms });
  }

  /** A drag across the sky: string nodes within radius (R) of a view-plane point get velocity (star frame, R/s). */
  push(at: [number, number], radius: number, velocity: Vec3): void {
    this.pushRequest = { at, radius, velocity };
  }

  /** After update(): bend, snap and fade the strings while anything is moving them. */
  move(encoder: GPUCommandEncoder, frame: MotionFrame, cmes: readonly CmeState[]): void {
    const shocks = cmes.filter((c) => c.active && c.shock[3] > 0).slice(0, MAX_SHOCKS);
    if (shocks.length > 0 || this.snaps.length > 0 || this.pushRequest) {
      this.moveUntilS = frame.windS + MOTION_TAIL_S;
      if (this.nextSweepS === Infinity) this.nextSweepS = frame.windS + RESEED_SWEEP_S;
    }
    if (frame.windS >= this.nextSweepS) {
      this.pending = this.total;
      this.nextSweepS = frame.windS < this.moveUntilS + RESEED_SWEEP_S ? frame.windS + RESEED_SWEEP_S : Infinity;
    }
    if (frame.windS > this.moveUntilS) return;
    this.writeMotionParams(frame, shocks);
    dispatch(encoder, this.motionPipe, this.motionGroup, Math.ceil(this.total / TRACE_WORKGROUP));
    this.snaps.length = 0;
    this.pushRequest = null;
  }

  /** After maps.update() in the same encoder: seed on the first frames, then retrace (relaxing old -> new) a
   *  batch per frame until every string has seen the current field version. */
  update(encoder: GPUCommandEncoder, fieldVersion: number): void {
    if (this.needsClear) {
      encoder.clearBuffer(this.states);
      encoder.clearBuffer(this.motion);
      encoder.clearBuffer(this.openCount);
      this.needsClear = false;
      this.cursor = 0;
      this.tracedVersion = fieldVersion;
      this.pending = this.total;
    }
    if (fieldVersion !== this.tracedVersion) {
      this.tracedVersion = fieldVersion;
      this.pending = this.total;
    }
    if (this.pending === 0) return;
    const count = Math.min(STRINGS_PER_FRAME, this.pending);
    this.traceData.set([this.cursor, count, this.total, this.coronaCount, this.seed]);
    this.device.queue.writeBuffer(this.traceParams, 0, this.traceData);
    dispatch(encoder, this.tracePipe, this.traceGroup, Math.ceil(count / TRACE_WORKGROUP));
    this.cursor = (this.cursor + count) % this.total;
    this.pending -= count;
  }

  draw(pass: GPURenderPassEncoder, frame: LayerFrame): void {
    const mode = modeFor(frame.view);
    if (mode === null) return;
    this.writeDrawParams(frame, mode);
    pass.setPipeline(this.drawPipe);
    pass.setBindGroup(0, this.drawGroup);
    // white light draws the wind strings' whole paths; EUV every string's traced line
    if (mode === Mode.WhiteLight) pass.draw(2 * MAX_PATH_NODES, this.coronaCount);
    else pass.draw(2 * MAX_TRACE_NODES, this.total);
  }

  /** Fraction of white-light electrons the drawn strings carry (the original's AMB.fs), 0 if not drawing them. */
  stringFractionFor(view: View): number {
    return modeFor(view) === Mode.WhiteLight ? WHITE_LIGHT.stringFraction : 0;
  }

  destroy(): void {
    [this.states, this.nodes, this.openCount, this.traceParams, this.drawParams, this.motion, this.motionParams].forEach((b) => b.destroy());
  }

  private writeMotionParams(frame: MotionFrame, shocks: readonly CmeState[]): void {
    const f = new Float32Array(this.motionData), u = new Uint32Array(this.motionData), km = this.radiusKm;
    f.fill(0);
    f.set([frame.windS % WIND_CLOCK_WRAP_S, frame.dWindS, frame.rotation, km]);
    u.set([this.total, this.coronaCount, shocks.length, this.snaps.length], 4);
    const push = this.pushRequest;
    if (push) f.set([push.at[0], push.at[1], push.radius, 1, ...push.velocity, 0], 8);
    shocks.forEach((c, k) => {
      const [centre, outer, thickness, speedKms] = c.shock;
      f.set([c.dir[0] * centre, c.dir[1] * centre, c.dir[2] * centre, outer, ...c.dir, thickness, POST_SHOCK_FLOW * speedKms / km, 0, 0, 0], 16 + k * 12);
    });
    const snapBase = 16 + MAX_SHOCKS * 12;
    this.snaps.forEach((e, k) => f.set([...e.dir, e.angleRad, e.speedKms / km, 0, 0, 0], snapBase + k * 8));
    this.device.queue.writeBuffer(this.motionParams, 0, this.motionData);
  }

  private writeDrawParams(frame: LayerFrame, mode: Mode): void {
    const { view } = frame, fit = view.fit;
    const f = new Float32Array(this.drawData), u = new Uint32Array(this.drawData);
    f.set([frame.starX, frame.starY, frame.width, frame.height, frame.radiusPx, frame.rotation, frame.windClockS, MIN_HALF_WIDTH_PX / frame.radiusPx]);
    f.set(view.tint, 8);
    u[11] = mode;
    u[12] = view.index;
    u[13] = this.coronaCount;
    f.set([this.radiusKm, view.occulter ?? 0, fit.stringK, fit.stringQ, fit.limbAbs, TUBE_RADIUS, WHITE_LIGHT.stringFraction, PARCEL_CONTRAST,
      FIT_CORONA_COUNT / Math.max(this.coronaCount, 1), FIT_EUV_COUNT / Math.max(this.euvCount, 1)], 14);
    this.device.queue.writeBuffer(this.drawParams, 0, this.drawData);
  }
}
