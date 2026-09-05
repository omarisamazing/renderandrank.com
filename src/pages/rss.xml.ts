import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { isBasePost } from '../i18n/utils';
import { siteConfig } from '../config/site';

export async function GET() {
  const posts = (await getCollection('blog', (entry) => entry.data.draft !== true && isBasePost(entry))).sort(
    (a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime()
  );
  return rss({
    title: `${siteConfig.name} Blog — Search Engineering Notes`,
    description:
      'High-integrity search engineering insights: Maps 3-pack, schema and entity graphing, and generative search visibility.',
    site: siteConfig.url,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.publishDate,
      link: `/blog/${post.id}/`,
    })),
  });
}
