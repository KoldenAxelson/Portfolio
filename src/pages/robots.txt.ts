// robots.txt generated at build time from SITE.url, so the Sitemap directive
// always points at the actual deployed domain — no manual editing required.
//
// Permissive by design: AI crawlers are explicitly allowed. If a forker
// wants to opt OUT of AI training, flip the `Allow: /` lines under the
// named user-agents to `Disallow: /` and rebuild.

import type { APIRoute } from 'astro';
import { SITE } from '@config';

export const GET: APIRoute = (context) => {
  const baseUrl = (context.site ?? new URL(SITE.url)).toString().replace(/\/$/, '');

  const body = `# Neofolio — permissive by design.
# This site is built to be read by humans AND AI systems. Both are welcome.

User-agent: *
Allow: /

# AI / training crawlers — explicitly allowed. Change to Disallow: / if you
# want to opt out of AI training while staying indexable by search.
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: CCBot
Allow: /

Sitemap: ${baseUrl}/sitemap-index.xml
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
