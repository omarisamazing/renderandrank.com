# AI Visibility Checker & Connected Funnel

This document describes the architecture, free-tier provider strategy, and connected conversion funnel for the **AI Visibility Checker**.

## 1. Overview

The AI Visibility Checker lets prospective local business clients test whether major AI answer engines (Google Gemini with live Google Search grounding, ChatGPT, Claude, and open entity models) recommend their business for high-intent category queries in their city.

When a check is executed:
1. The backend queries search-grounded AI endpoints in parallel to evaluate if the business name is cited in the top recommendations.
2. Results are logged to the Cloudflare D1 `funnel_events` table keyed by `visitor_id`.
3. An outcome payload is saved to `sessionStorage` (`rr_handoff`) **and mirrored into `?biz=&cat=&city=` URL params** (fallback for new tabs, expired storage, or shared links) to transition the visitor into the **ROI Calculator** (showing a personalized revenue gap estimate) or the **Book a Call** flow.
4. When the visitor submits the audit/contact form, their entire funnel journey is summarized directly in the lead notification email sent to Omar and recorded in D1.

## 1b. Result payload (rendered by the widget)

Beyond the verdict, `/api/check` returns a visibility score (0–100), rank position, three authority `keySignals` (Google grounding, knowledge-graph presence, competitor density), per-engine rows with evidence snippets, the full competitor list, and industry-calibrated deal/search-volume figures. The result screen shows all of it: score meter, signal list, per-engine `<details>` evidence, every competitor, and an inline $/mo preview using the same math as the calculator.

## 2. Zero-Cost / Free-Tier Provider Architecture

- **Google Gemini (Free Tier via Google AI Studio)**:
  - Model: `gemini-3.6-flash` with `googleSearch` grounding, falling back to plain inference when grounding is quota-limited. (`gemini-2.5-flash` was retired by Google; the API returns 404 for it.)
  - Generous free tier: up to **1,500 requests per day** and 15 requests per minute at **$0.00 cost**.
  - Requires `GEMINI_API_KEY` secret in Cloudflare Pages.
- **Cloudflare Workers AI (Included Free Tier)**:
  - Model: `@cf/meta/llama-3.1-8b-instruct-fast` via the existing `AI` binding.
  - Provides 10,000 Neurons/day free.
- **Progressive Upgrade Support**:
  - The endpoint `/api/check` checks dynamically for `OPENAI_API_KEY` and `ANTHROPIC_API_KEY`.
  - When set, ChatGPT (`gpt-4o-mini`) and Claude (`claude-3-5-haiku-20241022`) run real recommendation queries in parallel with Gemini/Llama; provider failures surface as `error`, never a canned verdict. Add the secrets to Cloudflare Pages and the widget picks them up with no frontend changes.
- **Parallel fan-out with timeouts**: every configured engine is queried concurrently (`Promise.allSettled`) with a ~15s per-engine timeout, so total latency is the slowest engine, not the sum.

## 1c. Accuracy design (citation verdict)

- **Two Gemini phrasings** (direct "best X in Y" + implicit buyer "who should I call") plus the Llama baseline run as independent consensus samples.
- **Grounding verification**: the response's `groundingMetadata` is parsed — a sample counts as `verified` only when a cited search source's title names the business, stronger than prose mention alone.
- **Entity normalization** (`functions/lib/entityMatch.ts`): case/punctuation/legal-suffix-insensitive matching with token-containment aliases, so "Apex Climate Heating, LLC" matches "apex climate heating".
- **LLM extractor**: Workers AI reads all full answers and returns business names as JSON (per-section target presence corroborates aliases the string matcher misses); a shared quality gate (`looksLikeBusinessName`) plus the regex parser as fallback keeps headings/labels out of the competitor list.
- **Weighted consensus**: grounded Gemini 3/2, paid engines 2, Llama 1; verified citations add a bonus; low-confidence scores cap at 75; zero-mention floors at 15–22. Every verdict carries `confidence` (high/medium/low) with a plain-English note.
- **24h KV result cache** on normalized inputs: identical scans are stable and quota-light (cache hits skip engines and rate-limit counting).
- **Unit tests**: `npm run test:entities` covers all of the above with 16 offline tests (no API calls).

## 3. Abuse Protection & Rate Limiting

- **KV Rate Limiting**: Enforced via Cloudflare KV (`RATE_LIMIT` binding). Each IP is allowed up to **3 checks per rolling 24 hours** (`rate:check:{ip}` storing `{start,count}`).
- **Turnstile Verification**: The checker form renders the Cloudflare Turnstile widget when `PUBLIC_TURNSTILE_SITE_KEY` is set and sends its token with the scan; the endpoint verifies it when `TURNSTILE_SECRET_KEY` is present.

## 4. Connected Funnel Flow

```
[ Homepage or /check Widget ]
       │ (Visitor inputs: Business Name, Category, City)
       ▼
[ POST /api/check ] ───► Evaluates Gemini Search Grounding + Logs to D1 `funnel_events`
       │
       ▼ (Stores `rr_handoff` in sessionStorage)
[ /calculator ]
       │ Displays personalized contextual banner:
       │ "Your business was not cited in AI answers for '{category}' in {city} —
       │ here is the estimated revenue gap going to competitors."
       ▼
[ /book-a-call or /contact ]
       │ Lead notification email embeds prior funnel events.
```

## 5. D1 Schema (`funnel_events`)

Defined in `migrations/0004_add_funnel_events.sql`:

| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT |
| `visitor_id` | TEXT | Client UUID from localStorage (`rr_visitor_id`) |
| `event_type` | TEXT | `'ai_check'` \| `'calculator'` \| `'contact_form'` \| `'booking'` |
| `payload` | TEXT | JSON blob with inputs and computed results |
| `created_at` | TEXT | NOT NULL DEFAULT `datetime('now')` |
