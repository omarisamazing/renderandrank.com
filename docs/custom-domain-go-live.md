# Custom domain go-live runbook

Run this checklist when pointing production at the custom domain
(`renderandrank.com`). Do it in order — each step gates the next.

## 0. Wire the domain in Cloudflare Pages

1. Cloudflare dashboard → **Pages** → `renderandrank` → **Custom domains** →
   **Set up a custom domain** → add the apex `renderandrank.com`
   (Cloudflare provisions SSL automatically; DNS is handled for you when the
   zone is on Cloudflare).
2. Add `www.renderandrank.com` the same way, then redirect it to the apex:
   **Rules → Redirect Rules** (Bulk Redirects also works) —
   `https://www.renderandrank.com/*` → `https://renderandrank.com/$1`, 301.
   (Belt and braces: every canonical we emit is already apex-anchored via
   `canonicalUrlFor()`, so a missed redirect can't create a duplicate-content
   canonical — but do it anyway for clean signals.)
3. Production builds must resolve the site as the root domain: ensure the
   production environment builds with
   `PUBLIC_SITE_URL=https://renderandrank.com`
   (staging/`*.pages.dev` builds keep their preview URL so the build-time
   `noindex` guard in `Layout.astro` stays armed — see `docs/i18n.md`).
4. Done when: `https://renderandrank.com/` and `https://www.renderandrank.com/`
   both resolve, and `www` 301s to the apex.

## 1. Confirm the deploy is live

Cloudflare Pages auto-deploys `master`, but verify, don't assume.

1. Open `https://renderandrank.com/es/contact/` → View Source →
   Ctrl+F `hreflang="de"`. Done when: the full 8-tag cluster + `x-default`
   is present.
2. Same page, Ctrl+F `Cuéntanos sobre tu mercado` (localized H1).
   Done when: present.
3. Open `https://renderandrank.com/robots.txt`. Done when: the `GPTBot` /
   `OAI-SearchBot` / `PerplexityBot` / `ClaudeBot` Allow blocks are there.
4. Open `https://renderandrank.com/llms.txt`. Done when: it loads (this is
   what AI crawlers read first).

## 2. Cloudflare AI-bot posture

1. Dashboard → domain → **Security → Bots**.
2. Find the **"Block AI bots"** toggle. Decision: **leave it OFF** — our
   `robots.txt` explicitly welcomes AI crawlers, and the toggle would
   silently contradict it (it blocks the retrieval bots that drive
   citations, not just training crawlers).
3. Done when: the toggle state is a conscious choice, not the default.
   If you ever turn it ON, say so — `robots.txt` must be aligned to match.

## 3. GA4 AI-referrer channel

1. analytics.google.com → Admin → **Data display → Channel groups** →
   create a custom group.
2. One rule: Source matches regex
   `chatgpt\.com|perplexity\.ai|gemini\.google\.com|copilot\.microsoft\.com`
   → channel name **AI Referral**.
3. Done when: Realtime/Reports show the channel. This is how share-of-voice
   gets measured instead of guessed.

## 4. Search Console: submit + baseline

1. search.google.com/search-console → add `renderandrank.com` (Domain
   property, DNS verify) if not already in.
2. **Sitemaps** → submit `https://renderandrank.com/sitemap-index.xml`.
   Done when: status Success, ~110+ URLs discovered.
3. **URL Inspection** → test `https://renderandrank.com/es/` once indexed.
   Done when: no hreflang/alternate errors.

## 5. Export data for the agent (5 min, repeatable)

Performance → filter by country (US, ES, FR, DE, IT, PT, NL one at a time)
→ Export CSV → paste the files into the session. Real queries get clustered
against the 5 post slugs to sharpen the 3d translation brief in
`docs/keyword-map.md`. No history yet? Then this step waits ~4 weeks
post-indexing — fine.

## 6. Three yes/no decisions (one line each)

1. Optional *"How did you hear about us?"* field on `/contact` (EN +
   6 locales)? Cost: slight form friction. Gain: attribution for unlinked
   AI mentions.
2. Spend $100+ on Google Ads for exact Planner volumes? Standing advice:
   unnecessary until step 5 shows gaps.
3. Start 3d translation (5 posts × 6 locales) now, or wait for GSC data?
   Standing advice: start with ES post 1 as a reviewed style anchor, then
   batch the rest.
