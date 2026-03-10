"use client";

import { LOCALES, type Locale } from "@/lib/i18n/config";
import { useTranslations } from "@/components/i18n-provider";

export function LocaleSwitcher() {
  const { locale, setLocale, t } = useTranslations();

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm text-white/60">{t("locale.label")}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {LOCALES.map((item) => {
          const active = locale === item;
          return (
            <button
              key={item}
              type="button"
              onClick={() => setLocale(item as Locale)}
              className={`rounded-full px-3 py-1.5 text-sm ${
                active ? "bg-white text-black" : "bg-white/10 text-white/80"
              }`}
            >
              {t(`locale.${item}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
