/**
 * Supported locales for the application.
 * To add a new language:
 * 1. Add the locale code here
 * 2. Create messages/<locale>.json with all translation keys
 * 3. Add the locale to BUNDLED in lib/i18n/messages.ts
 * 4. Add display name to LOCALE_DISPLAY_NAMES below
 *
 * Priority languages for global expansion:
 * - Phase 1 (current): ko, en
 * - Phase 2 (planned): ja, zh, es
 * - Phase 3 (planned): hi, pt, fr, de, ar
 */
export const LOCALES = ["ko", "en", "ja", "zh", "es"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_COOKIE_NAME = "gyeol_locale";
export const DEFAULT_LOCALE: Locale = "en";

/** Display names for locale switcher UI */
export const LOCALE_DISPLAY_NAMES: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
  zh: "中文",
  es: "Español",
};

/** Intl locale tags */
const INTL_MAP: Record<Locale, string> = {
  ko: "ko-KR",
  en: "en-US",
  ja: "ja-JP",
  zh: "zh-CN",
  es: "es-ES",
};

/** Language names for AI generation prompts */
const LANGUAGE_NAMES: Record<Locale, string> = {
  ko: "Korean",
  en: "English",
  ja: "Japanese",
  zh: "Chinese",
  es: "Spanish",
};

export function isValidLocale(value: string): value is Locale {
  return LOCALES.includes(value as Locale);
}

export function normalizeLocale(value: string | null | undefined): Locale | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (isValidLocale(normalized)) return normalized;

  const base = normalized.split(/[-_]/)[0];
  return isValidLocale(base) ? base : null;
}

export function getIntlLocale(locale: Locale): string {
  return INTL_MAP[locale] ?? "en-US";
}

export function getLanguageName(locale: Locale): string {
  return LANGUAGE_NAMES[locale] ?? "English";
}

export function getLocaleFromCookieHeader(cookieHeader: string | null | undefined): Locale | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";");
  for (const entry of cookies) {
    const [rawKey, ...rest] = entry.trim().split("=");
    if (rawKey !== LOCALE_COOKIE_NAME) continue;
    return normalizeLocale(rest.join("="));
  }
  return null;
}

export function getLocaleFromAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;
  const candidates = header.split(",");
  for (const candidate of candidates) {
    const locale = normalizeLocale(candidate.split(";")[0]);
    if (locale) return locale;
  }
  return null;
}

export function getPreferredLocaleFromConfig(config: unknown): Locale | null {
  if (!config || typeof config !== "object") return null;
  const value = (config as { preferred_locale?: unknown; locale?: unknown }).preferred_locale
    ?? (config as { preferred_locale?: unknown; locale?: unknown }).locale;
  return typeof value === "string" ? normalizeLocale(value) : null;
}

export function resolveLocale(options?: {
  acceptLanguage?: string | null;
  config?: unknown;
  cookieHeader?: string | null;
  cookieLocale?: string | null;
  explicitLocale?: string | null;
  fallback?: Locale;
}): Locale {
  return (
    normalizeLocale(options?.explicitLocale)
    ?? normalizeLocale(options?.cookieLocale)
    ?? getLocaleFromCookieHeader(options?.cookieHeader)
    ?? getPreferredLocaleFromConfig(options?.config)
    ?? getLocaleFromAcceptLanguage(options?.acceptLanguage)
    ?? options?.fallback
    ?? DEFAULT_LOCALE
  );
}
