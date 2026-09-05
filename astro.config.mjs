// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

// Canonical origin. Override at build time with PUBLIC_SITE_URL so the same
// codebase stages on *.pages.dev and ships on the root domain with zero edits.
const site = process.env.PUBLIC_SITE_URL ?? 'https://renderandrank.com';

// https://astro.build/config
export default defineConfig({
  site,

  // Multilingual USA/Europe: root `/` stays en-US (x-default); all other
  // locales live under prefix subdirectories (/es/ /fr/ /de/ /it/ /pt/ /nl/).
  // NOTE: Astro's i18n config alone does not duplicate static pages — each
  // locale URL needs a real route file (see src/pages/[locale]/ wrappers and
  // docs/i18n.md). prefixDefaultLocale:false keeps the default locale unprefixed.
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl'],
    routing: {
      prefixDefaultLocale: false,
    },
  },

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