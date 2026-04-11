"use client";

/**
 * /world-class/trends — 7 trend source tabs (X · Reddit · GitHub · Product
 * Hunt · Hacker News · Awwwards · Apple Design Awards + Google Play Best).
 *
 * Each tab shows every inspiration in the catalog that cites this source,
 * letting a visitor see "where did each strength come from?". Pure client
 * render — no I/O. Data from `lib/world-class/catalog.ts`.
 */

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AXES,
  INSPIRATIONS,
  TREND_SOURCES,
  inspirationsBySource,
  type TrendSource,
} from "@/lib/world-class/catalog";

export default function TrendsPage() {
  const [active, setActive] = useState<TrendSource>(TREND_SOURCES[0].id);
  const items = inspirationsBySource(active);
  const sourceMeta = TREND_SOURCES.find((s) => s.id === active)!;

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-32">
      {/* Hero */}
      <section className="border-b border-white/5">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <Link href="/world-class" className="inline-flex items-center gap-2 text-xs text-white/60 hover:text-white">
            ← 월드클래스 쇼케이스
          </Link>
          <h1 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight">
            2025 트렌드 소스 ·{" "}
            <span className="bg-gradient-to-r from-amber-300 via-pink-300 to-fuchsia-300 bg-clip-text text-transparent">
              {TREND_SOURCES.length}개
            </span>
          </h1>
          <p className="mt-2 text-white/70 max-w-2xl">
            결은 X · Reddit · GitHub · Product Hunt · Hacker News · Awwwards ·
            Apple Design Awards · Google Play Best of{" "}
            총 {TREND_SOURCES.length}개 신뢰 소스에서 2025년 최고 반응을 얻은 앱들을
            수집해 강점을 이식했습니다. 아래 탭을 눌러 각 소스별 추적 결과를
            확인하세요.
          </p>

          {/* Tab bar */}
          <div className="mt-8 flex flex-wrap gap-2">
            {TREND_SOURCES.map((s) => {
              const count = inspirationsBySource(s.id).length;
              const isActive = active === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    isActive
                      ? "border-white/40 bg-white/[0.12] text-white"
                      : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <span className="font-medium">{s.label}</span>
                  <span className="ml-2 text-xs text-white/50">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Tab content */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-white/50">소스</div>
            <div className="mt-1 text-xl font-semibold">{sourceMeta.label}</div>
          </div>
          <a
            href={sourceMeta.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/60 hover:text-white underline underline-offset-4 decoration-white/30"
          >
            {sourceMeta.url} ↗
          </a>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
          >
            {items.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center text-white/60">
                이 소스에서 추출된 영감이 아직 카탈로그에 표시되지 않았습니다.
                <br />
                <code className="text-white/40 text-[11px]">
                  lib/world-class/catalog.ts
                </code>{" "}
                의 INSPIRATIONS 에 sources 필드를 추가하면 자동 반영됩니다.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {items.map((i, idx) => {
                  const ax = AXES.find((a) => a.id === i.axis)!;
                  return (
                    <motion.div
                      key={i.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.03 }}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs text-white/50">{ax.label}</div>
                          <div className="mt-1 text-base font-semibold text-white">{i.name}</div>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-white/70 leading-relaxed">{i.oneLine}</p>
                      <div className="mt-3 text-[11px] text-white/50">
                        이식 → <code className="text-white/75">{i.adoptedAs}</code>
                      </div>
                      <Link
                        href={`/world-class/inspirations?axis=${i.axis}`}
                        className="mt-3 inline-block text-[11px] text-white/60 hover:text-white underline underline-offset-2 decoration-white/30"
                      >
                        같은 축에서 보기 →
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Stats strip */}
        <div className="mt-14 rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8 backdrop-blur">
          <div className="text-xs uppercase tracking-wider text-white/50">
            소스별 추출 현황
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {TREND_SOURCES.map((s) => {
              const count = inspirationsBySource(s.id).length;
              const pct = Math.round((count / INSPIRATIONS.length) * 100);
              return (
                <div key={s.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="text-xs text-white/60">{s.label}</div>
                  <div className="mt-1 text-lg font-semibold text-white">{count} 앱</div>
                  <div className="mt-2 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-400 to-fuchsia-400"
                      style={{ width: `${Math.max(2, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
