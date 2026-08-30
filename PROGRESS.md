# Progress

## How to use this file

- Update this file at the **end of every session** (or before any likely
  interruption): move items between Done / In progress / Next up, and keep the
  Unapplied migrations list accurate.
- **Read this file first when resuming** work, together with `ARCHITECTURE.md`,
  so you pick up with no lost context.

## Current status

AI Visibility Checker (free-tier Google Gemini + Cloudflare Workers AI) and connected conversion funnel implemented, fully verified in local development with live queries, and migrations 0003 & 0004 applied to both local and remote D1 databases. `GEMINI_API_KEY` secret is active.

## Done

- **Design System & UI/UX Polish (`DESIGN.md` Alignment)**:
  - Added `.stat-xl` token in `src/styles/global.css` and gated `animate-fade-in` with `prefers-reduced-motion: no-preference`.
  - Harmonized homepage pastel color-block rhythm across Hero, Portfolio, AI Diagnostic, and Founder sections.
  - Polished AI Visibility Checker island: 4-phase scanning progress bar, structured entity diagnostics, and accessible typography.
  - Polished ROI Calculator: debounced screen-reader live announcements (`role="status"`), accessible `aria-valuetext` on range sliders, cleaned up form legend accessibility, and improved metric hierarchy.
  - Verified static production build cleanly with 15 routes generated.
- **Security Review & Hardening**: Remediated stored XSS / attribute breakout vulnerabilities in `/admin` dashboard and email generator via OWASP-compliant `esc()` entity encoding; sanitized `mailto:` links with `formatMailto()`; hardened `/api/track-funnel` with KV rate limiting, input format/size validation, and error shielding; secured `conversationId` header reflection in `/api/chat`; transferred Gemini API key from URL queries to `x-goog-api-key` header with prompt input clamping in `/api/check`; enforced size limits on visitor metadata and booking payloads. Built and verified cleanly with Astro static and SSR compilation.
- **AI Visibility Checker & Connected Funnel**: Built free-tier AI search diagnostic (`functions/api/check.ts`) using Google Gemini + Cloudflare Workers AI with KV IP rate limiting (3/day) and Turnstile verification; created `AiVisibilityChecker.tsx` interactive island; added `/check` page and homepage section; added `sessionStorage` (`rr_handoff`) contextual banner in `RoiCalculator.tsx`; created `functions/api/track-funnel.ts` and migration `0004_add_funnel_events.sql`; enriched contact form leads with visitor funnel journey. Verified live on local dev server with real Gemini & Llama 3.1 inference and D1 event logging. Docs updated (`ARCHITECTURE.md`, `docs/ai-visibility-checker.md`, `CHANGELOG.md`).
- Applied migrations 0003 (`0003_add_visitor_metadata.sql`) and 0004 (`0004_add_funnel_events.sql`) to both `--local` and `--remote` D1 databases.
- Set `GEMINI_API_KEY` secret in Cloudflare Pages and `.dev.vars`.
- Cal.com booking embed UI/UX pass: redesigned `/book-a-call` with a wide container (`max-w-5xl`) so the `month_view` scheduler renders in 3 side-by-side columns (Profile & Details on left, Month calendar in middle, Time slots on right); removed the nested `max-height`/`overflow-y: auto` scroll trap from `#cal-inline` so date clicks immediately present available times with zero vertical jumping or hidden slots; structured the 4-step agenda, "No pitch" diagnostic guarantee, and founder contact info in a clean companion section below the scheduler. Docs updated (`ARCHITECTURE.md`, `docs/bookings.md`, `CHANGELOG.md`).
- Replaced emojis with plain text labels in admin dashboard visitor-metadata lines.
- Updated privacy policy (`src/data/legal.ts`): visitor-metadata disclosure, strictly-necessary cookie wording, Dhaka location; Last updated August 29, 2026.
- Added the Bookings section to the admin dashboard.
- Created the documentation system (`ARCHITECTURE.md`, `PROGRESS.md`, `CHANGELOG.md`).
- Fixed Cal.com attendee capture: `CalScript.astro` now uses `bookingSuccessfulV2` and sends the booking `uid`; `functions/api/booking.ts` fetches `GET /v2/bookings/{uid}` (Bearer `CALCOM_API_KEY`, `cal-api-version: 2024-08-13`) best-effort and prefers the fetched attendee name/email/timezone. See `docs/bookings.md`.

## In progress / Next up

- Set `CALCOM_API_KEY` secret (local `.dev.vars` + remote via `npx wrangler pages secret put CALCOM_API_KEY`) and test a real booking end-to-end.
- Optional: Set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` secrets whenever ready to expand to paid ChatGPT / Claude checks.

## Unapplied migrations / manual steps

- None. All migrations (0001–0004) are applied to both local and remote D1 databases.


