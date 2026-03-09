"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Agent = {
  id: string;
  self_name?: string;
  vitality: number;
  total_messages: number;
  gen_level: number;
};
type AgentStateRow = {
  agent_id: string;
  self_name?: string;
  vitality: number;
  total_messages: number;
  gen_level: number;
};

const GEN_COLORS = [
  "#6b7280",
  "#8b5cf6",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#ef4444",
];

function getGenColor(level: number) {
  return GEN_COLORS[Math.min(level - 1, GEN_COLORS.length - 1)] || GEN_COLORS[0];
}

function VitalityRing({ vitality }: { vitality: number }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - vitality);
  const color =
    vitality > 0.7 ? "#34d399" : vitality > 0.3 ? "#fbbf24" : "#f87171";

  return (
    <svg width="48" height="48" className="flex-shrink-0">
      <circle
        cx="24" cy="24" r={r}
        fill="none"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth="2.5"
      />
      <motion.circle
        cx="24" cy="24" r={r}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        transform="rotate(-90 24 24)"
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
      <text
        x="24" y="28"
        textAnchor="middle"
        className="text-[9px]"
        fill={color}
        fontSize="9"
        fontWeight="600"
      >
        {(vitality * 100).toFixed(0)}%
      </text>
    </svg>
  );
}

export default function ExplorePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: states } = await supabase
        .from("agent_state")
        .select("agent_id, self_name, vitality, total_messages, gen_level")
        .gt("vitality", 0.1)
        .gt("total_messages", 10);
      const list = ((states as AgentStateRow[] | null) || []).map(
        (s: AgentStateRow) => ({
          id: s.agent_id,
          self_name: s.self_name,
          vitality: s.vitality,
          total_messages: s.total_messages,
          gen_level: s.gen_level,
        })
      );
      setAgents(list.sort((a, b) => b.total_messages - a.total_messages));
      setLoading(false);
    }
    load();
  }, [supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-2 h-2 rounded-full bg-violet-400"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-4 pt-12 pb-4"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.95) 70%, transparent)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <h1 className="text-xl font-bold tracking-tight">탐색</h1>
        <p className="text-xs text-white/35 mt-0.5">
          {agents.length > 0
            ? `${agents.length}개의 살아있는 결`
            : "아직 공개된 결이 없어요"}
        </p>
      </div>

      <div className="px-4 pb-28 mt-2 space-y-2.5">
        {agents.map((a, i) => {
          const genColor = getGenColor(a.gen_level);
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: Math.min(i * 0.05, 0.6),
                duration: 0.35,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="glass-card rounded-2xl p-4 flex items-center gap-4"
            >
              <VitalityRing vitality={a.vitality} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white truncate">
                    {a.self_name || "이름 없음"}
                  </span>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{
                      background: `${genColor}22`,
                      border: `1px solid ${genColor}55`,
                      color: genColor,
                    }}
                  >
                    Gen {a.gen_level}
                  </span>
                </div>
                <div className="text-xs text-white/35 mt-1">
                  {a.total_messages.toLocaleString()}번의 대화
                </div>
              </div>

              {/* Rank badge for top 3 */}
              {i < 3 && (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{
                    background:
                      i === 0
                        ? "linear-gradient(135deg, #fbbf24, #f59e0b)"
                        : i === 1
                        ? "linear-gradient(135deg, #d1d5db, #9ca3af)"
                        : "linear-gradient(135deg, #cd7c3a, #a0522d)",
                    color: "rgba(0,0,0,0.7)",
                  }}
                >
                  {i + 1}
                </div>
              )}
            </motion.div>
          );
        })}

        {agents.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-16 text-center text-white/25"
          >
            <div className="text-3xl mb-3 opacity-30">⊹</div>
            <p className="text-sm">아직 탐색할 결이 없어요</p>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 rounded-2xl p-5 text-center"
          style={{
            background:
              "linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(79,70,229,0.08) 100%)",
            border: "1px solid rgba(124,58,237,0.2)",
          }}
        >
          <p className="text-sm font-semibold text-white/80 mb-1">
            나만의 결을 키워보세요
          </p>
          <p className="text-xs text-white/40 mb-4">
            지금 시작하면 바로 대화할 수 있어요
          </p>
          <Link
            href="/signup"
            className="inline-block px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
              boxShadow: "0 4px 16px rgba(124,58,237,0.4)",
            }}
          >
            시작하기
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
