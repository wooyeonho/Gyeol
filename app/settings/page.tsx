"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { motion } from "framer-motion";

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

function StatCard({ label, value, icon, delay = 0 }: {
  label: string; value: string | number; icon: React.ReactNode; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="glass rounded-2xl p-4 gradient-border"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-accent-light">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-white/40 font-medium">{label}</div>
          <div className="text-lg font-semibold text-white truncate">{value}</div>
        </div>
      </div>
    </motion.div>
  );
}

function Toggle({ enabled, onChange, label }: {
  enabled: boolean; onChange: () => void; label: string;
}) {
  return (
    <div className="flex justify-between items-center py-3">
      <span className="text-sm text-white/80">{label}</span>
      <button
        onClick={onChange}
        className={`
          relative w-11 h-6 rounded-full transition-all duration-300
          ${enabled ? "bg-accent" : "bg-white/10"}
        `}
      >
        <motion.div
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-lg"
          animate={{ left: enabled ? "22px" : "2px" }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  );
}

function VitalityBar({ vitality }: { vitality: number }) {
  const percent = Math.round(vitality * 100);
  const color =
    vitality > 0.7 ? "from-emerald-400 to-green-500" :
    vitality > 0.3 ? "from-amber-400 to-yellow-500" :
    "from-red-400 to-rose-500";

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs text-white/40">활력</span>
        <span className="text-xs font-medium text-white/60">{percent}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </div>
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: agent } = await supabase.from("agents").select("id").eq("user_id", user.id).single();
      if (!agent) { setLoading(false); return; }

      const { data } = await supabase.from("agent_state").select("*").eq("agent_id", agent.id).single();
      setState(data);
      setLoading(false);
    }
    load();
  }, [supabase, router]);

  async function toggleConfig(key: string, value: boolean) {
    if (!state) return;
    const config: AgentConfig = { ...(state.config || {}), [key]: value };
    await supabase.from("agent_state").update({ config }).eq("agent_id", state.agent_id || state.id);
    setState({ ...state, config });
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-black flex items-center justify-center">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/60" style={{ animation: "dot-pulse 1.2s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  const config: AgentConfig = state?.config || {};
  const vitality = typeof state?.vitality === "number" ? state.vitality : 1;

  return (
    <div className="min-h-dvh bg-black text-white pb-28 px-4">
      <div className="max-w-lg mx-auto pt-16">
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold tracking-tight">설정</h1>
          <p className="text-sm text-white/40 mt-1">에이전트 상태 및 환경 설정</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-5 mb-6 gradient-border"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/30 to-accent-light/20 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">{(state?.self_name || "?")[0]}</span>
            </div>
            <div>
              <div className="text-lg font-semibold">{state?.self_name || "이름 없음"}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-medium text-accent-light">Gen {state?.gen_level ?? 1}</span>
                {state?.mood && (
                  <>
                    <span className="text-white/20">·</span>
                    <span className="text-xs text-white/40 italic">{state.mood}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <VitalityBar vitality={vitality} />
        </motion.div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatCard
            label="총 메시지"
            value={state?.total_messages ?? 0}
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
            delay={0.15}
          />
          <StatCard
            label="코인"
            value={state?.coins ?? 0}
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M8 10h8M8 14h8"/></svg>}
            delay={0.2}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass rounded-2xl p-5 mb-6"
        >
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-2">기능</h2>
          <div className="divide-y divide-white/5">
            <Toggle
              label="자율 모드"
              enabled={config.autonomous_enabled !== false}
              onChange={() => toggleConfig("autonomous_enabled", config.autonomous_enabled === false)}
            />
            <Toggle
              label="드림 엔진"
              enabled={!!config.dream_enabled}
              onChange={() => toggleConfig("dream_enabled", !config.dream_enabled)}
            />
            <Toggle
              label="소셜"
              enabled={config.social_enabled !== false}
              onChange={() => toggleConfig("social_enabled", config.social_enabled === false)}
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <button
            onClick={logout}
            className="w-full py-3.5 rounded-2xl glass text-red-400 text-sm font-medium transition-all duration-200 hover:bg-red-500/10 active:scale-[0.98]"
          >
            로그아웃
          </button>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}
