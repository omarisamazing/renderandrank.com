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
}

interface TrackRequest {
  visitorId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.DB) {
    return json({ ok: true, skipped: true });
  }

  try {
    const body = (await request.json()) as TrackRequest;
    const visitorId = (body.visitorId || '').trim();
    const eventType = (body.eventType || '').trim();

    if (!visitorId || !eventType) {
      return json({ ok: false, error: 'visitorId and eventType are required' }, 400);
    }

    const payloadStr = JSON.stringify(body.payload || {});

    await env.DB.prepare(
      'INSERT INTO funnel_events (visitor_id, event_type, payload) VALUES (?, ?, ?)'
    )
      .bind(visitorId, eventType, payloadStr)
      .run();

    return json({ ok: true });
  } catch (err) {
    console.error('Track funnel threw:', err);
    return json({ ok: false, error: String(err) }, 500);
  }
};

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { Allow: 'POST, OPTIONS' } });
  }
  return json({ ok: false, error: 'Method not allowed. Use POST.' }, 405);
};
