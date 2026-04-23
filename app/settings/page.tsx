"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { BottomNav } from "@/components/bottom-nav";
import { WorldClassHubMissionEditor } from "@/components/home/world-class-hub-mission-editor";
import { useTranslations } from "@/components/i18n-provider";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { CLIENT_EVENT } from "@/lib/analytics/catalog";
import { trackClientEvent } from "@/lib/analytics/client";
import {
  formatPlanTierLabel,
  formatSubscriptionStatus,
  type EntitlementKey,
  type PlanDefinition,
} from "@/lib/billing/catalog";
import { FEATURE_FLAG } from "@/lib/experiments/catalog";
import { useFeatureFlag } from "@/lib/experiments/client";
import { readLocalMissions, type LocalMission, writeLocalMissions } from "@/lib/home/local-missions";
import { type Locale } from "@/lib/i18n/config";
import { formatLocalizedDate } from "@/lib/i18n/format";
import { isAgeGroup, isMinorAgeGroup, type AgeGroup } from "@/lib/safety/age-gate";
import { createClient } from "@/lib/supabase/client";
import dynamic from "next/dynamic";
const AchievementShowcase = dynamic(() => import("@/components/achievement-showcase").then(m => ({ default: m.AchievementShowcase })), {
  ssr: false,
  loading: () => <div className="h-40 rounded-2xl bg-white/5 animate-pulse" />,
});
const StreakHeatmap = dynamic(() => import("@/components/streak-heatmap").then(m => ({ default: m.StreakHeatmap })), {
  ssr: false,
  loading: () => <div className="h-28 rounded-2xl bg-white/5 animate-pulse" />,
});
const GrowthChart = dynamic(() => import("@/components/growth-chart").then(m => ({ default: m.GrowthChart })), { ssr: false });
const ConversationSettings = dynamic(() => import("@/components/conversation-settings").then(m => ({ default: m.ConversationSettings })), {
  ssr: false,
  loading: () => <div className="h-48 rounded-2xl bg-white/5 animate-pulse" />,
});
const NotificationPreferencesCard = dynamic(() => import("@/components/notification-preferences-card").then(m => ({ default: m.NotificationPreferencesCard })), {
  ssr: false,
  loading: () => <div className="h-64 rounded-2xl bg-white/5 animate-pulse" />,
});
const StreakShieldShop = dynamic(() => import("@/components/streak-shield-shop").then(m => ({ default: m.StreakShieldShop })), {
  ssr: false,
  loading: () => <div className="h-44 rounded-2xl bg-white/5 animate-pulse" />,
});
import { type UnlockedAchievement } from "@/lib/engagement/achievements";
import { getPerfectDayStreak } from "@/lib/engagement/perfect-day";
import { PerfectDayBadge } from "@/components/perfect-day-badge";
import {
  isFontSize,
  isThemeMode,
  type FontSize,
  type ThemeMode,
  writeThemePreference,
} from "@/lib/theme/preferences";

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
          className="theme-subpanel rounded-xl px-4 py-2 text-sm theme-text-muted hover:brightness-105 disabled:opacity-50"
        >
          {loading ? "..." : t("settings.createInvite")}
        </button>
      ) : (
        <div className="flex gap-2">
          <input
            readOnly
            value={url}
            className="theme-input flex-1 rounded-xl px-3 py-2 text-xs theme-text-muted"
          />
          <button
            type="button"
            onClick={() => void copyUrl()}
            className="theme-subpanel rounded-xl px-3 py-2 text-sm theme-text-muted hover:brightness-105"
          >
            {copied ? t("chat.copied") : t("chat.copy")}
          </button>
        </div>
      )}
    </div>
  );
}

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
  genome?: { species?: string | null } | null;
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
  locale: Locale
) {
  if (!value) return null;
  return formatLocalizedDate(value, locale);
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
      className={`rounded-2xl p-4 ${accent ? "theme-panel-strong shadow-[0_0_50px_rgba(34,211,238,0.06)]" : "theme-panel"}`}
    >
      <p className={`text-xs uppercase tracking-[0.2em] ${accent ? "text-cyan-300" : "theme-text-faint"}`}>{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function SettingsToggle({
  label,
  description,
  enabled,
  onToggle,
  stateLabel,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  stateLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      className="theme-subpanel flex w-full items-center justify-between gap-4 rounded-2xl px-4 py-4 text-left transition-all duration-200 hover:brightness-105"
    >
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="theme-text-faint mt-1 text-xs leading-5">{description}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-[11px] uppercase tracking-[0.18em] ${enabled ? "text-cyan-300" : "theme-text-faint"}`}>
          {stateLabel}
        </span>
        <span
          className={`relative h-7 w-12 rounded-full border transition-colors ${
            enabled
              ? "border-cyan-300/35 bg-cyan-400/30"
              : "theme-panel"
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

function EarningsRedeemSection({ locale }: { locale: string }) {
  const isKo = locale === "ko";
  const [redeemCoins, setRedeemCoins] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<Array<{ id: string; coins_amount: number; krw_requested: number; status: string; created_at: string }>>([]);
  const [rate, setRate] = useState(10);

  useEffect(() => {
    fetch("/api/earnings/redeem", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setHistory(data.requests ?? []);
          setRate(data.rate ?? 10);
        }
      })
      .catch(() => {});
  }, []);

  const handleRedeem = async () => {
    const coins = parseInt(redeemCoins, 10);
    if (!coins || coins < 100) {
      setMessage(isKo ? "최소 100코인 이상 필요합니다" : "Minimum 100 coins required");
      setStatus("error");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch("/api/earnings/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coins }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) {
        setStatus("success");
        setMessage(isKo ? `${json.krw_requested}원 환전 요청 완료` : `Requested ${json.krw_requested} KRW`);
        setRedeemCoins("");
      } else {
        setStatus("error");
        setMessage(json?.error === "Insufficient coins" ? (isKo ? "코인이 부족합니다" : "Insufficient coins") : (json?.error ?? "Error"));
      }
    } catch {
      setStatus("error");
      setMessage(isKo ? "네트워크 오류" : "Network error");
    }
  };

  return (
    <section className="rounded-3xl border border-amber-300/15 bg-amber-400/[0.04] p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-amber-200/70 mb-1">
        {isKo ? "코인 환전" : "Coin Redemption"}
      </p>
      <p className="text-[11px] text-white/40 mb-3">
        {isKo ? `1코인 = ${rate}원` : `1 coin = ${rate} KRW`}
      </p>
      <div className="flex gap-2">
        <input
          type="number"
          value={redeemCoins}
          onChange={(e) => setRedeemCoins(e.target.value)}
          placeholder={isKo ? "환전할 코인 수" : "Coins to redeem"}
          min={100}
          className="flex-1 glass-card rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-amber-300/40 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void handleRedeem()}
          disabled={status === "loading"}
          className="rounded-xl bg-amber-500/20 border border-amber-400/30 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-500/30 disabled:opacity-40"
        >
          {status === "loading" ? "..." : isKo ? "환전" : "Redeem"}
        </button>
      </div>
      {message && (
        <p className={`mt-2 text-[11px] ${status === "success" ? "text-emerald-300" : "text-rose-300"}`}>{message}</p>
      )}
      {history.length > 0 && (
        <div className="mt-3 space-y-1">
          <p className="text-[10px] text-white/30 uppercase tracking-wider">{isKo ? "환전 내역" : "History"}</p>
          {history.slice(0, 5).map((req) => (
            <div key={req.id} className="flex items-center justify-between text-[11px] text-white/50">
              <span>{req.coins_amount} coins → {req.krw_requested}원</span>
              <span className={req.status === "pending" ? "text-amber-300" : req.status === "completed" ? "text-emerald-300" : "text-white/30"}>
                {req.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function IntegrationsSection({ locale }: { locale: string }) {
  const isKo = locale === "ko";
  const INTEGRATIONS = ["calendar", "slack", "notion", "discord"] as const;
  const [saving, setSaving] = useState<string | null>(null);
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [connected, setConnected] = useState<Record<string, boolean>>({});

  const handleConnect = async (service: string) => {
    const token = tokens[service];
    if (!token?.trim()) return;
    setSaving(service);
    try {
      const res = await fetch(`/api/integrations/${service}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: token.trim() }),
      });
      if (res.ok) {
        setConnected((prev) => ({ ...prev, [service]: true }));
        setTokens((prev) => ({ ...prev, [service]: "" }));
      }
    } catch { /* best-effort */ }
    setSaving(null);
  };

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-white/45 mb-1">
        {isKo ? "외부 연동" : "Integrations"}
      </p>
      <p className="text-[11px] text-white/30 mb-3">
        {isKo ? "외부 서비스를 연결하면 크리처가 더 많은 맥락을 이해합니다 (프리미엄)" : "Connect services for richer creature context (Premium)"}
      </p>
      <div className="space-y-2">
        {INTEGRATIONS.map((svc) => (
          <div key={svc} className="flex items-center gap-2">
            <span className="w-16 text-xs text-white/60 capitalize">{svc}</span>
            {connected[svc] ? (
              <span className="text-[11px] text-emerald-300">{isKo ? "연결됨" : "Connected"}</span>
            ) : (
              <>
                <input
                  value={tokens[svc] ?? ""}
                  onChange={(e) => setTokens((prev) => ({ ...prev, [svc]: e.target.value }))}
                  placeholder="Access token"
                  className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs text-white placeholder:text-white/25 focus:border-cyan-300/30 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => void handleConnect(svc)}
                  disabled={saving === svc || !tokens[svc]?.trim()}
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-[11px] text-white/70 hover:bg-white/15 disabled:opacity-40"
                >
                  {saving === svc ? "..." : isKo ? "연결" : "Connect"}
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function IoTPreferencesSection({ locale }: { locale: string }) {
  const isKo = locale === "ko";
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    smart_light: false,
    smart_speaker: false,
    ambient_display: false,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/iot", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.preferences && typeof data.preferences === "object") {
          setPrefs((prev) => ({ ...prev, ...(data.preferences as Record<string, boolean>) }));
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const togglePref = (key: string) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    fetch("/api/iot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferences: next }),
    }).catch(() => { /* best-effort */ });
  };

  if (!loaded) return null;

  const items = [
    { key: "smart_light", label: isKo ? "스마트 조명" : "Smart Light", desc: isKo ? "기분에 따라 조명 색상 변경" : "Change light color by mood" },
    { key: "smart_speaker", label: isKo ? "스마트 스피커" : "Smart Speaker", desc: isKo ? "크리처가 스피커로 인사" : "Creature greets via speaker" },
    { key: "ambient_display", label: isKo ? "앰비언트 디스플레이" : "Ambient Display", desc: isKo ? "대기 화면에 크리처 상태 표시" : "Show creature on ambient display" },
  ];

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-white/45 mb-1">
        {isKo ? "IoT 연동" : "IoT Preferences"}
      </p>
      <p className="text-[11px] text-white/30 mb-3">
        {isKo ? "스마트 기기와 크리처를 연결합니다" : "Connect your creature to smart devices"}
      </p>
      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => togglePref(item.key)}
            className="flex w-full items-center justify-between rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-3 text-left transition-all hover:bg-white/[0.06]"
          >
            <div>
              <p className="text-sm text-white/80">{item.label}</p>
              <p className="text-[10px] text-white/35">{item.desc}</p>
            </div>
            <span className={`h-5 w-9 rounded-full transition-colors ${prefs[item.key] ? "bg-cyan-400/30 border-cyan-300/40" : "bg-white/10"} border relative`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${prefs[item.key] ? "translate-x-4" : "translate-x-0.5"}`} />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function SettingsPage() {
  const { locale, t } = useTranslations();
  const [state, setState] = useState<AgentState | null>(null);
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missions, setMissions] = useState<LocalMission[]>(() => readLocalMissions());
  const [draftMission, setDraftMission] = useState("");
  const [unlockedAchievements, setUnlockedAchievements] = useState<UnlockedAchievement[]>([]);
  const router = useRouter();
  const supabase = createClient();
  const showPlansSurface = useFeatureFlag(FEATURE_FLAG.plansSurface);

  useEffect(() => {
    async function load() {
      try {
        const [settingsRes, billingRes, achievementsRes] = await Promise.all([
          fetch("/api/settings"),
          fetch("/api/billing/me"),
          fetch("/api/achievements"),
        ]);
        if (settingsRes.status === 401) {
          router.push("/login?next=%2Fsettings");
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
        if (achievementsRes.ok) {
          const achJson = await achievementsRes.json().catch(() => null);
          if (achJson?.achievements) {
            const unlocked: UnlockedAchievement[] = (achJson.achievements as Array<{ id: string; unlocked: boolean; newly_unlocked: boolean }>)
              .filter((a: { unlocked: boolean }) => a.unlocked)
              .map((a: { id: string }) => ({
                achievement_id: a.id,
                unlocked_at: new Date().toISOString(),
                seen: true,
              }));
            setUnlockedAchievements(unlocked);
          }
        }
      } catch {
        setError(t("settings.loadError"));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [router, t]);

  useEffect(() => {
    writeLocalMissions(missions);
  }, [missions]);

  useEffect(() => {
    const config = (state?.config ?? {}) as AgentConfig;
    const preferredTheme = isThemeMode(config.preferred_theme) ? config.preferred_theme : null;
    const highContrast = typeof config.high_contrast_enabled === "boolean" ? config.high_contrast_enabled : null;

    if (preferredTheme || highContrast !== null) {
      writeThemePreference({
        mode: preferredTheme ?? "dark",
        highContrast: highContrast ?? false,
      });
    }
  }, [state?.config]);

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

  async function handleThemeModeChange(nextTheme: ThemeMode) {
    if (!state) return;

    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferred_theme: nextTheme }),
    });
    if (!res.ok) {
      setError(t("settings.configError"));
      return;
    }

    const config: AgentConfig = { ...(state.config || {}), preferred_theme: nextTheme };
    setState({ ...state, config });
    writeThemePreference({
      mode: nextTheme,
      highContrast: Boolean(config.high_contrast_enabled),
    });
  }

  async function handleHighContrastToggle(enabled: boolean) {
    if (!state) return;

    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ high_contrast_enabled: enabled }),
    });
    if (!res.ok) {
      setError(t("settings.configError"));
      return;
    }

    const config: AgentConfig = { ...(state.config || {}), high_contrast_enabled: enabled };
    setState({ ...state, config });
    writeThemePreference({
      mode: isThemeMode(config.preferred_theme) ? config.preferred_theme : "dark",
      highContrast: enabled,
    });
  }

  async function handleFontSizeChange(nextSize: FontSize) {
    if (!state) return;

    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ font_size: nextSize }),
    });
    if (!res.ok) {
      setError(t("settings.configError"));
      return;
    }

    const config: AgentConfig = { ...(state.config || {}), font_size: nextSize };
    setState({ ...state, config });
    writeThemePreference({
      mode: isThemeMode(config.preferred_theme) ? config.preferred_theme : "dark",
      highContrast: Boolean(config.high_contrast_enabled),
      fontSize: nextSize,
    });
  }

  async function handleReduceMotionToggle(enabled: boolean) {
    if (!state) return;

    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reduce_motion: enabled }),
    });
    if (!res.ok) {
      setError(t("settings.configError"));
      return;
    }

    const config: AgentConfig = { ...(state.config || {}), reduce_motion: enabled };
    setState({ ...state, config });
    writeThemePreference({
      mode: isThemeMode(config.preferred_theme) ? config.preferred_theme : "dark",
      highContrast: Boolean(config.high_contrast_enabled),
      reduceMotion: enabled,
    });
  }

  async function handleAgeGroupChange(nextAgeGroup: AgeGroup) {
    if (!state) return;
    const guardianConsent = nextAgeGroup === "under_13"
      ? Boolean((state.config as AgentConfig | undefined)?.guardian_consent)
      : false;
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        age_group: nextAgeGroup,
        guardian_consent: guardianConsent,
        social_public_enabled: nextAgeGroup === "adult"
          ? Boolean((state.config as AgentConfig | undefined)?.social_public_enabled)
          : false,
      }),
    });
    if (!res.ok) {
      setError(t("settings.configError"));
      return;
    }
    const config: AgentConfig = {
      ...(state.config || {}),
      age_group: nextAgeGroup,
      guardian_consent: guardianConsent,
      social_public_enabled: nextAgeGroup === "adult"
        ? Boolean((state.config as AgentConfig | undefined)?.social_public_enabled)
        : false,
    };
    setState({ ...state, config });
  }

  async function handleGuardianConsentToggle(enabled: boolean) {
    if (!state) return;
    const ageGroup = isAgeGroup((state.config as AgentConfig | undefined)?.age_group)
      ? ((state.config as AgentConfig).age_group as AgeGroup)
      : "under_13";
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        age_group: ageGroup,
        guardian_consent: enabled,
        social_public_enabled: false,
      }),
    });
    if (!res.ok) {
      setError(t("settings.configError"));
      return;
    }
    const config: AgentConfig = {
      ...(state.config || {}),
      age_group: ageGroup,
      guardian_consent: enabled,
      social_public_enabled: false,
    };
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

  function toggleMission(id: string) {
    setMissions((prev) => prev.map((mission) => (mission.id === id ? { ...mission, done: !mission.done } : mission)));
  }

  function removeMission(id: string) {
    setMissions((prev) => prev.filter((mission) => mission.id !== id));
  }

  function addMission() {
    const title = draftMission.trim();
    if (!title) return;

    trackClientEvent(CLIENT_EVENT.missionCreated, {
      has_existing_messages: (state?.total_messages ?? 0) > 0,
      source: "settings",
      title_length: title.length,
    });

    setMissions((prev) => [{ id: crypto.randomUUID(), title, done: false }, ...prev].slice(0, 6));
    setDraftMission("");
  }

  // Streak heatmap data — derive from total_messages as approximation
  // In production, this would come from a server-side activity log
  // NOTE: Must be before early return to satisfy rules-of-hooks
  const streakDates = useMemo(() => {
    const total = state?.total_messages ?? 0;
    const dates: string[] = [];
    const today = new Date();
    // Simulate activity distribution across last 365 days
    for (let i = 0; i < Math.min(total, 365); i++) {
      const daysAgo = Math.floor(Math.random() * 365);
      const d = new Date(today);
      d.setDate(d.getDate() - daysAgo);
      dates.push(d.toISOString().slice(0, 10));
    }
    return dates;
  }, [state?.total_messages]);

  if (loading) {
    return (
      <div className="theme-page min-h-screen flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      </div>
    );
  }

  const config: AgentConfig = state?.config || {};
  const preferredTheme: ThemeMode = isThemeMode(config.preferred_theme) ? config.preferred_theme : "dark";
  const highContrastEnabled = Boolean(config.high_contrast_enabled);
  const ageGroup: AgeGroup = isAgeGroup(config.age_group) ? config.age_group : "adult";
  const guardianConsentEnabled = Boolean(config.guardian_consent);
  const fontSize: FontSize = isFontSize(config.font_size) ? config.font_size : "medium";
  const reduceMotionEnabled = Boolean(config.reduce_motion);
  const planLabel = formatPlanTierLabel(billing?.plan.tier, locale);
  const planStatusLabel = formatSubscriptionStatus(billing?.subscription.status, locale);
  const nextRenewalLabel = formatLocaleDate(billing?.subscription.current_period_end, locale);
  const accentColor = "#22d3ee"; // cyan-400

  const summaryCards = [
    { label: t("settings.name"), value: state?.self_name || state?.genome?.species || "—" },
    { label: t("settings.genLevel"), value: String(state?.gen_level ?? 1) },
    { label: t("settings.messages"), value: String(state?.total_messages ?? 0) },
    { label: t("chat.vitality"), value: `${((state?.vitality ?? 1) * 100).toFixed(0)}%`, accent: true },
    { label: t("settings.mood"), value: state?.mood || "—" },
    { label: t("settings.coins"), value: String(state?.coins ?? 0) },
  ];
  const toggleRows = [
    {
      label: t("settings.autonomous"),
      description: t("settings.autonomousBody"),
      enabled: config.autonomous_enabled !== false,
      onToggle: () => toggleConfig("autonomous_enabled", !config.autonomous_enabled),
    },
    {
      label: t("settings.dream"),
      description: t("settings.dreamBody"),
      enabled: Boolean(config.dream_enabled),
      onToggle: () => toggleConfig("dream_enabled", !config.dream_enabled),
    },
    {
      label: t("settings.social"),
      description: t("settings.socialBody"),
      enabled: config.social_enabled !== false,
      onToggle: () => toggleConfig("social_enabled", !config.social_enabled),
    },
    {
      label: t("settings.publicSocial"),
      description: t("settings.publicSocialBody"),
      enabled: !isMinorAgeGroup(ageGroup) && Boolean(config.social_public_enabled),
      onToggle: () => {
        if (isMinorAgeGroup(ageGroup)) return;
        void toggleConfig("social_public_enabled", !config.social_public_enabled);
      },
    },
    {
      label: t("settings.simpleMode"),
      description: t("settings.simpleModeBody"),
      enabled: Boolean(config.simple_mode_enabled),
      onToggle: () => toggleConfig("simple_mode_enabled", !config.simple_mode_enabled),
    },
    {
      label: t("settings.performanceMinimal"),
      description: t("settings.performanceMinimalBody"),
      enabled: Boolean(config.performance_minimal),
      onToggle: () => toggleConfig("performance_minimal", !config.performance_minimal),
    },
    {
      label: t("settings.recapEmail"),
      description: t("settings.recapEmailBody"),
      enabled: Boolean(state?.channels?.email),
      onToggle: () => toggleRecapEmail(!state?.channels?.email),
    },
  ];
  const sectionLinks = [
    { href: "#settings-language", label: t("settings.languageEyebrow") },
    { href: "#settings-safety", label: t("settings.ageGateTitle") },
    { href: "#settings-theme", label: t("settings.themeEyebrow") },
    { href: "#settings-accessibility", label: t("accessibility.title") },
    { href: "#settings-plan", label: t("settings.currentPlan") },
    { href: "#settings-automation", label: t("settings.lifeEngineEyebrow") },
    { href: "#settings-mission", label: t("settings.todayMission") },
  ];

  return (
    <div className="theme-page min-h-screen px-4 pb-24 pt-20">
      <div className="mx-auto max-w-4xl space-y-4">
        <header className="theme-panel rounded-[2rem] p-6 shadow-[0_0_80px_rgba(34,211,238,0.05)] sm:p-8">
          <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-300">
            {t("settings.eyebrow")}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t("settings.title")}</h1>
          <p className="theme-text-subtle mt-3 max-w-2xl text-sm leading-6">
            {t("settings.subtitle")}
          </p>
        </header>
        {error && <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {summaryCards.map((card) => (
            <SettingsStatCard key={card.label} label={card.label} value={card.value} accent={card.accent} />
          ))}
        </section>

        {/* Streak heatmap — GitHub-style activity visualization */}
        <section className="theme-panel rounded-3xl p-4">
          <p className="theme-text-faint text-xs uppercase tracking-[0.2em] mb-3">{t("settings.activityHeatmap") || "Activity"}</p>
          <StreakHeatmap activeDates={streakDates} accentColor={accentColor} />
        </section>

        {/* Creature Growth Chart */}
        {state && (
          <section className="theme-panel rounded-3xl p-4">
            <GrowthChart
              data={Array.from({ length: 7 }, (_, i) => ({
                label: `Day ${i + 1}`,
                value: Math.min(100, ((state.gen_level ?? 1) * 10) + i * 5 + Math.round(Math.random() * 10)),
              }))}
              color="#22d3ee"
              title={t("settings.genLevel") || "Growth"}
              suffix=" pts"
            />
          </section>
        )}

        {/* Perfect Day Streak */}
        <section className="theme-panel rounded-3xl p-5">
          <PerfectDayBadge locale={locale} />
        </section>

        {/* Achievement Showcase */}
        <section className="theme-panel rounded-3xl p-5">
          <AchievementShowcase
            unlockedAchievements={unlockedAchievements}
            stats={{
              total_messages: state?.total_messages ?? 0,
              streak_days: 0,
              gen_level: state?.gen_level ?? 1,
            }}
            locale={locale}
          />
        </section>

        {/* Conversation Settings — tone sliders, content filters */}
        <section id="settings-conversation" className="theme-panel scroll-mt-24 rounded-3xl p-5">
          <div className="mb-3">
            <p className="theme-text-faint text-xs uppercase tracking-[0.2em]">
              {locale === "ko" ? "대화 설정" : "Conversation Settings"}
            </p>
            <p className="theme-text-subtle mt-1 text-sm">
              {locale === "ko" ? "크리처와의 대화 톤과 주제를 설정하세요" : "Customize tone and topics"}
            </p>
          </div>
          <ConversationSettings />
        </section>

        <section className="theme-panel rounded-3xl p-4">
          <p className="theme-text-faint text-xs uppercase tracking-[0.2em]">{t("settings.quickSections")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {sectionLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="theme-subpanel inline-flex min-h-10 items-center rounded-full px-3 py-2 text-sm theme-text-muted transition-colors hover:brightness-105"
              >
                {link.label}
              </a>
            ))}
          </div>
        </section>

        <section id="settings-language" className="theme-panel scroll-mt-24 rounded-3xl p-4">
          <div className="mb-3">
            <p className="theme-text-faint text-xs uppercase tracking-[0.2em]">{t("settings.languageEyebrow")}</p>
            <p className="theme-text-subtle mt-1 text-sm">
              {t("settings.languageBody")}
            </p>
          </div>
          <LocaleSwitcher onLocaleChange={handleLocaleChange} />
        </section>

        <section id="settings-safety" className="theme-panel scroll-mt-24 rounded-3xl p-5">
          <div className="mb-4">
            <p className="theme-text-faint text-xs uppercase tracking-[0.2em]">{t("settings.ageGateTitle")}</p>
            <p className="theme-text-subtle mt-1 text-sm">
              {t("settings.ageGateBody")}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {([
              { key: "under_13", label: t("ageGate.under13") },
              { key: "teen", label: t("ageGate.teen") },
              { key: "adult", label: t("ageGate.adult") },
            ] as const).map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => void handleAgeGroupChange(option.key)}
                className={`rounded-2xl px-4 py-4 text-left transition-all ${ageGroup === option.key ? "theme-panel-strong ring-2 ring-cyan-400/40" : "theme-subpanel"}`}
              >
                <p className="text-sm font-medium">{option.label}</p>
              </button>
            ))}
          </div>
          {ageGroup === "under_13" && (
            <div className="mt-3">
              <SettingsToggle
                label={t("settings.guardianConsent")}
                description={t("settings.guardianConsentBody")}
                enabled={guardianConsentEnabled}
                onToggle={() => void handleGuardianConsentToggle(!guardianConsentEnabled)}
                stateLabel={guardianConsentEnabled ? t("settings.toggleLive") : t("settings.toggleIdle")}
              />
            </div>
          )}
          {isMinorAgeGroup(ageGroup) && (
            <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-50">
              {t("settings.minorSocialRestriction")}
            </div>
          )}
        </section>

        <section id="settings-theme" className="theme-panel scroll-mt-24 rounded-3xl p-5">
          <div className="mb-4">
            <p className="theme-text-faint text-xs uppercase tracking-[0.2em]">{t("settings.themeEyebrow")}</p>
            <p className="theme-text-subtle mt-1 text-sm">
              {t("settings.themeBody")}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void handleThemeModeChange("dark")}
              className={`rounded-2xl px-4 py-4 text-left transition-all ${preferredTheme === "dark" ? "theme-panel-strong ring-2 ring-cyan-400/40" : "theme-subpanel"}`}
            >
              <p className="text-sm font-medium">{t("settings.themeDark")}</p>
              <p className="theme-text-faint mt-1 text-xs">{t("settings.themeDarkBody")}</p>
            </button>
            <button
              type="button"
              onClick={() => void handleThemeModeChange("light")}
              className={`rounded-2xl px-4 py-4 text-left transition-all ${preferredTheme === "light" ? "theme-panel-strong ring-2 ring-cyan-400/40" : "theme-subpanel"}`}
            >
              <p className="text-sm font-medium">{t("settings.themeLight")}</p>
              <p className="theme-text-faint mt-1 text-xs">{t("settings.themeLightBody")}</p>
            </button>
          </div>
          <div className="mt-3">
            <SettingsToggle
              label={t("settings.highContrast")}
              description={t("settings.highContrastBody")}
              enabled={highContrastEnabled}
              onToggle={() => void handleHighContrastToggle(!highContrastEnabled)}
              stateLabel={highContrastEnabled ? t("settings.toggleLive") : t("settings.toggleIdle")}
            />
          </div>
        </section>

        {/* Accessibility */}
        <section id="settings-accessibility" className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_0_80px_rgba(168,85,247,0.04)] scroll-mt-24">
          <div className="mb-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-purple-200/70">{t("accessibility.title")}</p>
            <p className="mt-1 text-sm text-white/60">{t("accessibility.guide")}</p>
          </div>

          {/* Font Size Selector */}
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium text-white/70">{t("accessibility.fontSizes")}</p>
            <div className="grid grid-cols-4 gap-2">
              {(["small", "medium", "large", "xlarge"] as const).map((size) => {
                const sizeLabels: Record<FontSize, string> = {
                  small: t("accessibility.fontSmall"),
                  medium: t("accessibility.fontMedium"),
                  large: t("accessibility.fontLarge"),
                  xlarge: t("accessibility.fontXlarge"),
                };
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => handleFontSizeChange(size)}
                    className={`rounded-xl px-3 py-3 text-center text-xs transition-all ${
                      fontSize === size
                        ? "theme-panel-strong ring-2 ring-purple-400/40"
                        : "theme-subpanel hover:bg-white/10"
                    }`}
                  >
                    {sizeLabels[size]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reduce Motion */}
          <SettingsToggle
            label={t("accessibility.reduceMotion")}
            description={t("accessibility.reduceMotionBody")}
            enabled={reduceMotionEnabled}
            onToggle={() => handleReduceMotionToggle(!reduceMotionEnabled)}
            stateLabel={reduceMotionEnabled ? t("settings.toggleLive") : t("settings.toggleIdle")}
          />
        </section>

        {showPlansSurface && (
          <section id="settings-plan" className="rounded-3xl border border-cyan-300/20 bg-cyan-400/[0.08] p-5 shadow-[0_0_70px_rgba(34,211,238,0.05)] scroll-mt-24">
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
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 scroll-mt-24">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">{t("settings.entitlements")}</p>
              <p className="mt-1 text-sm text-white/60">
                {t("settings.entitlementsBody")}
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

        <section id="settings-automation" className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 scroll-mt-24">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">{t("settings.lifeEngineEyebrow")}</p>
            <p className="mt-1 text-sm text-white/60">
              {t("settings.lifeEngineBody")}
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
                stateLabel={toggle.enabled ? t("settings.toggleLive") : t("settings.toggleIdle")}
              />
            ))}
          </div>
        </section>

        <section id="settings-mission" className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 scroll-mt-24">
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">{t("settings.todayMission")}</p>
          <p className="mt-1 text-sm text-white/72">
            {t("settings.todayMissionBody")}
          </p>
          <WorldClassHubMissionEditor
            addLabel={t("home.missionAdd")}
            draftMission={draftMission}
            emptyState={t("home.missionEmptyReturning")}
            inputAriaLabel={t("settings.missionInputAria")}
            missions={missions}
            onAdd={addMission}
            onChangeDraft={setDraftMission}
            onRemove={removeMission}
            onToggle={toggleMission}
            placeholder={t("home.missionPlaceholder")}
            removeLabel={t("home.missionDelete")}
            toggleAriaLabel={t("settings.missionToggleAria")}
          />
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">{t("settings.inviteFriends")}</p>
          <p className="mt-1 text-sm text-white/60">
            {t("settings.inviteBody")}
          </p>
          <InviteSection />
        </section>

        {/* Streak shield shop — buy shields with coins to protect flame */}
        <StreakShieldShop />

        {/* Notification preferences — opt-in categories + quiet hours */}
        <NotificationPreferencesCard />

        {/* Earnings — coin redemption */}
        <EarningsRedeemSection locale={locale} />

        {/* Integrations — calendar, slack, etc */}
        <IntegrationsSection locale={locale} />

        {/* IoT Preferences */}
        <IoTPreferencesSection locale={locale} />

        {/* Privacy & data control — GDPR export/delete dashboard */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">
            {t("settings.privacyEyebrow") || (locale === "ko" ? "프라이버시 & 내 데이터" : "Privacy & Your Data")}
          </p>
          <p className="mt-1 text-sm text-white/60">
            {t("settings.privacyBody") || (locale === "ko"
              ? "저장된 대화·기억·DNA 데이터를 확인하고 내보내거나 삭제할 수 있어요."
              : "View, export, or delete your stored conversations, memories, and DNA data.")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/privacy/data-dashboard"
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-white/75 transition-colors hover:bg-white/[0.12] hover:text-white"
            >
              <span aria-hidden>🛡️</span>
              <span>{t("settings.privacyDashboard") || (locale === "ko" ? "내 데이터 대시보드" : "Data Dashboard")}</span>
            </Link>
            <Link
              href="/privacy"
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white/80"
            >
              <span aria-hidden>📄</span>
              <span>{t("settings.privacyPolicy") || (locale === "ko" ? "개인정보처리방침" : "Privacy Policy")}</span>
            </Link>
          </div>
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
