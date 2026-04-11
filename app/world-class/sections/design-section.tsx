"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { SectionShell, Card } from "./section-shell";
import {
  DESIGN_PRINCIPLES,
  worldClassMotion,
  numberColor,
  densityRowHeight,
  type Density,
} from "@/lib/design/world-class-playbook";

const DESIGN_APPS = [
  "Apple HIG", "Linear", "Figma", "Notion", "Arc", "Airbnb",
  "Stripe", "Robinhood", "Headspace", "Duolingo", "Pinterest", "Instagram",
];

export function DesignSection() {
  const [popKey, setPopKey] = useState(0);
  const [count, setCount] = useState(1234);
  const [dir, setDir] = useState<"up" | "down" | "neutral">("up");
  const [density, setDensity] = useState<Density>("comfortable");

  return (
    <SectionShell
      id="design"
      tag="디자인 Pillar"
      title="움직임 · 이미지 · 숫자 · 호흡 — 모든 문법을 한 벌로"
      subtitle="Apple의 스프링 물리, Linear의 밀도, Stripe의 정밀, Calm의 호흡, Duolingo의 캐릭터 반응을 동시에 쓸 수 있는 디자인 문법입니다. 아래 모든 박스는 실제로 해당 원칙을 적용해 움직입니다."
      apps={DESIGN_APPS}
      gradient="from-pink-500/10 to-fuchsia-500/10"
    >
      <div className="grid gap-4 md:grid-cols-2">
        {/* Breath loop — Calm */}
        <Card title="Calm / Headspace · Breath loop (10초 사이클)">
          <div className="flex items-center justify-center h-40">
            <motion.div
              className="h-28 w-28 rounded-full bg-gradient-to-br from-indigo-400/70 to-fuchsia-400/70 shadow-[0_0_80px_rgba(129,140,248,0.45)]"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 10, repeat: Infinity, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <p className="text-xs text-white/60">
            항상 켜두는 아이들 표면이 스스로 호흡합니다. 지터 없이 사인 곡선.
          </p>
        </Card>

        {/* Success pop — Duolingo */}
        <Card title="Duolingo · Character success pop">
          <div className="flex items-center justify-center h-40">
            <motion.button
              key={popKey}
              onClick={() => setPopKey((k) => k + 1)}
              initial={{ scale: 0.6, rotate: -6, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={worldClassMotion.successPop.transition}
              className="rounded-full bg-emerald-400 px-6 py-3 text-black font-bold shadow-lg"
            >
              ✨ 다시 터뜨려보기
            </motion.button>
          </div>
          <p className="text-xs text-white/60">
            스프링 wobble (220/8/1) — 성공 피드백은 120ms 안에 반드시.
          </p>
        </Card>

        {/* Number theater — Robinhood */}
        <Card title="Robinhood · Number theater">
          <div className="flex items-center justify-between h-40">
            <div>
              <motion.div
                key={count}
                initial={{ y: dir === "up" ? 14 : -14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className="text-5xl font-bold tabular-nums"
                style={{ color: numberColor(dir) }}
              >
                {count.toLocaleString()}
              </motion.div>
              <div className="mt-1 text-xs text-white/50">
                방향별 의미 색상 — up/down/neutral
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setCount((c) => c + 42); setDir("up"); }}
                className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-300"
              >
                +42
              </button>
              <button
                onClick={() => { setCount((c) => c - 17); setDir("down"); }}
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-sm text-red-300"
              >
                −17
              </button>
            </div>
          </div>
        </Card>

        {/* Density — Linear */}
        <Card title="Linear · Density modes">
          <div className="flex gap-2 mb-3">
            {(["comfortable", "compact", "dense"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDensity(d)}
                className={`rounded-full px-3 py-1 text-xs transition ${
                  density === d
                    ? "bg-white text-black"
                    : "bg-white/10 text-white/70 hover:bg-white/15"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          <div className="space-y-1">
            {["새 기억", "오늘 아침 대화", "진화 마일스톤", "드림 로그"].map((t) => (
              <div
                key={t}
                className="flex items-center border border-white/5 rounded-md px-3 text-sm bg-white/[0.02]"
                style={{ height: densityRowHeight[density] }}
              >
                {t}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-white/60">
            56px / 44px / 36px 행 높이. 키보드 중심 앱엔 dense.
          </p>
        </Card>
      </div>

      {/* Principles grid */}
      <Card title="12개 원칙 한눈에 보기" className="mt-4">
        <div className="grid gap-2 md:grid-cols-2">
          {DESIGN_PRINCIPLES.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-white/5 bg-white/[0.02] p-3"
            >
              <div className="text-[10px] uppercase tracking-wider text-white/40">
                {p.source}
              </div>
              <div className="text-sm text-white/90 mt-0.5">{p.rule}</div>
            </div>
          ))}
        </div>
      </Card>
    </SectionShell>
  );
}
