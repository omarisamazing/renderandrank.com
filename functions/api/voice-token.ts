/**
 * Cloudflare Pages Function — mint an ephemeral Gemini Live token for the
 * browser voice assistant on Render and Rank.
 *
 * Route: POST /api/voice-token  (Pages maps functions/api/voice-token.ts -> /api/voice-token)
 *
 * Flow:
 *   1. POST only (verb-guarded like chat.ts).
 *   2. IP rate limit backed by KV (`rl:voice-token:<ip>`, gated on RATE_LIMIT).
 *   3. Reuse the client's conversationId if supplied and valid; otherwise mint
 *      a new one and persist a conversation row (mirrors chat.ts persistence).
 *   4. Exchange the server-side GEMINI_API_KEY for a short-lived ephemeral
 *      token via Google's auth_tokens endpoint. The API key never touches the
 *      browser — only the ephemeral token does.
 *   5. Return the token, conversationId, expiry, and a constrained BidiGenerate
 *      WebSocket URL the browser can open directly.
 *
 * Bindings (configured in wrangler.toml):
 *   DB              (optional) — Cloudflare D1 database. When unbound the token
 *                                still mints; conversation persistence is skipped.
 *   RATE_LIMIT      (optional) — KV namespace for IP rate limiting. When unset,
 *                                rate limiting is skipped.
 *   GEMINI_API_KEY  (required) — Gemini API key secret. When unset the endpoint
 *                                returns 500.
 */

import { getVisitorMetadata, type VisitorMetadata } from '../lib/visitor';

interface Env {
  // Cloudflare D1 binding (configured in wrangler.toml as `DB`).
  DB?: D1Database;
  // Optional KV namespace for IP rate limiting (bound as `RATE_LIMIT` in
  // wrangler.toml). When unset, rate limiting is skipped.
  RATE_LIMIT?: KVNamespace;
  // Gemini API key secret used server-side to mint ephemeral tokens.
  GEMINI_API_KEY?: string;
}

interface VoiceTokenBody {
  conversationId?: string;
}

// Gemini Live model + connect constraints baked into the ephemeral token.
const GEMINI_MODEL = 'models/gemini-2.5-flash-native-audio-preview-09-2025';
const GEMINI_AUTH_TOKENS_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/auth_tokens';

// Token lifetime: usable for 30 minutes; a new session may be opened within 1 minute.
const TOKEN_EXPIRE_MS = 30 * 60 * 1000;
const NEW_SESSION_EXPIRE_MS = 60 * 1000;

const CONVERSATION_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;

// Fixed-window IP rate limit for voice-token: max requests per window (seconds).
// Mirrors chat.ts's limiter semantics but with its own `rl:voice-token:` scope.
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_SECONDS = 600;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

/** Insert a new conversation row. Best-effort; swallows errors. */
async function insertConversation(
  db: D1Database,
  id: string,
  meta: VisitorMetadata
): Promise<void> {
  try {
    await db
      .prepare(
        `INSERT INTO conversations
          (id, ip, user_agent,
           country, region, city, timezone, latitude, longitude, isp,
           device_type, browser, os, language, referrer, landing_page,
           utm_source, utm_medium, utm_campaign, utm_term, utm_content)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`
      )
      .bind(
        id,
        meta.ip,
        meta.user_agent,
        meta.country,
        meta.region,
        meta.city,
        meta.timezone,
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
        meta.utm_content
      )
      .run();
  } catch (err) {
    console.error('D1 insert conversation failed for conversation ' + id, String(err));
  }
}

/**
 * Fixed-window IP rate limit backed by KV. Allows up to `max` requests per
 * `windowSeconds`. Gated by env.RATE_LIMIT: when unset the caller skips this.
 * Fails open on KV errors so a storage hiccup never blocks a real visitor.
 * Uses an `rl:voice-token:` key prefix so voice-token limits are tracked
 * separately from chat (`rl:chat:`) and the contact form (`rl:contact:`).
 */
async function isRateLimited(
  kv: KVNamespace,
  ip: string | null,
  max = RATE_LIMIT_MAX,
  windowSeconds = RATE_LIMIT_WINDOW_SECONDS
): Promise<boolean> {
  if (!ip) return false;
  const key = `rl:voice-token:${ip}`;
  try {
    const current = Number((await kv.get(key)) || '0');
    if (current >= max) return true;
    await kv.put(key, String(current + 1), { expirationTtl: windowSeconds });
    return false;
  } catch {
    return false;
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // The server-side Gemini API key is required to mint ephemeral tokens.
  if (!env.GEMINI_API_KEY) {
    return json(
      {
        ok: false,
        error:
          'The voice assistant is temporarily unavailable. Please email hello@renderandrank.com or book a call.',
      },
      500
    );
  }

  // Body is optional for this endpoint; tolerate an empty/absent body.
  let body: VoiceTokenBody = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text) as VoiceTokenBody;
  } catch {
    return json({ ok: false, error: 'Could not read the request body.' }, 400);
  }

  const ip = request.headers.get('cf-connecting-ip');

  // Rate limit (gated on the RATE_LIMIT KV binding). Skipped when unbound and
  // fails open on KV errors. Runs BEFORE the upstream token mint so it actually
  // protects the Google API call.
  if (env.RATE_LIMIT && (await isRateLimited(env.RATE_LIMIT, ip))) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'Too many requests. Please try again in a few minutes.',
      }),
      {
        status: 429,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'Retry-After': String(RATE_LIMIT_WINDOW_SECONDS),
        },
      }
    );
  }

  // Build visitor metadata once (geo/UA/UTM). Never throws; fields are null
  // when unavailable.
  const meta = getVisitorMetadata(request, body as unknown as Record<string, any>);

  // Conversation id: reuse the client's if present and valid, otherwise mint
  // one and persist a fresh conversation row (best-effort).
  const validClientCid =
    typeof body.conversationId === 'string' && CONVERSATION_ID_RE.test(body.conversationId)
      ? body.conversationId
      : null;
  const conversationId = validClientCid || crypto.randomUUID();

  if (!validClientCid && env.DB) {
    await insertConversation(env.DB, conversationId, meta);
  }

  // Mint the ephemeral token from Google. expireTime bounds the token's life;
  // newSessionExpireTime bounds how soon a session must be opened.
  const now = Date.now();
  const expireTime = new Date(now + TOKEN_EXPIRE_MS).toISOString();
  const newSessionExpireTime = new Date(now + NEW_SESSION_EXPIRE_MS).toISOString();

  let tokenResponse: Response;
  try {
    tokenResponse = await fetch(GEMINI_AUTH_TOKENS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        uses: 1,
        expireTime,
        newSessionExpireTime,
        liveConnectConstraints: {
          model: GEMINI_MODEL,
          config: {
            responseModalities: ['AUDIO'],
            outputAudioTranscription: {},
            inputAudioTranscription: {},
          },
        },
      }),
    });
  } catch (err) {
    console.error('Gemini auth_tokens request failed', String(err));
    return json(
      {
        ok: false,
        error:
          'The voice assistant hit an error. Please try again, email hello@renderandrank.com, or book a call.',
      },
      502
    );
  }

  if (!tokenResponse.ok) {
    const detail = await tokenResponse.text().catch(() => '');
    console.error(
      'Gemini auth_tokens returned ' + tokenResponse.status,
      detail.slice(0, 500)
    );
    return json(
      {
        ok: false,
        error: 'Failed to mint a voice token.',
        detail: detail.slice(0, 500),
      },
      tokenResponse.status
    );
  }

  const tokenData = (await tokenResponse.json().catch(() => ({}))) as { name?: string };
  const name = tokenData.name;
  if (!name) {
    console.error('Gemini auth_tokens response missing `name` field');
    return json(
      {
        ok: false,
        error: 'Failed to mint a voice token.',
      },
      502
    );
  }

  const wssUrl =
    'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=' +
    encodeURIComponent(name);

  return json({
    ok: true,
    token: name,
    conversationId,
    expireTime,
    wssUrl,
  });
};

// Reject non-POST verbs cleanly (mirror chat.ts / contact.ts).
export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { Allow: 'POST, OPTIONS' } });
  }
  return json({ ok: false, error: 'Method not allowed. Use POST.' }, 405);
};
