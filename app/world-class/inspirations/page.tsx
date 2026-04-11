"use client";

/**
 * /world-class/inspirations — Filterable grid of every inspiration app in the
 * catalog. Users can:
 *   — filter by axis (20 axes)
 *   — filter by trend source (7 sources)
 *   — read the one-liner, adoption target, and sources for each app
 *
 * Data comes exclusively from `lib/world-class/catalog.ts` — edit the catalog
 * to update this page. URL query params (`?axis=` / `?source=`) deep-link
 * directly into a filter, so the `ExpandedAxesSection` "카드 보기 →" links work.
 */

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  AXES,
  INSPIRATIONS,
  TREND_SOURCES,
  type AxisId,
  type TrendSource,
} from "@/lib/world-class/catalog";

function InspirationsPageInner() {
  const params = useSearchParams();
  const initialAxis = (params.get("axis") as AxisId | null) ?? null;
  const initialSource = (params.get("source") as TrendSource | null) ?? null;
  const [axis, setAxis] = useState<AxisId | null>(initialAxis);
  const [source, setSource] = useState<TrendSource | null>(initialSource);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return INSPIRATIONS.filter((i) => {
      if (axis && i.axis !== axis) return false;
      if (source && !i.sources.includes(source)) return false;
      if (query && !`${i.name} ${i.oneLine} ${i.adoptedAs}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [axis, source, q]);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-32">
      {/* Hero */}
      <section className="border-b border-white/5">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <Link href="/world-class" className="inline-flex items-center gap-2 text-xs text-white/60 hover:text-white">
            ← 월드클래스 쇼케이스
          </Link>
          <h1 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight">
            영감 카탈로그 ·{" "}
            <span className="bg-gradient-to-r from-teal-300 via-indigo-300 to-fuchsia-300 bg-clip-text text-transparent">
              {INSPIRATIONS.length}개 앱
            </span>
          </h1>
          <p className="mt-2 text-white/70 max-w-2xl">
            20개 축 · 전 세계 최상위 앱들 · 각 앱의 강점과 결에 이식된 코드 경로를
            한눈에 확인할 수 있습니다. 축 또는 트렌드 소스로 필터링하세요.
          </p>

          {/* Search */}
          <div className="mt-6">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="앱 이름, 강점, 이식 경로 검색…"
              className="w-full md:w-96 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30 transition"
            />
          </div>

          {/* Axis chips */}
          <div className="mt-5">
            <div className="text-[11px] uppercase tracking-wider text-white/50 mb-2">축</div>
            <div className="flex flex-wrap gap-1.5">
              <FilterChip active={axis === null} onClick={() => setAxis(null)}>
                전체 ({INSPIRATIONS.length})
              </FilterChip>
              {AXES.map((a) => {
                const count = INSPIRATIONS.filter((i) => i.axis === a.id).length;
                return (
                  <FilterChip key={a.id} active={axis === a.id} onClick={() => setAxis(a.id)}>
                    {a.label} · {count}
                  </FilterChip>
                );
              })}
            </div>
          </div>

          {/* Source chips */}
          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-wider text-white/50 mb-2">트렌드 소스</div>
            <div className="flex flex-wrap gap-1.5">
              <FilterChip active={source === null} onClick={() => setSource(null)}>
                전체
              </FilterChip>
              {TREND_SOURCES.map((s) => {
                const count = INSPIRATIONS.filter((i) => i.sources.includes(s.id)).length;
                return (
                  <FilterChip key={s.id} active={source === s.id} onClick={() => setSource(s.id)}>
                    {s.label} · {count}
                  </FilterChip>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-4 text-xs text-white/60">
          {filtered.length} / {INSPIRATIONS.length} 앱 표시 중
          {axis && <span className="ml-2">· 축: {AXES.find((a) => a.id === axis)?.label}</span>}
          {source && <span className="ml-2">· 소스: {TREND_SOURCES.find((s) => s.id === source)?.label}</span>}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center text-white/60">
            조건에 맞는 앱이 없습니다. 필터를 느슨하게 풀어보세요.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((i, idx) => {
              const ax = AXES.find((a) => a.id === i.axis)!;
              return (
                <motion.div
                  key={i.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(idx * 0.02, 0.4) }}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur hover:border-white/20 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs text-white/50">{ax.label}</div>
                      <div className="mt-1 text-base font-semibold text-white">{i.name}</div>
                    </div>
                    <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] text-white/60">
                      {ax.id}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-white/70 leading-relaxed">{i.oneLine}</p>
                  <div className="mt-3 text-[11px] text-white/50">
                    이식 → <code className="text-white/75">{i.adoptedAs}</code>
                  </div>
                  {i.sources.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {i.sources.map((s) => {
                        const label = TREND_SOURCES.find((t) => t.id === s)?.label ?? s;
                        return (
                          <button
                            key={s}
                            onClick={() => setSource(s)}
                            className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] text-white/60 hover:text-white hover:border-white/20 transition"
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition ${
        active
          ? "border-white/40 bg-white/[0.12] text-white"
          : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

export default function InspirationsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-10 text-white/60">
          Loading…
        </main>
      }
    >
      <InspirationsPageInner />
    </Suspense>
  );
}
