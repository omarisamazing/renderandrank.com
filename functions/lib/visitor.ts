/**
 * Visitor metadata helper for Render and Rank Pages Functions.
 *
 * `getVisitorMetadata(request, clientData?)` returns a FLAT object of visitor
 * context, suitable for spreading straight into a D1 INSERT. Every field is a
 * `string | null` — anything unavailable is `null`, and the function NEVER
 * throws (a bad UA or a missing `cf` object must never break a request).
 *
 * Sources:
 *   - request.headers: ip (cf-connecting-ip), user_agent, language, referrer
 *   - (request as any).cf: country, region, city, timezone, lat/long, isp
 *       NOTE: `cf` is often undefined under local `wrangler pages dev` — we
 *       guard for that and default everything from it to null.
 *   - a tiny self-contained UA parser: device_type, browser, os
 *   - clientData overrides for the fields the browser knows better:
 *       referrer, landing_page, utm_source, utm_medium, utm_campaign,
 *       utm_term, utm_content.
 */

export interface VisitorMetadata {
  ip: string | null;
  user_agent: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
  latitude: string | null;
  longitude: string | null;
  isp: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  language: string | null;
  referrer: string | null;
  landing_page: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
}

/** Coerce anything to a trimmed non-empty string with maximum length cap, else null. */
function str(value: unknown, maxLength = 500): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s.length) return null;
  return s.length > maxLength ? s.slice(0, maxLength) : s;
}

/** Prefer a client-supplied value, falling back to a server value / null. */
function pick(clientValue: unknown, serverValue: string | null): string | null {
  const c = str(clientValue);
  return c !== null ? c : serverValue;
}

/**
 * Classify device type from the user-agent. Order matters: bots and tablets
 * are checked before the generic mobile / desktop split.
 */
function parseDeviceType(ua: string): 'mobile' | 'tablet' | 'desktop' | 'bot' {
  if (/bot|crawler|spider|crawling|slurp|bingpreview|facebookexternalhit/i.test(ua)) {
    return 'bot';
  }
  // Tablets: iPad, or Android without the "Mobile" token.
  if (/ipad/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua))) {
    return 'tablet';
  }
  if (/mobi|iphone|ipod|android.*mobile|windows phone/i.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

/**
 * Classify browser from the user-agent. Order matters: Edge/Opera masquerade
 * as Chrome, and Chrome masquerades as Safari, so check the specific tokens
 * before the generic ones.
 */
function parseBrowser(ua: string): string {
  if (/edg(e|a|ios)?\//i.test(ua)) return 'Edge';
  if (/opr\/|opera/i.test(ua)) return 'Opera';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/chrome|crios|chromium/i.test(ua)) return 'Chrome';
  // Safari only counts once Chrome/Edge/Opera are ruled out.
  if (/safari/i.test(ua)) return 'Safari';
  return 'other';
}

/** Classify OS from the user-agent. iOS/Android checked before desktop OSes. */
function parseOS(ua: string): string {
  if (/windows/i.test(ua)) return 'Windows';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/android/i.test(ua)) return 'Android';
  // "Mac OS X" also appears in iOS UAs, so this comes after the iOS check.
  if (/macintosh|mac os x/i.test(ua)) return 'macOS';
  if (/linux/i.test(ua)) return 'Linux';
  return 'other';
}

export function getVisitorMetadata(
  request: Request,
  clientData?: Record<string, any>
): VisitorMetadata {
  const client = clientData || {};

  // Defensive defaults so we always return a complete, throw-free object.
  const empty: VisitorMetadata = {
    ip: null,
    user_agent: null,
    country: null,
    region: null,
    city: null,
    timezone: null,
    latitude: null,
    longitude: null,
    isp: null,
    device_type: null,
    browser: null,
    os: null,
    language: null,
    referrer: null,
    landing_page: null,
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_term: null,
    utm_content: null,
  };

  try {
    const headers = request.headers;

    const ip = str(headers.get('cf-connecting-ip'));
    const userAgent = str(headers.get('user-agent'));

    // Language: first token of accept-language (e.g. "en-US,en;q=0.9" -> "en-US").
    const acceptLanguage = headers.get('accept-language');
    const language = acceptLanguage ? str(acceptLanguage.split(',')[0]) : null;

    // Server-side referrer (spelled "referer" in the header) — used as a
    // fallback when the client didn't send one.
    const serverReferrer = str(headers.get('referer'));

    // Cloudflare geo/network context. `cf` is undefined in some local dev runs.
    const cf = (request as any).cf as Record<string, any> | undefined;
    const country = cf ? str(cf.country) : null;
    const region = cf ? str(cf.regionCode ?? cf.region) : null;
    const city = cf ? str(cf.city) : null;
    const timezone = cf ? str(cf.timezone) : null;
    const latitude = cf ? str(cf.latitude) : null;
    const longitude = cf ? str(cf.longitude) : null;
    const isp = cf ? str(cf.asOrganization) : null;

    // UA-derived fields (only when we actually have a UA string).
    const ua = userAgent || '';
    const device_type = ua ? parseDeviceType(ua) : null;
    const browser = ua ? parseBrowser(ua) : null;
    const os = ua ? parseOS(ua) : null;

    return {
      ip,
      user_agent: userAgent,
      country,
      region,
      city,
      timezone,
      latitude,
      longitude,
      isp,
      device_type,
      browser,
      os,
      language,
      // Client overrides for the fields the browser knows better.
      referrer: pick(client.referrer, serverReferrer),
      landing_page: pick(client.landing_page, null),
      utm_source: pick(client.utm_source, null),
      utm_medium: pick(client.utm_medium, null),
      utm_campaign: pick(client.utm_campaign, null),
      utm_term: pick(client.utm_term, null),
      utm_content: pick(client.utm_content, null),
    };
  } catch {
    // Never throw — return the all-null shape on any unexpected failure.
    return empty;
  }
}
