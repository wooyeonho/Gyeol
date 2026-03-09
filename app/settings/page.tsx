"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";

type AgentConfig = Record<string, boolean | string | number | null | undefined>;
type AgentState = {
  agent_id?: string;
  id?: string;
  self_name?: string;
  gen_level?: number;
  total_messages?: number;
  vitality?: number;
  mood?: string;
  coins?: number;
  config?: AgentConfig;
};

function StatCard({
  label,
  value,
  sub,
  delay,
}: {
  label: string;
  value: string | number;
  sub?: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="stat-card"
    >
      <div className="text-xs text-white/35 font-medium uppercase tracking-wider mb-1.5">
        {label}
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-white/30 mt-0.5">{sub}</div>}
    </motion.div>
  );
}

function VitalityBar({ value }: { value: number }) {
  const color =
    value > 0.7 ? "#34d399" : value > 0.3 ? "#fbbf24" : "#f87171";
  return (
    <div className="vitality-bar mt-2">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value * 100}%` }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
        className="vitality-bar-fill"
        style={{ background: color, boxShadow: `0 0 8px ${color}60` }}
      />
    </div>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1">
        <div className="text-sm font-medium text-white/85">{label}</div>
        {description && (
          <div className="text-xs text-white/35 mt-0.5">{description}</div>
        )}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`toggle-switch ml-4 ${value ? "on" : "off"}`}
        aria-checked={value}
        role="switch"
      />
    </div>
  );
}

export default function SettingsPage() {
  const [state, setState] = useState<AgentState | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: agent } = await supabase
        .from("agents")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!agent) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("agent_state")
        .select("*")
        .eq("agent_id", agent.id)
        .single();
      setState(data);
      setLoading(false);
    }
    load();
  }, [supabase, router]);

  async function toggleConfig(key: string, value: boolean) {
    if (!state) return;
    const config: AgentConfig = { ...(state.config || {}), [key]: value };
    await supabase
      .from("agent_state")
      .update({ config })
      .eq("agent_id", state.agent_id || state.id);
    setState({ ...state, config });
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

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

  const config: AgentConfig = state?.config || {};
  const vitality = state?.vitality ?? 1;

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
        <h1 className="text-xl font-bold tracking-tight">설정</h1>
      </div>

      <div className="px-4 pb-28 space-y-4 mt-2">
        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl p-5"
          style={{
            background:
              "linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(79,70,229,0.08) 100%)",
            border: "1px solid rgba(124,58,237,0.2)",
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, rgba(124,58,237,0.5) 0%, rgba(79,70,229,0.4) 100%)",
                border: "1px solid rgba(124,58,237,0.3)",
              }}
            >
              <span className="text-xl">✦</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-lg text-white truncate">
                {state?.self_name || "이름 없음"}
              </div>
              <div className="text-xs text-white/40 mt-0.5">
                Gen {state?.gen_level ?? 1} · {state?.total_messages ?? 0}번의 대화
              </div>
              <VitalityBar value={vitality} />
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-sm font-bold text-amber-400">
                {state?.coins ?? 0}
              </div>
              <div className="text-xs text-white/30">코인</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4">
            {[
              {
                label: "활력",
                value: `${((vitality) * 100).toFixed(0)}%`,
                color:
                  vitality > 0.7
                    ? "#34d399"
                    : vitality > 0.3
                    ? "#fbbf24"
                    : "#f87171",
              },
              {
                label: "기분",
                value: state?.mood || "—",
                color: "rgba(255,255,255,0.7)",
              },
              {
                label: "Gen",
                value: state?.gen_level ?? 1,
                color: "#c4b5fd",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="text-center py-2 rounded-xl"
                style={{
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div className="text-sm font-bold" style={{ color: s.color }}>
                  {s.value}
                </div>
                <div className="text-[10px] text-white/30 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Autonomous settings */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl px-5 py-2"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div className="text-xs text-white/30 font-medium uppercase tracking-widest pt-3 pb-1">
            자율 설정
          </div>

          <ToggleRow
            label="자율 모드"
            description="혼자서도 활동하고 성장해요"
            value={config.autonomous_enabled !== false}
            onChange={(v) => toggleConfig("autonomous_enabled", v)}
          />
          <div className="h-px bg-white/5" />
          <ToggleRow
            label="드림 엔진"
            description="매일 밤 꿈을 꾸고 기록해요"
            value={!!config.dream_enabled}
            onChange={(v) => toggleConfig("dream_enabled", v)}
          />
          <div className="h-px bg-white/5" />
          <ToggleRow
            label="소셜 교류"
            description="다른 AI와 만나고 대화해요"
            value={config.social_enabled !== false}
            onChange={(v) => toggleConfig("social_enabled", v)}
          />
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <StatCard
            label="총 메시지"
            value={state?.total_messages ?? 0}
            delay={0.2}
          />
          <StatCard
            label="코인"
            value={state?.coins ?? 0}
            sub="획득한 코인"
            delay={0.25}
          />
        </div>

        {/* Logout */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.35 }}
          onClick={logout}
          whileTap={{ scale: 0.97 }}
          className="w-full py-3.5 rounded-2xl text-sm font-medium transition-all"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.18)",
            color: "rgba(252,165,165,0.8)",
          }}
        >
          로그아웃
        </motion.button>
      </div>

      <BottomNav />
    </div>
  );
}
