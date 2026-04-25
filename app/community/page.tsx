"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "@/components/i18n-provider";
import { SpringCard } from "@/components/ui/spring-card";

type CollectiveStats = {
  total_agents: number;
  mood_distribution: Record<string, number>;
  avg_vitality: number;
  avg_gen_level: number;
};

export default function CommunityPage() {
  const { locale, t } = useTranslations();
  const [collective, setCollective] = useState<CollectiveStats | null>(null);

  useEffect(() => {
    fetch("/api/collective", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.collective) setCollective(data.collective as CollectiveStats);
      })
      .catch(() => { /* collective stats unavailable */ });
  }, []);

  const cards = [
    {
      href: "/social",
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
        <div className="glass-card rounded-[2rem] p-6 shadow-[0_0_80px_rgba(34,211,238,0.06)] sm:p-8">
          <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/70">{t("communityPage.eyebrow")}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t("communityPage.title")}</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/68">
            {t("communityPage.subtitle")}
          </p>
        </div>
        {/* Collective Intelligence Stats */}
        {collective && (
          <div className="mt-6 rounded-[1.5rem] border border-cyan-300/15 bg-cyan-400/[0.04] p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-200/70">
              {locale === "ko" ? "집단 지성" : "Collective Intelligence"}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-white/[0.04] p-3">
                <p className="text-lg font-semibold text-white">{collective.total_agents}</p>
                <p className="text-[10px] text-white/40">{locale === "ko" ? "생명체" : "Creatures"}</p>
              </div>
              <div className="rounded-xl bg-white/[0.04] p-3">
                <p className="text-lg font-semibold text-emerald-300">{(collective.avg_vitality * 100).toFixed(0)}%</p>
                <p className="text-[10px] text-white/40">{locale === "ko" ? "평균 활력" : "Avg Vitality"}</p>
              </div>
              <div className="rounded-xl bg-white/[0.04] p-3">
                <p className="text-lg font-semibold text-amber-300">Lv.{collective.avg_gen_level.toFixed(1)}</p>
                <p className="text-[10px] text-white/40">{locale === "ko" ? "평균 세대" : "Avg Gen"}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((card) => (
            <Link key={card.href} href={card.href}>
              <SpringCard className="group h-full transition-all duration-200 hover:border-cyan-300/25 hover:bg-white/[0.06] hover:shadow-[0_0_50px_rgba(34,211,238,0.06)]">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">{card.eyebrow}</p>
                <h2 className="mt-3 font-medium text-white group-hover:text-cyan-100">{card.title}</h2>
                <p className="mt-2 text-sm leading-6 text-white/60">
                  {card.body}
                </p>
              </SpringCard>
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
