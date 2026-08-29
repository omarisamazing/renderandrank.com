# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **AI Visibility Checker (`/check`) & Funnel**: Real-time AI search diagnostic checking whether local businesses are recommended by Google Gemini (free-tier with live Google Search grounding) and Cloudflare Workers AI, with progressive support for OpenAI / Anthropic.
- **Connected Conversion Funnel**: Seamless `sessionStorage` (`rr_handoff`) context banner in the ROI Calculator showing the lost revenue gap, `POST /api/track-funnel` endpoint, and D1 `funnel_events` table (migration 0004).
- **Contact Lead Enrichment**: Contact/audit form submissions now automatically append prior visitor funnel events (AI search results, calculator inputs) into lead emails and D1 storage.
- Server-side visitor metadata capture and the `bookings` table (migration 0003).
- Bookings section in the admin dashboard.
- `Cal('preload')` on every site visit (fired from the site-wide `CalScript.astro`) so the booking page/iframe is warmed before the visitor reaches /book-a-call, speeding up the booking page.

### Changed

- Redesigned `/book-a-call` with a wide (`max-w-5xl`) container for the Cal.com embed, allowing the `month_view` scheduler to render in full 3-column desktop mode (Host profile/details, Month grid, and side-by-side Time slots), so date clicks immediately display available times next to the calendar without vertical page jumping or hidden slots.
- Removed the restrictive `max-height` and nested `overflow-y: auto` scroll trap on `#cal-inline`, giving the scheduler clean responsive auto-height.
- Re-architected `/book-a-call` companion section: structured the 4-step diagnostic agenda ("On the call"), "No pitch" guarantee badge, and founder direct contact methods below the scheduler.
- Admin visitor-metadata line now uses professional text labels (emojis removed).
- Privacy policy discloses visitor metadata and fixes cookie/location wording (Last updated August 29, 2026).

### Fixed

- Cal.com booking capture now fetches attendee name/email/timezone server-side via booking uid GET /v2/bookings/{uid}, bookingSuccessfulV2; requires CALCOM_API_KEY secret.
- Each Cal.com booking created a duplicate blank row because both the bookingSuccessful and bookingSuccessfulV2 events fired; the client now coalesces them (600ms debounce, prefer the uid-bearing payload, guard on last-sent uid) into a single enriched beacon per booking.
- Admin dashboard showed booking (and other) timestamps shifted by the dev server's local timezone offset. created_at is now stored as UTC ISO-8601, and the admin time formatter normalizes legacy space-separated datetime('now') values to UTC before formatting, so times render correctly regardless of the server's timezone.
