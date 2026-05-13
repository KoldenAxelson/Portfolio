#!/usr/bin/env node
// Interactive scaffold for a network contact.
// Writes a YAML file to src/content/network/.

import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ask, confirm, close, slug, isUrl, ok, note } from './_prompt.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TARGET_DIR = join(__dirname, '..', 'src', 'content', 'network');

console.log('\n  Adding a network contact.');
console.log(note('  ctrl-c to cancel.\n'));

const name = await ask('Full name', { required: true });
const title = await ask('Title / role', { required: true });
const company = await ask('Company', { required: false });
const blurb = await ask(
  'Blurb — one to three sentences on why this person is notable',
  { required: true },
);
const relationship = await ask('How you know them', { required: true });
const link = await ask('Verifiable URL (their site / LinkedIn / etc.)', {
  required: false,
  validate: isUrl,
});
const orderRaw = await ask('Sort order (lower = higher in list)', { default: '100' });
const order = parseInt(orderRaw, 10) || 100;

const filename = `${slug(name)}.yaml`;
const target = join(TARGET_DIR, filename);

if (existsSync(target)) {
  const overwrite = await confirm(`${filename} already exists. Overwrite?`, false);
  if (!overwrite) {
    console.log(note('\n  aborted.\n'));
    close();
    process.exit(0);
  }
}

const lines = [
  `name: ${JSON.stringify(name)}`,
  `title: ${JSON.stringify(title)}`,
  ...(company ? [`company: ${JSON.stringify(company)}`] : []),
  `blurb: ${JSON.stringify(blurb)}`,
  `relationship: ${JSON.stringify(relationship)}`,
  ...(link ? [`link: ${JSON.stringify(link)}`] : []),
  `order: ${order}`,
  '',
];

await mkdir(TARGET_DIR, { recursive: true });
await writeFile(target, lines.join('\n'), 'utf8');

console.log(ok(`\n  ✓ wrote src/content/network/${filename}\n`));
close();
