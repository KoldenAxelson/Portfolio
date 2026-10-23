/* The WebGL2 fallback for browsers without WebGPU: the same nine views from the same star, field and clocks, drawn
 * with one fragment pass per view (glsl.ts starFragment), the traced field lines added onto it, a mip-chain bloom
 * and the ACES tone map. No surface flow, Parker wind, event loops, strings or CMEs: the field maps and the lines
 * are computed on the CPU (fieldtrace.ts). sim.ts owns the clocks and the field and passes them in each frame. */

import type { StarField } from '../field';
import { coronaHeightScale } from '../stars';
import { BLOOM_SETTINGS, BLOOM_STRENGTH, PARALLAX, framing as discFraming } from '../framing';
import type { Derived, StarPreset } from '../stars';
import { VIEWS, WHITE_LIGHT, euvExposure } from '../views';
import type { View } from '../views';
import { CHART_HEIGHT, CHART_WIDTH, FLOATS_PER_NODE, FieldTrace } from './fieldtrace';
import {
  FULLSCREEN_VERTEX, LINE_VERTEX, bloomDownFragment, bloomFirstFragment, bloomUpFragment, lineFragment, starFragment, tonemapFragment,
} from './glsl';

/** The EUV striations drift outward this far per anim unit and wrap over this many (no Parker grid to set it). */
const STRIATION_SPEED_R_PER_ANIM = 5;
const STRIATION_PERIOD_ANIM = 2;
/** Field-line brightness: EUV loops (times n^2 R(T), the exposure and the channel's string gain over 171's, the
 *  strings' views.ts stringK) and the coronagraphs' open lines. */
const EUV_LINE_GAIN = 4;
const WHITE_LINE_GAIN = 0.03;
/** Line vertex attributes: position and foot field (vec4), the line's seed (float). */
const NODE_ATTRIBUTE = 0;
const SEED_ATTRIBUTE = 1;

export interface FallbackFrame {
  view: View;
  star: StarPreset;
  derived: Derived;
  field: StarField;
  /** Clock.rotation (rad) and Clock.anim (anim units). */
  rotation: number;
  anim: number;
  /** sim.ts's eased pointer, -1..1 each way, y up. */
  mouse: { x: number; y: number };
  /** Render size, device px; the renderer sizes the canvas to it. */
  width: number;
  height: number;
}

interface Target { texture: WebGLTexture; framebuffer: WebGLFramebuffer; width: number; height: number }

/** A linked program and its uniform locations, looked up once. */
class Program {
  readonly handle: WebGLProgram;
  private readonly locations = new Map<string, WebGLUniformLocation | null>();

  constructor(private readonly gl: WebGL2RenderingContext, vertex: string, fragment: string) {
    const handle = gl.createProgram();
    if (!handle) throw new Error('sun fallback: createProgram failed');
    gl.attachShader(handle, compile(gl, gl.VERTEX_SHADER, vertex));
    gl.attachShader(handle, compile(gl, gl.FRAGMENT_SHADER, fragment));
    gl.bindAttribLocation(handle, NODE_ATTRIBUTE, 'aNode');
    gl.bindAttribLocation(handle, SEED_ATTRIBUTE, 'aSeed');
    gl.linkProgram(handle);
    if (!gl.getProgramParameter(handle, gl.LINK_STATUS)) throw new Error(`sun fallback: link failed: ${gl.getProgramInfoLog(handle)}`);
    this.handle = handle;
  }

  use(): this { this.gl.useProgram(this.handle); return this; }

  /** Set a float uniform (1-4 components) or, with a Float32Array, a vec4 array. */
  set(name: string, ...values: number[] | [Float32Array]): this {
    const at = this.location(name);
    if (!at) return this;
    const [first] = values;
    if (first instanceof Float32Array) this.gl.uniform4fv(at, first);
    else if (values.length === 1) this.gl.uniform1f(at, first);
    else if (values.length === 2) this.gl.uniform2f(at, first, values[1] as number);
    else if (values.length === 3) this.gl.uniform3f(at, first, values[1] as number, values[2] as number);
    else this.gl.uniform4f(at, first, values[1] as number, values[2] as number, values[3] as number);
    return this;
  }

  setInt(name: string, value: number): this {
    const at = this.location(name);
    if (at) this.gl.uniform1i(at, value);
    return this;
  }

  private location(name: string): WebGLUniformLocation | null {
    if (!this.locations.has(name)) this.locations.set(name, this.gl.getUniformLocation(this.handle, name));
    return this.locations.get(name) ?? null;
  }
}

export class FallbackRenderer {
  /** A renderer on this canvas, or null when the browser has no WebGL2 (or its shaders will not build). */
  static create(canvas: HTMLCanvasElement): FallbackRenderer | null {
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false });
    if (!gl) return null;
    try {
      return new FallbackRenderer(canvas, gl);
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  private readonly isLdrScene: boolean;
  private readonly starPrograms = new Map<number, Program>();
  private readonly lineProgram: Program;
  private readonly bloomFirst: Program;
  private readonly bloomDown: Program;
  private readonly bloomUp: Program;
  private readonly tonemap: Program;
  private readonly fullscreenVao: WebGLVertexArrayObject;
  private readonly lineVao: WebGLVertexArrayObject;
  private readonly lineBuffer: WebGLBuffer;
  private readonly chart: WebGLTexture;
  private readonly trace = new FieldTrace();
  private uploadedSerial = -1;
  private scene: Target | null = null;
  private bloomLevels: Target[] = [];

  private constructor(private readonly canvas: HTMLCanvasElement, private readonly gl: WebGL2RenderingContext) {
    this.isLdrScene = !(gl.getExtension('EXT_color_buffer_float') && canRenderHalfFloat(gl));
    const ldr = this.isLdrScene;
    this.lineProgram = new Program(gl, LINE_VERTEX, lineFragment(ldr));
    this.bloomFirst = new Program(gl, FULLSCREEN_VERTEX, bloomFirstFragment(ldr));
    this.bloomDown = new Program(gl, FULLSCREEN_VERTEX, bloomDownFragment(ldr));
    this.bloomUp = new Program(gl, FULLSCREEN_VERTEX, bloomUpFragment(ldr));
    this.tonemap = new Program(gl, FULLSCREEN_VERTEX, tonemapFragment(ldr));
    this.fullscreenVao = required(gl.createVertexArray(), 'vertex array');
    this.lineVao = required(gl.createVertexArray(), 'vertex array');
    this.lineBuffer = required(gl.createBuffer(), 'buffer');
    gl.bindVertexArray(this.lineVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuffer);
    gl.enableVertexAttribArray(NODE_ATTRIBUTE);
    gl.vertexAttribPointer(NODE_ATTRIBUTE, 4, gl.FLOAT, false, FLOATS_PER_NODE * 4, 0);
    gl.enableVertexAttribArray(SEED_ATTRIBUTE);
    gl.vertexAttribPointer(SEED_ATTRIBUTE, 1, gl.FLOAT, false, FLOATS_PER_NODE * 4, 16);
    gl.bindVertexArray(null);
    this.chart = required(gl.createTexture(), 'texture');
    gl.bindTexture(gl.TEXTURE_2D, this.chart);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);   // longitude wraps, latitude clamps
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  draw(frame: FallbackFrame): void {
    const gl = this.gl;
    if (gl.isContextLost()) return;
    this.resize(frame.width, frame.height);
    this.trace.update(frame.field);
    this.uploadTrace();
    const scene = this.scene!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, scene.framebuffer);
    gl.viewport(0, 0, scene.width, scene.height);
    gl.disable(gl.BLEND);
    this.drawStar(frame);
    this.drawLines(frame);
    this.drawBloom();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, scene.width, scene.height);
    bindTexture(gl, 0, scene.texture);
    bindTexture(gl, 1, this.bloomLevels[0].texture);
    this.tonemap.use().setInt('uScene', 0).setInt('uGlow', 1).set('uBloom', BLOOM_STRENGTH);
    this.fullscreen();
  }

  destroy(): void {
    const gl = this.gl;
    [...this.starPrograms.values(), this.lineProgram, this.bloomFirst, this.bloomDown, this.bloomUp, this.tonemap].forEach((p) => gl.deleteProgram(p.handle));
    this.releaseTargets();
    gl.deleteVertexArray(this.fullscreenVao);
    gl.deleteVertexArray(this.lineVao);
    gl.deleteBuffer(this.lineBuffer);
    gl.deleteTexture(this.chart);
  }

  // ---- passes ------------------------------------------------------------------------------------------------

  /** shaders/star.ts with sim.ts writeFrame's values; the uniforms are glsl.ts starFragment's. */
  private drawStar(frame: FallbackFrame): void {
    const { view: v, derived: d, star, field } = frame, { width, height } = this.scene!;
    const { radius, zoom, centre } = framing(frame);
    const striation = striationPhases(frame.anim);
    const disc2 = v.fit.disc2;
    bindTexture(this.gl, 0, this.chart);
    this.starProgram(v.index).use()
      .set('uRes', width, height).set('uCentre', centre[0], centre[1]).set('uMouse', frame.mouse.x, frame.mouse.y)
      .set('uRadius', radius).set('uT', frame.anim).set('uRot', frame.rotation).set('uThetaE', d.thetaE)
      .set('uExpo', euvExposure(v, d.activity, d.tcor)).set('uActivity', d.activity).set('uGran', d.granScale).set('uCarpet', d.carpet)
      .set('uTcor', ...d.tcor).set('uBb', ...d.bbColor).set('uTint', ...v.tint)
      .set('uDisc', ...v.fit.disc)
      .set('uDisc2', disc2[0] * coronaHeightScale(star, d), disc2[1], disc2[2], disc2[3])
      .set('uLimbAbs', v.fit.limbAbs).set('uShellH', v.fit.shellH).set('uWz', zoom).set('uOcculter', v.occulter ?? 0)
      .set('uRenderScale', this.canvas.clientWidth > 0 ? width / this.canvas.clientWidth : 1)
      .set('uStriation', striation.a, striation.b, striation.weightA)
      .set('uBelt', WHITE_LIGHT.beltBase, WHITE_LIGHT.beltAmp, WHITE_LIGHT.stringFraction).set('uWhite', WHITE_LIGHT.exposure, WHITE_LIGHT.fAmp, WHITE_LIGHT.fSlope)
      .set('uSpot', ...d.spot).set('uLimbRgb', ...d.limbRgb)
      .set('uDipolePos', field.positions).set('uDipoleMoment', field.moments).set('uBref', field.bref)
      .setInt('uChart', 0);
    this.fullscreen();
  }

  /** Closed loops in the EUV views, open lines in the coronagraphs; none on the HMI products. */
  private drawLines(frame: FallbackFrame): void {
    const gl = this.gl, v = frame.view, isEuv = v.index < 5;
    if (!isEuv && v.kind !== 'coronagraph') return;
    const first = isEuv ? 0 : this.trace.closedVertexCount;
    const count = isEuv ? this.trace.closedVertexCount : this.trace.openVertexCount;
    if (count === 0) return;
    const { radius, zoom, centre } = framing(frame), d = frame.derived;
    const white = whiteOf(d.bbColor);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    this.lineProgram.use()
      .set('uRes', this.scene!.width, this.scene!.height).set('uCentre', centre[0], centre[1])
      .set('uRadiusPx', radius / zoom).set('uRot', frame.rotation).set('uT', frame.anim)
      .setInt('uView', v.index).set('uColor', ...(isEuv ? v.tint : white)).set('uTcor', ...d.tcor)
      .set('uExpo', euvExposure(v, d.activity, d.tcor)).set('uLimbAbs', v.fit.limbAbs)
      .set('uGain', isEuv ? EUV_LINE_GAIN * v.fit.stringK / VIEWS[0].fit.stringK : WHITE_LINE_GAIN).set('uOcculter', v.occulter ?? 0);
    gl.bindVertexArray(this.lineVao);
    gl.drawArrays(gl.LINES, first, count);
    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);
  }

  /** site/gpu/bloom.ts: thresholded 13-tap downsample to half size, down the chain, then tent upsamples added back up. */
  private drawBloom(): void {
    const gl = this.gl, levels = this.bloomLevels;
    levels.forEach((level, i) => {
      const source = i === 0 ? this.scene! : levels[i - 1];
      const program = (i === 0 ? this.bloomFirst : this.bloomDown).use();
      program.set('uThreshold', BLOOM_SETTINGS.threshold).set('uKnee', BLOOM_SETTINGS.knee);
      this.bloomPass(program, source, level);
    });
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    for (let i = levels.length - 1; i >= 1; i--) this.bloomPass(this.bloomUp.use().set('uRadius', BLOOM_SETTINGS.radius), levels[i], levels[i - 1]);
    gl.disable(gl.BLEND);
  }

  private bloomPass(program: Program, source: Target, target: Target): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    gl.viewport(0, 0, target.width, target.height);
    bindTexture(gl, 0, source.texture);
    program.setInt('uSrc', 0).set('uTexel', 1 / source.width, 1 / source.height);
    this.fullscreen();
  }

  private fullscreen(): void {
    this.gl.bindVertexArray(this.fullscreenVao);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
    this.gl.bindVertexArray(null);
  }

  // ---- resources ---------------------------------------------------------------------------------------------

  /** Each view's program is built the first time it is shown (nine at once would stall the first frame). */
  private starProgram(viewIndex: number): Program {
    let program = this.starPrograms.get(viewIndex);
    if (!program) {
      program = new Program(this.gl, FULLSCREEN_VERTEX, starFragment(viewIndex, this.isLdrScene));
      this.starPrograms.set(viewIndex, program);
    }
    return program;
  }

  private uploadTrace(): void {
    if (this.trace.serial === this.uploadedSerial) return;
    const gl = this.gl;
    this.uploadedSerial = this.trace.serial;
    gl.bindTexture(gl.TEXTURE_2D, this.chart);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, CHART_WIDTH, CHART_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.trace.chart);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.trace.segments, gl.STATIC_DRAW);
  }

  /** The scene and the bloom chain (site/gpu/bloom.ts's level count) for a new size. */
  private resize(width: number, height: number): void {
    const w = Math.max(16, Math.round(width)), h = Math.max(16, Math.round(height));
    if (this.scene && this.scene.width === w && this.scene.height === h) return;
    this.canvas.width = w;
    this.canvas.height = h;
    this.releaseTargets();
    this.scene = this.target(w, h);
    const count = Math.max(1, Math.min(7, Math.floor(Math.log2(Math.min(w, h))) - 3));
    this.bloomLevels = Array.from({ length: count }, (_, i) => this.target(Math.max(1, w >> (i + 1)), Math.max(1, h >> (i + 1))));
  }

  private target(width: number, height: number): Target {
    const gl = this.gl;
    const texture = required(gl.createTexture(), 'texture'), framebuffer = required(gl.createFramebuffer(), 'framebuffer');
    gl.bindTexture(gl.TEXTURE_2D, texture);
    if (this.isLdrScene) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { texture, framebuffer, width, height };
  }

  private releaseTargets(): void {
    for (const t of [this.scene, ...this.bloomLevels]) {
      if (!t) continue;
      this.gl.deleteTexture(t.texture);
      this.gl.deleteFramebuffer(t.framebuffer);
    }
    this.scene = null;
    this.bloomLevels = [];
  }
}

// ---- helpers -----------------------------------------------------------------------------------------------

/** framing.ts's disc radius (px) and wide-coronagraph zoom, and the star's centre with the parallax shift, in GL
 *  pixels (y up). */
function framing(frame: FallbackFrame): { radius: number; zoom: number; centre: [number, number] } {
  const { width, height } = frame, { radius, zoom } = discFraming(frame.view, width, height);
  return { radius, zoom, centre: [width * 0.5 + frame.mouse.x * PARALLAX[0] * height, height * 0.5 + frame.mouse.y * PARALLAX[1] * height] };
}

/** Two wrapped copies of the striation drift half a period apart and the first one's weight, cross-faded so the
 *  pattern never visibly wraps nor shears without bound (Clock.windPhases's scheme, on the anim clock). */
function striationPhases(anim: number): { a: number; b: number; weightA: number } {
  const f = anim / STRIATION_PERIOD_ANIM, span = STRIATION_PERIOD_ANIM * STRIATION_SPEED_R_PER_ANIM;
  const fa = f - Math.floor(f), fb = (fa + 0.5) % 1, s = Math.sin(Math.PI * fa);
  return { a: fa * span, b: fb * span, weightA: s * s };
}

/** The photosphere's colour at brightest channel 1: shaders/star.ts whiteLight's wl. */
function whiteOf(bb: readonly [number, number, number]): [number, number, number] {
  const top = Math.max(bb[0], bb[1], bb[2], 1e-4);
  return [bb[0] / top, bb[1] / top, bb[2] / top];
}

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = required(gl.createShader(type), 'shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(`sun fallback: shader failed: ${gl.getShaderInfoLog(shader)}`);
  return shader;
}

/** EXT_color_buffer_float allows RGBA16F targets; some drivers still refuse the framebuffer, so try one. */
function canRenderHalfFloat(gl: WebGL2RenderingContext): boolean {
  const texture = gl.createTexture(), framebuffer = gl.createFramebuffer();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, 1, 1, 0, gl.RGBA, gl.HALF_FLOAT, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  const isComplete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.deleteFramebuffer(framebuffer);
  gl.deleteTexture(texture);
  return isComplete;
}

function bindTexture(gl: WebGL2RenderingContext, unit: number, texture: WebGLTexture): void {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
}

function required<T>(value: T | null, what: string): T {
  if (!value) throw new Error(`sun fallback: could not create a ${what}`);
  return value;
}
