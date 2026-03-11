"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FEATURE_CATALOG, type FeatureCategory, type FeatureStatus } from "@/lib/features/catalog";
import { useTranslations } from "@/components/i18n-provider";

const STATUS_META: Record<FeatureStatus, { label: string; className: string }> = {
  ready: { label: "사용 가능", className: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30" },
  beta: { label: "베타", className: "bg-amber-500/20 text-amber-200 border-amber-400/30" },
  planned: { label: "준비중", className: "bg-white/10 text-white/70 border-white/20" },
};

const CATEGORY_LABEL: Record<FeatureCategory, string> = {
  core: "코어 루프",
  growth: "성장 기록",
  world: "생태계",
  creative: "표현/시각화",
  experimental: "실험실",
  operations: "운영 도구",
};

const CATEGORY_DESCRIPTION: Record<FeatureCategory, string> = {
  core: "대화, 기억, 상태 변화처럼 결의 중심을 이루는 경험입니다.",
  growth: "활동, 마일스톤, 회고를 통해 관계와 변화를 확인하는 층위입니다.",
  world: "다른 존재, 공개 지표, 플랫폼 흐름과 연결되는 생태계 경험입니다.",
  creative: "기억과 존재를 시각적으로 표현하는 확장 경험입니다.",
  experimental: "미래 가치 검증을 위한 베타/실험 기능입니다.",
  operations: "일반 사용 흐름보다 뒤에 놓여야 하는 운영/관측 도구입니다.",
};
const CATEGORY_ORDER: Record<FeatureCategory, number> = {
  core: 0,
  growth: 1,
  world: 2,
  creative: 3,
  experimental: 4,
  operations: 5,
};

const FILTERS: Array<FeatureStatus | "all"> = ["all", "ready", "beta", "planned"];
export default function FeaturesPage() {
  const { t } = useTranslations();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FeatureStatus | "all">("all");

  const filtered = useMemo(() => {
    return FEATURE_CATALOG.filter((feature) => {
      const matchStatus = statusFilter === "all" || feature.status === statusFilter;
      const q = query.trim().toLowerCase();
      const matchQuery =
        q.length === 0 ||
        feature.name.toLowerCase().includes(q) ||
        feature.summary.toLowerCase().includes(q) ||
        CATEGORY_LABEL[feature.category].toLowerCase().includes(q);
      return matchStatus && matchQuery;
    }).sort((a, b) => {
      const categoryDiff = CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
      if (categoryDiff !== 0) return categoryDiff;
      return a.name.localeCompare(b.name, "ko");
    });
  }, [query, statusFilter]);

  const counts = useMemo(() => {
    return FEATURE_CATALOG.reduce(
      (acc, feature) => {
        acc.total += 1;
        acc[feature.status] += 1;
        return acc;
      },
      { total: 0, ready: 0, beta: 0, planned: 0 },
    );
  }, []);

  return (
    <div className="min-h-screen bg-black px-4 py-10 text-white sm:py-16">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
          <span className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">
            {t("featuresPage.eyebrow")}
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("featuresPage.title")}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
            {t("featuresPage.subtitle")}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/signup" className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90">
              {t("featuresPage.startNow")}
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white/85 hover:bg-white/10"
            >
              {t("featuresPage.login")}
            </Link>
            <Link
              href="/explore"
              className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
            >
              {t("featuresPage.explore")}
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
            >
              {t("featuresPage.dashboard")}
            </Link>
          </div>
        </header>

        <section className="mb-8 grid gap-3 md:grid-cols-3">
          <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-medium">{t("featuresPage.pillar1Title")}</p>
            <p className="mt-2 text-sm leading-6 text-white/65">{t("featuresPage.pillar1Body")}</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-medium">{t("featuresPage.pillar2Title")}</p>
            <p className="mt-2 text-sm leading-6 text-white/65">{t("featuresPage.pillar2Body")}</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-medium">{t("featuresPage.pillar3Title")}</p>
            <p className="mt-2 text-sm leading-6 text-white/65">{t("featuresPage.pillar3Body")}</p>
          </article>
        </section>

        <section className="mb-5">
          <h2 className="text-lg font-semibold">{t("featuresPage.overviewTitle")}</h2>
          <p className="mt-1 text-sm text-white/60">
            {t("featuresPage.overviewBody")}
          </p>
        </section>

        <section className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-[11px] text-white/50">{t("featuresPage.all")}</p>
            <p className="text-xl font-semibold">{counts.total}</p>
          </div>
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3">
            <p className="text-[11px] text-emerald-200/80">{t("featuresPage.ready")}</p>
            <p className="text-xl font-semibold">{counts.ready}</p>
          </div>
          <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3">
            <p className="text-[11px] text-amber-200/80">{t("featuresPage.beta")}</p>
            <p className="text-xl font-semibold">{counts.beta}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-[11px] text-white/50">{t("featuresPage.planned")}</p>
            <p className="text-xl font-semibold">{counts.planned}</p>
          </div>
        </section>

        <section className="mb-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
          {(Object.keys(CATEGORY_LABEL) as FeatureCategory[]).map((category) => (
            <article key={category} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/45">{CATEGORY_LABEL[category]}</p>
              <p className="mt-2 text-sm leading-6 text-white/72">{CATEGORY_DESCRIPTION[category]}</p>
            </article>
          ))}
        </section>

        <section className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-3">
          <label htmlFor="feature-search" className="sr-only">
            기능 검색
          </label>
          <input
            id="feature-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("featuresPage.searchPlaceholder")}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/30"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {FILTERS.map((filter) => {
              const active = statusFilter === filter;
              const label =
                filter === "all"
                  ? t("featuresPage.all")
                  : filter === "ready"
                    ? t("featuresPage.ready")
                    : filter === "beta"
                      ? t("featuresPage.beta")
                      : t("featuresPage.planned");
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setStatusFilter(filter)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    active ? "border-white/70 bg-white/20 text-white" : "border-white/20 bg-white/5 text-white/70"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          {filtered.map((feature) => (
            <article key={feature.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-white/50">{CATEGORY_LABEL[feature.category]}</p>
                  <h2 className="mt-0.5 font-medium">{feature.name}</h2>
                </div>
                <span className={`rounded-full border px-2 py-1 text-[11px] ${STATUS_META[feature.status].className}`}>
                  {STATUS_META[feature.status].label}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-white/70">{feature.summary}</p>
              <div className="mt-3">
                <Link
                  href={feature.href}
                  className="inline-block rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white/90 hover:bg-white/20"
                >
                  {feature.status === "ready" ? t("featuresPage.ctaReady") : t("featuresPage.ctaDetail")}
                </Link>
              </div>
            </article>
          ))}
          {filtered.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/55">
              {t("featuresPage.empty")}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/[0.03] p-6 text-center">
          <h2 className="text-xl font-semibold">{t("featuresPage.closingTitle")}</h2>
          <p className="mt-2 text-sm leading-6 text-white/65">
            {t("featuresPage.closingBody")}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90">
              {t("featuresPage.closingStart")}
            </Link>
            <Link
              href="/explore"
              className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white/75 hover:bg-white/10"
            >
              {t("featuresPage.closingExplore")}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
