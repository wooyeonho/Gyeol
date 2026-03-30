import { getIntlLocale, type Locale } from "@/lib/i18n/config";

export function formatLocalizedDate(
  value: string | number | Date,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" }
): string {
  return new Intl.DateTimeFormat(getIntlLocale(locale), options).format(new Date(value));
}

export function formatLocalizedDateTime(
  value: string | number | Date,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
): string {
  return new Intl.DateTimeFormat(getIntlLocale(locale), options).format(new Date(value));
}

export function formatLocalizedTime(
  value: string | number | Date,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" }
): string {
  return new Intl.DateTimeFormat(getIntlLocale(locale), options).format(new Date(value));
}

/**
 * Format a number with locale-appropriate separators and decimal places.
 * e.g. 19900 → "19,900" (en) or "19,900" (ko)
 */
export function formatLocalizedNumber(
  value: number,
  locale: Locale,
  options: Intl.NumberFormatOptions = {}
): string {
  return new Intl.NumberFormat(getIntlLocale(locale), options).format(value);
}

/**
 * Format a number as currency with locale-appropriate formatting.
 * e.g. 19900, "KRW" → "₩19,900" (ko) or "₩19,900" (en)
 */
export function formatLocalizedCurrency(
  value: number,
  locale: Locale,
  currency: string = "KRW"
): string {
  return new Intl.NumberFormat(getIntlLocale(locale), {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a relative time string (e.g. "3 days ago", "in 2 hours").
 */
export function formatRelativeTime(
  value: Date | string | number,
  locale: Locale
): string {
  const date = new Date(value);
  const now = Date.now();
  const diffMs = date.getTime() - now;
  const absDiffMs = Math.abs(diffMs);

  const rtf = new Intl.RelativeTimeFormat(getIntlLocale(locale), { numeric: "auto" });

  if (absDiffMs < 60_000) return rtf.format(Math.round(diffMs / 1000), "second");
  if (absDiffMs < 3_600_000) return rtf.format(Math.round(diffMs / 60_000), "minute");
  if (absDiffMs < 86_400_000) return rtf.format(Math.round(diffMs / 3_600_000), "hour");
  if (absDiffMs < 2_592_000_000) return rtf.format(Math.round(diffMs / 86_400_000), "day");
  return rtf.format(Math.round(diffMs / 2_592_000_000), "month");
}
