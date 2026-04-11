"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { SectionShell, Card } from "./section-shell";
import { AXES, inspirationsByAxis } from "@/lib/world-class/catalog";

/**
 * Expanded axes section — renders the 16 new axes (everything after the
 * original 4 design/revenue/features/security + AI pillar) as a compact,
 * uniform grid. Each card pulls its inspirations from
 * `lib/world-class/catalog.ts` so editing the catalog updates every surface
 * simultaneously.
 */

const ORIGINAL_AXIS_IDS = new Set(["design", "revenue", "features", "security"]);

const AXIS_GRADIENTS: Record<string, string> = {
  social: "from-rose-500/10 to-pink-500/10",
  content: "from-red-500/10 to-orange-500/10",
  "ai-native": "from-indigo-500/10 to-violet-500/10",
  gaming: "from-purple-500/10 to-fuchsia-500/10",
  audio: "from-cyan-500/10 to-sky-500/10",
  fintech: "from-emerald-500/10 to-teal-500/10",
  devtools: "from-slate-500/10 to-zinc-500/10",
  wellness: "from-lime-500/10 to-emerald-500/10",
  learning: "from-amber-500/10 to-yellow-500/10",
  travel: "from-sky-500/10 to-blue-500/10",
  productivity: "from-indigo-500/10 to-blue-500/10",
  creative: "from-fuchsia-500/10 to-pink-500/10",
  community: "from-orange-500/10 to-red-500/10",
  reader: "from-stone-500/10 to-amber-500/10",
  commerce: "from-emerald-500/10 to-lime-500/10",
  messaging: "from-blue-500/10 to-indigo-500/10",
};

export function ExpandedAxesSection() {
  const expanded = AXES.filter((a) => !ORIGINAL_AXIS_IDS.has(a.id) && a.id !== "security");
  const allApps = Array.from(
    new Set(expanded.flatMap((a) => inspirationsByAxis(a.id).map((i) => i.name))),
  );

  return (
    <SectionShell
      id="expanded"
      tag="신규 16축 확장"
      title="네 축에서 스무 축으로 — 소셜·컨텐츠·AI 네이티브·게이밍·음성·금융·개발자·헬스·학습·여행·생산성·크리에이티브·커뮤니티·리더·커머스·메시징"
      subtitle="기존 디자인·수익·기능·보안에 16개 축을 추가해 총 20개의 원칙 풀을 갖추었습니다. 각 축은 독립된 플레이북 파일과 유닛 테스트로 보증되며, 카드에서 곧바로 플레이북 경로와 영감 앱들을 확인할 수 있습니다."
      apps={allApps.slice(0, 28)}
      gradient="from-teal-500/10 via-indigo-500/10 to-fuchsia-500/10"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {expanded.map((axis, idx) => {
          const inspirations = inspirationsByAxis(axis.id);
          const gradient = AXIS_GRADIENTS[axis.id] ?? "from-white/5 to-white/5";
          return (
            <motion.div
              key={axis.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: idx * 0.03 }}
            >
              <Card title={`${axis.label} Pillar · ${inspirations.length} 앱`}>
                <div
                  className={`-mx-5 -mt-3 mb-3 h-10 rounded-b-2xl bg-gradient-to-br ${gradient}`}
                  aria-hidden
                />
                <div className="text-sm font-semibold text-white/90">
                  {axis.label}
                </div>
                <p className="mt-1 text-xs text-white/60 leading-relaxed">
                  {axis.tagline}
                </p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {inspirations.slice(0, 6).map((i) => (
                    <span
                      key={i.id}
                      title={i.oneLine}
                      className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] text-white/70"
                    >
                      {i.name}
                    </span>
                  ))}
                  {inspirations.length > 6 && (
                    <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] text-white/50">
                      +{inspirations.length - 6}
                    </span>
                  )}
                </div>
                <div className="mt-4 flex items-center justify-between text-[11px]">
                  <code className="text-white/50 truncate max-w-[60%]" title={axis.playbook}>
                    {axis.playbook}
                  </code>
                  <Link
                    href={`/world-class/inspirations?axis=${axis.id}`}
                    className="text-white/70 hover:text-white underline decoration-white/30 underline-offset-2"
                  >
                    카드 보기 →
                  </Link>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/world-class/inspirations"
          className="rounded-full border border-white/20 bg-white/[0.06] px-4 py-2 text-sm text-white/90 hover:bg-white/[0.1] transition"
        >
          전체 영감 카탈로그 보기 →
        </Link>
        <Link
          href="/world-class/trends"
          className="rounded-full border border-white/20 bg-white/[0.06] px-4 py-2 text-sm text-white/90 hover:bg-white/[0.1] transition"
        >
          2025 트렌드 (X · Reddit · GitHub · PH · HN · Awwwards · ADA) →
        </Link>
      </div>
    </SectionShell>
  );
}
