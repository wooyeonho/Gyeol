"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useTranslations } from "@/components/i18n-provider";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const supabase = createClient();
  const router = useRouter();
  const { t } = useTranslations();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError(t("auth.passwordTooShort") ?? "Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError(t("auth.passwordMismatch") ?? "Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (err) {
      setError(err.message);
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/"), 2000);
  }

  if (done) {
    return (
      <div className="theme-panel w-full max-w-md rounded-3xl p-6 text-center shadow-[0_0_80px_rgba(80,128,255,0.08)]">
        <h1 className="text-2xl font-semibold">
          {t("auth.resetDoneTitle") ?? "Password updated!"}
        </h1>
        <p className="theme-text-subtle mt-3 text-sm">
          {t("auth.resetDoneBody") ?? "Redirecting you to the app..."}
        </p>
      </div>
    );
  }

  return (
    <div className="theme-panel w-full max-w-md rounded-3xl p-6 text-left shadow-[0_0_80px_rgba(80,128,255,0.08)]">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
          {t("auth.resetPasswordEyebrow") ?? "New Password"}
        </p>
        <h1 className="mt-3 text-2xl font-semibold">
          {t("auth.resetPasswordTitle") ?? "Set your new password"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="new-password" className="mb-2 block text-sm font-medium text-white/88">
            {t("auth.newPassword") ?? "New Password"}
          </label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="theme-input min-h-12 w-full rounded-xl px-4 py-3 text-base"
            required
            minLength={6}
          />
        </div>
        <div>
          <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium text-white/88">
            {t("auth.confirmPassword") ?? "Confirm Password"}
          </label>
          <input
            id="confirm-password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            className="theme-input min-h-12 w-full rounded-xl px-4 py-3 text-base"
            required
            minLength={6}
          />
        </div>
        {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="min-h-12 rounded-xl bg-[color:var(--foreground)] px-4 py-3 text-base font-medium text-[color:var(--background)] disabled:opacity-50"
        >
          {loading
            ? (t("auth.updatingPassword") ?? "Updating...")
            : (t("auth.updatePassword") ?? "Update Password")}
        </button>
      </form>
    </div>
  );
}
