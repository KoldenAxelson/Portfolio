// Globe engine — the half of the globe that is not maths: the canvas, the motion,
// the pointer, and the fetch. Two pages mount one of these.
//
//   /misc/genes    — Earth, regions shaded by share of an ancestry composition.
//   /misc/dagea  — Dagea, a hand-drawn world, regions highlighted on hover.
//
// WHAT THE CALLER OWNS is colour and meaning. `styleFor` is asked, per unit per
// frame, how that unit should look right now; it is handed the hover and
// selection state and a live token reader, so a theme flip is picked up without
// anything being invalidated. Everything else — the ocean disc, the graticule,
// the limb, the spin, the drag, the flick, the hit test — is in here and is
// identical on both pages, which is the entire reason this file exists.
//
// MOTION IS ONE NUMBER. `vel` is angular velocity in deg/sec, and every frame it
// eases toward a target: the idle drift normally, zero while a pointer is over
// the globe or it is off screen. A flick just sets `vel` high and lets the same
// easing carry it down. Momentum and idle-spin as separate mechanisms meant
// answering "what happens when a flick is still gliding and the idle timer
// fires", and every answer to that was a special case.
//
// PROGRESSIVE ENHANCEMENT, not a replacement. Both callers ship a static SVG map
// in the HTML. The swap to the globe happens only after geometry is in hand and
// one frame is on the canvas, so with JS off, a failed fetch, or no canvas, what
// stays on the page is the picture. Product Principle 1: content behind a runtime
// is content that didn't ship.
//
// WHY CANVAS. This redraws every frame, and a couple of hundred shapes as SVG
// paths rebuilt at 60fps is a lot of DOM churn for something decorative.

import { Orthographic, pointInRing, traceLine, traceRing } from './projection';

export interface GlobeUnit {
  name: string;
  rings: number[][];
  /** "lake" on a body of inland water, which is drawn as water over the land it
   *  sits in rather than as another country. */
  kind?: string;
  /** Set on a subunit — the code of the unit it sits inside. An adapter tells
   *  the two apart by asking for this rather than by being handed a flag,
   *  because "which region owns you" is the thing it actually wants to know. */
  parent?: string;
}

export interface GlobeLine {
  id: string;
  name: string;
  /** One open polyline per run of [lon, lat, ...] — not rings, and more than one
   *  because a line clipped to a coastline comes back in pieces. A river that
   *  crosses an inlet is one river with a gap in it, not two rivers. */
  parts: number[][];
}

export interface GlobeData {
  units: Record<string, GlobeUnit>;
  /** Sub-regions, drawn through the same styleFor as units. */
  subunits?: Record<string, GlobeUnit>;
  /** Inland water, drawn through the same styleFor and carrying kind: "lake". */
  lakes?: Record<string, GlobeUnit>;
  /** Named groups of open polylines: rivers, mountain ranges, roads. */
  lines?: Record<string, GlobeLine[]>;
}

/** Reads a CSS custom property off the host, live. Returns "R G B" channels,
 *  usable inside `rgb(... / a)`. */
export type TokenReader = (name: string) => string;

export interface FrameState {
  hovered: string | null;
  selected: string | null;
  token: TokenReader;
}

export interface LineStyle {
  stroke: string;
  lineWidth?: number;
  /** Canvas dash pattern, in CSS pixels. */
  dash?: number[];
  layer?: number;
}

export interface UnitStyle {
  fill: string;
  stroke?: string;
  lineWidth?: number;
  /** Higher layers draw later. Use it to keep painted regions on top of plain
   *  land — every shape is simplified on its own, so a shared border is two
   *  slightly different lines and whatever draws last owns the seam. */
  layer?: number;
}

export interface GlobeOptions {
  host: HTMLElement;
  canvas: HTMLCanvasElement;
  /** URL of the geometry JSON. Nothing is requested until this is called. */
  src: string;
  /** Hidden once the first frame is on the canvas. */
  fallback?: HTMLElement | null;
  /** Where the disc is centred at rest. */
  start?: { lon: number; lat: number };
  /** Magnification to fly to when something is selected. 1 disables it. */
  zoomOnSelect?: number;
  /** Per unit, per frame. Return null to leave the unit undrawn. Subunits come
   *  through here too, and carry `parent`. */
  styleFor(code: string, unit: GlobeUnit, state: FrameState): UnitStyle | null;
  /** Per polyline, per frame. `group` is the key it arrived under — "rivers",
   *  "ranges". Return null to leave it undrawn. */
  styleForLine?(group: string, line: GlobeLine, state: FrameState): LineStyle | null;
  /** Which units answer the pointer. Default: none of them, so a globe with no
   *  interest in being clicked pays nothing for hit testing. */
  selectable?(code: string, unit: GlobeUnit): boolean;
  onHover?(code: string | null, unit: GlobeUnit | null): void;
  /** Omit and clicks do nothing — `selected` stays null forever. */
  onSelect?(code: string | null, unit: GlobeUnit | null): void;
  onReady?(data: GlobeData): void;
}

export interface GlobeHandle {
  destroy(): void;
  /** Set the selection from outside — a list of regions beside the globe, say. */
  select(code: string | null): void;
}

const IDLE_DEG_PER_SEC = 5.5;   // the resting drift
const RESUME_MS = 900;          // quiet beat after you let go, before idle creeps back
const DRAG_DEG_PER_PX = 0.35;
const DECAY_TAU = 1.35;         // seconds; larger = longer glide after a flick
const BRAKE_TAU = 0.26;         // seconds; how hard it stops when a pointer arrives
const MAX_FLICK = 260;          // deg/sec, so a violent swipe doesn't strobe
const FLICK_WINDOW_MS = 90;     // how much of the tail of the drag counts as the throw
const CLICK_SLOP_PX = 5;        // further than this and the gesture was a drag
const CLICK_MS = 500;
const MAX_PX = 460;             // widest the canvas is allowed to get, CSS px
type Wash = [token: string, alpha: number];
const OCEAN: Wash = ['--c-border', 0.55];
const GRATICULE: Wash = ['--c-muted', 0.18];
const LIMB: Wash = ['--c-muted', 0.45];
const GRATICULE_STEP = 30;      // degrees between graticule lines
// Degrees between samples along one graticule line. Fine enough that the curve
// reads smooth on a 460px disc, coarse enough that a whole graticule is about
// two thousand projections rather than twenty.
const GRATICULE_SAMPLE = 3;
const FLY_TAU = 0.32;           // seconds; how quickly a selection is flown to
// Reused rather than allocated per stroke — draw() runs sixty times a second.
const EMPTY_DASH: number[] = [];

/** Ordinary land: no border against its neighbours, because every shape is
 *  simplified on its own and a contrasting stroke would draw the disagreement. */
export function plainLand(token: TokenReader): UnitStyle {
  const land = `rgb(${token('--c-muted')} / 0.30)`;
  return { fill: land, stroke: land, lineWidth: 1, layer: 0 };
}

/** A whole region picked out in the accent, outlined in page colour so it reads
 *  as lifted off the map rather than painted onto it. */
export function litRegion(token: TokenReader, alpha: number): UnitStyle {
  return {
    fill: `rgb(${token('--c-accent')} / ${alpha})`,
    stroke: `rgb(${token('--c-bg')} / 0.9)`,
    lineWidth: 0.8,
    layer: 1,
  };
}

export function createGlobe(opts: GlobeOptions): GlobeHandle {
  const { host, canvas, src } = opts;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { destroy: () => {}, select: () => {} };

  const selectable = opts.selectable ?? (() => false);

  // Rebuilt every frame in draw(), because a frame cannot straddle a theme flip
  // but a cached-forever reader would never notice one. Within a frame the same
  // three or four properties are asked for once per shape, and getComputedStyle
  // forces a style resolve every time — on two hundred shapes at sixty frames a
  // second that is the most expensive thing on the page by a wide margin.
  // Assigned by draw() as its first statement, and read only from inside draw()
  // — by wash() and by the styleFor callbacks, both of which run downstream of
  // that assignment. Left undeclared rather than given a placeholder so that
  // anyone who later calls wash() outside a frame gets a loud failure instead of
  // silently painting everything black.
  let token: TokenReader;
  const wash = ([name, alpha]: Wash): string => `rgb(${token(name)} / ${alpha})`;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const view = new Orthographic();
  view.lam = opts.start?.lon ?? 0;
  view.phi = opts.start?.lat ?? 0;

  let geo: GlobeData | null = null;
  let shapes: Record<string, GlobeUnit> = {};
  /** Lakes, then subunits, then units — so a duchy drawn on top of its continent
   *  is also the thing the pointer finds first. */
  let codes: string[] = [];
  let lineGroups: [string, GlobeLine][] = [];
  let frame = 0;
  // TWO flags, not one. They used to share a single `visible`, and the two
  // writers clobbered each other: scroll the globe off screen (the observer
  // stops it), switch tabs and come back, and the visibility handler set the
  // flag true again — while the observer stayed quiet, because the intersection
  // had not changed. The globe then span on, off screen, forever.
  let tabVisible = true;
  let onScreen = true;
  let hovered: string | null = null;
  let selected: string | null = null;
  let hovering = false;
  let dragging = false;
  let px = 0;
  let py = 0;
  let downX = 0;
  let downY = 0;
  let downAt = 0;
  let idleAllowedAt = 0;
  let last = 0;
  let vel = 0;
  const samples: { t: number; x: number }[] = [];

  // Selection flies the globe to what was picked and magnifies it. `R0` is the
  // radius the canvas can hold; `zoom` scales it, and the disc is allowed to
  // overflow the canvas because that is what being zoomed in looks like.
  const zoomOnSelect = opts.zoomOnSelect ?? 1;
  let R0 = 0;
  let zoom = 1;
  let zoomTarget = 1;
  // Where the flight is heading, or null when nobody is flying — which is both
  // "we have arrived" and "the reader grabbed it mid-flight and it is theirs now".
  let fly: { lon: number; lat: number } | null = null;
  const centres: Record<string, [number, number]> = {};

  // ------------------------------------------------------------------ render

  function resize(): void {
    const w = Math.min(host.clientWidth || MAX_PX, MAX_PX);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(w * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${w}px`;
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    view.cx = w / 2;
    view.cy = w / 2;
    R0 = w / 2 - 2;
    view.R = R0 * zoom;
  }

  /** One meridian or parallel, broken wherever it passes behind the globe. */
  function strand(pointAt: (t: number) => [number, number, number],
                  from: number, to: number): void {
    ctx!.beginPath();
    let drawing = false;
    for (let t = from; t <= to; t += GRATICULE_SAMPLE) {
      const p = pointAt(t);
      if (p[2] < 0) { drawing = false; continue; }
      if (drawing) ctx!.lineTo(p[0], p[1]);
      else { ctx!.moveTo(p[0], p[1]); drawing = true; }
    }
    ctx!.stroke();
  }

  function drawGraticule(): void {
    ctx!.strokeStyle = wash(GRATICULE);
    ctx!.lineWidth = 1;
    for (let lon = -180; lon < 180; lon += GRATICULE_STEP) {
      strand((lat) => view.project(lon, lat), -90, 90);
    }
    for (let lat = -90 + GRATICULE_STEP; lat < 90; lat += GRATICULE_STEP) {
      strand((lon) => view.project(lon, lat), -180, 180);
    }
  }

  function paintUnit(unit: GlobeUnit, style: UnitStyle): void {
    ctx!.setLineDash(EMPTY_DASH);
    ctx!.fillStyle = style.fill;
    ctx!.strokeStyle = style.stroke ?? style.fill;
    ctx!.lineWidth = style.lineWidth ?? 1;
    ctx!.lineCap = 'butt';
    for (const ring of unit.rings) {
      if (traceRing(ctx!, view, ring)) { ctx!.fill(); ctx!.stroke(); }
    }
  }

  function paintLine(line: GlobeLine, style: LineStyle): void {
    ctx!.setLineDash(style.dash ?? EMPTY_DASH);
    ctx!.strokeStyle = style.stroke;
    ctx!.lineWidth = style.lineWidth ?? 1;
    ctx!.lineCap = 'round';
    for (const part of line.parts) traceLine(ctx!, view, part);
  }

  function draw(): void {
    if (!geo) return;

    const resolved = new Map<string, string>();
    token = (name) => {
      let value = resolved.get(name);
      if (value === undefined) {
        value = getComputedStyle(host).getPropertyValue(name).trim() || '0 0 0';
        resolved.set(name, value);
      }
      return value;
    };
    const state: FrameState = { hovered, selected, token };

    ctx!.clearRect(0, 0, view.cx * 2, view.cy * 2);

    ctx!.beginPath();
    ctx!.arc(view.cx, view.cy, view.R, 0, Math.PI * 2);
    ctx!.fillStyle = wash(OCEAN);
    ctx!.fill();

    drawGraticule();

    // Bucket by layer, then draw ascending. Fill AND stroke in the same colour
    // for plain land: each shape is simplified on its own, so a shared border
    // ends up as two slightly different lines and the ocean shows through the
    // gap. Stroking grows every shape by half a line width, which closes the
    // seams. The proper fix is a topology-preserving format where neighbours
    // share an arc; that is a much bigger change for a seam nobody can see once
    // it is covered.
    ctx!.lineJoin = 'round';
    const layers = new Map<number, (() => void)[]>();
    const at = (n: number, paint: () => void): void => {
      const bucket = layers.get(n);
      if (bucket) bucket.push(paint);
      else layers.set(n, [paint]);
    };

    for (const code of codes) {
      const unit = shapes[code];
      const style = opts.styleFor(code, unit, state);
      if (!style) continue;
      at(style.layer ?? 0, () => paintUnit(unit, style));
    }

    for (const [group, line] of lineGroups) {
      const style = opts.styleForLine?.(group, line, state);
      if (!style) continue;
      at(style.layer ?? 2, () => paintLine(line, style));
    }

    for (const n of [...layers.keys()].sort((a, b) => a - b)) {
      for (const paint of layers.get(n)!) paint();
    }
    ctx!.setLineDash(EMPTY_DASH);

    // Limb, to sit the disc on the page rather than let it dissolve into it.
    ctx!.beginPath();
    ctx!.arc(view.cx, view.cy, view.R, 0, Math.PI * 2);
    ctx!.strokeStyle = wash(LIMB);
    ctx!.lineWidth = 1.2;
    ctx!.stroke();
  }

  function tick(now: number): void {
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;

    // Ease the magnification, and the heading if a flight is in progress. Both
    // use the same exponential the spin does, so a selection feels like the same
    // object moving rather than a cut to a new view.
    if (dt > 0) {
      const k = 1 - Math.exp(-dt / FLY_TAU);
      zoom += (zoomTarget - zoom) * k;
      if (Math.abs(zoomTarget - zoom) < 0.002) zoom = zoomTarget;
      view.R = R0 * zoom;
      if (fly) {
        let d = fly.lon - view.lam;
        while (d > 180) d -= 360;
        while (d < -180) d += 360;
        view.lam = ((view.lam + d * k + 540) % 360) - 180;
        view.phi += (fly.lat - view.phi) * k;
        if (Math.abs(d) < 0.3 && Math.abs(fly.lat - view.phi) < 0.3) fly = null;
      }
    }

    // While dragging, the pointer owns the rotation outright and velocity is only
    // being sampled. Otherwise velocity eases toward whatever it should be
    // resting at — the idle drift, or a dead stop if a pointer is over it, it is
    // off screen, or reduced motion is asked for.
    if (!dragging && dt > 0) {
      // A selected globe holds still. The reader picked something to look at and
      // a slow drift away from it is the opposite of what they asked for.
      const wantIdle = !hovering && tabVisible && onScreen && !reduce
        && !selected && !fly && now >= idleAllowedAt;
      const target = wantIdle ? IDLE_DEG_PER_SEC : 0;

      // Two time constants, because gliding and stopping are different gestures.
      // A flick should coast — that is the whole point of throwing it — so
      // anything above idle speed decays slowly, even if the cursor is resting on
      // the globe. Once it is down to a drift, a pointer overhead brakes it
      // properly. One shared constant made hovering feel broken: the globe crept
      // on for about ten seconds, technically decaying, visibly still moving.
      const fast = Math.abs(vel) > IDLE_DEG_PER_SEC;
      const tau = fast || target !== 0 ? DECAY_TAU : BRAKE_TAU;
      vel += (target - vel) * (1 - Math.exp(-dt / tau));

      // Snap to a real stop. An exponential never arrives, and a globe rotating
      // at a hundredth of a degree per second is a globe that will not sit still
      // under someone trying to read a place off it.
      if (target === 0 && Math.abs(vel) < 0.03) vel = 0;

      view.lam = ((view.lam + vel * dt + 540) % 360) - 180;
    }

    draw();
    frame = requestAnimationFrame(tick);
  }

  // ------------------------------------------------------------- interaction

  function hit(mx: number, my: number): string | null {
    if (!geo) return null;
    const ll = view.invert(mx, my);
    if (!ll) return null;
    const [lon, lat] = ll;
    for (const code of codes) {
      const u = shapes[code];
      if (!selectable(code, u)) continue;
      for (const ring of u.rings) {
        if (pointInRing(ring, lon, lat)) return code;
      }
    }
    return null;
  }

  function unitOf(code: string | null): GlobeUnit | null {
    return code ? shapes[code] ?? null : null;
  }

  function setHover(code: string | null): void {
    if (code === hovered) return;
    hovered = code;
    opts.onHover?.(code, unitOf(code));
  }

  function setSelected(code: string | null): void {
    if (!opts.onSelect || code === selected) return;
    selected = code;
    const centre = code ? centres[code] : null;
    if (centre && zoomOnSelect !== 1) {
      fly = { lon: centre[0], lat: Math.max(-70, Math.min(70, centre[1])) };
      zoomTarget = zoomOnSelect;
    } else if (!code) {
      fly = null;
      zoomTarget = 1;
    }
    vel = 0;
    opts.onSelect(code, unitOf(code));
  }

  function cursor(): void {
    canvas.style.cursor = dragging ? 'grabbing' : (hovered ? 'pointer' : 'grab');
  }

  const onMove = (e: PointerEvent): void => {
    const r = canvas.getBoundingClientRect();
    hovering = true;
    if (dragging) {
      view.lam = ((view.lam - (e.clientX - px) * DRAG_DEG_PER_PX + 540) % 360) - 180;
      // Latitude is positional only — no momentum. It is clamped at ±80°, so a
      // vertical throw would just slam into the stop and sit there.
      view.phi = Math.max(-80, Math.min(80, view.phi + (e.clientY - py) * DRAG_DEG_PER_PX));
      px = e.clientX;
      py = e.clientY;
      samples.push({ t: e.timeStamp, x: e.clientX });
      if (samples.length > 8) samples.shift();
      return;
    }
    setHover(hit(e.clientX - r.left, e.clientY - r.top));
    cursor();
  };

  const onDown = (e: PointerEvent): void => {
    dragging = true;
    hovering = true;
    // Grabbing it cancels the flight. Fighting a reader's hand for control of
    // the camera is the worst thing an animated view can do.
    fly = null;
    px = e.clientX;
    py = e.clientY;
    downX = e.clientX;
    downY = e.clientY;
    downAt = e.timeStamp;
    vel = 0;
    samples.length = 0;
    samples.push({ t: e.timeStamp, x: e.clientX });
    canvas.setPointerCapture(e.pointerId);
    cursor();
  };

  const onUp = (e: PointerEvent): void => {
    const wasDragging = dragging;
    if (wasDragging) {
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

    // A press that went nowhere is a click, not a very short drag. Sitting still
    // for half a second and then releasing is someone thinking, not selecting.
    const still = Math.hypot(e.clientX - downX, e.clientY - downY) <= CLICK_SLOP_PX;
    if (wasDragging && still && e.timeStamp - downAt <= CLICK_MS && hovering) {
      const code = hit(e.clientX - r.left, e.clientY - r.top);
      setHover(code);
      setSelected(code === selected ? null : code);
    } else if (!hovering) {
      setHover(null);
    }
    cursor();
  };

  const onEnter = (): void => { hovering = true; };
  const onLeave = (): void => {
    if (dragging) return;      // capture is still on; the release handler decides
    hovering = false;
    setHover(null);
    cursor();
  };
  const onResize = (): void => resize();
  const onVis = (): void => { tabVisible = !document.hidden; };

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
      for (const en of entries) onScreen = en.isIntersecting;
    }, { threshold: 0.05 });
    io.observe(host);
  }

  let dead = false;
  const destroy = (): void => {
    dead = true;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
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
  // canvas — a globe that fails to load must not take the static map down with it.
  fetch(src)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((d: GlobeData) => {
      if (dead) return;
      geo = d;
      shapes = { ...d.units, ...(d.subunits ?? {}), ...(d.lakes ?? {}) };
      codes = [
        ...Object.keys(d.lakes ?? {}),
        ...Object.keys(d.subunits ?? {}),
        ...Object.keys(d.units),
      ];
      // Mean vertex, not centre of bounding box: an archipelago's bounding box
      // is mostly sea, and flying to the middle of it points at water.
      for (const [code, unit] of Object.entries(shapes)) {
        let sx = 0;
        let sy = 0;
        let n = 0;
        for (const ring of unit.rings) {
          for (let i = 0; i < ring.length; i += 2) { sx += ring[i]; sy += ring[i + 1]; n++; }
        }
        if (n) centres[code] = [sx / n, sy / n];
      }
      lineGroups = Object.entries(d.lines ?? {})
        .flatMap(([group, list]) => list.map((l) => [group, l] as [string, GlobeLine]));
      resize();
      draw();
      host.hidden = false;
      if (opts.fallback) opts.fallback.hidden = true;
      canvas.style.cursor = 'grab';
      opts.onReady?.(d);
      frame = requestAnimationFrame(tick);
    })
    .catch(() => {
      /* Static SVG map stays exactly where it is. */
    });

  return { destroy, select: setSelected };
}
