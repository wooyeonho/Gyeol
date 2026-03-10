"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";

type OpsData = {
  checked_at: string;
  env_status: Array<{ key: string; configured: boolean }>;
  autonomy_health: { score: number; tier: "healthy" | "warning" | "critical"; reasons: string[] };
  stale_counts: {
    stale_heartbeat_6h: number;
    stale_dream_24h: number;
    echo_count: number;
    stale_cron_jobs_24h: number;
  };
  alert_summary_24h: {
    total: number;
    info: number;
    warning: number;
    critical: number;
  };
  recent_alerts: Array<{
    level: string;
    source: string;
    code: string;
    message: string;
    created_at: string;
  }>;
  recommendations: string[];
};

type ProductOpsData = {
  checked_at: string;
  activation_7d: {
    entry_completions: number;
    first_messages: number;
    rate: number;
  };
  auth_funnel_7d: {
    signup_started: number;
    signup_completed: number;
    login_started: number;
    login_completed: number;
    guest_started: number;
    guest_completed: number;
    auth_failed: number;
  };
  engagement_7d: {
    activity_opened: number;
    album_opened: number;
    explore_opened: number;
    mission_created: number;
  };
  value_loop_24h: {
    page_views: number;
    messages: number;
    first_messages: number;
    plans_opened: number;
    upgrade_clicks: number;
  };
  onboarding_experiment_7d: Array<{
    variant: string;
    assigned: number;
    first_messages: number;
    conversion_rate: number;
  }>;
  top_paths_7d: Array<{ path: string; count: number }>;
  recent_events: Array<{ created_at: string; event_name: string; path: string | null }>;
  upgrade_interest_7d: {
    plans_opened: number;
    upgrade_clicks: number;
    click_rate: number;
  };
};

export default function OpsPage() {
  const [data, setData] = useState<OpsData | null>(null);
  const [productData, setProductData] = useState<ProductOpsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/ops/readiness").then(async (res) => {
        if (!res.ok) {
          if (res.status === 401) throw new Error("로그인이 필요합니다.");
          throw new Error("운영 상태를 불러오지 못했습니다.");
        }
        return res.json();
      }),
      fetch("/api/ops/product").then(async (res) => {
        if (!res.ok) {
          if (res.status === 401) throw new Error("로그인이 필요합니다.");
          throw new Error("제품 분석 지표를 불러오지 못했습니다.");
        }
        return res.json();
      }),
    ])
      .then(([readiness, product]) => {
        if (!cancelled) {
          setData(readiness as OpsData);
          setProductData(product as ProductOpsData);
        }
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white pt-16 pb-28 px-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <header>
          <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-200/70">OPERATIONS</p>
          <h1 className="text-2xl font-semibold">운영 센터</h1>
          <p className="text-sm text-white/60 mt-1">
            이 화면은 일반 사용 흐름보다 뒤에 놓이는 운영 판단용 화면입니다. 24시간 자율활동 상태와 운영 준비도를
            확인합니다.
          </p>
        </header>

        {loading && <div className="text-sm text-white/60">불러오는 중...</div>}
        {error && <div className="rounded-xl bg-red-500/10 border border-red-400/30 px-3 py-2 text-sm text-red-200">{error}</div>}

        {!loading && data && (
          <>
            <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/50 uppercase tracking-wider">Autonomy Health Score</p>
              <div className="mt-2 flex items-end justify-between">
                <p className="text-4xl font-semibold">{data.autonomy_health.score}</p>
                <span
                  className={`text-xs rounded-full px-2 py-1 border ${
                    data.autonomy_health.tier === "healthy"
                      ? "border-emerald-300/40 text-emerald-200 bg-emerald-500/10"
                      : data.autonomy_health.tier === "warning"
                        ? "border-amber-300/40 text-amber-200 bg-amber-500/10"
                        : "border-red-300/40 text-red-200 bg-red-500/10"
                  }`}
                >
                  {data.autonomy_health.tier}
                </span>
              </div>
              {data.autonomy_health.reasons.length > 0 && (
                <ul className="mt-3 list-disc pl-5 text-sm text-white/75 space-y-1">
                  {data.autonomy_health.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              )}
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-white/50">Stale heartbeat (6h)</p>
                <p className="text-2xl font-semibold">{data.stale_counts.stale_heartbeat_6h}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-white/50">Stale dream (24h)</p>
                <p className="text-2xl font-semibold">{data.stale_counts.stale_dream_24h}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-white/50">Echo count</p>
                <p className="text-2xl font-semibold">{data.stale_counts.echo_count}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-white/50">Stale cron jobs</p>
                <p className="text-2xl font-semibold">{data.stale_counts.stale_cron_jobs_24h}</p>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/50 uppercase tracking-wider mb-3">최근 24시간 경보 추이</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg border border-white/10 px-3 py-2">
                  <p className="text-xs text-white/50">Total</p>
                  <p className="text-xl font-semibold">{data.alert_summary_24h.total}</p>
                </div>
                <div className="rounded-lg border border-white/10 px-3 py-2">
                  <p className="text-xs text-white/50">Info</p>
                  <p className="text-xl font-semibold text-blue-300">{data.alert_summary_24h.info}</p>
                </div>
                <div className="rounded-lg border border-white/10 px-3 py-2">
                  <p className="text-xs text-white/50">Warning</p>
                  <p className="text-xl font-semibold text-amber-300">{data.alert_summary_24h.warning}</p>
                </div>
                <div className="rounded-lg border border-white/10 px-3 py-2">
                  <p className="text-xs text-white/50">Critical</p>
                  <p className="text-xl font-semibold text-red-300">{data.alert_summary_24h.critical}</p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/50 uppercase tracking-wider mb-2">환경변수 준비 상태</p>
              <div className="space-y-2 text-sm">
                {data.env_status.map((env) => (
                  <div key={env.key} className="flex items-center justify-between">
                    <span>{env.key}</span>
                    <span className={env.configured ? "text-emerald-300" : "text-amber-300"}>
                      {env.configured ? "설정됨" : "미설정"}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/50 uppercase tracking-wider mb-2">운영 권장 액션</p>
              {data.recommendations.length > 0 ? (
                <ul className="list-disc pl-5 text-sm text-white/80 space-y-1">
                  {data.recommendations.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-emerald-300">현재 권장 경고가 없습니다.</p>
              )}
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-white/50 uppercase tracking-wider">최근 시스템 경보</p>
                <span className="text-xs text-white/40">{new Date(data.checked_at).toLocaleString("ko-KR")}</span>
              </div>
              {data.recent_alerts.length === 0 ? (
                <p className="text-sm text-white/60">경보가 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {data.recent_alerts.map((alert) => (
                    <div key={`${alert.code}-${alert.created_at}`} className="rounded-lg border border-white/10 px-3 py-2">
                      <div className="flex items-center justify-between text-xs text-white/60">
                        <span>{alert.source}</span>
                        <span>{new Date(alert.created_at).toLocaleString("ko-KR")}</span>
                      </div>
                      <p className="text-sm mt-1">
                        <span className="text-white/50 mr-2">[{alert.level}]</span>
                        {alert.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {productData && (
              <>
                <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-white/50 uppercase tracking-wider">제품 활성화 (7일)</p>
                    <span className="text-xs text-white/40">{new Date(productData.checked_at).toLocaleString("ko-KR")}</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                      <p className="text-xs text-white/50">진입 완료</p>
                      <p className="text-2xl font-semibold">{productData.activation_7d.entry_completions}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                      <p className="text-xs text-white/50">첫 메시지</p>
                      <p className="text-2xl font-semibold">{productData.activation_7d.first_messages}</p>
                    </div>
                    <div className="rounded-xl border border-cyan-300/20 bg-cyan-400/10 p-3">
                      <p className="text-xs text-cyan-100/70">활성화 비율</p>
                      <p className="text-2xl font-semibold">{Math.round(productData.activation_7d.rate * 100)}%</p>
                    </div>
                  </div>
                </section>

                <section className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-white/50 uppercase tracking-wider mb-3">인증 퍼널 (7일)</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between"><span>회원가입 시작</span><span>{productData.auth_funnel_7d.signup_started}</span></div>
                      <div className="flex items-center justify-between"><span>회원가입 완료</span><span>{productData.auth_funnel_7d.signup_completed}</span></div>
                      <div className="flex items-center justify-between"><span>로그인 시작</span><span>{productData.auth_funnel_7d.login_started}</span></div>
                      <div className="flex items-center justify-between"><span>로그인 완료</span><span>{productData.auth_funnel_7d.login_completed}</span></div>
                      <div className="flex items-center justify-between"><span>게스트 시작</span><span>{productData.auth_funnel_7d.guest_started}</span></div>
                      <div className="flex items-center justify-between"><span>게스트 완료</span><span>{productData.auth_funnel_7d.guest_completed}</span></div>
                      <div className="flex items-center justify-between"><span>인증 실패</span><span>{productData.auth_funnel_7d.auth_failed}</span></div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-white/50 uppercase tracking-wider mb-3">참여 신호 (7일)</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between"><span>활동 열기</span><span>{productData.engagement_7d.activity_opened}</span></div>
                      <div className="flex items-center justify-between"><span>앨범 열기</span><span>{productData.engagement_7d.album_opened}</span></div>
                      <div className="flex items-center justify-between"><span>탐험 열기</span><span>{productData.engagement_7d.explore_opened}</span></div>
                      <div className="flex items-center justify-between"><span>미션 생성</span><span>{productData.engagement_7d.mission_created}</span></div>
                    </div>
                  </div>
                </section>

                <section className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-white/50 uppercase tracking-wider mb-3">가치 루프 (24시간)</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between"><span>페이지 뷰</span><span>{productData.value_loop_24h.page_views}</span></div>
                      <div className="flex items-center justify-between"><span>메시지 전송</span><span>{productData.value_loop_24h.messages}</span></div>
                      <div className="flex items-center justify-between"><span>첫 메시지</span><span>{productData.value_loop_24h.first_messages}</span></div>
                      <div className="flex items-center justify-between"><span>플랜 열기</span><span>{productData.value_loop_24h.plans_opened}</span></div>
                      <div className="flex items-center justify-between"><span>업그레이드 클릭</span><span>{productData.value_loop_24h.upgrade_clicks}</span></div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-white/50 uppercase tracking-wider mb-3">업그레이드 관심 (7일)</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between"><span>플랜 페이지 열기</span><span>{productData.upgrade_interest_7d.plans_opened}</span></div>
                      <div className="flex items-center justify-between"><span>업그레이드 CTA 클릭</span><span>{productData.upgrade_interest_7d.upgrade_clicks}</span></div>
                      <div className="flex items-center justify-between"><span>클릭 비율</span><span>{Math.round(productData.upgrade_interest_7d.click_rate * 100)}%</span></div>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-3">온보딩 실험 (7일)</p>
                  <div className="space-y-2">
                    {productData.onboarding_experiment_7d.map((item) => (
                      <div key={item.variant} className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] gap-2 rounded-xl bg-black/25 p-3 text-sm">
                        <span>{item.variant}</span>
                        <span className="text-white/70">배정 {item.assigned}</span>
                        <span className="text-white/70">첫 메시지 {item.first_messages}</span>
                        <span className="text-cyan-200">{Math.round(item.conversion_rate * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-3">주요 경로 (7일)</p>
                  <div className="space-y-2">
                    {productData.top_paths_7d.length === 0 ? (
                      <p className="text-sm text-white/55">아직 집계된 페이지 뷰가 없습니다.</p>
                    ) : (
                      productData.top_paths_7d.map((item) => (
                        <div key={item.path} className="flex items-center justify-between text-sm">
                          <span>{item.path}</span>
                          <span className="text-white/70">{item.count}</span>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </>
            )}
            <div className="text-center">
              <Link href="/dashboard" className="text-sm text-white/60 hover:text-white/80">
                대시보드로 돌아가기
              </Link>
            </div>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
