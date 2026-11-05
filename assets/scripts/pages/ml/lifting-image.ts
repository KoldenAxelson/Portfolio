// {{< ml/lifting-image >}}: a small made-up picture run through the same 5/3
// lifting steps as lossless JPEG 2000 (lifting.ts), columns then rows, one
// level at a time. Each level leaves a smooth quarter (top left) and three
// quarters of details; the next level works on the smooth quarter. The
// readout estimates bits per pixel and checks that the inverse gives every
// pixel back.

import { bitsPerValue, forwardImage, inverseImage } from './lifting';

const SIZE = 32;
// Details are small, so they're drawn four times stronger around mid-grey.
const DETAIL_CONTRAST = 4;

// Seeded, so every visitor sees the same picture and the same numbers.
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Sky fading toward the horizon, a sun, a dark roof and the ground, with a
// little noise so it isn't too easy.
function makePicture(): number[][] {
  const next = seededRandom(2026);
  return Array.from({ length: SIZE }, (_, y) =>
    Array.from({ length: SIZE }, (_, x) => {
      const isSun = (x - 24) ** 2 + (y - 7) ** 2 < 16;
      const isRoof = y > 14 && y < 24 && Math.abs(x - 10) < y - 13;
      const isGround = y >= 24;
      const base = isSun ? 240 : isRoof ? 55 : isGround ? 80 + (y - 24) * 2 : 205 - y * 2;
      return Math.max(0, Math.min(255, base + Math.round((next() - 0.5) * 3)));
    }),
  );
}

function draw(canvas: HTMLCanvasElement, grid: number[][], smoothSize: number): void {
  const context = canvas.getContext('2d');
  if (!context) return;
  const image = context.createImageData(SIZE, SIZE);
  grid.forEach((row, y) =>
    row.forEach((value, x) => {
      const isSmooth = x < smoothSize && y < smoothSize;
      const level = Math.max(0, Math.min(255, isSmooth ? value : 128 + value * DETAIL_CONTRAST));
      const at = (y * SIZE + x) * 4;
      image.data.set([level, level, level, 255], at);
    }),
  );
  context.putImageData(image, 0, 0);
}

export function initLiftingImage(root: HTMLElement): void {
  const pictureCanvas = root.querySelector<HTMLCanvasElement>('#mli-li-picture');
  const transformCanvas = root.querySelector<HTMLCanvasElement>('#mli-li-transform');
  const slider = root.querySelector<HTMLInputElement>('#mli-li-levels');
  const sliderValue = root.querySelector<HTMLElement>('#mli-li-levels-v');
  const stat = root.querySelector<HTMLElement>('#mli-li-stat');
  const check = root.querySelector<HTMLElement>('#mli-li-check');
  if (!pictureCanvas || !transformCanvas || !slider || !stat || !check) return;

  const picture = makePicture();
  const pixels = SIZE * SIZE;
  const pictureBits = bitsPerValue(picture.flat());
  draw(pictureCanvas, picture, SIZE);

  function render(): void {
    const levels = Number(slider!.value);
    if (sliderValue) sliderValue.textContent = String(levels);
    const transformed = forwardImage(picture, levels);
    draw(transformCanvas!, transformed, SIZE >> levels);
    const transformedBits = bitsPerValue(transformed.flat());
    stat!.innerHTML = levels === 0
      ? `The picture: ${pixels.toLocaleString('en-US')} pixels stored as 8 bits each. Counting how often each value appears, an entropy coder could get that to about <b>${pictureBits.toFixed(2)}</b> bits each.`
      : `After ${levels} level${levels === 1 ? '' : 's'}: still ${pixels.toLocaleString('en-US')} numbers, and counting how often each value appears, an entropy coder could get them to about <b>${transformedBits.toFixed(2)}</b> bits each, against <b>${pictureBits.toFixed(2)}</b> for the untouched 8-bit pixels.`;
    const rebuilt = inverseImage(transformed, levels);
    const wrong = rebuilt.flat().filter((value, i) => value !== picture.flat()[i]).length;
    check!.textContent = wrong === 0 ? `Undo check: all ${pixels.toLocaleString('en-US')} pixels come back exactly.` : `Undo check: ${wrong} pixels came back wrong.`;
  }

  slider.disabled = false;
  slider.addEventListener('input', render);
  for (const id of ['#mli-li-panels', '#mli-li-controls']) {
    const element = root.querySelector<HTMLElement>(id);
    if (element) element.hidden = false;
  }
  render();
}
