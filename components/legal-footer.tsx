"use client";

import Link from "next/link";
import { useTranslations } from "@/components/i18n-provider";

export function LegalFooter() {
  const { t } = useTranslations();

  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-white/72">
      <Link href="/privacy" className="rounded-lg px-2 py-1 hover:text-white">
        {t("common.privacyPolicy")}
      </Link>
      <Link href="/terms" className="rounded-lg px-2 py-1 hover:text-white">
        {t("common.termsOfService")}
      </Link>
    </div>
  );
}
