// The Motion card on /misc (partials/misc/live/motion.html): an orange ball
// with the site's {w} mark bouncing around the band, drawn with 2D canvas and
// a little classic animation: squash on impact, stretch with speed, a roll that
// matches the distance travelled, and a contact shadow that tightens as the
// ball lands. A readout in the corner counts frames, after the page's first
// demo ("a video is a function of time").
//
// Canvas 2D rather than three.js: one shaded sphere doesn't need a 3D engine,
// and this stays a few kilobytes and cheap to run on a card.

import { mountAll, watchCard } from './card-kit';

const GRAVITY = 2.4; // band heights per second²
const RESTITUTION = 0.86; // keeps most of its bounce, so it never comes to rest
const MIN_LAUNCH = 1.45; // band heights per second off the floor, at least
const SPEED_X = 0.34; // band widths per second
const SQUASH_DECAY = 9; // per second
const FPS_LABEL = 60;

function mount(root: HTMLElement): void {
  const canvas = root.querySelector<HTMLCanvasElement>('canvas');
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // The mark, recoloured to a white silhouette. Fetched and given a pixel size
  // first: an SVG with only a viewBox has no intrinsic size, and some browsers
  // won't draw one to a canvas without it.
  const decal = document.createElement('canvas');
  const loadDecal = async (url: string): Promise<void> => {
    const text = (await (await fetch(url)).text()).replace('<svg ', '<svg width="256" height="256" ');
    const img = new Image();
    img.src = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }));
    await img.decode();
    decal.width = decal.height = 256;
    const dctx = decal.getContext('2d');
    if (!dctx) return;
    dctx.drawImage(img, 0, 0, 256, 256);
    dctx.globalCompositeOperation = 'source-in';
    dctx.fillStyle = 'rgba(255,255,255,0.92)';
    dctx.fillRect(0, 0, 256, 256);
    URL.revokeObjectURL(img.src);
  };

  let ratio = 1;
  let width = 1;
  let height = 1;
  // State in band units: x in widths, y in heights from the floor up.
  let x = 0.3;
  let y = 0.55;
  let vx = SPEED_X;
  let vy = 0;
  let spin = 0;
  let squash = 0;
  let last = 0;
  let frames = 0;
  let muted = '#888';

  const layout = (): void => {
    ratio = Math.min(2, window.devicePixelRatio || 1);
    width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    canvas.width = width;
    canvas.height = height;
    muted = getComputedStyle(root).color;
  };

  const step = (dt: number): void => {
    vy -= GRAVITY * dt;
    y += vy * dt;
    x += vx * dt;
    const r = radiusFrac();
    const floor = r;
    if (y < floor) {
      y = floor;
      vy = Math.max(MIN_LAUNCH, -vy * RESTITUTION);
      squash = Math.min(0.32, 0.12 + Math.abs(vy) * 0.08);
    }
    const left = r * (height / width);
    if (x < left) { x = left; vx = Math.abs(vx); }
    if (x > 1 - left) { x = 1 - left; vx = -Math.abs(vx); }
    spin += (vx * width * dt) / (r * height); // roll: distance over radius
    squash *= Math.exp(-SQUASH_DECAY * dt);
  };

  const radiusFrac = (): number => 0.21; // of the band height

  const draw = (): void => {
    ctx.clearRect(0, 0, width, height);
    const r = radiusFrac() * height;
    const floorY = height * 0.9;
    const cx = x * width;
    const cy = floorY - (y - radiusFrac()) * height * 0.78 - r;

    // Floor line and contact shadow.
    ctx.strokeStyle = muted;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = ratio;
    ctx.beginPath();
    ctx.moveTo(width * 0.06, floorY + 0.5);
    ctx.lineTo(width * 0.94, floorY + 0.5);
    ctx.stroke();
    const lift = Math.min(1, (floorY - (cy + r)) / (height * 0.6));
    ctx.globalAlpha = 0.35 * (1 - lift * 0.75);
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(cx, floorY, r * (1.05 - lift * 0.45), r * 0.18 * (1 - lift * 0.5), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Squash on impact, a little stretch with vertical speed; volume roughly kept.
    const stretch = Math.min(0.12, Math.abs(vy) * 0.03);
    const sy = 1 - squash + stretch;
    const sx = 1 / Math.sqrt(sy);
    ctx.save();
    ctx.translate(cx, cy + r * (1 - sy)); // squash toward the floor
    ctx.scale(sx, sy);

    const shade = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    shade.addColorStop(0, '#ffb07a');
    shade.addColorStop(0.45, '#f0782f');
    shade.addColorStop(1, '#b4461a');
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    if (decal.width) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.rotate(spin);
      const s = r * 1.6;
      ctx.drawImage(decal, -s / 2, -s / 2, s, s);
      ctx.restore();
    }

    // Rim light and specular highlight sit on top of the decal.
    const gloss = ctx.createRadialGradient(-r * 0.4, -r * 0.45, 0, -r * 0.4, -r * 0.45, r * 0.5);
    gloss.addColorStop(0, 'rgba(255,255,255,0.45)');
    gloss.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gloss;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Frame readout, after the page's first demo.
    ctx.fillStyle = muted;
    ctx.globalAlpha = 0.7;
    ctx.font = `${10 * ratio}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.textBaseline = 'top';
    ctx.fillText(`frame ${frames} · t = ${(frames / FPS_LABEL).toFixed(2)} s`, 10 * ratio, 9 * ratio);
    ctx.globalAlpha = 1;
  };

  const frame = (now: number): boolean => {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    if (!reduce) {
      step(dt);
      frames++;
    }
    draw();
    return !reduce;
  };

  const loop = watchCard(root, frame, () => {
    layout();
    last = 0;
  });
  // A paused loop forgets its clock, so the ball doesn't jump after a scroll.
  new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) last = 0;
  }).observe(root);
  if (root.dataset.mark) loadDecal(root.dataset.mark).then(() => loop.wake(), () => {});
}

mountAll('[data-live-motion]', mount);
