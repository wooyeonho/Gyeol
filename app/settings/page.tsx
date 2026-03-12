"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { useTranslations } from "@/components/i18n-provider";
import { getIntlLocale, type Locale } from "@/lib/i18n/config";

function InviteSection() {
  const { t } = useTranslations();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  async function loadInvite() {
    setLoading(true);
    try {
      const res = await fetch("/api/invite");
      const json = await res.json().catch(() => null);
      if (res.ok && json?.url) {
        setUrl(json.url);
      }
    } finally {
      setLoading(false);
    }
  }
  async function copyUrl() {
    if (!url) return;
    await navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="mt-2">
      {!url ? (
        <button
          type="button"
          onClick={() => void loadInvite()}
          disabled={loading}
          className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50"
        >
          {loading ? "..." : t("settings.createInvite")}
        </button>
      ) : (
        <div className="flex gap-2">
          <input
            readOnly
            value={url}
            className="flex-1 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white/80"
          />
          <button
            type="button"
            onClick={() => void copyUrl()}
            className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10"
          >
            {copied ? t("chat.copied") : t("chat.copy")}
          </button>
        </div>
      )}
    </div>
  );
}
import { FEATURE_FLAG } from "@/lib/experiments/catalog";
import { useFeatureFlag } from "@/lib/experiments/client";
import {
  formatPlanTierLabel,
  formatSubscriptionStatus,
  type EntitlementKey,
  type PlanDefinition,
} from "@/lib/billing/catalog";

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
  channels?: { telegram?: string; email?: boolean };
};

type BillingData = {
  entitlements: Record<EntitlementKey, boolean>;
  plan: PlanDefinition;
  subscription: {
    cancel_at_period_end: boolean;
    current_period_end: string | null;
    provider_customer_id?: string | null;
    provider: string | null;
    status: string;
  };
};

function formatLocaleDate(
  value: string | null | undefined,
  locale: "ko" | "en"
) {
  if (!value) return null;
  return new Date(value).toLocaleDateString(getIntlLocale(locale), {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function SettingsStatCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        accent
          ? "border-cyan-300/20 bg-cyan-400/[0.08] shadow-[0_0_50px_rgba(34,211,238,0.06)]"
          : "border-white/10 bg-white/[0.04]"
      }`}
    >
      <p className={`text-xs uppercase tracking-[0.2em] ${accent ? "text-cyan-100/75" : "text-white/45"}`}>{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-white">{value}</p>
    </div>
  );
}

function SettingsToggle({
  label,
  description,
  enabled,
  onToggle,
  locale,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  locale: "ko" | "en";
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-left transition-all duration-200 hover:border-cyan-300/20 hover:bg-black/35"
    >
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="mt-1 text-xs leading-5 text-white/50">{description}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-[11px] uppercase tracking-[0.18em] ${enabled ? "text-cyan-100/80" : "text-white/35"}`}>
          {enabled ? (locale === "en" ? "live" : "작동 중") : (locale === "en" ? "idle" : "대기")}
        </span>
        <span
          className={`relative h-7 w-12 rounded-full border transition-colors ${
            enabled
              ? "border-cyan-300/35 bg-cyan-400/30"
              : "border-white/15 bg-white/10"
          }`}
          aria-hidden="true"
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-[0_6px_20px_rgba(255,255,255,0.2)] transition-transform ${
              enabled ? "translate-x-6" : "translate-x-0.5"
            }`}
          />
        </span>
      </div>
    </button>
  );
}

export default function SettingsPage() {
  const { locale, t } = useTranslations();
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
          setError(t("settings.loadError"));
          return;
        }
        const json = await settingsRes.json().catch(() => ({ state: null }));
        setState(json.state ?? null);
        if (billingRes.ok) {
          const billingJson = await billingRes.json().catch(() => null);
          setBilling((billingJson as BillingData | null) ?? null);
        }
      } catch {
        setError(t("settings.loadError"));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [router, t]);

  async function toggleConfig(key: string, value: boolean) {
    if (!state) return;
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    });
    if (!res.ok) {
      setError(t("settings.configError"));
      return;
    }
    const config: AgentConfig = { ...(state.config || {}), [key]: value };
    setState({ ...state, config });
  }

  async function toggleRecapEmail(enabled: boolean) {
    if (!state) return;
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recap_email: enabled }),
    });
    if (!res.ok) {
      setError(t("settings.configError"));
      return;
    }
    const channels = { ...(state.channels || {}), email: enabled };
    setState({ ...state, channels });
  }

  async function handleLocaleChange(nextLocale: Locale) {
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferred_locale: nextLocale }),
    });
    if (!res.ok) {
      setError(t("settings.configError"));
      return;
    }
    if (!state) return;
    const config: AgentConfig = { ...(state.config || {}), preferred_locale: nextLocale };
    setState({ ...state, config });
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function openBillingPortal() {
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const json = await res.json().catch(() => null);
    if (!res.ok || typeof json?.portal_url !== "string") {
      setError(t("settings.billingError"));
      return;
    }
    window.location.href = json.portal_url;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      </div>
    );
  }

  const config: AgentConfig = state?.config || {};
  const planLabel = formatPlanTierLabel(billing?.plan.tier, locale);
  const planStatusLabel = formatSubscriptionStatus(billing?.subscription.status, locale);
  const nextRenewalLabel = formatLocaleDate(billing?.subscription.current_period_end, locale);
  const summaryCards = [
    { label: t("settings.name"), value: state?.self_name || "—" },
    { label: t("settings.genLevel"), value: String(state?.gen_level ?? 1) },
    { label: t("settings.messages"), value: String(state?.total_messages ?? 0) },
    { label: t("chat.vitality"), value: `${((state?.vitality ?? 1) * 100).toFixed(0)}%`, accent: true },
    { label: t("settings.mood"), value: state?.mood || "—" },
    { label: t("settings.coins"), value: String(state?.coins ?? 0) },
  ];
  const toggleRows = [
    {
      label: t("settings.autonomous"),
      description:
        locale === "en"
          ? "Keeps Gyeol moving, reflecting, and acting between conversations."
          : "대화 사이에도 결이 스스로 움직이고, 반응하고, 기억을 이어가게 합니다.",
      enabled: config.autonomous_enabled !== false,
      onToggle: () => toggleConfig("autonomous_enabled", !config.autonomous_enabled),
    },
    {
      label: t("settings.dream"),
      description:
        locale === "en"
          ? "Allows dream-like synthesis and internal scene generation during quiet cycles."
          : "조용한 주기 동안 꿈처럼 장면을 합성하고 내부 리플렉션을 이어가게 합니다.",
      enabled: Boolean(config.dream_enabled),
      onToggle: () => toggleConfig("dream_enabled", !config.dream_enabled),
    },
    {
      label: t("settings.social"),
      description:
        locale === "en"
          ? "Lets Gyeol notice and react to ecosystem and social signals."
          : "결이 생태계와 소셜 신호를 감지하고 관계적 반응을 이어가게 합니다.",
      enabled: config.social_enabled !== false,
      onToggle: () => toggleConfig("social_enabled", !config.social_enabled),
    },
    {
      label: t("settings.performanceMinimal"),
      description:
        locale === "en"
          ? "Uses a lighter visual/runtime path for quieter or lower-power sessions."
          : "보다 조용하고 가벼운 시각/런타임 경로를 사용해 저전력 세션에 맞춥니다.",
      enabled: Boolean(config.performance_minimal),
      onToggle: () => toggleConfig("performance_minimal", !config.performance_minimal),
    },
    {
      label: t("settings.recapEmail"),
      description:
        locale === "en"
          ? "Sends a periodic recap so the relationship can continue outside the app."
          : "앱 밖에서도 관계가 이어지도록 주기적인 리캡을 메일로 전달합니다.",
      enabled: Boolean(state?.channels?.email),
      onToggle: () => toggleRecapEmail(!state?.channels?.email),
    },
  ];

  return (
    <div className="min-h-screen bg-black px-4 pb-24 pt-20 text-white">
      <div className="mx-auto max-w-4xl space-y-4">
        <header className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_80px_rgba(34,211,238,0.05)] sm:p-8">
          <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/70">
            {locale === "en" ? "agent settings" : "agent settings"}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t("settings.title")}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/66">
            {locale === "en"
              ? "Tune how Gyeol lives between conversations: memory, autonomy, billing, invitations, and the pace of its world."
              : "대화 사이에 결이 어떤 속도로 살아가고 반응할지 조정합니다. 자율성, 리캡, 플랜, 초대 흐름을 한 곳에서 정리하세요."}
          </p>
        </header>
        {error && <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {summaryCards.map((card) => (
            <SettingsStatCard key={card.label} label={card.label} value={card.value} accent={card.accent} />
          ))}
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <div className="mb-3">
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">{locale === "en" ? "language" : "language"}</p>
            <p className="mt-1 text-sm text-white/60">
              {locale === "en"
                ? "Switch the shell language without leaving the current session."
                : "현재 세션을 유지한 채 제품 전체 언어를 바꿀 수 있습니다."}
            </p>
          </div>
          <LocaleSwitcher onLocaleChange={handleLocaleChange} />
        </section>

        {showPlansSurface && (
          <section className="rounded-3xl border border-cyan-300/20 bg-cyan-400/[0.08] p-5 shadow-[0_0_70px_rgba(34,211,238,0.05)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/75">{t("settings.currentPlan")}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold tracking-tight text-white">{planLabel}</h2>
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] text-white/80">
                    {planStatusLabel}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-white/72">
                  {billing?.plan.description ?? t("settings.planDescriptionFallback")}
                </p>
                {nextRenewalLabel && (
                  <p className="mt-3 text-xs text-white/55">
                    {t("settings.nextRenewal")}: {nextRenewalLabel}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/plans"
                  className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15"
                >
                  {t("settings.planManage")}
                </Link>
                {billing?.subscription.provider === "stripe" && billing.subscription.provider_customer_id && (
                  <button
                    type="button"
                    onClick={() => void openBillingPortal()}
                    className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15"
                  >
                    {t("settings.openBilling")}
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {billing && (
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">{t("settings.entitlements")}</p>
              <p className="mt-1 text-sm text-white/60">
                {locale === "en"
                  ? "These are the premium capabilities currently available in this relationship."
                  : "현재 이 관계에서 열려 있는 프리미엄 능력들입니다."}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-xs uppercase tracking-wider text-white/45">{t("settings.advancedRecaps")}</p>
                <p className="mt-2 text-sm text-white">{billing.entitlements.advanced_recaps ? t("settings.enabled") : t("settings.locked")}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-xs uppercase tracking-wider text-white/45">{t("settings.longTermHistory")}</p>
                <p className="mt-2 text-sm text-white">{billing.entitlements.long_term_history ? t("settings.enabled") : t("settings.locked")}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-xs uppercase tracking-wider text-white/45">{t("settings.multichannel")}</p>
                <p className="mt-2 text-sm text-white">{billing.entitlements.multichannel ? t("settings.enabled") : t("settings.locked")}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-xs uppercase tracking-wider text-white/45">{t("settings.premiumGeneration")}</p>
                <p className="mt-2 text-sm text-white">{billing.entitlements.premium_generation ? t("settings.enabled") : t("settings.locked")}</p>
              </div>
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">{locale === "en" ? "life engine" : "life engine"}</p>
            <p className="mt-1 text-sm text-white/60">
              {locale === "en"
                ? "Fine-tune how active, social, and lightweight Gyeol should feel in everyday use."
                : "결이 얼마나 자율적이고, 사회적이고, 가볍게 움직일지 제품 감도에 맞춰 세밀하게 조정합니다."}
            </p>
          </div>
          <div className="space-y-3">
            {toggleRows.map((toggle) => (
              <SettingsToggle
                key={toggle.label}
                label={toggle.label}
                description={toggle.description}
                enabled={toggle.enabled}
                onToggle={toggle.onToggle}
                locale={locale}
              />
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">{t("settings.inviteFriends")}</p>
          <p className="mt-1 text-sm text-white/60">
            {locale === "en"
              ? "Create a clean invite link you can share when you want someone else to meet Gyeol."
              : "누군가에게 결을 소개하고 싶을 때, 바로 공유할 수 있는 초대 링크를 만드세요."}
          </p>
          <InviteSection />
        </section>

        <button
          onClick={logout}
          className="w-full rounded-2xl border border-red-400/20 bg-red-500/10 py-3 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/15"
        >
          {t("settings.logout")}
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
