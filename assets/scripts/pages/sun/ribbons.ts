/* The event loops' look: loop strands, flare arcades, flare ribbons and coronal rain built on the CPU each frame into
 * one triangle strip that shaders/loops.ts draws additively into the loop layer, in the five EUV views and (the
 * white-light flares) the HMI continuum. loops.ts owns the physics and hands each draw a RibbonScene. */

import { BUFFER, bindGroup } from '../../site/gpu/device';
import { ANIM_UNIT_S } from './clock';
import { RSUN_KM } from './constants';
import { ADDITIVE, LAYER_FORMAT } from './layer';
import type { LayerFrame } from './layer';
import type { Arcade, ArcadeStrand, EventLoop } from './loops';
import { ARCADE_HEAT_TAU_S, CM_PER_RSUN, halfLengthCm, loopVolumeCm3 } from './plasma';
import { RIBBON_SHADER, RIBBON_UNIFORM_FLOATS, RIBBON_VERTEX_FLOATS } from './shaders/loops';
import { blackbodyColor } from './stars';
import type { Derived } from './stars';
import { add, cross, dot, length, normalize, rotY, scale } from './vec';
import type { Vec3 } from './vec';
import { aiaResponse, euvExposure } from './views';

/** A rising rope dilutes to nothing at this lift; loops.ts retires it at the same height, so it has faded out first. */
export const ROPE_FADE_LIFT = 7;
const MAX_RIBBON_VERTICES = 1 << 16;
/** Catmull-Rom points per traced segment of a strand. */
const SUBDIVIDE = 4;
/** Segments of an arcade strand's semicircle. */
const ARCADE_SEGMENTS = 16;
const PROMINENCE_VIEW = 3;
const HMI_VIEW = 5;
/** The loops fade in over this share of their life and out from FADE_OUT_FROM on. */
const FADE_IN_SHARE = 0.25;
const FADE_OUT_FROM = 0.6;
/** Ribbon half-widths (R): a strand's core (widened per strand and by the lift), a flare ribbon, a rain streak. */
const STRAND_WIDTH = 0.0075;
const FLARE_RIBBON_WIDTH = 0.003;
const RAIN_WIDTH = 0.0055;
/** Half-length of a flare-ribbon dash along the inversion line, and the arcade's row of strands along it (R). */
const FLARE_RIBBON_HALF_LENGTH = 0.004;
const ARCADE_ROW_SPAN = 0.06;
/** A strand's intensity saturates softly at this, so a hot loop does not draw as a flat white bar. */
const STRAND_SATURATION = 2.5;
/** Phase between a rope's three strands. */
const STRAND_PHASE = 2 * Math.PI / 3;
/** The heating front runs from the footpoint it entered at, in star time. */
const FRONT_SPEED_KMS = 500;
/** Flare-ribbon weight per EUV channel (strongest in 304) and rain-knot weight. */
const RIBBON_WEIGHT = [0.35, 0.25, 0.25, 1.0, 0.45];
const RAIN_WEIGHT = [0.45, 0.3, 0.25, 1.6, 0.35];
/** White-light flares (HMI continuum): the share of a ribbon's footprint the hot kernel fills per unit of its log
 *  heating, set so an X-class solar ribbon brightens the continuum by ~10-20 % (Hudson et al. 2006); the photosphere's
 *  display level in the HMI view (shaders/star.ts); the kernel's colour. */
const WHITE_LIGHT_FILL = 0.03;
const HMI_PHOTOSPHERE_LEVEL = 1.25;
const FLARE_KERNEL_COLOR = blackbodyColor(9000);

export interface RainStreak { readonly head: Vec3; readonly tail: Vec3; readonly brightness: number }

/** What one draw needs from loops.ts. Times: sim units (ANIM_UNIT_S star seconds) and anim units (clock.ts). */
export interface RibbonScene {
  /** The live loops, in slot order. */
  readonly loops: readonly EventLoop[];
  readonly derived: Derived;
  /** Low tier: one strand per loop. */
  readonly isLite: boolean;
  readonly simTime: number;
  readonly anim: number;
  readonly radiusSun: number;
  readonly scaleHeightPerMK: number;
  /** A flare kernel's continuum excess over this star's photosphere (stars.ts flareContrast). */
  readonly flareContrast: number;
  /** A strand's traced points, star frame. */
  strand(row: number): Vec3[];
  /** A loop's lifetime (sim units) at a strength. */
  lifetime(strength: number): number;
  rainStreaks(): RainStreak[];
}

interface StrandLook {
  readonly response: number;
  readonly densityScale: number;
  readonly age: number;
  readonly isProminence: boolean;
  readonly tint: Vec3;
  readonly scaleHeight: number;
  readonly flickerSpeed: number;
  readonly gain: number;
  readonly eruption: number;
  readonly drain: number;
}

/** The plane of an arcade: its centre, the axis across the inversion line, and the inversion line. */
interface ArcadeFrame { readonly centre: Vec3; readonly across: Vec3; readonly inversionLine: Vec3 }

export const polylineLength = (pts: Vec3[]): number => pts.reduce((sum, p, j) => (j ? sum + length(add(p, pts[j - 1], -1)) : 0), 0);
const catmullRom = (a: number, b: number, c: number, d: number, t: number): number =>
  0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
const isBehindDisc = (q: Vec3): boolean => q[2] < 0 && q[0] * q[0] + q[1] * q[1] < 1;

/** Screen-plane normal of length `width` to the segment a -> b (view frame). */
function screenNormal(a: Vec3, b: Vec3, width: number): [number, number] {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1e-6;
  return [-dy / l * width, dx / l * width];
}

/** The ribbon vertex stream: strips of (-side, +side) pairs joined by degenerate triangles (a leading and a closing
 *  duplicate per strip keep the parity). */
class RibbonStrip {
  readonly data = new Float32Array(MAX_RIBBON_VERTICES * RIBBON_VERTEX_FLOATS);
  count = 0;
  private isOpen = false;

  clear(): void { this.count = 0; this.isOpen = false; }
  /** Room for a strip of `pairs` cross-sections (plus its two duplicates). */
  hasRoom(pairs: number): boolean { return this.count + 2 * pairs + 2 <= MAX_RIBBON_VERTICES; }

  pair(point: Vec3, normalX: number, normalY: number, colour: Vec3): void {
    if (!this.isOpen) { this.put(point, -normalX, -normalY, colour, -1); this.isOpen = true; }
    this.put(point, -normalX, -normalY, colour, -1);
    this.put(point, normalX, normalY, colour, 1);
  }

  end(): void {
    if (!this.isOpen) return;
    const last = (this.count - 1) * RIBBON_VERTEX_FLOATS;
    this.data.copyWithin(last + RIBBON_VERTEX_FLOATS, last, last + RIBBON_VERTEX_FLOATS);
    this.count++;
    this.isOpen = false;
  }

  private put(point: Vec3, sideX: number, sideY: number, colour: Vec3, edge: number): void {
    this.data.set([point[0], point[1], sideX, sideY, colour[0], colour[1], colour[2], edge], this.count * RIBBON_VERTEX_FLOATS);
    this.count++;
  }
}

/** A strand's traced points in the view frame, lifted with its rope and twisted around the rope's axis. */
function liftedPath(traced: Vec3[], loop: EventLoop, strand: number, rotation: number): Vec3[] {
  const path: Vec3[] = [];
  for (let j = 0, prev: Vec3 | null = null; j < traced.length; j++) {
    const along = j / (traced.length - 1), sine = Math.sin(Math.PI * along), current = rotY(traced[j], rotation);
    let p = scale(current, 1 + loop.lift * sine);
    if (loop.lift > 0.001 && prev) {
      const tangent = normalize(add(current, prev, -1)), e1 = normalize(cross(tangent, normalize(current))), e2 = cross(tangent, e1);
      const phase = strand * STRAND_PHASE + loop.twist * along * 2 * Math.PI, ropeRadius = (0.015 + 0.12 * loop.lift) * sine;
      p = add(add(p, e1, Math.cos(phase) * ropeRadius), e2, Math.sin(phase) * ropeRadius);
    }
    path.push(p);
    prev = current;
  }
  return path;
}

/** The path subdivided SUBDIVIDE times (Catmull-Rom). */
function smoothPath(path: Vec3[]): Vec3[] {
  const last = path.length - 1;
  return Array.from({ length: last * SUBDIVIDE + 1 }, (_, m) => {
    const fm = m / SUBDIVIDE, j = Math.min(last - 1, Math.floor(fm)), t = fm - j;
    const a = path[Math.max(j - 1, 0)], b = path[j], c = path[j + 1], d = path[Math.min(j + 2, last)];
    return [0, 1, 2].map((x) => catmullRom(a[x], b[x], c[x], d[x], t)) as Vec3;
  });
}

function arcadeFrame(loop: EventLoop): ArcadeFrame {
  const centre = normalize(add(loop.foot, loop.farFoot));
  const span = add(loop.farFoot, loop.foot, -1), across = normalize(add(span, centre, -dot(span, centre)));
  return { centre, across, inversionLine: normalize(cross(centre, across)) };
}

/** Radius (R) of the semicircle of a strand's half-length. */
const strandRadius = (strand: ArcadeStrand, radiusSun: number): number =>
  (2 / Math.PI) * halfLengthCm(strand.lengthR, radiusSun) / (CM_PER_RSUN * radiusSun);

/** A strand's place in the arcade's row along the inversion line. */
const rowOffset = (index: number, strandCount: number): number => (index / (strandCount - 1) - 0.5) * ARCADE_ROW_SPAN;

/** The log heating streaming down to a strand's feet, relative to its loop's background. */
function footHeating(loop: EventLoop, strand: ArcadeStrand, anim: number): number {
  const heat = Math.exp(-(anim - strand.formsAtAnim) * ANIM_UNIT_S / ARCADE_HEAT_TAU_S);
  return Math.log10(1 + 30 * heat * strand.peakHeating / Math.max(loop.backgroundHeating, 1e-9) / 1e4);
}

export class LoopRibbons {
  private readonly strip = new RibbonStrip();
  private readonly pipeline: GPURenderPipeline;
  private readonly vertices: GPUBuffer;
  private readonly passUniform: GPUBuffer;
  private readonly group: GPUBindGroup;

  constructor(private readonly device: GPUDevice) {
    const module = device.createShaderModule({ code: RIBBON_SHADER });
    this.pipeline = device.createRenderPipeline({
      layout: 'auto',
      vertex: { module, entryPoint: 'vs' },
      fragment: { module, entryPoint: 'fs', targets: [{ format: LAYER_FORMAT, blend: ADDITIVE }] },
      primitive: { topology: 'triangle-strip' },
    });
    this.vertices = device.createBuffer({ size: this.strip.data.byteLength, usage: BUFFER.STORAGE | BUFFER.COPY_DST });
    this.passUniform = device.createBuffer({ size: RIBBON_UNIFORM_FLOATS * 4, usage: BUFFER.UNIFORM | BUFFER.COPY_DST });
    this.group = bindGroup(device, this.pipeline, [{ buffer: this.passUniform }, { buffer: this.vertices }]);
  }

  draw(pass: GPURenderPassEncoder, frame: LayerFrame, scene: RibbonScene): void {
    // EUV, and the HMI continuum's white-light flares; the coronagraphs draw matter on the strings
    if (frame.view.index > HMI_VIEW) return;
    this.strip.clear();
    this.build(frame, scene);
    if (this.strip.count === 0) return;
    const queue = this.device.queue;
    queue.writeBuffer(this.vertices, 0, this.strip.data, 0, this.strip.count * RIBBON_VERTEX_FLOATS);
    queue.writeBuffer(this.passUniform, 0, new Float32Array([frame.width, frame.height, frame.starX, frame.starY, frame.radiusPx, 0, 0, 0]));
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.group);
    pass.draw(this.strip.count);
  }

  destroy(): void {
    this.vertices.destroy();
    this.passUniform.destroy();
  }

  private build(frame: LayerFrame, scene: RibbonScene): void {
    const view = frame.view.index, tint = frame.view.tint as Vec3, rotation = frame.rotation;
    if (view === HMI_VIEW) {
      for (const loop of scene.loops) if (loop.arcade) this.buildWhiteLightRibbons(scene, loop, loop.arcade, rotation);
      return;
    }
    const exposureGain = Math.pow(euvExposure(frame.view, scene.derived.activity, scene.derived.tcor), 0.6);
    for (const loop of scene.loops) this.buildLoop(scene, loop, rotation, view, tint, exposureGain);
    for (const loop of scene.loops) if (loop.arcade) this.buildArcade(scene, loop, loop.arcade, rotation, view, tint);
    this.buildRain(scene.rainStreaks(), rotation, view, tint);
  }

  private buildLoop(scene: RibbonScene, loop: EventLoop, rotation: number, view: number, tint: Vec3, exposureGain: number): void {
    const age = scene.simTime - loop.bornAtSim, lifeFraction = age / scene.lifetime(loop.strength);
    if (!loop.isErupting && (lifeFraction < 0 || lifeFraction > 1)) return;
    // a flaring loop shines by its plasma, not its formation envelope
    const envelope = !loop.isErupting && !loop.arcade
      ? Math.min(1, lifeFraction / FADE_IN_SHARE) * (1 - Math.max(0, (lifeFraction - FADE_OUT_FROM) / (1 - FADE_OUT_FROM)))
      : 1;
    const isProminence = view === PROMINENCE_VIEW;
    // the channel brightness already holds the emission measure
    const response = loop.channelBrightness ? loop.channelBrightness[view] : aiaResponse(loop.temperatureMK, view);
    if (response < 0.01 && !isProminence) return;
    const look: StrandLook = {
      response, age, isProminence, tint,
      densityScale: loop.channelBrightness ? 1 : loop.density,
      scaleHeight: scene.scaleHeightPerMK * loop.temperatureMK,
      flickerSpeed: 0.35 + 0.5 * ((loop.seed * 0.37) % 1),
      gain: envelope * (0.9 + 0.5 * loop.strength) * (1 + 2 * loop.glow) * exposureGain * (loop.isErupting ? Math.exp(-Math.max(loop.lift - 2.8, 0) * 1.2) : 1) * 2.4,
      eruption: loop.isErupting ? Math.min(1, (scene.simTime - loop.eruptedAtSim) / 2.6) : 0,
      drain: 1 - 0.3 * loop.rainIntensity,   // a raining loop drains: its own emission fades while the knots carry the plasma
    };
    const strandCount = scene.isLite ? 1 : loop.strandCount;
    for (let k = 0; k < strandCount; k++) this.buildStrand(scene, loop, k, rotation, look);
  }

  /** One strand: its traced points lifted and twisted into a rope, subdivided, drawn as one strip with per-vertex
   *  normals and colour. */
  private buildStrand(scene: RibbonScene, loop: EventLoop, strand: number, rotation: number, look: StrandLook): void {
    const path = liftedPath(scene.strand(loop.strandRow + strand), loop, strand, rotation);
    if (strand === 0) loop.drawnLengthKm = polylineLength(path) * RSUN_KM * scene.radiusSun;
    const count = (path.length - 1) * SUBDIVIDE + 1;
    if (!this.strip.hasRoom(count)) return;
    const smooth = smoothPath(path);
    const width = (STRAND_WIDTH + 0.002 * strand) * (1 + 0.12 * loop.lift);   // a lifting rope stays a thin filament
    const fill = Math.min(1, Math.max(0, (loop.temperatureMK - 1.5) / 2.5));   // a hot loop is filled along its length by evaporation
    const isFrontRunning = loop.frontStartAnim > -Infinity && loop.pulseHeating > 3 * loop.backgroundHeating;
    const frontKm = FRONT_SPEED_KMS * (scene.anim - loop.frontStartAnim) * ANIM_UNIT_S;
    const whiten = 0.35 + 0.4 * loop.glow;
    const dilution = 1 / ((1 + loop.lift) * (1 + loop.lift)) * Math.max(0, 1 - loop.lift / ROPE_FADE_LIFT);   // a rising rope expands self-similarly
    for (let m = 0; m < count; m++) {
      const along = m / (count - 1), sine = Math.sin(Math.PI * along), q = smooth[m];
      const isOverDisc = q[2] > 0 && q[0] * q[0] + q[1] * q[1] < 1, height = Math.max(length(q) - 1, 0);
      const density = look.densityScale * Math.max(Math.exp(-height / look.scaleHeight) * (1 - fill) + fill, 0.3);
      const footGlow = 0.6 * Math.exp(-height / 0.02) * look.densityScale * (1 - 0.8 * fill);
      const flicker = (0.5 + 0.5 * Math.sin(along * 44 + strand * 11 + loop.seed + look.age * look.flickerSpeed * 6.3)) ** 2;
      const fromEntry = loop.frontFoot ? 1 - along : along;
      const front = isFrontRunning ? 0.05 + 0.95 * Math.min(1, Math.max(0, (frontKm / Math.max(loop.drawnLengthKm || 2e5, 1e4) - fromEntry) * 6 + 1)) : 1;
      const legs = 1 - (1 - Math.min(1, sine / 0.5)) * look.eruption;
      const visibility = look.isProminence
        ? (isOverDisc ? 0 : 1.4 * Math.exp(-height / 0.25) * (loop.temperatureMK < 2 ? 1 : 0.2))
        : look.response * (isOverDisc ? 0.45 : 1);
      const raw = isBehindDisc(q) ? 0 : (density * density * 0.9 + footGlow) * (0.4 + flicker) * legs * visibility * (1 - 0.08 * strand) * look.gain * look.drain * dilution * front;
      const intensity = STRAND_SATURATION * (1 - Math.exp(-raw / STRAND_SATURATION));
      const widen = isOverDisc ? 1.3 : 1;   // face-on loops over the disc a little wider
      const [normalX, normalY] = screenNormal(smooth[Math.max(m - 1, 0)], smooth[Math.min(m + 1, count - 1)], width * widen * 6);
      const warm = 0.8 * sine;
      const colour = look.tint.map((t) => ((t * (1 - whiten) + whiten) * (1 - warm) + t * warm) * intensity / widen) as Vec3;
      this.strip.pair(q, normalX, normalY, colour);
    }
    this.strip.end();
  }

  /** The arcade: a row of semicircles across the inversion line under the flaring loop, one per EBTEL strand, lit by
   *  its own emission measure x response, appearing in order; and the two flare ribbons at their feet while heated. */
  private buildArcade(scene: RibbonScene, loop: EventLoop, arcade: Arcade, rotation: number, view: number, tint: Vec3): void {
    const plane = arcadeFrame(loop);
    const quietEmission = loop.quietDensity * loop.quietDensity * loopVolumeCm3(loop.lengthR, scene.radiusSun);
    arcade.strands.forEach((strand, s) => {
      if (scene.anim < strand.formsAtAnim) return;
      const brightness = Math.log10(1 + 9 * strand.density * strand.density * strand.volumeCm3 * aiaResponse(strand.temperatureMK, view) / quietEmission);
      const radius = strandRadius(strand, scene.radiusSun), offset = rowOffset(s, arcade.strands.length);
      if (brightness >= 0.02 && this.strip.hasRoom(ARCADE_SEGMENTS + 1)) {
        this.buildArcadeStrand(plane, radius, offset, 4 * (1 - Math.exp(-brightness / 4)), rotation, tint);
      }
      const ribbon = RIBBON_WEIGHT[view] * footHeating(loop, strand, scene.anim);
      if (ribbon > 0.02) this.buildFlareRibbons(plane, radius, offset, 3 * (1 - Math.exp(-ribbon / 3)), rotation, tint);
    });
  }

  /** The arcade's ribbons in the continuum: the flare kernels at the strands' feet, as bright over the photosphere as a
   *  9,000 K blackbody filling part of them. Rarely seen on the Sun; on an M dwarf they outshine the surface. */
  private buildWhiteLightRibbons(scene: RibbonScene, loop: EventLoop, arcade: Arcade, rotation: number): void {
    const plane = arcadeFrame(loop);
    arcade.strands.forEach((strand, s) => {
      if (scene.anim < strand.formsAtAnim) return;
      const excess = HMI_PHOTOSPHERE_LEVEL * scene.flareContrast * WHITE_LIGHT_FILL * footHeating(loop, strand, scene.anim);
      if (excess < 0.01) return;
      this.buildFlareRibbons(plane, strandRadius(strand, scene.radiusSun), rowOffset(s, arcade.strands.length), excess, rotation, FLARE_KERNEL_COLOR);
    });
  }

  private buildArcadeStrand(plane: ArcadeFrame, radius: number, offset: number, intensity: number, rotation: number, tint: Vec3): void {
    const { centre, across, inversionLine } = plane;
    const width = 0.004 + 0.3 * radius, colour = tint.map((t) => (t * 0.6 + 0.4) * intensity) as Vec3;
    for (let j = 0; j <= ARCADE_SEGMENTS; j++) {
      const angle = Math.PI * j / ARCADE_SEGMENTS;
      const q = rotY(add(add(scale(centre, 1 + radius * Math.sin(angle)), across, radius * Math.cos(angle)), inversionLine, offset), rotation);
      // close the strip where it passes behind the disc, so the next one keeps its parity
      if (isBehindDisc(q)) { this.strip.end(); continue; }
      // the normal from the semicircle's true tangent (a cruder proxy pinched the legs)
      const tangent = rotY(add(scale(centre, Math.cos(angle)), across, -Math.sin(angle)), rotation);
      const [normalX, normalY] = screenNormal([0, 0, 0], tangent, width);
      this.strip.pair(q, normalX, normalY, colour);
    }
    this.strip.end();
  }

  /** While a strand is heated, energy streams down to its feet and the chromosphere there lights up; the ribbons
   *  separate as the arcade rises (later strands are wider). */
  private buildFlareRibbons(plane: ArcadeFrame, radius: number, offset: number, intensity: number, rotation: number, tint: Vec3): void {
    const { centre, across, inversionLine } = plane;
    const colour = tint.map((t) => (t * 0.7 + 0.3) * intensity) as Vec3;
    for (const side of [-1, 1]) {
      const foot = add(add(centre, across, side * radius), inversionLine, offset);
      for (const end of [-1, 1]) this.buildRibbonDash(foot, inversionLine, end, rotation, colour);
    }
  }

  private buildRibbonDash(foot: Vec3, inversionLine: Vec3, end: number, rotation: number, colour: Vec3): void {
    const qa = rotY(add(foot, inversionLine, end * FLARE_RIBBON_HALF_LENGTH), rotation);
    const qb = rotY(add(foot, inversionLine, -end * FLARE_RIBBON_HALF_LENGTH), rotation);
    if (qa[2] < 0 || !this.strip.hasRoom(2)) return;
    const [normalX, normalY] = screenNormal(qa, qb, FLARE_RIBBON_WIDTH);
    this.strip.pair(qa, normalX, normalY, colour);
    this.strip.pair(qb, normalX, normalY, colour);
    this.strip.end();
  }

  /** Short streaks stretched with speed, the tail fading to nothing; bright in 304, faint in the hot channels. */
  private buildRain(streaks: RainStreak[], rotation: number, view: number, tint: Vec3): void {
    const peak = RAIN_WEIGHT[view] * 1.6, colourOf = (brightness: number): Vec3 => tint.map((t) => (t * 0.55 + 0.45) * peak * brightness) as Vec3;
    for (const streak of streaks) {
      if (!this.strip.hasRoom(2)) return;
      const head = rotY(streak.head, rotation), tail = rotY(streak.tail, rotation);
      if (isBehindDisc(head)) continue;
      const [normalX, normalY] = screenNormal(tail, head, RAIN_WIDTH);
      this.strip.pair(tail, normalX, normalY, [0, 0, 0]);
      this.strip.pair(head, normalX, normalY, colourOf(streak.brightness));
      this.strip.end();
    }
  }
}
