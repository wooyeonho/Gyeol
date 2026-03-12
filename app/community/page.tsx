"use client";

import Link from "next/link";
import { useTranslations } from "@/components/i18n-provider";

export default function CommunityPage() {
  const { t } = useTranslations();
  const cards = [
    {
      href: "/explore",
      title: t("communityPage.exploreTitle"),
      body: t("communityPage.exploreBody"),
      eyebrow: t("communityPage.exploreEyebrow"),
    },
    {
      href: "/invite",
      title: t("communityPage.inviteTitle"),
      body: t("communityPage.inviteBody"),
      eyebrow: t("communityPage.inviteEyebrow"),
    },
    {
      href: "/adopt",
      title: t("communityPage.adoptTitle"),
      body: t("communityPage.adoptBody"),
      eyebrow: t("communityPage.adoptEyebrow"),
    },
    {
      href: "/features",
      title: t("communityPage.featuresTitle"),
      body: t("communityPage.featuresBody"),
      eyebrow: t("communityPage.featuresEyebrow"),
    },
  ];

  return (
    <div className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="max-w-2xl mx-auto">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_80px_rgba(34,211,238,0.06)] sm:p-8">
          <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/70">{t("communityPage.eyebrow")}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t("communityPage.title")}</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/68">
            {t("communityPage.subtitle")}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-[1.5rem] border border-white/12 bg-white/[0.04] p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-300/25 hover:bg-white/[0.06] hover:shadow-[0_0_50px_rgba(34,211,238,0.06)]"
            >
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">{card.eyebrow}</p>
              <h2 className="mt-3 font-medium text-white group-hover:text-cyan-100">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-white/60">
                {card.body}
              </p>
            </Link>
          ))}
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
