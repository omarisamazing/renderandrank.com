# Visitor Metadata Capture

The site captures visitor metadata to provide context for chats, form
submissions, and bookings. Data is assembled from server-side (Cloudflare)
signals and client-side page context.

## What is captured

- **Geo (IP-derived):** `city`, `region`, `country`, `latitude`, `longitude`, `isp`
- **Device / client:** `device_type`, `browser`, `os`, `language`
- **Attribution:** `referrer`, `landing_page`, `utm_source`, `utm_medium`,
  `utm_campaign`, `utm_term`, `utm_content`
- **Raw:** `ip`, `user_agent`

## Where it comes from

- **Server-side:** `functions/lib/visitor.ts` — `getVisitorMetadata` derives geo
  from Cloudflare `cf.*` fields, parses the user agent (device, browser, OS), and
  reads the request language.
- **Client-side:** `src/lib/visitorClient.ts` — collects `referrer`,
  `landing_page`, and the `utm_*` parameters read from the URL.

The server-side metadata is merged with the client-side context to form the
complete record.

## Where it is stored

- Metadata columns added to the `conversations` table (**migration 0003**).
- Metadata columns added to the `submissions` table (**migration 0003**).
- All columns on the `bookings` table.

## Known display quirk

The `region` value can be a short **ISO 3166-2** code rather than a full name,
because it comes directly from Cloudflare geo. For example, `A` maps to the
Barishal (Barisal) Division in Bangladesh (BD). Treat `region` as a raw code and
map or label it in the UI if a friendly name is needed.

## Privacy

The following captured data is disclosed in the privacy policy at
`src/data/legal.ts` (updated **August 29, 2026**): city / region / country,
device, browser, OS, language, referrer, and UTM parameters.
