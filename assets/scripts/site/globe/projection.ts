// Orthographic projection and limb clipping — the maths half of the globe, with
// no knowledge of canvases, pointers, or what is being drawn.
//
// Extracted from what was ancestry-globe.ts so /misc/genes and /misc/dagea can
// share it. The two pages draw different worlds — one real and one hand-drawn —
// but a sphere is a sphere, and the fiddly part below was never about ancestry.
//
// LIMB CLIPPING is that fiddly part, and the reason this file is longer than
// "project and fill". On a sphere, half of every ring is behind the horizon;
// projecting those points anyway folds the far side onto the near one and
// produces garbage. Points are culled by the sign of cos(c), the boundary
// crossing is solved per edge, and the resulting runs are rejoined with an arc
// along the limb — without that arc the polygon closes across a chord and takes
// a bite out of whatever is at the edge of the disc.

const DEG = Math.PI / 180;

/** Wrap a longitude into [-180, 180). Inverting a click near the antimeridian
 *  hands back values outside that range, and the ring coordinates it is about to
 *  be compared against are all inside it. */
function wrapLon(lon: number): number {
  return ((lon + 540) % 360) - 180;
}

/**
 * An orthographic view of a sphere: which longitude and latitude sit at the
 * centre of the disc, and where the disc is on the canvas. Mutable on purpose —
 * the render loop moves `lam` every frame and expects the next projection to
 * follow without rebuilding anything.
 */
export class Orthographic {
  /** Longitude at the centre of the disc, degrees. */
  lam = 0;
  /** Latitude at the centre of the disc, degrees. */
  phi = 0;
  /** Disc radius, CSS pixels. */
  R = 0;
  /** Disc centre, CSS pixels. */
  cx = 0;
  cy = 0;

  /** Screen x/y plus cos(c). cos(c) < 0 is behind the globe. */
  project(lon: number, lat: number): [number, number, number] {
    const s0 = Math.sin(this.phi * DEG);
    const c0 = Math.cos(this.phi * DEG);
    const dl = (lon - this.lam) * DEG;
    const la = lat * DEG;
    const cl = Math.cos(la);
    const sl = Math.sin(la);
    const cd = Math.cos(dl);
    const cosc = s0 * sl + c0 * cl * cd;
    const x = cl * Math.sin(dl);
    const y = c0 * sl - s0 * cl * cd;
    return [this.cx + this.R * x, this.cy - this.R * y, cosc];
  }

  /** cos(c) alone — the visibility test, without paying for the screen position. */
  cosc(lon: number, lat: number): number {
    const s0 = Math.sin(this.phi * DEG);
    const c0 = Math.cos(this.phi * DEG);
    return s0 * Math.sin(lat * DEG)
      + c0 * Math.cos(lat * DEG) * Math.cos((lon - this.lam) * DEG);
  }

  /** Where an edge crosses the horizon. Bisection on the lon/lat segment — the
   *  geometry both callers ship is simplified to a fraction of a degree, so
   *  segments are short enough that the difference between this and the true
   *  great-circle crossing is sub-pixel. */
  crossing(lo1: number, la1: number, lo2: number, la2: number): [number, number] {
    let a = 0;
    let b = 1;
    const v1 = this.cosc(lo1, la1);
    for (let i = 0; i < 12; i++) {
      const m = (a + b) / 2;
      const v = this.cosc(lo1 + (lo2 - lo1) * m, la1 + (la2 - la1) * m);
      if (v > 0 === v1 > 0) a = m;
      else b = m;
    }
    const t = (a + b) / 2;
    return [lo1 + (lo2 - lo1) * t, la1 + (la2 - la1) * t];
  }

  /** Inverse orthographic: canvas point back to lon/lat, or null if the point is
   *  off the disc entirely. Used for hit testing, which then runs point-in-ring
   *  in lon/lat space — cheaper and more reliable than re-issuing every path for
   *  isPointInPath, and it hands back the code directly. */
  invert(mx: number, my: number): [number, number] | null {
    const x = (mx - this.cx) / this.R;
    const y = (this.cy - my) / this.R;
    const rho = Math.hypot(x, y);
    if (rho > 1) return null;
    const c = Math.asin(Math.min(1, rho));
    const s0 = Math.sin(this.phi * DEG);
    const c0 = Math.cos(this.phi * DEG);
    const sc = Math.sin(c);
    const cc = Math.cos(c);
    const lat = Math.asin(rho === 0 ? s0 : cc * s0 + (y * sc * c0) / rho) / DEG;
    const lon = this.lam + Math.atan2(x * sc, rho * cc * c0 - y * sc * s0) / DEG;
    return [wrapLon(lon), lat];
  }
}

/**
 * Lay one ring down as a canvas path, clipped to the visible hemisphere and
 * rejoined along the limb. Returns false when none of the ring is on screen, so
 * the caller can skip the fill and stroke.
 *
 * `flat` is [lon, lat, lon, lat, ...] — one array rather than an array of pairs
 * because this is walked tens of thousands of times a second and pairs are
 * tens of thousands of objects a second.
 */
export function traceRing(
  ctx: CanvasRenderingContext2D,
  p: Orthographic,
  flat: number[],
): boolean {
  const n = flat.length / 2;
  const runs: number[][] = [];
  let run: number[] = [];

  for (let i = 0; i < n; i++) {
    const lo = flat[i * 2];
    const la = flat[i * 2 + 1];
    const j = (i + 1) % n;
    const lo2 = flat[j * 2];
    const la2 = flat[j * 2 + 1];
    const vis = p.cosc(lo, la) >= 0;
    const vis2 = p.cosc(lo2, la2) >= 0;

    if (vis) {
      const pt = p.project(lo, la);
      run.push(pt[0], pt[1]);
    }
    if (vis !== vis2) {
      const [clo, cla] = p.crossing(lo, la, lo2, la2);
      const pt = p.project(clo, cla);
      run.push(pt[0], pt[1]);
      if (vis) {
        runs.push(run);
        run = [];
      }
    }
  }
  if (run.length) {
    if (runs.length) runs[0] = run.concat(runs[0]);
    else runs.push(run);
  }
  if (!runs.length) return false;

  ctx.beginPath();
  for (let r = 0; r < runs.length; r++) {
    const cur = runs[r];
    if (cur.length < 4) continue;
    if (r === 0) ctx.moveTo(cur[0], cur[1]);
    else ctx.lineTo(cur[0], cur[1]);
    for (let i = 2; i < cur.length; i += 2) ctx.lineTo(cur[i], cur[i + 1]);

    // Rejoin along the limb. The shorter of the two possible sweeps is the right
    // one whenever a shape's hidden part is contiguous, which is every real case
    // in either data set.
    const next = runs[(r + 1) % runs.length];
    if (runs.length > 1 && next.length >= 2) {
      const a0 = Math.atan2(cur[cur.length - 1] - p.cy, cur[cur.length - 2] - p.cx);
      const a1 = Math.atan2(next[1] - p.cy, next[0] - p.cx);
      let d = a1 - a0;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      ctx.arc(p.cx, p.cy, p.R, a0, a1, d < 0);
    }
  }
  ctx.closePath();
  return true;
}

/**
 * Lay an open polyline down as canvas paths, clipped to the visible hemisphere.
 *
 * Simpler than the ring case above and worth keeping separate rather than
 * pretending a river is a very thin country. A ring that leaves the disc has to
 * come back along the limb or the fill takes a bite out of the globe; a line
 * just stops at the horizon and starts again on the far side of it. Trying to
 * share one routine between them means every second branch asking "am I closed?".
 *
 * Each visible run is stroked separately, so a range that disappears round the
 * back returns as two strokes rather than one with a chord across the disc.
 */
export function traceLine(
  ctx: CanvasRenderingContext2D,
  p: Orthographic,
  flat: number[],
): void {
  const n = flat.length / 2;
  if (n < 2) return;
  let drawing = false;

  for (let i = 0; i < n - 1; i++) {
    const lo = flat[i * 2];
    const la = flat[i * 2 + 1];
    const lo2 = flat[(i + 1) * 2];
    const la2 = flat[(i + 1) * 2 + 1];
    const vis = p.cosc(lo, la) >= 0;
    const vis2 = p.cosc(lo2, la2) >= 0;

    if (vis) {
      const a = p.project(lo, la);
      if (!drawing) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); drawing = true; }
      else ctx.lineTo(a[0], a[1]);
    }
    if (vis !== vis2) {
      const [clo, cla] = p.crossing(lo, la, lo2, la2);
      const c = p.project(clo, cla);
      if (vis) {
        ctx.lineTo(c[0], c[1]);
        ctx.stroke();
        drawing = false;
      } else {
        ctx.beginPath();
        ctx.moveTo(c[0], c[1]);
        drawing = true;
      }
    }
  }
  if (drawing) {
    const last = p.project(flat[(n - 1) * 2], flat[(n - 1) * 2 + 1]);
    ctx.lineTo(last[0], last[1]);
    ctx.stroke();
  }
}

/** Even-odd crossing test in lon/lat space. Rings that straddle the antimeridian
 *  would need splitting first; neither data set has one. */
export function pointInRing(flat: number[], lon: number, lat: number): boolean {
  let inside = false;
  const n = flat.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = flat[i * 2];
    const yi = flat[i * 2 + 1];
    const xj = flat[j * 2];
    const yj = flat[j * 2 + 1];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}
