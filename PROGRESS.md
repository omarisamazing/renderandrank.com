# Progress

## How to use this file

- Update this file at the **end of every session** (or before any likely
  interruption): move items between Done / In progress / Next up, and keep the
  Unapplied migrations list accurate.
- **Read this file first when resuming** work, together with `ARCHITECTURE.md`,
  so you pick up with no lost context.

## Current status

Documentation system in place; the Cal.com attendee-capture fix is implemented, and the booking embed UI/UX pass is complete (wide 3-column month_view layout matching bycrawford.com reference with zero scroll traps, preload on site visit, and cleanly structured agenda & guarantee companion section). Applying migration 0003 and setting the CALCOM_API_KEY secret are the outstanding items.

## Done

- Cal.com booking embed UI/UX pass: redesigned `/book-a-call` with a wide container (`max-w-5xl`) so the `month_view` scheduler renders in 3 side-by-side columns (Profile & Details on left, Month calendar in middle, Time slots on right); removed the nested `max-height`/`overflow-y: auto` scroll trap from `#cal-inline` so date clicks immediately present available times with zero vertical jumping or hidden slots; structured the 4-step agenda, "No pitch" diagnostic guarantee, and founder contact info in a clean companion section below the scheduler. Docs updated (`ARCHITECTURE.md`, `docs/bookings.md`, `CHANGELOG.md`).
- Replaced emojis with plain text labels in admin dashboard visitor-metadata lines.
- Updated privacy policy (`src/data/legal.ts`): visitor-metadata disclosure, strictly-necessary cookie wording, Dhaka location; Last updated August 29, 2026.
- Added the Bookings section to the admin dashboard.
- Created the documentation system (`ARCHITECTURE.md`, `PROGRESS.md`, `CHANGELOG.md`).
- Fixed Cal.com attendee capture: `CalScript.astro` now uses `bookingSuccessfulV2` and sends the booking `uid`; `functions/api/booking.ts` fetches `GET /v2/bookings/{uid}` (Bearer `CALCOM_API_KEY`, `cal-api-version: 2024-08-13`) best-effort and prefers the fetched attendee name/email/timezone. See `docs/bookings.md`.

## In progress / Next up

- Apply migration 0003 to local and remote D1 (`npm run db:migrate:local` / `npm run db:migrate:remote`).
- Set `CALCOM_API_KEY` secret (local `.dev.vars` + remote) and test a real booking end-to-end.
- Run `npm run dev:local` for local environment testing.

## Unapplied migrations / manual steps

- [ ] `migrations/0003_add_visitor_metadata.sql` needs to be applied with both `--local` and `--remote`.
