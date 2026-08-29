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
  // Cal.com REST API key (secret; local via `.dev.vars`, remote via
  // `wrangler secret put CALCOM_API_KEY`). When present, the booking `uid` is
  // used to fetch the real attendee details server-side.
  CALCOM_API_KEY?: string;
  // Optional KV namespace for IP rate limiting (bound as `RATE_LIMIT` in wrangler.toml)
  RATE_LIMIT?: KVNamespace;
}

interface BookingBody {
  name?: string;
  email?: string;
  timezone?: string;
  event_type?: string;
  // Cal.com booking uid, captured client-side from the embed event. When set,
  // the server fetches authoritative attendee details from the Cal REST API.
  uid?: string;
  // Optional client analytics fields (read by getVisitorMetadata):
  referrer?: string;
  landing_page?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_SECONDS = 600;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

/** Coerce to a trimmed non-empty string with maximum length cap, else null. */
function str(value: unknown, maxLength = 250): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s.length) return null;
  return s.length > maxLength ? s.slice(0, maxLength) : s;
}

/** Fixed-window IP rate limit backed by KV. Fails open on KV errors. */
async function isRateLimited(
  kv: KVNamespace,
  ip: string | null,
  max = RATE_LIMIT_MAX,
  windowSeconds = RATE_LIMIT_WINDOW_SECONDS
): Promise<boolean> {
  if (!ip) return false;
  const key = `rl:booking:${ip}`;
  try {
    const current = Number((await kv.get(key)) || '0');
    if (current >= max) return true;
    await kv.put(key, String(current + 1), { expirationTtl: windowSeconds });
    return false;
  } catch {
    return false;
  }
}

/** Attendee details fetched from the Cal.com REST API for a booking uid. */
interface CalEnrichment {
  name?: string;
  email?: string;
  timezone?: string;
  event_type?: string;
}

/**
 * Fetch the full booking from Cal.com's REST API v2 using the booking `uid`
 * and extract the real attendee name/email/timezone (the embed event does not
 * expose these reliably). Best-effort: any missing key, network error, non-2xx
 * response, or malformed JSON is logged and swallowed — callers continue with
 * whatever data they already have.
 */
async function fetchCalAttendee(uid: string, apiKey: string): Promise<CalEnrichment> {
  try {
    const res = await fetch(`https://api.cal.com/v2/bookings/${encodeURIComponent(uid)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'cal-api-version': '2024-08-13',
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      console.error('Cal.com booking fetch non-2xx', res.status);
      return {};
    }
    // Cal v2 wraps the payload as `{ status, data: { ... } }`.
    const payload = (await res.json()) as any;
    const data = (payload && payload.data) || {};
    const attendees = Array.isArray(data.attendees) ? data.attendees : [];
    const attendee = attendees[0] || {};
    const responses = data.responses || {};
    return {
      name: str(attendee.name) ?? str(responses.name) ?? undefined,
      email: str(attendee.email) ?? str(responses.email) ?? undefined,
      timezone: str(attendee.timeZone) ?? undefined,
      event_type: str(data.eventType && data.eventType.slug) ?? undefined,
    };
  } catch (err) {
    console.error('Cal.com booking fetch failed', String(err));
    return {};
  }
}

/** Persist a booking to D1. Best-effort; swallows errors. */
async function storeBooking(
  db: D1Database,
  body: BookingBody,
  request: Request,
  cal: CalEnrichment
): Promise<void> {
  const meta = getVisitorMetadata(request, body as Record<string, any>);
  // Prefer the authoritative attendee details fetched from the Cal.com API;
  // fall back to whatever the client body carried.
  const name = str(cal.name) ?? str(body.name);
  const email = str(cal.email) ?? str(body.email);
  const timezone = str(cal.timezone) ?? str(body.timezone) ?? meta.timezone;
  const eventType = str(body.event_type) ?? str(cal.event_type);
  try {
    await db
      .prepare(
        `INSERT INTO bookings
          (created_at, name, email, timezone, event_type,
           country, region, city, latitude, longitude, isp,
           device_type, browser, os, language,
           referrer, landing_page,
           utm_source, utm_medium, utm_campaign, utm_term, utm_content,
           ip, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        new Date().toISOString(),
        name,
        email,
        timezone,
        eventType,
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
  const clientIp = request.headers.get('cf-connecting-ip');
  if (env.RATE_LIMIT && (await isRateLimited(env.RATE_LIMIT, clientIp))) {
    return json({ ok: false, error: 'Too many requests.' }, 429);
  }

  // Parse the body. A malformed body is still a soft-success from the visitor's
  // perspective — we just don't store anything.
  let body: BookingBody = {};
  try {
    body = ((await request.json()) as BookingBody) || {};
  } catch {
    return json({ ok: true });
  }

  // Enrich with the real attendee details when we have a booking uid and a Cal
  // API key. Best-effort: fetchCalAttendee never throws, so a missing key or a
  // Cal API failure just leaves the enrichment empty and we insert what we have.
  let cal: CalEnrichment = {};
  const uid = str(body.uid, 100);
  if (uid && env.CALCOM_API_KEY) {
    cal = await fetchCalAttendee(uid, env.CALCOM_API_KEY);
  }

  // Best-effort persistence — never throws into the request.
  if (env.DB) {
    await storeBooking(env.DB, body, request, cal);
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
