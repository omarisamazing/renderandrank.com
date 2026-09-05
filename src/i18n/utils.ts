import { ui, defaultLang } from "./ui";

export function getLangFromUrl(url: URL) {
  const [, lang] = url.pathname.split("/");
  if (lang in ui) return lang as keyof typeof ui;
  return defaultLang;
}

export function useTranslations(lang: keyof typeof ui) {
  return function t(key: keyof (typeof ui)[typeof defaultLang]): string {
    return (ui[lang] as Record<string, string>)[key] ?? (ui[defaultLang] as Record<string, string>)[key] ?? key;
  };
}

/**
 * Localised pillar/topic label for the blog (`blog.pillar.<topic-id>`).
 * Falls back to the EN label, then the raw topic id.
 */
export function blogTopicLabel(lang: keyof typeof ui, topic: string): string {
  const key = `blog.pillar.${topic}`;
  return (
    (ui[lang] as Record<string, string>)[key] ??
    (ui[defaultLang] as Record<string, string>)[key] ??
    topic
  );
}

/**
 * Base-post entries only. Translated siblings live beside their source as
 * `<slug>.<locale>.md` (same collection) — and Astro's content layer mangles
 * that into a dotless id (`foo.es.md` → id `fooes`), so the id alone CANNOT
 * tell them apart. Match on `filePath` instead, which keeps the real
 * filename. Listings, static paths, RSS and related-post pools must exclude
 * siblings or every translation surfaces as a phantom duplicate post
 * (verified the hard way: a `/blog/…perplexityes/` route that 500'd the
 * build on a missing meta row).
 */
export function isBasePost(entry: { id: string; filePath?: string }): boolean {
  if (entry.filePath && /\.[a-z]{2}\.md$/i.test(entry.filePath)) return false;
  if (/\.[a-z]{2}$/.test(entry.id)) return false;
  return true;
}
