/**
 * Cloudflare Pages Function — contact / "Send a message" form pipeline.
 *
 * Route: POST /api/contact  (Pages maps functions/api/contact.ts -> /api/contact)
 *
 * Accepts either application/x-www-form-urlencoded / multipart form data
 * (a plain <form> submit) or application/json (fetch), validates the fields,
 * and delivers the submission by email via Resend (https://resend.com).
 *
 * Configure these in the Cloudflare Pages project (Settings → Environment
 * variables / Secrets):
 *   RESEND_API_KEY  (required, encrypt as a Secret)  e.g. re_xxx
 *   CONTACT_TO      (optional) inbox that receives leads.  Default: hello@renderandrank.com
 *   CONTACT_FROM    (optional) verified Resend sender.     Default: onboarding@resend.dev
 *                   Use a sender on a domain you verified in Resend for production.
 */

import { getVisitorMetadata } from '../lib/visitor';

interface Env {
  RESEND_API_KEY?: string;
  CONTACT_TO?: string;
  CONTACT_FROM?: string;
  // Cloudflare D1 binding (configured in wrangler.toml as `DB`).
  DB?: D1Database;
  // Optional Cloudflare Turnstile secret. When set, submissions must carry a
  // valid `cf-turnstile-response` token; when unset, Turnstile is skipped.
  TURNSTILE_SECRET_KEY?: string;
  // Optional KV namespace for IP rate limiting (bound as `RATE_LIMIT` in
  // wrangler.toml). When unset, rate limiting is skipped.
  RATE_LIMIT?: KVNamespace;
}

interface Submission {
  name: string;
  email: string;
  phone: string;
  website: string;
  service: string;
  location: string;
  message: string;
  // honeypot — real users leave this empty
  company?: string;
}

const REQUIRED: (keyof Submission)[] = ['name', 'email', 'website', 'location', 'message'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Real first + last name (unicode letters, allows . ' -), at least two parts.
const NAME_RE = /^\p{L}[\p{L}.'-]*(?:\s+\p{L}[\p{L}.'-]*)+$/u;
// A domain like company.com, optionally with scheme/path.
const WEBSITE_RE = /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/\S*)?$/i;

// Upper bounds per field. Mirrored as `maxlength` on the form inputs. Anything
// over the cap is a validation failure (422), same as the other checks.
const MAX_LENGTHS: Record<string, number> = {
  name: 100,
  email: 254,
  phone: 20,
  website: 200,
  service: 100,
  location: 120,
  message: 5000,
};

/** Validate the human fields. Returns a map of field -> guidance message. */
function validateFields(data: Submission): Record<string, string> {
  const errors: Record<string, string> = {};

  // Length caps first — reject oversized input before the shape checks.
  for (const [field, max] of Object.entries(MAX_LENGTHS)) {
    const value = (data as unknown as Record<string, string>)[field] || '';
    if (value.length > max) {
      errors[field] = `Please keep this under ${max} characters.`;
    }
  }

  if (!errors.name && !NAME_RE.test(data.name)) {
    errors.name = 'Enter your first and last name.';
  }
  if (!errors.email && !EMAIL_RE.test(data.email)) {
    errors.email = 'Enter a valid email, like name@company.com.';
  }
  // Phone is optional; validate only when provided.
  if (!errors.phone && data.phone) {
    const digits = data.phone.replace(/[^\d]/g, '');
    if (digits.length < 7 || digits.length > 15) {
      errors.phone = 'Enter a valid phone number with area code.';
    }
  }
  if (!errors.website && !WEBSITE_RE.test(data.website)) {
    errors.website = 'Enter a valid website, like company.com.';
  }
  if (!errors.message && data.message.length < 10) {
    errors.message = 'Add a little more detail (at least 10 characters).';
  }

  return errors;
}

/**
 * Verify a Cloudflare Turnstile token. Gated by TURNSTILE_SECRET_KEY: when the
 * secret is unset the caller skips this entirely.
 */
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

/**
 * Fixed-window IP rate limit backed by KV. Allows up to `max` requests per
 * `windowSeconds`. Gated by env.RATE_LIMIT: when unset the caller skips this.
 * Fails open on KV errors so a storage hiccup never blocks a real lead.
 */
async function isRateLimited(
  kv: KVNamespace,
  ip: string | null,
  max = 5,
  windowSeconds = 600
): Promise<boolean> {
  if (!ip) return false;
  const key = `rl:contact:${ip}`;
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
 * Persist a submission to D1. Best-effort: a storage failure must never lose
 * the lead, so we swallow errors here (the email path still runs).
 */
async function storeSubmission(
  env: Env,
  data: Submission,
  request: Request,
  clientData?: Record<string, any>
): Promise<boolean> {
  if (!env.DB) return false;
  // Enrich with visitor metadata (geo/UA/UTM). Never throws; fields are null
  // when unavailable. The audit/contact form may send referrer/landing_page/
  // utm_* in the body — getVisitorMetadata reads them if present.
  const meta = getVisitorMetadata(request, clientData);
  try {
    await env.DB.prepare(
      `INSERT INTO submissions
        (name, email, phone, website, service, location, message, ip, user_agent,
         country, region, city, timezone, latitude, longitude, isp,
         device_type, browser, os, language, referrer, landing_page,
         utm_source, utm_medium, utm_campaign, utm_term, utm_content)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        data.name,
        data.email,
        data.phone || null,
        data.website,
        data.service || null,
        data.location,
        data.message,
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
    return true;
  } catch (err) {
    console.error('D1 insert failed', String(err));
    return false;
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function esc(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function readSubmission(request: Request): Promise<Partial<Submission>> {
  const type = request.headers.get('content-type') || '';
  if (type.includes('application/json')) {
    return (await request.json()) as Partial<Submission>;
  }
  const form = await request.formData();
  const out: Record<string, string> = {};
  for (const [key, val] of form.entries()) {
    if (typeof val === 'string') out[key] = val;
  }
  return out as Partial<Submission>;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let raw: Partial<Submission>;
  try {
    raw = await readSubmission(request);
  } catch {
    return json({ ok: false, error: 'Could not read the submission.' }, 400);
  }

  // Honeypot: silently accept bots without sending anything.
  if (raw.company && raw.company.trim() !== '') {
    return json({ ok: true });
  }

  const clientIp = request.headers.get('cf-connecting-ip');

  // Rate limit (gated on the RATE_LIMIT KV binding). Skipped when unbound.
  if (env.RATE_LIMIT && (await isRateLimited(env.RATE_LIMIT, clientIp))) {
    return json({ ok: false, error: 'Too many requests. Please try again in a few minutes.' }, 429);
  }

  // Turnstile verification (gated on TURNSTILE_SECRET_KEY). Skipped when unset.
  if (env.TURNSTILE_SECRET_KEY) {
    const token =
      typeof (raw as Record<string, unknown>)['cf-turnstile-response'] === 'string'
        ? ((raw as Record<string, string>)['cf-turnstile-response'] as string)
        : '';
    const ok = await verifyTurnstile(env.TURNSTILE_SECRET_KEY, token, clientIp);
    if (!ok) {
      return json({ ok: false, error: 'Could not verify you are human. Please try again.' }, 403);
    }
  }

  const data: Submission = {
    name: (raw.name || '').trim(),
    email: (raw.email || '').trim(),
    phone: (raw.phone || '').trim(),
    website: (raw.website || '').trim(),
    service: (raw.service || '').trim(),
    location: (raw.location || '').trim(),
    message: (raw.message || '').trim(),
  };

  const missing = REQUIRED.filter((k) => !String(data[k] || '').trim());
  if (missing.length) {
    return json({ ok: false, error: `Missing required field(s): ${missing.join(', ')}` }, 422);
  }
  const fieldErrors = validateFields(data);
  if (Object.keys(fieldErrors).length) {
    return json({ ok: false, error: 'Please check the highlighted fields.', fieldErrors }, 422);
  }

  // Persist to D1 first so the lead is durable even if email delivery fails.
  // Pass the raw body so getVisitorMetadata can read referrer/landing_page/utm_*.
  const stored = await storeSubmission(env, data, request, raw as Record<string, any>);

  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    // Misconfiguration on the server side — tell the client so it can fall back to mailto.
    return json({ ok: false, error: 'Contact endpoint is not configured yet.' }, 503);
  }

  const to = env.CONTACT_TO || 'hello@renderandrank.com';
  const from = env.CONTACT_FROM || 'Render and Rank <onboarding@resend.dev>';

  // Check for prior funnel events (AI Visibility Check, ROI calculations)
  let funnelSummaryText = '';
  let funnelSummaryHtml = '';
  const visitorId = typeof (raw as any).visitorId === 'string' ? (raw as any).visitorId : null;

  if (env.DB && visitorId) {
    try {
      const fRes = await env.DB.prepare(
        'SELECT event_type, payload, created_at FROM funnel_events WHERE visitor_id = ? ORDER BY created_at ASC LIMIT 10'
      )
        .bind(visitorId)
        .all<{ event_type: string; payload: string; created_at: string }>();

      const events = fRes.results || [];
      if (events.length > 0) {
        funnelSummaryText = '\n--- Prior Funnel Activity ---\n';
        funnelSummaryHtml = '<h3 style="margin-top:20px;font-family:sans-serif">Prior Funnel Journey</h3><ul style="font-family:sans-serif">';

        for (const ev of events) {
          try {
            const p = JSON.parse(ev.payload);
            if (ev.event_type === 'ai_check') {
              const summary = `AI Check: ${p.businessName || 'Business'} in ${p.city || ''} (Result: ${p.mentionedCount || 0}/${p.totalActiveEngines || 0} cited)`;
              funnelSummaryText += `• ${summary} [${ev.created_at}]\n`;
              funnelSummaryHtml += `<li><strong>AI Check:</strong> ${esc(p.businessName || '')} in ${esc(p.city || '')} — <em>${p.mentionedCount || 0}/${p.totalActiveEngines || 0} cited</em> (${esc(ev.created_at)})</li>`;
            } else if (ev.event_type === 'calculator') {
              const summary = `ROI Calculator: Deal $${p.dealValue || 0}, Volume ${p.searchVolume || 0}, Est. Gap $${p.monthlyGap || 0}/mo`;
              funnelSummaryText += `• ${summary} [${ev.created_at}]\n`;
              funnelSummaryHtml += `<li><strong>ROI Calculator:</strong> Job $${p.dealValue || 0}, Searches ${p.searchVolume || 0}, Gap $${p.monthlyGap || 0}/mo (${esc(ev.created_at)})</li>`;
            } else {
              funnelSummaryText += `• Event: ${ev.event_type} [${ev.created_at}]\n`;
              funnelSummaryHtml += `<li><strong>${esc(ev.event_type)}:</strong> (${esc(ev.created_at)})</li>`;
            }
          } catch {
            // ignore JSON parse error
          }
        }
        funnelSummaryHtml += '</ul>';
      }
    } catch (err) {
      console.error('Funnel query error in contact handler:', err);
    }
  }

  const lines = [
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Phone: ${data.phone || '—'}`,
    `Website: ${data.website}`,
    `Target city: ${data.location}`,
    `Interested in: ${data.service || '—'}`,
    '',
    data.message,
    funnelSummaryText,
  ];

  const html = `
    <h2>New enquiry from ${esc(data.website)}</h2>
    <table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif">
      <tr><td><strong>Name</strong></td><td>${esc(data.name)}</td></tr>
      <tr><td><strong>Email</strong></td><td>${esc(data.email)}</td></tr>
      <tr><td><strong>Phone</strong></td><td>${esc(data.phone || '—')}</td></tr>
      <tr><td><strong>Website</strong></td><td>${esc(data.website)}</td></tr>
      <tr><td><strong>Target city</strong></td><td>${esc(data.location)}</td></tr>
      <tr><td><strong>Interested in</strong></td><td>${esc(data.service || '—')}</td></tr>
    </table>
    <p style="white-space:pre-wrap;font-family:sans-serif">${esc(data.message)}</p>
    ${funnelSummaryHtml}
  `;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: data.email,
        subject: `Enquiry from ${data.website}`,
        text: lines.join('\n'),
        html,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('Resend delivery failed', detail);
      // Lead is already stored in D1, so don't fail the request for the visitor.
      if (stored) return json({ ok: true, emailed: false });
      return json({ ok: false, error: 'Delivery failed.', detail }, 502);
    }
  } catch (err) {
    console.error('Resend delivery threw', String(err));
    if (stored) return json({ ok: true, emailed: false });
    return json({ ok: false, error: 'Delivery failed.', detail: String(err) }, 502);
  }

  return json({ ok: true });
};

// Reject non-POST verbs cleanly.
export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { Allow: 'POST, OPTIONS' } });
  }
  return json({ ok: false, error: 'Method not allowed. Use POST.' }, 405);
};
