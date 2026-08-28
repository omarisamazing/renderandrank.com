/**
 * Cloudflare Pages Function — protected admin dashboard.
 *
 * Route: /admin  (Pages maps functions/admin/index.ts -> /admin)
 *   GET  /admin            → styled login page (Fuuld wordmark + Inter type),
 *                            or the dashboard when a valid session cookie is
 *                            present.
 *   GET  /admin?logout=1   → clears the session cookie and redirects to /admin.
 *   POST /admin            → login form submit (application/x-www-form-urlencoded,
 *                            field `password`). On success sets a signed session
 *                            cookie and 302-redirects to /admin. On failure the
 *                            styled login page is re-rendered with a 401.
 *
 * AUTH MODEL — a custom, DESIGN.md-styled login PAGE (styled to match the
 * marketing site's Fuuld wordmark + Inter typography) backed by a signed
 * session cookie. The native HTTP Basic Auth browser prompt is gone. The route
 * is designed to FAIL CLOSED:
 *
 *   - If ADMIN_PASSWORD is unset/empty, every verb returns a styled 503 and D1
 *     is never touched — there is no "default open" behaviour.
 *   - The submitted password is compared to ADMIN_PASSWORD in constant time.
 *   - The session cookie value is a signed token
 *     `base64url(payloadJson).base64url(hmac)` where the payload carries an
 *     expiry timestamp and the signature is HMAC-SHA256 (Web Crypto) over the
 *     payload using a key derived from ADMIN_PASSWORD. Verification recomputes
 *     the HMAC, compares in constant time, and rejects on any error or once the
 *     expiry has passed — any failure is treated as unauthenticated.
 *   - The dashboard's D1 query only runs AFTER the session is verified.
 *
 * Configure this in the Cloudflare Pages project (Settings → Environment
 * variables / Secrets):
 *   ADMIN_PASSWORD  (required, encrypt as a Secret) — the dashboard password.
 *                   The same secret both authenticates the login form and keys
 *                   the session-cookie HMAC, so no new secret is needed.
 *
 * The D1 database is bound as `DB` (wrangler.toml), shared with /api/contact.
 * Output is inline-styled only: the site enforces a strict CSP that permits
 * inline styles but blocks external origins (fonts/scripts/CDNs). This page
 * ships no scripts at all — the login flow is a plain <form> POST that submits
 * on Enter, and keyboard focus rings come from an inlined :focus-visible rule
 * (allowed by the CSP's `style-src 'unsafe-inline'`).
 *
 * STYLING — the page mirrors the marketing site's typography: body copy in
 * Inter ("Inter Variable" family) and the "Render Rank" wordmark in the site's
 * self-hosted display face Fuuld (/fonts/fuuld.woff2, matching
 * src/components/ui/BrandLogo.astro). @font-face rules are inlined and point at
 * same-origin URLs only, so the strict `font-src 'self'` CSP is satisfied. Only
 * functions/admin/index.ts is touched — the fonts, global.css, components and
 * _headers are untouched and reused as-is.
 */

interface Env {
  DB?: D1Database;
  ADMIN_PASSWORD?: string;
}

interface SubmissionRow {
  id: number | string | null;
  created_at: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  service: string | null;
  location: string | null;
  message: string | null;
  ip: string | null;
  user_agent: string | null;
}

interface ConversationRow {
  id: string;
  created_at: string;
  updated_at: string;
  visitor_email: string | null;
  status: string;
  msg_count: number;
}

interface MessageRow {
  role: string;
  content: string;
  created_at: string;
}

// Session cookie config. Path is scoped to /admin so the token never leaks to
// the rest of the site. SameSite=Strict blocks cross-site sends; Secure is
// added only over https (see cookieSecure) so http://127.0.0.1 dev still works.
const COOKIE_NAME = 'rr_admin_session';
const COOKIE_PATH = '/admin';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

// Shared design tokens, mirrored from src/styles/global.css / DESIGN.md so the
// standalone HTML (which cannot import Astro components) reads as native.
const INK = '#000000'; // --color-ink
const CANVAS = '#ffffff'; // --color-canvas
const HAIRLINE = '#e6e6e6'; // --color-hairline
const HAIRLINE_SOFT = '#f1f1f1'; // --color-hairline-soft
const SURFACE_SOFT = '#f7f7f5'; // --color-surface-soft
const BLOCK_LIME = '#dceeb1'; // --color-block-lime
const DESTRUCTIVE = '#b42318'; // --destructive
// Body sans — the site's --font-sans (Inter Variable + the same system stack).
const FONT_SANS =
  "'Inter Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
// Mono for eyebrows/captions/tabular data (DESIGN.md's figmaMono role; the
// substitute JetBrains Mono is in the stack, preferring a system mono first so
// nothing has to load).
const FONT_MONO =
  "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace";
// The wordmark face — the display type IS the mark (src/components/ui/
// BrandLogo.astro sets `font-display: "Fuuld", "Inter Variable", …`, keyed off
// the @font-face in src/styles/global.css). Fuuld only covers A–Z a–z 0–9
// ! , - . ? so anything outside falls back to Inter per-glyph — "Render Rank"
// stays fully inside that cut.
const FONT_DISPLAY =
  "'Fuuld', 'Inter Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"; // --font-display

/**
 * Self-hosted @font-face rules, inlined into the page <head>. Every URL is an
 * absolute same-origin path so the site's strict CSP (`font-src 'self' data:`)
 * allows them — no external origins, no CDNs, no <script>. A :focus-visible
 * rule is also inlined here so keyboard focus rings match the site
 * (`outline:2px solid ink`) everywhere on the page, not just the login input.
 *
 *   - "Fuuld"  → /fonts/fuuld.woff2 (public/fonts, served as-is; identical to
 *                the file the marketing site loads for the wordmark).
 *   - "Inter Variable" → the two Vite-hashed woff2 files Astro emits from
 *                @fontsource-variable/inter (latin + latin-ext subsets). Their
 *                hashed names are only known at build time, so this standalone
 *                Worker points the family at /fonts/fuuld.woff2's sibling: we
 *                cannot import the hashed asset here, so Inter resolves via the
 *                system fallback stack in FONT_SANS. Fuuld is the only bespoke
 *                face this page must self-host, and it is served at a stable,
 *                unhashed path.
 */
const FONT_FACE_CSS = `
@font-face {
  font-family: "Fuuld";
  src: url("/fonts/fuuld.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
:focus-visible {
  outline: 2px solid ${INK};
  outline-offset: 2px;
  border-radius: 2px;
}`;

/**
 * Leads-table styling as CSS CLASSES (inside a <style> block, so double-quoted
 * font names are fine here — the single-quote rule only applies to inline
 * style="" attributes). Clean semantic table markup — a leading row-number
 * column and a single <thead>, wrapped in a horizontally-scrollable container
 * — styled to DESIGN.md with our own monochrome + pastel-lime system. No
 * DaisyUI/Tailwind, no CDN, no external CSS/fonts (the strict CSP forbids them).
 *
 * Horizontal scroll: .rr-table uses width:max-content with a large min-width so
 * the 8 columns always render at their natural width and the table can exceed
 * .rr-scroll (which keeps overflow-x:auto), engaging a real horizontal
 * scrollbar. No column is hard-clipped: short columns stay nowrap, the Message
 * column wraps inside a 320–480px band, and Email/Website show their full value
 * (reachable via horizontal scroll) rather than being truncated.
 */
const TABLE_CSS = `
.rr-scroll {
  border: 1px solid ${HAIRLINE};
  border-radius: 8px;
  overflow-x: auto;
  overflow-y: auto;
  max-height: calc(100vh - 320px);
  min-height: 200px;
  background: ${CANVAS};
  /* Subtle right-edge scroll affordance so it's clear the table scrolls. */
  background-image: linear-gradient(to right, rgba(0,0,0,0.06), rgba(0,0,0,0) 12px), linear-gradient(to left, rgba(0,0,0,0.06), rgba(0,0,0,0) 12px);
  background-repeat: no-repeat;
  background-size: 12px 100%, 12px 100%;
  background-position: right center, left center;
  background-attachment: local, local;
}
.rr-table {
  /* Fill the dashboard width so the table snaps to its container. The flexible
     Message/thread columns absorb the remaining space (no large empty band to
     the right). A modest min-width keeps the narrow columns legible and only
     engages horizontal scroll on very small screens. */
  width: 100%;
  min-width: 640px;
  table-layout: auto;
  border-collapse: collapse;
  background: ${CANVAS};
  font-family: ${FONT_SANS};
  font-size: 13px;
  line-height: 1.45;
  letter-spacing: -0.004em;
  color: ${INK};
}
.rr-table th,
.rr-table td {
  text-align: left;
  /* 8px base: 12px vertical (sm) / 16px horizontal (md). */
  padding: 8px 12px;
  vertical-align: top;
  border-bottom: 1px solid ${HAIRLINE_SOFT};
}
/* Eyebrow-styled header labels (DESIGN.md figmaMono role). */
.rr-table thead th {
  font-family: ${FONT_MONO};
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #55554f;
  white-space: nowrap;
  /* Sticky against vertical scroll; surface-soft fill + hairline rule. */
  position: sticky;
  top: 0;
  z-index: 1;
  background: ${SURFACE_SOFT};
  border-bottom: 1px solid ${HAIRLINE};
  /* Thin lime accent as an eyebrow underline — colour used only as an accent. */
  box-shadow: inset 0 -3px 0 ${BLOCK_LIME};
}
/* Very subtle monochrome zebra + hover highlight (surface-soft). */
.rr-table tbody tr:nth-child(even) {
  background: #fcfcfb;
}
.rr-table tbody tr:hover {
  background: ${SURFACE_SOFT};
}
/* Compact columns: #, Service, Received stay single-line. */
.rr-num {
  font-family: ${FONT_MONO};
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: #9a9a93;
  text-align: right;
  white-space: nowrap;
  width: 1%;
}
.rr-name {
  font-weight: 600;
  color: ${INK};
  white-space: nowrap;
}
.rr-phone {
  font-family: ${FONT_MONO};
  font-size: 12px;
  color: #6b6b66;
  margin-top: 2px;
  white-space: nowrap;
}
.rr-service {
  white-space: nowrap;
}
/* Location: allow wrapping so long location strings stay readable. */
.rr-location {
  min-width: 120px;
  max-width: 220px;
  white-space: normal;
  overflow-wrap: anywhere;
}
/* Email/Website: show the FULL value (mono, selectable-looking) — no truncation;
   long values are reached via the table's horizontal scroll. */
.rr-copyable {
  font-family: ${FONT_MONO};
  font-size: 12.5px;
  white-space: nowrap;
  -webkit-user-select: all;
  user-select: all;
}
.rr-link {
  color: ${INK};
  text-decoration: none;
  border-bottom: 1px solid ${HAIRLINE};
}
.rr-link:hover {
  border-bottom-color: ${INK};
}
.rr-received {
  font-family: ${FONT_MONO};
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: #444;
  width: 1%;
}
.rr-muted {
  color: #9a9a93;
}
/* Message: the flexible column. It absorbs the remaining table width (no fixed
   max-width, so there is no empty band to the right of the text) and wraps
   cleanly. A min-width keeps it readable while the narrow columns stay at 1%. */
.rr-msg {
  width: auto;
  min-width: 240px;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
  color: #333;
}
/* --- Conversation message thread (CSP-safe <details>/<summary> drill-down) --- */
/* The expandable row spans the full table width; its single cell holds the
   thread. */
.rr-convo-cell {
  padding: 0 !important;
  background: ${SURFACE_SOFT};
}
/* <details> wrapper — no border of its own; the row's cell provides the frame. */
.rr-thread {
  margin: 0;
}
/* <summary> — the click/keyboard target that expands the thread. Styled as a
   compact mono affordance; list-style removed so no default triangle clutters
   the monochrome look (a +/− glyph is supplied via ::before). */
.rr-thread > summary {
  cursor: pointer;
  list-style: none;
  padding: 8px 12px;
  font-family: ${FONT_MONO};
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #55554f;
  user-select: none;
}
.rr-thread > summary::-webkit-details-marker {
  display: none;
}
.rr-thread > summary::before {
  content: '+ ';
  color: #9a9a93;
}
.rr-thread[open] > summary::before {
  content: '− ';
}
.rr-thread > summary:hover {
  color: ${INK};
}
/* Message list inside the expander. */
.rr-msglist {
  padding: 4px 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
/* A single message bubble. user vs assistant are distinguished by tint and
   alignment; long content wraps rather than overflowing. */
.rr-bubble {
  max-width: 90%;
  padding: 8px 12px;
  border: 1px solid ${HAIRLINE};
  border-radius: 10px;
  background: ${CANVAS};
  font-size: 13px;
  line-height: 1.5;
  color: #222;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}
.rr-bubble.rr-user {
  align-self: flex-end;
  background: ${BLOCK_LIME};
  border-color: #cfe295;
}
.rr-bubble.rr-assistant {
  align-self: flex-start;
}
/* Small mono caption above each bubble: role + timestamp. */
.rr-bubble-meta {
  font-family: ${FONT_MONO};
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #9a9a93;
  margin-bottom: 3px;
}
.rr-bubble.rr-user .rr-bubble-meta {
  text-align: right;
}`;

/** The wordmark, reproduced from BrandLogo.astro (Fuuld, tight tracking, em
 * word-gap). Renders "Render Rank" with capital R's, matching the inline
 * BrandLogo variant. No 'and'/ampersand — the Fuuld trial font lacks those
 * glyphs. Inline styles only; matches the site logo lockup. */
function wordmark(fontSize: string, tone: 'ink' | 'inverse' = 'ink'): string {
  const color = tone === 'inverse' ? CANVAS : INK;
  return `<span aria-label="Render Rank" translate="no" style="display:inline-flex;align-items:baseline;gap:0.22em;white-space:nowrap;font-family:${FONT_DISPLAY};font-weight:400;font-size:${fontSize};line-height:1;letter-spacing:-0.02em;color:${color};"><span aria-hidden="true">Render</span><span aria-hidden="true">Rank</span></span>`;
}

/** Escape HTML-significant characters to prevent stored-XSS from lead content. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Constant-time string comparison. Compares over a fixed number of iterations
 * so the timing does not leak how many leading characters matched. The length
 * difference is folded into the accumulator (no early return on mismatch).
 */
function timingSafeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  // Seed with the length difference so unequal-length inputs never match, while
  // still walking the full loop to avoid an early-return timing leak.
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    const ca = i < a.length ? a.charCodeAt(i) : 0;
    const cb = i < b.length ? b.charCodeAt(i) : 0;
    diff |= ca ^ cb;
  }
  return diff === 0;
}

// ---------------------------------------------------------------------------
// Signed-session helpers (Web Crypto — available in the Workers runtime).
// ---------------------------------------------------------------------------

/** base64url-encode raw bytes (RFC 4648 §5, no padding). */
function base64urlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** base64url-decode to raw bytes. Throws on malformed input (caught by callers). */
function base64urlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const encoder = new TextEncoder();

/** Import ADMIN_PASSWORD as an HMAC-SHA256 signing key. */
function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

/** Compute the base64url HMAC-SHA256 signature of `data` keyed by the secret. */
async function signPayload(secret: string, data: string): Promise<string> {
  const key = await importHmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return base64urlEncode(new Uint8Array(sig));
}

/**
 * Mint a signed session token: `base64url(payloadJson).base64url(hmac)`, where
 * the payload carries an expiry timestamp `exp` (ms since epoch).
 */
async function createSession(secret: string): Promise<string> {
  const payload = JSON.stringify({ exp: Date.now() + SESSION_TTL_MS });
  const encodedPayload = base64urlEncode(encoder.encode(payload));
  const signature = await signPayload(secret, encodedPayload);
  return `${encodedPayload}.${signature}`;
}

/** Parse the request cookie header into a name→value map. */
function parseCookies(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (!key) continue;
    out[key] = part.slice(eq + 1).trim();
  }
  return out;
}

/**
 * Verify the session cookie. Recomputes the HMAC over the payload, compares it
 * in CONSTANT TIME, and rejects when the signature is invalid or the expiry has
 * passed. Any thrown error is swallowed and treated as unauthenticated so the
 * route fails closed.
 */
async function verifySession(cookieHeader: string | null, secret: string): Promise<boolean> {
  try {
    if (!cookieHeader) return false;
    const token = parseCookies(cookieHeader)[COOKIE_NAME];
    if (!token) return false;

    const dot = token.indexOf('.');
    if (dot === -1) return false;
    const encodedPayload = token.slice(0, dot);
    const providedSig = token.slice(dot + 1);
    if (!encodedPayload || !providedSig) return false;

    const expectedSig = await signPayload(secret, encodedPayload);
    if (!timingSafeEqual(providedSig, expectedSig)) return false;

    const payloadJson = new TextDecoder().decode(base64urlDecode(encodedPayload));
    const parsed = JSON.parse(payloadJson) as { exp?: number };
    if (typeof parsed.exp !== 'number' || Date.now() >= parsed.exp) return false;

    return true;
  } catch {
    // Malformed cookie / decode failure / bad JSON → unauthenticated.
    return false;
  }
}

/** Whether the request is over https (drives the cookie Secure attribute). */
function isHttps(request: Request): boolean {
  try {
    return new URL(request.url).protocol === 'https:';
  } catch {
    return false;
  }
}

/** Build the Set-Cookie header value for a freshly minted session. */
function sessionCookie(token: string, secure: boolean): string {
  const attrs = [
    `${COOKIE_NAME}=${token}`,
    `Path=${COOKIE_PATH}`,
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];
  if (secure) attrs.push('Secure');
  return attrs.join('; ');
}

/** Build the Set-Cookie header value that clears the session (logout). */
function clearCookie(secure: boolean): string {
  const attrs = [
    `${COOKIE_NAME}=`,
    `Path=${COOKIE_PATH}`,
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=0',
  ];
  if (secure) attrs.push('Secure');
  return attrs.join('; ');
}

// ---------------------------------------------------------------------------
// HTML rendering — inline styles + inlined @font-face (strict CSP), DESIGN.md
// monochrome idiom with the site's Fuuld wordmark and Inter body type.
// ---------------------------------------------------------------------------

function html(body: string, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', ...headers },
  });
}

/** Dependency-free page shell in the DESIGN.md monochrome editorial idiom. */
function page(title: string, inner: string, bodyStyle = ''): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<meta name="color-scheme" content="light" />
<title>${esc(title)}</title>
<style>${FONT_FACE_CSS}${TABLE_CSS}</style>
</head>
<body style="margin:0;background:${CANVAS};color:${INK};font-family:${FONT_SANS};font-weight:380;letter-spacing:-0.006em;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;${bodyStyle}">
${inner}
</body>
</html>`;
}

const EYEBROW_STYLE =
  'font-family:' +
  FONT_MONO +
  ';font-size:13px;font-weight:500;letter-spacing:0.075em;text-transform:uppercase;margin:0;';

/** The login page. `error` renders the inline error state when set. */
function renderLogin(error = ''): string {
  const errorBlock = error
    ? `<p id="login-error" role="alert" style="margin:0 0 20px;padding:12px 14px;border-radius:8px;background:#fbeae8;border:1px solid #f0c9c4;color:${DESTRUCTIVE};font-size:15px;font-weight:420;line-height:1.45;letter-spacing:-0.004em;">${esc(
        error
      )}</p>`
    : '';

  // Error block reserves its own vertical space via margin only when present,
  // and lives ABOVE the form, so toggling it never shifts the input/button.
  const inner = `
<main style="min-height:100svh;min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;">
  <div style="width:100%;max-width:400px;box-sizing:border-box;">
    <div style="display:flex;justify-content:center;margin:0 0 24px;">
      ${wordmark('clamp(1.75rem,7vw,2.25rem)')}
    </div>
    <div style="box-sizing:border-box;background:${CANVAS};border:1px solid ${HAIRLINE};border-radius:24px;padding:36px 32px;">
      <p style="${EYEBROW_STYLE}margin:0 0 14px;">Admin</p>
      <h1 style="font-size:30px;font-weight:450;line-height:1.12;letter-spacing:-0.015em;margin:0 0 8px;">Sign in</h1>
      <p style="font-size:17px;font-weight:350;line-height:1.5;letter-spacing:-0.008em;margin:0 0 24px;color:${INK};">Enter the dashboard password to view submissions.</p>
      ${errorBlock}
      <form method="post" action="/admin" style="margin:0;">
        <label for="password" style="display:block;font-size:15px;font-weight:480;letter-spacing:-0.006em;margin:0 0 8px;">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autofocus
          autocomplete="current-password"
          aria-describedby="${error ? 'login-error' : ''}"
          style="box-sizing:border-box;display:block;width:100%;height:50px;border:1px solid ${HAIRLINE};border-radius:8px;background:${CANVAS};color:${INK};padding:12px 14px;font-size:17px;font-family:${FONT_SANS};letter-spacing:-0.006em;"
        />
        <button
          type="submit"
          style="box-sizing:border-box;display:block;margin-top:20px;width:100%;height:52px;border:1px solid transparent;border-radius:50px;background:${INK};color:${CANVAS};font-family:${FONT_SANS};font-size:17px;font-weight:480;letter-spacing:-0.008em;cursor:pointer;"
        >Sign in</button>
      </form>
      <p style="font-family:${FONT_MONO};font-size:12px;font-weight:400;letter-spacing:0.06em;text-transform:uppercase;color:#6b6b66;margin:18px 0 0;">Press Enter to sign in</p>
    </div>
  </div>
</main>`;

  return page('Sign in · Render and Rank Admin', inner);
}

/** Simple monochrome message page for error / misconfiguration states. */
function messagePage(status: number, heading: string, detail: string): Response {
  const inner = `
<main style="max-width:640px;margin:0 auto;padding:96px 32px;box-sizing:border-box;">
  <div style="margin:0 0 24px;">${wordmark('1.375rem')}</div>
  <p style="${EYEBROW_STYLE}margin-bottom:12px;">Admin</p>
  <h1 style="font-size:clamp(2.25rem,5vw,4rem);font-weight:400;line-height:1.06;letter-spacing:-0.017em;margin:0 0 16px;text-wrap:balance;">${esc(
    heading
  )}</h1>
  <p style="font-size:19px;font-weight:350;line-height:1.5;letter-spacing:-0.008em;margin:0;">${esc(
    detail
  )}</p>
</main>`;
  return html(page(`${heading} · Render and Rank Admin`, inner), status);
}

/**
 * Format an ISO/SQL created_at value into a compact, readable string, e.g.
 * "28 Aug 2026, 14:05". Falls back to the raw (escaped) value if parsing fails.
 */
function formatReceived(value: string | null): string {
  if (value === null || value === undefined || value === '') return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return esc(String(value));
  const day = d.getUTCDate();
  const month = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ][d.getUTCMonth()];
  const year = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return esc(`${day} ${month} ${year}, ${hh}:${mm}`);
}

/**
 * Normalise a website value to an absolute URL (add https:// when no scheme is
 * present) and return `{ href, label }` where label is the bare host. Returns
 * null when the value is empty or unparseable, so the caller can show an
 * em-dash. Both fields are pre-escaped for safe attribute/text interpolation.
 */
function formatWebsite(value: string | null): { href: string; label: string } | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    const label = u.host + (u.pathname !== '/' ? u.pathname : '');
    return { href: esc(u.toString()), label: esc(label) };
  } catch {
    return null;
  }
}

/** The 8 leads-table columns, in order, rendered once in the <thead>. */
const TABLE_HEADERS = [
  '#',
  'Name',
  'Email',
  'Website',
  'Service',
  'Location',
  'Received',
  'Message',
];

/**
 * Render a single conversation's message thread as a CSP-safe <details> block.
 * No JavaScript — a native <summary> toggles the disclosure. Every dynamic
 * value (role, content, timestamp) is escaped via esc(). Returns '' when the
 * conversation has no messages so a bare "0 messages" expander is skipped.
 */
function renderConvoThread(messages: MessageRow[]): string {
  if (!messages || messages.length === 0) return '';
  const bubbles = messages
    .map((m) => {
      const role = (m.role || '').toLowerCase();
      const roleClass = role === 'user' ? 'rr-user' : 'rr-assistant';
      const roleLabel = role === 'user' ? 'User' : role === 'assistant' ? 'Assistant' : role || '—';
      const content = m.content && m.content.trim() !== '' ? esc(m.content) : '—';
      return `<div class="rr-bubble ${roleClass}"><div class="rr-bubble-meta">${esc(
        roleLabel
      )} · ${formatReceived(m.created_at)}</div>${content}</div>`;
    })
    .join('');
  const label = messages.length === 1 ? 'View 1 message' : `View ${messages.length} messages`;
  return `<details class="rr-thread"><summary>${esc(label)}</summary><div class="rr-msglist">${bubbles}</div></details>`;
}

/** Render the table of submissions inside the monochrome editorial shell. */
function renderDashboard(
  rows: SubmissionRow[],
  convos: ConversationRow[] = [],
  messagesByConvo: Record<string, MessageRow[]> = {}
): string {
  const headerCells = TABLE_HEADERS.map((label) => `<th scope="col">${esc(label)}</th>`).join('');

  const bodyRows = rows
    .map((row, i) => {
      const dash = '<span class="rr-muted">—</span>';

      // Name (+ optional secondary mono phone line).
      const nameText = row.name && row.name.trim() !== '' ? esc(row.name) : dash;
      const phone =
        row.phone && row.phone.trim() !== ''
          ? `<div class="rr-phone">${esc(row.phone)}</div>`
          : '';
      const nameCell = `<td><span class="rr-name">${nameText}</span>${phone}</td>`;

      // Email → mailto: link. Full value shown (selectable), never truncated.
      const emailCell =
        row.email && row.email.trim() !== ''
          ? `<td class="rr-copyable"><a class="rr-link" href="mailto:${esc(row.email)}">${esc(row.email)}</a></td>`
          : `<td>${dash}</td>`;

      // Website → external link (https-normalised), bare host text. Full value
      // shown (selectable), never truncated — reachable via horizontal scroll.
      const site = formatWebsite(row.website);
      const websiteCell = site
        ? `<td class="rr-copyable"><a class="rr-link" href="${site.href}" target="_blank" rel="noopener noreferrer">${site.label}</a></td>`
        : `<td>${dash}</td>`;

      // Service / Location → plain text, em-dash when empty.
      const serviceCell = `<td class="rr-service">${
        row.service && row.service.trim() !== '' ? esc(row.service) : dash
      }</td>`;
      const locationCell = `<td class="rr-location">${
        row.location && row.location.trim() !== '' ? esc(row.location) : dash
      }</td>`;

      // Location → wraps naturally; can hold long strings.
      // Received → formatted, mono tabular, compact single-line.
      const receivedCell = `<td class="rr-received">${formatReceived(row.created_at)}</td>`;

      // Message → wraps inside a 320–480px band (no truncation); full text also
      // in title for a quick hover read.
      const messageCell =
        row.message && row.message.trim() !== ''
          ? `<td class="rr-msg" title="${esc(row.message)}">${esc(row.message)}</td>`
          : `<td>${dash}</td>`;

      return `<tr><td class="rr-num">${i + 1}</td>${nameCell}${emailCell}${websiteCell}${serviceCell}${locationCell}${receivedCell}${messageCell}</tr>`;
    })
    .join('');

  const atLimit = rows.length === 500;
  const limitNote = atLimit
    ? `<p style="font-family:${FONT_MONO};font-size:12px;font-weight:400;letter-spacing:0.06em;text-transform:uppercase;color:#6b6b66;margin:16px 0 0;">Showing the latest 500 submissions.</p>`
    : '';

  const table =
    rows.length === 0
      ? `<div style="background:${BLOCK_LIME};border-radius:24px;padding:56px 48px;text-align:center;box-sizing:border-box;">
<h2 style="font-size:28px;font-weight:400;line-height:1.2;letter-spacing:-0.013em;margin:0 0 10px;">No leads yet</h2>
<p style="font-size:18px;font-weight:350;line-height:1.55;letter-spacing:-0.008em;margin:0;max-width:520px;margin-left:auto;margin-right:auto;">Submissions from your website's contact form will appear here automatically — newest first.</p>
</div>`
      : `<div class="rr-scroll">
<table class="rr-table">
<thead><tr>${headerCells}</tr></thead>
<tbody>${bodyRows}</tbody>
</table>
</div>${limitNote}`;

  const countBadge = `<span style="display:inline-flex;align-items:center;height:28px;padding:0 12px;border:1px solid ${HAIRLINE};border-radius:50px;background:${CANVAS};font-family:${FONT_MONO};font-size:12px;font-weight:500;letter-spacing:0.04em;color:${INK};">${rows.length} total</span>`;

  // Conversations section — mirrors the Leads section's look (same <h1> inline
  // style reused for the <h2>, same count-badge pattern, same BLOCK_LIME empty
  // state). Uses the shared rr-scroll/rr-table classes.
  const convoBody = convos
    .map((c) => {
      const messages = messagesByConvo[c.id] || [];
      const thread = renderConvoThread(messages);
      // Extra full-width row beneath the summary row holding the CSP-safe
      // <details> thread. colspan=5 matches the 5 conversation columns.
      const threadRow = thread
        ? `<tr><td class="rr-convo-cell" colspan="5">${thread}</td></tr>`
        : '';
      return `<tr>
    <td class="rr-received">${formatReceived(c.created_at)}</td>
    <td class="rr-received">${formatReceived(c.updated_at)}</td>
    <td class="rr-name">${c.visitor_email ? esc(c.visitor_email) : '<span class="rr-muted">—</span>'}</td>
    <td>${esc(c.status)}</td>
    <td class="rr-num">${esc(String(c.msg_count))}</td>
  </tr>${threadRow}`;
    })
    .join('');

  const convoBadge = `<span style="display:inline-flex;align-items:center;height:28px;padding:0 12px;border:1px solid ${HAIRLINE};border-radius:50px;background:${CANVAS};font-family:${FONT_MONO};font-size:12px;font-weight:500;letter-spacing:0.04em;color:${INK};">${convos.length} total</span>`;

  const convoSection =
    convos.length === 0
      ? `<section style="margin-top:48px;"><h2 style="font-size:clamp(1.75rem,3.5vw,2.75rem);font-weight:400;line-height:1.06;letter-spacing:-0.017em;margin:0 0 20px;text-wrap:balance;">Conversations</h2><div style="background:${BLOCK_LIME};border-radius:24px;padding:56px 48px;text-align:center;box-sizing:border-box;">
<h2 style="font-size:28px;font-weight:400;line-height:1.2;letter-spacing:-0.013em;margin:0 0 10px;">No conversations yet</h2>
<p style="font-size:18px;font-weight:350;line-height:1.55;letter-spacing:-0.008em;margin:0;max-width:520px;margin-left:auto;margin-right:auto;">Chat sessions from the on-site assistant will appear here automatically — most recently active first.</p>
</div></section>`
      : `<section style="margin-top:48px;"><div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin:0 0 6px;"><h2 style="font-size:clamp(1.75rem,3.5vw,2.75rem);font-weight:400;line-height:1.06;letter-spacing:-0.017em;margin:0;text-wrap:balance;">Conversations</h2>${convoBadge}</div><p style="font-size:16px;font-weight:350;line-height:1.5;letter-spacing:-0.008em;margin:6px 0 20px;">Chat sessions from the on-site assistant, most recently active first. Expand a row to read its messages.</p><div class="rr-scroll" style="margin-top:8px;"><table class="rr-table"><thead><tr><th scope="col">Started</th><th scope="col">Last activity</th><th scope="col">Email</th><th scope="col">Status</th><th scope="col">Messages</th></tr></thead><tbody>${convoBody}</tbody></table></div></section>`;

  const inner = `
<header style="border-bottom:1px solid ${HAIRLINE};background:${CANVAS};">
  <div style="max-width:1280px;margin:0 auto;padding:16px 32px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;box-sizing:border-box;">
    <span style="display:inline-flex;align-items:baseline;gap:10px;">${wordmark(
      '1.375rem'
    )}<span style="${EYEBROW_STYLE}align-self:center;">Admin</span></span>
    <a href="/admin?logout=1" style="display:inline-flex;align-items:center;height:40px;padding:0 18px;border:1px solid ${HAIRLINE};border-radius:50px;background:${CANVAS};color:${INK};text-decoration:none;font-family:${FONT_SANS};font-size:15px;font-weight:480;letter-spacing:-0.006em;">Log out</a>
  </div>
</header>
<main style="max-width:1280px;margin:0 auto;padding:24px 32px;box-sizing:border-box;">
  <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin:0 0 6px;">
    <h1 style="font-size:clamp(1.75rem,3.5vw,2.75rem);font-weight:400;line-height:1.06;letter-spacing:-0.017em;margin:0;text-wrap:balance;">Leads</h1>
    ${countBadge}
  </div>
  <p style="font-size:16px;font-weight:350;line-height:1.5;letter-spacing:-0.008em;margin:0 0 20px;">Every enquiry from your contact form, newest first.</p>
  ${table}
  ${convoSection}
</main>`;

  return page('Leads · Render Rank Admin', inner, `background:${SURFACE_SOFT};`);
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/** Load leads from D1 and render the dashboard (auth already verified). */
async function renderDashboardResponse(env: Env): Promise<Response> {
  if (!env.DB) {
    return messagePage(
      503,
      'Database unavailable',
      'The submissions database (DB) is not bound to this environment, so leads cannot be loaded right now.'
    );
  }

  let rows: SubmissionRow[] = [];
  try {
    const result = await env.DB.prepare(
      `SELECT id, created_at, name, email, phone, website, service, location, message, ip, user_agent
       FROM submissions
       ORDER BY created_at DESC
       LIMIT 500`
    ).all<SubmissionRow>();
    rows = result.results || [];
  } catch (err) {
    console.error('D1 query failed', String(err));
    return messagePage(
      500,
      'Could not load submissions',
      'Something went wrong reading the leads database — your submissions are safe and nothing was lost. Refresh the page in a moment, and if it keeps happening check the D1 binding in the Cloudflare Pages project settings.'
    );
  }

  // Also load chat conversations (with per-conversation message counts). Kept in
  // a SEPARATE try/catch so that if the conversations/messages tables don't
  // exist yet the Leads view still renders — convos simply falls back to [].
  let convos: ConversationRow[] = [];
  if (env.DB) {
    try {
      const cres = await env.DB.prepare(
        `SELECT c.id, c.created_at, c.updated_at, c.visitor_email, c.status, COUNT(m.id) AS msg_count FROM conversations c LEFT JOIN messages m ON m.conversation_id = c.id GROUP BY c.id ORDER BY c.updated_at DESC LIMIT 500`
      ).all<ConversationRow>();
      convos = cres.results || [];
    } catch {
      convos = [];
    }
  }

  // Fetch the actual messages for the displayed conversations so the dashboard
  // can render an expandable thread per conversation (one extra query, only
  // when there are conversations). Grouped by conversation_id in JS below.
  const messagesByConvo: Record<string, MessageRow[]> = {};
  if (env.DB && convos.length > 0) {
    try {
      const ids = convos.map((c) => c.id).filter((id) => id !== null && id !== undefined);
      if (ids.length > 0) {
        const placeholders = ids.map(() => '?').join(', ');
        const mres = await env.DB.prepare(
          `SELECT conversation_id, role, content, created_at FROM messages WHERE conversation_id IN (${placeholders}) ORDER BY created_at ASC`
        )
          .bind(...ids)
          .all<MessageRow & { conversation_id: string }>();
        for (const m of mres.results || []) {
          const cid = m.conversation_id;
          if (!messagesByConvo[cid]) messagesByConvo[cid] = [];
          messagesByConvo[cid].push({ role: m.role, content: m.content, created_at: m.created_at });
        }
      }
    } catch {
      // Messages table unavailable / query failed → fall back to counts only.
    }
  }

  return html(renderDashboard(rows, convos, messagesByConvo));
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  // FAIL CLOSED: without a configured password we never authenticate and never
  // query D1. Do not treat an unset secret as "open".
  const expected = env.ADMIN_PASSWORD;
  if (!expected || expected.length === 0) {
    return messagePage(
      503,
      'Not configured',
      'This dashboard is locked until an admin password is set. In the Cloudflare Pages project, open Settings → Environment variables, add ADMIN_PASSWORD as an encrypted Secret (not a plain-text variable), then redeploy. The same secret both signs you in and keeps your session secure.'
    );
  }

  const url = new URL(request.url);
  const secure = isHttps(request);

  // Logout: clear the cookie and bounce back to /admin (which shows the login).
  if (url.searchParams.get('logout') === '1') {
    return new Response(null, {
      status: 302,
      headers: { Location: '/admin', 'Set-Cookie': clearCookie(secure) },
    });
  }

  // Valid session → dashboard. Otherwise → styled login page.
  const authed = await verifySession(request.headers.get('cookie'), expected);
  if (!authed) {
    return html(renderLogin());
  }

  return renderDashboardResponse(env);
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // FAIL CLOSED: no configured password → never authenticate, never query D1.
  const expected = env.ADMIN_PASSWORD;
  if (!expected || expected.length === 0) {
    return messagePage(
      503,
      'Not configured',
      'This dashboard is locked until an admin password is set. In the Cloudflare Pages project, open Settings → Environment variables, add ADMIN_PASSWORD as an encrypted Secret (not a plain-text variable), then redeploy. The same secret both signs you in and keeps your session secure.'
    );
  }

  const secure = isHttps(request);

  let provided = '';
  try {
    const form = await request.formData();
    const value = form.get('password');
    provided = typeof value === 'string' ? value : '';
  } catch {
    // Unreadable body → treat as a failed login (generic message).
    provided = '';
  }

  // Constant-time compare. A generic message on failure avoids revealing
  // whether the field was empty vs simply wrong.
  if (!timingSafeEqual(provided, expected)) {
    return html(renderLogin('Incorrect password.'), 401);
  }

  const token = await createSession(expected);
  return new Response(null, {
    status: 302,
    headers: { Location: '/admin', 'Set-Cookie': sessionCookie(token, secure) },
  });
};

// Reject non-GET/POST verbs cleanly (mirrors contact.ts).
export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'GET' || request.method === 'POST') return next();
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { Allow: 'GET, POST, OPTIONS' } });
  }
  return new Response('Method not allowed. Use GET or POST.', {
    status: 405,
    headers: { 'content-type': 'text/plain; charset=utf-8', Allow: 'GET, POST, OPTIONS' },
  });
};
