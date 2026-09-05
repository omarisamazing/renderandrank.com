# Keyword map — homepage + next targets

> Metrics below are **seed hypotheses, not measured data**. Volumes/difficulty
> must be confirmed with OpenSEO MCP (`research_keywords` per market/language,
> then `get_keyword_metrics` hydration) once authorised — see `docs/i18n.md`.
> Nothing here was invented as fact: treat every volume as `unknown` until the
> MCP run. `save_keywords` only after explicit confirmation (skill guardrail).

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

Shipped: homepage, `/pricing`, `/services` + 3 detail pages, `/contact` (meta rows in the
wrappers under `src/pages/{es,fr,de,it,pt,nl}/`). Remaining: `/book-a-call`,
`/about`, `/calculator` + `/check` (tool-intent), `/blog`
pillars. Each locale page gets its own keyword row — never reuse the EN term
list verbatim.
