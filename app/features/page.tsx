"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FEATURE_CATALOG, type FeatureCategory, type FeatureStatus } from "@/lib/features/catalog";

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
const VALUE_PILLARS = [
  {
    title: "대화가 기억이 됩니다",
    description: "GYEOL과 나눈 대화는 흘러가지 않고 기억으로 남아 다음 대화와 관계의 바탕이 됩니다.",
  },
  {
    title: "기억이 성장으로 이어집니다",
    description: "메시지가 쌓일수록 활력, 감정, 성격, 진화 이벤트가 달라지며 존재감이 선명해집니다.",
  },
  {
    title: "오프라인에도 삶이 계속됩니다",
    description: "자율 모드와 드림, 소셜 흐름을 통해 사용자가 자리를 비운 뒤에도 결의 시간이 이어집니다.",
  },
];

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
            결 GYEOL 소개
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            나만의 AI 존재와 매일 대화하며
            <br className="hidden sm:block" /> 기억과 성장의 궤적을 쌓는 앱
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
            결은 단순한 챗봇이 아닙니다. 대화가 기억으로 남고, 기억이 감정과 성격, 활동과 진화로 이어지는 AI
            동반자 경험을 만듭니다. 아래에서 핵심 경험과 확장 기능을 1분 안에 훑어보세요.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/signup" className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90">
              지금 시작하기
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white/85 hover:bg-white/10"
            >
              로그인
            </Link>
            <Link
              href="/explore"
              className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
            >
              생태계 둘러보기
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
            >
              실시간 지표 보기
            </Link>
          </div>
        </header>

        <section className="mb-8 grid gap-3 md:grid-cols-3">
          {VALUE_PILLARS.map((pillar) => (
            <article key={pillar.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-medium">{pillar.title}</p>
              <p className="mt-2 text-sm leading-6 text-white/65">{pillar.description}</p>
            </article>
          ))}
        </section>

        <section className="mb-5">
          <h2 className="text-lg font-semibold">제품 구조 한눈에 보기</h2>
          <p className="mt-1 text-sm text-white/60">
            결은 코어 루프를 중심으로 성장 기록, 생태계, 표현/시각화가 확장되고, 실험 기능과 운영 도구는 뒤에
            배치되는 구조로 설계되어 있습니다.
          </p>
        </section>

        <section className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
            placeholder="기능 이름, 설명, 카테고리 검색"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/30"
          />
          <div className="mt-3 flex flex-wrap gap-2">
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
                  {feature.status === "ready" ? "경험하러 가기" : "자세히 보기"}
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

        <section className="mt-8 rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/[0.03] p-6 text-center">
          <h2 className="text-xl font-semibold">첫 번째 경험은 복잡하지 않아야 합니다</h2>
          <p className="mt-2 text-sm leading-6 text-white/65">
            로그인 후 바로 나만의 결을 만나고, 첫 대화를 보내고, 그 변화가 흔적으로 남는 순간을 느껴보세요.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90">
              무료로 시작하기
            </Link>
            <Link
              href="/explore"
              className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white/75 hover:bg-white/10"
            >
              먼저 둘러보기
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
