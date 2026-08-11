// GLSL for the fluid solver. Kept apart from the JavaScript that drives it so
// each file reads as one language.

export const BASE_VERT = `#version 300 es
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

export const CLEAR_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTexture;
uniform float value;
void main () { fragColor = value * texture(uTexture, vUv); }`;

export const SPLAT_FRAG = `#version 300 es
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
  fragColor = vec4(texture(uTarget, vUv).xyz + splat, 1.0);
}`;

export const ADVECTION_FRAG = `#version 300 es
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
  // Per channel, so the three dye layers thin out at their own rates while
  // riding the one velocity field.
  fragColor = texture(uSource, coord) / (1.0 + dissipation * dt);
}`;

export const DIVERGENCE_FRAG = `#version 300 es
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

  // And the inverse of it, on the letterforms. Divergence is net outflow and the
  // projection cancels whatever it's handed, so adding a positive term over the
  // glyphs declares fluid to be disappearing there and the same Poisson solve
  // that pushes off the walls answers by pulling smoke in.
  //
  // A sink, not a force: it moves through the pressure field, so the flow stays
  // divergence-free everywhere else and the pull arrives as a coherent draught
  // rather than as every texel being nudged toward the nearest letter.
  float m = texture(uMask, vec2(vUv.x, 1.0 - vUv.y)).r;
  fragColor = vec4(div + uSink * m, 0.0, 0.0, 1.0);
}`;

export const CURL_FRAG = `#version 300 es
precision highp float;
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

export const VORTICITY_FRAG = `#version 300 es
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

export const PRESSURE_FRAG = `#version 300 es
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

export const GRADIENT_FRAG = `#version 300 es
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
  vec2 velocity = texture(uVelocity, vUv).xy - vec2(R - L, T - B);
  fragColor = vec4(velocity, 0.0, 1.0);
}`;

export const BUOYANCY_FRAG = `#version 300 es
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

// The letterforms exhale. The mask's green channel is the pulsing subset of the
// lattice, so this is one pass no matter how many points are alight — as splats
// it would have been one full-screen pass per vent.
export const EMIT_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uDye;
uniform sampler2D uMask;
uniform vec3 uRate;
void main () {
  float e = texture(uMask, vec2(vUv.x, 1.0 - vUv.y)).g;
  fragColor = vec4(texture(uDye, vUv).rgb + uRate * e, 1.0);
}`;

// Velocity packed into RGBA8 so it can be read back portably and handed to the
// lattice. B carries density, which the dots use to weight how much they feel.
export const PROBE_FRAG = `#version 300 es
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

export const DISPLAY_FRAG = `#version 300 es
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
  // that stops it reading as a wash: without it there is nothing in the image to
  // tell one fold of smoke from another.
  float l = texture(uDye, vUv - vec2(texelSize.x, 0.0)).r;
  float r = texture(uDye, vUv + vec2(texelSize.x, 0.0)).r;
  float b = texture(uDye, vUv - vec2(0.0, texelSize.y)).r;
  float t = texture(uDye, vUv + vec2(0.0, texelSize.y)).r;
  vec3 n = normalize(vec3((l - r) * uShadeScale, (b - t) * uShadeScale, 1.0));
  float lam = clamp(dot(n, normalize(uLightDir)), 0.0, 1.0);
  float shade = mix(1.0 - uShade, 1.0 + uShade, lam);

  // The mask canvas is drawn top-down; the framebuffer is bottom-up.
  float m = pow(clamp(texture(uMask, vec2(vUv.x, 1.0 - vUv.y)).r, 0.0, 1.0), uGamma);

  // Opacity off a curve, so thin smoke stays thin instead of filling in.
  float alpha = pow(clamp(d, 0.0, 1.0), uDensityGamma);
  // Tint off the raw density, which runs past 1 in the core — that headroom is
  // exactly where the concentration lives, so it's read before the clamp.
  float tint = smoothstep(uTintLow, uTintHigh, d) * uTint;
  vec3 col = mix(uColor, uAccent, tint) * shade;

  float a = alpha * (uDim + uLit * m);
  fragColor = vec4(col * a, a);
}`;
