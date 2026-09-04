import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Editorial engine: one `blog` collection. Topics mirror the three content
 * pillars (plus commercial bottom-funnel):
 * - local-seo — Local SEO & GBP Engineering
 * - technical-schema — Technical Schema & Entity Graphing
 * - generative-search — Generative Search & AEO
 * - commercial — pricing / ROI bottom-funnel
 */
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(200),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('Omar Ali'),
    topic: z.enum(['local-seo', 'technical-schema', 'generative-search', 'commercial']),
    pillar: z.string(),
    readingMinutes: z.number().optional(),
    canonical: z.string().startsWith('https://').optional(),
    draft: z.boolean().default(false),
    faq: z
      .array(z.object({ q: z.string(), a: z.string() }))
      .default([]),
    related: z.array(z.string()).default([]),
    cta: z
      .object({
        title: z.string(),
        body: z.string(),
        primaryLabel: z.string(),
        primaryHref: z.string(),
        secondaryLabel: z.string().optional(),
        secondaryHref: z.string().optional(),
      })
      .optional(),
  }),
});

export const collections = { blog };
