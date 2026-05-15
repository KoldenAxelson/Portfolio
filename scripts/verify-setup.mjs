#!/usr/bin/env node
// Post-customization sanity check for an agent-driven setup. Run after
// `npm run build`. Walks dist/, surfaces template placeholders that
// survived, validates every JSON-LD block parses, and sanity-checks
// llms.txt + the sitemap for "example.com" leakage.
//
// Exit codes:
//   0 — clean (no issues; warnings are OK)
//   1 — one or more hard issues remain
//
// Designed to be called from SETUP_AGENT.md's Phase 10 in place of a
// wall of curl + grep + python3 invocations. Structured output, easy for
// an agent to parse the final "issues" / "warnings" sections.

import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');

const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

if (!existsSync(DIST)) {
  console.error(red('\n  No dist/ found. Run `npm run build` first.\n'));
  process.exit(1);
}

const issues = [];
const warnings = [];

// ---------------------------------------------------------------------------
// 1. Template placeholders still in the build.
//    These strings only appear in the template's example content. If any
//    survive into dist/, the agent missed an edit somewhere.
// ---------------------------------------------------------------------------
const PLACEHOLDERS = [
  'Your Name',
  'you@example.com',
  'Example Corp',
  'https://example.com',
  'your-username',
  '[your name]',
];

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(path)));
    else if (/\.(html|xml|txt|json)$/.test(entry.name)) out.push(path);
  }
  return out;
}

const files = await walk(DIST);

const placeholderHits = new Map(); // placeholder → array of file paths
for (const f of files) {
  const text = await readFile(f, 'utf8');
  for (const p of PLACEHOLDERS) {
    if (text.includes(p)) {
      const rel = relative(DIST, f);
      const list = placeholderHits.get(p) ?? [];
      list.push(rel);
      placeholderHits.set(p, list);
    }
  }
}

for (const [p, hits] of placeholderHits) {
  issues.push(
    `placeholder "${bold(p)}" present in ${hits.length} built file${hits.length === 1 ? '' : 's'}` +
      ` (e.g. ${hits.slice(0, 3).join(', ')}${hits.length > 3 ? ', …' : ''})`,
  );
}

// ---------------------------------------------------------------------------
// 2. Every JSON-LD block parses as valid JSON.
//    A schema-breaking edit (e.g. an unescaped quote in a YAML field that
//    flows into JSON-LD) will only show up here — Astro itself won't catch
//    it because the value is `JSON.stringify`d at render time.
// ---------------------------------------------------------------------------
const LD_RE = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;

for (const f of files.filter((x) => x.endsWith('.html'))) {
  const text = await readFile(f, 'utf8');
  let m;
  let count = 0;
  while ((m = LD_RE.exec(text))) {
    count++;
    try {
      JSON.parse(m[1]);
    } catch (err) {
      issues.push(`invalid JSON-LD in ${relative(DIST, f)} (block ${count}): ${err.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 3. llms.txt sanity.
// ---------------------------------------------------------------------------
const llms = files.find((f) => f.endsWith('llms.txt'));
if (!llms) {
  warnings.push('llms.txt missing from build');
} else {
  const body = await readFile(llms, 'utf8');
  if (!body.includes('## Primary pages')) {
    warnings.push('llms.txt is present but missing expected "## Primary pages" section');
  }
}

// ---------------------------------------------------------------------------
// 4. Sitemap sanity. example.com leaking here means SITE.url wasn't updated.
// ---------------------------------------------------------------------------
const sitemap = files.find((f) => f.endsWith('sitemap-index.xml'));
if (sitemap) {
  const body = await readFile(sitemap, 'utf8');
  if (body.includes('example.com')) {
    issues.push('sitemap references example.com — SITE.url in src/config.ts not updated');
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
console.log(bold('\n  Neofolio setup verification\n'));

if (issues.length === 0 && warnings.length === 0) {
  console.log(green('  ✓ All checks passed.\n'));
  process.exit(0);
}

if (issues.length > 0) {
  console.log(red(`  ${issues.length} issue${issues.length === 1 ? '' : 's'}:`));
  for (const i of issues) console.log(`    ${red('•')} ${i}`);
  console.log();
}
if (warnings.length > 0) {
  console.log(yellow(`  ${warnings.length} warning${warnings.length === 1 ? '' : 's'}:`));
  for (const w of warnings) console.log(`    ${yellow('•')} ${w}`);
  console.log();
}

console.log(dim('  Hard issues fail the run; warnings are informational.\n'));
process.exit(issues.length > 0 ? 1 : 0);
