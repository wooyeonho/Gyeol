import { getIntlLocale, type Locale } from "@/lib/i18n/config";

export function formatLocalizedDate(
  value: string | number | Date,
  locale: string,
  options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" }
): string {
  return new Intl.DateTimeFormat(getIntlLocale(locale as Locale), options).format(new Date(value));
}

export function formatLocalizedDateTime(
  value: string | number | Date,
  locale: string,
  options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
): string {
  return new Intl.DateTimeFormat(getIntlLocale(locale as Locale), options).format(new Date(value));
}

export function formatLocalizedTime(
  value: string | number | Date,
  locale: string,
  options: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" }
): string {
  return new Intl.DateTimeFormat(getIntlLocale(locale as Locale), options).format(new Date(value));
}
