# Local testing — Render and Rank chat assistant

This guide explains how to run and test the on-site AI chat assistant (`/api/chat`)
and the protected admin dashboard (`/admin`) on your machine.

## Prerequisites

- **Node >= 22.12** (see `engines.node` in `package.json`).
- Install dependencies (this also installs `wrangler`):

  ```bash
  npm install
  ```

## Why not just `npm run dev`?

`npm run dev` runs `astro dev`, which serves the static Astro site **only**. It
does **not** run the Cloudflare Pages Functions in `functions/`, and it does
**not** bind `AI` (Workers AI) or `DB` (D1). As a result, `/api/chat` and
`/admin` will **not** work under plain `astro dev` — you need Wrangler Pages.

## Run locally with Wrangler Pages

Run these in order:

1. `npm run pages:build` — builds the site to `dist/`.
2. `npm run db:migrate:local` — applies the D1 migrations to the **local**
   SQLite database (creates the `submissions`, `conversations`, and `messages`
   tables locally).
3. `npm run pages:dev` — serves the site **with** the Pages Functions and the
   `AI` / `DB` bindings at **http://localhost:8788**.

Or run all three in one step:

```bash
npm run dev:local
```

## Workers AI has no local emulation

The `AI` binding has no local emulator. `wrangler pages dev` **proxies** AI
binding calls to Cloudflare, so you must:

- Run `npx wrangler login` first, and
- Have network access.

Without a valid login / network, `/api/chat` returns **HTTP 503**.

## Local vars & secrets

Create a **gitignored** `.dev.vars` file at the project root with the values the
Functions expect:

```
ADMIN_PASSWORD=changeme
CONTACT_TO=you@example.com
CONTACT_FROM=hello@renderandrank.com
RESEND_API_KEY=your_key
```

`wrangler pages dev` **auto-loads** `.dev.vars` (already listed in `.gitignore`).

## Test the chat endpoint

```bash
curl -N -X POST http://localhost:8788/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hi, what does Render and Rank do?"}]}'
```

The response streams **Server-Sent Events** (`text/event-stream`) and includes
an `X-Conversation-Id` response header. Pass that id back as `conversationId` in
the JSON body to continue the same thread:

```bash
curl -N -X POST http://localhost:8788/api/chat \
  -H "Content-Type: application/json" \
  -d '{"conversationId":"<id-from-header>","messages":[{"role":"user","content":"Tell me more"}]}'
```

## View captured conversations

Open **http://localhost:8788/admin** and log in with `ADMIN_PASSWORD`. The
dashboard shows the **Leads** table and the new **Conversations** table.

## Inspect local D1 directly

```bash
wrangler d1 execute renderandrank_leads --local --command "SELECT * FROM conversations"
```
