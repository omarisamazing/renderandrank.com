/**
 * Cloudflare Pages Function — "book a call" capture endpoint.
 *
 * Route: POST /api/booking  (Pages maps functions/api/booking.ts -> /api/booking)
 *
 * Accepts a small JSON body (name, email, timezone, event_type, plus optional
 * client analytics: referrer, landing_page, utm_*) and persists it, enriched
 * with visitor metadata, into the `bookings` table.
 *
 * Philosophy mirrors chat.ts: persistence is best-effort and NEVER throws into
 * the request. We return `{ ok: true }` (200) even when D1 is unbound or the
 * insert fails, so a storage hiccup never breaks the booking UX.
 *
 * Bindings (configured in wrangler.toml):
 *   DB  (optional) — Cloudflare D1 database. When unbound, storage is skipped.
 */

import { getVisitorMetadata } from '../lib/visitor';

interface Env {
  // Cloudflare D1 binding (configured in wrangler.toml as `DB`).
  DB?: D1Database;
}

interface BookingBody {
  name?: string;
  email?: string;
  timezone?: string;
  event_type?: string;
  // Optional client analytics fields (read by getVisitorMetadata):
  referrer?: string;
  landing_page?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

/** Coerce to a trimmed non-empty string, else null. */
function str(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

/** Persist a booking to D1. Best-effort; swallows errors. */
async function storeBooking(db: D1Database, body: BookingBody, request: Request): Promise<void> {
  const meta = getVisitorMetadata(request, body as Record<string, any>);
  try {
    await db
      .prepare(
        `INSERT INTO bookings
          (name, email, timezone, event_type,
           country, region, city, latitude, longitude, isp,
           device_type, browser, os, language,
           referrer, landing_page,
           utm_source, utm_medium, utm_campaign, utm_term, utm_content,
           ip, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        str(body.name),
        str(body.email),
        // Prefer the client-supplied timezone; fall back to the cf-derived one.
        str(body.timezone) ?? meta.timezone,
        str(body.event_type),
        meta.country,
        meta.region,
        meta.city,
        meta.latitude,
        meta.longitude,
        meta.isp,
        meta.device_type,
        meta.browser,
        meta.os,
        meta.language,
        meta.referrer,
        meta.landing_page,
        meta.utm_source,
        meta.utm_medium,
        meta.utm_campaign,
        meta.utm_term,
        meta.utm_content,
        meta.ip,
        meta.user_agent
      )
      .run();
  } catch (err) {
    console.error('D1 insert booking failed', String(err));
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // Parse the body. A malformed body is still a soft-success from the visitor's
  // perspective — we just don't store anything.
  let body: BookingBody = {};
  try {
    body = ((await request.json()) as BookingBody) || {};
  } catch {
    return json({ ok: true });
  }

  // Best-effort persistence — never throws into the request.
  if (env.DB) {
    await storeBooking(env.DB, body, request);
  }

  return json({ ok: true });
};

// Reject non-POST verbs cleanly (mirror contact.ts).
export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { Allow: 'POST, OPTIONS' } });
  }
  return json({ ok: false, error: 'Method not allowed. Use POST.' }, 405);
};
