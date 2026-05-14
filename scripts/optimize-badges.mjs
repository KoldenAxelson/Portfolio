// Process credential badges dropped into ./badges/ at the project root.
// Reads each file via Sharp, optionally resizes oversized rasters down to
// 1500px max edge (keeps file sizes sane while staying well above the
// 600px floor we recommend for SEO), re-encodes as optimized PNG, then
// moves the result into public/badges/. SVGs pass through untouched.
//
// Prints a per-file report and a copy-pasteable YAML snippet for each
// processed badge — including a hint about which certificate file it
// likely belongs to (slug-based fuzzy match against
// src/content/certificates/*.{yaml,yml}).
//
// Run via:  make badges
//
// No new deps — Sharp ships with Astro.

import { readdir, mkdir, rm, rename, stat, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import sharp from 'sharp';

// Inlined (not imported from _prompt.mjs) because that module instantiates
// a readline interface at top-level — pulling it in here would keep stdin
// open and the script would hang after finishing instead of exiting.
function slugify(s) {
  return s
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const SRC = 'badges';
const DEST = 'public/badges';
const CERTS_DIR = 'src/content/certificates';

const RASTER_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif']);
const SVG_EXT = '.svg';
const MAX_EDGE = 1500;

// ANSI helpers — match the rest of the scripts.
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

function fmtBytes(n) {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / (1024 * 1024)).toFixed(2)}MB`;
}

/** Find the certificate YAML whose slug shares the most chars with `slug`. */
async function findMatchingCert(slug) {
  if (!existsSync(CERTS_DIR)) return null;
  const certs = (await readdir(CERTS_DIR)).filter((f) => /\.ya?ml$/.test(f));
  if (certs.length === 0) return null;

  // Exact-substring match first (e.g. badge `security-plus.png` finds
  // `example-security-plus.yaml`).
  const exact = certs.find((f) => f.replace(/\.ya?ml$/, '').includes(slug));
  if (exact) return exact;

  // Otherwise: longest shared token. Both slug and filename get split by
  // `-` and the file with the most matching tokens wins.
  const slugTokens = new Set(slug.split('-'));
  let best = null;
  let bestScore = 0;
  for (const f of certs) {
    const fileTokens = f.replace(/\.ya?ml$/, '').split('-');
    const score = fileTokens.filter((t) => slugTokens.has(t)).length;
    if (score > bestScore) {
      best = f;
      bestScore = score;
    }
  }
  return bestScore > 0 ? best : null;
}

async function processOne(filename) {
  const srcPath = join(SRC, filename);
  const ext = extname(filename).toLowerCase();
  const rawName = basename(filename, ext);
  const slug = slugify(rawName) || 'badge';
  const renamed = slug !== rawName;

  if (ext === SVG_EXT) {
    const destPath = join(DEST, `${slug}.svg`);
    await rename(srcPath, destPath);
    const stats = await stat(destPath);
    return {
      slug,
      output: `/badges/${slug}.svg`,
      width: 'vector',
      height: 'vector',
      size: stats.size,
      action: renamed
        ? `moved (renamed from "${rawName}.svg", SVG passes through)`
        : 'moved (SVG passes through)',
    };
  }

  if (!RASTER_EXTS.has(ext)) {
    console.log(yellow(`  ⚠ ${filename}: unsupported extension, skipped`));
    return null;
  }

  const img = sharp(srcPath);
  const meta = await img.metadata();
  const origW = meta.width ?? 0;
  const origH = meta.height ?? 0;
  const origBytes = (await stat(srcPath)).size;

  let pipeline = img;
  let resized = false;
  if (origW > MAX_EDGE || origH > MAX_EDGE) {
    pipeline = pipeline.resize(MAX_EDGE, MAX_EDGE, {
      fit: 'inside',
      withoutEnlargement: true,
    });
    resized = true;
  }
  pipeline = pipeline.png({ compressionLevel: 9, palette: true });

  const destPath = join(DEST, `${slug}.png`);
  await pipeline.toFile(destPath);
  await rm(srcPath);

  const newMeta = await sharp(destPath).metadata();
  const newBytes = (await stat(destPath)).size;

  const sizeNote = `${fmtBytes(origBytes)} → ${fmtBytes(newBytes)}`;
  const dimsNote = `${origW}×${origH} → ${newMeta.width}×${newMeta.height}`;
  const renameNote = renamed ? ` (renamed from "${rawName}${ext}")` : '';

  return {
    slug,
    output: `/badges/${slug}.png`,
    width: newMeta.width,
    height: newMeta.height,
    size: newBytes,
    action: resized
      ? `resized ${dimsNote}, ${sizeNote}${renameNote}`
      : `optimized, ${sizeNote}${renameNote}`,
  };
}

async function certAlreadyHasBadge(yamlFile) {
  try {
    const contents = await readFile(join(CERTS_DIR, yamlFile), 'utf8');
    return /^\s*badge\s*:/m.test(contents);
  } catch {
    return false;
  }
}

async function main() {
  if (!existsSync(SRC)) {
    console.log(dim(`No ${SRC}/ directory found. Drop badge images into ./${SRC}/ first.`));
    return;
  }

  const files = (await readdir(SRC)).filter((f) => !f.startsWith('.'));
  if (files.length === 0) {
    console.log(dim(`./${SRC}/ is empty. Drop badge images there first.`));
    return;
  }

  await mkdir(DEST, { recursive: true });

  console.log(bold(`\nProcessing ${files.length} badge${files.length === 1 ? '' : 's'} from ./${SRC}/\n`));

  const results = [];
  for (const f of files) {
    const result = await processOne(f);
    if (result) results.push(result);
  }

  if (results.length === 0) {
    console.log(red('\n  No badges processed.'));
    return;
  }

  console.log(green('\n✓ Processed:\n'));
  for (const r of results) {
    console.log(`  ${cyan(r.slug)}: ${r.action}`);
    console.log(dim(`    → public${r.output}  (${r.width}×${r.height}, ${fmtBytes(r.size)})\n`));
  }

  console.log(bold('Add to YAML frontmatter:\n'));
  for (const r of results) {
    const match = await findMatchingCert(r.slug);
    if (match) {
      const has = await certAlreadyHasBadge(match);
      console.log(dim(`  # ${CERTS_DIR}/${match}${has ? '  (already has a badge: field — overwrite it)' : ''}`));
    } else {
      console.log(dim(`  # no matching certificate file found — add manually`));
    }
    console.log(`  badge: '${r.output}'\n`);
  }

  console.log(dim('Tip: ./badges/ is a staging folder. Add it to .gitignore if you'),
    dim("haven't already — only public/badges/ should be committed."));
}

main().catch((err) => {
  console.error(red('\n✗ Failed:'), err.message);
  process.exit(1);
});
