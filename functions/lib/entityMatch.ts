/**
 * Pure entity-matching and scoring helpers for the AI Visibility Checker
 * (`functions/api/check.ts`). Deliberately dependency-free (no Cloudflare
 * bindings) so the accuracy-critical logic is unit-testable with plain node.
 */

/** Normalize a business name for comparison: lowercase, strip legal suffixes
 *  and punctuation, collapse whitespace. "Apex Climate Heating, LLC" and
 *  "apex climate heating" normalize identically. */
export function normalizeEntity(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/\b(llc|inc|co|corp|ltd|llp|pllc|pa|dba)\b\.?/g, '')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9\s&]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Core tokens of a normalized name, minus stopwords, for fuzzy comparison. */
export function entityTokens(normalized: string): string[] {
  const stop = new Set(['the', 'a', 'an', 'of', 'and', '&', 'in', 'at', 'for']);
  return normalized.split(' ').filter((w) => w && !stop.has(w));
}

/** Do two business names refer to the same entity? Exact normalized match, or
 *  the shorter token set is fully contained in the longer (covers "Apex
 *  Climate" vs "Apex Climate Heating"). Single-token names require exact
 *  match to avoid false positives. */
export function sameEntity(a: string, b: string): boolean {
  const na = normalizeEntity(a);
  const nb = normalizeEntity(b);
  if (!na || !nb) return false;
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;
  const ta = entityTokens(na);
  const tb = entityTokens(nb);
  if (ta.length < 2 || tb.length < 2) return false;
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  return short.every((t) => long.includes(t));
}

/** Lowercase connectors allowed inside real business names. */
export const NAME_CONNECTORS = new Set(['&', 'of', 'the', 'and', 'de', 'la', 'el', '-', 'for']);

/** First words that mark imperative/question headings, never businesses. */
export const HEADING_FIRST_WORDS = new Set([
  'check', 'ask', 'call', 'contact', 'get', 'find', 'look', 'ensure', 'make',
  'choose', 'read', 'see', 'visit', 'compare', 'avoid', 'know', 'learn', 'try',
  'book', 'schedule', 'request', 'verify', 'confirm', 'consider', 'remember',
  'keep', 'bring', 'take', 'use', 'what', 'why', 'when', 'where', 'how',
  'which', 'who',
]);

/** Whole-string blocklist for answer headings and field labels that are never
 *  business names. */
export const GENERIC_NAME_BLOCK =
  /^(here|top|based|recommendations?|summary|note|best|first|second|ranked|address(es)?|phone|hours|website|email|rating|ratings|rated|reviews?|cost|prices?|services?|open|closed|locations?|why recommend.*|key strengths|pros|cons|verdict|overview|comparison|bottom line|our take|quick answer)$/i;

/** Shared quality gate for candidate business names from any source (regex or
 *  LLM extractor): plausible length, title-cased words, no imperative /
 *  question first word, not the target, not a generic heading. */
export function looksLikeBusinessName(raw: string, businessName: string): boolean {
  if (raw.length <= 2 || raw.length >= 45) return false;
  const words = raw.split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;
  if (HEADING_FIRST_WORDS.has(words[0].toLowerCase())) return false;
  const titleCased = words.every(
    (w) => NAME_CONNECTORS.has(w.toLowerCase()) || /^[A-Z0-9]/.test(w)
  );
  return (
    titleCased &&
    !sameEntity(raw, businessName) &&
    !GENERIC_NAME_BLOCK.test(raw)
  );
}

/** Extract matching snippet or context from response text. Matching is done on
 *  normalized names (case, punctuation, and legal suffixes ignored) so "Apex
 *  Climate Heating, LLC" matches "apex climate heating". */
export function findMentionSnippet(
  text: string,
  businessName: string
): { mentioned: boolean; snippet: string | null } {
  if (!text || !businessName) return { mentioned: false, snippet: null };
  const normText = normalizeEntity(text);
  const normName = normalizeEntity(businessName);
  if (!normName) return { mentioned: false, snippet: null };

  // Byte-accurate fast path: raw substring match gives exact snippet windows.
  const lowerText = text.toLowerCase();
  const rawIdx = lowerText.indexOf(businessName.toLowerCase().trim());
  if (rawIdx !== -1) {
    const start = Math.max(0, rawIdx - 60);
    const end = Math.min(text.length, rawIdx + businessName.trim().length + 80);
    const snippet = text.slice(start, end).replace(/[#*`_]/g, '').replace(/\n+/g, ' ').trim();
    return {
      mentioned: true,
      snippet: '...' + snippet + '...',
    };
  }

  // Normalized match: catches suffix/punctuation variants where positions
  // shift under normalization, so locate the window via the first token.
  if (normText.includes(normName)) {
    const firstToken = entityTokens(normName)[0] || normName;
    const anchor = lowerText.indexOf(firstToken);
    const start = Math.max(0, (anchor === -1 ? 0 : anchor) - 60);
    const end = Math.min(text.length, start + 220);
    const snippet = text.slice(start, end).replace(/[#*`_]/g, '').replace(/\n+/g, ' ').trim();
    return {
      mentioned: true,
      snippet: '...' + snippet + '...',
    };
  }

  // Fallback: every significant token must appear within a single tight window
  // (proximity match), not scattered across the whole answer. This avoids
  // false positives like "Apex Heating" matching an answer that mentions
  // "Apex Plumbing" in paragraph one and "Central Heating" in paragraph four.
  const words = entityTokens(normName).filter((w) => w.length > 3);
  if (words.length >= 2) {
    const WINDOW = 160;
    let searchFrom = 0;
    while (true) {
      const firstIdx = normText.indexOf(words[0], searchFrom);
      if (firstIdx === -1) break;
      const windowEnd = firstIdx + WINDOW;
      const restFound = words.slice(1).every((w) => {
        const wIdx = normText.indexOf(w, firstIdx);
        return wIdx !== -1 && wIdx <= windowEnd;
      });
      if (restFound) {
        // Map back to a raw-text window via the first token's raw position.
        const anchor = lowerText.indexOf(words[0]);
        const start = Math.max(0, (anchor === -1 ? 0 : anchor) - 60);
        const end = Math.min(text.length, start + 220);
        return {
          mentioned: true,
          snippet: '...' + text.slice(start, end).replace(/\n+/g, ' ').trim() + '...',
        };
      }
      searchFrom = firstIdx + 1;
    }
  }
  // Return sample summary snippet of who was recommended instead
  const cleanSnippet = text.replace(/[#*`_]/g, '').slice(0, 180).replace(/\n+/g, ' ').trim();
  return {
    mentioned: false,
    snippet: cleanSnippet ? cleanSnippet + '...' : null,
  };
}

/** Extract competitor names from response text (regex list parser). The LLM
 *  extractor in check.ts is preferred; this is the fallback. */
export function extractCompetitors(text: string, businessName: string): string[] {
  if (!text) return [];
  const competitors: string[] = [];

  // Match numbered lists like "1. Business Name", "1) Business Name", "**1. Business Name**"
  const listRegex = /(?:^|\n)\s*(?:\d+[\.\)]|\*|-)\s+\*?\*?([A-Za-z0-9&'’\s\.\-]+?)(?:\*?\*?[:–\-\n]|\s*\()/g;
  let match;
  while ((match = listRegex.exec(text)) !== null) {
    const raw = match[1].replace(/[*_#]/g, '').trim();
    if (looksLikeBusinessName(raw, businessName)) {
      if (!competitors.includes(raw)) {
        competitors.push(raw);
      }
    }
  }

  return competitors.slice(0, 3);
}

/** Search-grounding sources (titles + urls) pulled from a Gemini candidate. */
export function parseGrounding(candidate: any): { urls: string[]; titles: string[] } {
  const chunks = Array.isArray(candidate?.groundingMetadata?.groundingChunks)
    ? candidate.groundingMetadata.groundingChunks
    : [];
  return {
    urls: chunks
      .map((c: any) => c?.web?.uri)
      .filter((u: unknown): u is string => typeof u === 'string' && u.length > 0),
    titles: chunks
      .map((c: any) => c?.web?.title)
      .filter((t: unknown): t is string => typeof t === 'string' && t.length > 0),
  };
}

/** A grounding source verifies the business when its title names it. */
export function groundingVerifies(titles: string[], businessName: string): boolean {
  return titles.some((t) => sameEntity(t, businessName));
}

/** Consensus sample weights: search-grounded Gemini phrasings count most,
 *  the memory-baseline Llama counts least. */
const SAMPLE_WEIGHTS: Array<[RegExp, number]> = [
  [/^Google Gemini$/, 3],
  [/^Google Gemini ·/, 2],
  [/^ChatGPT$/, 2],
  [/^Claude$/, 2],
  [/Llama/, 1],
];

export function weightOf(engine: string): number {
  for (const [re, w] of SAMPLE_WEIGHTS) {
    if (re.test(engine)) return w;
  }
  return 1;
}

export interface ConsensusSample {
  engine: string;
  mentioned: boolean;
  verified: boolean;
}

/** Weighted consensus score 0–100 from per-sample outcomes. */
export function consensusScore(samples: ConsensusSample[]): number {
  let totalWeight = 0;
  let mentionedWeight = 0;
  for (const s of samples) {
    const w = weightOf(s.engine);
    totalWeight += w;
    if (s.mentioned) mentionedWeight += w;
  }
  if (totalWeight === 0) return 0;
  let score = Math.round((100 * mentionedWeight) / totalWeight);
  const verifiedCount = samples.filter((s) => s.verified).length;
  if (verifiedCount > 0 && score < 90) {
    score = Math.min(96, score + 6 * verifiedCount);
  }
  return score;
}

/** KV cache key for normalized scan inputs (stable across case/punctuation). */
export function cacheKeyFor(businessName: string, category: string, city: string): string {
  const raw = `${normalizeEntity(businessName)}|${normalizeEntity(category)}|${normalizeEntity(city)}`;
  let h = 5381;
  for (let i = 0; i < raw.length; i++) {
    h = ((h << 5) + h + raw.charCodeAt(i)) >>> 0;
  }
  return `cache:check:${h.toString(36)}`;
}
