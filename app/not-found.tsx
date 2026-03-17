"use client";

import Link from "next/link";
import { useTranslations } from "@/components/i18n-provider";

export default function NotFound() {
  const { t } = useTranslations();
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <p className="text-6xl font-bold text-white/20">404</p>
      <p className="mt-4 text-lg">{t("notFound.title")}</p>
      <p className="mt-2 text-sm text-white/60">{t("notFound.description")}</p>
      <Link
        href="/"
        className="mt-6 px-6 py-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
      >
        {t("notFound.backHome")}
      </Link>
    </div>
  );
}
