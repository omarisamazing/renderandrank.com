/**
 * Tiny, dependency-free browser helper that collects the marketing / referrer
 * context the backend endpoints (/api/chat, /api/contact, /api/booking) accept
 * as optional JSON fields. The server derives geo/device itself, so the client
 * only supplies these 7 fields.
 *
 * SSR-safe: guards `typeof window` so it can be imported anywhere. When called
 * during server render (no `window`), every field is null.
 */

export interface ClientVisitorData {
  referrer: string | null;
  landing_page: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
}

/**
 * Read the current visitor's referrer, landing page and utm_* query params.
 * Each utm_* is read from the URL's query string, or null when absent.
 */
export function getClientVisitorData(): ClientVisitorData {
  // SSR / non-browser guard — return the all-null shape.
  if (typeof window === 'undefined') {
    return {
      referrer: null,
      landing_page: null,
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_term: null,
      utm_content: null,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const utm = (key: string): string | null => params.get(key);

  return {
    referrer: document.referrer || null,
    landing_page: window.location.href,
    utm_source: utm('utm_source'),
    utm_medium: utm('utm_medium'),
    utm_campaign: utm('utm_campaign'),
    utm_term: utm('utm_term'),
    utm_content: utm('utm_content'),
  };
}

/**
 * Get or generate a persistent visitor ID stored in localStorage.
 */
export function getVisitorId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = localStorage.getItem('rr_visitor_id');
    if (!id) {
      id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('rr_visitor_id', id);
    }
    return id;
  } catch {
    return 'v_ephemeral_' + Math.random().toString(36).slice(2);
  }
}

