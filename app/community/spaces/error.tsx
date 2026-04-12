"use client";

import { useTranslations } from "@/components/i18n-provider";

export default function SpacesError({ reset }: { error: Error; reset: () => void }) {
  const { t } = useTranslations();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-6 text-center">
      <p className="text-lg text-white/80">{t("error.title")}</p>
      <p className="mt-2 text-sm text-white/50">{t("error.description")}</p>
      <button
        onClick={reset}
        className="mt-6 rounded-full border border-white/10 bg-white/10 px-6 py-2 text-sm text-white transition-colors hover:bg-white/15"
      >
        {t("error.retry")}
      </button>
    </div>
  );
}
