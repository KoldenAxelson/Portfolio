/* The WebGL2 fallback for browsers without WebGPU: sim.ts's pipeline as fragment passes (glsl.ts), with the same
 * split by what changes. The blackbody table is redrawn on a band change, the lens on a view change, the gas and
 * the shading every frame; then site/gpu/bloom.ts's mip chain and the composite. sim.ts owns the clocks, the
 * framing and the exposure seed and passes them in each frame as the WebGPU path's own Params and gas clock.
 *
 * No meter: its workgroup reduction has no WebGL2 form, and reading the scene back would stall every few frames
 * (the original's mistake), so the exposure is the CPU seed. Requires EXT_color_buffer_float, since the field,
 * the lens and the scene are all float targets; without it the page shows its no-WebGPU message. */

import type { BloomSettings } from '../../../site/gpu/bloom';
import { FIELD_HEIGHT, FIELD_WIDTH, GAS_ROWS } from '../layout';
import {
  BLOOM_DOWN_FRAGMENT, BLOOM_FIRST_FRAGMENT, BLOOM_UP_FRAGMENT, CLOCK_TEXELS, COMPOSITE_FRAGMENT, FULLSCREEN_VERTEX,
  GAS_FRAGMENT, SHADE_FRAGMENT, TABLES_FRAGMENT, TABLE_ROW, TRACE_FRAGMENT,
} from './glsl';

export interface FallbackFrame {
  /** sim.ts writeParams' floats, in shaders.ts's Params layout (glsl.ts's std140 block matches it). */
  params: Float32Array;
  /** sim.ts writeGasClock's reduced clock: a phase per gas row, then (cycle, age) per arm. */
  gasClock: Float32Array;
  /** The view changed: re-trace the lens. */
  needsTrace: boolean;
  /** The band changed: redraw the blackbody table. */
  needsTables: boolean;
  /** Render size, device px; sim.ts has already sized the canvas to it. */
  width: number;
  height: number;
  bloom: BloomSettings;
}

interface Target { texture: WebGLTexture; framebuffer: WebGLFramebuffer; width: number; height: number }

interface Lens {
  width: number;
  height: number;
  /** geo1, geo2, ring, sky: trace's four outputs. */
  textures: WebGLTexture[];
  framebuffer: WebGLFramebuffer;
  /** shade's display and glow. */
  scene: WebGLTexture;
  glow: WebGLTexture;
  shadeFramebuffer: WebGLFramebuffer;
  bloom: Target[];
}

const PARAMS_BINDING = 0;

/** A linked program, its Params block bound and its uniform locations looked up once. */
class Program {
  readonly handle: WebGLProgram;
  private readonly locations = new Map<string, WebGLUniformLocation | null>();

  constructor(private readonly gl: WebGL2RenderingContext, fragment: string, samplers: readonly string[] = []) {
    const handle = gl.createProgram();
    if (!handle) throw new Error('black-hole fallback: createProgram failed');
    gl.attachShader(handle, compile(gl, gl.VERTEX_SHADER, FULLSCREEN_VERTEX));
    gl.attachShader(handle, compile(gl, gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(handle);
    if (!gl.getProgramParameter(handle, gl.LINK_STATUS)) throw new Error(`black-hole fallback: link failed: ${gl.getProgramInfoLog(handle)}`);
    this.handle = handle;
    // the bloom programs have no Params, and a block a shader never reads may be optimised away
    const block = gl.getUniformBlockIndex(handle, 'Params');
    if (block !== gl.INVALID_INDEX) gl.uniformBlockBinding(handle, block, PARAMS_BINDING);
    gl.useProgram(handle);
    samplers.forEach((name, unit) => { const at = this.location(name); if (at) gl.uniform1i(at, unit); });
  }

  use(): this { this.gl.useProgram(this.handle); return this; }

  set(name: string, ...values: number[]): this {
    const at = this.location(name);
    if (!at) return this;
    if (values.length === 1) this.gl.uniform1f(at, values[0]);
    else this.gl.uniform2f(at, values[0], values[1]);
    return this;
  }

  private location(name: string): WebGLUniformLocation | null {
    if (!this.locations.has(name)) this.locations.set(name, this.gl.getUniformLocation(this.handle, name));
    return this.locations.get(name) ?? null;
  }
}

export class FallbackRenderer {
  /** A renderer on this canvas, or null without WebGL2, without float render targets, or if its shaders fail. */
  static create(canvas: HTMLCanvasElement): FallbackRenderer | null {
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false });
    if (!gl || !gl.getExtension('EXT_color_buffer_float')) return null;
    try {
      return new FallbackRenderer(gl);
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  private readonly gas: Program;
  private readonly tables: Program;
  private readonly trace: Program;
  private readonly shade: Program;
  private readonly bloomFirst: Program;
  private readonly bloomDown: Program;
  private readonly bloomUp: Program;
  private readonly composite: Program;
  private readonly vao: WebGLVertexArrayObject;
  private readonly paramsBuffer: WebGLBuffer;
  private readonly clock: WebGLTexture;
  private readonly field: Target;
  private lens: Lens | null = null;
  /** The table has never been drawn: draw it on the first frame whatever sim.ts says. */
  private hasTables = false;

  private constructor(private readonly gl: WebGL2RenderingContext) {
    this.gas = new Program(gl, GAS_FRAGMENT, ['uClock']);
    this.tables = new Program(gl, TABLES_FRAGMENT);
    this.trace = new Program(gl, TRACE_FRAGMENT);
    this.shade = new Program(gl, SHADE_FRAGMENT, ['uField', 'uGeo1', 'uGeo2', 'uRing', 'uSky']);
    this.bloomFirst = new Program(gl, BLOOM_FIRST_FRAGMENT, ['uSrc']);
    this.bloomDown = new Program(gl, BLOOM_DOWN_FRAGMENT, ['uSrc']);
    this.bloomUp = new Program(gl, BLOOM_UP_FRAGMENT, ['uSrc']);
    this.composite = new Program(gl, COMPOSITE_FRAGMENT, ['uScene', 'uBloom']);
    this.vao = required(gl.createVertexArray(), 'vertex array');
    this.paramsBuffer = required(gl.createBuffer(), 'buffer');
    gl.bindBuffer(gl.UNIFORM_BUFFER, this.paramsBuffer);
    gl.bufferData(gl.UNIFORM_BUFFER, 96, gl.DYNAMIC_DRAW);   // shaders.ts Params: 24 floats
    gl.bindBufferBase(gl.UNIFORM_BUFFER, PARAMS_BINDING, this.paramsBuffer);
    this.clock = this.texture(gl.R32F, CLOCK_TEXELS, 1, gl.NEAREST);
    // the field is sampled linearly, wrapping in phi (shaders.ts wrapLinear): RGBA16F filters in core WebGL2,
    // RGBA32F only with another extension
    const fieldTexture = this.texture(gl.RGBA16F, FIELD_WIDTH, FIELD_HEIGHT, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    this.field = { texture: fieldTexture, framebuffer: this.framebuffer([fieldTexture]), width: FIELD_WIDTH, height: FIELD_HEIGHT };
    // a driver that lists the extension can still refuse an MRT float framebuffer: find out now, not mid-frame
    this.resize(16, 16);
  }

  draw(frame: FallbackFrame): void {
    const gl = this.gl;
    if (gl.isContextLost()) return;
    const isNewLens = this.resize(frame.width, frame.height);
    const lens = this.lens!;
    gl.disable(gl.BLEND);
    gl.bindBuffer(gl.UNIFORM_BUFFER, this.paramsBuffer);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, frame.params);
    bindTexture(gl, 0, this.clock);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, Math.min(CLOCK_TEXELS, frame.gasClock.length), 1, gl.RED, gl.FLOAT, frame.gasClock);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.field.framebuffer);
    if (frame.needsTables || !this.hasTables) {
      gl.viewport(0, TABLE_ROW, FIELD_WIDTH, 2);
      this.tables.use();
      this.fullscreen();
      this.hasTables = true;
    }
    if (frame.needsTrace || isNewLens) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, lens.framebuffer);
      gl.viewport(0, 0, lens.width, lens.height);
      this.trace.use();
      this.fullscreen();
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.field.framebuffer);
    }
    gl.viewport(0, 0, FIELD_WIDTH, GAS_ROWS);
    this.gas.use();
    bindTexture(gl, 0, this.clock);
    this.fullscreen();

    gl.bindFramebuffer(gl.FRAMEBUFFER, lens.shadeFramebuffer);
    gl.viewport(0, 0, lens.width, lens.height);
    [this.field.texture, ...lens.textures].forEach((texture, unit) => bindTexture(gl, unit, texture));
    this.shade.use();
    this.fullscreen();

    this.drawBloom(lens, frame.bloom);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, lens.width, lens.height);
    bindTexture(gl, 0, lens.scene);
    bindTexture(gl, 1, lens.bloom[0].texture);
    this.composite.use();
    this.fullscreen();
  }

  destroy(): void {
    const gl = this.gl;
    [this.gas, this.tables, this.trace, this.shade, this.bloomFirst, this.bloomDown, this.bloomUp, this.composite].forEach((p) => gl.deleteProgram(p.handle));
    this.releaseLens();
    gl.deleteTexture(this.field.texture);
    gl.deleteFramebuffer(this.field.framebuffer);
    gl.deleteTexture(this.clock);
    gl.deleteBuffer(this.paramsBuffer);
    gl.deleteVertexArray(this.vao);
  }

  // ---- passes ------------------------------------------------------------------------------------------------

  /** site/gpu/bloom.ts on shade's glow: down the chain from it, then the tent upsamples added back up. */
  private drawBloom(lens: Lens, settings: BloomSettings): void {
    const gl = this.gl, levels = lens.bloom;
    const glow: Target = { texture: lens.glow, framebuffer: lens.shadeFramebuffer, width: lens.width, height: lens.height };
    levels.forEach((level, i) => {
      const program = (i === 0 ? this.bloomFirst : this.bloomDown).use();
      program.set('uThreshold', settings.threshold).set('uKnee', settings.knee);
      this.bloomPass(program, i === 0 ? glow : levels[i - 1], level);
    });
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    for (let i = levels.length - 1; i >= 1; i--) this.bloomPass(this.bloomUp.use().set('uRadius', settings.radius), levels[i], levels[i - 1]);
    gl.disable(gl.BLEND);
  }

  private bloomPass(program: Program, source: Target, target: Target): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    gl.viewport(0, 0, target.width, target.height);
    bindTexture(gl, 0, source.texture);
    program.set('uTexel', 1 / source.width, 1 / source.height);
    this.fullscreen();
  }

  private fullscreen(): void {
    this.gl.bindVertexArray(this.vao);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
    this.gl.bindVertexArray(null);
  }

  // ---- resources ---------------------------------------------------------------------------------------------

  /** The lens, the scene and the bloom chain (bloom.ts's level count) for a new size; true when rebuilt. */
  private resize(width: number, height: number): boolean {
    const w = Math.max(1, Math.round(width)), h = Math.max(1, Math.round(height));
    if (this.lens && this.lens.width === w && this.lens.height === h) return false;
    const gl = this.gl;
    this.releaseLens();
    // float32 is not filterable without another extension; trace's outputs are only ever texelFetched
    const textures = [0, 1, 2, 3].map(() => this.texture(gl.RGBA32F, w, h, gl.NEAREST));
    const scene = this.texture(gl.RGBA16F, w, h, gl.LINEAR), glow = this.texture(gl.RGBA16F, w, h, gl.LINEAR);
    const count = Math.max(1, Math.min(7, Math.floor(Math.log2(Math.min(w, h))) - 3));
    const bloom = Array.from({ length: count }, (_, i): Target => {
      const lw = Math.max(1, w >> (i + 1)), lh = Math.max(1, h >> (i + 1)), texture = this.texture(gl.RGBA16F, lw, lh, gl.LINEAR);
      return { texture, framebuffer: this.framebuffer([texture]), width: lw, height: lh };
    });
    this.lens = { width: w, height: h, textures, framebuffer: this.framebuffer(textures), scene, glow, shadeFramebuffer: this.framebuffer([scene, glow]), bloom };
    return true;
  }

  private texture(format: number, width: number, height: number, filter: number): WebGLTexture {
    const gl = this.gl, texture = required(gl.createTexture(), 'texture');
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texStorage2D(gl.TEXTURE_2D, 1, format, width, height);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  }

  /** A framebuffer drawing to each texture in turn (an MRT for more than one); throws if the driver refuses it. */
  private framebuffer(textures: WebGLTexture[]): WebGLFramebuffer {
    const gl = this.gl, framebuffer = required(gl.createFramebuffer(), 'framebuffer');
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    textures.forEach((texture, i) => gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, texture, 0));
    gl.drawBuffers(textures.map((_, i) => gl.COLOR_ATTACHMENT0 + i));
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (status !== gl.FRAMEBUFFER_COMPLETE) throw new Error(`black-hole fallback: framebuffer incomplete (0x${status.toString(16)})`);
    return framebuffer;
  }

  private releaseLens(): void {
    const lens = this.lens;
    if (!lens) return;
    const gl = this.gl;
    [...lens.textures, lens.scene, lens.glow, ...lens.bloom.map((t) => t.texture)].forEach((t) => gl.deleteTexture(t));
    [lens.framebuffer, lens.shadeFramebuffer, ...lens.bloom.map((t) => t.framebuffer)].forEach((f) => gl.deleteFramebuffer(f));
    this.lens = null;
  }
}

// ---- helpers -----------------------------------------------------------------------------------------------

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = required(gl.createShader(type), 'shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(`black-hole fallback: shader failed: ${gl.getShaderInfoLog(shader)}`);
  return shader;
}

function bindTexture(gl: WebGL2RenderingContext, unit: number, texture: WebGLTexture): void {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
}

function required<T>(value: T | null, what: string): T {
  if (!value) throw new Error(`black-hole fallback: could not create a ${what}`);
  return value;
}
