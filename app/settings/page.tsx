"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { FEATURE_FLAG } from "@/lib/experiments/catalog";
import { useFeatureFlag } from "@/lib/experiments/client";
import type { EntitlementKey, PlanDefinition } from "@/lib/billing/catalog";

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

type BillingData = {
  entitlements: Record<EntitlementKey, boolean>;
  plan: PlanDefinition;
  subscription: {
    cancel_at_period_end: boolean;
    current_period_end: string | null;
    provider: string | null;
    status: string;
  };
};

export default function SettingsPage() {
  const [state, setState] = useState<AgentState | null>(null);
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const showPlansSurface = useFeatureFlag(FEATURE_FLAG.plansSurface);

  useEffect(() => {
    async function load() {
      try {
        const [settingsRes, billingRes] = await Promise.all([
          fetch("/api/settings"),
          fetch("/api/billing/me"),
        ]);
        if (settingsRes.status === 401) {
          router.push("/login");
          return;
        }
        if (!settingsRes.ok) {
          setError("설정 정보를 불러오지 못했습니다.");
          return;
        }
        const json = await settingsRes.json().catch(() => ({ state: null }));
        setState(json.state ?? null);
        if (billingRes.ok) {
          const billingJson = await billingRes.json().catch(() => null);
          setBilling((billingJson as BillingData | null) ?? null);
        }
      } catch {
        setError("설정 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [router]);

  async function toggleConfig(key: string, value: boolean) {
    if (!state) return;
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    });
    if (!res.ok) {
      setError("설정 변경에 실패했습니다.");
      return;
    }
    const config: AgentConfig = { ...(state.config || {}), [key]: value };
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
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      </div>
    );
  }

  const config: AgentConfig = state?.config || {};

  return (
    <div className="min-h-screen bg-black text-white pt-20 pb-24 px-4">
      <h1 className="text-xl font-semibold mb-4">설정</h1>
      {error && <div className="mb-3 rounded-lg bg-red-500/10 border border-red-400/30 px-3 py-2 text-sm text-red-200">{error}</div>}
      <div className="space-y-4">
        <div className="bg-white/5 rounded-xl p-4">
          <div className="text-sm text-white/60">이름</div>
          <div>{state?.self_name || "—"}</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4">
          <div className="text-sm text-white/60">Gen 레벨</div>
          <div>{state?.gen_level ?? 1}</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4">
          <div className="text-sm text-white/60">총 메시지</div>
          <div>{state?.total_messages ?? 0}</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4">
          <div className="text-sm text-white/60">활력</div>
          <div>{((state?.vitality ?? 1) * 100).toFixed(0)}%</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4">
          <div className="text-sm text-white/60">기분</div>
          <div>{state?.mood || "—"}</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4">
          <div className="text-sm text-white/60">코인</div>
          <div>{state?.coins ?? 0}</div>
        </div>

        {showPlansSurface && (
          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/[0.08] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-cyan-100/80">현재 플랜</div>
                <div className="mt-1 text-lg font-semibold">{billing?.plan.tier.toUpperCase() ?? "FREE"}</div>
                <p className="mt-2 text-sm leading-6 text-white/70">
                  {billing?.plan.description ??
                    "코어 대화와 활동, 앨범은 무료로 열어두고 더 깊은 회고, 자율성, 생성/연동 가치는 플랜에서 확장됩니다."}
                </p>
                {billing?.subscription.current_period_end && (
                  <p className="mt-2 text-xs text-white/50">
                    다음 갱신 기준: {new Date(billing.subscription.current_period_end).toLocaleDateString("ko-KR")}
                  </p>
                )}
              </div>
              <Link
                href="/plans"
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15"
              >
                플랜 보기
              </Link>
            </div>
          </div>
        )}

        {billing && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-white/60">활성 권한</div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl bg-black/25 p-3">
                <p className="text-xs text-white/45">고급 리캡</p>
                <p className="mt-1 text-sm">{billing.entitlements.advanced_recaps ? "사용 가능" : "잠김"}</p>
              </div>
              <div className="rounded-xl bg-black/25 p-3">
                <p className="text-xs text-white/45">장기 히스토리</p>
                <p className="mt-1 text-sm">{billing.entitlements.long_term_history ? "사용 가능" : "잠김"}</p>
              </div>
              <div className="rounded-xl bg-black/25 p-3">
                <p className="text-xs text-white/45">멀티채널</p>
                <p className="mt-1 text-sm">{billing.entitlements.multichannel ? "사용 가능" : "잠김"}</p>
              </div>
              <div className="rounded-xl bg-black/25 p-3">
                <p className="text-xs text-white/45">고급 생성</p>
                <p className="mt-1 text-sm">{billing.entitlements.premium_generation ? "사용 가능" : "잠김"}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white/5 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span>자율 모드</span>
            <button
              onClick={() => toggleConfig("autonomous_enabled", !config.autonomous_enabled)}
              className={`px-3 py-1 rounded ${config.autonomous_enabled !== false ? "bg-green-500/30" : "bg-white/10"}`}
            >
              {config.autonomous_enabled !== false ? "ON" : "OFF"}
            </button>
          </div>
          <div className="flex justify-between items-center">
            <span>드림 엔진</span>
            <button
              onClick={() => toggleConfig("dream_enabled", !config.dream_enabled)}
              className={`px-3 py-1 rounded ${config.dream_enabled ? "bg-green-500/30" : "bg-white/10"}`}
            >
              {config.dream_enabled ? "ON" : "OFF"}
            </button>
          </div>
          <div className="flex justify-between items-center">
            <span>소셜</span>
            <button
              onClick={() => toggleConfig("social_enabled", !config.social_enabled)}
              className={`px-3 py-1 rounded ${config.social_enabled !== false ? "bg-green-500/30" : "bg-white/10"}`}
            >
              {config.social_enabled !== false ? "ON" : "OFF"}
            </button>
          </div>
        </div>

        <button onClick={logout} className="w-full py-3 rounded-xl bg-red-500/20 text-red-400">
          로그아웃
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
