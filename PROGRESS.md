# Progress

## How to use this file

- Update this file at the **end of every session** (or before any likely
  interruption): move items between Done / In progress / Next up, and keep the
  Unapplied migrations list accurate.
- **Read this file first when resuming** work, together with `ARCHITECTURE.md`,
  so you pick up with no lost context.

## Current status

AI Visibility Checker (free-tier Google Gemini + Cloudflare Workers AI) and connected conversion funnel implemented, fully verified in local development with live queries, and migrations 0003 & 0004 applied to both local and remote D1 databases. `GEMINI_API_KEY` secret is active. The voice assistant now has both a token endpoint (`/api/voice-token`) and a transcript-persistence endpoint (`/api/voice-transcript`); migration 0005 (adds `messages.channel`) is created but NOT yet applied — see "Unapplied migrations / manual steps".

## Done

- **ChatWidget voice mode (Gemini Live)**: added a **Type / Talk toggle** to the vanilla-JS Astro ChatWidget (the typed text/SSE path is unchanged). Talk mode captures the mic via an AudioWorklet (`public/voice-capture-worklet.js`, resample to 16 kHz / 16-bit LE PCM); a `src/lib/voiceSession.ts` state machine (`idle → requesting-token → connecting → live → closing/error`) fetches an ephemeral token from `/api/voice-token`, opens the constrained Gemini Live WebSocket (`gemini-2.5-flash-native-audio-preview-09-2025`), streams base64 PCM up, plays 24 kHz PCM16 back with barge-in flush on interruption, and beacons finalized turns to `/api/voice-transcript` with `channel = 'voice'`. Ending voice mode fully tears down (closes the WS, stops mic tracks, closes the capture/playback `AudioContext`s). `npm run typecheck` passes (0 errors). Docs updated (`ARCHITECTURE.md`, `CHANGELOG.md`).
- **Voice transcript persistence endpoint + `messages.channel` migration**: added `functions/api/voice-transcript.ts` (POST-only, verb-guarded like `voice-token.ts`) that validates `{ conversationId, channel, role, text, final }`, skips interim turns (`final === false` → `{ ok: true, skipped: true }`), and persists finalized turns into the D1 `messages` table exactly as `chat.ts` writes them (tagged `channel = 'voice'`) before bumping `conversations.updated_at`; rate limited via KV under an `rl:voice-transcript:` scope. Added migration `0005_add_messages_channel.sql` (`ALTER TABLE messages ADD COLUMN channel TEXT NOT NULL DEFAULT 'text'`); `chat.ts`'s `insertMessage` already records `channel` (defaulting to `'text'`). Docs updated (`ARCHITECTURE.md`, `docs/ai-chat.md`, `CHANGELOG.md`).
- **Type fixes + `typecheck` script now working**: fixed the invalid `Button variant="outline"` in `src/components/ui/dialog.tsx` (`DialogFooter` Close button) to `variant="secondary"`, clearing the TS2322 error. Pinned TypeScript back to stable 5.x (`^5.6.0`, installed 5.9.3) and kept `tsconfig.json` `baseUrl "."` + `paths {"@/*":["./src/*"]}` so `tsc --noEmit` runs (no TS5102). Installed `@astrojs/check` and added a `typecheck` npm script (`astro check && tsc --noEmit`). Verified: `astro check` → 0 errors, 0 warnings, 13 hints; `tsc --noEmit` → exit 0.
- **Admin section nav moved into top navbar + temp-file cleanup**: moved the admin panel section navigation (Leads, AI Checker, Conversations, Bookings) into the top navbar, removed the standalone "Sections" heading/nav block, and added section id anchors (`#leads`, `#conversations`, `#bookings`) so navbar links jump to each section (`functions/admin/index.ts`). Untracked temp/context files (`_tmp_slice.txt`, `ctx.txt`) and added `.gitignore` entries so they stay out of git. Docs updated (`CHANGELOG.md`).
- **Admin dashboard subtitles rewrite + table filters**: reworded the Conversations, AI Checker, and Bookings section subtitles to describe the business decision each supports, and added a search box plus a categorical filter to the Leads (Service), Conversations (Status), and Bookings (Event type) tables, wired by the shared `public/admin-filters.js` client script.
- **Design System & UI/UX Polish (`DESIGN.md` Alignment)**:
  - Added `.stat-xl` token in `src/styles/global.css` and gated `animate-fade-in` with `prefers-reduced-motion: no-preference`.
  - Harmonized homepage pastel color-block rhythm across Hero, Portfolio, AI Diagnostic, and Founder sections.
  - Polished AI Visibility Checker island: 4-phase scanning progress bar, structured entity diagnostics, and accessible typography.
  - Polished ROI Calculator: debounced screen-reader live announcements (`role="status"`), accessible `aria-valuetext` on range sliders, cleaned up form legend accessibility, and improved metric hierarchy.
  - Verified static production build cleanly with 15 routes generated.
- **Security Review & Hardening**: Remediated stored XSS / attribute breakout vulnerabilities in `/admin` dashboard and email generator via OWASP-compliant `esc()` entity encoding; sanitized `mailto:` links with `formatMailto()`; hardened `/api/track-funnel` with KV rate limiting, input format/size validation, and error shielding; secured `conversationId` header reflection in `/api/chat`; transferred Gemini API key from URL queries to `x-goog-api-key` header with prompt input clamping in `/api/check`; enforced size limits on visitor metadata and booking payloads. Built and verified cleanly with Astro static and SSR compilation.
- **AI Visibility Checker & Connected Funnel**: Built free-tier AI search diagnostic (`functions/api/check.ts`) using Google Gemini + Cloudflare Workers AI with KV IP rate limiting (3/day) and Turnstile verification; created `AiVisibilityChecker.tsx` interactive island; added `/check` page and homepage section; added `sessionStorage` (`rr_handoff`) contextual banner in `RoiCalculator.tsx`; created `functions/api/track-funnel.ts` and migration `0004_add_funnel_events.sql`; enriched contact form leads with visitor funnel journey. Verified live on local dev server with real Gemini & Llama 3.1 inference and D1 event logging. Docs updated (`ARCHITECTURE.md`, `docs/ai-visibility-checker.md`, `CHANGELOG.md`).
- Applied migrations 0003 (`0003_add_visitor_metadata.sql`) and 0004 (`0004_add_funnel_events.sql`) to both `--local` and `--remote` D1 databases.
- Set `GEMINI_API_KEY` secret in Cloudflare Pages and `.dev.vars`.
- Cal.com booking embed UI/UX pass: redesigned `/book-a-call` with a wide container (`max-w-5xl`) so the `month_view` scheduler renders in 3 side-by-side columns (Profile & Details on left, Month calendar in middle, Time slots on right); removed the nested `max-height`/`overflow-y: auto` scroll trap from `#cal-inline` so date clicks immediately present available times with zero vertical jumping or hidden slots; structured the 4-step agenda, "No pitch" diagnostic guarantee, and founder contact info in a clean companion section below the scheduler. Docs updated (`ARCHITECTURE.md`, `docs/bookings.md`, `CHANGELOG.md`).
- Replaced emojis with plain text labels in admin dashboard visitor-metadata lines.
- Updated privacy policy (`src/data/legal.ts`): visitor-metadata disclosure, strictly-necessary cookie wording, Dhaka location; Last updated August 29, 2026.
- Added the Bookings section to the admin dashboard.
- Created the documentation system (`ARCHITECTURE.md`, `PROGRESS.md`, `CHANGELOG.md`).
- Fixed Cal.com attendee capture: `CalScript.astro` now uses `bookingSuccessfulV2` and sends the booking `uid`; `functions/api/booking.ts` fetches `GET /v2/bookings/{uid}` (Bearer `CALCOM_API_KEY`, `cal-api-version: 2024-08-13`) best-effort and prefers the fetched attendee name/email/timezone. See `docs/bookings.md`.

## In progress / Next up

- **Apply migration `0005_add_messages_channel.sql` to both local and remote D1** (see "Unapplied migrations / manual steps" below) so the new `channel` column exists before `/api/voice-transcript` and the updated `chat.ts` `insertMessage` run against those databases.
- Click through `/admin` in `astro dev` to verify the navbar section links (Leads, AI Checker, Conversations, Bookings) scroll to the right anchors and that Conversations expand/collapse still works. Type/diagnostic verification is now available via `npm run typecheck` (`astro check && tsc --noEmit`).
- Set `CALCOM_API_KEY` secret (local `.dev.vars` + remote via `npx wrangler pages secret put CALCOM_API_KEY`) and test a real booking end-to-end.
- Optional: Set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` secrets whenever ready to expand to paid ChatGPT / Claude checks.

## Unapplied migrations / manual steps

- **`0005_add_messages_channel.sql`** — adds the `channel TEXT NOT NULL DEFAULT 'text'` column to `messages`. NOT yet applied. Apply to **both** local and remote D1:
  - `npm run db:migrate:local`
  - `npm run db:migrate:remote`
  - apply migration `0005_add_messages_channel.sql`
- **Set `GEMINI_API_KEY` as a Cloudflare Pages secret** (required for the voice mode `/api/voice-token` token minting in production).
- Migrations 0001–0004 are applied to both local and remote D1 databases.


