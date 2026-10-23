/* The WebGL2 fallback's CPU stand-ins for the GPU field maps and strings (fieldmaps.ts, strings.ts): a coarse
 * corona chart and ~400 traced field lines, all from StarField.fieldAt. A rebuild runs a few milliseconds a frame
 * whenever field.version has moved (the first one for a new field runs at once), and its results replace the old
 * ones only when it completes, so nothing half-built is ever drawn. */

import { seededRandom } from '../field';
import { direction } from '../vec';
import type { Vec3 } from '../vec';
import type { StarField } from '../field';


/** The chart: lon/lat cells, u = lon/2pi + 0.5, v = lat/pi + 0.5, row 0 south (shaders/field.ts's layout). */
export const CHART_WIDTH = 64;
export const CHART_HEIGHT = 32;
/** The chart's alpha holds the depth inside open field over this (glsl.ts chartAt decodes it). */
export const CHART_DEPTH_MAX_RAD = Math.PI / 2;
/** Closed EUV loops and open wind lines (the GPU draws 2000 + 1400 and more). */
const CLOSED_LINES = 260;
const OPEN_LINES = 140;
/** Open lines leave the trace at 9.5 R and run on radially to past the wide coronagraph's field (~22 R). */
const OPEN_REACH_R = [12, 18, 24, 30] as const;
const MAX_LINE_NODES = 400;
/** Per line vertex: star-frame xyz (R), the foot's |B| / bref, the line's seed (0..1); webgl2.ts's vertex layout. */
export const FLOATS_PER_NODE = 5;
const SEED = 0x5eed;
/** CPU time a rebuild may take per frame, ms. */
const FRAME_BUDGET_MS = 3;

const length3 = (v: Vec3): number => Math.hypot(v[0], v[1], v[2]);
const scale3 = (v: Vec3, k: number): Vec3 => [v[0] * k, v[1] * k, v[2] * k];
const dot3 = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export class FieldTrace {
  /** RGBA8: open fraction (3x3 box), surface |B| / bref / 4, streamer-belt ratio at 1.35 R * 0.5 + 0.5, depth
   *  inside open field / CHART_DEPTH_MAX_RAD: fieldmaps.ts corona .r .g .b and striation .g. */
  chart = new Uint8Array(CHART_WIDTH * CHART_HEIGHT * 4);
  /** GL_LINES vertex pairs, FLOATS_PER_NODE each; closed loops first. */
  segments = new Float32Array(0);
  closedVertexCount = 0;
  openVertexCount = 0;
  /** Bumped when a rebuild completes: the renderer re-uploads on a change. */
  serial = 0;
  private field: StarField | null = null;
  private job: Generator<void, void> | null = null;
  private jobVersion = -1;

  /** Advance (or start) the rebuild for this field. */
  update(field: StarField): void {
    if (field !== this.field) {
      this.field = field;
      this.startJob(field);
      this.run(Infinity);
      return;
    }
    if (!this.job && field.version !== this.jobVersion) this.startJob(field);
    this.run(FRAME_BUDGET_MS);
  }

  private startJob(field: StarField): void {
    this.jobVersion = field.version;
    this.job = this.rebuild(field);
  }

  private run(budgetMs: number): void {
    const until = performance.now() + budgetMs;
    while (this.job && performance.now() < until) {
      if (this.job.next().done) this.job = null;
    }
  }

  private *rebuild(field: StarField): Generator<void, void> {
    const cells = CHART_WIDTH * CHART_HEIGHT;
    const isOpenCell = new Uint8Array(cells);
    const dirs: Vec3[] = [];
    const chart = new Uint8Array(cells * 4);
    const toByte = (v: number): number => Math.round(Math.min(1, Math.max(0, v)) * 255);
    for (let y = 0; y < CHART_HEIGHT; y++) {
      for (let x = 0; x < CHART_WIDTH; x++) {
        const i = y * CHART_WIDTH + x, d = cellDirection(x, y);
        dirs.push(d);
        isOpenCell[i] = isOpen(field, d) ? 1 : 0;
        chart[i * 4 + 1] = toByte(length3(field.fieldAt(d)) / field.bref / 4);
        chart[i * 4 + 2] = toByte(beltRatio(field, d) * 0.5 + 0.5);
      }
      yield;
    }
    const closedDirs = dirs.filter((_, i) => !isOpenCell[i]);
    for (let y = 0; y < CHART_HEIGHT; y++) {
      for (let x = 0; x < CHART_WIDTH; x++) {
        const i = y * CHART_WIDTH + x;
        chart[i * 4] = toByte(boxOpen(isOpenCell, x, y) / 9);
        chart[i * 4 + 3] = toByte(isOpenCell[i] ? openDepth(dirs[i], closedDirs) / CHART_DEPTH_MAX_RAD : 0);
      }
      yield;
    }

    const random = seededRandom(SEED);
    const closed: number[] = [], open: number[] = [];
    for (let k = 0; k < CLOSED_LINES; k++) {
      const loop = closedLoop(field, random);
      if (loop) appendSegments(closed, loop.nodes, loop.weight, random());
      yield;
    }
    for (let k = 0; k < OPEN_LINES; k++) {
      const foot = openFoot(field, random), line = traceLine(field, foot);
      if (line.isOpen) appendSegments(open, extendRadially(line.nodes), 1, random());
      yield;
    }

    this.chart = chart;
    this.segments = new Float32Array([...closed, ...open]);
    this.closedVertexCount = closed.length / FLOATS_PER_NODE;
    this.openVertexCount = open.length / FLOATS_PER_NODE;
    this.serial++;
  }
}

function cellDirection(x: number, y: number): Vec3 {
  return direction(((x + 0.5) / CHART_WIDTH - 0.5) * 2 * Math.PI, ((y + 0.5) / CHART_HEIGHT - 0.5) * Math.PI);
}

/** shaders/field.ts isOpen: a coarse midpoint trace (0.05 R steps, 4 R of line) that is open if it reaches 2.5 R. */
function isOpen(field: StarField, start: Vec3): boolean {
  let p = scale3(start, 1.003);
  const up = dot3(field.fieldAt(p), p) >= 0 ? 1 : -1;
  for (let len = 0; len <= 4; len += 0.05) {
    const b1 = unit(field.fieldAt(p));
    const mid: Vec3 = [p[0] + b1[0] * up * 0.025, p[1] + b1[1] * up * 0.025, p[2] + b1[2] * up * 0.025];
    const b2 = unit(field.fieldAt(mid));
    p = [p[0] + b2[0] * up * 0.05, p[1] + b2[1] * up * 0.05, p[2] + b2[2] * up * 0.05];
    const rr = length3(p);
    if (rr >= 2.5) return true;
    if (rr < 1) return false;
  }
  return true;
}

/** shaders/field.ts coronaDir's belt: radial over total of the raw dipole sum at 1.35 R. fieldAt blends the
 *  tangential part toward radial by a (field.ts, smoothstep of (r - 1) / 1.5); dividing it back out recovers the sum. */
function beltRatio(field: StarField, d: Vec3): number {
  const r = 1.35, t = (r - 1) / 1.5, blend = t * t * (3 - 2 * t);
  const b = field.fieldAt(scale3(d, r)), radial = dot3(b, d);
  const tangential = Math.hypot(b[0] - radial * d[0], b[1] - radial * d[1], b[2] - radial * d[2]) / (1 - blend);
  return radial / Math.max(Math.hypot(radial, tangential), 1e-6);
}

/** shaders/field.ts blurOpen: open cells in the 3x3 box, longitude wrapping, latitude clamped. */
function boxOpen(isOpenCell: Uint8Array, x: number, y: number): number {
  let sum = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      sum += isOpenCell[Math.min(CHART_HEIGHT - 1, Math.max(0, y + dy)) * CHART_WIDTH + (x + dx + CHART_WIDTH) % CHART_WIDTH];
    }
  }
  return sum;
}

/** Angle (rad) to the nearest closed cell: coronal holes darken by depth (shaders/field.ts blurOpen). */
function openDepth(d: Vec3, closedDirs: Vec3[]): number {
  let nearest = -1;
  for (const c of closedDirs) nearest = Math.max(nearest, dot3(d, c));
  return Math.acos(Math.min(1, Math.max(-1, nearest)));
}

/** shaders/strings.ts traceLine: Euler along B, outward by the first step, the step growing with r; closed when it
 *  comes back below the surface, open past 9.5 R (or still above 2.4 R when it runs out). */
function traceLine(field: StarField, foot: Vec3): { nodes: Vec3[]; isOpen: boolean } {
  const nodes: Vec3[] = [foot];
  let p = scale3(foot, 1.002), up = 0;
  while (nodes.length < MAX_LINE_NODES) {
    const d = unit(field.fieldAt(p));
    if (up === 0) up = dot3(d, p) >= 0 ? 1 : -1;
    const r0 = length3(p), stepR = Math.min(0.12, Math.max(0.006, 0.05 * r0 * r0)) * up;
    p = [p[0] + d[0] * stepR, p[1] + d[1] * stepR, p[2] + d[2] * stepR];
    const r1 = length3(p);
    if (r1 < 1) { nodes.push(unit(p)); return { nodes, isOpen: false }; }
    nodes.push(p);
    if (r1 > 9.5) return { nodes, isOpen: true };
  }
  return { nodes, isOpen: length3(p) > 2.4 };
}

function randomFoot(random: () => number): Vec3 {
  const u = random() * 2 - 1, ph = random() * 2 * Math.PI, rr = Math.sqrt(Math.max(1 - u * u, 0));
  return [rr * Math.cos(ph), u, rr * Math.sin(ph)];
}

const footFieldRatio = (field: StarField, foot: Vec3): number => length3(field.fieldAt(scale3(foot, 1.01))) / Math.max(field.bref, 1e-6);

/** shaders/strings.ts euvSeed: feet drawn ~ B^1.5 whose lines close; none in 40 tries gives no loop. */
function closedLoop(field: StarField, random: () => number): { nodes: Vec3[]; weight: number } | null {
  for (let attempt = 0; attempt < 40; attempt++) {
    const foot = randomFoot(random), ratio = footFieldRatio(field, foot);
    if (random() > Math.min(1, ratio * Math.sqrt(ratio))) continue;
    const line = traceLine(field, foot);
    if (!line.isOpen) return { nodes: line.nodes, weight: Math.min(ratio, 4) };
  }
  return null;
}

/** shaders/strings.ts coronaFoot: weighted toward strong field yet spread over the sphere. */
function openFoot(field: StarField, random: () => number): Vec3 {
  let foot: Vec3 = [0, 1, 0];
  for (let attempt = 0; attempt < 6; attempt++) {
    foot = randomFoot(random);
    if (random() < Math.min(1, footFieldRatio(field, foot) * 0.6 + 0.15)) break;
  }
  return foot;
}

function extendRadially(nodes: Vec3[]): Vec3[] {
  const out = unit(nodes[nodes.length - 1]);
  return [...nodes, ...OPEN_REACH_R.map((r) => scale3(out, r))];
}

function appendSegments(into: number[], nodes: Vec3[], weight: number, seed: number): void {
  for (let j = 1; j < nodes.length; j++) into.push(...nodes[j - 1], weight, seed, ...nodes[j], weight, seed);
}

function unit(v: Vec3): Vec3 {
  return scale3(v, 1 / (length3(v) || 1));
}
