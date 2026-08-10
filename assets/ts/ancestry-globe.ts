// Ancestry globe — /misc/genes. An orthographic globe on a canvas that idles by
// spinning slowly, stops the moment a pointer is over it, and can be flicked.
//
// MOTION IS ONE NUMBER. `vel` is angular velocity in deg/sec, and every frame it
// eases toward a target: the idle drift normally, zero while you are hovering or
// dragging or the globe is off screen. A flick just sets `vel` high and lets the
// same easing carry it down. Momentum and idle-spin as separate mechanisms meant
// answering "what happens when a flick is still gliding and the idle timer
// fires", and every answer to that was a special case.
//
// PROGRESSIVE ENHANCEMENT, not a replacement. The page ships a static, labelled
// SVG map of Europe in the HTML. This module only hides it once the globe has
// actually fetched its geometry and drawn a frame — so with JS off, a failed
// fetch, or a browser without canvas, the composition is still on the page as a
// picture. Product Principle 1: content behind a runtime is content that didn't
// ship. The globe is the enhancement; the map is the content.
//
// WHY CANVAS. The flat map is SVG because it is static and wants to be in the
// DOM. This redraws every frame, and 190-odd countries as SVG paths rebuilt at
// 60fps is a lot of DOM churn for something decorative. Canvas draws the same
// thing without touching the document.
//
// GEOMETRY is fetched, not inlined: assets/geo/globe.json, ~23 KB gzipped, and
// nothing requests it until the globe is on screen. Inlining it would have put
// 64 KB of coordinates into the HTML of a page most visitors scroll past.
//
// LIMB CLIPPING is the fiddly part and the reason the code below is longer than
// "project and fill". On a sphere, half of every country list is behind the
// horizon; projecting those points anyway folds the far side onto the near one
// and produces garbage. Points are culled by the sign of cos(c), the boundary
// crossing is solved per edge, and the resulting runs are rejoined with an arc
// along the limb — without that arc the polygon closes across a chord and takes
// a bite out of whatever is at the edge of the disc.

interface GlobeUnit {
  name: string;
  rings: number[][];
}

interface GlobeData {
  units: Record<string, GlobeUnit>;
}

interface PaintEntry {
  pct: number;
  name: string;
}

const DEG = Math.PI / 180;
const IDLE_DEG_PER_SEC = 5.5;   // the resting drift
const RESUME_MS = 900;          // quiet beat after you let go, before idle creeps back
const DRAG_DEG_PER_PX = 0.35;
const DECAY_TAU = 1.35;         // seconds; larger = longer glide after a flick
const BRAKE_TAU = 0.26;         // seconds; how hard it stops when a pointer arrives
const MAX_FLICK = 260;          // deg/sec, so a violent swipe doesn't strobe
const FLICK_WINDOW_MS = 90;     // how much of the tail of the drag counts as the throw
const MAX_PX = 460;

let frame = 0;
let teardown: (() => void) | null = null;

/** "3 119 55" → usable in rgb(... / a). Read live so a theme flip is picked up. */
function token(el: Element, name: string): string {
  return getComputedStyle(el).getPropertyValue(name).trim() || '0 0 0';
}

export function initAncestryGlobe(): void {
  // Idempotent across hx-boost swaps: kill the previous loop and its listeners
  // before looking for a new host, or two rAF loops end up fighting over one
  // canvas and the spin runs at double speed.
  teardown?.();
  teardown = null;
  if (frame) cancelAnimationFrame(frame);
  frame = 0;

  const host = document.querySelector<HTMLElement>('[data-globe]');
  if (!host) return;

  const canvas = host.querySelector<HTMLCanvasElement>('canvas');
  const readout = host.querySelector<HTMLElement>('[data-globe-readout]');
  const fallback = document.querySelector<HTMLElement>('[data-globe-fallback]');
  const src = host.dataset.globe;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx || !src) return;

  const paintEl = host.querySelector<HTMLScriptElement>('[data-globe-paint]');
  let paint: Record<string, PaintEntry> = {};
  try {
    paint = JSON.parse(paintEl?.textContent || '{}') as Record<string, PaintEntry>;
  } catch {
    paint = {};
  }
  let maxPct = 0;
  for (const k of Object.keys(paint)) maxPct = Math.max(maxPct, paint[k].pct);
  if (maxPct <= 0) maxPct = 1;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let geo: GlobeData | null = null;
  let lam = 8;        // longitude at the centre of the disc — starts on Europe
  let phi = 42;       // latitude tilt
  let visible = true;
  let hovered: string | null = null;
  let hovering = false;
  let dragging = false;
  let px = 0;
  let py = 0;
  let idleAllowedAt = 0;
  let last = 0;

  // Angular velocity in deg/sec. ONE number drives both the flick and the idle
  // drift: momentum is just velocity above the resting value, and the resting
  // value is just the target it decays to. Modelling them separately meant
  // deciding what happens when a flick is still gliding and the idle timer fires,
  // and every answer to that was a special case.
  let vel = 0;
  // Tail of the drag, for working out how hard it was thrown.
  const samples: { t: number; x: number }[] = [];
  let R = 0;
  let cx = 0;
  let cy = 0;

  // ---------------------------------------------------------------- geometry

  /** Orthographic. Returns screen x/y plus cos(c); cos(c) < 0 is behind the globe. */
  function project(lon: number, lat: number): [number, number, number] {
    const s0 = Math.sin(phi * DEG);
    const c0 = Math.cos(phi * DEG);
    const dl = (lon - lam) * DEG;
    const la = lat * DEG;
    const cl = Math.cos(la);
    const sl = Math.sin(la);
    const cd = Math.cos(dl);
    const cosc = s0 * sl + c0 * cl * cd;
    const x = cl * Math.sin(dl);
    const y = c0 * sl - s0 * cl * cd;
    return [cx + R * x, cy - R * y, cosc];
  }

  function cosc(lon: number, lat: number): number {
    const s0 = Math.sin(phi * DEG);
    const c0 = Math.cos(phi * DEG);
    return s0 * Math.sin(lat * DEG) + c0 * Math.cos(lat * DEG) * Math.cos((lon - lam) * DEG);
  }

  /** Where an edge crosses the horizon. Bisection on the lon/lat segment — the
   *  geometry is simplified to ~0.35°, so segments are short enough that the
   *  difference between this and the true great-circle crossing is sub-pixel. */
  function crossing(
    lo1: number, la1: number, lo2: number, la2: number,
  ): [number, number] {
    let a = 0;
    let b = 1;
    const v1 = cosc(lo1, la1);
    for (let i = 0; i < 12; i++) {
      const m = (a + b) / 2;
      const v = cosc(lo1 + (lo2 - lo1) * m, la1 + (la2 - la1) * m);
      if (v > 0 === v1 > 0) a = m;
      else b = m;
    }
    const t = (a + b) / 2;
    return [lo1 + (lo2 - lo1) * t, la1 + (la2 - la1) * t];
  }

  function tracePath(flat: number[]): boolean {
    const n = flat.length / 2;
    const runs: number[][] = [];
    let run: number[] = [];

    for (let i = 0; i < n; i++) {
      const lo = flat[i * 2];
      const la = flat[i * 2 + 1];
      const j = (i + 1) % n;
      const lo2 = flat[j * 2];
      const la2 = flat[j * 2 + 1];
      const vis = cosc(lo, la) >= 0;
      const vis2 = cosc(lo2, la2) >= 0;

      if (vis) {
        const p = project(lo, la);
        run.push(p[0], p[1]);
      }
      if (vis !== vis2) {
        const [clo, cla] = crossing(lo, la, lo2, la2);
        const p = project(clo, cla);
        run.push(p[0], p[1]);
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

    ctx!.beginPath();
    for (let r = 0; r < runs.length; r++) {
      const cur = runs[r];
      if (cur.length < 4) continue;
      if (r === 0) ctx!.moveTo(cur[0], cur[1]);
      else ctx!.lineTo(cur[0], cur[1]);
      for (let i = 2; i < cur.length; i += 2) ctx!.lineTo(cur[i], cur[i + 1]);

      // Rejoin along the limb. The shorter of the two possible sweeps is the
      // right one whenever a country's hidden part is contiguous, which is every
      // real case here now that Antarctica is out of the data.
      const next = runs[(r + 1) % runs.length];
      if (runs.length > 1 && next.length >= 2) {
        const a0 = Math.atan2(cur[cur.length - 1] - cy, cur[cur.length - 2] - cx);
        const a1 = Math.atan2(next[1] - cy, next[0] - cx);
        let d = a1 - a0;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        ctx!.arc(cx, cy, R, a0, a1, d < 0);
      }
    }
    ctx!.closePath();
    return true;
  }

  // ------------------------------------------------------------------ render

  function resize(): void {
    const w = Math.min(host!.clientWidth || MAX_PX, MAX_PX);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas!.width = Math.round(w * dpr);
    canvas!.height = Math.round(w * dpr);
    canvas!.style.width = `${w}px`;
    canvas!.style.height = `${w}px`;
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = w / 2;
    cy = w / 2;
    R = w / 2 - 2;
  }

  function draw(): void {
    if (!geo) return;
    const accent = token(host!, '--c-accent');
    const border = token(host!, '--c-border');
    const muted = token(host!, '--c-muted');
    const bg = token(host!, '--c-bg');

    ctx!.clearRect(0, 0, cx * 2, cy * 2);

    // Ocean.
    ctx!.beginPath();
    ctx!.arc(cx, cy, R, 0, Math.PI * 2);
    ctx!.fillStyle = `rgb(${border} / 0.55)`;
    ctx!.fill();

    // Graticule, every 30°. Cheap, and it is what makes the rotation legible —
    // without it a slowly spinning sphere of flat colour barely reads as moving.
    ctx!.strokeStyle = `rgb(${muted} / 0.18)`;
    ctx!.lineWidth = 1;
    for (let lon = -180; lon < 180; lon += 30) {
      ctx!.beginPath();
      let on = false;
      for (let lat = -90; lat <= 90; lat += 3) {
        const p = project(lon, lat);
        if (p[2] < 0) { on = false; continue; }
        if (on) ctx!.lineTo(p[0], p[1]); else { ctx!.moveTo(p[0], p[1]); on = true; }
      }
      ctx!.stroke();
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      ctx!.beginPath();
      let on = false;
      for (let lon = -180; lon <= 180; lon += 3) {
        const p = project(lon, lat);
        if (p[2] < 0) { on = false; continue; }
        if (on) ctx!.lineTo(p[0], p[1]); else { ctx!.moveTo(p[0], p[1]); on = true; }
      }
      ctx!.stroke();
    }

    // Land, then the painted regions over it.
    const units = geo.units;
    ctx!.lineJoin = 'round';
    // Fill AND stroke in the same colour. Each country is simplified on its own,
    // so a shared border ends up as two slightly different lines and the ocean
    // shows through the gap — hairline scratches all over the Sahara. Stroking
    // grows every shape by half a line width, which closes the seams. The proper
    // fix is a topology-preserving format like TopoJSON where neighbours share
    // an arc; that is a much bigger change for a seam nobody can see once it is
    // covered.
    const landFill = `rgb(${muted} / 0.30)`;
    ctx!.fillStyle = landFill;
    ctx!.strokeStyle = landFill;
    ctx!.lineWidth = 1;
    for (const code of Object.keys(units)) {
      if (paint[code]) continue;
      for (const ring of units[code].rings) {
        if (tracePath(ring)) { ctx!.fill(); ctx!.stroke(); }
      }
    }
    for (const code of Object.keys(paint)) {
      const u = units[code];
      if (!u) continue;
      const a = 0.25 + 0.75 * Math.sqrt(paint[code].pct / maxPct);
      const hot = hovered === code;
      ctx!.fillStyle = `rgb(${accent} / ${hot ? 1 : a})`;
      ctx!.strokeStyle = `rgb(${bg} / 0.9)`;
      ctx!.lineWidth = 0.8;
      for (const ring of u.rings) {
        if (tracePath(ring)) { ctx!.fill(); ctx!.stroke(); }
      }
    }

    // Limb, to sit the disc on the page rather than let it dissolve into it.
    ctx!.beginPath();
    ctx!.arc(cx, cy, R, 0, Math.PI * 2);
    ctx!.strokeStyle = `rgb(${muted} / 0.45)`;
    ctx!.lineWidth = 1.2;
    ctx!.stroke();
  }

  function tick(now: number): void {
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;

    // While dragging, the pointer owns the rotation outright and velocity is only
    // being sampled. Otherwise velocity eases toward whatever it should be
    // resting at — the idle drift, or a dead stop if you are hovering, off
    // screen, or have asked for reduced motion.
    if (!dragging && dt > 0) {
      const wantIdle = !hovering && visible && !reduce && now >= idleAllowedAt;
      const target = wantIdle ? IDLE_DEG_PER_SEC : 0;

      // Two time constants, because gliding and stopping are different gestures.
      // A flick should coast — that is the whole point of throwing it — so
      // anything above idle speed decays slowly, even if the cursor is resting on
      // the globe. Once it is down to a drift, a pointer overhead brakes it
      // properly. One shared constant made hovering feel broken: the globe crept
      // on for about ten seconds, technically decaying, visibly still moving.
      const fast = Math.abs(vel) > IDLE_DEG_PER_SEC;
      const tau = fast ? DECAY_TAU : (target === 0 ? BRAKE_TAU : DECAY_TAU);
      vel += (target - vel) * (1 - Math.exp(-dt / tau));

      // Snap to a real stop. An exponential never arrives, and a globe rotating
      // at a hundredth of a degree per second is a globe that will not sit still
      // under someone trying to read a country off it.
      if (target === 0 && Math.abs(vel) < 0.03) vel = 0;

      lam = ((lam + vel * dt + 540) % 360) - 180;
    }

    draw();
    frame = requestAnimationFrame(tick);
  }

  // ------------------------------------------------------------- interaction

  /** Inverse orthographic, then point-in-polygon in lon/lat. Cheaper and more
   *  reliable than re-issuing every path for isPointInPath, and it gives the
   *  country code directly. */
  function hit(mx: number, my: number): string | null {
    if (!geo) return null;
    const x = (mx - cx) / R;
    const y = (cy - my) / R;
    const rho = Math.hypot(x, y);
    if (rho > 1) return null;
    const c = Math.asin(Math.min(1, rho));
    const s0 = Math.sin(phi * DEG);
    const c0 = Math.cos(phi * DEG);
    const sc = Math.sin(c);
    const cc = Math.cos(c);
    const lat = Math.asin(rho === 0 ? s0 : cc * s0 + (y * sc * c0) / rho) / DEG;
    const lon = lam + Math.atan2(x * sc, rho * cc * c0 - y * sc * s0) / DEG;

    for (const code of Object.keys(paint)) {
      const u = geo.units[code];
      if (!u) continue;
      for (const ring of u.rings) {
        let inside = false;
        const n = ring.length / 2;
        for (let i = 0, j = n - 1; i < n; j = i++) {
          const xi = ring[i * 2];
          const yi = ring[i * 2 + 1];
          const xj = ring[j * 2];
          const yj = ring[j * 2 + 1];
          if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
            inside = !inside;
          }
        }
        if (inside) return code;
      }
    }
    return null;
  }

  function setReadout(code: string | null): void {
    if (!readout) return;
    const e = code ? paint[code] : null;
    readout.textContent = e ? `${e.name} · ${e.pct.toFixed(1)}%` : '';
  }

  const onMove = (e: PointerEvent): void => {
    const r = canvas.getBoundingClientRect();
    hovering = true;
    if (dragging) {
      lam = ((lam - (e.clientX - px) * DRAG_DEG_PER_PX + 540) % 360) - 180;
      // Latitude is positional only — no momentum. It is clamped at ±80°, so a
      // vertical throw would just slam into the stop and sit there.
      phi = Math.max(-80, Math.min(80, phi + (e.clientY - py) * DRAG_DEG_PER_PX));
      px = e.clientX;
      py = e.clientY;
      samples.push({ t: e.timeStamp, x: e.clientX });
      if (samples.length > 8) samples.shift();
      return;
    }
    const h = hit(e.clientX - r.left, e.clientY - r.top);
    if (h !== hovered) {
      hovered = h;
      setReadout(h);
      canvas.style.cursor = h ? 'pointer' : 'grab';
    }
  };

  const onDown = (e: PointerEvent): void => {
    dragging = true;
    hovering = true;
    px = e.clientX;
    py = e.clientY;
    vel = 0;
    samples.length = 0;
    samples.push({ t: e.timeStamp, x: e.clientX });
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
  };

  const onUp = (e: PointerEvent): void => {
    if (dragging) {
      // Throw speed from the TAIL of the gesture, not the whole of it. Measuring
      // the average across the drag makes a slow reposition that ends in a snap
      // feel dead, and a fast sweep that ends parked feel like it was flung.
      const now = e.timeStamp;
      let ref = samples[0];
      for (const sm of samples) {
        if (now - sm.t <= FLICK_WINDOW_MS) { ref = sm; break; }
      }
      const dtms = now - ref.t;
      if (dtms > 8) {
        const v = (-(e.clientX - ref.x) * DRAG_DEG_PER_PX * 1000) / dtms;
        vel = Math.max(-MAX_FLICK, Math.min(MAX_FLICK, v));
      }
      samples.length = 0;
    }
    dragging = false;
    idleAllowedAt = e.timeStamp + RESUME_MS;
    try { canvas.releasePointerCapture(e.pointerId); } catch { /* already released */ }

    // Pointer capture keeps events on the canvas even when the cursor has left
    // it, so a drag that ends outside would otherwise leave `hovering` stuck true
    // and the globe frozen with nothing on it.
    const r = canvas.getBoundingClientRect();
    hovering = e.clientX >= r.left && e.clientX <= r.right
      && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!hovering) { hovered = null; setReadout(null); }
    canvas.style.cursor = hovered ? 'pointer' : 'grab';
  };

  const onEnter = (): void => { hovering = true; };
  const onLeave = (): void => {
    if (dragging) return;      // capture is still on; the release handler decides
    hovering = false;
    hovered = null;
    setReadout(null);
  };
  const onResize = (): void => resize();
  const onVis = (): void => { visible = !document.hidden; };

  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('pointerenter', onEnter);
  canvas.addEventListener('pointerleave', onLeave);
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVis);

  // Don't spin a globe nobody is looking at.
  let io: IntersectionObserver | null = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver((entries) => {
      for (const en of entries) visible = en.isIntersecting;
    }, { threshold: 0.05 });
    io.observe(host);
  }

  teardown = (): void => {
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('pointercancel', onUp);
    canvas.removeEventListener('pointerenter', onEnter);
    canvas.removeEventListener('pointerleave', onLeave);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVis);
    io?.disconnect();
  };

  // The swap happens only after real geometry is in hand and one frame is on the
  // canvas — a globe that fails to load must not take the map down with it.
  fetch(src)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((d: GlobeData) => {
      geo = d;
      resize();
      draw();
      host.hidden = false;
      if (fallback) fallback.hidden = true;
      canvas.style.cursor = 'grab';
      frame = requestAnimationFrame(tick);
    })
    .catch(() => {
      /* Static SVG map stays exactly where it is. */
    });
}
