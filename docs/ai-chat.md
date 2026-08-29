# Omli AI Chat Assistant

Omli is the on-site AI chat assistant that answers visitor questions and captures
email leads. It is available site-wide through an embedded chat widget.

## User-facing entry point

- **Widget:** `src/components/ChatWidget.astro`

The widget renders the chat UI and streams assistant responses in real time.

## Backend

- **Endpoint:** `functions/api/chat.ts`

Responsibilities:

- Streams responses to the client via **Server-Sent Events (SSE)**.
- Generates replies with **Cloudflare Workers AI** using the model
  `@cf/meta/llama-3.1-8b-instruct-fast`.
- Persists the conversation into the D1 `conversations` table and each message
  (user and assistant) into the `messages` table.
- Captures an email lead into the `submissions` table when a visitor provides
  their email.
- Rate-limited via KV using the `RATE_LIMIT` namespace.

## Data stored

- **`conversations`** — one row per chat session.
- **`messages`** — one row per message, linked to a conversation.

See the **Data model** section in `ARCHITECTURE.md` for the full column lists.

The visitor-metadata columns on `conversations` were added in **migration 0003**
(see `docs/visitor-metadata.md`).

## Retention and privacy

- Chat logs are retained to support follow-up and are deleted on request.
- This handling is disclosed in the privacy policy at `src/data/legal.ts`.

## Gotcha

If the chat returns the error **"Looks like I lost my way"**, it usually means
**migration 0003 has not been applied** to the D1 database. Apply the migration
(locally and remotely) to resolve it.
