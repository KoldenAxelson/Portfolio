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

  const resize = (): void => {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    if (width === 0 || height === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const target = Math.max(
      MIN_POINTS,
      Math.min(MAX_POINTS, Math.round(width * height * DENSITY)),
    );
    while (points.length < target) points.push(makePoint());
    points.length = target; // truncate if the card shrank
  };

  const draw = (): void => {
    ctx.clearRect(0, 0, width, height);

    for (const p of points) {
      p.x += p.vx;
      p.y += p.vy;
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

  const loop = (): void => {
    draw();
    rafId = requestAnimationFrame(loop);
  };

  const shouldRun = (): boolean =>
    !reduce.matches && intersecting && !document.hidden;

  const sync = (): void => {
    if (shouldRun()) {
      if (!running) {
        running = true;
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
  const ro = new ResizeObserver(() => {
    resize();
    if (!running) draw();
  });

  const onVisibility = (): void => sync();
  const onMqChange = (): void => {
    resize();
    sync();
  };
  const onTheme = (): void => {
    readColors();
    if (!running) draw();
  };

  readColors();
  resize();
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
