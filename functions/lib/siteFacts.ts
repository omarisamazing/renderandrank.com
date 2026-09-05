/**
 * Shared grounding facts for the Render and Rank AI assistants (typed chat in
 * functions/api/chat.ts and the Gemini Live voice persona in
 * functions/api/voice-token.ts).
 *
 * Single source of truth: both assistants quote ONLY these facts for
 * services, pricing, people, and links. Everything here mirrors published
 * site content (src/data/services.ts, src/data/pricing.ts, /book-a-call).
 * Update this file when the offer changes — never let each assistant drift
 * with its own copy.
 *
 * Keep it compact: every token here ships on every chat turn (system prompt)
 * and on every voice token mint.
 */
export const SITE_FACTS = [
  'Services (details at /services/<slug>):',
  '- Local SEO & Hyper-Local Visibility (/services/local-seo): rank for "near me" and city searches with optimized pages, local schema, and citations across 70+ directories.',
  '- AEO & Generative Engine Optimization, GEO (/services/aeo-geo): get recommended and cited by ChatGPT, Gemini, Perplexity, Claude, and Google AI Overviews.',
  '- Google Maps 3-Pack Growth Engine (/services/google-maps): Google Business Profile overhaul, review velocity, geo-grid tracking to land in the top 3 on Maps.',
  'How we work: hands-on manual work by real people (no automated spam); month-to-month with no long lock-in; typical visible movement in 30-90 days; monthly transparent reporting.',
  'Pricing (published at /pricing — quote these exactly, never invent others): one-time Citation Audit $35, Authority Stack $79, AI & Map Moat $149; monthly retainers $149-$349 (Growth Core $149, Lead Machine $249, Market Dominator $349), all month-to-month, cancel anytime. When asked what prices start at or what is cheapest, lead with the $35 one-time audit.',
  'Next step: a free discovery call at /book-a-call. Contact: hello@renderandrank.com. Founder: Omar Ali.',
  'Honesty: never guarantee #1 rankings or positions; never quote prices beyond the list above — invite a call to scope anything else.',
].join('\n');
