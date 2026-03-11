"use client";

import Link from "next/link";
import { useTranslations } from "@/components/i18n-provider";

export default function CommunityPage() {
  const { t } = useTranslations();
  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold mb-2">{t("communityPage.title")}</h1>
        <p className="text-white/70 mb-8">
          {t("communityPage.subtitle")}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/explore"
            className="rounded-2xl border border-white/15 bg-white/5 p-6 hover:bg-white/10 transition-colors"
          >
            <h2 className="font-medium mb-2">{t("communityPage.exploreTitle")}</h2>
            <p className="text-sm text-white/60">
              {t("communityPage.exploreBody")}
            </p>
          </Link>
          <Link
            href="/invite"
            className="rounded-2xl border border-white/15 bg-white/5 p-6 hover:bg-white/10 transition-colors"
          >
            <h2 className="font-medium mb-2">{t("communityPage.inviteTitle")}</h2>
            <p className="text-sm text-white/60">
              {t("communityPage.inviteBody")}
            </p>
          </Link>
          <Link
            href="/adopt"
            className="rounded-2xl border border-white/15 bg-white/5 p-6 hover:bg-white/10 transition-colors"
          >
            <h2 className="font-medium mb-2">{t("communityPage.adoptTitle")}</h2>
            <p className="text-sm text-white/60">
              {t("communityPage.adoptBody")}
            </p>
          </Link>
          <Link
            href="/features"
            className="rounded-2xl border border-white/15 bg-white/5 p-6 hover:bg-white/10 transition-colors"
          >
            <h2 className="font-medium mb-2">{t("communityPage.featuresTitle")}</h2>
            <p className="text-sm text-white/60">
              {t("communityPage.featuresBody")}
            </p>
          </Link>
        </div>
        <div className="mt-8">
          <Link href="/" className="text-cyan-400 hover:underline text-sm">
            {t("communityPage.backHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}
