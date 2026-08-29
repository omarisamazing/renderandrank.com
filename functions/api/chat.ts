/**
 * Cloudflare Pages Function — on-site AI chat assistant for Render and Rank.
 *
 * Route: POST /api/chat  (Pages maps functions/api/chat.ts -> /api/chat)
 *
 * Streams a chat completion from Cloudflare Workers AI back to the browser as
 * Server-Sent Events while, in parallel, persisting the conversation to D1.
 *
 * Bindings (configured in wrangler.toml):
 *   AI  (required) — Workers AI binding. When unbound the endpoint returns 503.
 *   DB  (optional) — Cloudflare D1 database. When unbound the chat still works;
 *                    all persistence is simply skipped.
 *
 * Every D1 call is wrapped in best-effort try/catch: a storage hiccup must
 * never break the live chat stream.
 */

import { getVisitorMetadata, type VisitorMetadata } from '../lib/visitor';

interface Env {
  AI: Ai;
  // Cloudflare D1 binding (configured in wrangler.toml as `DB`).
  DB?: D1Database;
  // Optional KV namespace for IP rate limiting (bound as `RATE_LIMIT` in
  // wrangler.toml). When unset, rate limiting is skipped.
  RATE_LIMIT?: KVNamespace;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatBody {
  messages: ChatMessage[];
  conversationId?: string;
}

const MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';
// Keep only the last N turns of history sent to the model.
const MAX_TURNS = 20;
// Clamp each message body so a runaway paste can't blow the context window.
const MAX_CONTENT = 4000;
// Truncate the message we copy into the submissions table on lead capture.
const LEAD_MESSAGE_MAX = 500;

const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const CONVERSATION_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;

// Fixed-window IP rate limit for chat: max requests per window (seconds).
// Mirrors the contact endpoint's limiter semantics.
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_SECONDS = 600;

// Business-aware system prompt. The assistant represents Render and Rank and
// must stay honest: no #1 ranking guarantees, no invented pricing.
const SYSTEM_PROMPT = [
  'You are Omli, the professional on-site assistant for Render and Rank, a local SEO / AEO / GEO agency. Introduce yourself as "Omli, the Render and Rank assistant". Your job is to help visitors with local SEO / AEO / GEO AND to convert them into leads.',
  'Founder: Omar Ali. Contact email: hello@renderandrank.com. Visitors can book a call via Cal.com at /book-a-call.',
  'Persona: professional, warm, proactive, and confident — a helpful assistant. Briefly answer relevant questions, then keep the conversation moving toward a next step.',
  'Qualify the visitor by asking about their business (what they do), their location/market, their website, and their goals. Ask one focused question at a time so it feels like a conversation, not an interrogation.',
  'Sell the value of our work: hands-on, manual local SEO / AEO / GEO done by real people (not automated spam), month-to-month with no long lock-in, focused on getting local businesses found by real nearby customers and by AI answer engines.',
  'AEO (Answer Engine Optimization) and GEO (Generative Engine Optimization) mean making a business the answer that tools like Google AI Overviews, ChatGPT, and other assistants recommend — explain this simply when asked.',
  'At natural moments, steer toward a clear call-to-action: invite them to book a call at /book-a-call, or offer to have the team follow up if they share their email. Make the next step easy and specific.',
  'Handle objections warmly (price, timing, skepticism, DIY): acknowledge the concern, reassure with our month-to-month manual approach and honest expectations, and gently guide back toward booking a call or sharing an email.',
  'GUARDRAILS (never break): Never guarantee #1 rankings or any specific ranking position — talk about improving visibility and results instead. Never invent or quote pricing; if asked about price, invite them to book a call or get in touch so we can scope their needs. Be helpful, concise, and honest. Stay on topic (local SEO / AEO / GEO and how Render and Rank can help).',
].join(' ');

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

/** Insert a message row. Best-effort; swallows errors. */
async function insertMessage(
  db: D1Database,
  conversationId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  try {
    await db
      .prepare(
        'INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)'
      )
      .bind(crypto.randomUUID(), conversationId, role, content)
      .run();
  } catch (err) {
    console.error('D1 insert message failed for conversation ' + conversationId, String(err));
  }
}

/** Read the stored visitor_email for a conversation. Best-effort; null on error. */
async function getVisitorEmail(
  db: D1Database,
  conversationId: string
): Promise<string | null> {
  try {
    const row = await db
      .prepare('SELECT visitor_email FROM conversations WHERE id = ?')
      .bind(conversationId)
      .first<{ visitor_email: string | null }>();
    return row ? row.visitor_email : null;
  } catch (err) {
    console.error('D1 select visitor_email failed for conversation ' + conversationId, String(err));
    return null;
  }
}

/**
 * If the latest user message contains an email and the conversation has not
 * captured one yet, record it on the conversation and drop a lead into the
 * existing submissions table. Best-effort; every D1 call is guarded.
 */
async function maybeCaptureLead(
  db: D1Database,
  conversationId: string,
  isNewConversation: boolean,
  userMessage: string,
  meta: VisitorMetadata
): Promise<void> {
  const match = userMessage.match(EMAIL_RE);
  if (!match) return;
  const email = match[0];

  // A brand-new conversation has no stored email yet; for an existing one we
  // must check so we don't capture the same lead twice.
  if (!isNewConversation) {
    const existing = await getVisitorEmail(db, conversationId);
    if (existing) return;
  }

  try {
    await db
      .prepare(
        "UPDATE conversations SET visitor_email = ?, status = 'lead_captured' WHERE id = ?"
      )
      .bind(email, conversationId)
      .run();
  } catch (err) {
    console.error('D1 update conversation lead failed for conversation ' + conversationId, String(err));
  }

  try {
    await db
      .prepare(
        `INSERT INTO submissions
          (name, email, phone, website, service, location, message, ip, user_agent,
           country, region, city, timezone, latitude, longitude, isp,
           device_type, browser, os, language, referrer, landing_page,
           utm_source, utm_medium, utm_campaign, utm_term, utm_content)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        'Chat visitor',
        email,
        null,
        '(captured via chat)',
        'Chat assistant',
        'Unknown',
        userMessage.slice(0, LEAD_MESSAGE_MAX),
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
    console.error('D1 insert chat lead failed for conversation ' + conversationId, String(err));
  }
}

/**
 * Fixed-window IP rate limit backed by KV. Allows up to `max` requests per
 * `windowSeconds`. Gated by env.RATE_LIMIT: when unset the caller skips this.
 * Fails open on KV errors so a storage hiccup never blocks a real visitor.
 * Uses an `rl:chat:` key prefix so chat limits are tracked separately from
 * the contact form (`rl:contact:`).
 */
async function isRateLimited(
  kv: KVNamespace,
  ip: string | null,
  max = RATE_LIMIT_MAX,
  windowSeconds = RATE_LIMIT_WINDOW_SECONDS
): Promise<boolean> {
  if (!ip) return false;
  const key = `rl:chat:${ip}`;
  try {
    const current = Number((await kv.get(key)) || '0');
    if (current >= max) return true;
    await kv.put(key, String(current + 1), { expirationTtl: windowSeconds });
    return false;
  } catch {
    return false;
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

  // Parse + validate the body.
  let body: ChatBody;
  try {
    body = (await request.json()) as ChatBody;
  } catch {
    return json({ ok: false, error: 'Could not read the request body.' }, 400);
  }

  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    return json({ ok: false, error: 'A non-empty `messages` array is required.' }, 400);
  }

  // Normalise: keep the last ~20 turns, clamp each content, drop malformed items.
  const history: ChatMessage[] = body.messages
    .filter(
      (m) =>
        m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string'
    )
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CONTENT) }));

  if (history.length === 0) {
    return json({ ok: false, error: 'No valid messages provided.' }, 400);
  }

  // Workers AI must be bound to serve the chat.
  if (!env.AI) {
    return json(
      {
        ok: false,
        error:
          'The chat assistant is temporarily unavailable. Please email hello@renderandrank.com or book a call.',
      },
      503
    );
  }

  const ip = request.headers.get('cf-connecting-ip');

  // Build visitor metadata once (geo/UA/UTM). The widget may send
  // referrer/landing_page/utm_* on the body — read them if present, ignore if
  // absent. Never throws; fields are null when unavailable.
  const meta = getVisitorMetadata(request, body as unknown as Record<string, any>);

  // Rate limit (gated on the RATE_LIMIT KV binding). Skipped when unbound and
  // fails open on KV errors, so a storage hiccup never blocks the chat. Runs
  // BEFORE the expensive Workers AI call so it actually protects the AI cost.
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

  // Latest user message drives persistence + lead capture.
  const latestUser = [...history].reverse().find((m) => m.role === 'user');
  const latestUserContent = latestUser ? latestUser.content : '';

  // Conversation id: reuse the client's if present and valid, otherwise mint one.
  const validClientCid =
    typeof body.conversationId === 'string' && CONVERSATION_ID_RE.test(body.conversationId)
      ? body.conversationId
      : null;
  const isNewConversation = !validClientCid;
  const conversationId = validClientCid || crypto.randomUUID();

  // Persist conversation + latest user message BEFORE the model call.
  // All guarded internally so failures never block the chat.
  if (env.DB) {
    const db = env.DB;
    // Always ensure the conversation row exists. The client may send a resumed
    // or STALE conversationId (e.g. from sessionStorage created before the table
    // existed) that was never persisted; the idempotent upsert prevents orphaned
    // messages and lost conversations, and self-heals old browser sessions.
    await insertConversation(db, conversationId, meta);
    if (latestUserContent) {
      await insertMessage(db, conversationId, 'user', latestUserContent);
      await maybeCaptureLead(
        db,
        conversationId,
        isNewConversation,
        latestUserContent,
        meta
      );
    }
  }

  // Kick off the streaming model call.
  let aiResult: ReadableStream | Record<string, unknown>;
  try {
    aiResult = await env.AI.run(MODEL, {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history,
      ],
      stream: true,
    });
  } catch (err) {
    console.error('Workers AI run failed', String(err));
    return json(
      {
        ok: false,
        error:
          'The chat assistant hit an error. Please try again, email hello@renderandrank.com, or book a call.',
      },
      502
    );
  }

  // If the binding returned JSON instead of a stream (e.g. stream unsupported),
  // fall back to a single JSON response and still persist the reply.
  if (!(aiResult instanceof ReadableStream)) {
    const record = aiResult as Record<string, unknown>;
    const reply = typeof record.response === 'string' ? (record.response as string) : '';
    if (env.DB && reply) {
      const db = env.DB;
      context.waitUntil(
        (async () => {
          await insertMessage(db, conversationId, 'assistant', reply);
          await touchConversation(db, conversationId);
        })()
      );
    }
    return json({ ok: true, conversationId, reply }, 200);
  }

  // Pipe the SSE stream straight to the client while accumulating the reply.
  const decoder = new TextDecoder();
  let assistantReply = '';
  let sseBuffer = '';

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      // Pass bytes straight through — the browser gets the raw SSE stream.
      controller.enqueue(chunk);

      // Accumulate the parsed `.response` text for persistence.
      sseBuffer += decoder.decode(chunk, { stream: true });
      const lines = sseBuffer.split('\n');
      sseBuffer = lines.pop() ?? '';
      for (const raw of lines) {
        const line = raw.trim();
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const parsed = JSON.parse(payload) as { response?: string };
          if (typeof parsed.response === 'string') {
            assistantReply += parsed.response;
          }
        } catch {
          // Ignore keep-alives / partial JSON — the client still sees raw bytes.
        }
      }
    },
    flush() {
      // Persist the assistant reply + bump the conversation timestamp after the
      // stream completes, without holding up the response.
      if (env.DB) {
        const db = env.DB;
        const reply = assistantReply;
        context.waitUntil(
          (async () => {
            if (reply) {
              await insertMessage(db, conversationId, 'assistant', reply);
            }
            await touchConversation(db, conversationId);
          })()
        );
      }
    },
  });

  const stream = aiResult.pipeThrough(transform);

  return new Response(stream, {
    status: 200,
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
      'X-Conversation-Id': conversationId,
    },
  });
};

// Reject non-POST verbs cleanly (mirror contact.ts).
export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { Allow: 'POST, OPTIONS' } });
  }
  return json({ ok: false, error: 'Method not allowed. Use POST.' }, 405);
};
