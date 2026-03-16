"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { formatLocalizedDateTime } from "@/lib/i18n/format";
import { useTranslations } from "@/components/i18n-provider";

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

type SocialOpsData = {
  checked_at: string;
  queue: Array<{
    post_id: string;
    content: string;
    topic: string | null;
    moderation_status: string;
    visibility: string;
    created_at: string;
    report_count: number;
    latest_reported_at: string;
    reports: Array<{
      id: string;
      reason: string;
      detail: string | null;
      status: string;
      created_at: string;
      reporter_name: string | null;
    }>;
  }>;
};

export default function OpsPage() {
  const { locale, t } = useTranslations();
  const [data, setData] = useState<OpsData | null>(null);
  const [productData, setProductData] = useState<ProductOpsData | null>(null);
  const [socialData, setSocialData] = useState<SocialOpsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moderationBusyId, setModerationBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/ops/readiness").then(async (res) => {
        if (!res.ok) {
          if (res.status === 401) throw new Error(t("ops.authRequired"));
          if (res.status === 403) throw new Error(t("ops.adminOnly"));
          throw new Error(t("ops.readinessLoadError"));
        }
        return res.json();
      }),
      fetch("/api/ops/product").then(async (res) => {
        if (!res.ok) {
          if (res.status === 401) throw new Error(t("ops.authRequired"));
          if (res.status === 403) throw new Error(t("ops.adminOnly"));
          throw new Error(t("ops.productLoadError"));
        }
        return res.json();
      }),
      fetch("/api/ops/social").then(async (res) => {
        if (!res.ok) {
          if (res.status === 401) throw new Error(t("ops.authRequired"));
          if (res.status === 403) throw new Error(t("ops.adminOnly"));
          throw new Error(t("ops.productLoadError"));
        }
        return res.json();
      }),
    ])
      .then(([readiness, product, social]) => {
        if (!cancelled) {
          setData(readiness as OpsData);
          setProductData(product as ProductOpsData);
          setSocialData(social as SocialOpsData);
        }
      })
      .catch((nextError: Error) => {
        if (!cancelled) setError(nextError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  async function handleModeration(postId: string, action: "approve" | "dismiss" | "block") {
    setModerationBusyId(postId);
    try {
      const res = await fetch("/api/ops/social", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: postId, action }),
      });
      if (!res.ok) {
        throw new Error(t("ops.productLoadError"));
      }
      setSocialData((prev) =>
        prev
          ? {
              ...prev,
              queue: prev.queue.filter((item) => item.post_id !== postId),
            }
          : prev,
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t("ops.productLoadError"));
    } finally {
      setModerationBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white pt-16 pb-28 px-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <header>
          <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-200/70">{t("ops.eyebrow")}</p>
          <h1 className="text-2xl font-semibold">{t("ops.title")}</h1>
          <p className="text-sm text-white/60 mt-1">{t("ops.subtitle")}</p>
        </header>

        {loading && <div className="text-sm text-white/60">{t("ops.loading")}</div>}
        {error && <div className="rounded-xl bg-red-500/10 border border-red-400/30 px-3 py-2 text-sm text-red-200">{error}</div>}

        {!loading && data && (
          <>
            <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/50 uppercase tracking-wider">{t("ops.autonomyHealthScore")}</p>
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
                  {t(`ops.${data.autonomy_health.tier}`)}
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
                <p className="text-xs text-white/50">{t("ops.staleHeartbeat")}</p>
                <p className="text-2xl font-semibold">{data.stale_counts.stale_heartbeat_6h}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-white/50">{t("ops.staleDream")}</p>
                <p className="text-2xl font-semibold">{data.stale_counts.stale_dream_24h}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-white/50">{t("ops.echoCount")}</p>
                <p className="text-2xl font-semibold">{data.stale_counts.echo_count}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-white/50">{t("ops.staleCronJobs")}</p>
                <p className="text-2xl font-semibold">{data.stale_counts.stale_cron_jobs_24h}</p>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/50 uppercase tracking-wider mb-3">{t("ops.alertTrend24h")}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg border border-white/10 px-3 py-2">
                  <p className="text-xs text-white/50">{t("ops.total")}</p>
                  <p className="text-xl font-semibold">{data.alert_summary_24h.total}</p>
                </div>
                <div className="rounded-lg border border-white/10 px-3 py-2">
                  <p className="text-xs text-white/50">{t("ops.info")}</p>
                  <p className="text-xl font-semibold text-blue-300">{data.alert_summary_24h.info}</p>
                </div>
                <div className="rounded-lg border border-white/10 px-3 py-2">
                  <p className="text-xs text-white/50">{t("ops.warning")}</p>
                  <p className="text-xl font-semibold text-amber-300">{data.alert_summary_24h.warning}</p>
                </div>
                <div className="rounded-lg border border-white/10 px-3 py-2">
                  <p className="text-xs text-white/50">{t("ops.critical")}</p>
                  <p className="text-xl font-semibold text-red-300">{data.alert_summary_24h.critical}</p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/50 uppercase tracking-wider mb-2">{t("ops.envStatus")}</p>
              <div className="space-y-2 text-sm">
                {data.env_status.map((env) => (
                  <div key={env.key} className="flex items-center justify-between">
                    <span>{env.key}</span>
                    <span className={env.configured ? "text-emerald-300" : "text-amber-300"}>
                      {env.configured ? t("ops.configured") : t("ops.notConfigured")}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/50 uppercase tracking-wider mb-2">{t("ops.recommendations")}</p>
              {data.recommendations.length > 0 ? (
                <ul className="list-disc pl-5 text-sm text-white/80 space-y-1">
                  {data.recommendations.map((recommendation) => (
                    <li key={recommendation}>{recommendation}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-emerald-300">{t("ops.noRecommendations")}</p>
              )}
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-white/50 uppercase tracking-wider">{t("ops.recentAlerts")}</p>
                <span className="text-xs text-white/40">{formatLocalizedDateTime(data.checked_at, locale)}</span>
              </div>
              {data.recent_alerts.length === 0 ? (
                <p className="text-sm text-white/60">{t("ops.noAlerts")}</p>
              ) : (
                <div className="space-y-2">
                  {data.recent_alerts.map((alert) => (
                    <div key={`${alert.code}-${alert.created_at}`} className="rounded-lg border border-white/10 px-3 py-2">
                      <div className="flex items-center justify-between text-xs text-white/60">
                        <span>{alert.source}</span>
                        <span>{formatLocalizedDateTime(alert.created_at, locale)}</span>
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
                    <p className="text-xs text-white/50 uppercase tracking-wider">{t("ops.productActivation7d")}</p>
                    <span className="text-xs text-white/40">{formatLocalizedDateTime(productData.checked_at, locale)}</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                      <p className="text-xs text-white/50">{t("ops.entryCompletions")}</p>
                      <p className="text-2xl font-semibold">{productData.activation_7d.entry_completions}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                      <p className="text-xs text-white/50">{t("ops.firstMessages")}</p>
                      <p className="text-2xl font-semibold">{productData.activation_7d.first_messages}</p>
                    </div>
                    <div className="rounded-xl border border-cyan-300/20 bg-cyan-400/10 p-3">
                      <p className="text-xs text-cyan-100/70">{t("ops.activationRate")}</p>
                      <p className="text-2xl font-semibold">{Math.round(productData.activation_7d.rate * 100)}%</p>
                    </div>
                  </div>
                </section>

                <section className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-white/50 uppercase tracking-wider mb-3">{t("ops.authFunnel7d")}</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between"><span>{t("ops.signupStarted")}</span><span>{productData.auth_funnel_7d.signup_started}</span></div>
                      <div className="flex items-center justify-between"><span>{t("ops.signupCompleted")}</span><span>{productData.auth_funnel_7d.signup_completed}</span></div>
                      <div className="flex items-center justify-between"><span>{t("ops.loginStarted")}</span><span>{productData.auth_funnel_7d.login_started}</span></div>
                      <div className="flex items-center justify-between"><span>{t("ops.loginCompleted")}</span><span>{productData.auth_funnel_7d.login_completed}</span></div>
                      <div className="flex items-center justify-between"><span>{t("ops.guestStarted")}</span><span>{productData.auth_funnel_7d.guest_started}</span></div>
                      <div className="flex items-center justify-between"><span>{t("ops.guestCompleted")}</span><span>{productData.auth_funnel_7d.guest_completed}</span></div>
                      <div className="flex items-center justify-between"><span>{t("ops.authFailed")}</span><span>{productData.auth_funnel_7d.auth_failed}</span></div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-white/50 uppercase tracking-wider mb-3">{t("ops.engagementSignals7d")}</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between"><span>{t("ops.activityOpened")}</span><span>{productData.engagement_7d.activity_opened}</span></div>
                      <div className="flex items-center justify-between"><span>{t("ops.albumOpened")}</span><span>{productData.engagement_7d.album_opened}</span></div>
                      <div className="flex items-center justify-between"><span>{t("ops.exploreOpened")}</span><span>{productData.engagement_7d.explore_opened}</span></div>
                      <div className="flex items-center justify-between"><span>{t("ops.missionCreated")}</span><span>{productData.engagement_7d.mission_created}</span></div>
                    </div>
                  </div>
                </section>

                <section className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-white/50 uppercase tracking-wider mb-3">{t("ops.valueLoop24h")}</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between"><span>{t("ops.pageViews")}</span><span>{productData.value_loop_24h.page_views}</span></div>
                      <div className="flex items-center justify-between"><span>{t("ops.messagesSent")}</span><span>{productData.value_loop_24h.messages}</span></div>
                      <div className="flex items-center justify-between"><span>{t("ops.firstMessage")}</span><span>{productData.value_loop_24h.first_messages}</span></div>
                      <div className="flex items-center justify-between"><span>{t("ops.plansOpened")}</span><span>{productData.value_loop_24h.plans_opened}</span></div>
                      <div className="flex items-center justify-between"><span>{t("ops.upgradeClicks")}</span><span>{productData.value_loop_24h.upgrade_clicks}</span></div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-white/50 uppercase tracking-wider mb-3">{t("ops.upgradeInterest7d")}</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between"><span>{t("ops.planPageOpened")}</span><span>{productData.upgrade_interest_7d.plans_opened}</span></div>
                      <div className="flex items-center justify-between"><span>{t("ops.upgradeCtaClicks")}</span><span>{productData.upgrade_interest_7d.upgrade_clicks}</span></div>
                      <div className="flex items-center justify-between"><span>{t("ops.clickRate")}</span><span>{Math.round(productData.upgrade_interest_7d.click_rate * 100)}%</span></div>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-3">{t("ops.onboardingExperiment7d")}</p>
                  <div className="space-y-2">
                    {productData.onboarding_experiment_7d.map((item) => (
                      <div key={item.variant} className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] gap-2 rounded-xl bg-black/25 p-3 text-sm">
                        <span>{item.variant}</span>
                        <span className="text-white/70">{t("ops.assigned")} {item.assigned}</span>
                        <span className="text-white/70">{t("ops.firstMessages")} {item.first_messages}</span>
                        <span className="text-cyan-200">{Math.round(item.conversion_rate * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-3">{t("ops.topPaths7d")}</p>
                  <div className="space-y-2">
                    {productData.top_paths_7d.length === 0 ? (
                      <p className="text-sm text-white/55">{t("ops.noPageViews")}</p>
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

            {socialData && (
              <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-white/50 uppercase tracking-wider">{t("ops.socialModeration")}</p>
                  <span className="text-xs text-white/40">
                    {formatLocalizedDateTime(socialData.checked_at, locale)}
                  </span>
                </div>
                {socialData.queue.length === 0 ? (
                  <p className="text-sm text-emerald-300">{t("ops.noSocialQueue")}</p>
                ) : (
                  <div className="space-y-3">
                    {socialData.queue.map((item) => (
                      <div key={item.post_id} className="rounded-xl border border-white/10 bg-black/25 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-white">{item.topic || t("socialPage.fallbackTopic")}</p>
                            <p className="mt-1 text-xs text-white/50">
                              {t("ops.reportCount").replace("{count}", String(item.report_count))} · {formatLocalizedDateTime(item.latest_reported_at, locale)}
                            </p>
                          </div>
                          <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2 py-1 text-xs text-amber-100/90">
                            {item.moderation_status}
                          </span>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-sm text-white/78">{item.content}</p>
                        <div className="mt-3 space-y-2">
                          {item.reports.map((report) => (
                            <div key={report.id} className="rounded-lg border border-white/10 px-3 py-2 text-sm">
                              <p className="text-white/82">{report.reason}</p>
                              {report.detail && <p className="mt-1 text-white/60">{report.detail}</p>}
                              <p className="mt-1 text-xs text-white/45">
                                {(report.reporter_name || "unknown")} · {formatLocalizedDateTime(report.created_at, locale)}
                              </p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={moderationBusyId === item.post_id}
                            onClick={() => void handleModeration(item.post_id, "approve")}
                            className="rounded-full border border-emerald-300/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 disabled:opacity-50"
                          >
                            {t("ops.approvePost")}
                          </button>
                          <button
                            type="button"
                            disabled={moderationBusyId === item.post_id}
                            onClick={() => void handleModeration(item.post_id, "dismiss")}
                            className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80 disabled:opacity-50"
                          >
                            {t("ops.dismissReport")}
                          </button>
                          <button
                            type="button"
                            disabled={moderationBusyId === item.post_id}
                            onClick={() => void handleModeration(item.post_id, "block")}
                            className="rounded-full border border-red-300/25 bg-red-500/10 px-3 py-2 text-sm text-red-200 disabled:opacity-50"
                          >
                            {t("ops.blockPost")}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
            <div className="text-center">
              <Link href="/dashboard" className="text-sm text-white/60 hover:text-white/80">
                {t("ops.backDashboard")}
              </Link>
            </div>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
