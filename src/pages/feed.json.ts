// JSON Feed 1.1 — see https://www.jsonfeed.org/version/1.1/
//
// Modern AI aggregators (Perplexity, You.com, Feedly, etc.) increasingly
// prefer JSON Feed over RSS/Atom because it's trivial to parse without
// an XML library. Both formats list the same posts; we ship both.

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE } from '@config';

export const GET: APIRoute = async (context) => {
  const baseUrl = (context.site ?? new URL(SITE.url)).toString().replace(/\/$/, '');

  const posts = (await getCollection('posts', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: SITE.title,
    home_page_url: baseUrl,
    feed_url: `${baseUrl}/feed.json`,
    description: SITE.description,
    language: SITE.locale,
    authors: [
      {
        name: SITE.author.name,
        url: baseUrl,
      },
    ],
    items: posts.map((post) => {
      const url = `${baseUrl}/writing/${post.slug}/`;
      return {
        id: url,
        url,
        title: post.data.title,
        summary: post.data.description,
        date_published: post.data.pubDate.toISOString(),
        ...(post.data.updatedDate && {
          date_modified: post.data.updatedDate.toISOString(),
        }),
        tags: post.data.tags ?? [],
        authors: [{ name: SITE.author.name }],
      };
    }),
  };

  return new Response(JSON.stringify(feed, null, 2), {
    headers: {
      'Content-Type': 'application/feed+json; charset=utf-8',
    },
  });
};
