"use client";

import { useTranslations } from "@/components/i18n-provider";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  const { t } = useTranslations();
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
      <p className="text-lg">{t("error.title")}</p>
      <p className="mt-2 text-sm text-white/60">{t("error.description")}</p>
      <button onClick={reset} className="mt-4 px-6 py-2 rounded-lg bg-accent/20 hover:bg-accent/30 transition-colors">
        {t("error.retry")}
      </button>
    </div>
  );
}
