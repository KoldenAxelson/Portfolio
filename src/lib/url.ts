// ---------------------------------------------------------------------------
// url() — internal link helper, base-path aware.
//
// Astro auto-prefixes assets it emits itself (CSS chunks, imported images),
// but it does NOT rewrite hardcoded `<a href="/foo">` strings in templates.
// Use url() everywhere you write an internal path.
//
// External URLs (http/https/mailto/tel) and same-page anchors (#…) pass
// through unchanged, so it's safe to wrap every href without thinking.
// ---------------------------------------------------------------------------

const RAW = import.meta.env.BASE_URL || '/';
const BASE = RAW.replace(/\/$/, ''); // strip trailing slash, '' means root

/** Configured base path, normalized (no trailing slash). '' if root. */
export const BASE_URL = BASE || '/';

/**
 * Prepend the base path to an internal site path.
 *
 *   url('/projects')              → '/neofolio/projects'   (base = /neofolio)
 *   url('/projects')              → '/projects'            (base = /)
 *   url('https://github.com/foo') → 'https://github.com/foo'
 *   url('mailto:me@example.com')  → 'mailto:me@example.com'
 *   url('#top')                   → '#top'
 */
export function url(path: string): string {
  if (!path) return BASE || '/';
  if (/^(https?:|mailto:|tel:|#)/i.test(path)) return path;
  if (!path.startsWith('/')) path = '/' + path;
  return `${BASE}${path}`;
}

/**
 * Strip the base prefix from a pathname. Useful when comparing
 * `Astro.url.pathname` (which is base-prefixed) against unprefixed
 * config values like `SITE.nav[i].href`.
 */
export function stripBase(pathname: string): string {
  if (!BASE) return pathname;
  return pathname.startsWith(BASE) ? pathname.slice(BASE.length) || '/' : pathname;
}
