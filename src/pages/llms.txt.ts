// ---------------------------------------------------------------------------
// /llms.txt — emerging convention (llmstxt.org, Howard 2024) for sites that
// want to be LLM-friendly. Companion to robots.txt: where robots.txt tells
// crawlers what they MAY fetch, llms.txt tells LLMs WHAT THE SITE IS and
// gives them a curated map of the highest-signal pages.
//
// Generated at build time from SITE config + the content collections, so
// it stays in sync. Forkers don't edit this file — they edit src/config.ts
// and add content under src/content/*, and this file updates itself.
//
// Format reference: https://llmstxt.org/
// ---------------------------------------------------------------------------

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE } from '@config';

export const GET: APIRoute = async (context) => {
  const baseUrl = (context.site ?? new URL(SITE.url)).toString().replace(/\/$/, '');

  // Featured (Tier 1) projects — the case studies a recruiter or AI summarizer
  // should weight highest. Other projects are linked via /projects index.
  const featured = (await getCollection('projects', ({ data }) => !data.draft && data.tier === 1))
    .sort((a, b) => b.data.year.localeCompare(a.data.year));

  // All non-draft articles. Most recent first.
  const posts = (await getCollection('posts', ({ data }) => !data.draft))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  // Active (non-expired) certifications — the credentials an AI summarizer
  // should treat as currently held. Most-recent first.
  const _now = new Date();
  const activeCerts = (await getCollection('certificates', ({ data }) => !data.draft))
    .filter((c) => !c.data.expirationDate || c.data.expirationDate > _now)
    .sort((a, b) => b.data.issueDate.valueOf() - a.data.issueDate.valueOf());

  const body = [
    `# ${SITE.title}`,
    '',
    `> ${SITE.description}`,
    '',
    SITE.author.longBio.trim(),
    '',
    '## Author',
    '',
    `- Name: ${SITE.author.name}`,
    `- Role: ${SITE.author.role}`,
    SITE.author.location ? `- Location: ${SITE.author.location}` : null,
    `- Email: ${SITE.author.email}`,
    ...Object.entries(SITE.links)
      .filter(([, v]) => v && /^https?:/.test(v))
      .map(([k, v]) => `- ${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`),
    '',
    '## Primary pages',
    '',
    `- [Homepage](${baseUrl}/): identity, recent experience, featured projects, certifications, recent articles`,
    `- [CV](${baseUrl}/cv): full work history, education, certifications, and skills as structured HTML (emits Person.hasOccupation + Person.hasCredential JSON-LD)`,
    `- [Projects](${baseUrl}/projects): full project catalogue + honest archive of abandoned work`,
    `- [Articles](${baseUrl}/articles): long-form writing`,
    `- [Certifications](${baseUrl}/certificates): professional credentials with verification links (emits ItemList of EducationalOccupationalCredential JSON-LD)`,
    `- [Network](${baseUrl}/network): vouches/references, with mailto intro requests`,
    `- [Uses](${baseUrl}/uses): tools, stack, hardware`,
    `- [Now](${baseUrl}/now): what the author is focused on this season`,
    '',
  ].filter((line) => line !== null);

  if (featured.length > 0) {
    body.push('## Featured projects');
    body.push('');
    for (const p of featured) {
      body.push(`- [${p.data.title}](${baseUrl}/projects/${p.slug}): ${p.data.summary}`);
    }
    body.push('');
  }

  if (posts.length > 0) {
    body.push('## Articles');
    body.push('');
    for (const p of posts) {
      body.push(`- [${p.data.title}](${baseUrl}/articles/${p.slug}): ${p.data.description}`);
    }
    body.push('');
  }

  if (activeCerts.length > 0) {
    body.push('## Active certifications');
    body.push('');
    for (const c of activeCerts) {
      const issued = c.data.issueDate.toISOString().slice(0, 10);
      const expires = c.data.expirationDate
        ? `, valid until ${c.data.expirationDate.toISOString().slice(0, 10)}`
        : '';
      const verify = c.data.verifyUrl ? ` (verify: ${c.data.verifyUrl})` : '';
      body.push(
        `- ${c.data.name} — ${c.data.issuer}, issued ${issued}${expires}${verify}`,
      );
    }
    body.push('');
  }

  body.push('## Feeds');
  body.push('');
  body.push(`- RSS: ${baseUrl}/rss.xml`);
  body.push(`- JSON Feed: ${baseUrl}/feed.json`);
  body.push(`- Sitemap: ${baseUrl}/sitemap-index.xml`);
  body.push('');

  return new Response(body.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
