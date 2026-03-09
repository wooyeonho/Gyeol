"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { FEATURE_CATALOG, type FeatureCategory, type FeatureStatus } from "@/lib/features/catalog";

const STATUS_META: Record<FeatureStatus, { label: string; className: string }> = {
  ready: { label: "사용 가능", className: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30" },
  beta: { label: "베타", className: "bg-amber-500/20 text-amber-200 border-amber-400/30" },
  planned: { label: "준비중", className: "bg-white/10 text-white/70 border-white/20" },
};

const CATEGORY_LABEL: Record<FeatureCategory, string> = {
  core: "핵심",
  growth: "성장",
  world: "월드",
  creative: "창작",
  experimental: "실험",
};

const FILTERS: Array<FeatureStatus | "all"> = ["all", "ready", "beta", "planned"];

export default function FeaturesPage() {
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
    <div className="min-h-screen bg-black text-white pt-16 pb-28 px-4">
      <div className="max-w-3xl mx-auto">
        <header className="mb-5">
          <h1 className="text-2xl font-semibold">기능 지도</h1>
          <p className="text-sm text-white/60 mt-1">
            우리 앱이 지금 제공하는 기능과 준비중 기능을 한눈에 확인하고 바로 실행하세요.
          </p>
        </header>

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-[11px] text-white/50">전체</p>
            <p className="text-xl font-semibold">{counts.total}</p>
          </div>
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3">
            <p className="text-[11px] text-emerald-200/80">사용 가능</p>
            <p className="text-xl font-semibold">{counts.ready}</p>
          </div>
          <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3">
            <p className="text-[11px] text-amber-200/80">베타</p>
            <p className="text-xl font-semibold">{counts.beta}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-[11px] text-white/50">준비중</p>
            <p className="text-xl font-semibold">{counts.planned}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-3 mb-5">
          <label htmlFor="feature-search" className="sr-only">
            기능 검색
          </label>
          <input
            id="feature-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="기능 이름, 설명, 카테고리 검색"
            className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/30"
          />
          <div className="flex flex-wrap gap-2 mt-3">
            {FILTERS.map((filter) => {
              const active = statusFilter === filter;
              const label =
                filter === "all"
                  ? "전체"
                  : filter === "ready"
                    ? "사용 가능"
                    : filter === "beta"
                      ? "베타"
                      : "준비중";
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
            <article
              key={feature.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-white/50">{CATEGORY_LABEL[feature.category]}</p>
                  <h2 className="font-medium mt-0.5">{feature.name}</h2>
                </div>
                <span className={`text-[11px] border rounded-full px-2 py-1 ${STATUS_META[feature.status].className}`}>
                  {STATUS_META[feature.status].label}
                </span>
              </div>
              <p className="text-sm text-white/70 mt-2">{feature.summary}</p>
              <div className="mt-3">
                <Link
                  href={feature.href}
                  className="inline-block rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white/90 hover:bg-white/20"
                >
                  바로 가기
                </Link>
              </div>
            </article>
          ))}
          {filtered.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/55">
              조건에 맞는 기능이 없습니다.
            </div>
          )}
        </section>
      </div>
      <BottomNav />
    </div>
  );
}
