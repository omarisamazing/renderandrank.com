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

interface Env {
  RESEND_API_KEY?: string;
  CONTACT_TO?: string;
  CONTACT_FROM?: string;
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

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
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
  if (!EMAIL_RE.test(data.email)) {
    return json({ ok: false, error: 'Please provide a valid email address.' }, 422);
  }

  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    // Misconfiguration on the server side — tell the client so it can fall back to mailto.
    return json({ ok: false, error: 'Contact endpoint is not configured yet.' }, 503);
  }

  const to = env.CONTACT_TO || 'hello@renderandrank.com';
  const from = env.CONTACT_FROM || 'Render and Rank <onboarding@resend.dev>';

  const lines = [
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Phone: ${data.phone || '—'}`,
    `Website: ${data.website}`,
    `Target city: ${data.location}`,
    `Interested in: ${data.service || '—'}`,
    '',
    data.message,
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
      return json({ ok: false, error: 'Delivery failed.', detail }, 502);
    }
  } catch (err) {
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
