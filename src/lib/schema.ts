// ---------------------------------------------------------------------------
// JSON-LD entity helpers.
//
// Every page in Neofolio that emits structured data references the same
// Person and WebSite entities via @id, so a crawler can resolve "the author
// of this article" and "the subject of the Person block on /cv" as the same
// node in the graph.
//
// Use these IDs from any page or component that constructs JSON-LD. Do not
// redeclare the Person/WebSite blocks — they are emitted site-wide by
// SEO.astro. Use `{ '@id': personId }` to REFERENCE the canonical record.
//
// All URL helpers are base-path aware: they round-trip through `url()` so
// deployments under a sub-path (GitHub Pages project sites like /neofolio)
// emit JSON-LD that resolves to actually-served URLs, not the root domain.
// ---------------------------------------------------------------------------

import { SITE } from '@config';
import { url } from '@lib/url';

const ORIGIN = new URL(SITE.url).origin;

/**
 * Resolve any internal path to a fully-qualified absolute URL.
 *
 * Use this when constructing a JSON-LD `@id` for a per-page record. The
 * result is stable across deployments AND respects any configured base
 * path, so a page at /neofolio/now emits an @id of
 * `https://example.com/neofolio/now#now`, not the root-anchored equivalent.
 */
export function absolute(path: string): string {
  return new URL(url(path), ORIGIN).toString();
}

/** Canonical @id for the site's owner Person entity. */
export const personId = `${SITE.url}#person`;

/** Canonical @id for the site's WebSite entity. */
export const websiteId = `${SITE.url}#website`;

/** Build a stable absolute URL for an article. */
export function articleUrl(slug: string): string {
  return absolute(`/articles/${slug}`);
}

/** Build a stable absolute URL for a project case study. */
export function projectUrl(slug: string): string {
  return absolute(`/projects/${slug}`);
}

/**
 * Stable absolute @id for a credential. Used as `@id` on the JSON-LD record
 * in BOTH /certificates (the ItemList entry) AND /cv (Person.hasCredential)
 * so parsers merge the two records into a single graph entity.
 */
export function credentialId(id: string): string {
  return `${absolute('/certificates')}#${id}`;
}

/** Resolve a cover/image path or absolute URL to an absolute URL. */
export function absoluteImage(image: string | undefined): string | undefined {
  if (!image) return undefined;
  return image.startsWith('http') ? image : absolute(image);
}
