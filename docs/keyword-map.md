# Keyword map — homepage + next targets

> Metrics below are **seed hypotheses, not measured data**. Volumes/difficulty
> are UNKNOWN (no OpenSEO tools are mounted in the agent session and the
> Google Trends API throttles this host with HTTP 429 — see session notes).
> What *is* verified: a 30-query SERP pass (5 post topics × 6 locales,
> 2026-09) confirming intent, competitors and winning angles per market —
> written up as the 3d translation brief below. `save_keywords` only after
> explicit confirmation (skill guardrail).

## Homepage (shipped, transcreated)

| Locale | Title target | Primary theme | Secondary themes |
| ------ | ------------ | ------------- | ---------------- |
| en (`/`) | Local SEO, AEO & Generative Search Engineering | local SEO | Google Maps 3-pack, AEO, GEO, AI search visibility |
| es (`/es/`) | SEO local, 3-pack de Google Maps y visibilidad en IA | SEO local | 3-pack de Google Maps, AEO, GEO, visibilidad en IA |
| fr (`/fr/`) | SEO local, 3-pack Google Maps et visibilité IA | SEO local | 3-pack Google Maps, AEO, GEO, visibilité IA |
| de (`/de/`) | Local SEO, Google Maps 3-Pack und KI-Sichtbarkeit | Local SEO | Google Maps 3-Pack, AEO, GEO, KI-Sichtbarkeit |
| it (`/it/`) | SEO locale, 3-pack di Google Maps e visibilità AI | SEO locale | 3-pack di Google Maps, AEO, GEO, visibilità AI |
| pt (`/pt/`) | SEO local, 3-pack do Google Maps e visibilidade em IA | SEO local | 3-pack do Google Maps, AEO, GEO, visibilidade em IA |
| nl (`/nl/`) | Lokale SEO, Google Maps 3-pack en AI-zichtbaarheid | lokale SEO | Google Maps 3-pack, AEO, GEO, AI-zichtbaarheid |

Insertion points (all organic, no stuffing): `<title>`, meta description,
H1 (`hero.title`), hero sub, H2s, footer tagline. Density to verify with the
OpenSEO audit pass before each rollout step.

## Suggested OpenSEO seed sets (next run)

- EN/US: `local SEO services`, `google maps 3-pack ranking`, `AEO GEO agency`,
  `AI search visibility`, `chatgpt business recommendations`.
- ES: `agencia SEO local`, `posicionamiento Google Maps`, `visibilidad en IA`.
- FR: `agence SEO local`, `référencement Google Maps`, `visibilité IA`.
- DE: `Local SEO Agentur`, `Google Maps Ranking`, `KI-Sichtbarkeit`.
- IT: `agenzia SEO locale`, `posizionamento Google Maps`, `visibilità AI`.
- PT: `agência SEO local`, `ranqueamento Google Maps`, `visibilidade em IA`.
- NL: `lokaal SEO bureau`, `Google Maps ranking`, `AI-zichtbaarheid`.

## Next pages to map (with `keyword-clustering` before writing copy)

Shipped: homepage, `/pricing`, `/services` + 3 detail pages, `/contact`,
`/book-a-call`, `/about`, `/blog` index + 5 posts (meta rows inline in page
wrappers, per-slug rows in `src/i18n/blogMeta.ts`). Remaining: phase-3
body-copy dictionaries + full MDX post translation. Each locale page keeps
its own keyword row — never reuse the EN term list verbatim.

## 3d translation brief (SERP-verified 2026-09, volumes unknown)

Method: one intent query per post topic per locale (`websearch`, top 5).
Finding: all 5 topics have a contested native-language SERP in every market —
translation targets real demand, not empty queries. Universal winners to mirror:
myth-busting openers ("no magic button / no inscription officielle / keine
Anmeldung"), GBP + reviews + NAP consistency as the trinity, Whitespark 2026
(47 experts: GBP signals 32 %, reviews 20 %, on-page 15 %) as the shared
citation backbone, review-velocity-beats-volume, and geo-grid measurement as
our differentiator (competitors sell checklists; almost none sell grids).

### Post 1 — AI visibility (`ai-visibility-…`)

| Locale | Intent verdict | Top competitors | Translation angle |
| ------ | -------------- | --------------- | ----------------- |
| es | How-to guides for local businesses, agency-led | agenciaseo.eu, gongutierrez.es, citado.co, lpagery.io/es, HubSpot ES | Lean into "4 vías" framing (matches gongutierrez's 4-fuentes structure); add local-press-mention tactic (gongutierrez: desproporcionado impacto LLM) |
| fr | "Référencement IA" ecosystem guides, PME angle | extern-market, adwaves, localranker, lpagery/fr, happia (GEO guide) | "Écosystème, pas une technique" framing wins; PME/artisan/commerçant examples; 7-critères checklist format |
| de | AEO/GEO guides + Bing angle (unique to DE) | wordsmattr, peter-krause (AEO), ostend.digital, light-hunters | ADD a Bing Places paragraph (ostend: "Wer bei Bing nicht existiert, existiert für ChatGPT nicht"); BrightLocal 58 %-business-websites stat |
| it | Local-shop guides, Maps-as-bridge angle | kromastudio, agenzia.ai, localmarketingpro, mamagari (GEO Local) | "Maps è il ponte" framing (kromastudio); dentista-Padova / ristorante-Venezia style examples |
| pt | Checklists (llms.txt!), BR + PT mixed SERP | 3hash.pt (llms.txt checklist), phame (Bing index + Princeton stat), aiseobrasil | ADD llms.txt + robots.txt GPTBot checklist (3hash leads with it); Seer 87 %-Bing-overlap stat (phame) |
| nl | GEO guides + AI-ads emerging | aikracht, think-online, youvia, klusio | E-E-A-T framing (think-online); note "adverteren in ChatGPT" (youvia) as coming-paid-layer nuance |

### Post 2 — Maps 3-pack (`google-maps-3-pack-…`)

| Locale | Intent verdict | Top competitors | Translation angle |
| ------ | -------------- | --------------- | ----------------- |
| es | Operative guides + city pages (Valencia) | localmax, unled.net/es, ombai.io, thestacc.com/es, jfdigital (Local Pack explainer) | City-angle examples (CH Growth Valencia: 40–150 reseñas benchmark); 44 %-clicks stat (thestacc) |
| fr | Factor-ranking studies, Suisse-Romande present | ichibanseo (30 signaux), jonlabs (3 facteurs), almcorp/fr, onesty (top 8) | Whitespark factor weights table (almcorp); "pourquoi le concurrent avec moins d'avis vous dépasse" FAQ (jonlabs) |
| de | Study-driven guides, Whitespark 2026 everywhere | conversion-traffic, dtile-marketing, thestacc/de, rankpilot (SURI grid) | Cite Whitespark-2026 weights (GBP 32 % / reviews 20 % / on-page 15 %) + KI-Suche split (on-page 24 % for AI); geo-grid heatmap framing (rankpilot) |
| it | Thinner native SERP, EN guides leak in | almcorp/it, localhq.io/it, mapscan, brightseotools (EN) | Lower competition = shorter path to rank; keep EN stat backbone (44 % clicks, BrightLocal) |
| pt | Playbooks + BR directory names | unled.net/pt-br, thestacc.com/pt-br, marcelifanger (60 fatores), maxstars, harmo (47 new factors) | "Velocidade supera contagem" (unled); review-velocity framing; GuiaMais/Apontador directory names |
| nl | Local-SEO explainers, Vicinity update cited | 2manydots, connectyourworld, webmatic.be, digitalwizards | Vicinity-update proximity story; NAW (Naam-Adres-Woonplaats) terminology; Gouden Gids angles |

### Post 3 — Review velocity (`google-reviews-velocity-…`)

| Locale | Intent verdict | Top competitors | Translation angle |
| ------ | -------------- | --------------- | ----------------- |
| es | Tactical guides + vertical examples (restaurantes) | localith.ai/es (15 métodos), panca.pe (benchmarks por tipo), smashballoon/es | Vertical benchmark tables (panca.pe style); WhatsApp post-visita angle (restaurant-proven) |
| fr | **Localo deletion study dominates** — velocity-risk angle | localo.com/fr (335 520 avis supprimés), thestacc/fr, agence-braise | CITE Localo: 1–5/sem. safe, 100+/sem. deleted 99× faster; "vélocité bat volumétrie"; email-signature channel (braise) |
| de | Do/Don't guides, anti-buying stance | bewertungsflow, vynoxe, digital-lokal (Dos/Don'ts), optiphin | Löschwelle-2022 warning (digital-lokal); Mitarbeiter-Challenges + QR-link mechanics; review-gating ban |
| it | Template-hungry SERP (script/modelli queries) | localith.ai/it, vizologi/it (15 strategie), metaverbe | Request-script templates per vertical (vizologi: in-person/SMS/email/follow-up); timing 24–48h |
| pt | Stats-heavy guides, NRL concept (BR) | ethosgrowth (Whitespark 20 % + NRL), starterdigital, fidbo.pt (velocidade>total), thestacc/pt-br | "Google recompensa tendências, não marcos" (fidbo); 47-review average + 10-review first-lift (thestacc); NRL mention |
| nl | Template + tool SERP (SMS/WhatsApp/QR) | meerklantreviews.nl (per-branche timing!), klant.review, rankzilla, blijereviews (Local Guide angle) | Per-branche timing table (meerklantreviews: horeca/retail/auto/zorg); copy-paste SMS/WhatsApp/email templates; Local Guide weging (blijereviews) |

### Post 4 — Citations NAP (`local-citations-…`)

| Locale | Intent verdict | Top competitors | Translation angle |
| ------ | -------------- | --------------- | ----------------- |
| es | Audit/cleanup guides | adhocdigital, wsc.design ("calidad sobre cantidad"), agenciaciscar, ddigitals (Páginas Amarillas/QDQ/Doctoralia) | ES directory names (Páginas Amarillas, QDQ, Doctoralia, TripAdvisor); duplicate-listing cleanup framing |
| fr | Deepest SERP: tier lists + NAP-score reporting | seolocal-expert.fr, fixseo (30–50 citations, audit-first), seosupernova (NAP score), optimize360 (NAP format) | Tier-1/2/3 directory structure (PagesJaunes, 118000, Mappy, Doctolib); "30–50, au-delà rendement décroît"; NAP-score reporting concept |
| de | Stammdatensatz + structured-citation angle (unique) | inrema (NAP-Standard), seo-day.de wiki, seoguideline (Stammdatensatz), dtile (Tier-1–3) | "Stammdatensatz" master-record framing; Gelbe Seiten/Das Örtliche/11880/Jameda names; structured citations + schema |
| it | Trust/hyperlocal angle (Ticino!) | chmedia, egolem, extrasito (Ticino NAP-trust), pietrorogondino (directory list) | "Il NAP ordinato serve alle persone" trust framing (extrasito); Pagine Gialle + social-as-culprit angle |
| pt | Tier lists + BR directory names + price tables | starterdigital (BR dirs), webvipacademy (150-dir PDF, +25 % stat), ligadous (R$ plans), localo/pt-br | BR directory names (Apontador, GuiaMais, TeleListas, iFood, Doctoralia); Padaria-Moema case (+25 % stat); cleanup-beats-creation (marketingbyali) |
| nl | NAP-checker tools + KvK angle | klikklaarseo (NAP checker), digitalwizards (BV-format edge), crescira, booqable | KvK + multi-vestiging angles; "Digital Wizards BV vs B.V." entity-split example; quarterly-check cadence |

### Post 5 — Pricing/ROI (`local-seo-pricing-…`)

| Locale | Intent verdict | Top competitors | Translation angle |
| ------ | -------------- | --------------- | ----------------- |
| es | Price-range guides (300–1.500 €/mes) + 6-month lock-in norm | dinorank (300–1.500 €, auditoría 200–1.000 €), ahrefs/es ($1.557/mes), aclass (200–1.500 €) | CONTRAST angle: market demands 6-month lock-in, ours is month-to-month; freelance-vs-agencia framing |
| fr | Pack grids (149/490/990 €) + ROI simulator | seosupernova (3 packs + ROI simulator), atelier-seo (300/700/1.000 €), seoyass (freelance 300–1.000 €) | Pack-grid format is native to FR SERP; ROI-simulator concept; 6–12 month engagement norm vs our no-lock-in |
| de | Warn-signal framing (<150 € unseriös) + break-even math | dtile (300–2.000 €, break-even-Rechnung), webangebote24 (500–2.000 €), step-seeds (800–4.000 €) | Warnsignal-framing compatibility (we sit above the <150 € red line); break-even math (dtile: 2 Aufträge bei 600 €); "monatlich kündbar" as trust signal |
| it | Thin SERP (finance query leaked in) — low competition | zinnhub, dinorank equivalents thin | Transparency-table format; ROI framing carries the page; shortest path to rank of all 5 topics |
| pt | Faixa tables (R$1–10k, média R$2,5k) + alertas | pmturbo/SC (R$1–5k), sienadigital (faixas + ROI 7,65), focofy, almcorp/pt | Faixa-table format (Essencial/Profissional/Avançado); "desconfie <R$800" (siena); Ads-vs-SEO math; note USD-vs-BRL framing |
| nl | Tier tables (€300–750 / €750–2.000) + ROI-voorbeelden | ranktool (€750–2.000), searchlab (retainer-modellen), creativedeals (pakkst-keuze) | Tier-table format; uur (€75–125) vs abonnement framing; ROI-voorbeelden per branche |

### Cross-market notes for all translations

- Preços/prix/Preise/prices: always present market ranges in a comparison table — every pricing SERP rewards the table format.
- Cite, don't invent: Whitespark 2026, BrightLocal 2025/2026, Localo 2026 deletion study, Seer/Princeton GEO stats are the shared backbone. No other numbers without a source.
- Competitor tools to name-check where natural: Local Falcon / BrightLocal geo-grid (measurement), Bing Places (AI-visibility posts), llms.txt (PT post).
