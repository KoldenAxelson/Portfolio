// ---------------------------------------------------------------------------
// Certificate image helpers.
//
// Resolves a credential's `badge` field to a fully-described image: absolute
// URL plus actual pixel dimensions read from the file at build time via
// Sharp. The dimensions matter for two reasons:
//
//   1. JSON-LD compliance — `EducationalOccupationalCredential.image` is
//      richest when emitted as a structured `ImageObject` with `width` and
//      `height`. Search engines and AI knowledge-graph ingesters use those
//      to size the badge in their UIs and validate it meets minimum specs.
//   2. Cumulative Layout Shift — explicit width/height on the rendered
//      <img> tags reserves the box during page load instead of letting it
//      pop in once the image decodes.
//
// Sharp is already a dep of Astro (used internally by `astro:assets`), so
// we don't add anything new to install.
//
// Badges are expected to live in /public/badges/ as PNG, JPEG, WebP, or
// SVG. Recommended size: 600×600 minimum, square preferred. The function
// gracefully degrades — absolute URLs pass through (we don't reach out to
// remote hosts at build time), and missing files return URL-only without
// blocking the build.
// ---------------------------------------------------------------------------

import path from 'node:path';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import { SITE } from '@config';
import { url as urlHelper } from '@lib/url';

export interface BadgeImage {
  /**
   * Base-path-aware path for the rendered `<img src>`.
   * E.g. `/badges/foo.png` (no base) or `/neofolio/badges/foo.png` (base set).
   */
  src: string;
  /**
   * Fully-qualified absolute URL for JSON-LD `image.url`. Includes the
   * site origin AND any deployed base path.
   * E.g. `https://yoursite.com/neofolio/badges/foo.png`.
   */
  url: string;
  /** Pixel width if known. Omitted for remote URLs we can't introspect. */
  width?: number;
  /** Pixel height if known. */
  height?: number;
}

const PUBLIC_DIR = path.join(process.cwd(), 'public');

/**
 * Resolve a credential's `badge` path to URL + dimensions. Returns `null`
 * if no badge is set. Returns URL-only (no dimensions) for absolute URLs
 * or for local paths whose file we couldn't read.
 *
 * Note: badges live at the site root (under `/public/badges/`), but if
 * the site is deployed under a base path (GitHub Pages project sites
 * commonly do this), the served URL needs that prefix. We use the same
 * `url()` helper internal links use, then construct the absolute URL by
 * combining the resulting path with `SITE.url`'s origin.
 */
export async function getBadgeImage(badgePath?: string): Promise<BadgeImage | null> {
  if (!badgePath) return null;

  // Absolute URL — pass through. We don't fetch remote images at build time.
  if (/^https?:\/\//i.test(badgePath)) {
    return { src: badgePath, url: badgePath };
  }

  // Base-path-aware src for the rendered <img>. Using SITE.url's ORIGIN
  // (not the full URL) ensures the absolute URL contains both origin and
  // base path — `new URL(absolutePath, origin)` resolves correctly because
  // `origin` has no path of its own to strip.
  const src = urlHelper(badgePath);
  const origin = new URL(SITE.url).origin;
  const url = new URL(src, origin).toString();

  try {
    const filePath = path.join(PUBLIC_DIR, badgePath.replace(/^\//, ''));
    await fs.access(filePath);
    const meta = await sharp(filePath).metadata();
    return {
      src,
      url,
      ...(meta.width && { width: meta.width }),
      ...(meta.height && { height: meta.height }),
    };
  } catch {
    // File not present yet (forker hasn't dropped it in /public/badges/) or
    // unreadable — return URL only so JSON-LD remains valid and the <img>
    // resolves at runtime if the file appears later.
    return { src, url };
  }
}

/**
 * Build the JSON-LD `image` value for a credential — either a structured
 * ImageObject when dimensions are known, or undefined when there's no
 * badge to point at. Spread into the credential schema with `...`.
 */
export function badgeImageObject(badge: BadgeImage | null) {
  if (!badge) return undefined;
  return {
    '@type': 'ImageObject',
    url: badge.url,
    ...(badge.width && { width: badge.width }),
    ...(badge.height && { height: badge.height }),
  };
}
