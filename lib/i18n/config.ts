export const LOCALES = ["ko", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ko";

export function isValidLocale(value: string): value is Locale {
  return LOCALES.includes(value as Locale);
}
