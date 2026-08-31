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

## Voice assistant token (`/api/voice-token`)

- **Endpoint:** `functions/api/voice-token.ts`

Mints a short-lived **Gemini Live** ephemeral token so the browser voice
assistant can open a WebSocket directly, without the server-side
`GEMINI_API_KEY` ever reaching the client.

Responsibilities:

- **POST only** (verb-guarded, mirroring `chat.ts`); `OPTIONS` returns 204,
  other verbs return 405.
- Exchanges `GEMINI_API_KEY` for an ephemeral token via Google's
  `POST https://generativelanguage.googleapis.com/v1beta/auth_tokens`
  (using the `x-goog-api-key` header). The token is minted with `uses: 1`,
  a 30-minute `expireTime`, and a 1-minute `newSessionExpireTime`, constrained
  to model `models/gemini-2.5-flash-native-audio-preview-09-2025` with an
  `AUDIO` response modality plus input/output transcription.
- Optional JSON body `{ conversationId }`: reused when present and valid;
  otherwise a new id is minted and a best-effort `conversations` row is inserted
  (same helper/columns as the chat flow).
- Rate-limited via KV using the `RATE_LIMIT` namespace under an
  `rl:voice-token:` scope (separate from chat's `rl:chat:`).
- Returns `{ ok, token, conversationId, expireTime, wssUrl }` on success, where
  `wssUrl` is the constrained `BidiGenerateContentConstrained` WebSocket URL
  carrying the ephemeral token as `access_token`.

Failure modes: a missing `GEMINI_API_KEY` returns a 500 JSON error; a non-OK
upstream response is surfaced with the sanitized Google error text and the
upstream status.

## Retention and privacy

- Chat logs are retained to support follow-up and are deleted on request.
- This handling is disclosed in the privacy policy at `src/data/legal.ts`.

## Gotcha

If the chat returns the error **"Looks like I lost my way"**, it usually means
**migration 0003 has not been applied** to the D1 database. Apply the migration
(locally and remotely) to resolve it.
