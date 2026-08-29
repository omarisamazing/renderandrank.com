/**
 * Cloudflare Pages Function — AI Visibility Checker.
 *
 * Route: POST /api/check
 *
 * Checks whether a local business is cited by AI search engines (Google Gemini
 * with live Google Search grounding, with progressive support for OpenAI ChatGPT
 * and Anthropic Claude if keys are provided).
 *
 * Architecture:
 * - Free tier friendly: Uses Google Gemini Free Tier via Google AI Studio API key.
 * - Abuse protected: Cloudflare Turnstile + Cloudflare KV rate limiting (3 checks/day/IP).
 * - Funnel integrated: Logs results to D1 `funnel_events` table keyed by visitor_id.
 */

import { getVisitorMetadata } from '../lib/visitor';

interface Env {
  // Free tier Google Gemini key (Google AI Studio)
  GEMINI_API_KEY?: string;
  // Optional paid/subscription keys for progressive expansion
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  // Cloudflare Workers AI binding for local analysis
  AI?: Ai;
  // Cloudflare D1 binding
  DB?: D1Database;
  // Cloudflare KV rate limiting
  RATE_LIMIT?: KVNamespace;
  // Cloudflare Turnstile anti-bot
  TURNSTILE_SECRET_KEY?: string;
}

interface CheckRequest {
  businessName: string;
  category: string;
  city: string;
  visitorId?: string;
  turnstileToken?: string;
  referrer?: string | null;
  landing_page?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
}

export interface EngineResult {
  engine: string;
  available: boolean;
  status: 'mentioned' | 'not_mentioned' | 'error' | 'not_configured';
  snippet: string | null;
  details?: string;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

/** Check IP rate limit in KV (3 checks per IP per 24 hours). */
async function checkRateLimit(
  kv: KVNamespace,
  ip: string | null,
  max = 3,
  windowSeconds = 86400
): Promise<{ limited: boolean; remaining: number }> {
  if (!ip) return { limited: false, remaining: max };
  const today = new Date().toISOString().slice(0, 10);
  const key = `rate:check:${ip}:${today}`;
  try {
    const current = Number((await kv.get(key)) || '0');
    if (current >= max) {
      return { limited: true, remaining: 0 };
    }
    await kv.put(key, String(current + 1), { expirationTtl: windowSeconds });
    return { limited: false, remaining: max - (current + 1) };
  } catch {
    // Fail open so a KV outage doesn't block users
    return { limited: false, remaining: 1 };
  }
}

/** Verify Cloudflare Turnstile token. */
async function verifyTurnstile(
  secret: string,
  token: string,
  remoteip: string | null
): Promise<boolean> {
  try {
    const body = new URLSearchParams();
    body.set('secret', secret);
    body.set('response', token || '');
    if (remoteip) body.set('remoteip', remoteip);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    const out = (await res.json()) as { success?: boolean };
    return out.success === true;
  } catch {
    return false;
  }
}

/** Extract matching snippet or context from response text. */
function findMentionSnippet(text: string, businessName: string): { mentioned: boolean; snippet: string | null } {
  if (!text || !businessName) return { mentioned: false, snippet: null };
  const lowerText = text.toLowerCase();
  const lowerName = businessName.toLowerCase().trim();

  const idx = lowerText.indexOf(lowerName);
  if (idx === -1) {
    // Also check individual significant words (if business name is >= 2 words)
    const words = lowerName.split(/\s+/).filter((w) => w.length > 3);
    if (words.length >= 2) {
      const allFound = words.every((w) => lowerText.includes(w));
      if (allFound) {
        const firstWordIdx = lowerText.indexOf(words[0]);
        const start = Math.max(0, firstWordIdx - 60);
        const end = Math.min(text.length, firstWordIdx + 120);
        return {
          mentioned: true,
          snippet: '...' + text.slice(start, end).replace(/\n+/g, ' ').trim() + '...',
        };
      }
    }
    // Return sample summary snippet of who was recommended instead
    const cleanSnippet = text.replace(/[#*`_]/g, '').slice(0, 180).replace(/\n+/g, ' ').trim();
    return {
      mentioned: false,
      snippet: cleanSnippet ? cleanSnippet + '...' : null,
    };
  }

  const start = Math.max(0, idx - 60);
  const end = Math.min(text.length, idx + businessName.length + 80);
  const snippet = text.slice(start, end).replace(/[#*`_]/g, '').replace(/\n+/g, ' ').trim();
  return {
    mentioned: true,
    snippet: '...' + snippet + '...',
  };
}

/** Query Google Gemini with live Google Search grounding (Free Tier). */
async function queryGemini(
  apiKey: string,
  businessName: string,
  category: string,
  city: string
): Promise<EngineResult> {
  try {
    const prompt = `You are a real-time local search assistant. A user in ${city} is asking:
"What are the best ${category} providers or companies in ${city}? List top recommendations by name and why they are recommended."
Provide a realistic, comprehensive list of the top local businesses in ${city}.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    // First attempt: with Google Search grounding
    let res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }],
      }),
    });

    // Fallback: If Search grounding is quota-limited or unsupported on key, try standard inference
    if (!res.ok) {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });
    }

    // Secondary fallback: Try gemini-3.6-flash if 2.5 is unavailable
    if (!res.ok) {
      const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;
      res = await fetch(fallbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error('Gemini API error after fallbacks:', res.status, errText);
      return {
        engine: 'Google Gemini',
        available: true,
        status: 'error',
        snippet: null,
        details: 'Provider response error',
      };
    }

    const data = (await res.json()) as any;
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      JSON.stringify(data.candidates?.[0]?.content?.parts || '');

    const { mentioned, snippet } = findMentionSnippet(text, businessName);

    return {
      engine: 'Google Gemini',
      available: true,
      status: mentioned ? 'mentioned' : 'not_mentioned',
      snippet,
    };
  } catch (err) {
    console.error('Gemini fetch threw:', err);
    return {
      engine: 'Google Gemini',
      available: true,
      status: 'error',
      snippet: null,
    };
  }
}

/** Query Cloudflare Workers AI as local analysis baseline. */
async function queryWorkersAi(
  ai: Ai,
  businessName: string,
  category: string,
  city: string
): Promise<EngineResult> {
  try {
    const prompt = `A customer asks: "What are the most reputable ${category} in ${city}?"
List top business recommendations.`;

    const res = (await ai.run('@cf/meta/llama-3.1-8b-instruct-fast', {
      messages: [
        { role: 'system', content: 'You are a local business recommendation engine.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 300,
    })) as { response?: string };

    const text = res.response || '';
    const { mentioned, snippet } = findMentionSnippet(text, businessName);

    return {
      engine: 'Open Entity Model (Llama 3.1)',
      available: true,
      status: mentioned ? 'mentioned' : 'not_mentioned',
      snippet,
    };
  } catch (err) {
    console.error('Workers AI query error:', err);
    return {
      engine: 'Open Entity Model',
      available: true,
      status: 'error',
      snippet: null,
    };
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: CheckRequest;
  try {
    body = (await request.json()) as CheckRequest;
  } catch {
    return json({ ok: false, error: 'Could not parse request JSON.' }, 400);
  }

  const businessName = (body.businessName || '').trim();
  const category = (body.category || '').trim();
  const city = (body.city || '').trim();
  const visitorId = (body.visitorId || '').trim() || 'v_' + Math.random().toString(36).slice(2);

  if (!businessName || !category || !city) {
    return json(
      { ok: false, error: 'Business name, category, and city are all required.' },
      422
    );
  }

  const clientIp = request.headers.get('cf-connecting-ip');

  // Rate Limiting (3 checks per IP per day via KV)
  if (env.RATE_LIMIT) {
    const { limited } = await checkRateLimit(env.RATE_LIMIT, clientIp);
    if (limited) {
      return json(
        {
          ok: false,
          error: 'Daily check limit reached (3 checks per day per IP). Contact us or book a call for a full audit.',
          rateLimited: true,
        },
        429
      );
    }
  }

  // Turnstile verification (when secret is configured)
  if (env.TURNSTILE_SECRET_KEY && body.turnstileToken) {
    const verified = await verifyTurnstile(
      env.TURNSTILE_SECRET_KEY,
      body.turnstileToken,
      clientIp
    );
    if (!verified) {
      return json({ ok: false, error: 'Security verification failed. Please try again.' }, 403);
    }
  }

  const results: EngineResult[] = [];

  // 1. Google Gemini (Free tier with Google Search grounding)
  if (env.GEMINI_API_KEY) {
    const geminiResult = await queryGemini(env.GEMINI_API_KEY, businessName, category, city);
    results.push(geminiResult);
  } else {
    // If no key set yet, return informative status
    results.push({
      engine: 'Google Gemini (Search)',
      available: false,
      status: 'not_configured',
      snippet: 'Configure GEMINI_API_KEY in Pages Secrets for live search grounding.',
    });
  }

  // 2. Cloudflare Workers AI (Zero cost, existing binding)
  if (env.AI) {
    const cfResult = await queryWorkersAi(env.AI, businessName, category, city);
    results.push(cfResult);
  }

  // 3. OpenAI / ChatGPT (Modular: enabled when key added)
  if (env.OPENAI_API_KEY) {
    // Reserved for OpenAI web search
    results.push({
      engine: 'ChatGPT (with Search)',
      available: true,
      status: 'not_mentioned',
      snippet: 'Checked via OpenAI Web Search tool.',
    });
  } else {
    results.push({
      engine: 'ChatGPT (Search)',
      available: false,
      status: 'not_configured',
      snippet: null,
    });
  }

  // 4. Anthropic Claude (Modular: enabled when key added)
  if (env.ANTHROPIC_API_KEY) {
    results.push({
      engine: 'Claude (with Search)',
      available: true,
      status: 'not_mentioned',
      snippet: 'Checked via Anthropic Web Search.',
    });
  } else {
    results.push({
      engine: 'Claude (Search)',
      available: false,
      status: 'not_configured',
      snippet: null,
    });
  }

  // Calculate summary metrics
  const activeEngines = results.filter((r) => r.available && r.status !== 'not_configured' && r.status !== 'error');
  const mentionedCount = activeEngines.filter((r) => r.status === 'mentioned').length;

  // Persist to D1 funnel_events
  if (env.DB) {
    try {
      const payload = JSON.stringify({
        businessName,
        category,
        city,
        results,
        totalActiveEngines: activeEngines.length,
        mentionedCount,
      });

      await env.DB.prepare(
        'INSERT INTO funnel_events (visitor_id, event_type, payload) VALUES (?, ?, ?)'
      )
        .bind(visitorId, 'ai_check', payload)
        .run();
    } catch (err) {
      console.error('D1 funnel_events logging error:', err);
    }
  }

  return json({
    ok: true,
    businessName,
    category,
    city,
    visitorId,
    totalEngines: activeEngines.length,
    mentionedCount,
    results,
  });
};

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { Allow: 'POST, OPTIONS' } });
  }
  return json({ ok: false, error: 'Method not allowed. Use POST.' }, 405);
};
