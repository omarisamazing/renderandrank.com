/**
 * Cloudflare Pages Function — persist finalized voice-assistant transcripts for
 * the browser voice assistant on Render and Rank.
 *
 * Route: POST /api/voice-transcript  (Pages maps functions/api/voice-transcript.ts -> /api/voice-transcript)
 *
 * The Gemini Live voice session (minted via /api/voice-token) emits both
 * interim and finalized transcript turns. The browser posts each turn here;
 * this endpoint drops interim turns and persists only the finalized ones as
 * `messages` rows with `channel = 'voice'`, mirroring how chat.ts writes the
 * typed chat turns. The conversation's updated_at is bumped on each write.
 *
 * Flow:
 *   1. POST only (verb-guarded like voice-token.ts / chat.ts).
 *   2. IP rate limit backed by KV (`rl:voice-transcript:<ip>`, gated on RATE_LIMIT).
 *   3. Validate the body: require conversationId + non-empty text, role in
 *      {'user','assistant'}. Default channel to 'voice'.
 *   4. Skip interim turns (final === false) without writing.
 *   5. Insert the finalized turn and bump conversations.updated_at.
 *
 * Bindings (configured in wrangler.toml):
 *   DB          (optional) — Cloudflare D1 database. When unbound the endpoint
 *                            still validates; persistence is simply skipped.
 *   RATE_LIMIT  (optional) — KV namespace for IP rate limiting. When unset,
 *                            rate limiting is skipped.
 */

interface Env {
  // Cloudflare D1 binding (configured in wrangler.toml as `DB`).
  DB?: D1Database;
  // Optional KV namespace for IP rate limiting (bound as `RATE_LIMIT` in
  // wrangler.toml). When unset, rate limiting is skipped.
  RATE_LIMIT?: KVNamespace;
}

interface VoiceTranscriptBody {
  conversationId?: string;
  channel?: string;
  role?: string;
  text?: string;
  final?: boolean;
}

// Fixed-window IP rate limit for voice-transcript: max requests per window
// (seconds). Voice sessions emit many finalized turns, so the window is sized
// generously while still capping abuse. Own `rl:voice-transcript:` scope.
const RATE_LIMIT_MAX = 120;
const RATE_LIMIT_WINDOW_SECONDS = 600;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

/**
 * Fixed-window IP rate limit backed by KV. Allows up to `max` requests per
 * `windowSeconds`. Gated by env.RATE_LIMIT: when unset the caller skips this.
 * Fails open on KV errors so a storage hiccup never blocks a real visitor.
 * Uses an `rl:voice-transcript:` key prefix so voice-transcript limits are
 * tracked separately from voice-token (`rl:voice-token:`) and chat (`rl:chat:`).
 */
async function isRateLimited(
  kv: KVNamespace,
  ip: string | null,
  max = RATE_LIMIT_MAX,
  windowSeconds = RATE_LIMIT_WINDOW_SECONDS
): Promise<boolean> {
  if (!ip) return false;
  const key = `rl:voice-transcript:${ip}`;
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
 * Insert a message row. Best-effort; swallows errors. Returns the new message
 * id (or null when the insert failed / DB is misbehaving). Matches chat.ts's
 * insertMessage write, persisting the capture `channel` ('voice' here).
 */
async function insertMessage(
  db: D1Database,
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  channel: string = 'voice'
): Promise<string | null> {
  const id = crypto.randomUUID();
  try {
    await db
      .prepare(
        'INSERT INTO messages (id, conversation_id, role, content, channel) VALUES (?, ?, ?, ?, ?)'
      )
      .bind(id, conversationId, role, content, channel)
      .run();
    return id;
  } catch (err) {
    console.error('D1 insert message failed for conversation ' + conversationId, String(err));
    return null;
  }
}

/** Update the conversation's updated_at timestamp. Best-effort; swallows errors. */
async function touchConversation(db: D1Database, conversationId: string): Promise<void> {
  try {
    await db
      .prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?")
      .bind(conversationId)
      .run();
  } catch (err) {
    console.error('D1 touch conversation failed for conversation ' + conversationId, String(err));
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Parse the body.
  let body: VoiceTranscriptBody;
  try {
    body = (await request.json()) as VoiceTranscriptBody;
  } catch {
    return json({ ok: false, error: 'Could not read the request body.' }, 400);
  }

  const ip = request.headers.get('cf-connecting-ip');

  // Rate limit (gated on the RATE_LIMIT KV binding). Skipped when unbound and
  // fails open on KV errors, so a storage hiccup never blocks a real visitor.
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

  // Validate the conversation id.
  const conversationId =
    typeof body.conversationId === 'string' ? body.conversationId.trim() : '';
  if (!conversationId) {
    return json({ ok: false, error: 'A `conversationId` is required.' }, 400);
  }

  // Validate the transcript text.
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) {
    return json({ ok: false, error: 'A non-empty `text` is required.' }, 400);
  }

  // Validate the role.
  const role = body.role;
  if (role !== 'user' && role !== 'assistant') {
    return json(
      { ok: false, error: "`role` must be 'user' or 'assistant'." },
      400
    );
  }

  // Default the capture channel to 'voice'.
  const channel =
    typeof body.channel === 'string' && body.channel.trim()
      ? body.channel.trim()
      : 'voice';

  // Skip interim transcript turns — only finalized turns are persisted.
  if (body.final === false) {
    return json({ ok: true, skipped: true });
  }

  // Persist the finalized turn + bump the conversation timestamp (best-effort).
  let id: string | null = null;
  if (env.DB) {
    const db = env.DB;
    id = await insertMessage(db, conversationId, role, text, channel);
    await touchConversation(db, conversationId);
  }

  return json({ ok: true, id });
};

// Reject non-POST verbs cleanly (mirror voice-token.ts / chat.ts).
export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { Allow: 'POST, OPTIONS' } });
  }
  return json({ ok: false, error: 'Method not allowed. Use POST.' }, 405);
};
