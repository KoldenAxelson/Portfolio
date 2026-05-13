#!/usr/bin/env node
// Interactive scaffold for an archive entry.
// Writes a Markdown file to src/content/archive/.

import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ask, confirm, close, slug, csv, oneOf, ok, note } from './_prompt.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TARGET_DIR = join(__dirname, '..', 'src', 'content', 'archive');

console.log('\n  New archive entry.');
console.log(note('  ctrl-c to cancel.\n'));

const title = await ask('Title', { required: true });
const year = await ask('Year (or range, e.g. 2018–2020)', { required: true });
const reason = await ask('Reason', {
  default: 'abandoned',
  validate: oneOf(['abandoned', 'superseded', 'classified', 'archived']),
});
const postmortem = await ask(
  'One-sentence post-mortem — what ended this and what you learned',
  { required: true },
);
const stack = csv(await ask('Stack (comma-separated)', { required: false }));

const filename = `${slug(title)}.md`;
const target = join(TARGET_DIR, filename);

if (existsSync(target)) {
  const overwrite = await confirm(`${filename} already exists. Overwrite?`, false);
  if (!overwrite) {
    console.log(note('\n  aborted.\n'));
    close();
    process.exit(0);
  }
}

const content = `---
title: ${JSON.stringify(title)}
year: ${JSON.stringify(year)}
reason: ${JSON.stringify(reason)}
postmortem: ${JSON.stringify(postmortem)}
stack: ${JSON.stringify(stack)}
---
`;

await mkdir(TARGET_DIR, { recursive: true });
await writeFile(target, content, 'utf8');

console.log(ok(`\n  ✓ wrote src/content/archive/${filename}\n`));
close();
