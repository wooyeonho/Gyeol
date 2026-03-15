"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { WorldClassHubMissionEditor } from "@/components/home/world-class-hub-mission-editor";
import { useTranslations } from "@/components/i18n-provider";
import { CLIENT_EVENT } from "@/lib/analytics/catalog";
import { trackClientEvent } from "@/lib/analytics/client";
import { type Locale } from "@/lib/i18n/config";
import { formatLocalizedDate } from "@/lib/i18n/format";
import { readLocalMissions, type LocalMission, writeLocalMissions } from "@/lib/home/local-missions";
import {
  isThemeMode,
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
      onClick={onToggle}
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

export default function SettingsPage() {
  const { locale, t } = useTranslations();
  const [state, setState] = useState<AgentState | null>(null);
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missions, setMissions] = useState<LocalMission[]>(() => readLocalMissions());
  const [draftMission, setDraftMission] = useState("");
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

        <section className="theme-panel rounded-3xl p-4">
          <div className="mb-3">
            <p className="theme-text-faint text-xs uppercase tracking-[0.2em]">{t("settings.languageEyebrow")}</p>
            <p className="theme-text-subtle mt-1 text-sm">
              {t("settings.languageBody")}
            </p>
          </div>
          <LocaleSwitcher onLocaleChange={handleLocaleChange} />
        </section>

        <section className="theme-panel rounded-3xl p-5">
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

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
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

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">{t("settings.todayMission")}</p>
          <p className="mt-1 text-sm text-white/72">
            {t("settings.todayMissionBody")}
          </p>
          <WorldClassHubMissionEditor
            addLabel={t("home.missionAdd")}
            draftMission={draftMission}
            emptyState={t("home.missionEmptyReturning")}
            inputAriaLabel={locale === "en" ? "Enter today's mission" : "오늘의 미션 입력"}
            missions={missions}
            onAdd={addMission}
            onChangeDraft={setDraftMission}
            onRemove={removeMission}
            onToggle={toggleMission}
            placeholder={t("home.missionPlaceholder")}
            removeLabel={t("home.missionDelete")}
            toggleAriaLabel={locale === "en" ? "Toggle mission completion" : "미션 완료 토글"}
          />
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">{t("settings.inviteFriends")}</p>
          <p className="mt-1 text-sm text-white/60">
            {t("settings.inviteBody")}
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
