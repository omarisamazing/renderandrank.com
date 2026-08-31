# SEO & Site Audit — 2026-08-30

A snapshot of the site's SEO surface, the OpenSEO MCP toolkit available to us, and a
prioritized improvement plan. **Read this before doing SEO work** so the audit does not
have to be repeated.

Audited at `master` @ `b0c409d`. Method: direct file reads. No OpenSEO credits were spent.

---

## The short version

Build quality is high. The site has **no acquisition surface** — all 15 pages are
bottom-funnel, so nothing can rank except the brand name and there is no prose for an AI
engine to quote. Separately, the JSON-LD declares a street-level Dhaka presence with
opening hours, which is the wrong entity shape for a remote provider selling into the
US/UK/EU.

---

## 1. OpenSEO MCP access

| | |
|---|---|
| Account | `omaristtoll@gmail.com`, **hosted** mode |
| Scopes | `mcp`, `offline_access` |
| Credits remaining | **443** (2026-08-30) |
| Project | `93d07ddd-a418-4a8f-be09-7b55e8d0a089` "Default" — **`domain: null`**, `locationCode: 2840` (US), `languageCode: en` |
| Dashboard | https://app.openseo.so/p/93d07ddd-a418-4a8f-be09-7b55e8d0a089 |

The project has **no domain set**. Setting one is free (no DataForSEO call).

### Credit economics

Credits are cost-of-goods, and 443 is a small tank. Published rough costs:

| Call | Cost |
|---|---|
| `get_serp_results` | ~5 / keyword at depth 20; +2.5 per extra 10 depth |
| `research_keywords` | ~30–100 / seed (flat ~96 in Google-Ads-only countries) |
| `get_domain_overview` / `get_ranked_keywords` | ~100–300 |
| `get_backlinks_overview` | ~50 domain / ~25 single page |
| `get_backlinks_profile` | ~30 / page of rows |
| `get_local_rank_grid` | `gridSize²` local SERP calls (3×3 = 9, 5×5 = 25) |
| `get_keyword_metrics` | per call, up to 700 keywords — **best value per keyword**; doubles with `includeClickstreamData` |

Confirm the local-SERP unit cost with a small call or `estimate_rank_tracker_cost` before
committing to a batch. The MCP server asks for confirmation above 2,000 credits.

### Free — zero credits, currently unused

- **`run_site_audit`** → `get_audit_status` → `get_audit_issues` / `get_audit_pages`.
  Crawls the site and returns prioritized issues, **each with a `how_to_fix` field**.
  Optional Lighthouse pass via `runLighthouse: true`.
- **Google Search Console** — `get_search_console_performance`, `inspect_urls` (index
  state, Google-selected canonical, rich-result verdicts; 10 URLs/call).
- **GA4** — organic overview, landing pages, key events, traffic acquisition, measurement health.
- **`get_search_opportunities`** — joins GSC positions 4–20 against GA4 outcomes and scores
  them by demand × business value × reachability. The best "what do I do Monday" report here.
- **`get_project_context` / `update_project_context`** — shared memory (positioning,
  competitors, key pages, research log) that grounds future sessions.
- `save_keywords`, `list_saved_keywords`, `list_business_categories`, `create_project`.

### Paid — and why it fits this business

The local suite maps directly onto what Render and Rank sells:

- **`get_local_rank_grid`** — runs a Maps search at every point of a grid around a
  coordinate and reports the target's rank at each point, plus each point's result count
  and #1 business. **This is the advertised "Free 24-Hour Geo-Grid Audit" as one API call.**
- **`search_local_businesses`** with `isClaimed: false` — unclaimed Google Business
  Profiles near a coordinate: a cold-outreach list filtered to businesses with a provable problem.
- **`get_business_profile`** — categories, rating, review count, claimed status, hours, photos.
- **`get_business_reviews`** — includes whether the owner replied → unanswered-review gap analysis.
- **`get_business_updates`** — GBP posting cadence and recency.
- **`get_google_business_questions`** — unanswered Q&A.
- **`get_local_serp_results`** — one Maps / Local Finder SERP, with `cid` and `place_id` per
  row to feed the tools above as precise identifiers.

Research stack: `research_keywords`, `get_keyword_metrics`, `get_serp_results`,
`get_domain_overview`, `get_ranked_keywords`, `find_serp_competitors`,
`get_backlinks_overview`, `get_backlinks_profile`, and rank tracking
(`create_rank_tracker` → `estimate_rank_tracker_cost` → `run_rank_tracker`; **always
estimate and get approval before running**).

Both halves of the business run on this: the free audit that opens conversations, and the
fulfillment that gets billed.

---

## 2. Current SEO surface

### Head and meta

All head handling is **inline in `src/layouts/Layout.astro`** — there is no separate
`BaseHead` / `SEO` component. Props (`Layout.astro:40-50`): `title`, `description`,
`canonical` (default `Astro.url.href`), `image` (default `/og-cover.png`, resolved
absolute), `keywords`, `showBookingPrompt`, `noindex`. Extend this interface rather than
adding a new SEO component.

Present: canonical, per-page description, per-page `keywords` (obsolete, harmless), Open
Graph (`og:type` hardcoded `website`, url/title/description/image/site_name), Twitter
`summary_large_image`, favicons + manifest, `theme-color`, `color-scheme: light`,
`preconnect` to `app.cal.com`, `preload` of `/fonts/fuuld.woff2`, skip link
(`Layout.astro:181-186`).

`<html lang="en">` is hardcoded. No `hreflang`, no `x-default`.

### JSON-LD emitted today

| Schema | Defined in | Appears on |
|---|---|---|
| `@graph`: **ProfessionalService** (`@id` `/#business`) + **WebSite** (`@id` `/#website`) | `Layout.astro:66-118` | all 15 pages |
| **FAQPage** (the 6 global FAQs) | `FaqSection.astro:9-17` | `/`, `/pricing/`, `/services/` |
| **Service** + **FAQPage** (2 service-specific Qs) | `ServiceDetail.astro:31-59` | the 3 `/services/*` pages |

Nested in the graph: `PostalAddress`, `Country`×4, `Place`,
`OpeningHoursSpecification` (Mon–Fri 09:00–18:00), `Person` (founder + `jobTitle`),
`sameAs`[7], `logo`, `image`, `slogan`, `telephone`, `email`, `priceRange: '$$'`.

### Crawl and AEO files

- `public/robots.txt` — hand-written, **explicitly `Allow: /` for GPTBot, ChatGPT-User,
  OAI-SearchBot, PerplexityBot, ClaudeBot, anthropic-ai, Google-Extended, Bingbot**, plus
  `Sitemap: https://renderandrank.com/sitemap-index.xml`.
- `public/llms.txt` (48 lines) and `public/llms-full.txt` (50 lines) — well-built AEO
  knowledge bundles. Neither is referenced from `robots.txt` or a `<link>` tag; discovery
  relies on convention.
- `@astrojs/sitemap` (`astro.config.mjs:20-25`) — `changefreq: 'weekly'`, `priority: 0.7`,
  `lastmod: new Date()`. Emits 14 URLs (404 excluded).
- **No RSS** — no `@astrojs/rss`, no feed route. Consistent with there being no blog.

### Routes — 15 pages, zero dynamic routes, zero content collections

`/`, `/about/`, `/services/`, `/services/local-seo/`, `/services/aeo-geo/`,
`/services/google-maps/`, `/pricing/`, `/portfolio/`, `/check/`, `/calculator/`,
`/book-a-call/`, `/contact/`, `/terms/`, `/privacy/`, `/404`.

No `getStaticPaths` anywhere. `src/content/` and `src/content.config.ts` do not exist and
there are no Zod schemas in the repo — content lives in plain TS modules under `src/data/`:

| File | Entries |
|---|---|
| `services.ts` | **3** — `local-seo`, `aeo-geo`, `google-maps` |
| `pricing.ts` | **6** — 3 one-time, 3 monthly |
| `portfolio.ts` | **4** — Apex HVAC/Austin TX, Lumina Dental/Denver CO, Vanguard Legal/Phoenix AZ, Ironclad Roofing/Tampa FL |
| `faqs.ts` | **6** |
| `testimonials.ts` | ~4, each with a `metric` |
| `legal.ts` | **2** — terms, privacy |

### Positioning constraint that shapes all SEO strategy

The business is **based in Dhaka, Bangladesh and is not itself a local business** — it is a
remote provider *of* local SEO to US/UK/EU service businesses (HVAC, roofing, dental,
personal-injury law, multi-location). `siteConfig.contact.address` is
`"Dhaka, Bangladesh — serving the USA, UK & Europe (US virtual office)"`.

**There is no target city for the agency itself.** That rules out the obvious local-SEO
play for its own site and makes **industry × service** the defensible pSEO axis, not city pages.

### Dormant i18n scaffolding — not a bug

`src/i18n/ui.ts` holds **fully translated UI strings for 7 locales** (en, es, fr, de, it,
pt, nl) covering hero, footer and ROI calculator. But `getLangFromUrl`
(`src/i18n/utils.ts:3-7`) reads the first path segment and **no localized routes exist**, so
it always returns `'en'`. There is no `i18n` block in `astro.config.mjs`. The translations
are written but unreachable — shipping them is a routing change, not a copywriting one.

---

## 3. Findings

### P0 — No acquisition surface

All 15 pages are commercial-intent. No blog, no informational content, no indexable case
studies, no RSS. Consequences:

- Nothing can rank except the brand name. Bottom-funnel terms ("local SEO agency") are
  unwinnable without authority the site has no mechanism to build.
- **`llms.txt` cannot carry AEO alone.** LLM citation comes overwhelmingly from being quoted
  in crawled prose. `llms.txt` helps engines *understand* the site once found; it does not
  get it found. The AEO investment is half-built.
- Nothing to earn links with.
- For an SEO agency this is a **credibility** problem as much as a traffic one.

### P0 — Schema declares a Dhaka local business

`Layout.astro:70-92` emits `ProfessionalService` with a Dhaka `PostalAddress`
(`addressLocality: 'Dhaka', addressCountry: 'BD'`) and an `OpeningHoursSpecification` —
LocalBusiness-shaped markup for a company with no walk-in location. It plants a `BD`
address in the entity graph while the site sells to US/UK/EU buyers.

**Open decision.** Options: (a) switch to `Organization`, drop `PostalAddress` +
`openingHours`, keep `areaServed` — honest, and stops Google resolving the site as a Dhaka
local business; (b) keep as-is for maximum transparency; (c) put the US virtual office in
schema — note virtual offices violate Google Business Profile guidelines if a GBP listing
is ever pursued.

### P1 — The 4 case studies have no URLs

`src/data/portfolio.ts` holds 4 metric-rich, city-specific before/after stories reachable
**only as cards** on `/portfolio` and `/`. There is no `/portfolio/[slug]` route. These
should be the strongest pages on the site and are currently worth nothing in search.

### P1 — The AI Visibility Checker is buried

`/check` (island `AiVisibilityChecker.tsx`, backed by `functions/api/check.ts`, which
prompts Gemini / Workers AI with `"What are the best ${category} providers in ${city}?"` and
derives deal value via `estimateIndustryMetrics`) is the best growth asset here — a free
tool that tells someone ChatGPT does not recommend them is a link magnet and a lead capture
in one. It is currently one nav item, with no `SoftwareApplication` schema and no shareable result.

### P2 — Concrete defects

| # | Defect | Location |
|---|---|---|
| 1 | Identical 6-question **FAQPage duplicated verbatim across 3 URLs** | `FaqSection.astro:9-17` on `/`, `/pricing/`, `/services/` |
| 2 | **`areaServed` conflict** — `'United States'` vs the graph's US/GB/DE/FR/Europe | `ServiceDetail.astro:42` vs `Layout.astro:86-92` |
| 3 | `Service` blocks don't reference the business `@id` — disconnected from the graph | `ServiceDetail.astro:31-59` |
| 4 | No **`Offer`/`AggregateOffer`** despite fully published prices | `/pricing`, `src/data/pricing.ts` |
| 5 | No **`BreadcrumbList`** anywhere — `/services/*` is two levels deep | site-wide |
| 6 | No **`Review`/`AggregateRating`** despite `src/data/testimonials.ts` | `TestimonialsSection.astro` |
| 7 | No `SoftwareApplication` for the two free tools | `/check`, `/calculator` |
| 8 | Sitemap **`lastmod` is build time for every URL** — no real freshness signal | `astro.config.mjs:20-25` |
| 9 | Dormant 7-locale i18n: strings, no routes, no `hreflang`, hardcoded `lang="en"` | `src/i18n/`, `astro.config.mjs` |
| 10 | `noindex` prop exists but is unused; `/terms` + `/privacy` are indexed and in the sitemap | `Layout.astro:157`, `src/data/legal.ts:11` |
| 11 | Missing `og:locale`, `og:image:alt`, `og:image:width/height`, `twitter:site`/`creator` | `Layout.astro:159-169` |
| 12 | `llms.txt` / `llms-full.txt` not referenced from `robots.txt` or a `<link>` tag | `public/robots.txt` |
| 13 | **Two conflicting taglines** — `siteConfig.tagline` vs `llms-full.txt`'s "Local search engineering for businesses that depend on calls." | `src/config/site.ts:72`, `public/llms-full.txt` |
| 14 | Retainer names drift between data and UI ("Local Growth Core" vs "Growth Core") | `pricing.ts` vs `pricing.astro:10-11` |

### Already good — do not "fix" these

Font subsetting with explicit `unicode-range` (`Layout.astro:18-38`); the `public/_headers`
security posture (CSP `connect-src` now allows the Gemini Live WebSocket
`wss://generativelanguage.googleapis.com`, and `Permissions-Policy` grants same-origin
microphone `microphone=(self)` for the browser voice assistant; all other directives
unchanged); the AI-crawler allowlist in `robots.txt`; both `llms.txt` files;
`prefetchAll`; the skip link; the disciplined color-block rhythm.

---

## 4. Plan

### Phase 0 — Free OpenSEO setup (zero credits, do first)

1. Set `domain: renderandrank.com` on project `93d07ddd-…` (or `create_project`).
2. `update_project_context` — business overview, current goal, positioning, writing
   preferences (point at `DESIGN.md`), competitors, key pages. This is the memory that stops
   future sessions re-deriving section 2 of this file.
3. `run_site_audit` on `https://renderandrank.com` (`maxPages: 50`) → `get_audit_status` →
   `get_audit_issues`.
4. **Verify the domain in Google Search Console and connect it to OpenSEO** — highest-value
   free data source. Then `get_search_console_performance` and `get_search_opportunities`.
5. Connect GA4 if a property exists.

### Phase 1 — Schema and technical fixes (~1 day, no new content)

Close defects 1–14. Highest-value subset: render `FaqSection`'s JSON-LD **only on `/`** (1);
resolve `areaServed` (2); wire `Service` → business `@id` (3); `AggregateOffer` on
`/pricing` (4); `BreadcrumbList` on `/services/*` (5); `AggregateRating` + `Review` (6);
`SoftwareApplication` on `/check` and `/calculator` (7); reconcile taglines (13).

Head handling is centralized in `Layout.astro`, so most of this is one file plus two section
components.

### Phase 2 — Content engine

1. **Content collections** — `src/content.config.ts` with a `blog` collection (title,
   description, publishDate, updatedDate, author, topic, canonical?, draft). See
   https://docs.astro.build/en/guides/content-collections/.
2. **Case-study pages** — `/portfolio/[slug]` via `getStaticPaths` over
   `src/data/portfolio.ts`, modeled on `ServiceDetail.astro`. Add `Article` + `Review`
   schema. 4 pages, near-zero new copy.
3. **Industry × service pages** — "Local SEO for HVAC Companies", "…for Dentists", "…for
   Roofers", "…for Personal Injury Lawyers". Matches the 4 case studies exactly and each can
   carry a real per-industry playbook. **Preferred over city pages**, where a Dhaka-based
   provider would compete with actual local agencies on thin content.
4. **Make `/check` an acquisition asset** — landing page targeting "AI visibility checker" /
   "does ChatGPT recommend my business", `SoftwareApplication` schema, shareable result URL.
5. Add RSS (`@astrojs/rss`) once the blog exists; add real per-page `lastmod`.

### Phase 3 — Optional

- Ship the dormant 7-locale i18n as real routes + `hreflang` (routing only — copy exists).
- Client-facing geo-grid deliverable built on `get_local_rank_grid`.
- Prospecting flow on `search_local_businesses` + `isClaimed: false`.

---

## 5. Verification

- `astro dev --background`, then `astro dev logs` (per `CLAUDE.md` — never foreground).
- `astro build` stays clean; confirm the `dist/sitemap-0.xml` URL count changes as expected.
- Run built HTML through Google's Rich Results Test and the schema.org validator for every
  schema change.
- After deploy: `inspect_urls` (free) on new URLs to confirm index state and Google-selected
  canonical.
- `run_site_audit` again (free) and diff `get_audit_issues` against the Phase 0 baseline.
- Check `DESIGN.md:519-527` Don'ts against any new page — especially rule 4 (never two color
  blocks in one viewport) and rule 1 (no mid-gray body text).

---

## 6. Open decisions

1. **Entity shape** — `Organization` vs keep `ProfessionalService` + Dhaka address (P0 above).
2. **Phase order** — fixes first, or straight to content?
3. **Credit budget** — how much of the 443 goes to research vs reserved for client work.
4. **Is the site live and verified in Search Console?** Determines whether Phase 0 step 4 is
   "connect it" or "verify it first".
5. Industry pages vs city pages for the pSEO axis (recommendation: industry).
