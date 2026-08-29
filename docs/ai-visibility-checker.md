# AI Visibility Checker & Connected Funnel

This document describes the architecture, free-tier provider strategy, and connected conversion funnel for the **AI Visibility Checker**.

## 1. Overview

The AI Visibility Checker lets prospective local business clients test whether major AI answer engines (Google Gemini with live Google Search grounding, ChatGPT, Claude, and open entity models) recommend their business for high-intent category queries in their city.

When a check is executed:
1. The backend queries search-grounded AI endpoints to evaluate if the business name is cited in the top recommendations.
2. Results are logged to the Cloudflare D1 `funnel_events` table keyed by `visitor_id`.
3. An outcome payload is saved to `sessionStorage` (`rr_handoff`) to seamlessly transition the visitor into the **ROI Calculator** (showing a personalized revenue gap estimate) or the **Book a Call** flow.
4. When the visitor submits the audit/contact form, their entire funnel journey is summarized directly in the lead notification email sent to Omar and recorded in D1.

## 2. Zero-Cost / Free-Tier Provider Architecture

- **Google Gemini (Free Tier via Google AI Studio)**:
  - Model: `gemini-1.5-flash` with `google_search` tool enabled.
  - Generous free tier: up to **1,500 requests per day** and 15 requests per minute at **$0.00 cost**.
  - Requires `GEMINI_API_KEY` secret in Cloudflare Pages.
- **Cloudflare Workers AI (Included Free Tier)**:
  - Model: `@cf/meta/llama-3.1-8b-instruct-fast` via the existing `AI` binding.
  - Provides 10,000 Neurons/day free.
- **Progressive Upgrade Support**:
  - The endpoint `/api/check` checks dynamically for `OPENAI_API_KEY` and `ANTHROPIC_API_KEY`.
  - When you choose to upgrade to paid ChatGPT / Claude search subscriptions in the future, you simply add those secrets to Cloudflare Pages. The widget automatically enables them without any frontend code changes.

## 3. Abuse Protection & Rate Limiting

- **KV Rate Limiting**: Enforced via Cloudflare KV (`RATE_LIMIT` binding). Each IP is allowed up to **3 checks per 24 hours** (`rate:check:{ip}:{yyyy-mm-dd}`).
- **Turnstile Verification**: Protected via Cloudflare Turnstile token validation when `TURNSTILE_SECRET_KEY` is present.

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
