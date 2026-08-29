# Cal.com Booking Capture

This document describes how bookings made through the Cal.com embed are captured
end to end and surfaced in the admin dashboard, and how the embed is presented
(month_view layout, preload-on-visit, and the constrained scrollable container).

## Flow

1. **Embed callback:** `src/components/CalScript.astro` registers a Cal.com embed
   callback for the `bookingSuccessfulV2` action (with a legacy
   `bookingSuccessful` listener kept as a fallback) and re-dispatches it as a DOM
   event.

> **Embed layout & performance.** The scheduler renders with the `month_view`
> layout (a compact month grid with a self-contained scrollable time-slot
> column) — configured in both `CalScript.astro` (`ui`) and `CalInline.astro`
> (inline `config`). `CalScript.astro` is mounted site-wide via `Layout.astro`
> and calls `Cal('preload', { calLink })` on every page visit, so the booking
> iframe is warmed before the visitor reaches `/book-a-call`. The inline
> `#cal-inline` container is constrained (`max-height: min(760px, 85vh)` +
> `overflow-y: auto`) so a tall widget scrolls inside the container instead of
> forcing the whole page to scroll; the `minHeight`/noscript fallback is kept.

2. **Listener + payload:** A listener builds a payload combining visitor/UTM
   context with the booking `uid` (from `e.detail.data.uid`) and `event_type`
   (from `e.detail.data.eventType.slug`). The client no longer tries to read the
   attendee name/email, which the embed payload does not expose reliably.
3. **Transport:** The payload is POSTed to `/api/booking` via
   `navigator.sendBeacon`, with a `fetch` `keepalive` fallback.
4. **Server enrichment + insert:** `functions/api/booking.ts` parses the body,
   and when both a booking `uid` and the `CALCOM_API_KEY` secret are present it
   fetches the authoritative booking from the Cal.com REST API
   (`GET https://api.cal.com/v2/bookings/{uid}`) and extracts the first
   attendee's `name`, `email`, and `timeZone`. It then calls
   `getVisitorMetadata` and inserts a row into the `bookings` table, preferring
   the server-fetched attendee fields over the client body.
5. **Dashboard:** `functions/admin/index.ts` renders the **Bookings** section in
   the `/admin` dashboard.

## Attendee capture — IMPLEMENTED

Attendee `name`, `email`, and `timezone` are now captured server-side.

The Cal.com embed payload does not expose attendee PII reliably, so the client
only forwards the booking `uid` (plus the trivially-available `event_type` and
timezone as a harmless fallback). The server uses the `uid` to fetch the full
booking from the Cal.com REST API and reads the real attendee details from it.

**Server fetch details (`functions/api/booking.ts`):**

- Endpoint: `GET https://api.cal.com/v2/bookings/{uid}`.
- Headers: `Authorization: Bearer ${CALCOM_API_KEY}`,
  `cal-api-version: 2024-08-13`, `Accept: application/json`.
- Response envelope `{ status, data: { attendees:[{name,email,timeZone}],
  responses?, eventType?:{slug}, start } }`. The first attendee is used, with a
  `responses.*` fallback for name/email and `data.eventType.slug` for the event
  type.
- Best-effort: the fetch runs inside try/catch and **never throws**. On a
  missing key, non-2xx response, or any error it logs and inserts with whatever
  data is available. The endpoint always returns `{ ok: true }`.

**Requirement:** set the `CALCOM_API_KEY` secret. Locally add it to `.dev.vars`
(see `.dev.vars.example`); remotely add it as an encrypted Pages Secret
(`wrangler pages secret put CALCOM_API_KEY`). Without the key the booking is
still stored, but only with the visitor/UTM context and event type.

**Note:** event type extraction via `e.detail.data.eventType.slug` also works.

## Embed layout, preload & responsive container — IMPLEMENTED

- **Layout (`month_view`):** the embed uses `layout: 'month_view'` in both
  `CalScript.astro` (`ui`) and `CalInline.astro` (inline `config`) for a 3-column
  desktop layout (Event details / Month calendar grid / Side-by-side time slots).
- **Preload on site visit:** `CalScript.astro` is mounted site-wide from
  `Layout.astro` and, right after the `ui` config, calls
  `Cal.ns[namespace]('preload', { calLink: siteConfig.calCom.eventLink })`. This
  fire-and-forget call warms the booking iframe on every page visit so
  `/book-a-call` loads faster.
- **Wide responsive container & zero scroll trap:** on `/book-a-call`, the scheduler
  sits inside a dedicated `max-w-5xl` card, giving the iframe enough horizontal
  width (>= 900px) to render the 3 columns side-by-side. The inline `#cal-inline`
  container sets `min-height: 620px; width: 100%;` without any restrictive
  `max-height` or nested `overflow-y: auto`, preventing scroll traps and allowing
  instant date-to-timeslot selection without page jumping.
- **Structured companion section:** the 4-step agenda ("On the call"), "No pitch"
  guarantee, and founder contact info sit cleanly below the scheduler card.

## Migration requirement

Bookings only appear in the dashboard after **migration 0003** is applied to the
D1 database (both **local** and **remote**).
