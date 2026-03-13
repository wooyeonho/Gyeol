export const LOCALES = ["ko", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_COOKIE_NAME = "gyeol_locale";
export const DEFAULT_LOCALE: Locale = "en";

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
  return locale === "ko" ? "ko-KR" : "en-US";
}

export function getLanguageName(locale: Locale): "Korean" | "English" {
  return locale === "ko" ? "Korean" : "English";
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
