// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  site: 'https://renderandrank.com',

  prefetch: {
    prefetchAll: true,
  },

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [
    react(),
    mdx(),
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      // No global lastmod: stamping every URL with the build time is a false
      // freshness signal. Blog posts expose publishDate/updatedDate in-page
      // (BlogPosting datePublished/dateModified) instead.
      serialize(item) {
        if (/\/blog\/[^/]+\/?$/.test(item.url)) {
          return { ...item, priority: 0.8 };
        }
        return item;
      },
    }),
  ],
});