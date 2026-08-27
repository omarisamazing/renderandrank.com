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
