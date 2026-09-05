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
