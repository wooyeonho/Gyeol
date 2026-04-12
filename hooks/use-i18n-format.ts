import { useMemo } from "react";
import { useTranslations } from "@/components/i18n-provider";
import { isValidLocale, type Locale } from "@/lib/i18n/config";
import {
  formatLocalizedDate,
  formatLocalizedDateTime,
  formatLocalizedTime,
  formatLocalizedNumber,
  formatLocalizedCurrency,
  formatRelativeTime,
} from "@/lib/i18n/format";

/**
 * Convenience hook that binds all i18n formatting functions to the current locale.
 *
 * Eliminates the need to pass `locale` manually every time:
 *   Before: formatLocalizedDate(date, locale as Locale)
 *   After:  fmt.date(date)
 *
 * @example
 * const fmt = useI18nFormat();
 * <p>{fmt.date(post.created_at)}</p>
 * <p>{fmt.relative(post.created_at)}</p>
 * <p>{fmt.number(1234)}</p>
 * <p>{fmt.currency(9900)}</p>
 */
export function useI18nFormat() {
  const { locale: rawLocale } = useTranslations();
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : "en";

  return useMemo(
    () => ({
      /** Format date: "Apr 5, 2026" */
      date: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) =>
        formatLocalizedDate(value, locale, options),

      /** Format date + time: "Apr 5, 2026, 3:15 PM" */
      dateTime: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) =>
        formatLocalizedDateTime(value, locale, options),

      /** Format time only: "3:15 PM" */
      time: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) =>
        formatLocalizedTime(value, locale, options),

      /** Format number with locale separators: 19900 → "19,900" */
      number: (value: number, options?: Intl.NumberFormatOptions) =>
        formatLocalizedNumber(value, locale, options),

      /** Format currency: 19900 → "₩19,900" */
      currency: (value: number, currencyCode?: string) =>
        formatLocalizedCurrency(value, locale, currencyCode),

      /** Relative time: "3 days ago", "in 2 hours" */
      relative: (value: string | number | Date) => formatRelativeTime(value, locale),

      /** Current resolved locale */
      locale,
    }),
    [locale],
  );
}
