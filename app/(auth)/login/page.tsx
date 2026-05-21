"use client";

import { useState } from "react";
import { createClient, isBrowserSupabaseConfigured } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CLIENT_EVENT } from "@/lib/analytics/catalog";
import { trackClientEvent } from "@/lib/analytics/client";
import { useTranslations } from "@/components/i18n-provider";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { SecurityBadge } from "@/components/auth/security-badge";
import { motion, useReducedMotion } from "framer-motion";

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
  const prefersReducedMotion = useReducedMotion();
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
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card-deep w-full max-w-sm rounded-2xl p-7 text-left relative z-10"
    >
      {/* Gradient hairline — luminous edge along the top of the card */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
      />
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: prefersReducedMotion ? 0 : 0.45,
          delay: prefersReducedMotion ? 0 : 0.1,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="mb-7"
      >
        <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.22em] text-white/40">
          <motion.span
            className="h-1 w-1 rounded-full bg-cyan-300"
            animate={prefersReducedMotion ? { opacity: 0.8 } : { opacity: [0.4, 1, 0.4] }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 2, repeat: Infinity, ease: "easeInOut" }
            }
          />
          {t("auth.loginEyebrow")}
        </div>
        <h1 className="text-section mt-3 text-white">
          {t("auth.loginTitle")}
        </h1>
        <p className="mt-2 text-[13px] leading-[1.55] text-white/55">
          {t("auth.loginSubtitle")}
        </p>
        <ul className="mt-4 space-y-1.5 text-[12px] leading-[1.5] text-white/60">
          {[
            t("auth.loginBenefit1"),
            t("auth.loginBenefit2"),
            t("auth.loginBenefit3"),
          ].map((benefit) => (
            <li key={benefit} className="flex gap-2">
              <span aria-hidden="true" className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-cyan-300/60" />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      </motion.div>

      {!isConfigured && (
        <div className="mb-5 rounded-lg border border-amber-300/20 bg-amber-400/[0.06] px-3.5 py-2.5 text-[12px] leading-[1.5] text-amber-50/90">
          {t("auth.configWarning")}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-white/45">
            {t("auth.email")}
          </label>
          <input
            id="login-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            aria-invalid={Boolean(authError)}
            aria-describedby={authError ? "login-auth-error" : undefined}
            className="min-h-11 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-[14px] text-white placeholder:text-white/25 transition-colors focus:border-white/25 focus:bg-white/[0.05] focus:outline-none"
            required
          />
        </div>
        <div>
          <label htmlFor="login-password" className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-white/45">
            {t("auth.password")}
          </label>
          <input
            id="login-password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            aria-invalid={Boolean(authError)}
            aria-describedby={authError ? "login-auth-error" : undefined}
            className="min-h-11 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-[14px] text-white placeholder:text-white/25 transition-colors focus:border-white/25 focus:bg-white/[0.05] focus:outline-none"
            required
          />
        </div>
        {authError && (
          <p id="login-auth-error" role="alert" className="-mt-1 text-[12px] leading-snug text-red-300/90">
            {authError}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="mt-1 min-h-11 rounded-lg bg-white px-4 py-2.5 text-[13px] font-semibold text-black transition-opacity disabled:opacity-40"
        >
          {loading ? t("auth.loginLoading") : t("auth.login")}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-white/30">
        <div className="h-px flex-1 bg-white/[0.08]" />
        <span>or</span>
        <div className="h-px flex-1 bg-white/[0.08]" />
      </div>

      <OAuthButtons
        flow="login"
        loading={loading}
        nextPath={nextPath}
        onError={(message) => setError(message || null)}
        onLoadingChange={setLoading}
      />

      <button
        type="button"
        onClick={handleGuest}
        disabled={loading}
        className="mt-2.5 min-h-11 w-full rounded-lg border border-white/[0.08] bg-transparent px-4 py-2.5 text-[13px] text-white/70 transition-colors hover:border-white/20 hover:text-white disabled:opacity-40"
      >
        {t("auth.guestContinue")}
      </button>

      <div className="mt-6 flex items-center justify-between gap-2 text-[12px] text-white/45">
        <Link href="/forgot-password" className="transition-colors hover:text-white/80">
          {t("auth.forgotPasswordLink") ?? "비밀번호를 잊으셨나요?"}
        </Link>
        <Link href={signupHref} className="font-medium text-white/80 transition-colors hover:text-white">
          {t("auth.signupLink")} →
        </Link>
      </div>

      {/* Signal × 1Password-style trust footer */}
      <SecurityBadge />
    </motion.div>
  );
}
