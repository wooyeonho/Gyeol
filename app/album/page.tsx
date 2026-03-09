"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

type Milestone = { type: string; label: string; at: string; summary?: string };

const TYPE_ICON: Record<string, string> = {
  birth: "✦",
  evolution: "↑",
  naming: "◈",
  dream: "☽",
  artifact: "◆",
  social: "◎",
  scar: "✕",
};

export default function AlbumPage() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [visual, setVisual] = useState<{ color?: string; shape?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/album")
      .then((r) => (r.ok ? r.json() : { milestones: [] }))
      .then((d) => {
        setMilestones(d.milestones ?? []);
        setVisual(d.visual ?? null);
      })
      .catch(() => setMilestones([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-dvh bg-black text-white p-4 pb-12">
      <div className="max-w-lg mx-auto pt-12">
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold tracking-tight">성장 앨범</h1>
          <p className="text-sm text-white/40 mt-1">생명체의 주요 순간들</p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/60" style={{ animation: "dot-pulse 1.2s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        ) : milestones.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-white/5 mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl text-white/20">📖</span>
            </div>
            <p className="text-white/30 text-sm">아직 기록된 순간이 없어요</p>
            <p className="text-white/20 text-xs mt-1">대화를 나누면 앨범이 채워져요</p>
          </motion.div>
        ) : (
          <div className="relative mt-8">
            <div className="absolute left-5 top-0 bottom-0 w-px bg-white/5" />
            <ul className="space-y-4">
              {milestones.map((m, i) => {
                const icon = TYPE_ICON[m.type] || "·";
                return (
                  <motion.li
                    key={`${m.type}-${m.at}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.5) }}
                    className="relative pl-12"
                  >
                    <div
                      className="absolute left-3 top-4 w-4 h-4 rounded-full flex items-center justify-center text-[10px]"
                      style={{ background: visual?.color ? `${visual.color}22` : "rgba(255,255,255,0.05)", color: visual?.color || "rgba(255,255,255,0.5)" }}
                    >
                      {icon}
                    </div>
                    <div className="glass rounded-xl p-4">
                      <p className="font-medium text-sm text-white">{m.label}</p>
                      <p className="text-[10px] text-white/30 mt-0.5">
                        {new Date(m.at).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" })}
                      </p>
                      {m.summary && <p className="text-xs text-white/50 mt-2 leading-relaxed">{m.summary}</p>}
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex gap-3"
        >
          <Link href="/" className="glass rounded-full px-4 py-2 text-xs font-medium text-white/60 hover:text-white/80 transition-colors">
            홈
          </Link>
          <Link href="/activity" className="glass rounded-full px-4 py-2 text-xs font-medium text-white/60 hover:text-white/80 transition-colors">
            활동
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
