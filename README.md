# renderandrank.com

Marketing site for **Render and Rank** — a local SEO / AEO-GEO agency. Built as a fast, mostly-static [Astro](https://astro.build) site with a handful of React islands, deployed on **Cloudflare Pages** with a serverless contact pipeline backed by **Cloudflare D1** and **Resend**.

## Tech stack

- **Framework:** Astro 7 (static output) with selectively hydrated React 19 islands
- **Styling:** Tailwind CSS 4 (via `@tailwindcss/vite`) + shadcn-style UI primitives, `class-variance-authority`, `tailwind-merge`
- **Animation:** `motion`
- **Icons:** Lucide (`@lucide/astro`, `lucide-react`)
- **Fonts:** self-hosted Inter (`@fontsource-variable/inter`, latin subset) + a custom display face
- **Backend:** Cloudflare Pages Function (`functions/api/contact.ts`)
- **Database:** Cloudflare D1 (`submissions` table)
- **Email:** Resend
- **Scheduling:** Cal.com inline embed

## Project structure

```text
/
├── functions/
│   └── api/
│       └── contact.ts        # Cloudflare Pages Function — contact + audit form pipeline
├── migrations/               # D1 SQL migrations (submissions table)
├── public/
│   ├── _headers              # Cache-Control + security headers (CSP, HSTS, etc.)
│   └── fonts/                # self-hosted WOFF2 fonts
├── src/
│   ├── assets/               # images optimized via astro:assets
│   ├── components/           # .astro + React island components (forms, sections, UI kit)
│   ├── config/site.ts        # central site config (contact email, Cal.com, endpoints)
│   ├── data/                 # content: services, pricing, faqs, testimonials, portfolio, legal
│   ├── i18n/                 # i18n helpers
│   ├── layouts/Layout.astro  # global layout (Navbar, Footer, Toast, meta)
│   ├── lib/                  # shared utilities + button variants
│   ├── pages/                # routes (see below)
│   └── styles/global.css     # Tailwind entry + @font-face
├── astro.config.mjs          # Astro config (prefetch, sitemap, react, tailwind)
├── wrangler.toml             # Cloudflare Pages config (vars + D1 binding)
└── DEPLOY.md                 # full deployment guide
```

### Pages

`/` `about` `contact` `book-a-call` `calculator` `portfolio` `pricing` `privacy` `terms` `404`, plus service pages under `/services/` (`index`, `aeo-geo`, `google-maps`, `local-seo`).

## Commands

Run from the project root:

| Command           | Action                                             |
| :---------------- | :------------------------------------------------- |
| `npm install`     | Install dependencies                               |
| `npm run dev`     | Start the Astro dev server at `localhost:4321`     |
| `npm run build`   | Build the production site to `./dist/`             |
| `npm run preview` | Preview the static build locally                   |

> **Note:** `npm run dev` only serves the static front-end. The contact API (`functions/api/contact.ts`) and the D1 database run on Cloudflare, so form submissions fall back to a `mailto:` draft locally. To exercise the Function locally, build first and run it through Wrangler:
>
> ```sh
> npm run build
> npx wrangler pages dev dist   # reads secrets from .dev.vars
> ```

## Contact form pipeline

Both the contact form and the homepage free-audit form POST to `/api/contact`. The Function:

1. Validates fields (regex + min/max length) and rejects bots via a hidden honeypot.
2. Optionally verifies Cloudflare Turnstile and applies KV-based per-IP rate limiting (when those bindings are configured).
3. Persists the lead to **D1** (`submissions`) — this is the durable source of truth.
4. Sends a notification email via **Resend**.

Because the lead is stored in D1 first, a successful submission returns `{ ok: true }` even if the email step fails, so no lead is ever lost. Submitters see a toast confirmation on success; the site owner is notified by email.

## Environment variables

Configured in the Cloudflare Pages project (see `DEPLOY.md` for the full checklist):

| Variable         | Required | Notes                                                       |
| :--------------- | :------- | :---------------------------------------------------------- |
| `RESEND_API_KEY` | Yes      | Encrypted secret. From resend.com/api-keys.                 |
| `CONTACT_TO`     | No       | Inbox for leads. Defaults to `hello@renderandrank.com`.     |
| `CONTACT_FROM`   | No       | Verified Resend sender. Use an address on a verified domain.|
| `TURNSTILE_SECRET_KEY` | No | Enables server-side Turnstile verification.                 |
| `RATE_LIMIT` (KV)      | No | KV namespace binding for per-IP rate limiting.              |
| `DB` (D1)              | Yes | D1 database binding for storing submissions.                |

## Deployment

Hosted on Cloudflare Pages, auto-deployed from the `master` branch on GitHub. See **[DEPLOY.md](./DEPLOY.md)** for the complete setup (D1 creation, migrations, secrets, bindings, custom domain).

Query recent leads directly:

```sh
npx wrangler d1 execute renderandrank_leads --remote \
  --command "SELECT created_at, name, email, website FROM submissions ORDER BY id DESC LIMIT 20"
```
