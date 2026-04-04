"use client";

import { useState } from "react";
import { createClient, isBrowserSupabaseConfigured } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CLIENT_EVENT } from "@/lib/analytics/catalog";
import { trackClientEvent } from "@/lib/analytics/client";
import { useTranslations } from "@/components/i18n-provider";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const { t } = useTranslations();
  const callbackErrorCode = searchParams.get("error");
  const nextPath = searchParams.get("next") || "/";
  const signupHref = `/signup${nextPath !== "/" ? `?next=${encodeURIComponent(nextPath)}` : ""}`;
  const isConfigured = isBrowserSupabaseConfigured();
  const authError =
    error
    ?? (callbackErrorCode ? t(`auth.errors.${callbackErrorCode}`) : null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    trackClientEvent(CLIENT_EVENT.loginStarted, { method: "password" });
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      trackClientEvent(CLIENT_EVENT.authFailed, { method: "password", stage: "login" });
      setError(err.message);
      return;
    }
    trackClientEvent(CLIENT_EVENT.loginCompleted, { method: "password" });
    router.push(nextPath);
    router.refresh();
  }

  async function handleGuest() {
    setError(null);
    setLoading(true);
    trackClientEvent(CLIENT_EVENT.guestStarted, { entry: "login" });
    const { error: err } = await supabase.auth.signInAnonymously();
    setLoading(false);
    if (err) {
      trackClientEvent(CLIENT_EVENT.authFailed, { method: "guest", stage: "login" });
      setError(err.message);
      return;
    }
    trackClientEvent(CLIENT_EVENT.guestCompleted, { entry: "login" });
    router.push(nextPath);
    router.refresh();
  }

  return (
    <div className="theme-panel w-full max-w-md rounded-3xl p-6 text-left shadow-[0_0_80px_rgba(80,128,255,0.08)]">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">{t("auth.loginEyebrow")}</p>
        <h1 className="mt-3 text-2xl font-semibold">{t("auth.loginTitle")}</h1>
        <p className="theme-text-subtle mt-3 text-sm leading-6">
          {t("auth.loginSubtitle")}
        </p>
      </div>

      {!isConfigured && (
        <div className="mb-4 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-50">
          {t("auth.configWarning")}
        </div>
      )}

      <div className="mb-6 grid gap-2">
        <div className="theme-subpanel rounded-2xl p-3 text-sm theme-text-muted">
          {t("auth.loginBenefit1")}
        </div>
        <div className="theme-subpanel rounded-2xl p-3 text-sm theme-text-muted">
          {t("auth.loginBenefit2")}
        </div>
        <div className="theme-subpanel rounded-2xl p-3 text-sm theme-text-muted">
          {t("auth.loginBenefit3")}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="login-email" className="mb-2 block text-sm font-medium text-white/88">
            {t("auth.email")}
          </label>
          <input
            id="login-email"
            type="email"
            placeholder={t("auth.email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            aria-invalid={Boolean(authError)}
            aria-describedby={authError ? "login-auth-error" : undefined}
            className="theme-input min-h-12 w-full rounded-xl px-4 py-3 text-base placeholder:text-[color:var(--theme-text-faint)]"
            required
          />
        </div>
        <div>
          <label htmlFor="login-password" className="mb-2 block text-sm font-medium text-white/88">
            {t("auth.password")}
          </label>
          <input
            id="login-password"
            type="password"
            placeholder={t("auth.password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            aria-invalid={Boolean(authError)}
            aria-describedby={authError ? "login-auth-error" : undefined}
            className="theme-input min-h-12 w-full rounded-xl px-4 py-3 text-base placeholder:text-[color:var(--theme-text-faint)]"
            required
          />
        </div>
        {authError && <p id="login-auth-error" className="text-sm text-red-400" role="alert">{authError}</p>}
        <button
          type="submit"
          disabled={loading}
          className="min-h-12 rounded-xl bg-[color:var(--foreground)] px-4 py-3 text-base font-medium text-[color:var(--background)] disabled:opacity-50"
        >
          {loading ? t("auth.loginLoading") : t("auth.login")}
        </button>
      </form>

      <div className="mt-4">
        <OAuthButtons
          flow="login"
          loading={loading}
          nextPath={nextPath}
          onError={(message) => setError(message || null)}
          onLoadingChange={setLoading}
        />
      </div>

      <div className="mt-4 flex flex-col gap-3 text-sm">
        <button
          type="button"
          onClick={handleGuest}
          disabled={loading}
          className="theme-subpanel min-h-12 rounded-xl px-4 py-3 text-base theme-text-muted hover:brightness-105 disabled:opacity-50"
        >
          {t("auth.guestContinue")}
        </button>
        <div className="theme-text-faint flex flex-wrap items-center justify-between gap-2">
          <Link href={signupHref} className="hover:text-[color:var(--foreground)]">
            {t("auth.signupLink")}
          </Link>
          <Link href="/forgot-password" className="hover:text-[color:var(--foreground)]">
            {t("auth.forgotPasswordLink") ?? "Forgot password?"}
          </Link>
          <Link href="/features" className="hover:text-[color:var(--foreground)]">
            {t("auth.loginFeaturesLink")}
          </Link>
          <Link href="/explore" className="hover:text-[color:var(--foreground)]">
            {t("auth.loginExploreLink")}
          </Link>
        </div>
      </div>
    </div>
  );
}
