import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '@config';
import { url } from '@lib/url';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async (context) => {
  const posts = (await getCollection('posts', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );

  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site ?? SITE.url,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: url(`/articles/${post.slug}`),
    })),
  });
};
