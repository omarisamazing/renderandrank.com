# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Server-side visitor metadata capture and the `bookings` table (migration 0003).
- Bookings section in the admin dashboard.

### Changed

- Admin visitor-metadata line now uses professional text labels (emojis removed).
- Privacy policy discloses visitor metadata and fixes cookie/location wording (Last updated August 29, 2026).

### Fixed

- Cal.com booking capture now fetches attendee name/email/timezone server-side via booking uid GET /v2/bookings/{uid}, bookingSuccessfulV2; requires CALCOM_API_KEY secret.
- Each Cal.com booking created a duplicate blank row because both the bookingSuccessful and bookingSuccessfulV2 events fired; the client now coalesces them (600ms debounce, prefer the uid-bearing payload, guard on last-sent uid) into a single enriched beacon per booking.
- Admin dashboard showed booking (and other) timestamps shifted by the dev server's local timezone offset. created_at is now stored as UTC ISO-8601, and the admin time formatter normalizes legacy space-separated datetime('now') values to UTC before formatting, so times render correctly regardless of the server's timezone.
