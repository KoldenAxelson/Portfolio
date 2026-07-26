// /quotes — the smoke, as an actual fluid.
//
// Everything that faked it failed the same way. Smoke doesn't look like smoke on
// account of its texture; it looks like smoke because the medium carries itself.
// Density is advected along a velocity field that curls back into itself, and no
// amount of sprite work reproduces that. So this is the standard grid solver:
//
//   curl        → measure rotation in the velocity field
//   vorticity   → feed it back in, so eddies sharpen instead of dissipating
//   buoyancy    → dye pushes upward, which makes it a column and not a fog
//   divergence  → measure where the field is compressing
//   pressure    → Jacobi-iterate a Poisson solve against that divergence
//   gradient    → subtract the pressure gradient, leaving the field incompressible
//   advect      → carry velocity, then dye, along the corrected field
//
// Incompressibility is the step that matters. Without the pressure projection
// you get smearing; with it, a rising column has nowhere to expand into and has
// to roll over on itself, which is the curl the eye reads as smoke.
//
// The dye carries three layers in the R, G and B channels of one texture. They
// share a velocity field and advect in the same pass, so the extra two are close
// to free, but each has its own dissipation — a tight fast core, a mid body, a
// broad slow halo. One layer, however well tuned, has one silhouette, and that
// reads as a sheet.
//
// The letterforms are the source, not a stencil: every lattice point is a vent
// that pulses, so the quote smoulders rather than sitting in a column blown past
// it. They're a sink as well, which keeps what they exhale hanging around them,
// and a small readback of the velocity field goes to the lattice to push the
// dots. The smoke and the letters act on each other in both directions.

import { DENSITY_DISSIPATION, EMIT_RATE, QUOTES_READY_EVENT, type BridgeHost } from './bridge';
import { parseRgb, type Rgb } from './color';
import { createRenderer, type DoubleFbo, type Fbo, type Program, type Renderer } from './gl';
import {
  ADVECTION_FRAG,
  BASE_VERT,
  BUOYANCY_FRAG,
  CLEAR_FRAG,
  CURL_FRAG,
  DISPLAY_FRAG,
  DIVERGENCE_FRAG,
  EMIT_FRAG,
  GRADIENT_FRAG,
  PRESSURE_FRAG,
  PROBE_FRAG,
  SPLAT_FRAG,
  VORTICITY_FRAG,
} from './shaders';
import { backingScale, FLUID_MIN_SCALE, FLUID_PIXEL_BUDGET } from './viewport';

const SIM_RES = 128; // velocity/pressure grid — coarse is fine, it's a smooth field
const DYE_RES = 512; // the dye it carries, which is what you actually see
// Both grids stretch with the aspect ratio. The cap only bites on very wide
// viewports, where the stretch would otherwise put the per-frame cost of every
// dye pass up with the window.
const DYE_MAX_TEXELS = 620_000;
const PRESSURE_ITERATIONS = 20;
const VELOCITY_DISSIPATION = 0.2;
const PRESSURE_DISSIPATION = 0.8;
const AMBIENT_COOL = 9; // pulls the whole field down a touch, so it isn't a jet
// A fixed step. The solver is only conditionally stable, and letting a slow
// frame hand it a large dt is how a fluid sim explodes; emission is corrected
// for real elapsed time instead, which is where the frame rate actually shows.
const DT = 0.016;

// Emission is scaled by real elapsed time because a pulse is half a second —
// thirty frames at 60fps, but under one frame on a slow machine, where it gets
// sampled exactly once. Charging per frame would make a struggling page emit an
// order of magnitude less smoke, which is precisely backwards.
const EMIT_DT_MIN = 0.5;
const EMIT_DT_MAX = 8;

// The cursor pushes the fluid and injects no dye — a swish, not a vent. The
// delta is scaled back into pixels first: normalised, a fast flick is about
// 0.02 against a velocity field that works in the hundreds.
const POINTER_FORCE = 9;
const POINTER_RADIUS = 0.022;

const MASK_GAMMA = 0.75;
// Without a density curve every pixel the dye reaches clamps to full opacity and
// the whole box goes evenly grey. The thin edges of the plume have to stay thin.
const DENSITY_GAMMA = 1.7;
// Colour by concentration: the thin stuff is the site's grey and the dense core
// leans toward the accent, so it reads as depth in a grey plume rather than as a
// coloured one.
const TINT_LOW = 0.3; // density where the tint starts
const TINT_HIGH = 1.1; // and where it's fully applied
// Layer weights in the composite, and how far the outer two lag behind the core.
// The offset is parallax to separate the layers, not motion in its own right.
const LAYER_WEIGHTS: readonly [number, number, number] = [1, 0.7, 0.45];
const PARALLAX = 0.0035;
// The density gradient stands in for a surface normal, so the plume catches a
// light and rolls read as rolls instead of as a flat wash.
const SHADE_SCALE = 22;
const LIGHT_DIR: readonly [number, number, number] = [-0.45, 0.75, 0.6];

// Velocity readback for the lattice. Tiny, and RGBA8 rather than float, because
// readPixels on a half-float target isn't portable.
const PROBE_W = 48;
const PROBE_H = 27;
const PROBE_EVERY = 2; // frames between readbacks
const PROBE_SCALE = 0.0022; // packs the velocity range into 0..1

const MASK_UNIT = 3; // its own texture unit: attach() cycles 0 and 1

interface Fields {
  velocity: DoubleFbo;
  dye: DoubleFbo;
  pressure: DoubleFbo;
  divergence: Fbo;
  curl: Fbo;
  probe: Fbo;
  destroy: () => void;
}

let disposeFluid: (() => void) | null = null;

export function initQuotesFluid(): void {
  disposeFluid?.();
  disposeFluid = null;

  const root = document.querySelector<HTMLElement>('[data-quotes]');
  const canvas = document.querySelector<HTMLCanvasElement>('[data-quotes-fluid]');
  if (!root || !canvas) return;

  // The lattice owns the glyph mask and publishes it here. It may not have run
  // yet — ts/main.ts defers its init into requestIdleCallback to keep the LCP
  // paint clear — so this waits to be told rather than giving up, which is what
  // once left the canvas permanently blank.
  const bridge = (root as BridgeHost).__quotes;
  if (!bridge) {
    document.addEventListener(QUOTES_READY_EVENT, () => initQuotesFluid(), { once: true });
    return;
  }

  const gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
  });
  // Float render targets are not optional for a fluid solver: without them the
  // velocity field quantises to 8 bits and the sim falls apart in seconds.
  if (!gl || !gl.getExtension('EXT_color_buffer_float')) {
    bridge.onFail();
    return;
  }

  const renderer = createRenderer(gl);
  const programs = linkPrograms(renderer);
  if (!programs) {
    bridge.onFail();
    return;
  }

  const maskTexture = createMaskTexture(gl);
  const probeData = new Uint8Array(PROBE_W * PROBE_H * 4);
  const pointer = { x: 0, y: 0, dx: 0, dy: 0, active: false, moved: false };
  let fields: Fields | null = null;
  let probeTick = 0;

  // ---- sizing -------------------------------------------------------------

  const resize = (): void => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;

    const scale = backingScale(
      rect.width,
      rect.height,
      FLUID_PIXEL_BUDGET,
      FLUID_MIN_SCALE,
    );
    canvas.width = Math.round(rect.width * scale);
    canvas.height = Math.round(rect.height * scale);

    const aspect = rect.width / rect.height;
    const [simW, simH] = gridFor(SIM_RES, aspect, Infinity);
    const [dyeW, dyeH] = gridFor(DYE_RES, aspect, DYE_MAX_TEXELS);
    if (fields && fields.dye.read.width === dyeW && fields.velocity.read.width === simW) return;

    // Every one of these is a texture and a framebuffer. Dropping the old set on
    // the floor leaked a full simulation's worth of GPU memory per resize, and
    // entering and leaving fullscreen fires two.
    fields?.destroy();
    fields = {
      velocity: renderer.createDoubleFbo(simW, simH, gl.RG16F, gl.RG),
      // RGBA rather than R: the three colour channels are three dye layers
      // riding the same velocity field, which makes the extra two nearly free.
      dye: renderer.createDoubleFbo(dyeW, dyeH, gl.RGBA16F, gl.RGBA),
      pressure: renderer.createDoubleFbo(simW, simH, gl.R16F, gl.RED),
      divergence: renderer.createFbo(simW, simH, gl.R16F, gl.RED),
      curl: renderer.createFbo(simW, simH, gl.R16F, gl.RED),
      probe: renderer.createFbo(PROBE_W, PROBE_H, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE),
      destroy() {
        this.velocity.destroy();
        this.dye.destroy();
        this.pressure.destroy();
        this.divergence.destroy();
        this.curl.destroy();
        this.probe.destroy();
      },
    };
  };

  // ---- one step of the simulation -----------------------------------------

  const uploadMask = (): void => {
    gl.activeTexture(gl.TEXTURE0 + MASK_UNIT);
    gl.bindTexture(gl.TEXTURE_2D, maskTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bridge.mask);
  };

  const splatVelocity = (f: Fields, x: number, y: number, dx: number, dy: number): void => {
    const p = renderer.use(programs.splat);
    gl.uniform1i(p.uniforms.uTarget, f.velocity.read.attach(0));
    gl.uniform1f(p.uniforms.aspectRatio, f.velocity.read.width / f.velocity.read.height);
    gl.uniform2f(p.uniforms.point, x, y);
    gl.uniform3f(p.uniforms.color, dx, dy, 0);
    gl.uniform1f(p.uniforms.radius, POINTER_RADIUS);
    renderer.blit(f.velocity.write);
    f.velocity.swap();
  };

  const emit = (f: Fields, dtScale: number): void => {
    const p = renderer.use(programs.emit, f.dye.read);
    gl.uniform1i(p.uniforms.uDye, f.dye.read.attach(0));
    gl.uniform1i(p.uniforms.uMask, MASK_UNIT);
    const rate = dtScale * bridge.tune.emit;
    gl.uniform3f(
      p.uniforms.uRate,
      EMIT_RATE[0] * rate,
      EMIT_RATE[1] * rate,
      EMIT_RATE[2] * rate,
    );
    renderer.blit(f.dye.write);
    f.dye.swap();
  };

  const addVorticity = (f: Fields): void => {
    let p = renderer.use(programs.curl, f.velocity.read);
    gl.uniform1i(p.uniforms.uVelocity, f.velocity.read.attach(0));
    renderer.blit(f.curl);

    p = renderer.use(programs.vorticity, f.velocity.read);
    gl.uniform1i(p.uniforms.uVelocity, f.velocity.read.attach(0));
    gl.uniform1i(p.uniforms.uCurl, f.curl.attach(1));
    gl.uniform1f(p.uniforms.curl, bridge.tune.curl);
    gl.uniform1f(p.uniforms.dt, DT);
    renderer.blit(f.velocity.write);
    f.velocity.swap();
  };

  const addBuoyancy = (f: Fields): void => {
    const p = renderer.use(programs.buoyancy, f.velocity.read);
    gl.uniform1i(p.uniforms.uVelocity, f.velocity.read.attach(0));
    gl.uniform1i(p.uniforms.uDye, f.dye.read.attach(1));
    gl.uniform1f(p.uniforms.buoyancy, bridge.tune.buoyancy);
    gl.uniform1f(p.uniforms.cooling, AMBIENT_COOL);
    gl.uniform1f(p.uniforms.dt, DT);
    renderer.blit(f.velocity.write);
    f.velocity.swap();
  };

  // Make the field incompressible again: measure the divergence, solve for the
  // pressure that cancels it, subtract that pressure's gradient.
  const project = (f: Fields): void => {
    let p = renderer.use(programs.divergence, f.velocity.read);
    gl.uniform1i(p.uniforms.uVelocity, f.velocity.read.attach(0));
    gl.uniform1i(p.uniforms.uMask, MASK_UNIT);
    gl.uniform1f(p.uniforms.uSink, bridge.tune.sink);
    renderer.blit(f.divergence);

    // Warm-starting from a faded copy of the last solve converges in far fewer
    // iterations than starting from zero every frame.
    p = renderer.use(programs.clear);
    gl.uniform1i(p.uniforms.uTexture, f.pressure.read.attach(0));
    gl.uniform1f(p.uniforms.value, PRESSURE_DISSIPATION);
    renderer.blit(f.pressure.write);
    f.pressure.swap();

    p = renderer.use(programs.pressure, f.velocity.read);
    gl.uniform1i(p.uniforms.uDivergence, f.divergence.attach(0));
    for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
      gl.uniform1i(p.uniforms.uPressure, f.pressure.read.attach(1));
      renderer.blit(f.pressure.write);
      f.pressure.swap();
    }

    p = renderer.use(programs.gradient, f.velocity.read);
    gl.uniform1i(p.uniforms.uPressure, f.pressure.read.attach(0));
    gl.uniform1i(p.uniforms.uVelocity, f.velocity.read.attach(1));
    renderer.blit(f.velocity.write);
    f.velocity.swap();
  };

  const advect = (f: Fields): void => {
    let p = renderer.use(programs.advection, f.velocity.read);
    gl.uniform1i(p.uniforms.uVelocity, f.velocity.read.attach(0));
    gl.uniform1i(p.uniforms.uSource, f.velocity.read.attach(0));
    gl.uniform1f(p.uniforms.dt, DT);
    const v = VELOCITY_DISSIPATION;
    gl.uniform4f(p.uniforms.dissipation, v, v, v, v);
    renderer.blit(f.velocity.write);
    f.velocity.swap();

    p = renderer.use(programs.advection, f.dye.read);
    gl.uniform1i(p.uniforms.uVelocity, f.velocity.read.attach(0));
    gl.uniform1i(p.uniforms.uSource, f.dye.read.attach(1));
    const life = Math.max(0.05, bridge.tune.life);
    gl.uniform4f(
      p.uniforms.dissipation,
      DENSITY_DISSIPATION[0] / life,
      DENSITY_DISSIPATION[1] / life,
      DENSITY_DISSIPATION[2] / life,
      1,
    );
    renderer.blit(f.dye.write);
    f.dye.swap();
  };

  // Hand the field back to the lattice, downsampled to RGBA8 first: readPixels
  // on a half-float target isn't portable, and 48×27 is small enough that the
  // pipeline stall doesn't register.
  const readBackFlow = (f: Fields): void => {
    probeTick = (probeTick + 1) % PROBE_EVERY;
    if (probeTick !== 0) return;
    const p = renderer.use(programs.probe);
    gl.uniform2f(p.uniforms.texelSize, 1 / PROBE_W, 1 / PROBE_H);
    gl.uniform1i(p.uniforms.uVelocity, f.velocity.read.attach(0));
    gl.uniform1i(p.uniforms.uDye, f.dye.read.attach(1));
    gl.uniform1f(p.uniforms.uScale, PROBE_SCALE);
    renderer.blit(f.probe);
    gl.readPixels(0, 0, PROBE_W, PROBE_H, gl.RGBA, gl.UNSIGNED_BYTE, probeData);
  };

  const simulate = (f: Fields, dtScale: number): void => {
    gl.disable(gl.BLEND);
    uploadMask();
    emit(f, dtScale);
    if (pointer.moved) {
      pointer.moved = false;
      const force = bridge.tune.pointer / POINTER_FORCE;
      splatVelocity(f, pointer.x, pointer.y, pointer.dx * force, pointer.dy * force);
    }
    addVorticity(f);
    addBuoyancy(f);
    project(f);
    advect(f);
    readBackFlow(f);
  };

  // ---- drawing ------------------------------------------------------------

  const palette = createPaletteCache(bridge.color, bridge.accent);

  const draw = (f: Fields): void => {
    const p = renderer.use(programs.display, f.dye.read);
    gl.uniform1i(p.uniforms.uDye, f.dye.read.attach(0));
    gl.activeTexture(gl.TEXTURE0 + MASK_UNIT);
    gl.bindTexture(gl.TEXTURE_2D, maskTexture);
    gl.uniform1i(p.uniforms.uMask, MASK_UNIT);

    const { fill, accent } = palette.read();
    gl.uniform3f(p.uniforms.uColor, fill[0], fill[1], fill[2]);
    gl.uniform3f(p.uniforms.uAccent, accent[0], accent[1], accent[2]);
    gl.uniform3f(p.uniforms.uWeights, LAYER_WEIGHTS[0], LAYER_WEIGHTS[1], LAYER_WEIGHTS[2]);
    gl.uniform2f(p.uniforms.uParallax, PARALLAX * 0.4, PARALLAX);
    gl.uniform3f(p.uniforms.uLightDir, LIGHT_DIR[0], LIGHT_DIR[1], LIGHT_DIR[2]);
    gl.uniform1f(p.uniforms.uShade, bridge.tune.shade);
    gl.uniform1f(p.uniforms.uShadeScale, SHADE_SCALE);
    gl.uniform1f(p.uniforms.uDim, bridge.tune.dim);
    gl.uniform1f(p.uniforms.uLit, bridge.tune.lit);
    gl.uniform1f(p.uniforms.uGamma, MASK_GAMMA);
    gl.uniform1f(p.uniforms.uDensityGamma, DENSITY_GAMMA);
    gl.uniform1f(p.uniforms.uTint, bridge.tune.tint);
    gl.uniform1f(p.uniforms.uTintLow, TINT_LOW);
    gl.uniform1f(p.uniforms.uTintHigh, TINT_HIGH);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    renderer.blit(null);
  };

  // ---- the loop -----------------------------------------------------------

  let raf = 0;
  let alive = true;
  let lastFrame = -1;
  let shown = true;

  const show = (visible: boolean): void => {
    if (visible === shown) return;
    shown = visible;
    canvas.style.opacity = visible ? '1' : '0';
  };

  const frame = (): void => {
    if (!alive) return;
    raf = requestAnimationFrame(frame);

    const running = bridge.smokeOn() && bridge.visible();
    show(bridge.smokeOn());
    if (!running || !fields) {
      // Reset the clock: coming back after a pause would otherwise arrive as one
      // enormous elapsed time and empty a whole cycle of pulses in one frame.
      lastFrame = -1;
      return;
    }

    const now = performance.now();
    const dtScale =
      lastFrame < 0
        ? 1
        : Math.min(EMIT_DT_MAX, Math.max(EMIT_DT_MIN, (now - lastFrame) / 16.67));
    lastFrame = now;
    simulate(fields, dtScale);
    draw(fields);
  };

  // ---- wiring -------------------------------------------------------------

  // Mouse only, matching the lattice: on a phone the only reason a finger is
  // dragging across this is to scroll past it, and swishing the smoke as it goes
  // would fight the gesture.
  const onPointerMove = (event: PointerEvent): void => {
    if (event.pointerType !== 'mouse') return;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = 1 - (event.clientY - rect.top) / rect.height;
    // Back into pixels before scaling: the field works in texels, and a
    // normalised delta is three orders of magnitude too small to move it.
    pointer.dx = (x - pointer.x) * rect.width * POINTER_FORCE;
    pointer.dy = (y - pointer.y) * rect.height * POINTER_FORCE;
    pointer.x = x;
    pointer.y = y;
    if (pointer.active) pointer.moved = true;
    pointer.active = true;
  };
  const onPointerLeave = (): void => {
    pointer.active = false;
    pointer.moved = false;
  };

  const stage = root.querySelector<HTMLElement>('[data-quotes-advance]') || canvas;
  stage.addEventListener('pointermove', onPointerMove);
  stage.addEventListener('pointerleave', onPointerLeave);

  let resizeTimer: number | null = null;
  const observer = new ResizeObserver(() => {
    if (resizeTimer !== null) window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 150);
  });
  observer.observe(canvas);

  // A GPU reset, a driver update, a laptop waking from sleep: the context goes
  // and every texture and program with it. Without this the loop keeps calling
  // into a dead context, the canvas stays blank, and the Smoke switch still
  // claims to be on — a page that looks broken with no way back.
  //
  // preventDefault is what makes the context restorable at all; the browser only
  // fires webglcontextrestored if the lost event was cancelled.
  const onContextLost = (event: Event): void => {
    event.preventDefault();
    alive = false;
    cancelAnimationFrame(raf);
    fields = null;
    bridge.onFail();
  };
  const onContextRestored = (): void => {
    // Everything was tied to the old context, so start again from scratch rather
    // than trying to revive the pieces.
    bridge.onRecover();
    initQuotesFluid();
  };
  canvas.addEventListener('webglcontextlost', onContextLost);
  canvas.addEventListener('webglcontextrestored', onContextRestored);

  disposeFluid = (): void => {
    alive = false;
    cancelAnimationFrame(raf);
    if (resizeTimer !== null) window.clearTimeout(resizeTimer);
    observer.disconnect();
    stage.removeEventListener('pointermove', onPointerMove);
    stage.removeEventListener('pointerleave', onPointerLeave);
    canvas.removeEventListener('webglcontextlost', onContextLost);
    canvas.removeEventListener('webglcontextrestored', onContextRestored);
    fields?.destroy();
    gl.deleteTexture(maskTexture);
    renderer.destroy();
    delete bridge.flow;
  };

  bridge.flow = { data: probeData, width: PROBE_W, height: PROBE_H };

  resize();
  raf = requestAnimationFrame(frame);
}

type ProgramSet = Record<
  | 'clear'
  | 'splat'
  | 'advection'
  | 'divergence'
  | 'curl'
  | 'vorticity'
  | 'pressure'
  | 'gradient'
  | 'buoyancy'
  | 'emit'
  | 'probe'
  | 'display',
  Program
>;

// All or nothing: a partial set is unusable, so this returns null rather than
// leaving every call site to re-check its own program for null.
function linkPrograms(renderer: Renderer): ProgramSet | null {
  const sources: Record<string, string> = {
    clear: CLEAR_FRAG,
    splat: SPLAT_FRAG,
    advection: ADVECTION_FRAG,
    divergence: DIVERGENCE_FRAG,
    curl: CURL_FRAG,
    vorticity: VORTICITY_FRAG,
    pressure: PRESSURE_FRAG,
    gradient: GRADIENT_FRAG,
    buoyancy: BUOYANCY_FRAG,
    emit: EMIT_FRAG,
    probe: PROBE_FRAG,
    display: DISPLAY_FRAG,
  };
  const linked: Record<string, Program> = {};
  for (const [name, fragment] of Object.entries(sources)) {
    const program = renderer.link(BASE_VERT, fragment);
    if (!program) return null;
    linked[name] = program;
  }
  return linked as ProgramSet;
}

function createMaskTexture(gl: WebGL2RenderingContext): WebGLTexture {
  const texture = gl.createTexture() as WebGLTexture;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

// The short side stays at the base resolution and the long side stretches with
// the aspect ratio, then the whole grid shrinks if that puts it over budget.
function gridFor(base: number, aspect: number, maxTexels: number): [number, number] {
  let width = base * Math.max(1, aspect);
  let height = base * Math.max(1, 1 / aspect);
  const texels = width * height;
  if (texels > maxTexels) {
    const shrink = Math.sqrt(maxTexels / texels);
    width *= shrink;
    height *= shrink;
  }
  return [Math.round(width), Math.round(height)];
}

// The palette only changes when the theme does, and parsing it means a regex and
// two allocations — not worth doing sixty times a second for a constant.
function createPaletteCache(color: () => string, accent: () => string) {
  let lastColor = '';
  let lastAccent = '';
  let fill: Rgb = [0, 0, 0];
  let tint: Rgb = [0, 0, 0];
  const unit = (rgb: Rgb): Rgb => [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255];
  return {
    read() {
      const nextColor = color();
      const nextAccent = accent();
      if (nextColor !== lastColor) {
        lastColor = nextColor;
        fill = unit(parseRgb(nextColor));
      }
      if (nextAccent !== lastAccent) {
        lastAccent = nextAccent;
        tint = unit(parseRgb(nextAccent));
      }
      return { fill, accent: tint };
    },
  };
}

function whenReady(run: () => void): void {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
}

// Its own entry point, re-run on hx-boost swaps the same way ts/main.ts is.
whenReady(() => initQuotesFluid());
document.addEventListener('htmx:afterSettle', () => initQuotesFluid());
