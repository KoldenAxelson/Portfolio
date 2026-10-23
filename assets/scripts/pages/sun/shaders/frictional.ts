/* WGSL for the magnetofrictional field (frictional.ts runs it): the corona's non-potential part B_np = curl A on a
 * shell grid from 1 to 2.5 R (lon x lat x r, r stretched toward the surface), evolved as
 *   dA/dt = v x B - eta J,   v = J x B / (nu (B^2 + b0^2)),   B = B_pot + B_np,   J = curl B_np
 * (Yang, Sturrock & Antiochos 1986; van Ballegooijen et al. 2000): the field relaxes toward force-free while the
 * photosphere's motions, line-tied at the base, shear and twist it. B_pot is the dipole model (shaders/field.ts).
 * Vectors are Cartesian star-frame components stored per cell; B in bref units, lengths in R, time in days.
 *   potential — B_pot on the grid (when the dipoles move)
 *   curl      — B_np = curl A, into a float32 copy for the solver and a float16 copy fieldAt samples
 *   electric  — E = -v x B + eta J; at the base v is the surface flow less the regions' own drift
 *   advance   — A -= E dt, with slow decay, the frozen polar caps and a damped top
 *   relax     — a flare or eruption gives back part of the stress near it
 *   measure   — non-potential and potential magnetic energy per lon/lat column (the loops' free energy)
 *   coarsen   — B_np averaged onto a half-resolution grid, read back for the CPU's field (StarField.fieldAt)
 * The Frictional struct is written by frictional.ts; keep the two in step. */

import { MAX_DIPOLES } from '../field';
import { FIELD_WGSL } from './field';

export const MAX_RELAX = 8;
export const FRICTIONAL_FLOATS = 16 + 4 * (MAX_DIPOLES + 2 * MAX_RELAX);
export const WORKGROUP_3D = 4;


const COMMON = FIELD_WGSL + /* wgsl */ `
struct Frictional {
  dims: vec4u,                                   // lon, lat, r cells
  dtDays: f32, nu: f32, eta: f32, vmax: f32,
  b0: f32, decayPerDay: f32, flowToRPerDay: f32, activeLat: f32,
  relaxCount: u32, pad0: u32, pad1: u32, pad2: u32,
  drift: array<vec4f, ${MAX_DIPOLES}>,           // per dipole: longitude and latitude drift, rad/day (0 for the global one)
  relax: array<vec4f, ${MAX_RELAX}>,             // direction, angular radius (rad)
  relaxKeep: array<vec4f, ${MAX_RELAX}>,         // .x: the share of B_np kept at the centre
}
@group(0) @binding(1) var<uniform> M: Frictional;

struct Cell { lon: f32, lat: f32, s: f32, r: f32, dir: vec3f, east: vec3f, north: vec3f, cosLat: f32 }
fn cellOf(c: vec3i) -> Cell {
  var o: Cell;
  let n = vec3f(M.dims.xyz);
  o.lon = (f32(c.x) + 0.5) / n.x * TAU - PI;
  o.lat = (f32(c.y) + 0.5) / n.y * PI - 0.5 * PI;
  o.s = (f32(c.z) + 0.5) / n.z;
  o.r = shellRadius(o.s);
  o.dir = direction(o.lon, o.lat);
  o.east = vec3f(cos(o.lon), 0.0, -sin(o.lon));
  o.north = vec3f(-sin(o.lat) * sin(o.lon), cos(o.lat), -sin(o.lat) * cos(o.lon));
  o.cosLat = max(cos(o.lat), 0.02);
  return o;
}
fn isFrozen(cell: Cell) -> bool { return abs(cell.lat) > M.activeLat; }
// neighbours: longitude wraps, latitude clamps, below the base mirrors the first layer, above the top is empty
fn fetch(t: texture_3d<f32>, c: vec3i) -> vec3f {
  let n = vec3i(M.dims.xyz);
  if (c.z >= n.z) { return vec3f(0.0); }
  let q = vec3i((c.x + n.x) % n.x, clamp(c.y, 0, n.y - 1), max(c.z, 0));
  return textureLoad(t, q, 0).xyz;
}
// curl of a Cartesian vector field sampled on the shell grid: sum over the coordinates q of grad(q) x dF/dq
fn curlOf(t: texture_3d<f32>, c: vec3i, cell: Cell) -> vec3f {
  let n = vec3f(M.dims.xyz);
  let dLon = TAU / n.x; let dLat = PI / n.y; let ds = 1.0 / n.z;
  let dFdLon = (fetch(t, c + vec3i(1, 0, 0)) - fetch(t, c - vec3i(1, 0, 0))) / (2.0 * dLon);
  let dFdLat = (fetch(t, c + vec3i(0, 1, 0)) - fetch(t, c - vec3i(0, 1, 0))) / (2.0 * dLat);
  let drds = 0.75 * (1.0 + 2.0 * cell.s);
  var dFdr = (fetch(t, c + vec3i(0, 0, 1)) - fetch(t, c - vec3i(0, 0, 1))) / (2.0 * ds * drds);
  if (c.z == 0) { dFdr = (fetch(t, c + vec3i(0, 0, 1)) - fetch(t, c)) / (ds * drds); }   // one-sided at the base
  return cross(cell.dir, dFdr) + cross(cell.north, dFdLat) / cell.r + cross(cell.east, dFdLon) / (cell.r * cell.cosLat);
}
fn inGrid(id: vec3u) -> bool { return all(id < M.dims.xyz); }
`;

export const POTENTIAL_SHADER = COMMON + /* wgsl */ `
@group(0) @binding(2) var potentialOut: texture_storage_3d<rgba32float, write>;
@compute @workgroup_size(${WORKGROUP_3D}, ${WORKGROUP_3D}, ${WORKGROUP_3D}) fn potential(@builtin(global_invocation_id) id: vec3u) {
  if (!inGrid(id)) { return; }
  let cell = cellOf(vec3i(id));
  textureStore(potentialOut, vec3i(id), vec4f(dipoleSum(cell.dir * cell.r) / F.bref, 0.0));
}`;

export const CURL_SHADER = COMMON + /* wgsl */ `
@group(0) @binding(3) var potentialA: texture_3d<f32>;
@group(0) @binding(4) var fieldOut: texture_storage_3d<rgba32float, write>;
@group(0) @binding(5) var sampledOut: texture_storage_3d<rgba16float, write>;
@compute @workgroup_size(${WORKGROUP_3D}, ${WORKGROUP_3D}, ${WORKGROUP_3D}) fn curl(@builtin(global_invocation_id) id: vec3u) {
  if (!inGrid(id)) { return; }
  let c = vec3i(id); let cell = cellOf(c);
  let b = curlOf(potentialA, c, cell);
  textureStore(fieldOut, c, vec4f(b, 0.0));
  textureStore(sampledOut, c, vec4f(b, 0.0));
}`;

export const ELECTRIC_SHADER = COMMON + /* wgsl */ `
@group(0) @binding(3) var fieldNp: texture_3d<f32>;
@group(0) @binding(6) var fieldPot: texture_3d<f32>;
@group(0) @binding(7) var flowTex: texture_2d<f32>;
@group(0) @binding(8) var flowSmp: sampler;
@group(0) @binding(9) var electricOut: texture_storage_3d<rgba32float, write>;
// The photosphere at the base: the surface flow (shaders/flow.ts, physical units) less the drift every region's
// dipole already moves with, so only the shearing and twisting inside a region is left. Quiet and polar field (the
// global dipole's) is not driven: the dipole model has no surface structure there to shear.
fn surfaceDrive(cell: Cell) -> vec3f {
  let p = cell.dir * cell.r;
  var weight = 0.0; var regionWeight = 0.0; var drift = vec3f(0.0);
  for (var i = 0; i < ${MAX_DIPOLES}; i++) {
    if (F.positions[i].w < 0.5) { continue; }
    let rel = p - F.positions[i].xyz; let ir = inverseSqrt(max(dot(rel, rel), 1e-4)); let h = rel * ir; let m = F.moments[i].xyz;
    let b = (3.0 * dot(m, h) * h - m) * ir * ir * ir;
    let w = dot(b, b);
    weight += w;
    if (i > 0) { regionWeight += w; }
    drift += w * (cell.east * M.drift[i].x * cell.r * cell.cosLat + cell.north * M.drift[i].y);
  }
  let uv = vec2f(cell.lon / TAU + 0.5, cell.lat / PI + 0.5);
  let flow = textureSampleLevel(flowTex, flowSmp, uv, 0.0).xy * M.flowToRPerDay;
  let v = cell.east * flow.x + cell.north * flow.y - drift / max(weight, 1e-12);
  return v * regionWeight / max(weight, 1e-12);
}
@compute @workgroup_size(${WORKGROUP_3D}, ${WORKGROUP_3D}, ${WORKGROUP_3D}) fn electric(@builtin(global_invocation_id) id: vec3u) {
  if (!inGrid(id)) { return; }
  let c = vec3i(id); let cell = cellOf(c);
  if (isFrozen(cell)) { textureStore(electricOut, c, vec4f(0.0)); return; }
  let bNp = textureLoad(fieldNp, c, 0).xyz;
  let b = textureLoad(fieldPot, c, 0).xyz + bNp;
  let j = curlOf(fieldNp, c, cell);   // curl B_pot = 0
  var v = cross(j, b) / (M.nu * (dot(b, b) + M.b0 * M.b0));
  let speed = length(v);
  if (speed > M.vmax) { v *= M.vmax / speed; }
  if (c.z == 0) { v = surfaceDrive(cell); }   // line-tied: the base moves with the photosphere
  textureStore(electricOut, c, vec4f(-cross(v, b) + M.eta * j, 0.0));
}`;

export const ADVANCE_SHADER = COMMON + /* wgsl */ `
@group(0) @binding(3) var potentialA: texture_3d<f32>;
@group(0) @binding(10) var electric: texture_3d<f32>;
@group(0) @binding(11) var potentialAOut: texture_storage_3d<rgba32float, write>;
const TOP_DAMP_PER_DAY = 2.0;   // the field turns radial toward the source surface
@compute @workgroup_size(${WORKGROUP_3D}, ${WORKGROUP_3D}, ${WORKGROUP_3D}) fn advance(@builtin(global_invocation_id) id: vec3u) {
  if (!inGrid(id)) { return; }
  let c = vec3i(id); let cell = cellOf(c);
  if (isFrozen(cell)) { textureStore(potentialAOut, c, vec4f(0.0)); return; }
  let top = clamp((cell.r - 2.0) / 0.5, 0.0, 1.0);
  let damp = exp(-M.dtDays * (M.decayPerDay + TOP_DAMP_PER_DAY * top * top));
  let a = (textureLoad(potentialA, c, 0).xyz - M.dtDays * textureLoad(electric, c, 0).xyz) * damp;
  textureStore(potentialAOut, c, vec4f(a, 0.0));
}`;

export const RELAX_SHADER = COMMON + /* wgsl */ `
@group(0) @binding(3) var potentialA: texture_3d<f32>;
@group(0) @binding(11) var potentialAOut: texture_storage_3d<rgba32float, write>;
@compute @workgroup_size(${WORKGROUP_3D}, ${WORKGROUP_3D}, ${WORKGROUP_3D}) fn relax(@builtin(global_invocation_id) id: vec3u) {
  if (!inGrid(id)) { return; }
  let c = vec3i(id); let cell = cellOf(c);
  var a = textureLoad(potentialA, c, 0).xyz;
  for (var e = 0u; e < M.relaxCount; e++) {
    let q = M.relax[e];
    let x = acos(clamp(dot(cell.dir, q.xyz), -1.0, 1.0)) / q.w;
    a *= mix(1.0, M.relaxKeep[e].x, exp(-x * x));
  }
  textureStore(potentialAOut, c, vec4f(a, 0.0));
}`;

export const CLEAR_SHADER = COMMON + /* wgsl */ `
@group(0) @binding(11) var potentialAOut: texture_storage_3d<rgba32float, write>;
@compute @workgroup_size(${WORKGROUP_3D}, ${WORKGROUP_3D}, ${WORKGROUP_3D}) fn clearField(@builtin(global_invocation_id) id: vec3u) {
  if (!inGrid(id)) { return; }
  textureStore(potentialAOut, vec3i(id), vec4f(0.0));
}`;

export const MEASURE_SHADER = COMMON + /* wgsl */ `
@group(0) @binding(3) var fieldNp: texture_3d<f32>;
@group(0) @binding(6) var fieldPot: texture_3d<f32>;
@group(0) @binding(14) var<storage, read_write> energies: array<vec2f>;   // per lon/lat column: (non-potential, potential)
const MEASURE_TOP_R = 1.6;
// the magnetic energy in each lon/lat column of the grid below 1.6 R, per unit of the column's solid angle
@compute @workgroup_size(8, 8) fn measure(@builtin(global_invocation_id) id: vec3u) {
  if (any(id.xy >= M.dims.xy)) { return; }
  let top = min(M.dims.z, u32(ceil(shellCoordinate(MEASURE_TOP_R) * f32(M.dims.z))));
  var sum = vec2f(0.0);
  for (var k = 0u; k < top; k++) {
    let c = vec3i(vec2i(id.xy), i32(k)); let cell = cellOf(c);
    let bNp = textureLoad(fieldNp, c, 0).xyz; let bPot = textureLoad(fieldPot, c, 0).xyz;
    sum += vec2f(dot(bNp, bNp), dot(bPot, bPot)) * cell.r * cell.r * 0.75 * (1.0 + 2.0 * cell.s);
  }
  energies[id.y * M.dims.x + id.x] = sum;
}`;

export const COARSEN_SHADER = COMMON + /* wgsl */ `
@group(0) @binding(3) var fieldNp: texture_3d<f32>;
@group(0) @binding(15) var<storage, read_write> coarse: array<vec4f>;
@compute @workgroup_size(${WORKGROUP_3D}, ${WORKGROUP_3D}, ${WORKGROUP_3D}) fn coarsen(@builtin(global_invocation_id) id: vec3u) {
  let half = M.dims.xyz / 2u;
  if (any(id >= half)) { return; }
  var b = vec3f(0.0);
  for (var e = 0u; e < 8u; e++) { b += textureLoad(fieldNp, vec3i(id * 2u + vec3u(e & 1u, (e >> 1u) & 1u, e >> 2u)), 0).xyz; }
  coarse[(id.z * half.y + id.y) * half.x + id.x] = vec4f(b / 8.0, 0.0);
}`;
