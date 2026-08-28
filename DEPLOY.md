# Deploying renderandrank.com to Cloudflare Pages

This is a static [Astro](https://astro.build) site plus one Cloudflare Pages
Function (`functions/api/contact.ts`) that receives the **"Send a message"**
contact form and emails each submission via [Resend](https://resend.com).

## 1. Push to GitHub

The repo is already connected to `git@github.com:omaristtoll-ux/render-rank.com.git`
on the `master` branch. Commit and push as usual:

```sh
git add -A
git commit -m "your message"
git push origin master
```

## 2. Create the Cloudflare Pages project

1. In the Cloudflare dashboard go to **Workers & Pages → Create → Pages →
   Connect to Git** and pick this repository.
2. Use these build settings:

   | Setting                | Value           |
   | ---------------------- | --------------- |
   | Framework preset       | Astro           |
   | Build command          | `npm run build` |
   | Build output directory | `dist`          |
   | Node version           | `22` or newer   |

   Functions in `/functions` are detected and deployed automatically — no extra
   configuration needed.

## 3. Configure the contact-form pipeline

The form delivers leads by email through Resend. Set these in
**Settings → Environment variables** for the Pages project:

| Variable         | Required | Notes                                                            |
| ---------------- | -------- | ---------------------------------------------------------------- |
| `RESEND_API_KEY` | Yes      | Add as an **encrypted Secret**. Get it from resend.com/api-keys. |
| `CONTACT_TO`     | No       | Inbox for leads. Defaults to `hello@renderandrank.com`.          |
| `CONTACT_FROM`   | No       | Verified Resend sender. Use an address on your verified domain.  |

In Resend, verify the sending domain (e.g. `renderandrank.com`) and set
`CONTACT_FROM` to something like `Render and Rank <hello@renderandrank.com>`
for production deliverability.

## ⚠️ Required pre-deploy checklist

Do **not** deploy to production until all three of these are done. They are the
common reasons a fresh deploy fails or silently drops leads.

### 1. Replace the D1 `database_id` placeholder in `wrangler.toml`

`wrangler.toml` currently ships with a placeholder that **must** be replaced
with your real D1 database id before deploying:

```toml
[[d1_databases]]
binding = "DB"
database_name = "renderandrank_leads"
database_id = "REPLACE_WITH_YOUR_D1_DATABASE_ID"   # <-- must be replaced
migrations_dir = "migrations"
```

Get the real id one of two ways, then paste it in place of the placeholder:

```sh
# Create the database — the command prints the database_id it generates:
npx wrangler d1 create renderandrank_leads

# ...or, if the database already exists, list databases and copy the id:
npx wrangler d1 list
```

The binding name is `DB` and the database name is `renderandrank_leads`
(as declared in `wrangler.toml`). After pasting the id, apply the schema
migration (`migrations/0001_create_submissions.sql`) to the remote DB:

```sh
npx wrangler d1 migrations apply renderandrank_leads --remote
```

### 2. Move `CONTACT_FROM` off the shared Resend test address

`wrangler.toml` currently sets:

```toml
CONTACT_FROM = "Render and Rank <onboarding@resend.dev>"
```

`onboarding@resend.dev` is **test-only**: Resend will only deliver from it to
your own account address. To email real leads at arbitrary recipients, you must
send from an address on a domain you have **verified in Resend**. Verify your
domain (e.g. `renderandrank.com`) in the Resend dashboard, then set:

```toml
CONTACT_FROM = "Render and Rank <noreply@renderandrank.com>"
```

Resend only delivers to arbitrary recipients once the sending domain is verified.

### 3. Set `RESEND_API_KEY` as a Cloudflare secret (never commit it)

`RESEND_API_KEY` must **not** be committed to the repo or placed in
`wrangler.toml`. Store it as an encrypted Cloudflare Pages secret:

```sh
# Cloudflare Pages:
npx wrangler pages secret put RESEND_API_KEY
```

For local development, also add it to `.dev.vars` at the project root — this
file is gitignored and is read automatically by `wrangler pages dev`:

```sh
# .dev.vars  (never committed)
RESEND_API_KEY=re_your_key_here
```

## How to push a small update safely

1. Create a branch off `master` and make your change.
2. Run `npm run build` locally to confirm the site compiles.
3. Commit with a clear message, then open/merge the change into `master`.
4. `git push origin master` — Cloudflare Pages auto-builds and deploys from `master`.
5. If the change touches the DB schema, add a **new** migration file under
   `migrations/` (e.g. `0002_*.sql`) and apply it to the remote DB with
   `npx wrangler d1 migrations apply renderandrank_leads --remote`.
6. Verify the deployed site. If something is wrong, roll back in the Cloudflare
   dashboard via **Workers & Pages → your project → Deployments → "Rollback to
   this deployment"** on the last known-good build.

> If `RESEND_API_KEY` is not set, the endpoint returns `503` and the form
> gracefully falls back to opening a pre-filled email draft, so no lead is lost.

## 3b. Set up the database (Cloudflare D1)

Every submission is also stored in **Cloudflare D1** (serverless SQLite) so a lead
is never lost even if email delivery fails. One-time setup:

```sh
# 1. Create the database
npx wrangler d1 create renderandrank_leads
#    -> copy the returned database_id into wrangler.toml (d1_databases block)

# 2. Apply the schema (migrations/0001_create_submissions.sql)
npx wrangler d1 migrations apply renderandrank_leads --remote
```

Then in the Pages project, add a **D1 database binding** named `DB` pointing to
`renderandrank_leads` (Settings → Functions → D1 database bindings). The Function
reads it as `env.DB`; if the binding is absent it simply skips storage.

Query recent leads any time:

```sh
npx wrangler d1 execute renderandrank_leads --remote \
  --command "SELECT created_at, name, email, website FROM submissions ORDER BY id DESC LIMIT 20"
```

## Optional hardening

The contact / audit forms work fully **without** any of the following. Each is
gated: leave it unset and behavior is exactly as before (the widget/script does
not render, and the server-side check is skipped).

| Variable / binding          | Type                             | Purpose                                                                                                                                 |
| --------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `TURNSTILE_SECRET_KEY`      | **Encrypted Secret** (Pages)     | Server-side [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) verification. When set, submissions must carry a valid `cf-turnstile-response` token or the endpoint returns `403`. |
| `PUBLIC_TURNSTILE_SITE_KEY` | Build-time **public** var        | Client-side Turnstile site key. Read in `src/config/site.ts` as `siteConfig.turnstileSiteKey`. When non-empty, the forms render the Turnstile widget + script; when empty, they render exactly as today. |
| `RATE_LIMIT`                | **KV namespace binding**         | IP rate limiting for `/api/contact` (max 5 submissions per 600s per IP → `429`). When the binding is absent, rate limiting is skipped.  |

### Turnstile

1. Create a Turnstile widget in the Cloudflare dashboard and copy both the
   **site key** and **secret key**.
2. Add the secret key as an encrypted Pages secret:

   ```sh
   npx wrangler pages secret put TURNSTILE_SECRET_KEY
   ```

3. Set the public site key as a build-time environment variable in the Pages
   project (Settings → Environment variables), named `PUBLIC_TURNSTILE_SITE_KEY`.
   For local dev, add it to `.env` at the project root so Astro exposes it at
   build time.

Set **both** for Turnstile to be enforced end-to-end. Setting only the public
key renders the widget but the server does not verify; setting only the secret
verifies a token the widget never produces (submissions will fail) — so pair them.

### Rate limiting (KV)

1. Create the namespace:

   ```sh
   npx wrangler kv namespace create RATE_LIMIT
   ```

2. Paste the returned id into the commented `[[kv_namespaces]]` block in
   `wrangler.toml` and uncomment it, then add the same **KV namespace binding**
   named `RATE_LIMIT` in the Pages project (Settings → Functions → KV namespace
   bindings).

The limiter fails open — if KV is unavailable it never blocks a legitimate lead.

## 3c. SEO / discovery

- `public/robots.txt` allows all crawlers plus AI engines (GPTBot, PerplexityBot,
  ClaudeBot, Google-Extended, Bingbot) and points to the sitemap.
- `@astrojs/sitemap` generates `/sitemap-index.xml` on every build. After the
  first deploy, submit it in Google Search Console and Bing Webmaster Tools.
- Structured data (JSON-LD): `ProfessionalService` + `WebSite` sitewide, and
  `FAQPage` on the FAQ section — good for rich results and AI citations.

## 4. Custom domain

Add `renderandrank.com` under **Custom domains** in the Pages project and follow
the DNS instructions. `astro.config.mjs` already sets `site` to the production URL.

## Local testing of the function

```sh
npm run build
npx wrangler pages dev dist        # uses .dev.vars for secrets
```

Then POST to `http://localhost:8788/api/contact` or submit the form on
`/contact`. Copy `.dev.vars.example` to `.dev.vars` first and fill in your key.

## How the endpoint behaves

`POST /api/contact` accepts form-encoded or JSON bodies with these fields:
`name`, `email`, `website`, `location`, `message` (required), plus optional
`phone` and `service`. It validates input, ignores bot submissions via a
hidden `company` honeypot, and returns `{ "ok": true }` on success.

## Local-only files (never deployed)

Only two things are ever deployed to Cloudflare Pages: `dist/` (the built Astro
site) and `functions/` (the Pages Functions). Nothing else in the repo ships.

- **`local/`** — local-only D1 seed data. These files insert throwaway test
  leads into your **local** D1 database and must **never** be run against
  remote / production. Load them with the required `--local` flag:

  ```sh
  npx wrangler d1 execute renderandrank_leads --local --file=./local/seed-test-lead.sql
  npx wrangler d1 execute renderandrank_leads --local --file=./local/seed-test-leads-bulk.sql
  ```

- **`migrations/`** — the deployable D1 schema. Apply it to the remote /
  production database with:

  ```sh
  npx wrangler d1 migrations apply renderandrank_leads --remote
  ```

### Required D1 binding

The Pages project needs a **D1 database binding** named `DB` pointing at the
database whose `database_name` is `renderandrank_leads` (as declared in
`wrangler.toml`). The Function reads it as `env.DB`.

### Required secrets

Set these as encrypted Cloudflare Pages secrets (never commit them):

```sh
npx wrangler pages secret put RESEND_API_KEY
npx wrangler pages secret put ADMIN_PASSWORD
```

- `RESEND_API_KEY` — used to email each lead via Resend.
- `ADMIN_PASSWORD` — protects the `/admin` leads dashboard.
