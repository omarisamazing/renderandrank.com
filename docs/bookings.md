# Cal.com Booking Capture

This document describes how bookings made through the Cal.com embed are captured
end to end and surfaced in the admin dashboard.

## Flow

1. **Embed callback:** `src/components/CalScript.astro` registers a Cal.com embed
   callback for the `bookingSuccessful` action and re-dispatches it as a DOM
   event.
2. **Listener + payload:** A listener builds a payload combining visitor/UTM
   context with the booking fields.
3. **Transport:** The payload is POSTed to `/api/booking` via
   `navigator.sendBeacon`, with a `fetch` `keepalive` fallback.
4. **Server insert:** `functions/api/booking.ts` calls `getVisitorMetadata` and
   inserts a row into the `bookings` table.
5. **Dashboard:** `functions/admin/index.ts` renders the **Bookings** section in
   the `/admin` dashboard.

## Known issue / TODO

Attendee `name`, `email`, and `timezone` are likely **NOT captured**.

The Cal.com `bookingSuccessful` embed payload does not expose attendee PII
directly. The current code reads `data.attendeeName`, `attendee.email`, and
`attendee.timeZone`, which are typically **undefined**. The `organizer` object in
the payload is the **host**, not the attendee.

**Fix options:**

- **(a)** Capture `e.detail.data.uid` and fetch the full booking (attendee name,
  email, timeZone) from the Cal.com REST API server-side:
  `GET /v2/bookings/{uid}`.
- **(b)** Use redirect query parameters to receive attendee details.

Also consider migrating to the newer `bookingSuccessfulV2` action.

**Note:** event type extraction via `e.detail.data.eventType.slug` **does work**.

## Migration requirement

Bookings only appear in the dashboard after **migration 0003** is applied to the
D1 database (both **local** and **remote**).
