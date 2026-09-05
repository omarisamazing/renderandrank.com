/**
 * Cloudflare Pages Function — mint an ephemeral Gemini Live token for the
 * browser voice assistant on Render and Rank.
 *
 * Route: POST /api/voice-token  (Pages maps functions/api/voice-token.ts -> /api/voice-token)
 *
 * Flow:
 *   1. POST only (verb-guarded like chat.ts).
 *   2. Per-IP rate limit backed by KV (a 24h daily cap + a short burst guard,
 *      gated on RATE_LIMIT). Runs before minting so it protects the free tier.
 *   3. Reuse the client's conversationId if supplied and valid; otherwise mint
 *      a new one and persist a conversation row (mirrors chat.ts persistence).
 *   4. Exchange the server-side voice key (GEMINI_VOICE_API_KEY, falling back to
 *      GEMINI_API_KEY) for a short-lived ephemeral
 *      token via Google's v1alpha auth_tokens endpoint (the ephemeral-token
 *      API only lives on v1alpha) using a `bidiGenerateContentSetup` body that
 *      also bakes in the sales-assistant systemInstruction, since the token
 *      locks the session config and a client-supplied one is ignored. The
 *      API key never touches the browser — only the ephemeral token does.
 *      Any non-OK upstream Google response is logged AND returned (status +
 *      body) so the exact cause (bad key / unknown model / bad shape) is
 *      visible instead of being swallowed.
 *   5. Return the token, conversationId, expiry, and a constrained BidiGenerate
 *      WebSocket URL (on the v1beta service path) the browser can open directly.
 *
 * Bindings (configured in wrangler.toml):
 *   DB              (optional) — Cloudflare D1 database. When unbound the token
 *                                still mints; conversation persistence is skipped.
 *   RATE_LIMIT      (optional) — KV namespace for per-IP rate limiting. When
 *                                unset, rate limiting is skipped (fails open).
 *   GEMINI_VOICE_API_KEY (preferred) — Dedicated Gemini API key for voice, so it
 *                                does not share the AI checker's key/quota.
 *   GEMINI_API_KEY  (fallback) — Gemini API key secret, used when
 *                                GEMINI_VOICE_API_KEY is unset. When neither is
 *                                set the endpoint returns 500.
 *
 * Error responses share the shape { ok: false, error, detail?, upstreamStatus? }
 * so the browser client can log the exact upstream Google failure.
 */

import { getVisitorMetadata, type VisitorMetadata } from '../lib/visitor';
import { SITE_FACTS } from '../lib/siteFacts';

interface Env {
  // Cloudflare D1 binding (configured in wrangler.toml as `DB`).
  DB?: D1Database;
  // Optional KV namespace for per-IP rate limiting (bound as `RATE_LIMIT` in
  // wrangler.toml). When unset, rate limiting is skipped.
  RATE_LIMIT?: KVNamespace;
  // Dedicated Gemini API key for the voice assistant. Preferred over
  // GEMINI_API_KEY so voice does not share the AI checker's key/quota.
  GEMINI_VOICE_API_KEY?: string;
  // Gemini API key secret used server-side to mint ephemeral tokens.
  // Fallback when GEMINI_VOICE_API_KEY is not set.
  GEMINI_API_KEY?: string;
}

interface VoiceTokenBody {
  conversationId?: string;
}

// Gemini Live model + connect constraints baked into the ephemeral token.
const GEMINI_MODEL = 'models/gemini-2.5-flash-native-audio-preview-09-2025';

// Sales-assistant persona base, baked into the ephemeral token's
// bidiGenerateContentSetup. The ephemeral token locks the session config, so a
// systemInstruction supplied by the browser in its WebSocket setup frame is
// ignored — the persona must be minted into the token here, server-side.
// Grounded facts are appended below from the shared siteFacts module.
const VOICE_SYSTEM_BASE = `You are the voice sales assistant for Render and Rank, a local SEO and AEO/GEO agency that helps local and service-area businesses get found and chosen by customers. You ONLY act as this agency's sales assistant: if asked about anything unrelated (general trivia, coding help, other companies, etc.), politely decline and steer the conversation back to how Render and Rank can grow their business.

What Render and Rank does — explain simply when relevant:
- Local SEO & Hyper-Local Visibility: ranking a business for 'near me' and city searches with optimized pages, local schema, and citations across 70+ directories.
- AEO & Generative Engine Optimization (GEO): making a business the one that ChatGPT, Gemini, Perplexity, Claude, and Google AI Overviews recommend and cite.
- Google Maps 3-Pack Growth: optimizing the Google Business Profile, growing reviews, and expanding the map ranking area so the business lands in the top 3.

Your goals, in order:
1) Qualify the visitor and gather lead info conversationally — ask ONE question at a time and keep it natural for speech. Collect: their name; their business name and website; what they need or their biggest challenge; their budget and timeline; and the best email or phone to reach them.
2) Persuade them to book a free discovery call as the main next step — that's the primary goal. Once they're interested, confirm the best way and time to follow up.

 Style: concise, warm, and confident. Speak in short spoken sentences, one idea at a time. Don't read long lists aloud — mention one or two relevant services and ask a follow-up. Never invent services, prices, or guarantees beyond what's described here; if unsure, offer to cover it on the discovery call. If they want to move forward or you have their contact details, encourage booking the call and confirm follow-up.`;

const VOICE_SYSTEM_INSTRUCTION = `${VOICE_SYSTEM_BASE}\n\nGrounded facts — quote these exactly for services, pricing, and contact (same source as the typed chat assistant):\n${SITE_FACTS}`;
const GEMINI_AUTH_TOKENS_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1alpha/auth_tokens';

// Token lifetime: usable for 30 minutes; a new session may be opened within 1 minute.
const TOKEN_EXPIRE_MS = 30 * 60 * 1000;
const NEW_SESSION_EXPIRE_MS = 60 * 1000;

const CONVERSATION_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;

// Per-IP rate limits for voice-token. Voice sessions mint a Gemini ephemeral
// token that runs on the Gemini free tier, so a single visitor must not be able
// to exhaust the quota. Two windows are enforced together:
//   1. A rolling 24h cap (protects the daily free-tier quota).
//   2. A short burst guard over 10 minutes (stops rapid-fire abuse).
// Each uses its own KV key scope so the two counters expire independently.
// Tune these constants freely — they are the only knobs the limiter reads.
const RATE_LIMIT_DAILY_MAX = 100;
const RATE_LIMIT_DAILY_WINDOW_SECONDS = 24 * 60 * 60; // 24h rolling window.
const RATE_LIMIT_BURST_MAX = 20;
const RATE_LIMIT_BURST_WINDOW_SECONDS = 10 * 60; // 10 minute burst guard.

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
 * Resolve the client IP. Prefer Cloudflare's `CF-Connecting-IP` (the true edge
 * client IP) and fall back to the first entry of `X-Forwarded-For`.
 */
function getClientIp(request: Request): string | null {
  const cf = request.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return null;
}

/**
 * Fixed-window per-IP rate limit backed by KV. Allows up to `max` requests per
 * `windowSeconds` under the given `scope` key. Fails open on KV errors so a
 * storage hiccup never blocks a real visitor. Each scope keeps its own counter
 * under `rl:voice-token:<scope>:<ip>` so the daily and burst windows expire
 * independently, and stay separate from chat (`rl:chat:`) and the contact form
 * (`rl:contact:`) limits.
 */
async function isRateLimited(
  kv: KVNamespace,
  ip: string | null,
  scope: string,
  max: number,
  windowSeconds: number
): Promise<boolean> {
  if (!ip) return false;
  const key = `rl:voice-token:${scope}:${ip}`;
  try {
    const current = Number((await kv.get(key)) || '0');
    if (current >= max) return true;
    await kv.put(key, String(current + 1), { expirationTtl: windowSeconds });
    return false;
  } catch {
    return false;
  }
}

/**
 * Enforce both voice-token windows for an IP: a short burst guard and a rolling
 * 24h cap. Returns true if either limit is exceeded. Both counters are
 * incremented on an allowed request.
 */
async function isVoiceRateLimited(kv: KVNamespace, ip: string | null): Promise<boolean> {
  const burst = await isRateLimited(
    kv,
    ip,
    'burst',
    RATE_LIMIT_BURST_MAX,
    RATE_LIMIT_BURST_WINDOW_SECONDS
  );
  const daily = await isRateLimited(
    kv,
    ip,
    'daily',
    RATE_LIMIT_DAILY_MAX,
    RATE_LIMIT_DAILY_WINDOW_SECONDS
  );
  return burst || daily;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Prefer the dedicated voice key so voice does not share the AI checker's
  // GEMINI_API_KEY; fall back to GEMINI_API_KEY when the voice key is unset.
  const apiKey = env.GEMINI_VOICE_API_KEY || env.GEMINI_API_KEY;

  // A server-side Gemini API key is required to mint ephemeral tokens.
  if (!apiKey) {
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

  // Client IP: CF-Connecting-IP is the true edge client IP; fall back to the
  // first X-Forwarded-For entry when it is absent (e.g. local wrangler).
  const ip = getClientIp(request);

  // Per-IP rate limit (gated on the RATE_LIMIT KV binding). Skipped when
  // unbound; fails open on KV errors. Runs BEFORE the upstream token mint,
  // protecting the Gemini free-tier quota from a single visitor. Enforces a
  // short burst guard AND a rolling 24h cap; either exceeded returns 429 and
  // Google is never called.
  if (env.RATE_LIMIT && (await isVoiceRateLimited(env.RATE_LIMIT, ip))) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'rate_limited',
        message:
          "You've reached the voice session limit. Please try again later.",
      }),
      {
        status: 429,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'Retry-After': String(RATE_LIMIT_BURST_WINDOW_SECONDS),
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
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        uses: 1,
        expireTime,
        newSessionExpireTime,
        bidiGenerateContentSetup: {
          model: GEMINI_MODEL,
          generationConfig: { responseModalities: ['AUDIO'] },
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          systemInstruction: { parts: [{ text: VOICE_SYSTEM_INSTRUCTION }] },
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
    // Read Google's error body so the exact upstream cause (bad key, unknown
    // model, malformed bidiGenerateContentSetup, etc.) is logged AND returned to
    // the caller instead of being swallowed behind a generic message.
    const detail = await tokenResponse.text().catch(() => '');
    const trimmedDetail = detail.slice(0, 1000);
    console.error(
      'Gemini auth_tokens returned HTTP ' +
        tokenResponse.status +
        ' ' +
        tokenResponse.statusText,
      trimmedDetail
    );
    return json(
      {
        ok: false,
        error: 'Failed to mint a voice token.',
        upstreamStatus: tokenResponse.status,
        detail: trimmedDetail,
      },
      // Normalize any upstream status into a valid HTTP status; some Google
      // errors (e.g. 4xx auth) shouldn't be echoed as a raw client status the
      // browser fetch can't interpret, so clamp to 502 for non-standard codes.
      tokenResponse.status >= 400 && tokenResponse.status <= 599
        ? tokenResponse.status
        : 502
    );
  }

  const tokenText = await tokenResponse.text().catch(() => '');
  let tokenData: { name?: string } = {};
  try {
    tokenData = tokenText ? (JSON.parse(tokenText) as { name?: string }) : {};
  } catch {
    /* fall through; missing name is handled below. */
  }
  const name = tokenData.name;
  if (!name) {
    console.error(
      'Gemini auth_tokens response missing `name` field',
      tokenText.slice(0, 500)
    );
    return json(
      {
        ok: false,
        error: 'Failed to mint a voice token.',
        detail: tokenText.slice(0, 500),
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
