import {
  getLanguageName,
  resolveLocale,
  type Locale,
} from "@/lib/i18n/config";

export function resolveGenerationLocale(options?: {
  acceptLanguage?: string | null;
  config?: unknown;
  cookieHeader?: string | null;
  explicitLocale?: string | null;
  fallback?: Locale;
}): Locale {
  return resolveLocale(options);
}

export function getLanguageInstruction(locale: Locale, style: "sentence" | "adjective" = "sentence"): string {
  const language = getLanguageName(locale);
  return style === "adjective" ? language : `Write in ${language}.`;
}
