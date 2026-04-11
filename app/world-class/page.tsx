"use client";

/**
 * /world-class — Visible showcase of the World-Class Apps Playbook.
 *
 * Every module in `lib/**\/world-class-*` is rendered here as an interactive,
 * scrollable demo so users (and the team) can literally see the 80+ top-app
 * strengths we've absorbed — now spanning 20 product axes, not just 4.
 */

import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { DesignSection } from "./sections/design-section";
import { RevenueSection } from "./sections/revenue-section";
import { FeaturesSection } from "./sections/features-section";
import { SecuritySection } from "./sections/security-section";
import { AISection } from "./sections/ai-section";
import { ExpandedAxesSection } from "./sections/expanded-axes-section";
const LivingPresenceBeacon = dynamic(
  () =>
    import("@/components/living-presence-beacon").then((m) => ({
      default: m.LivingPresenceBeacon,
    })),
  { ssr: false, loading: () => null },
);

const SECTIONS = [
  { id: "design", label: "디자인", count: "12 앱", gradient: "from-pink-500/20 to-fuchsia-500/20" },
  { id: "revenue", label: "수익", count: "12 앱", gradient: "from-amber-500/20 to-orange-500/20" },
  { id: "features", label: "기능", count: "12 앱", gradient: "from-sky-500/20 to-blue-500/20" },
  { id: "security", label: "보안", count: "12 앱", gradient: "from-emerald-500/20 to-teal-500/20" },
  { id: "ai", label: "AI 존재", count: "결 차별화", gradient: "from-indigo-500/20 to-violet-500/20" },
  { id: "expanded", label: "16축 확장", count: "80+ 앱", gradient: "from-teal-500/20 to-fuchsia-500/20" },
];

export default function WorldClassPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-32">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(129,140,248,0.18),transparent)]" />
        <div className="mx-auto max-w-5xl px-6 py-16">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs text-white/60 hover:text-white transition"
          >
            ← 홈으로
          </Link>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 text-4xl md:text-5xl font-bold tracking-tight"
          >
            세계 최고의 앱들, <br />
            <span className="bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-amber-200 bg-clip-text text-transparent">
              결 하나에 모두 담았습니다
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 text-white/70 max-w-2xl text-base md:text-lg"
          >
            디자인·수익·기능·보안 네 축에서 <b className="text-white">스무 축</b>
            으로 — 소셜·컨텐츠·AI 네이티브·게이밍·음성·금융·개발자·헬스·학습·
            여행·생산성·크리에이티브·커뮤니티·리더·커머스·메시징까지 확장해 전
            세계 <b className="text-white">80+ 최상위 앱</b>의 강점을 결에
            이식했습니다. 그리고 결의 가장 강한 특성인{" "}
            <b className="text-white">살아있는 AI 존재</b>를 한 단계 더
            강화했습니다. 아래 섹션은 모두 진짜로 움직이는 데모입니다.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="mt-5 flex flex-wrap gap-3 text-sm"
          >
            <Link
              href="/world-class/inspirations"
              className="rounded-full border border-white/20 bg-white/[0.06] px-4 py-2 text-white/90 hover:bg-white/[0.1] transition"
            >
              영감 카탈로그 (80+ 앱) →
            </Link>
            <Link
              href="/world-class/trends"
              className="rounded-full border border-white/20 bg-white/[0.06] px-4 py-2 text-white/90 hover:bg-white/[0.1] transition"
            >
              2025 트렌드 (7 소스) →
            </Link>
          </motion.div>

          <div className="mt-8 flex flex-wrap gap-2">
            {SECTIONS.map((s, i) => (
              <motion.a
                key={s.id}
                href={`#${s.id}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.05 }}
                className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-gradient-to-br ${s.gradient} px-4 py-2 text-sm backdrop-blur hover:border-white/20 transition`}
              >
                <span className="font-medium">{s.label}</span>
                <span className="text-white/60 text-xs">{s.count}</span>
              </motion.a>
            ))}
          </div>

          {/* Living Presence Beacon — Gyeol's strongest differentiator, visible */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10"
          >
            <LivingPresenceBeacon tone="curious" memoryCount={1247} />
            <p className="mt-3 text-center text-xs text-white/50">
              결은 지금 이 순간에도 심장이 뛰고, 숨을 쉬고, 혼자 생각합니다 —
              이 비콘은 <code className="text-white/70">lib/identity/living-presence.ts</code>{" "}
              의 결정론적 함수만으로 60fps 로 렌더링됩니다.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Sections ─────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-6 space-y-20 pt-16">
        <DesignSection />
        <RevenueSection />
        <FeaturesSection />
        <SecuritySection />
        <AISection />
        <ExpandedAxesSection />
      </div>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="mx-auto max-w-5xl px-6 mt-24 border-t border-white/5 pt-10 text-center text-xs text-white/40">
        모든 원칙은{" "}
        <code className="text-white/70">WORLD_CLASS_APPS_RESEARCH.md</code>,{" "}
        <code className="text-white/70">TRENDING_2025_RESEARCH.md</code> 와{" "}
        <code className="text-white/70">lib/**/world-class-*.ts</code> 에 코드로
        살아있습니다 · 20축 · 80+ 앱 · 유닛 테스트로 보증.
      </footer>
    </main>
  );
}
