#!/usr/bin/env node
// Interactive scaffold for a writing post.
// Writes a MDX file to src/content/posts/ with frontmatter + an empty body.

import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ask, confirm, close, slug, csv, ok, note } from './_prompt.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TARGET_DIR = join(__dirname, '..', 'src', 'content', 'posts');

console.log('\n  New article.');
console.log(note('  ctrl-c to cancel.\n'));

const title = await ask('Title', { required: true });
const description = await ask(
  'Description (1–2 sentences — shown in the writing index)',
  { required: true },
);
const tags = csv(
  await ask('Tags (comma-separated)', {
    required: false,
    default: '',
  }),
);

const today = new Date().toISOString().slice(0, 10);
const pubDate = await ask("Publish date (YYYY-MM-DD)", { default: today });

const filename = `${slug(title)}.mdx`;
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
description: ${JSON.stringify(description)}
pubDate: ${pubDate}
tags: ${JSON.stringify(tags)}
---

# ${title}

Start writing here. Markdown + MDX.
`;

await mkdir(TARGET_DIR, { recursive: true });
await writeFile(target, content, 'utf8');

console.log(ok(`\n  ✓ wrote src/content/posts/${filename}`));
console.log(note(`  open it: $EDITOR src/content/posts/${filename}\n`));
close();
