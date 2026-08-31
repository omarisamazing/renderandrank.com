# Architecture

## Overview

Render and Rank is a local SEO marketing site. It presents the agency's
services, captures leads through several channels (an AI chat assistant, a
contact/audit form, and a book-a-call flow), and stores everything in a
Cloudflare D1 database that is surfaced through an internal admin dashboard.

## Tech stack

- **Astro 7** — static generation plus SSR, with **React 19** islands for
  interactive client components.
- **Cloudflare Pages** — hosting and deployment, with **Pages Functions** as
  the serverless API layer.
- **Cloudflare D1** (SQLite) — primary datastore. Binding `DB`, database name
  `renderandrank_leads`.
- **Cloudflare Workers AI** — model `@cf/meta/llama-3.1-8b-instruct-fast`,
  which powers the on-site "Omli" assistant.
- **Cloudflare KV** — namespace binding `RATE_LIMIT` for request rate limiting.
- **Resend** — transactional email delivery for lead notifications.
- **Cal.com** — embedded booking widget for booking a call (`month_view`
  layout, preloaded on every site visit).

## How it all connects

```
                 Visitor
                    |
                    v
            +----------------+
            |  Astro pages   |  (static + SSR, src/pages)
            +----------------+
                    |
                    v
   +-------------------------------------------------------------+
   |                  Client components (islands)                |
   | ChatWidget  AuditForm  AiVisibilityChecker  CalInline  ROI  |
   +-------------------------------------------------------------+
          |             |             |             |
          v             v             v             v
     /api/chat     /api/contact   /api/check   /api/booking  (Pages Functions)
     /api/voice-token   /api/voice-transcript
          |             |             |             |
          v             v             v             v
   +-------------------------------------------------------------+
   |                     Cloudflare D1 tables                    |
   |  conversations   submissions   bookings   funnel_events     |
   |  messages                                                   |
   +-------------------------------------------------------------+
                    ^
                    |
                 /admin  (reads Leads / Conversations / Bookings / Funnel from D1)
```

## Directory map

- `src/pages` — Astro routes/pages for the public site.
- `src/components` — UI components, including React islands (ChatWidget, AuditForm) and the Cal.com embed pieces (`CalScript.astro` bootstrap + `CalInline.astro` inline scheduler).
- `src/layouts` — shared page layouts/shells.
- `src/lib/visitorClient.ts` — client-side visitor metadata collection (language, referrer, landing page, UTM params) sent to override/enrich server data.
- `src/data/legal.ts` — legal copy (privacy policy, terms) rendered on the site.
- `functions/api/*` — Pages Functions API endpoints (`chat`, `contact`, `booking`, `voice-token`, `voice-transcript`).
- `functions/lib/visitor.ts` — `getVisitorMetadata` server-side visitor enrichment helper.
- `functions/admin/index.ts` — signed-cookie admin dashboard rendering leads, conversations, bookings, and the AI-check summary (KPI stat cards, ranked panels, searchable table).
- `public/admin-ai-filter.js` — dependency-free client script that powers the AI-check table search/filter (loaded same-origin by the admin page shell).
- `public/admin-filters.js` — dependency-free client script providing shared client-side table filters (search box + categorical filter) for the Leads/Conversations/Bookings admin tables (loaded same-origin by the admin page shell).
- `migrations/` — D1 SQL migrations (schema history).
- `public/` — static assets served as-is.

## Data model

D1 schema, defined across the `migrations/` directory.

### `submissions` (migration 0001)

Contact/audit form leads.

| Column       | Type    | Notes                                |
| ------------ | ------- | ------------------------------------ |
| `id`         | INTEGER | PRIMARY KEY AUTOINCREMENT            |
| `created_at` | TEXT    | NOT NULL DEFAULT `datetime('now')`   |
| `name`       | TEXT    | NOT NULL                             |
| `email`      | TEXT    | NOT NULL                             |
| `phone`      | TEXT    |                                      |
| `website`    | TEXT    | NOT NULL                             |
| `service`    | TEXT    |                                      |
| `location`   | TEXT    | NOT NULL                             |
| `message`    | TEXT    | NOT NULL                             |
| `ip`         | TEXT    |                                      |
| `user_agent` | TEXT    |                                      |

Indexes: `idx_submissions_created_at` (created_at DESC), `idx_submissions_email` (email).

### `conversations` (migration 0002)

One row per visitor AI chat session.

| Column          | Type | Notes                              |
| --------------- | ---- | ---------------------------------- |
| `id`            | TEXT | PRIMARY KEY                        |
| `created_at`    | TEXT | NOT NULL DEFAULT `datetime('now')` |
| `updated_at`    | TEXT | NOT NULL DEFAULT `datetime('now')` |
| `visitor_email` | TEXT |                                    |
| `status`        | TEXT | NOT NULL DEFAULT `'open'`          |
| `ip`            | TEXT |                                    |
| `user_agent`    | TEXT |                                    |

### `messages` (migration 0002)

Each user/assistant turn within a conversation.

| Column            | Type | Notes                              |
| ----------------- | ---- | ---------------------------------- |
| `id`              | TEXT | PRIMARY KEY                        |
| `conversation_id` | TEXT | NOT NULL REFERENCES conversations(id) |
| `role`            | TEXT | NOT NULL                           |
| `content`         | TEXT | NOT NULL                           |
| `created_at`      | TEXT | NOT NULL DEFAULT `datetime('now')` |
| `channel`         | TEXT | NOT NULL DEFAULT `'text'` (migration 0005) |

Indexes: `idx_messages_conversation_id`, `idx_conversations_created_at` (created_at DESC).

The `channel` column (added in migration 0005) records how each turn was
captured: `'text'` for the typed chat assistant (the default) and `'voice'` for
finalized voice-assistant transcripts (see the (i-c) flow below).

### Migration 0003 — visitor metadata + bookings

Migration `0003_add_visitor_metadata.sql` adds visitor-context TEXT columns to
both `conversations` and `submissions`, and creates the `bookings` table.

Columns added to `conversations` and `submissions` (each):
`country`, `region`, `city`, `timezone`, `latitude`, `longitude`, `isp`,
`device_type`, `browser`, `os`, `language`, `referrer`, `landing_page`,
`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`.

Note: SQLite/D1 has no `IF NOT EXISTS` for `ADD COLUMN`, so each column is its
own statement; the migration is applied exactly once.

### `bookings` (migration 0003)

Book-a-call captures from the Cal.com embed.

| Column         | Type    | Notes                              |
| -------------- | ------- | ---------------------------------- |
| `id`           | INTEGER | PRIMARY KEY AUTOINCREMENT          |
| `created_at`   | TEXT    | NOT NULL DEFAULT `datetime('now')` |
| `name`         | TEXT    |                                    |
| `email`        | TEXT    |                                    |
| `timezone`     | TEXT    |                                    |
| `event_type`   | TEXT    |                                    |
| `country`      | TEXT    |                                    |
| `region`       | TEXT    |                                    |
| `city`         | TEXT    |                                    |
| `latitude`     | TEXT    |                                    |
| `longitude`    | TEXT    |                                    |
| `isp`          | TEXT    |                                    |
| `device_type`  | TEXT    |                                    |
| `browser`      | TEXT    |                                    |
| `os`           | TEXT    |                                    |
| `language`     | TEXT    |                                    |
| `referrer`     | TEXT    |                                    |
| `landing_page` | TEXT    |                                    |
| `utm_source`   | TEXT    |                                    |
| `utm_medium`   | TEXT    |                                    |
| `utm_campaign` | TEXT    |                                    |
| `utm_term`     | TEXT    |                                    |
| `utm_content`  | TEXT    |                                    |
| `ip`           | TEXT    |                                    |
| `user_agent`   | TEXT    |                                    |

Index: `idx_bookings_created_at` (created_at DESC).

### Timestamps

Booking `created_at` is stored as UTC ISO-8601 (via `new Date().toISOString()`).
The admin dashboard's `formatReceived()` normalizes any legacy space-separated
`datetime('now')` values (no `T`/`Z`) to UTC before formatting, and
`public/admin-time.js` localizes them to the viewer's timezone in the browser.

## Key flows

### (i) AI chat capture and storage

The ChatWidget island talks to `/api/chat`, which streams the model response
back over Server-Sent Events (SSE). Requests are routed to Cloudflare Workers
AI (`@cf/meta/llama-3.1-8b-instruct-fast`, the "Omli" assistant). Each session
is persisted as a `conversations` row with its turns in `messages`. When the
visitor provides an email, the lead is emailed and recorded into
`submissions`. Requests are rate limited via the `RATE_LIMIT` KV namespace.

### (i-b) Voice assistant token minting

The browser voice assistant obtains a short-lived Gemini Live token by POSTing
to `/api/voice-token` (`functions/api/voice-token.ts`). The endpoint keeps the
server-side `GEMINI_API_KEY` secret out of the browser: it exchanges the key for
an ephemeral token via Google's `auth_tokens` endpoint
(`https://generativelanguage.googleapis.com/v1beta/auth_tokens`, `x-goog-api-key`
header), constrained to `models/gemini-2.5-flash-native-audio-preview-09-2025`
with an AUDIO response modality plus input/output transcription. The token is
minted with `uses: 1`, a 30-minute `expireTime`, and a 1-minute
`newSessionExpireTime`. The optional request body may carry a `conversationId`
to reuse; otherwise a new id is minted and a best-effort `conversations` row is
inserted (same helper/columns as the chat flow). On success it returns
`{ ok, token, conversationId, expireTime, wssUrl }`, where `wssUrl` is the
constrained `BidiGenerateContentConstrained` WebSocket URL with the ephemeral
token as `access_token`, ready for the browser to open directly. Requests are
rate limited via the `RATE_LIMIT` KV namespace under an `rl:voice-token:` scope;
a missing `GEMINI_API_KEY` returns a 500 JSON error.

### (i-c) Voice transcript persistence

Once a Gemini Live voice session is running, the browser posts each transcript
turn to `/api/voice-transcript` (`functions/api/voice-transcript.ts`). The
endpoint accepts a body of `{ conversationId, channel, role, text, final }`. It
requires a non-empty `conversationId` and non-empty `text`, validates `role` ∈
`{'user','assistant'}` (all `400` otherwise), and defaults `channel` to
`'voice'`. Interim turns (`final === false`) are dropped without a write,
returning `{ ok: true, skipped: true }`. Finalized turns are persisted as a
`messages` row exactly as chat.ts writes them (`id = crypto.randomUUID()`,
`conversation_id`, `role`, `content = text`, `channel`) and then bump the
conversation's `updated_at` via the same `touchConversation()` pattern
(`UPDATE conversations SET updated_at = datetime('now') WHERE id = ?`), returning
`{ ok: true, id }`. Persistence is best-effort and skipped when `DB` is unbound.
The `channel` column that distinguishes these voice turns from text turns is
added by migration `0005_add_messages_channel.sql`. Requests are rate limited
via the `RATE_LIMIT` KV namespace under an `rl:voice-transcript:` scope.

### (ii) Form / audit submissions

The AuditForm island posts to `/api/contact`. The endpoint validates the
request (Cloudflare Turnstile plus a honeypot field), sends the lead
notification via Resend, and inserts the record into `submissions`. This
endpoint is also rate limited.

### (iii) Cal.com booking capture

The embed renders with the `month_view` layout (a 3-column desktop layout
presenting event details, month calendar, and side-by-side time slots), set in
both `CalScript.astro` (`ui` config) and `CalInline.astro` (inline `config`).
CalScript is mounted site-wide from `Layout.astro` and calls
`Cal.ns[namespace]('preload', { calLink: siteConfig.calCom.eventLink })` on
every page visit so the booking iframe is warm before the visitor reaches
`/book-a-call`. On `/book-a-call`, the scheduler sits in a wide (`max-w-5xl`)
card with unconstrained auto-height (`min-height: 620px; width: 100%`) so
clicking dates immediately reveals time slots side-by-side with zero nested
scroll traps or page jumping. See [docs/bookings.md](docs/bookings.md) for the
full layout/preload/container notes.

The CalScript bootstrap listens to the Cal.com embed (the `bookingSuccessfulV2`
action, with a legacy `bookingSuccessful` fallback) and, on a successful
booking, fires a beacon to `/api/booking` carrying the booking `uid` (from
`e.detail.data.uid`), the `event_type` (`data.eventType.slug`), and the
visitor/UTM context. `/api/booking` does a best-effort insert into the
`bookings` table. Because both bookingSuccessful and bookingSuccessfulV2 fire
for one booking, the bootstrap coalesces them into a single deduped beacon —
merging fields while preferring defined values (so the uid-bearing V2 payload
wins), debouncing ~600ms, and guarding on the last-sent uid — so each booking
produces exactly one enriched row.

**Attendee capture (resolved):** the embed payload does not reliably expose the
attendee's name, email, and timezone, so the server enriches the record itself.
When a booking `uid` and the `CALCOM_API_KEY` secret are both present,
`functions/api/booking.ts` fetches the booking from the Cal.com REST API
(`GET /v2/bookings/{uid}`, Bearer `CALCOM_API_KEY`,
`cal-api-version:2024-08-13`) and reads the first attendee's `name`, `email`,
and `timeZone`, preferring those over the client body. The fetch is best-effort
and never throws: on a missing key or any failure it logs and inserts whatever
data exists, and the endpoint always returns `{ ok: true }`. Set `CALCOM_API_KEY`
locally in `.dev.vars` (see `.dev.vars.example`) and remotely as an encrypted
Pages Secret. The `event_type` is available via `data.eventType.slug`.

### (iv) Visitor metadata

`functions/lib/visitor.ts` exposes `getVisitorMetadata`, which derives visitor
context on the server: IP and User-Agent, Cloudflare geo (`cf` object),
parsed device/browser/OS, language, and referrer/landing_page/utm_* values.
The client-side `src/lib/visitorClient.ts` can override/enrich these fields
(for example language, referrer, landing page, and UTM parameters) before they
are stored alongside conversations, submissions, and bookings.

## Migrations

Migrations must be applied to **both** local and remote D1 or requests will hit
runtime errors against missing tables/columns:

```
npx wrangler d1 migrations apply renderandrank_leads --local
npx wrangler d1 migrations apply renderandrank_leads --remote
```

npm scripts wrap these as `db:migrate:local` and `db:migrate:remote`.
Unapplied migrations cause runtime errors.

## Admin dashboard

`/admin` (`functions/admin/index.ts`) is protected by signed-cookie auth and
renders four sections from D1: **Leads** (from `submissions`),
**Conversations** (the AI chat, `conversations` + `messages`),
**Bookings** (from `bookings`), and the **AI Visibility Checks** summary (from
`funnel_events` rows of `event_type='ai_check'`). Visitor metadata lines use
plain text labels (`Location:`, `Device:`, `Language:`, `Source:`) — no emojis.

### AI-check summary UI

The AI-check section (`#ai-checker`) summarises logged runs of the AI
Visibility Checker and presents them three ways:

- **KPI stat-card grid** — headline metrics computed over the checks (total
  checks, average visibility score, and how many businesses are invisible /
  unmentioned).
- **Ranked-list panels** — ranked breakdowns (e.g. by category and by
  competitor) rendered with count/score badges; long competitor/entity lists
  are truncated to the first few names with the full list shown on hover
  (`title`).
- **Searchable data table** — one row per check (time, business, category,
  city, visibility, rank, competitors, visitor location, device). A search box
  (`id="ai-check-search"`) sits directly above the table
  (`id="ai-check-table"`), and `public/admin-ai-filter.js` filters it.

`public/admin-ai-filter.js` is a dependency-free, same-origin script loaded via
`<script src="/admin-ai-filter.js" defer>` (CSP-safe under `script-src 'self'`).
On each `input` event it reads `#ai-check-search`, case-insensitively compares
the query against each `#ai-check-table tbody tr`'s combined cell text, and
toggles `row.style.display` (`''` / `'none'`). When every data row is hidden it
shows a single "No matching checks" row. The script guards for the missing
input/table so it stays inert on pages that lack them (mirroring the pattern of
`public/admin-time.js`).

`public/admin-filters.js` is the sibling shared table-filter script, also
dependency-free and CSP-safe, loaded via `<script src="/admin-filters.js" defer>`
(`script-src 'self'`). It wires a search box plus a categorical filter to the
Leads (Service), Conversations (Status), and Bookings (Event type) tables,
filtering rows on input/change and keeping the expandable Conversations detail
rows in sync with their parent rows. The Conversations, AI Checker, and Bookings
section subtitles are worded to describe the business decision each supports.

## See also

- [docs/ai-chat.md](docs/ai-chat.md) — AI chat assistant details (includes the `/api/voice-token` Gemini Live token endpoint).
- [docs/visitor-metadata.md](docs/visitor-metadata.md) — visitor metadata capture.
- [docs/bookings.md](docs/bookings.md) — Cal.com booking capture, embed layout/preload/scrollable container, and known issues.
