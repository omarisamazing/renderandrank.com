# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Admin AI-check summary UI & table search/filter** (`functions/admin/index.ts`, `public/admin-ai-filter.js`):
  - KPI stat-card grid summarising the logged AI Visibility Checker runs (total checks, average visibility, invisibility counts).
  - Ranked-list panels with count/score badges and truncated competitor/entity lists (full values on hover).
  - Client-side table search/filter: a `#ai-check-search` box above the `#ai-check-table` AI-check table; a dependency-free, CSP-safe same-origin script (`public/admin-ai-filter.js`, loaded via `<script src="/admin-ai-filter.js" defer>`) case-insensitively shows/hides `<tbody>` rows and displays a "No matching checks" row when nothing matches.
- **Admin dashboard filters & clearer subtitles** (`functions/admin/index.ts`, `public/admin-filters.js`): reworded the Conversations, AI Checker, and Bookings section subtitles to describe the business decision each supports; added a search box plus a categorical filter to the Leads (Service), Conversations (Status), and Bookings (Event type) tables, wired by a dependency-free, CSP-safe shared script `public/admin-filters.js` (`<script src="/admin-filters.js" defer>`) that filters rows and keeps expandable Conversations detail rows in sync.

- `docs/seo-audit.md` — SEO and site audit snapshot: the OpenSEO MCP toolkit and its credit costs, the site's current SEO surface (routes, JSON-LD graph, `robots.txt`/`llms.txt`, sitemap), 14 catalogued defects with `file:line` references, and a phased improvement plan. Written so the audit does not have to be repeated.
- **Security & Hardening**:
  - Upgraded HTML escaping across `functions/admin/index.ts` and `functions/api/contact.ts` to full OWASP entity encoding (`&`, `<`, `>`, `"`, `'`) to prevent attribute breakout and stored XSS in the admin dashboard and email templates.
  - Sanitized `mailto:` href attributes with `formatMailto()` to prevent URI control character injection.
  - Hardened `/api/track-funnel` with IP rate limiting via KV, input format checks (`visitorId`, `eventType`), 8KB payload caps, and database error shielding.
  - Validated `conversationId` against regex `/^[a-zA-Z0-9_-]{1,64}$/` in `functions/api/chat.ts` to prevent HTTP response splitting in `X-Conversation-Id` headers.
  - Shifted Google Gemini API key transport from URL query parameters to the `x-goog-api-key` header in `functions/api/check.ts` and added input length clamping on business diagnostic queries.
  - Added input length bounds to visitor metadata analytics parameters and `/api/booking` payloads.
  - Enhanced admin dashboard reverse-proxy HTTPS detection via `x-forwarded-proto` and `cf-visitor` headers.
- **AI Visibility Checker (`/check`) & Funnel**: Real-time AI search diagnostic checking whether local businesses are recommended by Google Gemini (free-tier with live Google Search grounding) and Cloudflare Workers AI, with progressive support for OpenAI / Anthropic.
- **Connected Conversion Funnel**: Seamless `sessionStorage` (`rr_handoff`) context banner in the ROI Calculator showing the lost revenue gap, `POST /api/track-funnel` endpoint, and D1 `funnel_events` table (migration 0004).
- **Contact Lead Enrichment**: Contact/audit form submissions now automatically append prior visitor funnel events (AI search results, calculator inputs) into lead emails and D1 storage.
- Server-side visitor metadata capture and the `bookings` table (migration 0003).
- Bookings section in the admin dashboard.
- `Cal('preload')` on every site visit (fired from the site-wide `CalScript.astro`) so the booking page/iframe is warmed before the visitor reaches /book-a-call, speeding up the booking page.

### Changed

- **Auto-Calibrated ROI Calculator Bridge & Conversion Copywriting**:
  - Bridged the AI Visibility Checker directly into the ROI Calculator: scanning a business automatically calibrates the calculator's sliders with realistic industry ticket sizes ($45 for retail/candy, $2,400 for HVAC, $750 for plumbing, $3,500 for legal/dental) and pre-sets the baseline rank based on whether AI cited the business.
  - Replaced technical AI buzzwords with plain-English business metrics (Calls Lost to Competitors, Monthly Demand, Revenue Gap).
  - Cleaned up competitor findings and removed unconfigured placeholders for a distraction-free editorial experience.
- **Overhauled AI Visibility Checker UI/UX (`DESIGN.md` conformance)**:
  - Fixed button contrast across the entire checker island using `buttonVariants({ variant: 'primary' })` (`bg-ink text-canvas hover:bg-[#1f1f1f]`) and `buttonVariants({ variant: 'secondary' })` with crisp typography.
  - Eliminated monospace overuse: form labels, headings, quotes, and body copy now use clean `figmaSans` (Inter), reserving `font-mono` exclusively for category taxonomy eyebrows per `DESIGN.md`.
  - Replaced generic scan outcomes with a **Rich KPI Diagnostic Dashboard**: computed Visibility Score (0–100), Current AI Rank position, Top Competing Entities Identified, Estimated Monthly Revenue Gap, and Local Entity Signal Audit matrix.
  - Implemented a 4-phase live animated scanner checklist with real-time percentage progress bar during generative search queries.
  - Polished the `/calculator` pre-check and handoff banners with pastel block styling and proper pill CTA buttons.

- Redesigned `/book-a-call` with a wide (`max-w-5xl`) container for the Cal.com embed, allowing the `month_view` scheduler to render in full 3-column desktop mode (Host profile/details, Month grid, and side-by-side Time slots), so date clicks immediately display available times next to the calendar without vertical page jumping or hidden slots.
- Removed the restrictive `max-height` and nested `overflow-y: auto` scroll trap on `#cal-inline`, giving the scheduler clean responsive auto-height.
- Re-architected `/book-a-call` companion section: structured the 4-step diagnostic agenda ("On the call"), "No pitch" guarantee badge, and founder direct contact methods below the scheduler.
- Admin visitor-metadata line now uses professional text labels (emojis removed).
- Privacy policy discloses visitor metadata and fixes cookie/location wording (Last updated August 29, 2026).

### Fixed

- Cal.com booking capture now fetches attendee name/email/timezone server-side via booking uid GET /v2/bookings/{uid}, bookingSuccessfulV2; requires CALCOM_API_KEY secret.
- Each Cal.com booking created a duplicate blank row because both the bookingSuccessful and bookingSuccessfulV2 events fired; the client now coalesces them (600ms debounce, prefer the uid-bearing payload, guard on last-sent uid) into a single enriched beacon per booking.
- Admin dashboard showed booking (and other) timestamps shifted by the dev server's local timezone offset. created_at is now stored as UTC ISO-8601, and the admin time formatter normalizes legacy space-separated datetime('now') values to UTC before formatting, so times render correctly regardless of the server's timezone.
