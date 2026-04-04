"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useTranslations } from "@/components/i18n-provider";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const { t } = useTranslations();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="theme-panel w-full max-w-md rounded-3xl p-6 text-left shadow-[0_0_80px_rgba(80,128,255,0.08)]">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
            {t("auth.forgotPasswordEyebrow") ?? "Password Reset"}
          </p>
          <h1 className="mt-3 text-2xl font-semibold">
            {t("auth.resetEmailSentTitle") ?? "Check your email"}
          </h1>
          <p className="theme-text-subtle mt-3 text-sm leading-6">
            {t("auth.resetEmailSentBody") ?? `We sent a password reset link to ${email}. Check your inbox and follow the link to reset your password.`}
          </p>
        </div>
        <Link
          href="/login"
          className="block min-h-12 rounded-xl bg-[color:var(--foreground)] px-4 py-3 text-center text-base font-medium text-[color:var(--background)]"
        >
          {t("auth.backToLogin") ?? "Back to Login"}
        </Link>
      </div>
    );
  }

  return (
    <div className="theme-panel w-full max-w-md rounded-3xl p-6 text-left shadow-[0_0_80px_rgba(80,128,255,0.08)]">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
          {t("auth.forgotPasswordEyebrow") ?? "Password Reset"}
        </p>
        <h1 className="mt-3 text-2xl font-semibold">
          {t("auth.forgotPasswordTitle") ?? "Forgot your password?"}
        </h1>
        <p className="theme-text-subtle mt-3 text-sm leading-6">
          {t("auth.forgotPasswordSubtitle") ?? "Enter your email and we'll send you a link to reset your password."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="reset-email" className="mb-2 block text-sm font-medium text-white/88">
            {t("auth.email") ?? "Email"}
          </label>
          <input
            id="reset-email"
            type="email"
            placeholder={t("auth.email") ?? "Email"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="theme-input min-h-12 w-full rounded-xl px-4 py-3 text-base placeholder:text-[color:var(--theme-text-faint)]"
            required
          />
        </div>
        {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="min-h-12 rounded-xl bg-[color:var(--foreground)] px-4 py-3 text-base font-medium text-[color:var(--background)] disabled:opacity-50"
        >
          {loading
            ? (t("auth.sendingReset") ?? "Sending...")
            : (t("auth.sendResetLink") ?? "Send Reset Link")}
        </button>
      </form>

      <div className="mt-4 text-sm theme-text-faint">
        <Link href="/login" className="hover:text-[color:var(--foreground)]">
          {t("auth.backToLogin") ?? "Back to Login"}
        </Link>
      </div>
    </div>
  );
}
