/**
 * Cloudflare Pages Function — Funnel event logger.
 *
 * Route: POST /api/track-funnel
 *
 * Records user journey interactions (e.g. ROI Calculator slider adjustments,
 * CTA clicks, and funnel transitions) into the D1 `funnel_events` table.
 */

interface Env {
  DB?: D1Database;
  // Optional KV namespace for IP rate limiting (bound as `RATE_LIMIT` in wrangler.toml)
  RATE_LIMIT?: KVNamespace;
}

interface TrackRequest {
  visitorId: string;
  eventType: string;
  payload?: Record<string, unknown>;
}

const VISITOR_ID_RE = /^[a-zA-Z0-9_-]{1,128}$/;
const EVENT_TYPE_RE = /^[a-zA-Z0-9_-]{1,64}$/;
const MAX_PAYLOAD_BYTES = 8192; // 8 KB cap for funnel telemetry payloads
const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_WINDOW_SECONDS = 600;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

/** Fixed-window IP rate limit backed by KV. Fails open on KV errors. */
async function isRateLimited(
  kv: KVNamespace,
  ip: string | null,
  max = RATE_LIMIT_MAX,
  windowSeconds = RATE_LIMIT_WINDOW_SECONDS
): Promise<boolean> {
  if (!ip) return false;
  const key = `rl:funnel:${ip}`;
  try {
    const current = Number((await kv.get(key)) || '0');
    if (current >= max) return true;
    await kv.put(key, String(current + 1), { expirationTtl: windowSeconds });
    return false;
  } catch {
    return false;
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.DB) {
    return json({ ok: true, skipped: true });
  }

  const clientIp = request.headers.get('cf-connecting-ip');
  if (env.RATE_LIMIT && (await isRateLimited(env.RATE_LIMIT, clientIp))) {
    return json({ ok: false, error: 'Too many requests. Please try again later.' }, 429);
  }

  let body: TrackRequest;
  try {
    body = (await request.json()) as TrackRequest;
  } catch {
    return json({ ok: false, error: 'Invalid JSON payload.' }, 400);
  }

  const visitorId = (body?.visitorId || '').trim();
  const eventType = (body?.eventType || '').trim();

  if (!visitorId || !eventType) {
    return json({ ok: false, error: 'visitorId and eventType are required' }, 400);
  }

  if (!VISITOR_ID_RE.test(visitorId)) {
    return json({ ok: false, error: 'Invalid visitorId format.' }, 400);
  }

  if (!EVENT_TYPE_RE.test(eventType)) {
    return json({ ok: false, error: 'Invalid eventType format.' }, 400);
  }

  let payloadStr = '{}';
  try {
    payloadStr = JSON.stringify(body.payload && typeof body.payload === 'object' ? body.payload : {});
    if (payloadStr.length > MAX_PAYLOAD_BYTES) {
      return json({ ok: false, error: 'Payload exceeds maximum allowed size.' }, 413);
    }
  } catch {
    payloadStr = '{}';
  }

  try {
    await env.DB.prepare(
      'INSERT INTO funnel_events (visitor_id, event_type, payload) VALUES (?, ?, ?)'
    )
      .bind(visitorId, eventType, payloadStr)
      .run();

    return json({ ok: true });
  } catch (err) {
    console.error('Track funnel storage threw:', err);
    // Shield internal database error details
    return json({ ok: false, error: 'Could not record funnel event.' }, 500);
  }
};

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { Allow: 'POST, OPTIONS' } });
  }
  return json({ ok: false, error: 'Method not allowed. Use POST.' }, 405);
};
