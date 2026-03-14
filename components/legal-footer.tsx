"use client";

import Link from "next/link";
import { useTranslations } from "@/components/i18n-provider";

export function LegalFooter() {
  const { t } = useTranslations();

  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-white/60">
      <Link href="/privacy" className="hover:text-white/75">
        {t("common.privacyPolicy")}
      </Link>
      <Link href="/terms" className="hover:text-white/75">
        {t("common.termsOfService")}
      </Link>
    </div>
  );
}
