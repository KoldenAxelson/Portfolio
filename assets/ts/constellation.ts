// Constellation backdrop for the desktop sidebar card: drifting points linked by
// lines that fade with distance, drawn on a <canvas data-constellation>. Vanilla
// 2D canvas, no deps. Theme-aware (reads the --c-* tokens), and gated so it only
// runs when it should: desktop width, motion allowed, card on-screen, tab visible.
// initConstellation() is idempotent — it tears down the previous instance so it
// can re-run after each hx-boost body swap (see main.ts).

interface Point {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

// Tuning. Point count scales with card area, clamped to [MIN, MAX].
const DENSITY = 0.00014; // points per px²
const MIN_POINTS = 12;
const MAX_POINTS = 56;
const LINK_DIST = 116; // px; lines fade to 0 at this distance
const MAX_LINK_ALPHA = 0.5;
const DRIFT = 0.32; // px/frame max component velocity
const DOT_RADIUS = 2.6;
const DOT_ALPHA = 0.3;
// Points roam this far past the card edges before wrapping to the far side, so
// they drift out of the (overflow-clipped) card and pop back in.
const ROAM_MARGIN = 40;

let teardown: (() => void) | null = null;

export function initConstellation(): void {
  // Tear down any instance from the previous page (boosted navigation).
  if (teardown) {
    teardown();
    teardown = null;
  }

  const canvas = document.querySelector<HTMLCanvasElement>(
    "[data-constellation]",
  );
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const dark = window.matchMedia("(prefers-color-scheme: dark)");

  let width = 0;
  let height = 0;
  let points: Point[] = [];
  let dotColor = "rgb(120 120 120)";
  let lineColor = "120,120,120";
  let running = false;
  let intersecting = true;
  let rafId: number | null = null;
  let lastT = 0;

  const readColors = (): void => {
    const cs = getComputedStyle(document.documentElement);
    const muted = cs.getPropertyValue("--c-muted").trim() || "120 120 120";
    lineColor = muted.replace(/\s+/g, ","); // "r,g,b" for rgba()
    // White dots on the dark theme (as requested); a neutral foreground tone in
    // light mode, where white would vanish against the pale card.
    dotColor = dark.matches
      ? "255,255,255"
      : (cs.getPropertyValue("--c-fg").trim() || "24 24 27").replace(
          /\s+/g,
          ",",
        );
  };

  const makePoint = (): Point => ({
    x: Math.random() * (width + 2 * ROAM_MARGIN) - ROAM_MARGIN,
    y: Math.random() * (height + 2 * ROAM_MARGIN) - ROAM_MARGIN,
    vx: (Math.random() - 0.5) * 2 * DRIFT,
    vy: (Math.random() - 0.5) * 2 * DRIFT,
  });

  // Sized from the ResizeObserver's contentRect (already-computed layout) rather
  // than getBoundingClientRect(), so we never force a synchronous reflow.
  const applySize = (w: number, h: number): void => {
    width = w;
    height = h;
    if (width === 0 || height === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.round(width * dpr);
    const ch = Math.round(height * dpr);
    // Assigning canvas.width/height clears the whole canvas — even when set to
    // the same value. Only do it when the backing-store size truly changes, so
    // ResizeObserver noise (sub-pixel reflows) doesn't wipe the frame.
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const target = Math.max(
      MIN_POINTS,
      Math.min(MAX_POINTS, Math.round(width * height * DENSITY)),
    );
    while (points.length < target) points.push(makePoint());
    points.length = target; // truncate if the card shrank
  };

  // dt is in 60fps-frame units (1 = one frame at 60Hz), so motion is scaled by
  // real elapsed time rather than frame count. Static repaints pass dt=1.
  const draw = (dt = 1): void => {
    ctx.clearRect(0, 0, width, height);

    for (const p of points) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      // Wrap around past the margins so points roam off the card and re-enter.
      if (p.x < -ROAM_MARGIN) p.x = width + ROAM_MARGIN;
      else if (p.x > width + ROAM_MARGIN) p.x = -ROAM_MARGIN;
      if (p.y < -ROAM_MARGIN) p.y = height + ROAM_MARGIN;
      else if (p.y > height + ROAM_MARGIN) p.y = -ROAM_MARGIN;
    }

    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const dx = points[i].x - points[j].x;
        const dy = points[i].y - points[j].y;
        const dist = Math.hypot(dx, dy);
        if (dist >= LINK_DIST) continue;
        const alpha = (1 - dist / LINK_DIST) * MAX_LINK_ALPHA;
        ctx.strokeStyle = `rgba(${lineColor},${alpha.toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(points[i].x, points[i].y);
        ctx.lineTo(points[j].x, points[j].y);
        ctx.stroke();
      }
    }

    ctx.fillStyle = `rgba(${dotColor},${DOT_ALPHA})`;
    for (const p of points) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, DOT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const loop = (t: number): void => {
    // Advance by elapsed time (normalised to 60fps) so the drift speed is the
    // same regardless of the display's refresh rate or the browser's rAF
    // cadence. Without this the motion runs 2-3x faster on 120Hz+ screens and in
    // browsers that don't vsync-cap to 60 (e.g. Firefox here). Clamp so a long
    // pause (background tab) doesn't teleport everything on resume.
    const dt = lastT ? Math.min((t - lastT) / (1000 / 60), 3) : 1;
    lastT = t;
    draw(dt);
    rafId = requestAnimationFrame(loop);
  };

  const shouldRun = (): boolean =>
    !reduce.matches && intersecting && !document.hidden;

  const sync = (): void => {
    if (shouldRun()) {
      if (!running) {
        running = true;
        lastT = 0; // reset clock so the first frame after a pause uses dt=1
        rafId = requestAnimationFrame(loop);
      }
      return;
    }
    // Not running: stop the loop, and either paint one static frame (reduced
    // motion, card on-screen) or clear (off-screen / tab hidden).
    running = false;
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (reduce.matches && intersecting && width && height) draw();
    else ctx.clearRect(0, 0, width, height);
  };

  const io = new IntersectionObserver(
    (entries) => {
      intersecting = entries.some((e) => e.isIntersecting);
      sync();
    },
    { threshold: 0 },
  );
  const ro = new ResizeObserver((entries) => {
    const cr = entries[entries.length - 1].contentRect;
    applySize(cr.width, cr.height);
    // Always repaint in the same turn. If the canvas was just cleared by a real
    // resize, this fills it immediately instead of waiting for the next rAF —
    // that one-frame gap was the full-canvas flicker when the card reflowed
    // (e.g. as the bio retypes on a section change).
    draw();
  });

  const onVisibility = (): void => sync();
  // Size is driven by the ResizeObserver; mq changes only affect run state.
  const onMqChange = (): void => sync();
  const onTheme = (): void => {
    readColors();
    if (!running) draw();
  };

  readColors();
  // Note: no synchronous getBoundingClientRect here — the ResizeObserver fires
  // right after observe() with the initial contentRect, post-layout.
  io.observe(canvas);
  ro.observe(canvas);
  document.addEventListener("visibilitychange", onVisibility);
  reduce.addEventListener("change", onMqChange);
  dark.addEventListener("change", onTheme);
  sync();

  teardown = (): void => {
    running = false;
    if (rafId != null) cancelAnimationFrame(rafId);
    rafId = null;
    io.disconnect();
    ro.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    reduce.removeEventListener("change", onMqChange);
    dark.removeEventListener("change", onTheme);
  };
}
