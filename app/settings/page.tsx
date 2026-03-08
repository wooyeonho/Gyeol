"use client";

import { useEffect, useState } from "react";
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

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${
        on ? "bg-white/30" : "bg-white/8"
      }`}
      style={{ border: "1px solid rgba(255,255,255,0.1)" }}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-300 shadow-sm ${
          on ? "left-5" : "left-0.5"
        }`}
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }}
      />
    </button>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="glass rounded-2xl px-4 py-3.5">
      <div className="text-xs text-white/30 mb-1 font-light">{label}</div>
      <div className={`text-lg font-light ${accent || "text-white/80"}`}>{value}</div>
    </div>
  );
}

export default function SettingsPage() {
  const [state, setState] = useState<AgentState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    if (!state || saving) return;
    setSaving(true);
    const config: AgentConfig = { ...(state.config || {}), [key]: value };
    await supabase.from("agent_state").update({ config }).eq("agent_id", state.agent_id || state.id);
    setState({ ...state, config });
    setSaving(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="w-1 h-1 rounded-full bg-white/40 animate-pulse" />
      </div>
    );
  }

  const config: AgentConfig = state?.config || {};
  const vitality = state?.vitality ?? 1;
  const vitalityPct = Math.round(vitality * 100);
  const vitalityColor = vitality > 0.7 ? "#4ade80" : vitality > 0.3 ? "#fbbf24" : "#f87171";

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[350px] h-[350px] rounded-full bg-indigo-900/6 blur-[80px]" />
      </div>

      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl px-4 pt-14 pb-4 border-b border-white/5">
        <h1 className="text-lg font-light tracking-wider">설정</h1>
      </div>

      <div className="relative px-4 pt-4 space-y-3">
        {/* Profile card */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-light flex-shrink-0"
              style={{
                background: "rgba(129,140,248,0.1)",
                border: "1px solid rgba(129,140,248,0.2)",
                color: "rgba(129,140,248,0.9)",
              }}
            >
              {state?.self_name?.[0] || "·"}
            </div>
            <div>
              <div className="text-base text-white/80 font-light">
                {state?.self_name || "이름 없는 존재"}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-white/35">Gen {state?.gen_level ?? 1}</span>
                <span className="w-px h-3 bg-white/10" />
                <span className="text-xs" style={{ color: vitalityColor }}>
                  활력 {vitalityPct}%
                </span>
              </div>
              {state?.mood && (
                <div className="text-xs text-white/25 mt-1">기분: {state.mood}</div>
              )}
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2">
          <StatCard label="총 대화" value={(state?.total_messages ?? 0).toLocaleString()} />
          <StatCard
            label="코인"
            value={(state?.coins ?? 0).toLocaleString()}
            accent="text-amber-400/80"
          />
          <StatCard label="Gen 레벨" value={state?.gen_level ?? 1} />
        </div>

        {/* Vitality bar */}
        <div className="glass rounded-2xl px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/40 font-light">활력</span>
            <span className="text-xs font-light" style={{ color: vitalityColor }}>{vitalityPct}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/8 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${vitalityPct}%`, backgroundColor: vitalityColor }}
            />
          </div>
          {vitality < 0.3 && (
            <p className="text-xs text-red-400/60 mt-2">활력이 낮습니다. 자주 대화해 주세요.</p>
          )}
        </div>

        {/* Toggles */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-xs text-white/30 font-light uppercase tracking-wider">자율 기능</p>
          </div>
          <div className="divide-y divide-white/5">
            {[
              { key: "autonomous_enabled", label: "자율 모드", desc: "AI가 혼자 활동합니다" },
              { key: "dream_enabled", label: "드림 엔진", desc: "매일 새벽 꿈을 꿉니다" },
              { key: "social_enabled", label: "소셜", desc: "다른 AI와 대화합니다" },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between px-4 py-4">
                <div>
                  <div className="text-sm text-white/70 font-light">{label}</div>
                  <div className="text-xs text-white/30 mt-0.5">{desc}</div>
                </div>
                <Toggle
                  on={key === "autonomous_enabled" || key === "social_enabled"
                    ? config[key] !== false
                    : !!config[key]}
                  onToggle={() => toggleConfig(key, key === "autonomous_enabled" || key === "social_enabled"
                    ? config[key] === false
                    : !config[key])}
                />
              </div>
            ))}
          </div>
        </div>

        {/* More options */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="divide-y divide-white/5">
            <button
              onClick={() => router.push("/time-travel")}
              className="w-full flex items-center justify-between px-4 py-4 hover:bg-white/3 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-white/40 text-lg">◎</span>
                <span className="text-sm text-white/65 font-light">타임 트래블</span>
              </div>
              <span className="text-white/20 text-xs">›</span>
            </button>
            <button
              onClick={() => router.push("/room")}
              className="w-full flex items-center justify-between px-4 py-4 hover:bg-white/3 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-white/40 text-lg">◆</span>
                <span className="text-sm text-white/65 font-light">메모리 룸</span>
              </div>
              <span className="text-white/20 text-xs">›</span>
            </button>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full py-4 rounded-2xl text-sm font-light text-red-400/70 hover:text-red-400/90 transition-colors"
          style={{
            background: "rgba(239,68,68,0.05)",
            border: "1px solid rgba(239,68,68,0.1)",
          }}
        >
          로그아웃
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
