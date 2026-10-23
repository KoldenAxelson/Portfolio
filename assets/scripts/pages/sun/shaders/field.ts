/* WGSL for the field maps (fieldmaps.ts runs them, only when StarField.version changes). All are lon/lat charts:
 * u = lon/2pi + 0.5, v = lat/pi + 0.5, row 0 = south; star frame, y = rotation axis.
 *   surface — B at r = 1 in bref units, plus the radial field minus the global dipole (plage); and the radial field
 *             of the regions' flux still in sunspots (each region's dipole weighted by its moment's .w).
 *   open    — coarse field-line trace from each cell: does it reach 2.5 R? (the original did these 4608 traces
 *             on the CPU, ~3.7 ms a frame whenever the field moved)
 *   blur    — 3x3 box of the open fraction (longitude wraps, latitude clamps), and each cell's depth inside open field.
 *   corona  — per direction: open fraction, surface |B|, the streamer-belt ratio at 1.35 R, two striation phases, hole depth.
 *   parker  — wind speed v(r) per direction, a 64 (r) x 12 (lat) x 24 (lon) volume: isothermal Parker, and over open
 *             field at least the WSA fast/slow wind (the isothermal wind alone never passed ~400 km/s).
 * The Field struct is written by fieldmaps.ts; keep the two in step. */

import { MAX_DIPOLES } from '../field';
import { WAV3 } from './noise';

/** Shell radius at normalised grid coordinate s of the magnetofrictional grid (cell k at s = (k + 0.5) / N):
 *  r = 1 + 0.75 (s + s^2), cells three times thinner at the base than at the top; and its inverse. */
export const SHELL_WGSL = /* wgsl */ `
fn shellRadius(s: f32) -> f32 { return 1.0 + 0.75 * (s + s * s); }
fn shellCoordinate(r: f32) -> f32 { return 0.5 * (sqrt(1.0 + 16.0 * max(r - 1.0, 0.0) / 3.0) - 1.0); }
`;

/** FIELD_WGSL's bindings for the magnetofrictional field it adds to the dipoles (frictional.ts). */
export const FRICTIONAL_TEXTURE_BINDING = 12;
export const FRICTIONAL_SAMPLER_BINDING = 13;

export const FIELD_WGSL = SHELL_WGSL + /* wgsl */ `
const PI = 3.14159265; const TAU = 6.2831853;
struct Field {
  positions: array<vec4f, ${MAX_DIPOLES}>,
  moments: array<vec4f, ${MAX_DIPOLES}>,
  bref: f32, gmKm: f32, radiusKm: f32, tcorOpen: f32,
  tcorQuiet: f32, tcorStrong: f32, pad0: f32, pad1: f32,
}
@group(0) @binding(0) var<uniform> F: Field;
fn direction(lon: f32, lat: f32) -> vec3f { return vec3f(cos(lat) * sin(lon), sin(lat), cos(lat) * cos(lon)); }
fn chartDir(id: vec2u, size: vec2u) -> vec3f {
  let uv = (vec2f(id) + 0.5) / vec2f(size);
  return direction((uv.x - 0.5) * TAU, (uv.y - 0.5) * PI);
}
fn dipoleSum(p: vec3f) -> vec3f {
  var b = vec3f(0.0);
  for (var i = 0; i < ${MAX_DIPOLES}; i++) {
    if (F.positions[i].w < 0.5) { continue; }
    let r = p - F.positions[i].xyz; let ir = inverseSqrt(max(dot(r, r), 1e-4)); let h = r * ir; let m = F.moments[i].xyz;
    b += (3.0 * dot(m, h) * h - m) * ir * ir * ir;
  }
  return b;
}
// Wang-Sheeley-Arge (Arge et al. 2003): terminal wind speed (km/s) from a flux tube's expansion f_s between the
// photosphere and the source surface and its footpoint's distance theta_b (deg) from closed field; fast wind gets up to
// speed low, slow wind gradually (accel. length R). cmes.ts wsaTerminalKms is the CPU copy.
fn wsaTerminalKms(fs: f32, thetaBDeg: f32) -> f32 {
  let edge = 1.0 - 0.8 * exp(-pow(max(thetaBDeg / 2.8, 1e-6), 1.25));
  return 285.0 + 625.0 / pow(1.0 + fs, 2.0 / 9.0) * edge * edge * edge;
}
fn wsaAccelR(vinf: f32) -> f32 { return 1.5 + 6.0 * clamp((650.0 - vinf) / 330.0, 0.0, 1.0); }
fn wsaSpeedKms(vinf: f32, r: f32) -> f32 { return vinf * (1.0 - exp(-max(r - 1.2, 0.0) / wsaAccelR(vinf))); }
// the corona's non-potential field (frictional.ts), bref units on its own grid, faded out toward the source surface
@group(0) @binding(${FRICTIONAL_TEXTURE_BINDING}) var frictionalTex: texture_3d<f32>;
@group(0) @binding(${FRICTIONAL_SAMPLER_BINDING}) var frictionalSmp: sampler;
fn frictionalAt(p: vec3f) -> vec3f {
  let rr = length(p);
  if (rr >= 2.5) { return vec3f(0.0); }
  let d = p / rr;
  let uvw = vec3f(atan2(d.x, d.z) / TAU + 0.5, asin(clamp(d.y, -1.0, 1.0)) / PI + 0.5, shellCoordinate(rr));
  let fade = clamp((2.5 - rr) / 0.5, 0.0, 1.0);
  return textureSampleLevel(frictionalTex, frictionalSmp, uvw, 0.0).xyz * F.bref * fade * fade * (3.0 - 2.0 * fade);
}
// the dipoles' potential field plus the non-potential part, blended to purely radial between 1 and 2.5 R (the
// "source surface")
fn fieldAt(p: vec3f) -> vec3f {
  let b = dipoleSum(p) + frictionalAt(p); let rr = length(p); let rh = p / rr;
  let t = clamp((rr - 1.0) / 1.5, 0.0, 1.0); let a = t * t * (3.0 - 2.0 * t);
  return mix(b, dot(b, rh) * rh, a);
}
`;

export const SURFACE_SHADER = FIELD_WGSL + /* wgsl */ `
@group(0) @binding(1) var surface: texture_storage_2d<rgba16float, write>;
@group(0) @binding(2) var spots: texture_storage_2d<rgba16float, write>;
fn spotField(d: vec3f) -> f32 {
  var br = 0.0;
  for (var i = 1; i < ${MAX_DIPOLES}; i++) {
    if (F.positions[i].w < 0.5) { continue; }
    let r = d - F.positions[i].xyz; let ir = inverseSqrt(max(dot(r, r), 1e-4)); let h = r * ir; let m = F.moments[i].xyz;
    br += dot((3.0 * dot(m, h) * h - m) * ir * ir * ir, d) * F.moments[i].w;
  }
  return br / F.bref;
}
@compute @workgroup_size(8, 8) fn surfaceMap(@builtin(global_invocation_id) id: vec3u) {
  let size = textureDimensions(surface);
  if (any(id.xy >= size)) { return; }
  let d = chartDir(id.xy, size);
  let b = clamp(fieldAt(d) / F.bref, vec3f(-4.0), vec3f(4.0));   // the range the original's map saturated at
  // radial field minus the global dipole, at float precision (the original subtracted it from an 8-bit map,
  // which leaked the strong polar field's quantisation into the plage term)
  let m0 = F.moments[0].xyz;
  let brActive = dot(b - (3.0 * dot(m0, d) * d - m0) / F.bref, d);
  textureStore(surface, vec2i(id.xy), vec4f(b, brActive));
  textureStore(spots, vec2i(id.xy), vec4f(clamp(spotField(d), -4.0, 4.0), 0.0, 0.0, 1.0));
}`;

export const OPEN_SHADER = FIELD_WGSL + /* wgsl */ `
@group(0) @binding(1) var openRaw: texture_storage_2d<rgba16float, write>;
// coarse topology trace (step 0.05 R, at most 90 steps, 4 R of line): open if it reaches 2.5 R or runs long
fn isOpen(start: vec3f) -> bool {
  var p = start * 1.003;
  let up = select(-1.0, 1.0, dot(fieldAt(p), p) >= 0.0);
  var len = 0.0;
  for (var i = 0; i < 90; i++) {
    let b1 = normalize(fieldAt(p)); let mid = p + b1 * up * 0.025; let b2 = normalize(fieldAt(mid));
    p += b2 * up * 0.05; len += 0.05;
    let rr = length(p);
    if (rr >= 2.5) { return true; }
    if (rr < 1.0) { return false; }
    if (len > 4.0) { return true; }
  }
  return true;
}
@compute @workgroup_size(8, 8) fn openMap(@builtin(global_invocation_id) id: vec3u) {
  let size = textureDimensions(openRaw);
  if (any(id.xy >= size)) { return; }
  let d = chartDir(id.xy, size);
  textureStore(openRaw, vec2i(id.xy), vec4f(select(0.0, 1.0, isOpen(d)), min(1.0, length(fieldAt(d)) / F.bref / 4.0), 0.0, 1.0));
}`;

export const BLUR_SHADER = /* wgsl */ `
const PI = 3.14159265; const TAU = 6.2831853;
@group(0) @binding(0) var raw: texture_2d<f32>;
@group(0) @binding(1) var blurred: texture_storage_2d<rgba16float, write>;
fn cellDir(c: vec2i, size: vec2i) -> vec3f {
  let lon = (f32(c.x) + 0.5) / f32(size.x) * TAU - PI; let lat = (f32(c.y) + 0.5) / f32(size.y) * PI - PI * 0.5;
  return vec3f(cos(lat) * sin(lon), sin(lat), cos(lat) * cos(lon));
}
// .r: open fraction, 3x3 box (longitude wraps, latitude clamps), as the original's upload did. .b: how deep a cell lies
// inside open field, the angle (rad) to the nearest closed cell: real coronal holes are dark in their cores and fade
// toward their edges, and the model's open field reaches down to ~35 deg latitude, far more than the Sun's holes.
@compute @workgroup_size(8, 8) fn blurOpen(@builtin(global_invocation_id) id: vec3u) {
  let size = vec2i(textureDimensions(raw));
  let at = vec2i(id.xy);
  if (any(at >= size)) { return; }
  var open = 0.0;
  for (var dy = -1; dy <= 1; dy++) { for (var dx = -1; dx <= 1; dx++) {
    let q = vec2i((at.x + dx + size.x) % size.x, clamp(at.y + dy, 0, size.y - 1));
    open += textureLoad(raw, q, 0).r;
  } }
  var depth = 0.0;
  if (textureLoad(raw, at, 0).r > 0.5) {
    let here = cellDir(at, size);
    var nearest = -1.0;
    for (var y = 0; y < size.y; y++) { for (var x = 0; x < size.x; x++) {
      if (textureLoad(raw, vec2i(x, y), 0).r > 0.5) { continue; }
      nearest = max(nearest, dot(here, cellDir(vec2i(x, y), size)));
    } }
    depth = acos(clamp(nearest, -1.0, 1.0));
  }
  textureStore(blurred, at, vec4f(open / 9.0, textureLoad(raw, at, 0).g, depth, 1.0));
}`;

export const CORONA_DIR_SHADER = FIELD_WGSL + WAV3 + /* wgsl */ `
@group(0) @binding(1) var openTex: texture_2d<f32>;
@group(0) @binding(2) var linearSmp: sampler;
@group(0) @binding(3) var corona: texture_storage_2d<rgba16float, write>;
@group(0) @binding(4) var striation: texture_storage_2d<rgba16float, write>;
@compute @workgroup_size(8, 8) fn coronaDir(@builtin(global_invocation_id) id: vec3u) {
  let size = textureDimensions(corona);
  if (any(id.xy >= size)) { return; }
  let uv = (vec2f(id.xy) + 0.5) / vec2f(size);
  let d = chartDir(id.xy, size);
  let open = textureSampleLevel(openTex, linearSmp, uv, 0.0);
  // streamer-belt ratio: the raw field (no radial blend) at 1.35 R, radial part over magnitude
  let b = dipoleSum(d * 1.35) + frictionalAt(d * 1.35);
  let belt = dot(b, d) / max(length(b), 1e-6);
  textureStore(corona, vec2i(id.xy), vec4f(open.r, open.g, belt, wav3(d * 22.0)));
  textureStore(striation, vec2i(id.xy), vec4f(wav3(d * 9.0), open.b, 0.0, 1.0));   // .g: depth inside open field (rad)
}`;

export const PARKER_SHADER = FIELD_WGSL + /* wgsl */ `
@group(0) @binding(1) var openTex: texture_2d<f32>;
@group(0) @binding(2) var parker: texture_storage_3d<rgba16float, write>;
const RADII = 64;
const R_MAX = 8.0;
// Isothermal Parker wind through the critical point rc = GM/2cs^2: dv/dr = (2cs^2/r - GM/r^2)/(v - cs^2/v), RK2
// from rc outward and inward. Closed field and unbound coronae (rc > 40 R) get a slow confined drift.
fn dvdr(v: f32, rKm: f32, cs2: f32) -> f32 {
  let den = v - cs2 / v;
  if (abs(den) < 1e-6) { return 0.0; }
  return (2.0 * cs2 / rKm - F.gmKm / (rKm * rKm)) / den * F.radiusKm;
}
@compute @workgroup_size(4, 4) fn parkerGrid(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= 12u || id.y >= 24u) { return; }   // x: latitude cell, y: longitude cell
  let lat = (f32(id.x) + 0.5) / 12.0 * PI - PI * 0.5; let lon = (f32(id.y) + 0.5) / 24.0 * TAU - PI;
  let uv = vec2f(lon / TAU + 0.5, lat / PI + 0.5);
  let o = textureLoad(openTex, vec2i(uv * vec2f(textureDimensions(openTex))), 0);
  let isOpen = o.r > 0.5;
  let bn = min(3.0, o.g * 4.0 * 8.0);
  let tMK = select(F.tcorQuiet + (F.tcorStrong - F.tcorQuiet) * min(1.0, bn * 0.5), max(1.4, 1.8 * F.tcorOpen), isOpen);
  let cs2 = 1.380649e-23 * tMK * 1e6 / (0.6 * 1.6726e-27) / 1e6;   // km^2/s^2
  let cs = sqrt(cs2);
  let rc = F.gmKm / (2.0 * cs2) / F.radiusKm;
  var v: array<f32, RADII>;
  for (var k = 0; k < RADII; k++) { v[k] = 5.0 + 10.0 * f32(k) / 64.0; }
  if (isOpen && rc <= 40.0) {
    for (var k = 0; k < RADII; k++) { v[k] = -1.0; }
    let slope = cs / rc;   // the transonic slope at rc (the original's start was off by sqrt 2; harmless, fixed)
    for (var dir = -1; dir <= 1; dir += 2) {
      let h = 0.025 * f32(dir);
      var r = rc; var vel = cs + slope * 0.01 * f32(dir);
      for (var s = 0; s < 400; s++) {
        if ((dir > 0 && r >= R_MAX) || (dir < 0 && r <= 1.0)) { break; }
        let k1 = dvdr(vel, r * F.radiusKm, cs2); let vm = max(vel + 0.5 * h * k1, 0.5);
        vel = max(vel + h * dvdr(vm, (r + 0.5 * h) * F.radiusKm, cs2), 0.5); r += h;
        let k = i32(round((r - 1.0) / (R_MAX - 1.0) * f32(RADII - 1)));
        if (k >= 0 && k < RADII) { v[k] = vel; }
      }
    }
    var last = 0.5;   // a gap below the first stored radius takes the floor speed
    for (var k = 0; k < RADII; k++) {
      if (v[k] < 0.0) { v[k] = last; } else { last = v[k]; }
      if (rc < 1.0) { v[k] = max(v[k], cs); }
    }
  }
  var vinf = 0.0;
  if (isOpen) {
    // expansion: radial |B| at the base over its source-surface value, r^2-normalised (the grid is coarse: no trace)
    let d = direction(lon, lat);
    let fs = max(1.0, length(fieldAt(d)) / max(length(fieldAt(d * 2.5)) * 6.25, 1e-9));
    let thetaB = max(0.0, o.b * 180.0 / PI - 90.0 / f32(textureDimensions(openTex).y));   // less half a cell, as the strings
    vinf = wsaTerminalKms(fs, thetaB);
  }
  for (var k = 0; k < RADII; k++) {
    let r = 1.0 + f32(k) * (R_MAX - 1.0) / f32(RADII - 1);
    let speed = select(v[k], max(v[k], wsaSpeedKms(vinf, r)), isOpen);
    textureStore(parker, vec3i(k, i32(id.x), i32(id.y)), vec4f(speed / 1000.0, 0.0, 0.0, 1.0));
  }
}`;
