#!/usr/bin/env node
// Interactive scaffold for a project entry.
//   tier 1 → MDX with case-study skeleton (Problem/Constraints/What I did/Outcome/What I'd do differently)
//   tier 2 → Markdown with frontmatter only
//   tier 3 (archive) → use `make archive` instead

import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ask, confirm, close, slug, csv, isUrl, oneOf, ok, note } from './_prompt.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TARGET_DIR = join(__dirname, '..', 'src', 'content', 'projects');

console.log('\n  New project.');
console.log(note('  ctrl-c to cancel.\n'));

const title = await ask('Title', { required: true });

const tierRaw = await ask('Tier (1 = featured case study, 2 = listed only)', {
  default: '2',
  validate: oneOf(['1', '2']),
});
const tier = parseInt(tierRaw, 10);

const summary = await ask('One-sentence summary', { required: true });
const tags = csv(await ask('Tags (comma-separated, e.g. backend, postgres, cli)', { required: false }));
const stack = csv(await ask('Stack (comma-separated, e.g. Go, Postgres, AWS)', { required: false }));

const role = await ask('Your role on the project', { required: false });
const year = await ask('Year (or range, e.g. 2024 or 2022–present)', {
  default: String(new Date().getFullYear()),
});
const status = await ask('Status', {
  default: 'shipped',
  validate: oneOf(['shipped', 'in-progress', 'abandoned', 'classified']),
});

const liveUrl = await ask('Live URL', { required: false, validate: isUrl });
const repoUrl = await ask('Repo URL', { required: false, validate: isUrl });

const metricLabel = await ask(
  'Vanity metric label (e.g. "★ 612 stars" or "↓ 24k installs")',
  { required: false },
);
let metricHref = '';
if (metricLabel) {
  metricHref = await ask('Vanity metric URL', { required: true, validate: isUrl });
}

const ext = tier === 1 ? 'mdx' : 'md';
const filename = `${slug(title)}.${ext}`;
const target = join(TARGET_DIR, filename);

if (existsSync(target)) {
  const overwrite = await confirm(`${filename} already exists. Overwrite?`, false);
  if (!overwrite) {
    console.log(note('\n  aborted.\n'));
    close();
    process.exit(0);
  }
}

const fm = [
  '---',
  `title: ${JSON.stringify(title)}`,
  `tier: ${tier}`,
  `summary: ${JSON.stringify(summary)}`,
  `tags: ${JSON.stringify(tags)}`,
  `stack: ${JSON.stringify(stack)}`,
  ...(role ? [`role: ${JSON.stringify(role)}`] : []),
  `year: ${JSON.stringify(year)}`,
  `status: ${JSON.stringify(status)}`,
  ...(tier === 1 ? ['featured: true'] : []),
];

if (liveUrl || repoUrl) {
  fm.push('links:');
  if (liveUrl) fm.push(`  live: ${JSON.stringify(liveUrl)}`);
  if (repoUrl) fm.push(`  repo: ${JSON.stringify(repoUrl)}`);
}

if (metricLabel && metricHref) {
  fm.push('metric:');
  fm.push(`  label: ${JSON.stringify(metricLabel)}`);
  fm.push(`  href: ${JSON.stringify(metricHref)}`);
}

fm.push('---', '');

const body =
  tier === 1
    ? `## Problem

What you were solving and who was affected.

## Constraints

What made it hard. The interesting limits the project ran into.

## What I did

The decisions you owned. Include a code excerpt if you can — \`<pre><code>\` text, not a screenshot.

\`\`\`ts
// excerpt: a function whose shape shows your judgment
\`\`\`

## Outcome

The numbers if you have them. The qualitative shift if you don't.

## What I'd do differently

The lesson. Be specific.
`
    : '';

await mkdir(TARGET_DIR, { recursive: true });
await writeFile(target, fm.join('\n') + body, 'utf8');

console.log(ok(`\n  ✓ wrote src/content/projects/${filename}`));
if (tier === 1) {
  console.log(note(`  fill in the case study: $EDITOR src/content/projects/${filename}`));
}
console.log('');
close();
