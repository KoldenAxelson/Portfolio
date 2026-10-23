/* Surface plasma on a (lon, lat) chart of the sphere (dwarfstar.online/play's advect.glsl as compute kernels).
 * A compressible fluid, so a disturbance travels at a finite wave speed. State (rgba16float):
 * (v_lon, v_lat, tracer, heat), velocities in rad of arc per anim unit; pressure texture: x = density excess.
 * Chart: u = lon/2pi + 0.5 (wraps), v = lat/pi + 0.5 (clamps), row 0 = south; texel centres as the original's fragments.
 * Kernels, each its own module so the auto layouts hold exactly the bindings it uses:
 *   FORCING_WGSL    128x64 stream function + tracer source (the only place the noise runs)
 *   BODY_WGSL       W x H body force (supergranule curl of psi + active-region vortex/moat) and tracer source, once per frame
 *   INIT_WGSL       a new star: at rest, tracer = source, no density excess
 *   PREDICT_WGSL    semi-Lagrangian predictor + vertical vorticity of the old state (for the confinement)
 *   CORRECT_WGSL    limited MacCormack corrector + forces
 *   CONTINUITY_WGSL density advected, less rho div v (from the new velocity: forward-backward wave coupling)
 *   PROBE_WGSL      (heat, density excess) at up to 48 chart points into a storage buffer */

export const WORKGROUP_EDGE = 8;
export const FORCE_WIDTH = 512;   // supergranules span ~4 texels
export const FORCE_HEIGHT = 256;
export const MAX_FORCED_REGIONS = 9;
/** Supergranule pattern frequency per stellar radius at the Sun's granulation scale (~30 Mm cells). */
export const SUPERGRANULE_FREQUENCY = 20;
export const MAX_SPLATS = 4;
export const MAX_PROBES = 48;

const PARAMS = /* wgsl */ `
const PI = 3.14159265;
const TAU = 6.2831853;
const WORKGROUP_EDGE = ${WORKGROUP_EDGE};
struct FlowParams {
  shearAmp: f32,          // differential-rotation shear amplitude
  regionForceAmp: f32,    // active-region forcing amplitude
  waveSpeed: f32,         // rad per anim unit
  granScale: f32,
  timeAnim: f32,
  stepAnim: f32,          // this sub-step's dt
  regionCount: u32,
  splatCount: u32,
  coriolisAmp: f32,       // 2 Omega, scaled as the flow is
  pad0: f32, pad1: f32, pad2: f32,
  regions: array<vec4f, ${MAX_FORCED_REGIONS}>,   // xyz unit direction, w = moat strength
  splatPos: array<vec4f, ${MAX_SPLATS}>,          // (lon, lat, force lon, force lat)
  splatRate: array<vec4f, ${MAX_SPLATS}>,         // (radius rad, heat per anim unit, dye per anim unit, 0)
}
fn dirOf(lon: f32, lat: f32) -> vec3f { return vec3f(cos(lat) * sin(lon), sin(lat), cos(lat) * cos(lon)); }
struct Cell { uv: vec2f, lon: f32, lat: f32, dir: vec3f, cosLat: f32, cosLatWave: f32, dLon: f32, dLat: f32 }
fn cellAt(id: vec2u, size: vec2u) -> Cell {
  var c: Cell;
  c.uv = (vec2f(id) + 0.5) / vec2f(size);
  c.lon = (c.uv.x - 0.5) * TAU; c.lat = (c.uv.y - 0.5) * PI;
  c.dir = dirOf(c.lon, c.lat);
  c.cosLat = max(cos(c.lat), 0.05);
  // the wave terms see polar caps coarsened (metric held at 0.25 above ~75 deg), so the explicit wave step has a floor
  c.cosLatWave = max(cos(c.lat), 0.25);
  c.dLon = TAU / f32(size.x); c.dLat = PI / f32(size.y);
  return c;
}
fn eastOf(c: Cell) -> vec3f { return vec3f(cos(c.lon), 0.0, -sin(c.lon)); }
fn northOf(c: Cell) -> vec3f { return vec3f(-sin(c.lat) * sin(c.lon), cos(c.lat), -sin(c.lat) * cos(c.lon)); }
// the original never lets a fetch reach the pole row's outer edge
fn chartClamp(uv: vec2f) -> vec2f { return vec2f(uv.x, clamp(uv.y, 0.002, 0.998)); }
// chart displacement of a velocity over dt: d(lon) = v_lon dt / cos(lat), d(lat) = v_lat dt
fn stepUV(v: vec2f, cosLat: f32, dt: f32) -> vec2f { return vec2f(v.x * dt / cosLat / TAU, v.y * dt / PI); }
fn sampleChart(t: texture_2d<f32>, s: sampler, uv: vec2f) -> vec4f { return textureSampleLevel(t, s, chartClamp(uv), 0.0); }
fn loadChart(t: texture_2d<f32>, texel: vec2i) -> vec4f {
  let size = vec2i(textureDimensions(t));
  let wrapped = vec2i(((texel.x % size.x) + size.x) % size.x, clamp(texel.y, 0, size.y - 1));
  return textureLoad(t, wrapped, 0);
}
`;

const NOISE = /* wgsl */ `
fn hash13(q: vec3f) -> f32 { var p = fract(q * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
fn vnoise3(p: vec3f) -> f32 {
  let i = floor(p); var f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash13(i), hash13(i + vec3f(1, 0, 0)), f.x), mix(hash13(i + vec3f(0, 1, 0)), hash13(i + vec3f(1, 1, 0)), f.x), f.y),
             mix(mix(hash13(i + vec3f(0, 0, 1)), hash13(i + vec3f(1, 0, 1)), f.x), mix(hash13(i + vec3f(0, 1, 1)), hash13(i + vec3f(1, 1, 1)), f.x), f.y), f.z);
}
fn fbm3(start: vec3f) -> f32 {
  var p = start; var v = 0.0; var a = 0.5;
  for (var i = 0; i < 4; i++) { v += a * vnoise3(p); p = p * 2.07 + vec3f(1.7, 9.2, 4.1); a *= 0.5; }
  return v;
}
`;

export const FORCING_WGSL = PARAMS + NOISE + /* wgsl */ `
@group(0) @binding(0) var<uniform> P: FlowParams;
@group(0) @binding(1) var forceOut: texture_storage_2d<rgba16float, write>;
@compute @workgroup_size(WORKGROUP_EDGE, WORKGROUP_EDGE) fn forcing(@builtin(global_invocation_id) id: vec3u) {
  let size = textureDimensions(forceOut);
  if (any(id.xy >= size)) { return; }
  let c = cellAt(id.xy, size);
  // supergranules ~30 Mm across (R / 20) living a day or two
  let psi = fbm3(c.dir * ${SUPERGRANULE_FREQUENCY}.0 / P.granScale + vec3f(0.0, 0.0, P.timeAnim * 0.05));
  let tracerSource = fbm3(c.dir * 28.0 / P.granScale + vec3f(0.0, 0.0, P.timeAnim * 0.003));
  textureStore(forceOut, id.xy, vec4f(psi, tracerSource, 0.0, 1.0));
}`;

export const BODY_WGSL = PARAMS + /* wgsl */ `
// The stream-function gradient uses the true sample spacing in both directions; the amplitude carries a factor of
// sqrt((4^2 + 2^2) / 2) = sqrt(10) that keeps the original's rms forcing (whose spacing was 2x in lon, 4x in lat).
// The cells now flow outward from a mass source (CONTINUITY_WGSL); the same pattern's curl is only the weak swirl the
// Coriolis force gives them, opposite in the two hemispheres, at the original's gradient strength (cells 2.2x smaller).
const SUPERGRANULE_AMP = 0.036 * 3.1622777;
const SUPERGRANULE_SWIRL = 0.15 * 9.0 / ${SUPERGRANULE_FREQUENCY}.0;
@group(0) @binding(0) var<uniform> P: FlowParams;
@group(0) @binding(1) var smp: sampler;
@group(0) @binding(2) var forceTex: texture_2d<f32>;
@group(0) @binding(3) var bodyOut: texture_storage_2d<rgba16float, write>;
fn psiAt(uv: vec2f) -> f32 { return textureSampleLevel(forceTex, smp, uv, 0.0).x; }
fn regionForce(c: Cell, east: vec3f, north: vec3f, region: vec4f) -> vec2f {
  let toRegion = dot(c.dir, region.xyz);
  let a = acos(clamp(toRegion, -1.0, 1.0));
  if (a > 0.5) { return vec2f(0.0); }
  let tangential = normalize(cross(region.xyz, c.dir) + vec3f(1e-5));
  let radial = normalize(c.dir - region.xyz * toRegion + vec3f(1e-5));
  let hemisphere = select(-1.0, 1.0, region.y >= 0.0);
  let vortex = P.regionForceAmp * hemisphere * (a / 0.10) * exp(-pow(a / 0.10, 2.0));
  let moat = P.regionForceAmp * 0.6 * region.w * (a / 0.14) * exp(-pow(a / 0.14, 2.0));
  let f3 = tangential * vortex + radial * moat;
  return vec2f(dot(f3, east), dot(f3, north));
}
@compute @workgroup_size(WORKGROUP_EDGE, WORKGROUP_EDGE) fn body(@builtin(global_invocation_id) id: vec3u) {
  let size = textureDimensions(bodyOut);
  if (any(id.xy >= size)) { return; }
  let c = cellAt(id.xy, size);
  let texel = 1.0 / vec2f(textureDimensions(forceTex));
  let dLonForce = TAU * texel.x; let dLatForce = PI * texel.y;
  let dPsiDLon = (psiAt(c.uv + vec2f(texel.x, 0.0)) - psiAt(c.uv - vec2f(texel.x, 0.0))) / (2.0 * dLonForce * max(c.cosLat, 0.08));
  let dPsiDLat = (psiAt(c.uv + vec2f(0.0, texel.y)) - psiAt(c.uv - vec2f(0.0, texel.y))) / (2.0 * dLatForce);
  var force = vec2f(dPsiDLat, -dPsiDLon) * SUPERGRANULE_AMP * SUPERGRANULE_SWIRL * sin(c.lat);
  let east = eastOf(c); let north = northOf(c);
  for (var i = 0u; i < P.regionCount; i++) { force += regionForce(c, east, north, P.regions[i]); }
  let tracerSource = textureSampleLevel(forceTex, smp, c.uv, 0.0).y;
  textureStore(bodyOut, id.xy, vec4f(force, tracerSource, psiAt(c.uv)));
}`;

export const INIT_WGSL = PARAMS + /* wgsl */ `
@group(0) @binding(0) var bodyTex: texture_2d<f32>;
@group(0) @binding(1) var stateOut: texture_storage_2d<rgba16float, write>;
@group(0) @binding(2) var presOut: texture_storage_2d<rgba16float, write>;
@compute @workgroup_size(WORKGROUP_EDGE, WORKGROUP_EDGE) fn init(@builtin(global_invocation_id) id: vec3u) {
  if (any(id.xy >= textureDimensions(stateOut))) { return; }
  textureStore(stateOut, id.xy, vec4f(0.0, 0.0, textureLoad(bodyTex, id.xy, 0).z, 0.0));
  textureStore(presOut, id.xy, vec4f(0.0));
}`;

export const PREDICT_WGSL = PARAMS + /* wgsl */ `
@group(0) @binding(0) var<uniform> P: FlowParams;
@group(0) @binding(1) var smp: sampler;
@group(0) @binding(2) var stateTex: texture_2d<f32>;
@group(0) @binding(3) var predictedOut: texture_storage_2d<rgba16float, write>;
@group(0) @binding(4) var curlOut: texture_storage_2d<rgba16float, write>;
fn verticalVorticity(texel: vec2i, c: Cell) -> f32 {
  let vRight = loadChart(stateTex, texel + vec2i(1, 0)).xy; let vLeft = loadChart(stateTex, texel - vec2i(1, 0)).xy;
  let vUp = loadChart(stateTex, texel + vec2i(0, 1)).xy; let vDown = loadChart(stateTex, texel - vec2i(0, 1)).xy;
  let cosUp = max(cos(c.lat + c.dLat), 0.05); let cosDown = max(cos(c.lat - c.dLat), 0.05);
  return ((vRight.y - vLeft.y) / (2.0 * c.dLon) - (vUp.x * cosUp - vDown.x * cosDown) / (2.0 * c.dLat)) / c.cosLat;
}
@compute @workgroup_size(WORKGROUP_EDGE, WORKGROUP_EDGE) fn predict(@builtin(global_invocation_id) id: vec3u) {
  let size = textureDimensions(predictedOut);
  if (any(id.xy >= size)) { return; }
  let c = cellAt(id.xy, size);
  let texel = vec2i(id.xy);
  let here = textureLoad(stateTex, texel, 0);
  textureStore(predictedOut, id.xy, sampleChart(stateTex, smp, c.uv - stepUV(here.xy, c.cosLat, P.stepAnim)));
  textureStore(curlOut, id.xy, vec4f(verticalVorticity(texel, c), 0.0, 0.0, 0.0));
}`;

export const CORRECT_WGSL = PARAMS + /* wgsl */ `
const CONFINEMENT = 0.3;
const COOLING_PER_ANIM = 1.2;
const VISCOSITY_PER_ANIM = 0.6;
const MERIDIONAL_AMP = 0.003;   // 0.0005 x FLOW_GAIN, as the original
const BACKGROUND_RELAX_PER_ANIM = 0.4;
const TRACER_RELAX_ANIM = 13.0;
const DRAG_ACROSS_FIELD = 8.0;
const DRAG_VERTICAL_FIELD = 4.0;
const DRAG_FIELD_SCALE_BREF = 0.6;
const FIELD_SATURATION_BREF = 4.0;   // the original's 8-bit field map saturated each component here
@group(0) @binding(0) var<uniform> P: FlowParams;
@group(0) @binding(1) var smp: sampler;
@group(0) @binding(2) var stateTex: texture_2d<f32>;
@group(0) @binding(3) var predictedTex: texture_2d<f32>;
@group(0) @binding(4) var presTex: texture_2d<f32>;
@group(0) @binding(5) var curlTex: texture_2d<f32>;
@group(0) @binding(6) var bodyTex: texture_2d<f32>;
@group(0) @binding(7) var fieldTex: texture_2d<f32>;
@group(0) @binding(8) var stateOut: texture_storage_2d<rgba16float, write>;

fn limitedMacCormack(c: Cell, texel: vec2i, here: vec4f) -> vec4f {
  let size = vec2f(textureDimensions(stateTex));
  let step = stepUV(here.xy, c.cosLat, P.stepAnim);
  let corrected = textureLoad(predictedTex, texel, 0) + 0.5 * (here - sampleChart(predictedTex, smp, c.uv + step));
  // clamp to the four texels around the departure point: no new extrema
  let base = vec2i(floor((c.uv - step) * size - 0.5));
  let n0 = loadChart(stateTex, base); let n1 = loadChart(stateTex, base + vec2i(1, 0));
  let n2 = loadChart(stateTex, base + vec2i(0, 1)); let n3 = loadChart(stateTex, base + vec2i(1, 1));
  return clamp(corrected, min(min(n0, n1), min(n2, n3)), max(max(n0, n1), max(n2, n3)));
}
fn pressureAt(texel: vec2i) -> f32 { return (1.0 + loadChart(presTex, texel).x) * (1.0 + loadChart(stateTex, texel).w); }
// p = c^2 rho (1 + heat); force per unit mass -grad p / rho: waves at speed c, hot plasma pushes outward
fn pressureForce(c: Cell, texel: vec2i) -> vec2f {
  let gradLon = (pressureAt(texel + vec2i(1, 0)) - pressureAt(texel - vec2i(1, 0))) / (2.0 * c.dLon * c.cosLatWave);
  let gradLat = (pressureAt(texel + vec2i(0, 1)) - pressureAt(texel - vec2i(0, 1))) / (2.0 * c.dLat);
  return -P.waveSpeed * P.waveSpeed * vec2f(gradLon, gradLat) / (1.0 + textureLoad(presTex, texel, 0).x);
}
// a strong horizontal field brakes motion across it; a strong vertical field (spot, plage) holds the plasma still
fn magneticDrag(c: Cell, v: vec2f) -> vec2f {
  let b = clamp(textureSampleLevel(fieldTex, smp, c.uv, 0.0).xyz, vec3f(-FIELD_SATURATION_BREF), vec3f(FIELD_SATURATION_BREF));
  let bHorizontal = vec2f(dot(b, eastOf(c)), dot(b, northOf(c)));
  let bHorizontalMag = length(bHorizontal);
  let bRadialMag = abs(dot(b, c.dir));
  let alongField = select(vec2f(0.0), bHorizontal / bHorizontalMag, bHorizontalMag > 1e-4);
  let horizontalShare = bHorizontalMag / (bHorizontalMag + DRAG_FIELD_SCALE_BREF);
  let verticalShare = bRadialMag / (bRadialMag + DRAG_FIELD_SCALE_BREF);
  let vAlong = dot(v, alongField) * alongField;
  return vAlong * exp(-P.stepAnim * DRAG_VERTICAL_FIELD * verticalShare)
       + (v - vAlong) * exp(-P.stepAnim * (DRAG_ACROSS_FIELD * horizontalShare + DRAG_VERTICAL_FIELD * verticalShare));
}
// puts back the swirl the grid's diffusion removes (Fedkiw, Stam and Jensen 2001)
fn confinementForce(c: Cell, texel: vec2i) -> vec2f {
  let vorticity = textureLoad(curlTex, texel, 0).x;
  let gradAbs = vec2f(
    (abs(loadChart(curlTex, texel + vec2i(1, 0)).x) - abs(loadChart(curlTex, texel - vec2i(1, 0)).x)) / (2.0 * c.dLon * c.cosLat),
    (abs(loadChart(curlTex, texel + vec2i(0, 1)).x) - abs(loadChart(curlTex, texel - vec2i(0, 1)).x)) / (2.0 * c.dLat));
  let n = gradAbs / (length(gradAbs) + 1e-6);
  return CONFINEMENT * vec2f(n.y, -n.x) * vorticity * c.dLon;
}
@compute @workgroup_size(WORKGROUP_EDGE, WORKGROUP_EDGE) fn correct(@builtin(global_invocation_id) id: vec3u) {
  let size = textureDimensions(stateOut);
  if (any(id.xy >= size)) { return; }
  let c = cellAt(id.xy, size);
  let texel = vec2i(id.xy);
  let dt = P.stepAnim;
  let advected = limitedMacCormack(c, texel, textureLoad(stateTex, texel, 0));
  var v = advected.xy; var tracer = advected.z; var heat = advected.w;
  let s2 = sin(c.lat) * sin(c.lat);
  let background = vec2f(-P.shearAmp * (s2 + 0.75 * s2 * s2), MERIDIONAL_AMP * sin(2.0 * c.lat));
  let body = textureLoad(bodyTex, texel, 0);
  var force = body.xy + pressureForce(c, texel);
  for (var i = 0u; i < P.splatCount; i++) {
    let pos = P.splatPos[i]; let rate = P.splatRate[i];
    let w = exp(-pow(acos(clamp(dot(c.dir, dirOf(pos.x, pos.y)), -1.0, 1.0)) / rate.x, 2.0));
    force += pos.zw * w;
    heat += rate.y * w * dt;
    tracer = mix(tracer, 1.0, clamp(rate.z * w * dt, 0.0, 1.0));
  }
  v = magneticDrag(c, v);
  force += confinementForce(c, texel);
  let coriolis = P.coriolisAmp * sin(c.lat);
  force += vec2f(coriolis * v.y, -coriolis * v.x);
  v += (force + (background - v) * BACKGROUND_RELAX_PER_ANIM) * dt;
  v *= exp(-dt * VISCOSITY_PER_ANIM);
  heat *= exp(-dt * COOLING_PER_ANIM);
  tracer = clamp(mix(tracer, body.z, clamp(dt / TRACER_RELAX_ANIM, 0.0, 1.0)), 0.0, 1.0);
  textureStore(stateOut, id.xy, vec4f(v, tracer, heat));
}`;

export const CONTINUITY_WGSL = PARAMS + /* wgsl */ `
@group(0) @binding(0) var<uniform> P: FlowParams;
@group(0) @binding(1) var smp: sampler;
@group(0) @binding(2) var stateTex: texture_2d<f32>;
@group(0) @binding(3) var presTex: texture_2d<f32>;
@group(0) @binding(4) var presOut: texture_storage_2d<rgba16float, write>;
@group(0) @binding(5) var bodyTex: texture_2d<f32>;
// supergranules: plasma wells up at a cell's centre (psi high) and sinks in its lanes, so the flow between is a steady
// outflow (~0.35 km/s x FLOW_GAIN at the cell's edge); the excess the radial exchange removes relaxes away
const SUPERGRANULE_SOURCE = 3.0;
const FBM_MEAN = 0.47;
const DENSITY_RELAX_PER_ANIM = 0.2;
@compute @workgroup_size(WORKGROUP_EDGE, WORKGROUP_EDGE) fn continuity(@builtin(global_invocation_id) id: vec3u) {
  let size = textureDimensions(presOut);
  if (any(id.xy >= size)) { return; }
  let c = cellAt(id.xy, size);
  let texel = vec2i(id.xy);
  let cosUp = max(cos(c.lat + c.dLat), 0.25); let cosDown = max(cos(c.lat - c.dLat), 0.25);
  let divergence = ((loadChart(stateTex, texel + vec2i(1, 0)).x - loadChart(stateTex, texel - vec2i(1, 0)).x) / (2.0 * c.dLon)
    + (loadChart(stateTex, texel + vec2i(0, 1)).y * cosUp - loadChart(stateTex, texel - vec2i(0, 1)).y * cosDown) / (2.0 * c.dLat)) / c.cosLatWave;
  let here = textureLoad(stateTex, texel, 0);
  let advectedExcess = sampleChart(presTex, smp, c.uv - stepUV(here.xy, c.cosLat, P.stepAnim)).x;
  let source = SUPERGRANULE_SOURCE * (textureLoad(bodyTex, texel, 0).w - FBM_MEAN) - DENSITY_RELAX_PER_ANIM * advectedExcess;
  let rho = (1.0 + advectedExcess) * (1.0 - divergence * P.stepAnim) + source * P.stepAnim;
  textureStore(presOut, id.xy, vec4f(clamp(rho - 1.0, -0.9, 8.0), 0.0, 0.0, 0.0));
}`;

export const PROBE_WGSL = PARAMS + /* wgsl */ `
@group(0) @binding(0) var smp: sampler;
@group(0) @binding(1) var stateTex: texture_2d<f32>;
@group(0) @binding(2) var presTex: texture_2d<f32>;
@group(0) @binding(3) var<storage, read> points: array<vec2f, ${MAX_PROBES}>;   // (lon, lat), radians
@group(0) @binding(4) var<storage, read_write> probeOut: array<vec2f, ${MAX_PROBES}>;   // (heat, density excess)
@compute @workgroup_size(64) fn probe(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= ${MAX_PROBES}u) { return; }
  let p = points[id.x];
  let uv = vec2f(fract(p.x / TAU + 0.5), p.y / PI + 0.5);
  probeOut[id.x] = vec2f(sampleChart(stateTex, smp, uv).w, sampleChart(presTex, smp, uv).x);
}`;
