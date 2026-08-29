# Progress

## How to use this file

- Update this file at the **end of every session** (or before any likely
  interruption): move items between Done / In progress / Next up, and keep the
  Unapplied migrations list accurate.
- **Read this file first when resuming** work, together with `ARCHITECTURE.md`,
  so you pick up with no lost context.

## Current status

Documentation system in place; the Cal.com attendee-capture fix is implemented, and the booking embed UI/UX + performance pass (month_view, constrained scrollable inline container, preload on site visit) is done. Applying migration 0003 and setting the CALCOM_API_KEY secret are the outstanding items.

## Done

- Cal.com booking embed UI/UX + performance pass: switched embed from `column_view` to `month_view` (compact, scrollable layout) in `CalScript.astro` and `CalInline.astro`; constrained `#cal-inline` (`max-height: min(760px, 85vh)` + `overflow-y: auto`) so it scrolls internally instead of the whole page; added `Cal('preload', { calLink })` on every site visit in `CalScript.astro` to warm the booking page. Docs updated (`ARCHITECTURE.md`, `docs/bookings.md`, `CHANGELOG.md`).
- Replaced emojis with plain text labels in admin dashboard visitor-metadata lines.
- Updated privacy policy (`src/data/legal.ts`): visitor-metadata disclosure, strictly-necessary cookie wording, Dhaka location; Last updated August 29, 2026.
- Added the Bookings section to the admin dashboard.
- Created the documentation system (`ARCHITECTURE.md`, `PROGRESS.md`, `CHANGELOG.md`).
- Fixed Cal.com attendee capture: `CalScript.astro` now uses `bookingSuccessfulV2` and sends the booking `uid`; `functions/api/booking.ts` fetches `GET /v2/bookings/{uid}` (Bearer `CALCOM_API_KEY`, `cal-api-version: 2024-08-13`) best-effort and prefers the fetched attendee name/email/timezone. See `docs/bookings.md`.

## In progress / Next up

- Apply migration 0003 to local and remote D1.
- Set `CALCOM_API_KEY` secret (local `.dev.vars` + remote) and test a real booking end-to-end.
- Verify the `month_view` layout, preload, and constrained inline scroll render correctly in a browser on `/book-a-call` (visual QA).

## Unapplied migrations / manual steps

- [ ] `migrations/0003_add_visitor_metadata.sql` needs to be applied with both `--local` and `--remote`.
