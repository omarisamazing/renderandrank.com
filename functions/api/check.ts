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
 * - Engines fan out in parallel with per-engine timeouts; OpenAI/Anthropic run
 *   real queries when keys are configured (failures report `error`, never a
 *   canned verdict).
 * - Abuse protected: Cloudflare Turnstile + Cloudflare KV rate limiting (3 checks/day/IP, rolling 24h).
 * - Funnel integrated: Logs results to D1 `funnel_events` table keyed by visitor_id.
 */

import { getVisitorMetadata } from '../lib/visitor';
import {
  sameEntity,
  looksLikeBusinessName,
  findMentionSnippet,
  extractCompetitors,
  parseGrounding,
  groundingVerifies,
  consensusScore,
  cacheKeyFor,
} from '../lib/entityMatch';
import { bucketForCategory, volumeMultiplier } from '../../src/data/assumptions';

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
  /**
   * Citation strength (Gemini grounded answers): 'verified' means a search
   * grounding source names the business; 'mention' means the answer text
   * names it without a cited source; 'none' means neither. Non-grounded
   * engines report 'mention'/'none' from text matching only.
   */
  citation?: 'verified' | 'mention' | 'none';
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

/** Check IP rate limit in KV (3 checks per IP per rolling 24 hours). */
async function checkRateLimit(
  kv: KVNamespace,
  ip: string | null,
  max = 3,
  windowSeconds = 86400
): Promise<{ limited: boolean; remaining: number }> {
  if (!ip) return { limited: false, remaining: max };
  const key = `rate:check:${ip}`;
  try {
    const raw = await kv.get(key);
    const now = Date.now();
    let start = now;
    let count = 0;
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { start?: number; count?: number };
        if (typeof parsed.start === 'number' && typeof parsed.count === 'number') {
          start = parsed.start;
          count = parsed.count;
        }
      } catch {
        // corrupt entry — reset below
      }
    }
    if (now - start > windowSeconds * 1000) {
      start = now;
      count = 0;
    }
    if (count >= max) {
      return { limited: true, remaining: 0 };
    }
    const ttl = Math.max(60, Math.ceil((start + windowSeconds * 1000 - now) / 1000));
    await kv.put(key, JSON.stringify({ start, count: count + 1 }), { expirationTtl: ttl });
    return { limited: false, remaining: max - (count + 1) };
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

/** Query Google Gemini with live Google Search grounding (Free Tier).
 *  Two prompt variants run as independent samples: 'direct' asks for the best
 *  providers outright; 'implicit' poses as a buyer with a problem. */
/** fetch with a hard timeout so one slow provider cannot stall the scan. */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = 15000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Full engine answer plus the match result. The full text stays server-side
 *  (competitor extraction); only the snippet ships to the client. */
interface EngineOutcome {
  result: EngineResult;
  fullText: string;
  /** URLs the engine cited via search grounding (Gemini only, else []). */
  groundingUrls?: string[];
}

async function queryGemini(
  apiKey: string,
  businessName: string,
  category: string,
  city: string,
  variant: 'direct' | 'implicit' = 'direct'
): Promise<EngineOutcome> {
  const engineLabel = variant === 'direct' ? 'Google Gemini' : 'Google Gemini · alternate phrasing';
  const fail = (details: string): EngineOutcome => ({
    result: {
      engine: engineLabel,
      available: true,
      status: 'error',
      snippet: null,
      details,
    },
    fullText: '',
  });
  try {
    const prompt =
      variant === 'direct'
        ? `You are a real-time local search assistant. A user in ${city} is asking:
"What are the best ${category} providers or companies in ${city}? List top recommendations by name and why they are recommended."
Name only real, verifiable businesses in ${city} — never invent names. Provide a realistic, comprehensive list of the top local businesses in ${city}.`
        : `You are a real-time local search assistant. A user in ${city} says:
"I need help with ${category} in ${city}. Who should I call?"
Name only real, verifiable businesses in ${city} — never invent names. Recommend the top local providers by name and why you recommend each.`;

    // Google retired gemini-2.5-flash (404 NOT_FOUND); gemini-3.6-flash is
    // the current flash model per the API error message.
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent';
    const headers = {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    };

    // Attempts in order: Search-grounded, then plain inference. A throw
    // (e.g. timeout) falls through to the next attempt instead of failing
    // the engine outright.
    const attempts: Array<Record<string, unknown>> = [
      {
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }],
      },
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
    ];

    let text = '';
    let lastError = 'Provider response error';
    // Search grounding sources cited for the winning attempt (empty when the
    // plain-inference fallback wins or grounding returns no chunks).
    let groundingUrls: string[] = [];
    let groundingTitles: string[] = [];
    for (const attempt of attempts) {
      try {
        const res = await fetchWithTimeout(
          url,
          { method: 'POST', headers, body: JSON.stringify(attempt) },
          15000
        );
        if (!res.ok) {
          lastError = 'Provider response error';
          console.error('Gemini API error:', res.status, await res.text());
          continue;
        }
        const data = (await res.json()) as any;
        text =
          data.candidates?.[0]?.content?.parts?.[0]?.text ||
          JSON.stringify(data.candidates?.[0]?.content?.parts || '');
        const grounding = parseGrounding(data.candidates?.[0]);
        groundingUrls = grounding.urls;
        groundingTitles = grounding.titles;
        lastError = '';
        break;
      } catch (err) {
        lastError = err instanceof Error && err.name === 'AbortError' ? 'Request timed out' : 'Request failed';
        console.error('Gemini attempt threw:', err);
      }
    }

    if (!text) return fail(lastError);

    const { mentioned, snippet } = findMentionSnippet(text, businessName);
    // Verified citation: a search grounding source itself names the business
    // (chunk title match) — stronger than the answer prose naming it.
    const verified = mentioned && groundingVerifies(groundingTitles, businessName);

    return {
      result: {
        engine: engineLabel,
        available: true,
        status: mentioned ? 'mentioned' : 'not_mentioned',
        snippet,
        citation: !mentioned ? 'none' : verified ? 'verified' : 'mention',
      },
      fullText: text,
      groundingUrls,
    };
  } catch (err) {
    console.error('Gemini fetch threw:', err);
    return fail(err instanceof Error && err.name === 'AbortError' ? 'Request timed out' : 'Request failed');
  }
}

/** Query Cloudflare Workers AI as local analysis baseline. */
async function queryWorkersAi(
  ai: Ai,
  businessName: string,
  category: string,
  city: string
): Promise<EngineOutcome> {
  const fail: EngineOutcome = {
    result: {
      engine: 'Open Entity Model (Llama 3.1)',
      available: true,
      status: 'error',
      snippet: null,
    },
    fullText: '',
  };
  try {
    const prompt = `A customer asks: "What are the most reputable ${category} in ${city}?"
Name only real, verifiable businesses — never invent names. List top business recommendations.`;

    // ai.run exposes no abort signal, so race it against a timeout.
    const res = (await Promise.race([
      ai.run('@cf/meta/llama-3.1-8b-instruct-fast', {
        messages: [
          { role: 'system', content: 'You are a local business recommendation engine.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 300,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Workers AI timed out')), 15000)
      ),
    ])) as { response?: string };

    const text = res.response || '';
    const { mentioned, snippet } = findMentionSnippet(text, businessName);

    return {
      result: {
        engine: 'Open Entity Model (Llama 3.1)',
        available: true,
        status: mentioned ? 'mentioned' : 'not_mentioned',
        snippet,
        citation: mentioned ? 'mention' : 'none',
      },
      fullText: text,
    };
  } catch (err) {
    console.error('Workers AI query error:', err);
    return fail;
  }
}

/** Query OpenAI ChatGPT with the same local-recommendation prompt. Real query
 *  (never a canned verdict): failures surface as `error`, not `not_mentioned`. */
async function queryOpenAi(
  apiKey: string,
  businessName: string,
  category: string,
  city: string
): Promise<EngineOutcome> {
  const fail = (details: string): EngineOutcome => ({
    result: {
      engine: 'ChatGPT',
      available: true,
      status: 'error',
      snippet: null,
      details,
    },
    fullText: '',
  });
  try {
    const res = await fetchWithTimeout(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.2,
          max_tokens: 400,
          messages: [
            { role: 'system', content: 'You are a local business recommendation engine.' },
            {
              role: 'user',
              content: `A customer asks: "What are the most reputable ${category} providers in ${city}?" Name only real, verifiable businesses — never invent names. List the top business recommendations by name and why they are recommended.`,
            },
          ],
        }),
      },
      15000
    );
    if (!res.ok) {
      console.error('OpenAI API error:', res.status, await res.text());
      return fail('Provider response error');
    }
    const data = (await res.json()) as any;
    const text: string = data.choices?.[0]?.message?.content || '';
    const { mentioned, snippet } = findMentionSnippet(text, businessName);
    return {
      result: {
        engine: 'ChatGPT',
        available: true,
        status: mentioned ? 'mentioned' : 'not_mentioned',
        snippet,
      },
      fullText: text,
    };
  } catch (err) {
    console.error('OpenAI fetch threw:', err);
    return fail(err instanceof Error && err.name === 'AbortError' ? 'Request timed out' : 'Request failed');
  }
}

/** Query Anthropic Claude with the same local-recommendation prompt. Real query
 *  (never a canned verdict): failures surface as `error`, not `not_mentioned`. */
async function queryAnthropic(
  apiKey: string,
  businessName: string,
  category: string,
  city: string
): Promise<EngineOutcome> {
  const fail = (details: string): EngineOutcome => ({
    result: {
      engine: 'Claude',
      available: true,
      status: 'error',
      snippet: null,
      details,
    },
    fullText: '',
  });
  try {
    const res = await fetchWithTimeout(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 400,
          system: 'You are a local business recommendation engine.',
          messages: [
            {
              role: 'user',
              content: `A customer asks: "What are the most reputable ${category} providers in ${city}?" Name only real, verifiable businesses — never invent names. List the top business recommendations by name and why they are recommended.`,
            },
          ],
        }),
      },
      15000
    );
    if (!res.ok) {
      console.error('Anthropic API error:', res.status, await res.text());
      return fail('Provider response error');
    }
    const data = (await res.json()) as any;
    const text: string =
      (data.content || [])
        .filter((b: any) => b?.type === 'text')
        .map((b: any) => b.text)
        .join('\n') || '';
    const { mentioned, snippet } = findMentionSnippet(text, businessName);
    return {
      result: {
        engine: 'Claude',
        available: true,
        status: mentioned ? 'mentioned' : 'not_mentioned',
        snippet,
      },
      fullText: text,
    };
  } catch (err) {
    console.error('Anthropic fetch threw:', err);
    return fail(err instanceof Error && err.name === 'AbortError' ? 'Request timed out' : 'Request failed');
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: CheckRequest;
  try {
    body = (await request.json()) as CheckRequest;
  } catch {
    return json({ ok: false, error: 'Could not parse request JSON.' }, 400);
  }

  const businessName = (body.businessName || '').trim().slice(0, 100);
  const category = (body.category || '').trim().slice(0, 80);
  const city = (body.city || '').trim().slice(0, 80);
  const visitorId =
    (body.visitorId || '').trim().slice(0, 128) ||
    'v_' + Math.random().toString(36).slice(2);

  if (!businessName || !category || !city) {
    return json(
      { ok: false, error: 'Business name, category, and city are all required.' },
      422
    );
  }

  const clientIp = request.headers.get('cf-connecting-ip');

  // Result cache: identical normalized inputs served from KV for 24h. Cache
  // hits skip the engines AND the rate-limit counter, so re-scans and shared
  // links are stable and quota-friendly.
  let cacheKey = '';
  if (env.RATE_LIMIT) {
    cacheKey = cacheKeyFor(businessName, category, city);
    try {
      const cached = await env.RATE_LIMIT.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as Record<string, unknown>;
        return json({ ...parsed, visitorId, cached: true });
      }
    } catch {
      // cache miss — run the live scan below
    }
  }

  // Rate Limiting (3 checks per IP per rolling 24 hours via KV)
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
  // Full engine answers stay server-side: competitor extraction runs over the
  // complete text, while only short snippets ship to the client.
  const fullTexts: Array<{ engine: string; text: string }> = [];

  // Fan out to every configured engine in parallel (total latency ~= slowest
  // engine, not the sum). Each query carries its own timeout and reports
  // failures as `error` — never a canned verdict.
  const engineTasks: Array<Promise<EngineOutcome> | EngineOutcome> = [];

  // 1. Google Gemini (Free tier with Google Search grounding) — two prompt
  // phrasings as independent samples for consensus.
  if (env.GEMINI_API_KEY) {
    engineTasks.push(queryGemini(env.GEMINI_API_KEY, businessName, category, city, 'direct'));
    engineTasks.push(queryGemini(env.GEMINI_API_KEY, businessName, category, city, 'implicit'));
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
    engineTasks.push(queryWorkersAi(env.AI, businessName, category, city));
  }

  // 3. OpenAI / ChatGPT (enabled when key added)
  if (env.OPENAI_API_KEY) {
    engineTasks.push(queryOpenAi(env.OPENAI_API_KEY, businessName, category, city));
  } else {
    results.push({
      engine: 'ChatGPT (Search)',
      available: false,
      status: 'not_configured',
      snippet: null,
    });
  }

  // 4. Anthropic Claude (enabled when key added)
  if (env.ANTHROPIC_API_KEY) {
    engineTasks.push(queryAnthropic(env.ANTHROPIC_API_KEY, businessName, category, city));
  } else {
    results.push({
      engine: 'Claude (Search)',
      available: false,
      status: 'not_configured',
      snippet: null,
    });
  }

  const settled = await Promise.allSettled(engineTasks);
  for (const entry of settled) {
    if (entry.status === 'fulfilled') {
      results.push(entry.value.result);
      if (entry.value.fullText) {
        fullTexts.push({ engine: entry.value.result.engine, text: entry.value.fullText });
      }
    } else {
      console.error('Engine task rejected:', entry.reason);
      results.push({
        engine: 'Answer engine',
        available: true,
        status: 'error',
        snippet: null,
        details: 'Engine query failed',
      });
    }
  }

/** Estimate realistic transaction values and search volume by industry.
 *  Delegates to the shared assumptions module (single source of truth with
 *  the browser calculator). */
function estimateIndustryMetrics(category: string, city: string): {
  dealValue: number;
  minDeal: number;
  maxDeal: number;
  searchVolume: number;
} {
  const bucket = bucketForCategory(category);
  const mult = volumeMultiplier(city);
  return {
    dealValue: bucket.dealValue,
    minDeal: bucket.minDeal,
    maxDeal: bucket.maxDeal,
    searchVolume: Math.round(bucket.searchVolume * mult),
  };
}

/**
 * Use Workers AI (free) as an entity extractor over the full engine answers.
 * Returns business names plus whether the target business is present, or null
 * when extraction fails (caller falls back to the regex extractor).
 */
async function extractEntitiesWithLlama(
  ai: Ai,
  sections: Array<{ engine: string; text: string }>,
  businessName: string,
  category: string,
  city: string
): Promise<{ businesses: string[]; targetInSections: boolean[] } | null> {
  try {
    const corpus = sections
      .map((s, i) => `[Answer ${i + 1} — ${s.engine}]\n${s.text}`)
      .join('\n---\n')
      .slice(0, 3500);
    if (!corpus.trim()) return null;
    const prompt = `You extract business names from AI answers. From the answers below, list every local business recommended for "${category}" in ${city}.
List only proper business names — never section headings (like "Why Recommend It"), field labels (like "Location" or "Address"), or generic phrases.
${corpus}
Is the business "${businessName}" named anywhere (allow abbreviations and minor spelling differences)? Answer per section in order.
Reply with JSON only, no other text: {"businesses": ["Name 1", "Name 2"], "target_in_sections": [true, false]}`;

    const res = (await Promise.race([
      ai.run('@cf/meta/llama-3.1-8b-instruct-fast', {
        messages: [
          { role: 'system', content: 'You extract business names and reply with JSON only.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 400,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Extractor timed out')), 12000)
      ),
    ])) as { response?: string };

    const raw = (res.response || '').trim();
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    const parsed = JSON.parse(raw.slice(start, end + 1)) as {
      businesses?: unknown;
      target_in_sections?: unknown;
    };
    if (!Array.isArray(parsed.businesses)) return null;
    const businesses = parsed.businesses
      .filter((b): b is string => typeof b === 'string')
      .map((b) => b.replace(/[*_#]/g, '').trim())
      .filter((b) => looksLikeBusinessName(b, businessName))
      .slice(0, 5);
    const targetInSections = Array.isArray(parsed.target_in_sections)
      ? parsed.target_in_sections.map((v) => v === true)
      : [];
    return { businesses, targetInSections };
  } catch (err) {
    console.error('Entity extractor error:', err);
    return null;
  }
}

  // Calculate summary metrics. Samples are weighted: search-grounded Gemini
  // phrasings count most, the memory-baseline Llama counts least.
  const activeEngines = results.filter((r) => r.available && r.status !== 'not_configured' && r.status !== 'error');

  if (activeEngines.length === 0) {
    return json(
      { ok: false, error: 'All answer engines failed this run. Try again in a minute, or book a call and we will run the audit for you.' },
      502
    );
  }

  // Extract competitor entities across all full engine answers (not the
  // truncated client snippets, which would hide most named businesses).
  // Prefer the LLM extractor; fall back to the regex parser when it fails.
  // The extractor also corroborates the target: when it finds the business
  // under an alias or paraphrase the string matcher missed, those samples
  // upgrade to mentioned.
  const allText = fullTexts.length > 0 ? fullTexts.map((s) => s.text).join('\n') : results.map((r) => r.snippet || '').join(' ');
  let competitorsFound = extractCompetitors(allText, businessName);
  if (env.AI && fullTexts.length > 0) {
    const extracted = await extractEntitiesWithLlama(env.AI, fullTexts, businessName, category, city);
    if (extracted) {
      if (extracted.businesses.length > 0) {
        competitorsFound = extracted.businesses.slice(0, 3);
      }
      extracted.targetInSections.forEach((present, i) => {
        const sample = i < fullTexts.length ? activeEngines.find((r) => r.engine === fullTexts[i].engine) : undefined;
        if (present && sample && sample.status === 'not_mentioned') {
          sample.status = 'mentioned';
          if (!sample.citation) sample.citation = 'mention';
        }
      });
    }
  }

  const mentionedCount = activeEngines.filter((r) => r.status === 'mentioned').length;
  const verifiedCount = activeEngines.filter((r) => r.citation === 'verified').length;

  // Weighted consensus score (see entityMatch.consensusScore): grounded Gemini
  // phrasings count most, the Llama memory baseline counts least.
  let visibilityScore = consensusScore(
    activeEngines.map((r) => ({
      engine: r.engine,
      mentioned: r.status === 'mentioned',
      verified: r.citation === 'verified',
    }))
  );
  if (mentionedCount === 0) {
    // Floor: a clean "not cited" reads 15–22, never 0 — 0 would imply a
    // broken scan rather than a real absence.
    visibilityScore = competitorsFound.length > 0 ? 22 : 15;
  }

  // Confidence: high when samples agree or a citation is verified; low on a
  // single sample or any engine error; medium otherwise.
  const errorCount = results.filter((r) => r.available && r.status === 'error').length;
  const samplesAgree =
    mentionedCount === 0 || mentionedCount === activeEngines.length;
  const confidence: 'high' | 'medium' | 'low' =
    verifiedCount > 0 || (activeEngines.length >= 3 && samplesAgree)
      ? 'high'
      : activeEngines.length <= 1 || errorCount > 0 || !samplesAgree
        ? 'low'
        : 'medium';

  // A thin-evidence 100 looks rigged next to a "limited evidence" label:
  // cap low-confidence scores below the top band.
  if (confidence === 'low' && mentionedCount > 0) {
    visibilityScore = Math.min(visibilityScore, 75);
  }

  // Auto-calibrate Industry Metrics for ROI Calculator
  const industryMetrics = estimateIndustryMetrics(category, city);

  // Determine recommended initial rank state — normalized by mention RATIO
  // so 2/5 cited (minority) doesn't read as a top-3 win.
  const mentionRatio = activeEngines.length > 0 ? mentionedCount / activeEngines.length : 0;
  let recommendedRank: 'invisible' | 'mid' | 'top3' = 'invisible';
  if (mentionRatio >= 0.6) {
    recommendedRank = 'top3';
  } else if (mentionRatio >= 0.3) {
    recommendedRank = 'mid';
  }

  // Determine Rank Position / Status
  let rankPosition = 'Displaced by Competitors';
  if (mentionRatio >= 0.6) {
    rankPosition = '#1 Recommended Provider';
  } else if (mentionRatio >= 0.3) {
    rankPosition = 'Top 3 Cited Entity';
  } else if (competitorsFound.length > 0) {
    rankPosition = `Displaced by ${competitorsFound[0]}`;
  }

  // Plain-English diagnostic summary
  let diagnosticSummary = '';
  if (mentionRatio >= 0.6) {
    diagnosticSummary = `Dominant AI Citation Authority. Your business is recommended across all tested generative answer engines.`;
  } else if (mentionRatio >= 0.3) {
    diagnosticSummary = competitorsFound.length > 0
      ? `Partial AI Citation Presence. Cited in Google Search, but open assistant queries are directed to ${competitorsFound[0]}.`
      : `Partial AI Citation Presence. Cited in Google Search recommendations.`;
  } else {
    diagnosticSummary = competitorsFound.length > 0
      ? `Zero AI Recommendations. AI assistants are sending local ${category} customers to ${competitorsFound.slice(0, 2).join(' and ')} instead.`
      : `Zero AI Recommendations. When local buyers ask for ${category} in ${city}, AI models do not cite your business.`;
  }

  // Entity Authority Signals
  const geminiSamples = results.filter((r) => r.engine.includes('Gemini') && r.available && r.status !== 'error');
  const geminiVerified = geminiSamples.some((r) => r.citation === 'verified');
  const geminiMentioned = geminiSamples.some((r) => r.status === 'mentioned');
  const keySignals = [
    {
      name: 'Google AI Search Grounding',
      status: geminiVerified ? 'good' : geminiMentioned ? 'warning' : 'missing',
      label:
        geminiVerified
          ? 'A Google Search source cites your business directly'
          : geminiMentioned
            ? 'Named in AI answers, but no search source confirms it yet'
            : 'Missing from top Google Search generative recommendations',
    },
    {
      name: 'Local Knowledge Graph Presence',
      status: results.find((r) => r.engine.includes('Llama'))?.status === 'mentioned' ? 'good' : 'missing',
      label:
        results.find((r) => r.engine.includes('Llama'))?.status === 'mentioned'
          ? 'Strong citation presence in open assistant knowledge'
          : 'Local queries diverted to competing providers',
    },
    {
      name: 'Competitor Citation Density',
      status: competitorsFound.length > 0 ? 'warning' : 'good',
      label:
        competitorsFound.length > 0
          ? `${competitorsFound.length} competitor entities dominating local search answers`
          : 'Low competitor saturation in this niche',
    },
  ];

  // Filter results for client: only return active engines with real data
  const clientResults = results.filter((r) => r.available && r.status !== 'not_configured');

  // Enrich the funnel event with visitor context (geo/device/UTM). Never throws;
  // fields are null when unavailable. Nested under a `visitor` sub-object so the
  // visitor's geo `city` never collides with the searched `city` at top level.
  let visitor: Record<string, string | null> | null = null;
  try {
    const meta = getVisitorMetadata(request, body as Record<string, any>);
    visitor = {
      country: meta.country,
      region: meta.region,
      city: meta.city,
      device_type: meta.device_type,
      browser: meta.browser,
      os: meta.os,
      referrer: meta.referrer,
      landing_page: meta.landing_page,
      utm_source: meta.utm_source,
      utm_medium: meta.utm_medium,
      utm_campaign: meta.utm_campaign,
      timezone: meta.timezone,
      isp: meta.isp,
      language: meta.language,
    };
  } catch (err) {
    console.error('getVisitorMetadata failed in check handler:', err);
    visitor = null;
  }

  // Persist to D1 funnel_events
  if (env.DB) {
    try {
      const payload = JSON.stringify({
        businessName,
        category,
        city,
        visibilityScore,
        rankPosition,
        diagnosticSummary,
        competitorsFound,
        recommendedDealValue: industryMetrics.dealValue,
        recommendedSearchVolume: industryMetrics.searchVolume,
        recommendedRank,
        results: clientResults,
        totalActiveEngines: activeEngines.length,
        mentionedCount,
        verifiedCount,
        confidence,
        visitor,
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

  const responseBody = {
    ok: true,
    businessName,
    category,
    city,
    visitorId,
    visibilityScore,
    rankPosition,
    diagnosticSummary,
    competitorsFound,
    keySignals,
    recommendedDealValue: industryMetrics.dealValue,
    recommendedMinDeal: industryMetrics.minDeal,
    recommendedMaxDeal: industryMetrics.maxDeal,
    recommendedSearchVolume: industryMetrics.searchVolume,
    recommendedRank,
    totalEngines: activeEngines.length,
    mentionedCount,
    verifiedCount,
    confidence,
    confidenceNote:
      confidence === 'high'
        ? `Agreed across ${activeEngines.length} samples${verifiedCount > 0 ? ', backed by a Google Search citation' : ''}.`
        : confidence === 'medium'
          ? `Based on ${activeEngines.length} samples with partial agreement.`
          : 'Limited evidence this run — a sample failed or samples disagree. Re-run for confirmation.',
    results: clientResults,
  };

  // Cache the verdict for 24h so identical scans are stable and quota-light.
  if (env.RATE_LIMIT && cacheKey) {
    try {
      const { visitorId: _dropped, ...cacheable } = responseBody;
      await env.RATE_LIMIT.put(cacheKey, JSON.stringify(cacheable), { expirationTtl: 86400 });
    } catch (err) {
      console.error('Check cache write failed:', err);
    }
  }

  return json(responseBody);
};

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { Allow: 'POST, OPTIONS' } });
  }
  return json({ ok: false, error: 'Method not allowed. Use POST.' }, 405);
};
