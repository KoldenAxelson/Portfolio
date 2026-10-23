/* WGSL for the strings (strings.ts runs them): thousands of traced field lines that carry the corona's matter.
 *   trace — one thread per string: seed a footpoint (first time), trace the field line from it, relax the old
 *           line toward the new one, then everything static between retraces: the WSA wind, the EUV loop's
 *           RTV apex temperature and density, the path (open lines continue radially to 150 R) and its
 *           arc-length, flow-time and Alfven-time prefix sums.
 *   motion — one thread per string while anything moves the corona: shock pushes, pointer drags and eruption
 *           snaps kick its Alfven bumps; strain past the limit snaps it; a snapped string fades and re-seeds.
 *   draw  — one instance per string, a triangle strip pulled from the node buffer: white-light electron columns
 *           (mode 0, coronagraphs) or optically thin EUV loops (mode 1), both with parcel trains riding the flow.
 * Star frame, lengths in stellar radii. Layouts are mirrored by strings.ts's byte sizes; keep them in step. */

import { aiaResponseWgsl } from '../views';
import { CORONAL_DENSITY_WGSL } from './cme';
import { FIELD_WGSL } from './field';

/** Traced nodes per string (the original's SNODE). */
export const MAX_TRACE_NODES = 48;
/** Path nodes per string: 48 traced + the radial extension from >= 2.4 R to 150 R in x1.15 steps (<= 31). */
export const MAX_PATH_NODES = 80;
export const STRING_STATE_BYTES = 96;
export const PATH_NODE_BYTES = 32;
export const TRACE_PARAMS_BYTES = 32;
export const DRAW_PARAMS_BYTES = 96;
export const TRACE_WORKGROUP = 64;
/** The heliosphere clock the layer receives wraps at this many star seconds (layer.ts LayerFrame.windClockS). */
export const WIND_CLOCK_WRAP_S = 1e6;

/** Motion slots per string (bytes) and the motion kernel's uniform. */
export const MOTION_BYTES = 160;
export const MOTION_PARAMS_BYTES = 576;
export const MAX_SHOCKS = 8;
export const MAX_SNAPS = 4;
/** Alfven bumps fade over this e-folding (star s); a snapped string fades out over SNAP_FADE_S. */
export const WAVE_DAMP_S = 900;
export const SNAP_FADE_S = 14400;

const STRING_COMMON_WGSL = /* wgsl */ `
const MAX_TRACE: u32 = ${MAX_TRACE_NODES}u;
const MAX_PATH: u32 = ${MAX_PATH_NODES}u;
const WIND_WRAP_S = ${WIND_CLOCK_WRAP_S};
const WAVE_DAMP_S = ${WAVE_DAMP_S}.0;
const SNAP_FADE_S = ${SNAP_FADE_S}.0;
const BUMP_XI = 0.02;
struct StringState {
  foot: vec3f, traceNodes: u32,              // path[0 .. traceNodes) is the traced (relaxed) field line
  pathNodes: u32, isOpen: u32, isSeeded: u32, flowTimeS: f32,
  vinfKms: f32, accelR: f32, expansion: f32, thetaBDeg: f32,   // WSA: terminal speed, acceleration length, f_s, theta_b
  alfvenTimeS: f32, pathLengthR: f32, lineLengthR: f32, maxDxiDs: f32,
  parcelPhases: vec3f, apexTempMK: f32,
  apexDensity: f32, generation: u32, pad1: f32, pad2: f32,   // generation: times re-seeded after a snap
}
struct PathNode { p: vec3f, cumR: f32, flowTimeS: f32, alfvenXi: f32, pad0: f32, pad1: f32 }
fn pcg(v: u32) -> u32 {
  let s = v * 747796405u + 2891336453u;
  let w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
  return (w >> 22u) ^ w;
}
fn unitHash(v: u32) -> f32 { return f32(pcg(v) >> 8u) / 16777216.0; }
// The motion of a string. Plasma is frozen to its field, so a push across a field line bends it: an Alfven wave.
// Along a long string the Alfven crossing time is hundreds of damping times, so a push bulges the string where it
// lands and the tension pulls the bulge back over the Alfven time across its own width. Closed form: up to 4
// gaussian bumps in the Alfven travel-time coordinate xi (width BUMP_XI), each a damped oscillator of angular
// frequency pi / (2 BUMP_XI T_A); c and s are its displacement and velocity / omega at waveT0. A string strained
// past 0.9 snaps: it flies out along free.xyz at free.w R/s and fades (the original's S0.free).
struct Motion {
  c: array<vec4f, 4>,   // xyz: displacement part (R); w: the bump's xi, -1 for an empty slot
  s: array<vec4f, 4>,   // xyz: velocity part / omega (R)
  free: vec4f,          // snapped: direction, speed R/s
  clock: vec4f,          // snap time, snapped (0/1), waveT0, waving (0/1); times on the wrapped heliosphere clock
}
fn sinceS(now: f32, then: f32) -> f32 { let d = now - then; return select(d, d + WIND_WRAP_S, d < 0.0); }
fn bumpOmega(alfvenTimeS: f32) -> f32 { return 3.14159265 / (2.0 * BUMP_XI * max(alfvenTimeS, 1.0)); }
fn bumpWeight(xi: f32, bumpXi: f32) -> f32 { let x = (xi - bumpXi) / BUMP_XI; return exp(-x * x); }
fn waveDisplacement(m: Motion, xi: f32, omega: f32, tau: f32) -> vec3f {
  let f = exp(-tau / WAVE_DAMP_S); let co = cos(omega * tau); let sn = sin(omega * tau);
  var d = vec3f(0.0);
  for (var k = 0; k < 4; k++) {
    if (m.c[k].w < 0.0) { continue; }
    d += bumpWeight(xi, m.c[k].w) * f * (m.c[k].xyz * co + m.s[k].xyz * sn);
  }
  return d;
}
// the wind along a string (km/s): fast wind accelerates low, slow wind gradually (Sheeley's blobs); closed: a drift
fn windOnString(s: StringState, r: f32) -> f32 {
  if (s.isOpen == 0u) { return 25.0; }
  return max(20.0, s.vinfKms * (1.0 - exp(-max(r - 1.2, 0.0) / s.accelR)));
}
`;

export const TRACE_SHADER = FIELD_WGSL + STRING_COMMON_WGSL + /* wgsl */ `
struct TraceParams { first: u32, count: u32, total: u32, coronaCount: u32, seed: u32, pad0: u32, pad1: u32, pad2: u32 }
@group(0) @binding(1) var<uniform> P: TraceParams;
@group(0) @binding(2) var openRaw: texture_2d<f32>;
@group(0) @binding(3) var<storage, read_write> strings: array<StringState>;
@group(0) @binding(4) var<storage, read_write> nodes: array<PathNode>;
@group(0) @binding(5) var<storage, read_write> openCount: atomic<i32>;
@group(0) @binding(6) var<storage, read> motion: array<Motion>;

const PATH_MAX_R = 150.0;
var<private> traced: array<vec3f, ${MAX_TRACE_NODES}>;
var<private> rngState: u32;

fn rand() -> f32 { rngState = pcg(rngState); return f32(rngState >> 8u) / 16777216.0; }
fn randomFoot() -> vec3f {
  let u = rand() * 2.0 - 1.0; let ph = rand() * TAU; let rr = sqrt(max(1.0 - u * u, 0.0));
  return vec3f(rr * cos(ph), u, rr * sin(ph));
}
fn footFieldRatio(foot: vec3f) -> f32 { return length(fieldAt(foot * 1.01)) / max(F.bref, 1e-6); }
fn vFast(r: f32) -> f32 {
  let t = clamp((r - 1.0) / 2.8, 0.0, 1.0); let sm = t * t * (3.0 - 2.0 * t);
  let vA = 800.0 * pow(3.8 / max(r, 3.8), 0.8) * sm + 300.0 * (1.0 - sm);
  return sqrt(180.0 * 180.0 + vA * vA);
}

struct Trace { nodes: u32, isOpen: bool }
// the original's traceString: forward Euler along B, direction fixed outward by the first step, step growing
// with r; closed when it comes back below the surface, open past 9.5 R (or still above 2.4 R when it runs out)
fn traceLine(foot: vec3f) -> Trace {
  traced[0] = foot;
  var n = 1u; var p = foot * 1.002; var up = 0.0;
  for (var step = 0; step < 400 && n < MAX_TRACE; step++) {
    var d = normalize(fieldAt(p));
    if (up == 0.0) { up = select(-1.0, 1.0, dot(d, p) >= 0.0); }
    d *= up;
    let r0 = length(p);
    p += d * clamp(0.05 * r0 * r0, 0.006, 0.12);
    let r1 = length(p);
    if (r1 < 1.0) { traced[n] = normalize(p); return Trace(n + 1u, false); }
    traced[n] = p; n++;
    if (r1 > 9.5) { return Trace(n, true); }
  }
  return Trace(n, length(p) > 2.4);
}

// wind strings: footpoints weighted toward strong field (streamers root around active regions and the neutral
// line) yet spread over the sphere
fn coronaFoot() -> vec3f {
  var foot = vec3f(0.0, 1.0, 0.0);
  for (var t = 0; t < 6; t++) {
    foot = randomFoot();
    if (rand() < min(1.0, footFieldRatio(foot) * 0.6 + 0.15)) { break; }
  }
  return foot;
}

// EUV loops: footpoints drawn ~ B^1.5 whose lines close; none in 40 tries leaves the string unlit (0 nodes)
struct Seeded { foot: vec3f, trace: Trace }
fn euvSeed() -> Seeded {
  var foot = vec3f(0.0, 1.0, 0.0);
  for (var a = 0; a < 40; a++) {
    foot = randomFoot();
    let ratio = footFieldRatio(foot);
    if (rand() > min(1.0, ratio * sqrt(ratio))) { continue; }
    let tr = traceLine(foot);
    if (!tr.isOpen) { return Seeded(foot, tr); }
  }
  return Seeded(foot, Trace(0u, false));
}

fn seedString(i: u32, s: ptr<function, StringState>) -> Trace {
  (*s).isSeeded = 1u;
  (*s).traceNodes = 0u;
  (*s).parcelPhases = vec3f(rand(), rand(), rand());
  if (i >= P.coronaCount) {
    let seeded = euvSeed();
    (*s).foot = seeded.foot;
    return seeded.trace;
  }
  (*s).foot = coronaFoot();
  return traceLine((*s).foot);
}

// the field moved: drift toward the new line (0.6 old + 0.4 new on the common nodes) instead of popping
fn relaxInto(base: u32, oldNodes: u32, newNodes: u32) {
  for (var j = 0u; j < newNodes; j++) {
    var p = traced[j];
    if (j < oldNodes) { p = 0.6 * nodes[base + j].p + 0.4 * p; }
    nodes[base + j].p = p;
  }
}

// ---- theta_b: angle from the footpoint to the nearest closed cell of the open map, less half a cell ----------
fn rowLat(y: i32, rows: i32) -> f32 { return (f32(y) + 0.5) / f32(rows) * PI - PI * 0.5; }
// no cell of row y can be nearer than the latitude difference
fn rowCanBeat(y: i32, rows: i32, lat: f32, bestCos: f32) -> bool {
  if (y < 0 || y >= rows) { return false; }
  return cos(abs(rowLat(y, rows) - lat)) > bestCos;
}
fn nearestClosedInRow(y: i32, foot: vec3f, bestCos: f32) -> f32 {
  let size = textureDimensions(openRaw);
  var best = bestCos;
  for (var x = 0u; x < size.x; x++) {
    if (textureLoad(openRaw, vec2u(x, u32(y)), 0).r > 0.5) { continue; }
    best = max(best, dot(foot, chartDir(vec2u(x, u32(y)), size)));
  }
  return best;
}
fn thetaBDeg(foot: vec3f) -> f32 {
  let rows = i32(textureDimensions(openRaw).y);
  let lat = asin(clamp(foot.y, -1.0, 1.0));
  let row0 = clamp(i32(floor((lat / PI + 0.5) * f32(rows))), 0, rows - 1);
  var best = nearestClosedInRow(row0, foot, -1.0);
  for (var k = 1; k < rows; k++) {
    let searchBelow = rowCanBeat(row0 - k, rows, lat, best);
    let searchAbove = rowCanBeat(row0 + k, rows, lat, best);
    if (!searchBelow && !searchAbove) { break; }
    if (searchBelow) { best = nearestClosedInRow(row0 - k, foot, best); }
    if (searchAbove) { best = nearestClosedInRow(row0 + k, foot, best); }
  }
  return max(0.0, acos(min(1.0, best)) * 180.0 / PI - 90.0 / f32(rows));
}

// the WSA wind (shaders/field.ts) from the string's traced expansion and footpoint
fn windOf(base: u32, s: ptr<function, StringState>) {
  (*s).vinfKms = 0.0; (*s).accelR = 1.0; (*s).expansion = 0.0; (*s).thetaBDeg = 0.0;
  if ((*s).isOpen == 0u) { return; }
  let n = (*s).traceNodes;
  var sourceSurface = nodes[base + n - 1u].p;
  for (var j = 0u; j < n; j++) {
    if (length(nodes[base + j].p) >= 2.5) { sourceSurface = nodes[base + j].p; break; }
  }
  let rs = length(sourceSurface);
  let bss = max(length(fieldAt(sourceSurface)), 1e-9);
  let fs = max(1.0, length(fieldAt((*s).foot * 1.01)) / bss / (rs * rs));
  let thb = thetaBDeg((*s).foot);
  let vinf = wsaTerminalKms(fs, thb);
  (*s).expansion = fs; (*s).thetaBDeg = thb; (*s).vinfKms = vinf;
  (*s).accelR = wsaAccelR(vinf);
}

// EUV loop physics: heating ~ B_foot / L^(2 - hL) and the RTV scaling T_apex ~ (H L^2)^(2/7), normalised so a
// quiet loop (B = 0.1 bref, half length 0.1 R) sits at 1 MK; RTV pressure gives apex density ~ T^2 / L.
// Open lines: a coronal hole's thin 1.1 MK plasma.
const HEATING_LENGTH_EXP = 0.982;
fn loopPhysics(base: u32, s: ptr<function, StringState>) {
  var lineLength = 0.0;
  for (var j = 1u; j < (*s).traceNodes; j++) { lineLength += distance(nodes[base + j].p, nodes[base + j - 1u].p); }
  (*s).lineLengthR = lineLength;
  if ((*s).isOpen == 1u) { (*s).apexTempMK = 1.1; (*s).apexDensity = 0.15; return; }
  let footB = max(footFieldRatio((*s).foot), 1e-3);
  let half = max(lineLength * 0.5, 0.005);
  let tap = clamp(pow((footB / 0.1) * pow(half / 0.1, HEATING_LENGTH_EXP), 2.0 / 7.0), 0.6, 4.0);
  (*s).apexTempMK = tap;
  (*s).apexDensity = tap * tap / (half / 0.1) * 0.5;
}

// the path: the line, and on an open string its radial continuation to 150 R (above the source surface the
// field is radial); prefix sums of arc length, the flow's travel time (parcels ride it) and the Alfven travel
// time (the coordinate the wave modes are sines of)
fn extendRadially(base: u32, traceNodes: u32) -> u32 {
  let end = nodes[base + traceNodes - 1u].p;
  let dir = normalize(end);
  var n = traceNodes;
  for (var r = length(end) * 1.15; r < PATH_MAX_R && n < MAX_PATH - 1u; r *= 1.15) { nodes[base + n].p = dir * r; n++; }
  nodes[base + n].p = dir * PATH_MAX_R;
  return n + 1u;
}
fn buildPath(base: u32, s: ptr<function, StringState>) {
  var n = (*s).traceNodes;
  if ((*s).isOpen == 1u && n >= 2u) { n = extendRadially(base, n); }
  var cum = 0.0; var flowTime = 0.0; var alfvenTime = 0.0;
  nodes[base].cumR = 0.0; nodes[base].flowTimeS = 0.0; nodes[base].alfvenXi = 0.0;
  for (var j = 1u; j < n; j++) {
    let a = nodes[base + j - 1u].p; let b = nodes[base + j].p;
    let seg = distance(a, b); let rMid = 0.5 * (length(a) + length(b));
    cum += seg;
    flowTime += seg * F.radiusKm / max(windOnString(*s, rMid), 1.0);
    alfvenTime += seg * F.radiusKm / vFast(rMid);
    nodes[base + j].cumR = cum; nodes[base + j].flowTimeS = flowTime; nodes[base + j].alfvenXi = alfvenTime;
  }
  let alfvenTotal = max(alfvenTime, 1.0);
  var maxDxiDs = 0.0;
  for (var j = 1u; j < n; j++) {
    nodes[base + j].alfvenXi /= alfvenTotal;
    let dCum = max(nodes[base + j].cumR - nodes[base + j - 1u].cumR, 1e-4);
    maxDxiDs = max(maxDxiDs, (nodes[base + j].alfvenXi - nodes[base + j - 1u].alfvenXi) / dCum);
  }
  (*s).pathNodes = select(0u, n, (*s).traceNodes > 0u);
  (*s).flowTimeS = flowTime; (*s).alfvenTimeS = alfvenTotal; (*s).pathLengthR = cum; (*s).maxDxiDs = maxDxiDs;
}

// u_phi counts the open wind strings (not the EUV loops)
fn isCountedOpen(i: u32, s: StringState) -> i32 { return select(0, 1, i < P.coronaCount && s.isSeeded == 1u && s.isOpen == 1u); }

@compute @workgroup_size(${TRACE_WORKGROUP}) fn traceStrings(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= P.count) { return; }
  let i = (P.first + id.x) % P.total;
  if (motion[i].clock.y > 0.5) { return; }   // a snapped string flies out with its eruption until it fades
  let base = i * MAX_PATH;
  var s = strings[i];
  rngState = pcg(P.seed ^ pcg(i * 0x9e3779b9u + 1u + s.generation * 0x85ebca6bu));
  let wasOpen = isCountedOpen(i, s);
  var tr: Trace;
  if (s.isSeeded == 0u) { tr = seedString(i, &s); } else { tr = traceLine(s.foot); }
  relaxInto(base, s.traceNodes, tr.nodes);
  s.traceNodes = tr.nodes;
  s.isOpen = select(0u, 1u, tr.isOpen);
  windOf(base, &s);
  loopPhysics(base, &s);
  buildPath(base, &s);
  strings[i] = s;
  let change = isCountedOpen(i, s) - wasOpen;
  if (change != 0) { atomicAdd(&openCount, change); }
}
`;

export const DRAW_SHADER = STRING_COMMON_WGSL + aiaResponseWgsl() + CORONAL_DENSITY_WGSL + /* wgsl */ `
const PI = 3.14159265;
const WHITE_LIGHT = 0u;
const PARCEL_PERIOD_S = 5400.0;   // the original's AMB.pP: a train of matter leaves the foot every 1.5 h
const EUV_HALF_WIDTH_R = 0.0025;
struct DrawParams {
  starPx: vec2f, sizePx: vec2f,
  radiusPx: f32, rotation: f32, windS: f32, hwMinR: f32,
  tint: vec3f, mode: u32,
  view: u32, firstEuv: u32, radiusKm: f32, occulterR: f32,
  euvK: f32, euvQ: f32, limbAbs: f32, a0: f32,
  stringFraction: f32, parcelContrast: f32, coronaScale: f32, euvScale: f32,
}
@group(0) @binding(0) var<uniform> D: DrawParams;
@group(0) @binding(1) var<storage, read> strings: array<StringState>;
@group(0) @binding(2) var<storage, read> nodes: array<PathNode>;
@group(0) @binding(3) var<storage, read> openCount: i32;
@group(0) @binding(4) var<storage, read> motion: array<Motion>;

struct VOut { @builtin(position) pos: vec4f, @location(0) col: vec3f, @location(1) edge: f32, @location(2) halfWidthPx: f32 }
struct Light { col: vec3f, halfWidthR: f32 }

fn rotY(v: vec3f) -> vec3f { let c = cos(D.rotation); let s = sin(D.rotation); return vec3f(c * v.x + s * v.z, v.y, -s * v.x + c * v.z); }
// a period the wrapped clock divides evenly, so phases stay continuous across its wrap (shifts the period < 0.3 %)
fn commensurate(periodS: f32) -> f32 { return WIND_WRAP_S / round(WIND_WRAP_S / periodS); }
fn trainPeriod(k: u32) -> f32 { return commensurate(PARCEL_PERIOD_S * (1.0 + 0.618 * f32(k))); }
// flow-time distance from this node to the nearest parcel of train k (released from the foot every period)
fn trainOffsetS(flowTimeS: f32, phase: f32, period: f32) -> f32 {
  let dtau = flowTimeS - fract(D.windS / period + phase) * period;
  return dtau - period * floor(dtau / period + 0.5);
}

// White light: a flux tube of electrons seen as its line-of-sight column, Thomson-weighted, x1000. Tube radius
// a0 r; together the open tubes fill phi = N a0^2 / 4 of each sphere and carry the fraction fs of the Baumbach
// electrons. Mass flux is conserved along a tube, so a fast-wind tube is thinner by the speed ratio to the slow wind.
fn whiteLight(s: StringState, q: vec3f, r: f32, flowTimeS: f32, sinPsi: f32) -> Light {
  let pxy = length(q.xy);
  let isHidden = (q.z < 0.0 && pxy < 1.0) || pxy < D.occulterR;
  let windKms = windOnString(s, r);
  let parcelWidthS = 0.6 * (0.6 + 0.08 * r) / max(windKms / D.radiusKm, 1e-7);
  var bump = 0.0; var meanBump = 0.0;
  for (var k = 0u; k < 3u; k++) {
    let period = trainPeriod(k);
    let d = trainOffsetS(flowTimeS, s.parcelPhases[k], period) / parcelWidthS;
    bump += exp(-d * d);
    meanBump += min(1.0, 1.7725 * parcelWidthS / period);
  }
  let slowKms = 330.0 * (1.0 - exp(-max(r - 1.2, 0.0) / 7.5));
  let flux = select(1.0, clamp(max(slowKms, 20.0) / windKms, 0.15, 1.5), s.isOpen == 1u);
  let phi = f32(max(openCount, 1)) * D.a0 * D.a0 / 4.0;
  let density = D.stringFraction * baumbachN(r) * flux / phi * max(0.2, 1.0 + D.parcelContrast * (bump - meanBump));
  let thomson = thomsonWeight(r, length(q.xy));
  let hw = D.a0 * r * select(0.6, 1.0, s.isOpen == 1u);
  let column = select(1000.0 * 2.0 * hw * density / sinPsi * thomson, 0.0, isHidden);
  return Light(vec3f(column), hw);
}

// EUV: optically thin, I = n^2 R(T) x chord. Closed loops are reheated in nanoflare cycles (each its own 1000-4000 s)
// to the RTV apex temperature and cool, filling as they do (n ~ T^-1/2), so loops come and go in each channel; along
// the loop T(s) = T_apex sin(pi u)^(2/7) and n falls at the apex temperature's scale height. Open lines are isothermal.
fn euvLoop(s: StringState, i: u32, along: f32, q: vec3f, r: f32, flowTimeS: f32, sinPsi: f32) -> Light {
  let flowRps = windOnString(s, r) / D.radiusKm;
  var parcel = 0.0;
  for (var k = 0u; k < 3u; k++) {
    // width relative to the traced line (the original used the full open path to 150 R here: parcels 10-50x too wide)
    let d = trainOffsetS(flowTimeS, s.parcelPhases[k], trainPeriod(k)) * flowRps / max(s.lineLengthR, 1e-3);
    parcel = max(parcel, exp(-d * d / 0.0018));
  }
  let tap = s.apexTempMK;
  var tc = tap; var cooling = 1.0; var tl = tap;
  if (s.isOpen == 0u) {
    let cycle = commensurate(1000.0 + 3000.0 * unitHash(i));
    let ph = fract(D.windS / cycle + unitHash(i ^ 0x68bc21ebu));
    tc = tap * (0.45 + 0.55 * exp(-ph / 0.35));
    cooling = sqrt(tap / tc);
    tl = max(tc * min(1.0, pow(max(sin(PI * along), 1e-4) / 0.15, 0.2857)), 0.03);   // flat but for the feet
  }
  let isEuvString = i >= D.firstEuv;
  let n = s.apexDensity * cooling * min(tc / tl, 3.0) * exp(-(r - 1.0) / (0.0675 * tc)) * (0.75 + 0.5 * parcel)
        * select(D.euvQ, 1.0, isEuvString);
  let pr = length(q.xy);
  let isBehind = q.z < 0.0 && pr < 1.0;
  // the far side seen through the spicules at the limb
  let absorbed = select(1.0, exp(-D.limbAbs * exp(-(pr - 1.0) / 0.006)), q.z < 0.0 && pr >= 1.0);
  let gain = D.euvK * select(D.coronaScale, D.euvScale, isEuvString);
  let intensity = select(gain * n * n * resp(tl, D.view) * 2.0 * EUV_HALF_WIDTH_R / sinPsi * absorbed, 0.0, isBehind);
  return Light(D.tint * intensity, EUV_HALF_WIDTH_R);
}

fn culled() -> VOut { var o: VOut; o.pos = vec4f(0.0, 0.0, 2.0, 1.0); o.col = vec3f(0.0); o.edge = 0.0; o.halfWidthPx = 1.0; return o; }

@vertex fn vs(@builtin(vertex_index) v: u32, @builtin(instance_index) i: u32) -> VOut {
  let s = strings[i];
  let n = select(s.traceNodes, s.pathNodes, D.mode == WHITE_LIGHT);
  if (n < 3u) { return culled(); }
  // two vertices per node; past the line's end every vertex collapses onto the last one (zero-area triangles)
  let isPastEnd = v / 2u >= n;
  let j = min(v / 2u, n - 1u);
  let side = select(-1.0, 1.0, (v & 1u) == 1u || isPastEnd);
  let base = i * MAX_PATH;
  let node = nodes[base + j];
  let m = motion[i];
  var nodePosition = node.p;
  var fade = 1.0;
  if (m.clock.w > 0.5) { nodePosition += waveDisplacement(m, node.alfvenXi, bumpOmega(s.alfvenTimeS), sinceS(D.windS, m.clock.z)); }
  if (m.clock.y > 0.5) {
    let flight = sinceS(D.windS, m.clock.x);
    nodePosition += m.free.xyz * m.free.w * flight;
    fade = max(0.0, 1.0 - flight / SNAP_FADE_S);
  }
  let t = rotY(nodes[base + min(j + 1u, n - 1u)].p - nodes[base + max(j, 1u) - 1u].p);
  let q = rotY(nodePosition);
  let r = length(nodePosition);
  let lenXY = max(length(t.xy), 1e-6);
  let sinPsi = max(lenXY / max(length(t), 1e-6), 0.15);   // seen along its length a tube's chord is longer
  var light: Light;
  if (D.mode == WHITE_LIGHT) { light = whiteLight(s, q, r, node.flowTimeS, sinPsi); }
  else { light = euvLoop(s, i, f32(j) / f32(n - 1u), q, r, node.flowTimeS, sinPsi); }
  light.col *= select(fade * fade, fade, D.mode == WHITE_LIGHT);   // the fading density: EUV goes as n^2
  // tubes narrower than a pixel keep their total light, spread over one
  if (light.halfWidthR < D.hwMinR) { light.col *= light.halfWidthR / D.hwMinR; light.halfWidthR = D.hwMinR; }
  let offset = q.xy + vec2f(-t.y, t.x) / lenXY * light.halfWidthR * side;
  let px = D.starPx + vec2f(offset.x, -offset.y) * D.radiusPx;
  var o: VOut;
  o.pos = vec4f(px.x / D.sizePx.x * 2.0 - 1.0, 1.0 - px.y / D.sizePx.y * 2.0, 0.0, 1.0);
  o.col = light.col;
  o.edge = side;
  o.halfWidthPx = light.halfWidthR * D.radiusPx;
  return o;
}

// white light: the chord through a uniform tube, summed linearly; EUV: a thin bright core with a faint windowed
// glow, softly saturated per strand so bright arcades keep their profile instead of filling their quads
const CORE_VARIANCE = 1.0 / 72.0;   // exp(-36 e^2): the core is 1/6 of the strip's half-width
@fragment fn fs(in: VOut) -> @location(0) vec4f {
  let e = in.edge * in.edge;
  if (D.mode == WHITE_LIGHT) { return vec4f(in.col * sqrt(max(1.0 - e, 0.0)), 0.0); }
  // the core blurred by one pixel's footprint at the same total light: a strip widened to the pixel minimum keeps
  // a sub-pixel core, which the original point-sampled into dotted lines
  let pixelEdge = 1.0 / (max(in.halfWidthPx, 1e-3) * sqrt(12.0));
  let variance = CORE_VARIANCE + pixelEdge * pixelEdge;
  let core = sqrt(CORE_VARIANCE / variance) * exp(-0.5 * e / variance);
  let win = (1.0 - e) * (1.0 - e);
  let c = in.col * (core + exp(-e * 4.0) * 0.04 * win);
  return vec4f(1.6 * (1.0 - exp(-c / 1.6)), 0.0);
}
`;

export const MOTION_SHADER = STRING_COMMON_WGSL + /* wgsl */ `
struct MotionParams {
  t: f32, dt: f32, rotation: f32, radiusKm: f32,
  total: u32, coronaCount: u32, shockCount: u32, snapCount: u32,
  push: vec4f,        // view-plane point (R), radius (R), 1 while pushing
  pushV: vec4f,       // the push velocity, star frame, R per star s
  shocks: array<vec4f, ${MAX_SHOCKS * 3}>,   // per shock: (centre, outer radius), (direction, thickness), (post-shock flow R/s)
  snaps: array<vec4f, ${MAX_SNAPS * 2}>,     // per eruption: (direction, angle rad), (speed R/s)
}
@group(0) @binding(0) var<uniform> P: MotionParams;
@group(0) @binding(1) var<storage, read_write> strings: array<StringState>;
@group(0) @binding(2) var<storage, read> nodes: array<PathNode>;
@group(0) @binding(3) var<storage, read_write> motion: array<Motion>;
@group(0) @binding(4) var<storage, read_write> openCount: atomic<i32>;

const STRAIN_SNAP = 0.9;
const SHOCK_DRAG_S = 120.0;   // a string is dragged toward the post-shock flow over ~2 min

fn rotY(v: vec3f) -> vec3f { let c = cos(P.rotation); let s = sin(P.rotation); return vec3f(c * v.x + s * v.z, v.y, -s * v.x + c * v.z); }
fn emptyMotion() -> Motion {
  var m: Motion;
  for (var k = 0; k < 4; k++) { m.c[k] = vec4f(0.0, 0.0, 0.0, -1.0); m.s[k] = vec4f(0.0); }
  m.free = vec4f(0.0); m.clock = vec4f(0.0);
  return m;
}
fn waveVelocity(m: Motion, xi: f32, omega: f32, tau: f32) -> vec3f {
  let f = exp(-tau / WAVE_DAMP_S); let co = cos(omega * tau); let sn = sin(omega * tau);
  var v = vec3f(0.0);
  for (var k = 0; k < 4; k++) {
    if (m.c[k].w < 0.0) { continue; }
    v += bumpWeight(xi, m.c[k].w) * f * omega * (m.s[k].xyz * co - m.c[k].xyz * sn);
  }
  return v;
}
fn bumpAmplitude(m: Motion, k: i32) -> f32 { return sqrt(dot(m.c[k].xyz, m.c[k].xyz) + dot(m.s[k].xyz, m.s[k].xyz)); }
// carry the bumps to now (decayed, phase advanced) so a kick lands at phase zero
fn rebase(m: ptr<function, Motion>, omega: f32) {
  if ((*m).clock.w < 0.5) {
    for (var k = 0; k < 4; k++) { (*m).c[k] = vec4f(0.0, 0.0, 0.0, -1.0); (*m).s[k] = vec4f(0.0); }
  } else {
    let tau = sinceS(P.t, (*m).clock.z);
    let f = exp(-tau / WAVE_DAMP_S); let co = cos(omega * tau); let sn = sin(omega * tau);
    for (var k = 0; k < 4; k++) {
      let c = (*m).c[k].xyz; let s = (*m).s[k].xyz;
      (*m).c[k] = vec4f(f * (c * co + s * sn), (*m).c[k].w);
      (*m).s[k] = vec4f(f * (s * co - c * sn), 0.0);
    }
  }
  (*m).clock.z = P.t; (*m).clock.w = 1.0;
}
// a velocity change dv (R/s) at a node: transverse only (a field line does not stretch along itself), into the
// bump within BUMP_XI of it, else a free slot, else the weakest
fn kick(m: ptr<function, Motion>, xi: f32, tangent: vec3f, dvIn: vec3f, omega: f32) {
  let dv = dvIn - tangent * dot(dvIn, tangent);
  var k = -1; var best = BUMP_XI;
  for (var q = 0; q < 4; q++) {
    if ((*m).c[q].w >= 0.0 && abs((*m).c[q].w - xi) < best) { best = abs((*m).c[q].w - xi); k = q; }
  }
  if (k < 0) { for (var q = 0; q < 4; q++) { if ((*m).c[q].w < 0.0) { k = q; break; } } }
  if (k < 0) {
    k = 0;
    for (var q = 1; q < 4; q++) { if (bumpAmplitude(*m, q) < bumpAmplitude(*m, k)) { k = q; } }
    (*m).c[k] = vec4f(0.0, 0.0, 0.0, -1.0); (*m).s[k] = vec4f(0.0);
  }
  if ((*m).c[k].w < 0.0) { (*m).c[k].w = xi; }
  (*m).s[k] = vec4f((*m).s[k].xyz + bumpWeight(xi, (*m).c[k].w) / omega * dv, 0.0);
}
fn snap(i: u32, s: StringState, m: ptr<function, Motion>, speedRps: f32) {
  let mid = nodes[i * MAX_PATH + s.traceNodes / 2u].p;
  *m = emptyMotion();
  (*m).free = vec4f(normalize(mid), speedRps);
  (*m).clock = vec4f(P.t, 1.0, 0.0, 0.0);
  if (i < P.coronaCount && s.isOpen == 1u) { atomicAdd(&openCount, -1); }   // the white-light share counts unsnapped wind strings
}
fn tangentAt(base: u32, j: u32, n: u32) -> vec3f {
  let d = nodes[base + min(j + 1u, n - 1u)].p - nodes[base + max(j, 1u) - 1u].p;
  return d / max(length(d), 1e-6);
}
// strain: the bumps' steepest slope bounds it, so most strings skip the node walk
fn checkStrain(i: u32, s: StringState, m: ptr<function, Motion>, omega: f32) {
  let tau = sinceS(P.t, (*m).clock.z); let f = exp(-tau / WAVE_DAMP_S);
  var amp = 0.0;
  for (var k = 0; k < 4; k++) { if ((*m).c[k].w >= 0.0) { amp += bumpAmplitude(*m, k) * f; } }
  if (amp < 1e-5) { *m = emptyMotion(); return; }   // died away: the quiet corona costs nothing
  if (amp * 0.858 / BUMP_XI * s.maxDxiDs <= STRAIN_SNAP) { return; }
  let base = i * MAX_PATH;
  var prev = waveDisplacement(*m, nodes[base].alfvenXi, omega, tau);
  var strain = 0.0;
  for (var j = 1u; j < s.pathNodes; j++) {
    let d = waveDisplacement(*m, nodes[base + j].alfvenXi, omega, tau);
    strain = max(strain, length(d - prev) / max(distance(nodes[base + j].p, nodes[base + j - 1u].p), 1e-4));
    prev = d;
  }
  if (strain <= STRAIN_SNAP) { return; }
  var vmax = 0.0;
  for (var j = 1u; j < s.pathNodes; j += 2u) { vmax = max(vmax, length(waveVelocity(*m, nodes[base + j].alfvenXi, omega, tau))); }
  snap(i, s, m, max(200.0 / P.radiusKm, vmax));
}

@compute @workgroup_size(${TRACE_WORKGROUP}) fn moveStrings(@builtin(global_invocation_id) id: vec3u) {
  let i = id.x;
  if (i >= P.total) { return; }
  let s = strings[i];
  if (s.isSeeded == 0u || s.pathNodes < 2u) { return; }
  var m = motion[i];
  if (m.clock.y > 0.5) {
    if (sinceS(P.t, m.clock.x) < SNAP_FADE_S) { return; }
    // faded: a fresh string will be seeded in its place on the next trace sweep
    motion[i] = emptyMotion();
    var cleared = s;
    cleared.isSeeded = 0u; cleared.traceNodes = 0u; cleared.pathNodes = 0u; cleared.generation = s.generation + 1u;
    strings[i] = cleared;
    return;
  }
  // an eruption snaps the closed strings rooted near it
  if (s.isOpen == 0u) {
    for (var e = 0u; e < P.snapCount; e++) {
      let a = P.snaps[e * 2u];
      if (acos(clamp(dot(s.foot, a.xyz), -1.0, 1.0)) <= a.w) { snap(i, s, &m, P.snaps[e * 2u + 1u].x); motion[i] = m; return; }
    }
  }
  let omega = bumpOmega(s.alfvenTimeS);
  let base = i * MAX_PATH;
  let drag = min(1.0, P.dt / SHOCK_DRAG_S);
  var kicked = false;
  for (var j = 1u; j < s.pathNodes; j++) {
    let node = nodes[base + j];
    var dv = vec3f(0.0);
    // a CME's shock carries the corona it passes: nodes in its shell are dragged outward from the shell's centre
    // with the post-shock flow; the shell's sunward side is where the shock fades
    for (var c = 0u; c < P.shockCount; c++) {
      let a = P.shocks[c * 3u]; let b = P.shocks[c * 3u + 1u];
      let rel = node.p - a.xyz; let dist = max(length(rel), 1e-6);
      let x = (dist - (a.w - 0.5 * b.w)) / (0.75 * b.w);
      if (abs(x) > 1.5 || dot(rel / dist, b.xyz) < -0.2) { continue; }
      let flowTarget = rel / dist * P.shocks[c * 3u + 2u].x * exp(-x * x);
      let current = select(vec3f(0.0), waveVelocity(m, node.alfvenXi, omega, sinceS(P.t, m.clock.z)), m.clock.w > 0.5);
      dv += (flowTarget - current) * drag;
    }
    // a pointer drag across the sky plane above the limb
    if (P.push.w > 0.5) {
      let q = rotY(node.p);
      let dd = length(q.xy - P.push.xy);
      let isBehindDisc = q.z < 0.0 && dot(q.xy, q.xy) < 1.0;
      if (dd <= P.push.z && !isBehindDisc) { let w = dd / (0.5 * P.push.z); dv += P.pushV.xyz * exp(-w * w); }
    }
    if (all(dv == vec3f(0.0))) { continue; }
    if (!kicked) { rebase(&m, omega); kicked = true; }
    kick(&m, node.alfvenXi, tangentAt(base, j, s.pathNodes), dv, omega);
  }
  if (m.clock.w > 0.5) { checkStrain(i, s, &m, omega); }
  motion[i] = m;
}
`;
