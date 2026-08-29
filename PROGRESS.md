# Progress

## How to use this file

- Update this file at the **end of every session** (or before any likely
  interruption): move items between Done / In progress / Next up, and keep the
  Unapplied migrations list accurate.
- **Read this file first when resuming** work, together with `ARCHITECTURE.md`,
  so you pick up with no lost context.

## Current status

Documentation system in place; migration 0003 and the Cal.com attendee-capture fix are the outstanding items.

## Done

- Replaced emojis with plain text labels in admin dashboard visitor-metadata lines.
- Updated privacy policy (`src/data/legal.ts`): visitor-metadata disclosure, strictly-necessary cookie wording, Dhaka location; Last updated August 29, 2026.
- Added the Bookings section to the admin dashboard.
- Created the documentation system (`ARCHITECTURE.md`, `PROGRESS.md`, `CHANGELOG.md`).

## In progress / Next up

- Apply migration 0003 to local and remote D1.
- Fix Cal.com attendee capture (name / email / timezone). See `docs/bookings.md`.

## Unapplied migrations / manual steps

- [ ] `migrations/0003_add_visitor_metadata.sql` needs to be applied with both `--local` and `--remote`.
