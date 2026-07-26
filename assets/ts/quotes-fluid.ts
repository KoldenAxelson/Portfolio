// /quotes — the smoke, as an actual fluid.
//
// Everything before this faked it: sprites that translate and grow, noise fields
// differenced against each other, blobs steered by a potential. They all fail the
// same way, because smoke doesn't look like smoke on account of its texture — it
// looks like smoke because the medium carries itself. Density is advected along a
// velocity field that curls back into itself, and no amount of sprite work
// reproduces that.
//
// So this is the standard grid solver, the one every WebGL fluid demo runs:
//
//   curl        → measure rotation in the velocity field
//   vorticity   → feed it back in, so eddies sharpen instead of dissipating
//   buoyancy    → dye pushes upward, which is what makes it a column and not a fog
//   divergence  → measure where the field is compressing
//   pressure    → Jacobi-iterate a Poisson solve against that divergence
//   gradient    → subtract the pressure gradient, leaving the field incompressible
//   obstacle    → damp the field inside the letterforms, so flow goes around them
//   advect      → carry velocity, then dye, along the corrected field
//
// Incompressibility is the step that matters. Without the pressure projection you
// get smearing; with it, a rising column has nowhere to expand into and has to
// roll over on itself, which is the curl the eye reads as smoke.
//
// The dye carries three layers, in the R, G and B channels of one texture. They
// share a velocity field and advect in the same pass, so the extra two are close
// to free, but each has its own vent size and its own dissipation — a tight fast
// core, a mid body, a broad slow halo. One layer, however well tuned, only ever
// has one silhouette, and that reads as a sheet.
//
// The letterforms are the source, not a stencil. Every lattice point is a vent
// that pulses — open a fifth of a second, then dark for a few seconds — so the
// quote smoulders rather than sitting in a column blown past it. They're a sink
// as well as a source, which keeps what they exhale hanging around them, and a
// low-resolution readback of the velocity field goes back to ts/quotes.ts to push
// the dots. The smoke and the letters act on each other in both directions.
//
// Emission goes through the mask texture, not through splats. A few percent of a
// few thousand points is a couple of hundred vents on any given frame, and each
// splat is a full-screen pass — as a texture it's one pass no matter how many
// points are alight.
//
// This runs as its own bundle rather than joining ts/main.ts: it's a page-scoped
// runtime and there's no reason for every other page on the site to carry a fluid
// solver. layouts/_default/quotes.html loads it, following the same pattern
// baseof.html uses for the Alpine island on /network.

const SIM_RES = 128; // velocity/pressure grid — coarse is fine, it's a smooth field
const DYE_RES = 512; // the dye it carries, which is what you actually see
const PRESSURE_ITERATIONS = 20;
const VELOCITY_DISSIPATION = 0.2;
// Dye has to survive the whole climb. Advection divides by (1 + diss·dt) every
// frame, so 0.9 is a sub-second half-life and the column dies at knee height.
// Per layer: core clears fast so it keeps a defined shape, halo lingers.
// Slower than when a pair of vents ran continuously: emission is intermittent
// now, so the core has to hold between one point's pulses and its neighbour's.
const DENSITY_DISSIPATION: [number, number, number] = [0.4, 0.24, 0.13]; // ÷ tune.life
const PRESSURE_DISSIPATION = 0.8;
// CURL_STRENGTH → tune.curl: now a knob, see KNOBS in ts/quotes.ts
// Velocity is in texels per unit time and advection scales it by texelSize, so
// with a 128-cell grid the useful range is hundreds, not single digits. Buoyancy
// has to be in the same units as the vent kick or the dye never leaves the floor.
// Gentler than when the source was a vent at the floor and dye had the whole box
// to climb. It's made at the letters now, and a strong rise carries it clear of
// them before it's read — the words have to smoulder, not jet.
// BUOYANCY → tune.buoyancy: now a knob, see KNOBS in ts/quotes.ts
const AMBIENT_COOL = 9; // pulls the whole field down a touch, so it isn't a jet
const DT = 0.016;

// Emission per layer, per 60fps frame, at full pulse. Tiny by necessity: a couple
// of hundred points are alight at once and they sit right on top of each other,
// so what would be a reasonable figure for a single vent buries the canvas.
//
// Scaled by real elapsed time, which matters more here than anywhere else in the
// solver. A pulse is 200ms — twelve frames at 60fps, but under one frame on a
// slow machine, where it gets sampled exactly once. Charging per frame rather
// than per second makes the same page emit an order of magnitude less smoke when
// it's struggling, which is precisely backwards, and makes the constant
// untunable against any machine but the one it was tuned on.
const EMIT_RATE: [number, number, number] = [0.18, 0.11, 0.055]; // × tune.emit
const EMIT_DT_MIN = 0.5;
const EMIT_DT_MAX = 8;

// The cursor. It pushes the fluid and injects no dye — a swish, not a vent.
// The delta has to be scaled back into pixels first: normalised, a fast flick is
// about 0.02, against a velocity field that works in the hundreds, so the whole
// interaction was three orders of magnitude too weak to see.
const POINTER_FORCE = 9;
const POINTER_RADIUS = 0.022;

// Illumination: how much of the dye shows away from the letterforms, and over
// them. The glyph mask comes from ts/quotes.ts, which owns the lattice.
// Raised: the point of the page is now smoke leaving the words, so it can't wink
// out the moment it crosses off a glyph.
// DIM → tune.dim: now a knob, see KNOBS in ts/quotes.ts
// LIT → tune.lit: now a knob, see KNOBS in ts/quotes.ts
const MASK_GAMMA = 0.75;
// Density curve. Without it every pixel the dye reaches clamps to full opacity
// and the whole box goes evenly grey — the thin edges of the plume have to stay
// thin, so faint density is pushed further down before it's drawn.
const DENSITY_GAMMA = 1.7;
// Colour by concentration: the thin stuff is the site's grey, and the dense core
// leans toward the accent. Held well under 1 so it reads as depth in a grey
// plume rather than as a coloured one.
// TINT → tune.tint: now a knob, see KNOBS in ts/quotes.ts
const TINT_LOW = 0.3; // density where the tint starts
const TINT_HIGH = 1.1; // and where it's fully applied
// Layer weights in the composite, and how far the two outer layers lag behind
// the core. The offset is small — it's parallax to separate the layers, not
// motion in its own right.
const LAYER_WEIGHTS: [number, number, number] = [1, 0.7, 0.45];
const PARALLAX = 0.0035;
// Shading. The density gradient stands in for a surface normal, so the plume
// catches a light and rolls read as rolls instead of as a flat wash.
// SHADE → tune.shade: now a knob, see KNOBS in ts/quotes.ts
const SHADE_SCALE = 22; // how much gradient counts as a slope
const LIGHT_DIR: [number, number, number] = [-0.45, 0.75, 0.6];

// The letterforms as a sink, injected straight into the divergence field — the
// inverse of the wall condition, and it replaces the velocity damping that used
// to stand in for this. Damping was the wrong sign for what the page needs: the
// letters are lit by smoke standing over them, so blocking the flow evacuated
// exactly the region that had to fill. Pulling gathers it there instead, and the
// illumination and the physics finally want the same thing.
// Lower than it was, because its job changed. It used to drag smoke up from the
// vents at the bottom; now the letters make their own, and this only has to stop
// it drifting off before it's been seen.
// SINK → tune.sink: now a knob, see KNOBS in ts/quotes.ts

// Velocity readback for the lattice. Tiny, and RGBA8 rather than float, because
// readPixels on a half-float target isn't portable.
const PROBE_W = 48;
const PROBE_H = 27;
const PROBE_EVERY = 2; // frames between readbacks
const PROBE_SCALE = 0.0022; // packs the velocity range into 0..1

interface QuotesBridge {
  mask: HTMLCanvasElement;
  // Live tuning values. Owned by ts/quotes.ts, which generates the panel from
  // the same table — these are read every frame rather than copied, so a slider
  // moves the simulation without a reload and there's no second copy of a
  // default to fall out of step.
  tune: Record<string, number>;
  color: () => string;
  accent: () => string;
  smokeOn: () => boolean;
  onFail: () => void;
  // Set by this module once the solver is live, so the lattice can feel the flow.
  flow?: { data: Uint8Array; w: number; h: number; scale: number };
}

interface Program {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

interface FBO {
  texture: WebGLTexture;
  fbo: WebGLFramebuffer;
  width: number;
  height: number;
  texelX: number;
  texelY: number;
  attach: (id: number) => number;
}

interface DoubleFBO {
  read: FBO;
  write: FBO;
  swap: () => void;
}

let disposeFluid: (() => void) | null = null;

const BASE_VERT = `#version 300 es
precision highp float;
// Pinned to 0 explicitly. The single vertex buffer is bound to attribute 0, and
// nothing guarantees the linker picks that slot on its own — a driver that picks
// 1 renders an empty canvas with no error anywhere.
layout(location = 0) in vec2 aPosition;
out vec2 vUv;
out vec2 vL;
out vec2 vR;
out vec2 vT;
out vec2 vB;
uniform vec2 texelSize;
void main () {
  vUv = aPosition * 0.5 + 0.5;
  vL = vUv - vec2(texelSize.x, 0.0);
  vR = vUv + vec2(texelSize.x, 0.0);
  vT = vUv + vec2(0.0, texelSize.y);
  vB = vUv - vec2(0.0, texelSize.y);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const CLEAR_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTexture;
uniform float value;
void main () { fragColor = value * texture(uTexture, vUv); }`;

const SPLAT_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTarget;
uniform float aspectRatio;
uniform vec3 color;
uniform vec2 point;
uniform float radius;
void main () {
  vec2 p = vUv - point.xy;
  p.x *= aspectRatio;
  vec3 splat = exp(-dot(p, p) / radius) * color;
  vec3 base = texture(uTarget, vUv).xyz;
  fragColor = vec4(base + splat, 1.0);
}`;

const ADVECTION_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 texelSize;
uniform float dt;
uniform vec4 dissipation;
void main () {
  // Semi-Lagrangian: look back along the velocity field to find what arrives here.
  vec2 coord = vUv - dt * texture(uVelocity, vUv).xy * texelSize;
  // Per channel, so the three dye layers can thin out at their own rates while
  // riding the one velocity field.
  fragColor = texture(uSource, coord) / (1.0 + dissipation * dt);
}`;

const DIVERGENCE_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uVelocity;
uniform sampler2D uMask;
uniform float uSink;
void main () {
  float L = texture(uVelocity, vL).x;
  float R = texture(uVelocity, vR).x;
  float T = texture(uVelocity, vT).y;
  float B = texture(uVelocity, vB).y;
  // The walls. Mirroring the normal component into the stencil is the whole
  // boundary condition: flow heading left gives R - L = 2·C.x, so divergence
  // goes negative, and the pressure solve answers negative divergence with
  // outflow. That's the push that keeps the column inside the box.
  vec2 C = texture(uVelocity, vUv).xy;
  if (vL.x < 0.0) { L = -C.x; }
  if (vR.x > 1.0) { R = -C.x; }
  if (vT.y > 1.0) { T = -C.y; }
  if (vB.y < 0.0) { B = -C.y; }
  float div = 0.5 * (R - L + T - B);

  // And the inverse, on the letterforms. Divergence is net outflow, so the
  // projection cancels whatever it's handed: negative divergence produces
  // outflow (the wall), positive divergence produces inflow. Adding a positive
  // term over the glyphs declares fluid to be disappearing there, and the same
  // Poisson solve that pushes off the walls answers by pulling smoke in.
  //
  // It's a sink, not a force: it moves through the pressure field, so the flow
  // stays divergence-free everywhere else and the pull arrives as a coherent
  // draught rather than as every texel being nudged toward the nearest letter.
  float m = texture(uMask, vec2(vUv.x, 1.0 - vUv.y)).r;
  fragColor = vec4(div + uSink * m, 0.0, 0.0, 1.0);
}`;

const CURL_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uVelocity;
void main () {
  float L = texture(uVelocity, vL).y;
  float R = texture(uVelocity, vR).y;
  float T = texture(uVelocity, vT).x;
  float B = texture(uVelocity, vB).x;
  fragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`;

const VORTICITY_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float curl;
uniform float dt;
void main () {
  float L = texture(uCurl, vL).x;
  float R = texture(uCurl, vR).x;
  float T = texture(uCurl, vT).x;
  float B = texture(uCurl, vB).x;
  float C = texture(uCurl, vUv).x;
  // Push along the gradient of |curl|, which sharpens existing eddies instead of
  // letting numerical diffusion flatten them out.
  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;
  force *= curl * C;
  force.y *= -1.0;
  vec2 vel = texture(uVelocity, vUv).xy + force * dt;
  fragColor = vec4(clamp(vel, -1000.0, 1000.0), 0.0, 1.0);
}`;

const PRESSURE_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main () {
  float L = texture(uPressure, vL).x;
  float R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x;
  float B = texture(uPressure, vB).x;
  float divergence = texture(uDivergence, vUv).x;
  fragColor = vec4((L + R + B + T - divergence) * 0.25, 0.0, 0.0, 1.0);
}`;

const GRADIENT_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
void main () {
  float L = texture(uPressure, vL).x;
  float R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x;
  float B = texture(uPressure, vB).x;
  vec2 velocity = texture(uVelocity, vUv).xy;
  velocity -= vec2(R - L, T - B);
  fragColor = vec4(velocity, 0.0, 1.0);
}`;

const BUOYANCY_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uVelocity;
uniform sampler2D uDye;
uniform float buoyancy;
uniform float cooling;
uniform float dt;
void main () {
  float d = texture(uDye, vUv).x;
  vec2 vel = texture(uVelocity, vUv).xy;
  vel.y += (buoyancy * d - cooling) * dt;
  fragColor = vec4(vel, 0.0, 1.0);
}`;

// Emission. The mask's green channel is the pulsing subset of the lattice; this
// adds it to the dye. One pass, regardless of how many points are alight.
const EMIT_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uDye;
uniform sampler2D uMask;
uniform vec3 uRate;
void main () {
  float e = texture(uMask, vec2(vUv.x, 1.0 - vUv.y)).g;
  vec4 d = texture(uDye, vUv);
  fragColor = vec4(d.rgb + uRate * e, 1.0);
}`;

// Pack velocity into RGBA8 so it can be read back portably and handed to the
// lattice. B carries density, which the dots use to weight how much they feel.
const PROBE_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uVelocity;
uniform sampler2D uDye;
uniform float uScale;
void main () {
  vec2 v = texture(uVelocity, vUv).xy * uScale;
  float d = clamp(texture(uDye, vUv).r, 0.0, 1.0);
  fragColor = vec4(clamp(v * 0.5 + 0.5, 0.0, 1.0), d, 1.0);
}`;

const DISPLAY_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uDye;
uniform sampler2D uMask;
uniform vec2 texelSize;
uniform vec3 uColor;
uniform vec3 uAccent;
uniform vec3 uWeights;
uniform vec2 uParallax;
uniform vec3 uLightDir;
uniform float uShade;
uniform float uShadeScale;
uniform float uDim;
uniform float uLit;
uniform float uGamma;
uniform float uDensityGamma;
uniform float uTint;
uniform float uTintLow;
uniform float uTintHigh;
void main () {
  // Three layers, the outer two lagging slightly so they read as separate depths
  // rather than as one silhouette with a soft edge.
  float core = texture(uDye, vUv).r;
  float mid = texture(uDye, vUv + uParallax).g;
  float halo = texture(uDye, vUv + uParallax * 2.0).b;
  float d = core * uWeights.x + mid * uWeights.y + halo * uWeights.z;

  // The core layer's gradient stands in for a surface normal. This is the step
  // that stops it reading as a wash: without it there's nothing in the image to
  // tell one fold of smoke from another.
  float l = texture(uDye, vUv - vec2(texelSize.x, 0.0)).r;
  float r = texture(uDye, vUv + vec2(texelSize.x, 0.0)).r;
  float b = texture(uDye, vUv - vec2(0.0, texelSize.y)).r;
  float t = texture(uDye, vUv + vec2(0.0, texelSize.y)).r;
  vec3 n = normalize(vec3((l - r) * uShadeScale, (b - t) * uShadeScale, 1.0));
  float lam = clamp(dot(n, normalize(uLightDir)), 0.0, 1.0);
  float shade = mix(1.0 - uShade, 1.0 + uShade, lam);

  // The mask canvas is drawn top-down; the framebuffer is bottom-up.
  float m = texture(uMask, vec2(vUv.x, 1.0 - vUv.y)).r;
  m = pow(clamp(m, 0.0, 1.0), uGamma);

  // Opacity off a curve, so thin smoke stays thin instead of filling in.
  float alpha = pow(clamp(d, 0.0, 1.0), uDensityGamma);
  // Tint off the raw density, which runs past 1 in the core — that headroom is
  // exactly where the concentration lives, so it's read before the clamp.
  float tint = smoothstep(uTintLow, uTintHigh, d) * uTint;
  vec3 col = mix(uColor, uAccent, tint) * shade;

  float a = alpha * (uDim + uLit * m);
  fragColor = vec4(col * a, a);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function link(gl: WebGL2RenderingContext, vert: string, frag: string): Program | null {
  const vs = compile(gl, gl.VERTEX_SHADER, vert);
  const fs = compile(gl, gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  const uniforms: Record<string, WebGLUniformLocation | null> = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i);
    if (info) uniforms[info.name] = gl.getUniformLocation(program, info.name);
  }
  return { program, uniforms };
}

export function initQuotesFluid(): void {
  if (disposeFluid) {
    disposeFluid();
    disposeFluid = null;
  }

  const root = document.querySelector<HTMLElement>('[data-quotes]');
  const canvas = document.querySelector<HTMLCanvasElement>('[data-quotes-fluid]');
  if (!root || !canvas) return;

  // ts/quotes.ts owns the lattice and publishes the glyph mask here. Two bundles
  // can't share a module, so the handshake is a property on the section element.
  //
  // It may not be there yet. ts/main.ts defers its init into requestIdleCallback
  // to keep the LCP paint clear, so the lattice can publish up to a second and a
  // half after DOMContentLoaded — long after this module first runs. Returning
  // early here and never retrying is what left the canvas blank: the solver had
  // already given up before there was anything to talk to.
  const bridge = (root as HTMLElement & { __quotes?: QuotesBridge }).__quotes;
  if (!bridge) {
    document.addEventListener('quotes:ready', () => initQuotesFluid(), { once: true });
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
  // Float render targets are not optional for a fluid solver; without them the
  // velocity field quantises to 8 bits and the sim falls apart in seconds.
  if (!gl || !gl.getExtension('EXT_color_buffer_float')) {
    bridge.onFail();
    return;
  }
  const linearFloat = !!gl.getExtension('OES_texture_float_linear');

  const programs = {
    clear: link(gl, BASE_VERT, CLEAR_FRAG),
    splat: link(gl, BASE_VERT, SPLAT_FRAG),
    advection: link(gl, BASE_VERT, ADVECTION_FRAG),
    divergence: link(gl, BASE_VERT, DIVERGENCE_FRAG),
    curl: link(gl, BASE_VERT, CURL_FRAG),
    vorticity: link(gl, BASE_VERT, VORTICITY_FRAG),
    pressure: link(gl, BASE_VERT, PRESSURE_FRAG),
    gradient: link(gl, BASE_VERT, GRADIENT_FRAG),
    buoyancy: link(gl, BASE_VERT, BUOYANCY_FRAG),
    emit: link(gl, BASE_VERT, EMIT_FRAG),
    probe: link(gl, BASE_VERT, PROBE_FRAG),
    display: link(gl, BASE_VERT, DISPLAY_FRAG),
  };
  for (const key of Object.keys(programs)) {
    if (!programs[key as keyof typeof programs]) {
      bridge.onFail();
      return;
    }
  }

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
  const indices = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(0);

  const blit = (target: FBO | null): void => {
    if (target) {
      gl.viewport(0, 0, target.width, target.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    } else {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  };

  const createFBO = (
    w: number,
    h: number,
    internal: number,
    format: number,
    type: number = gl.HALF_FLOAT,
  ): FBO => {
    gl.activeTexture(gl.TEXTURE0);
    const texture = gl.createTexture() as WebGLTexture;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    const filter = linearFloat ? gl.LINEAR : gl.NEAREST;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, type, null);
    const fbo = gl.createFramebuffer() as WebGLFramebuffer;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return {
      texture,
      fbo,
      width: w,
      height: h,
      texelX: 1 / w,
      texelY: 1 / h,
      attach(id: number) {
        gl.activeTexture(gl.TEXTURE0 + id);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        return id;
      },
    };
  };
  const createDouble = (w: number, h: number, internal: number, format: number): DoubleFBO => {
    let a = createFBO(w, h, internal, format);
    let b = createFBO(w, h, internal, format);
    return {
      get read() {
        return a;
      },
      get write() {
        return b;
      },
      swap() {
        const t = a;
        a = b;
        b = t;
      },
    };
  };

  let velocity: DoubleFBO;
  let dye: DoubleFBO;
  let probeFBO: FBO;
  const probeData = new Uint8Array(PROBE_W * PROBE_H * 4);
  let probeTick = 0;
  let divergenceFBO: FBO;
  let curlFBO: FBO;
  let pressure: DoubleFBO;
  let simW = 0;
  let simH = 0;
  let dyeW = 0;
  let dyeH = 0;

  const maskTex = gl.createTexture() as WebGLTexture;
  gl.bindTexture(gl.TEXTURE_2D, maskTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const use = (p: Program): Program => {
    gl.useProgram(p.program);
    return p;
  };

  const resize = (): void => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    const aspect = rect.width / rect.height;
    simW = Math.round(SIM_RES * Math.max(1, aspect));
    simH = Math.round(SIM_RES * Math.max(1, 1 / aspect));
    dyeW = Math.round(DYE_RES * Math.max(1, aspect));
    dyeH = Math.round(DYE_RES * Math.max(1, 1 / aspect));

    velocity = createDouble(simW, simH, gl.RG16F, gl.RG);
    // RGBA rather than R: the three colour channels are three dye layers riding
    // the same velocity field, which makes the extra two nearly free.
    dye = createDouble(dyeW, dyeH, gl.RGBA16F, gl.RGBA);
    divergenceFBO = createFBO(simW, simH, gl.R16F, gl.RED);
    curlFBO = createFBO(simW, simH, gl.R16F, gl.RED);
    pressure = createDouble(simW, simH, gl.R16F, gl.RED);
    probeFBO = createFBO(PROBE_W, PROBE_H, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE);
  };

  const splat = (
    target: DoubleFBO,
    x: number,
    y: number,
    r: number,
    g: number,
    b: number,
    radius: number,
  ): void => {
    const p = use(programs.splat as Program);
    gl.uniform1i(p.uniforms.uTarget, target.read.attach(0));
    gl.uniform1f(p.uniforms.aspectRatio, target.read.width / target.read.height);
    gl.uniform2f(p.uniforms.point, x, y);
    gl.uniform3f(p.uniforms.color, r, g, b);
    gl.uniform1f(p.uniforms.radius, radius);
    blit(target.write);
    target.swap();
  };

  const pointer = { x: 0, y: 0, dx: 0, dy: 0, active: false, moved: false };

  const step = (dtScale: number): void => {
    const tune = bridge.tune;
    gl.disable(gl.BLEND);

    // One upload per frame, on a unit of its own: attach() cycles 0 and 1 for the
    // simulation textures and would otherwise clobber this between passes.
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, maskTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bridge.mask);

    // The letterforms exhale.
    let p = use(programs.emit as Program);
    gl.uniform2f(p.uniforms.texelSize, dye.read.texelX, dye.read.texelY);
    gl.uniform1i(p.uniforms.uDye, dye.read.attach(0));
    gl.uniform1i(p.uniforms.uMask, 3);
    const emit = dtScale * tune.emit;
    gl.uniform3f(
      p.uniforms.uRate,
      EMIT_RATE[0] * emit,
      EMIT_RATE[1] * emit,
      EMIT_RATE[2] * emit,
    );
    blit(dye.write);
    dye.swap();

    if (pointer.moved) {
      pointer.moved = false;
      const force = tune.pointer / POINTER_FORCE;
      splat(
        velocity,
        pointer.x,
        pointer.y,
        pointer.dx * force,
        pointer.dy * force,
        0,
        POINTER_RADIUS,
      );
    }

    p = use(programs.curl as Program);
    gl.uniform2f(p.uniforms.texelSize, velocity.read.texelX, velocity.read.texelY);
    gl.uniform1i(p.uniforms.uVelocity, velocity.read.attach(0));
    blit(curlFBO);

    p = use(programs.vorticity as Program);
    gl.uniform2f(p.uniforms.texelSize, velocity.read.texelX, velocity.read.texelY);
    gl.uniform1i(p.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(p.uniforms.uCurl, curlFBO.attach(1));
    gl.uniform1f(p.uniforms.curl, tune.curl);
    gl.uniform1f(p.uniforms.dt, DT);
    blit(velocity.write);
    velocity.swap();

    p = use(programs.buoyancy as Program);
    gl.uniform2f(p.uniforms.texelSize, velocity.read.texelX, velocity.read.texelY);
    gl.uniform1i(p.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(p.uniforms.uDye, dye.read.attach(1));
    gl.uniform1f(p.uniforms.buoyancy, tune.buoyancy);
    gl.uniform1f(p.uniforms.cooling, AMBIENT_COOL);
    gl.uniform1f(p.uniforms.dt, DT);
    blit(velocity.write);
    velocity.swap();

    p = use(programs.divergence as Program);
    gl.uniform2f(p.uniforms.texelSize, velocity.read.texelX, velocity.read.texelY);
    gl.uniform1i(p.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(p.uniforms.uMask, 3);
    gl.uniform1f(p.uniforms.uSink, tune.sink);
    blit(divergenceFBO);

    p = use(programs.clear as Program);
    gl.uniform1i(p.uniforms.uTexture, pressure.read.attach(0));
    gl.uniform1f(p.uniforms.value, PRESSURE_DISSIPATION);
    blit(pressure.write);
    pressure.swap();

    p = use(programs.pressure as Program);
    gl.uniform2f(p.uniforms.texelSize, velocity.read.texelX, velocity.read.texelY);
    gl.uniform1i(p.uniforms.uDivergence, divergenceFBO.attach(0));
    for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
      gl.uniform1i(p.uniforms.uPressure, pressure.read.attach(1));
      blit(pressure.write);
      pressure.swap();
    }

    p = use(programs.gradient as Program);
    gl.uniform2f(p.uniforms.texelSize, velocity.read.texelX, velocity.read.texelY);
    gl.uniform1i(p.uniforms.uPressure, pressure.read.attach(0));
    gl.uniform1i(p.uniforms.uVelocity, velocity.read.attach(1));
    blit(velocity.write);
    velocity.swap();

    p = use(programs.advection as Program);
    gl.uniform2f(p.uniforms.texelSize, velocity.read.texelX, velocity.read.texelY);
    gl.uniform1i(p.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(p.uniforms.uSource, velocity.read.attach(0));
    gl.uniform1f(p.uniforms.dt, DT);
    gl.uniform4f(
      p.uniforms.dissipation,
      VELOCITY_DISSIPATION,
      VELOCITY_DISSIPATION,
      VELOCITY_DISSIPATION,
      VELOCITY_DISSIPATION,
    );
    blit(velocity.write);
    velocity.swap();

    gl.uniform2f(p.uniforms.texelSize, dye.read.texelX, dye.read.texelY);
    gl.uniform1i(p.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(p.uniforms.uSource, dye.read.attach(1));
    const life = Math.max(0.05, tune.life);
    gl.uniform4f(
      p.uniforms.dissipation,
      DENSITY_DISSIPATION[0] / life,
      DENSITY_DISSIPATION[1] / life,
      DENSITY_DISSIPATION[2] / life,
      1,
    );
    blit(dye.write);
    dye.swap();

    // Hand the field back to the lattice. Downsampled to RGBA8 first: readPixels
    // on a half-float target isn't portable, and 48×27 is small enough that the
    // pipeline stall doesn't register.
    probeTick = (probeTick + 1) % PROBE_EVERY;
    if (probeTick === 0) {
      p = use(programs.probe as Program);
      gl.uniform2f(p.uniforms.texelSize, 1 / PROBE_W, 1 / PROBE_H);
      gl.uniform1i(p.uniforms.uVelocity, velocity.read.attach(0));
      gl.uniform1i(p.uniforms.uDye, dye.read.attach(1));
      gl.uniform1f(p.uniforms.uScale, PROBE_SCALE);
      blit(probeFBO);
      gl.readPixels(0, 0, PROBE_W, PROBE_H, gl.RGBA, gl.UNSIGNED_BYTE, probeData);
    }
  };

  const parseColor = (css: string): [number, number, number] => {
    const m = css.match(/-?[\d.]+/g);
    if (!m || m.length < 3) return [0, 0, 0];
    return [Number(m[0]) / 255, Number(m[1]) / 255, Number(m[2]) / 255];
  };

  const render = (): void => {
    const p = use(programs.display as Program);
    gl.uniform2f(p.uniforms.texelSize, dye.read.texelX, dye.read.texelY);
    gl.uniform1i(p.uniforms.uDye, dye.read.attach(0));
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, maskTex);
    gl.uniform1i(p.uniforms.uMask, 3);
    gl.uniform3f(p.uniforms.uWeights, LAYER_WEIGHTS[0], LAYER_WEIGHTS[1], LAYER_WEIGHTS[2]);
    gl.uniform2f(p.uniforms.uParallax, PARALLAX * 0.4, PARALLAX);
    gl.uniform3f(p.uniforms.uLightDir, LIGHT_DIR[0], LIGHT_DIR[1], LIGHT_DIR[2]);
    gl.uniform1f(p.uniforms.uShade, bridge.tune.shade);
    gl.uniform1f(p.uniforms.uShadeScale, SHADE_SCALE);
    const [r, g, b] = parseColor(bridge.color());
    gl.uniform3f(p.uniforms.uColor, r, g, b);
    const [ar, ag, ab] = parseColor(bridge.accent());
    gl.uniform3f(p.uniforms.uAccent, ar, ag, ab);
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
    blit(null);
  };

  let raf = 0;
  let alive = true;
  let lastFrame = -1;
  const frame = (): void => {
    if (!alive) return;
    const now = performance.now();
    const dtScale =
      lastFrame < 0
        ? 1
        : Math.min(EMIT_DT_MAX, Math.max(EMIT_DT_MIN, (now - lastFrame) / 16.67));
    lastFrame = now;
    if (bridge.smokeOn()) {
      canvas.style.opacity = '1';
      step(dtScale);
      render();
    } else {
      canvas.style.opacity = '0';
    }
    raf = requestAnimationFrame(frame);
  };

  const onMove = (e: PointerEvent): void => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1 - (e.clientY - rect.top) / rect.height;
    // Back into pixels before scaling: the field works in texels, and a
    // normalised delta is three orders of magnitude too small to move it.
    pointer.dx = (x - pointer.x) * rect.width * POINTER_FORCE;
    pointer.dy = (y - pointer.y) * rect.height * POINTER_FORCE;
    pointer.x = x;
    pointer.y = y;
    if (pointer.active) pointer.moved = true;
    pointer.active = true;
  };
  const onLeave = (): void => {
    pointer.active = false;
    pointer.moved = false;
  };

  const target = root.querySelector<HTMLElement>('[data-quotes-advance]') || canvas;
  target.addEventListener('pointermove', onMove);
  target.addEventListener('pointerleave', onLeave);

  let resizeTimer: number | null = null;
  const observer = new ResizeObserver(() => {
    if (resizeTimer !== null) window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 150);
  });
  observer.observe(canvas);

  disposeFluid = (): void => {
    alive = false;
    if (raf) cancelAnimationFrame(raf);
    if (resizeTimer !== null) window.clearTimeout(resizeTimer);
    observer.disconnect();
    target.removeEventListener('pointermove', onMove);
    target.removeEventListener('pointerleave', onLeave);
  };

  bridge.flow = { data: probeData, w: PROBE_W, h: PROBE_H, scale: PROBE_SCALE };

  resize();
  raf = requestAnimationFrame(frame);
}

function ready(fn: () => void): void {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
  else fn();
}

// Own entry point, and re-run on hx-boost swaps the same way ts/main.ts does.
ready(() => initQuotesFluid());
document.addEventListener('htmx:afterSettle', () => initQuotesFluid());
