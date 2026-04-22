"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getLocalizedFeatureCatalog, type FeatureCategory, type FeatureStatus } from "@/lib/features/catalog";
import { useTranslations } from "@/components/i18n-provider";

const STATUS_META: Record<FeatureStatus, { className: string }> = {
  ready: { className: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30" },
  beta: { className: "bg-amber-500/20 text-amber-200 border-amber-400/30" },
  planned: { className: "bg-white/10 text-white/70 border-white/20" },
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
  const { locale, t } = useTranslations();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FeatureStatus | "all">("all");
  const featureCatalog = useMemo(() => getLocalizedFeatureCatalog(locale), [locale]);
  const categoryLabels = useMemo(
    () => ({
      core: t("featuresPage.category.core"),
      growth: t("featuresPage.category.growth"),
      world: t("featuresPage.category.world"),
      creative: t("featuresPage.category.creative"),
      experimental: t("featuresPage.category.experimental"),
      operations: t("featuresPage.category.operations"),
    }) satisfies Record<FeatureCategory, string>,
    [t]
  );
  const categoryDescriptions = useMemo(
    () => ({
      core: t("featuresPage.categoryDescription.core"),
      growth: t("featuresPage.categoryDescription.growth"),
      world: t("featuresPage.categoryDescription.world"),
      creative: t("featuresPage.categoryDescription.creative"),
      experimental: t("featuresPage.categoryDescription.experimental"),
      operations: t("featuresPage.categoryDescription.operations"),
    }) satisfies Record<FeatureCategory, string>,
    [t]
  );
  const statusLabels = useMemo(
    () => ({
      ready: t("featuresPage.ready"),
      beta: t("featuresPage.beta"),
      planned: t("featuresPage.planned"),
    }) satisfies Record<FeatureStatus, string>,
    [t]
  );

  const filtered = useMemo(() => {
    return featureCatalog.filter((feature) => {
      const matchStatus = statusFilter === "all" || feature.status === statusFilter;
      const q = query.trim().toLowerCase();
      const matchQuery =
        q.length === 0 ||
        feature.name.toLowerCase().includes(q) ||
        feature.summary.toLowerCase().includes(q) ||
        categoryLabels[feature.category].toLowerCase().includes(q);
      return matchStatus && matchQuery;
    }).sort((a, b) => {
      const categoryDiff = CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
      if (categoryDiff !== 0) return categoryDiff;
      return a.name.localeCompare(b.name, "ko");
    });
  }, [categoryLabels, featureCatalog, query, statusFilter]);

  const counts = useMemo(() => {
    return featureCatalog.reduce(
      (acc, feature) => {
        acc.total += 1;
        acc[feature.status] += 1;
        return acc;
      },
      { total: 0, ready: 0, beta: 0, planned: 0 },
    );
  }, [featureCatalog]);

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
          <article className="glass-card rounded-2xl p-4">
            <p className="text-sm font-medium">{t("featuresPage.pillar1Title")}</p>
            <p className="mt-2 text-sm leading-6 text-white/65">{t("featuresPage.pillar1Body")}</p>
          </article>
          <article className="glass-card rounded-2xl p-4">
            <p className="text-sm font-medium">{t("featuresPage.pillar2Title")}</p>
            <p className="mt-2 text-sm leading-6 text-white/65">{t("featuresPage.pillar2Body")}</p>
          </article>
          <article className="glass-card rounded-2xl p-4">
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
          {(Object.keys(CATEGORY_ORDER) as FeatureCategory[]).map((category) => (
            <article key={category} className="glass-card rounded-2xl p-4">
              <p className="text-xs text-white/45">{categoryLabels[category]}</p>
              <p className="mt-2 text-sm leading-6 text-white/72">{categoryDescriptions[category]}</p>
            </article>
          ))}
        </section>

        <section className="mb-5 glass-card rounded-2xl p-3">
          <label htmlFor="feature-search" className="sr-only">
            {t("featuresPage.searchPlaceholder")}
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
            <article key={feature.id} className="glass-card rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-white/50">{categoryLabels[feature.category]}</p>
                  <h2 className="mt-0.5 font-medium">{feature.name}</h2>
                </div>
                <span className={`rounded-full border px-2 py-1 text-[11px] ${STATUS_META[feature.status].className}`}>
                  {statusLabels[feature.status]}
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
            <div className="glass-card rounded-2xl p-6 text-center text-sm text-white/55">
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
