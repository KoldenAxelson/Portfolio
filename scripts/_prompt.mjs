// Shared interactive-prompt helpers for the make-* content scaffolds.
//
// Pure Node built-ins. No `inquirer`, no `prompts`, no extra deps. Forkers
// can read this file in 60 seconds and understand exactly what's happening.
//
// Usage:
//   import { ask, confirm, slug, isUrl, oneOf, close } from './_prompt.mjs';
//
//   const name = await ask('Full name', { required: true });
//   const tier = await ask('Tier', { default: '2', validate: oneOf(['1','2']) });
//   close();

import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const rl = createInterface({ input: stdin, output: stdout });

// ANSI helpers. Cheap and cheerful, no chalk.
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;

/**
 * Prompt for a single value. Loops until validation passes.
 *
 * @param {string} prompt
 * @param {object} [opts]
 * @param {string} [opts.default]
 * @param {boolean} [opts.required=true]
 * @param {(value: string) => string | null} [opts.validate]
 */
export async function ask(prompt, opts = {}) {
  const { default: defaultVal = '', required = true, validate } = opts;
  const suffix = defaultVal
    ? dim(` [${defaultVal}]`)
    : !required
      ? dim(' (optional)')
      : '';
  while (true) {
    const answer = (await rl.question(`${cyan('?')} ${prompt}${suffix} `)).trim();
    const value = answer || defaultVal;
    if (!value && required) {
      console.log(red('  required — try again.'));
      continue;
    }
    if (validate && value) {
      const err = validate(value);
      if (err) {
        console.log(red(`  ${err}`));
        continue;
      }
    }
    return value;
  }
}

export async function confirm(prompt, defaultYes = false) {
  const suffix = defaultYes ? dim(' [Y/n]') : dim(' [y/N]');
  const answer = (await rl.question(`${cyan('?')} ${prompt}${suffix} `))
    .trim()
    .toLowerCase();
  if (!answer) return defaultYes;
  return ['y', 'yes'].includes(answer);
}

export function close() {
  rl.close();
}

/** Convert "Hello World!" → "hello-world". */
export function slug(s) {
  return s
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Validator: returns error string or null. */
export function isUrl(s) {
  if (!s) return null;
  try {
    new URL(s);
    return null;
  } catch {
    return 'must be a valid URL (include https://)';
  }
}

/** Build a validator that requires one of a fixed set of values. */
export function oneOf(values) {
  return (v) => (values.includes(v) ? null : `must be one of: ${values.join(', ')}`);
}

/** Parse a comma-separated string into a deduped trimmed array. */
export function csv(s) {
  if (!s) return [];
  return [...new Set(s.split(',').map((x) => x.trim()).filter(Boolean))];
}

export const ok = green;
export const note = dim;
