"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
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
    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-left shadow-[0_0_80px_rgba(80,128,255,0.08)]">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">{t("auth.loginEyebrow")}</p>
        <h1 className="mt-3 text-2xl font-semibold">{t("auth.loginTitle")}</h1>
        <p className="mt-3 text-sm leading-6 text-white/65">
          {t("auth.loginSubtitle")}
        </p>
      </div>

      <div className="mb-6 grid gap-2">
        <div className="rounded-2xl border border-white/10 bg-black/25 p-3 text-sm text-white/75">
          {t("auth.loginBenefit1")}
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/25 p-3 text-sm text-white/75">
          {t("auth.loginBenefit2")}
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/25 p-3 text-sm text-white/75">
          {t("auth.loginBenefit3")}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder={t("auth.email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder:text-white/45"
          required
        />
        <input
          type="password"
          placeholder={t("auth.password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder:text-white/45"
          required
        />
        {authError && <p className="text-sm text-red-400">{authError}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-white px-4 py-3 font-medium text-black disabled:opacity-50"
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
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white/75 hover:bg-white/10 disabled:opacity-50"
        >
          {t("auth.guestContinue")}
        </button>
        <div className="flex flex-wrap items-center justify-between gap-2 text-white/55">
          <Link href={signupHref} className="hover:text-white/80">
            {t("auth.signupLink")}
          </Link>
          <Link href="/features" className="hover:text-white/80">
            {t("auth.loginFeaturesLink")}
          </Link>
          <Link href="/explore" className="hover:text-white/80">
            {t("auth.loginExploreLink")}
          </Link>
        </div>
      </div>
    </div>
  );
}
