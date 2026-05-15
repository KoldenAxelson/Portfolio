#!/usr/bin/env node
// Remove every `example-*` template file shipped with Neofolio, plus the
// placeholder welcome-to-neofolio post. Run after `make setup`, before the
// fork is populated with real content. Idempotent.
//
// Exists primarily for the agent setup flow (SETUP_AGENT.md): one command
// replaces a multi-bullet "delete these files in these directories" chore.
//
// Usage:
//   node scripts/clean-examples.mjs           — perform the cleanup
//   node scripts/clean-examples.mjs --dry-run — print what would be removed

import { readdir, unlink, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const TARGETS = [
  { dir: 'src/content/projects', pattern: /^example-/ },
  { dir: 'src/content/archive', pattern: /^example-/ },
  { dir: 'src/content/network', pattern: /^example-/ },
  { dir: 'src/content/certificates', pattern: /^example-/ },
  // Posts: example-* (none ship today, kept for forward-compat) PLUS the
  // placeholder welcome-to-neofolio.mdx that SETUP_AGENT.md asks the agent
  // to remove during Phase 4.
  { dir: 'src/content/posts', pattern: /^(example-|welcome-to-neofolio\.)/ },
  { dir: 'public/covers', pattern: /^example-/ },
];

const dryRun = process.argv.includes('--dry-run');

const cyan = (s) => `\x1b[36m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

console.log(bold(`\n  ${dryRun ? 'Dry run — would remove' : 'Removing'} template examples\n`));

let removed = 0;
for (const { dir, pattern } of TARGETS) {
  const full = join(ROOT, dir);
  if (!existsSync(full)) continue;
  const entries = await readdir(full);
  for (const name of entries) {
    if (!pattern.test(name)) continue;
    const path = join(full, name);
    const s = await stat(path);
    if (!s.isFile()) continue;
    if (!dryRun) await unlink(path);
    console.log(`  ${cyan('-')} ${dim(dir + '/')}${name}`);
    removed++;
  }
}

const verb = dryRun ? 'would remove' : 'removed';
console.log(green(`\n  ${verb} ${removed} file${removed === 1 ? '' : 's'}.\n`));
