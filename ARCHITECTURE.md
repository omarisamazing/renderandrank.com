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
- **Cal.com** — embedded booking widget for booking a call.

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
   +-------------------------------------------+
   |          Client components (islands)      |
   |   ChatWidget    AuditForm    CalScript    |
   +-------------------------------------------+
          |             |             |
          v             v             v
     /api/chat     /api/contact   /api/booking      (Pages Functions)
          |             |             |
          v             v             v
   +-------------------------------------------+
   |            Cloudflare D1 tables           |
   |  conversations   submissions   bookings   |
   |  messages                                 |
   +-------------------------------------------+
                    ^
                    |
                 /admin  (reads Leads / Conversations / Bookings from D1)
```

## Directory map

- `src/pages` — Astro routes/pages for the public site.
- `src/components` — UI components, including React islands (ChatWidget, AuditForm, CalScript).
- `src/layouts` — shared page layouts/shells.
- `src/lib/visitorClient.ts` — client-side visitor metadata collection (language, referrer, landing page, UTM params) sent to override/enrich server data.
- `src/data/legal.ts` — legal copy (privacy policy, terms) rendered on the site.
- `functions/api/*` — Pages Functions API endpoints (`chat`, `contact`, `booking`).
- `functions/lib/visitor.ts` — `getVisitorMetadata` server-side visitor enrichment helper.
- `functions/admin/index.ts` — signed-cookie admin dashboard rendering leads, conversations, and bookings.
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

Indexes: `idx_messages_conversation_id`, `idx_conversations_created_at` (created_at DESC).

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

## Key flows

### (i) AI chat capture and storage

The ChatWidget island talks to `/api/chat`, which streams the model response
back over Server-Sent Events (SSE). Requests are routed to Cloudflare Workers
AI (`@cf/meta/llama-3.1-8b-instruct-fast`, the "Omli" assistant). Each session
is persisted as a `conversations` row with its turns in `messages`. When the
visitor provides an email, the lead is emailed and recorded into
`submissions`. Requests are rate limited via the `RATE_LIMIT` KV namespace.

### (ii) Form / audit submissions

The AuditForm island posts to `/api/contact`. The endpoint validates the
request (Cloudflare Turnstile plus a honeypot field), sends the lead
notification via Resend, and inserts the record into `submissions`. This
endpoint is also rate limited.

### (iii) Cal.com booking capture

The CalScript island listens to the Cal.com embed and, on a successful
booking, fires a beacon to `/api/booking`, which does a best-effort insert
into the `bookings` table.

**Known issue:** the `bookingSuccessful` embed payload does not reliably
expose the attendee's name, email, and timezone. The `event_type` is available
via `data.eventType.slug` and works. Planned fixes: read `e.detail.data.uid`
and fetch details from the Cal API, or use redirect query parameters; and
migrate to the `bookingSuccessfulV2` event.

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
renders three sections from D1: **Leads** (from `submissions`),
**Conversations** (the AI chat, `conversations` + `messages`), and
**Bookings** (from `bookings`). Visitor metadata lines use plain text labels
(`Location:`, `Device:`, `Language:`, `Source:`) — no emojis.

## See also

- [docs/ai-chat.md](docs/ai-chat.md) — AI chat assistant details.
- [docs/visitor-metadata.md](docs/visitor-metadata.md) — visitor metadata capture.
- [docs/bookings.md](docs/bookings.md) — Cal.com booking capture and known issues.
