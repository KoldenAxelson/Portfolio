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
// ---------------------------------------------------------------------------

import { SITE } from '@config';

/** Canonical @id for the site's owner Person entity. */
export const personId = `${SITE.url}#person`;

/** Canonical @id for the site's WebSite entity. */
export const websiteId = `${SITE.url}#website`;

/** Build a stable absolute URL for an article. */
export function articleUrl(slug: string): string {
  return new URL(`/articles/${slug}`, SITE.url).toString();
}

/** Build a stable absolute URL for a project case study. */
export function projectUrl(slug: string): string {
  return new URL(`/projects/${slug}`, SITE.url).toString();
}

/** Resolve a cover/image path or absolute URL to an absolute URL. */
export function absoluteImage(image: string | undefined): string | undefined {
  if (!image) return undefined;
  return image.startsWith('http') ? image : new URL(image, SITE.url).toString();
}
