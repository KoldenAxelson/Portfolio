#!/usr/bin/env node
// Generate tileable noise PNGs and write them to public/textures/.
//
// Produces TWO PNGs in one run:
//   noise.png       — black grain, designed for light backgrounds
//   noise-dark.png  — white grain, designed for dark backgrounds
//
// CSS in src/styles/global.css picks the right one via prefers-color-scheme.
//
// Why a PNG and not inline SVG <feTurbulence>? Safari has a long-standing
// rendering bug — the filter paints as a flat gray instead of actual noise
// when used in a CSS background-image data URI. PNG works in every browser.
//
// Run with: node scripts/_gen-noise.mjs  (or `make noise`)
//
// To tune grain character, edit the two `generate(...)` calls at the bottom.
// Re-running is deterministic (fixed seed), so the same inputs produce the
// same bytes.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'textures');

const W = 128;
const H = 128;

// Mulberry32 PRNG — small, deterministic, good enough for visual noise.
function mulberry32(seed) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// CRC32 lookup table for PNG chunk CRCs.
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/**
 * Generate a noise PNG.
 * @param {string} outPath - destination filename (relative to OUT_DIR)
 * @param {{r:number,g:number,b:number}} color - pixel color (alpha varies)
 * @param {number} alphaMax - max alpha (0–255). Lower = subtler grain.
 * @param {number} seed - PRNG seed; change for a different pattern.
 */
function generate(outPath, color, alphaMax, seed) {
  const rand = mulberry32(seed);

  // Raw RGBA pixel data: each row is 1 filter byte (None=0) + W*4 RGBA bytes.
  const raw = Buffer.alloc(H * (1 + W * 4));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 4)] = 0; // PNG filter: None
    for (let x = 0; x < W; x++) {
      const i = y * (1 + W * 4) + 1 + x * 4;
      raw[i] = color.r;
      raw[i + 1] = color.g;
      raw[i + 2] = color.b;
      raw[i + 3] = Math.floor(rand() * alphaMax);
    }
  }

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const idat = deflateSync(raw, { level: 9 });

  const png = Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);

  const full = join(OUT_DIR, outPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, png);
  console.log(
    `  ✓ ${outPath}  (${png.length.toString().padStart(6)} B, ${W}×${H}, rgba(${color.r},${color.g},${color.b},≤${alphaMax}/255))`,
  );
}

console.log('\n  Generating noise textures…\n');

// Light theme: black pixels at low alpha. Subtle dark grain on warm-white.
generate('noise.png', { r: 0, g: 0, b: 0 }, /* alphaMax */ 12, /* seed */ 72);

// Dark theme: white pixels at lower alpha (the eye picks up highlights on
// dark backgrounds more readily than shadows on light, so we use less).
generate('noise-dark.png', { r: 255, g: 255, b: 255 }, /* alphaMax */ 8, /* seed */ 37);

console.log('\n  Done.\n');
