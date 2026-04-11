"use client";

import { useState } from "react";
import { createClient, isBrowserSupabaseConfigured } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CLIENT_EVENT } from "@/lib/analytics/catalog";
import { trackClientEvent } from "@/lib/analytics/client";
import { useTranslations } from "@/components/i18n-provider";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

export default function SignupPage() {
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref");
  const nextPath = searchParams.get("next") || "/";
  const callbackErrorCode = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedConsent, setAcceptedConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const { t } = useTranslations();
  const authError =
    error
    ?? (callbackErrorCode ? t(`auth.errors.${callbackErrorCode}`) : null);
  const loginHref = `/login${nextPath !== "/" ? `?next=${encodeURIComponent(nextPath)}` : ""}`;
  const isConfigured = isBrowserSupabaseConfigured();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!acceptedConsent) {
      setError(t("auth.errors.consent_required"));
      return;
    }
    setLoading(true);
    trackClientEvent(CLIENT_EVENT.signupStarted, { method: "password", ref: refCode ?? undefined });
    const { data, error: err } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (err) {
      trackClientEvent(CLIENT_EVENT.authFailed, { method: "password", stage: "signup" });
      setError(err.message);
      return;
    }
    if (refCode && data?.user) {
      await fetch("/api/invite/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: refCode }),
      }).catch(() => {});
    }
    trackClientEvent(CLIENT_EVENT.signupCompleted, { method: "password" });
    if (data?.session) {
      router.push(nextPath);
    } else {
      router.push(`/login${nextPath !== "/" ? `?next=${encodeURIComponent(nextPath)}` : ""}`);
    }
    router.refresh();
  }

  return (
    <div className="glass-card-strong w-full max-w-md rounded-3xl p-6 text-left shadow-[0_0_80px_rgba(80,128,255,0.15)] relative z-10">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">{t("auth.signupEyebrow")}</p>
        <h1 className="mt-3 text-section">{t("auth.signupTitle")}</h1>
        <p className="theme-text-subtle mt-3 text-sm leading-6">
          {t("auth.signupSubtitle")}
        </p>
      </div>

      {!isConfigured && (
        <div className="mb-4 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-50">
          {t("auth.configWarning")}
        </div>
      )}

      <div className="mb-6 grid gap-2">
        <div className="glass-card rounded-2xl p-3 text-sm theme-text-muted">
          {t("auth.signupBenefit1")}
        </div>
        <div className="glass-card rounded-2xl p-3 text-sm theme-text-muted">
          {t("auth.signupBenefit2")}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="signup-email" className="mb-2 block text-sm font-medium text-white/88">
            {t("auth.email")}
          </label>
          <input
            id="signup-email"
            type="email"
            placeholder={t("auth.email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            aria-invalid={Boolean(authError)}
            aria-describedby={authError ? "signup-auth-error" : undefined}
            className="theme-input min-h-12 w-full rounded-xl px-4 py-3 text-base placeholder:text-[color:var(--theme-text-faint)]"
            required
          />
        </div>
        <div>
          <label htmlFor="signup-password" className="mb-2 block text-sm font-medium text-white/88">
            {t("auth.password")}
          </label>
          <input
            id="signup-password"
            type="password"
            placeholder={t("auth.password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            aria-invalid={Boolean(authError)}
            aria-describedby={authError ? "signup-auth-error" : undefined}
            className="theme-input min-h-12 w-full rounded-xl px-4 py-3 text-base placeholder:text-[color:var(--theme-text-faint)]"
            required
          />
        </div>
        <label className="glass-card flex items-start gap-3 rounded-2xl px-4 py-3 text-sm theme-text-muted">
          <input
            type="checkbox"
            checked={acceptedConsent}
            onChange={(event) => setAcceptedConsent(event.target.checked)}
            className="mt-1 h-5 w-5 rounded border-white/20 bg-black"
            required
          />
          <span className="leading-6">
            {t("auth.consentPrefix")}{" "}
            <Link href="/terms" className="underline underline-offset-2 hover:text-white">
              {t("common.termsOfService")}
            </Link>{" "}
            {t("common.and")}{" "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-white">
              {t("common.privacyPolicy")}
            </Link>
            {t("auth.consentSuffix")}
          </span>
        </label>
        {authError && <p id="signup-auth-error" className="text-sm text-red-400" role="alert">{authError}</p>}
        <button
          type="submit"
          disabled={loading}
          className="min-h-12 rounded-xl bg-[color:var(--foreground)] px-4 py-3 text-base font-medium text-[color:var(--background)] disabled:opacity-50 btn-3d"
        >
          {loading ? t("auth.signupLoading") : t("auth.signupSubmit")}
        </button>
      </form>

      <div className="mt-4">
        <OAuthButtons
          flow="signup"
          loading={loading}
          nextPath={nextPath}
          refCode={refCode}
          onError={(message) => setError(message || null)}
          onLoadingChange={setLoading}
          disabledProviders={acceptedConsent ? [] : ["google", "github", "apple"]}
        />
      </div>

      <div className="theme-text-faint mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
        <Link href={loginHref} className="hover:text-[color:var(--foreground)]">
          {t("auth.loginLink")}
        </Link>
        <Link href="/features" className="hover:text-[color:var(--foreground)]">
          {t("auth.loginFeaturesLink")}
        </Link>
      </div>
    </div>
  );
}
