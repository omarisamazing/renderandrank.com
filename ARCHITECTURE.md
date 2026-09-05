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
- `src/content/blog/` — MDX editorial collection (`src/content.config.ts`, Astro 6+ `glob` loader — `type: 'content'` alone silently yields zero entries); rendered by `src/pages/blog/index.astro` + `src/pages/blog/[...slug].astro`, author at `src/pages/author/omar-ali.astro`, feed at `src/pages/rss.xml.ts`.
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
- `src/i18n/` — locale dictionaries (`ui.ts`: en/es/fr/de/it/pt/nl) + URL helpers (`utils.ts`, incl. `blogTopicLabel`) + per-post meta (`blogMeta.ts`) + per-locale FAQs (`faqDict.ts`, EN canonical in `src/data/faqs.ts`) + testimonial metric/role map (`testimonialMeta.ts`, quotes stay verbatim in `src/data/testimonials.ts`).
- `src/components/HomePage.astro` — shared homepage composition rendered by `/` and every `/{locale}/` wrapper.
- `src/components/BlogIndexPage.astro` / `BlogPostPage.astro` — shared blog index + article bodies (`localePrefix` prop keeps breadcrumbs, related links and schema URLs inside the locale); EN routes are thin wrappers, locale routes add transcreated meta from `blogMeta.ts`.
- `src/components/LanguageSwitcher.astro` — dependency-free locale picker (keeps the current page across locales).
- `functions/_middleware.ts` — stamps `X-Robots-Tag: noindex` on Functions responses served from `*.pages.dev`.

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

### (i-a) ChatWidget voice mode (Gemini Live)

The vanilla-JS Astro ChatWidget adds a **Type / Talk toggle**. The typed path
(text over SSE against `/api/chat`) is unchanged; switching to **Talk** starts a
live, spoken conversation with the Gemini Live model while reusing the same
conversation id and transcript storage.

- **Mic capture (AudioWorklet).** `public/voice-capture-worklet.js` runs off the
  main thread, resampling the microphone stream to **16 kHz** and emitting
  **16-bit little-endian PCM** frames for upstream transmission.
- **Session state machine (`src/lib/voiceSession.ts`).** A small state machine
  drives the lifecycle: `idle → requesting-token → connecting → live →
  closing/error`. It first fetches an ephemeral token from `/api/voice-token`
  (see (i-b)), then opens the constrained Gemini Live WebSocket
  (`BidiGenerateContentConstrained`, model
  `gemini-2.5-flash-native-audio-preview-09-2025`). It streams the captured
  base64-encoded PCM audio **up** to Gemini and plays the returned **24 kHz
  PCM16** audio **back**, flushing the playback buffer on interruption for
  **barge-in** (the visitor can talk over the assistant).
- **Transcript beacon.** Finalized turns are POSTed to `/api/voice-transcript`
  with `channel = 'voice'` (see (i-c)), so voice turns are persisted alongside
  typed turns in the same `messages` table.
- **In-session voice memory.** Finalized voice turns (user + `model`) are also
  handed back to the widget via an `onTurnFinalized` callback and kept in an
  in-memory `voiceTurns` array for the page load — mirroring the typed-text
  `messages` array. It persists across Stop/Start and Type↔Talk toggles and
  resets only on a full page reload. When a new Live session connects, the
  widget passes these retained turns to `VoiceSession` (`priorTurns`), which
  seeds them into the session right after `setupComplete` as a single
  `clientContent` history frame (`turnComplete: false`, sent before the
  greeting) so the model actually remembers earlier Talk exchanges rather than
  the UI merely retaining the transcript. This does not change what is sent to
  `/api/chat` or `/api/voice-transcript`, nor the token-minting flow.
- **Teardown.** Ending voice mode performs a full teardown: it closes the
  WebSocket, stops the microphone tracks, and closes the capture and playback
  `AudioContext`s so no mic or audio resources leak.

### (i-b) Voice assistant token minting

The browser voice assistant obtains a short-lived Gemini Live token by POSTing
to `/api/voice-token` (`functions/api/voice-token.ts`). The endpoint keeps the
server-side `GEMINI_API_KEY` secret out of the browser: it exchanges the key for
an ephemeral token via Google's **v1alpha** `auth_tokens` endpoint
(`https://generativelanguage.googleapis.com/v1alpha/auth_tokens`, `x-goog-api-key`
header — the ephemeral-token API is only exposed on v1alpha) with a
`liveConnectConstraints` request body, constrained to
`models/gemini-2.5-flash-native-audio-preview-09-2025`
with an AUDIO response modality plus input/output transcription. The token is
minted with `uses: 1`, a 30-minute `expireTime`, and a 1-minute
`newSessionExpireTime`. The optional request body may carry a `conversationId`
to reuse; otherwise a new id is minted and a best-effort `conversations` row is
inserted (same helper/columns as the chat flow). On success it returns
`{ ok, token, conversationId, expireTime, wssUrl }`, where `wssUrl` is the
constrained `BidiGenerateContentConstrained` WebSocket URL (on the v1beta
service path) with the ephemeral token as `access_token`, ready for the browser
to open directly. Requests are rate limited via the `RATE_LIMIT` KV namespace
under an `rl:voice-token:` scope; a missing `GEMINI_API_KEY` returns a 500 JSON
error.

**Error surfacing.** When Google's `auth_tokens` call returns a non-OK status,
the endpoint reads the upstream body and logs **and returns** it as
`{ ok: false, error, detail, upstreamStatus }` (rather than swallowing it behind
a generic message), so the exact upstream cause — bad key, unknown model, or a
malformed `liveConnectConstraints` shape — is visible; a 2xx response missing the
token `name` likewise returns the raw body as `detail`. Client-side,
`requestToken()` in `voiceSession.ts` reads the response status + body and
logs/throws the precise server (and upstream Google) error instead of only the
HTTP status, and the WebSocket handler logs `close` code/reason and `error`
events (rejecting a pre-open close with its code) so a bad/expired token is
distinguishable from a bad model name.

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
`funnel_events` rows of `event_type='ai_check'`). A **funnel story strip**
sits above the sections: last-7-days KPIs for each stage (New leads,
Conversations, Booked calls) with prior-7d delta chips, server-rendered
7-bar sparkbars (zero JS, CSP-safe), Leads → chats / Chats → booked
conversion rates, and a computed takeaway headline (destructive only when the
pipeline is empty or nothing converts). Stats come from three 14-day
`GROUP BY date(datetime(created_at))` queries (`loadFunnelStats`, fail-soft —
the strip is omitted if any stage query fails). Visitor metadata lines use
plain text labels (`Location:`, `Device:`, `Language:`, `Source:`) — no emojis.

### AI-check summary UI

The AI-check section (`#ai-checker`) summarises logged runs of the AI
Visibility Checker and presents them three ways:

- **KPI stat-card grid** — headline metrics computed over the checks (total
  checks, average visibility score, and how many businesses are invisible /
  unmentioned). Each card pairs the all-time value with its 7-day story: a
  prior-7d delta chip, a server-rendered 7-bar sparkbar (daily counts, or
  daily average for the score card), and a "N in last 7d" sub-line. A takeaway
  line above the grid states the 7-day invisible share with the outreach
  implication (destructive only when there is something to act on). Trends
  come from `computeAiCheckTrends()` over the already-loaded dated checks —
  no extra queries — sharing the `isInvisibleCheck()` predicate, `monoChip()`,
  and sparkbar helpers with the funnel strip.
- **Ranked-list panels** — ranked breakdowns (e.g. by category and by
  competitor) rendered with count/score badges; long competitor/entity lists
  are truncated to the first few names with the full list shown on hover
  (`title`). Category/city panels show six rows max with ink bars, end-value
  count badges (share-of-total in the tooltip), and an honest "+ N more"
  footer when truncated.
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
Tables use hairline rules + hover highlight only (no zebra banding);
Conversation status and Booking event type render as uppercase mono pills.

## Internationalization (i18n)

Multilingual USA/Europe site. Root `/` serves en-US (and `x-default`); other
locales live under prefix subdirectories (`/es/ /fr/ /de/ /it/ /pt/ /nl/`).

- `astro.config.mjs` declares `i18n` (`prefixDefaultLocale: false`) and reads
  `site` from `PUBLIC_SITE_URL` (default `https://renderandrank.com`).
- `src/config/site.ts` owns `localeMeta`, `canonicalUrlFor()` (always
  root-anchored), `localizedPath()`, `LOCALIZED_ROUTES` (`/`, `/pricing`,
  `/services` + 3 detail slugs, `/contact`, `/book-a-call`, `/about`,
  `/blog` + 5 post slugs — every path with full 7-locale coverage), and
  `STAGING_HOST_SUFFIX`.
- `src/layouts/Layout.astro` renders per-locale `<html lang>`, canonical, the
  full hreflang cluster + `x-default` on `LOCALIZED_ROUTES` (self-referential
  hreflang elsewhere), `og:locale` + alternates, dynamic schema `inLanguage`,
  and build-time `noindex` on `*.pages.dev` hosts.
- `Navbar`, `Footer`, `HeroSection`, `BookCallButton`, `MobileNav` localise via
  `getLangFromUrl`/`useTranslations`; internal hrefs are locale-prefixed
  (en stays root).
- Staging de-indexing is two-layer (`_headers` can't match hostnames):
  build-time meta robots in `Layout` + runtime `X-Robots-Tag` in
  `functions/_middleware.ts`. Full rollout procedure: `docs/i18n.md`.
  Per-locale keyword targets: `docs/keyword-map.md`.

## See also

- [docs/ai-chat.md](docs/ai-chat.md) — AI chat assistant details (includes the `/api/voice-token` Gemini Live token endpoint).
- [docs/visitor-metadata.md](docs/visitor-metadata.md) — visitor metadata capture.
- [docs/bookings.md](docs/bookings.md) — Cal.com booking capture, embed layout/preload/scrollable container, and known issues.
