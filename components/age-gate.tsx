"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "@/components/i18n-provider";
import { haptic } from "@/lib/micro-interactions";
import type { AgeGroup } from "@/lib/safety/age-gate";

type AgeGateProps = {
  onComplete: (params: { ageGroup: AgeGroup; guardianConsent: boolean; parentEmail?: string }) => void | Promise<void>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AgeGate({ onComplete }: AgeGateProps) {
  const { t } = useTranslations();
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<AgeGroup | null>(null);
  const [guardianConsent, setGuardianConsent] = useState(false);
  const [parentEmail, setParentEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const needsGuardianConsent = selectedAgeGroup === "under_13";
  const isValidParentEmail = EMAIL_RE.test(parentEmail.trim());
  const canContinue = useMemo(() => {
    if (!selectedAgeGroup) return false;
    if (needsGuardianConsent) return guardianConsent && isValidParentEmail;
    return true;
  }, [guardianConsent, isValidParentEmail, needsGuardianConsent, selectedAgeGroup]);

  async function handleContinue() {
    if (!selectedAgeGroup || !canContinue) return;
    haptic("tap");
    setLoading(true);
    try {
      await onComplete({
        ageGroup: selectedAgeGroup,
        guardianConsent,
        parentEmail: needsGuardianConsent ? parentEmail.trim() : undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 px-4" role="dialog" aria-modal="true" aria-labelledby="age-gate-title">
      <motion.section
        className="w-full max-w-xl rounded-[2rem] border border-white/15 bg-black/75 p-6 shadow-[0_0_80px_rgba(34,211,238,0.12)] backdrop-blur-xl sm:p-8"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-cyan-100/85">
          {t("ageGate.eyebrow")}
        </p>
        <h1 id="age-gate-title" className="mt-3 text-3xl font-semibold tracking-tight text-white">
          {t("ageGate.title")}
        </h1>
        <p className="mt-4 text-base leading-7 text-white/82">
          {t("ageGate.body")}
        </p>

        <div className="mt-6 grid gap-3">
          {([
            { key: "under_13", title: t("ageGate.under13"), body: t("ageGate.under13Body") },
            { key: "teen", title: t("ageGate.teen"), body: t("ageGate.teenBody") },
            { key: "adult", title: t("ageGate.adult"), body: t("ageGate.adultBody") },
          ] as const).map((option) => {
            const active = selectedAgeGroup === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => {
                  haptic("tap");
                  setSelectedAgeGroup(option.key);
                }}
                className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                  active
                    ? "border-cyan-300/35 bg-cyan-400/12 text-white"
                    : "border-white/10 bg-white/[0.04] text-white/88 hover:bg-white/[0.07]"
                }`}
              >
                <p className="text-base font-medium">{option.title}</p>
                <p className="mt-2 text-sm leading-6 text-white/72">{option.body}</p>
              </button>
            );
          })}
        </div>

        {needsGuardianConsent && (
          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-4">
              <label className="flex items-start gap-3 text-sm text-amber-50">
                <input
                  type="checkbox"
                  checked={guardianConsent}
                  onChange={(event) => setGuardianConsent(event.target.checked)}
                  className="mt-1 h-5 w-5 rounded border-white/20 bg-black"
                  aria-label={t("ageGate.guardianConsent")}
                />
                <span className="leading-6">{t("ageGate.guardianConsent")}</span>
              </label>
              <div className="mt-3">
                <label htmlFor="parent-email" className="block text-xs font-medium text-amber-100/80">
                  {t("ageGate.parentEmailLabel")}
                </label>
                <input
                  id="parent-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  placeholder={t("ageGate.parentEmailPlaceholder")}
                  className="mt-1.5 w-full rounded-xl border border-amber-300/20 bg-black/50 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-amber-300/40 focus:outline-none focus:ring-1 focus:ring-amber-300/30"
                  aria-describedby="parent-email-hint"
                />
                <p id="parent-email-hint" className="mt-1.5 text-xs text-amber-100/50 leading-5">
                  {t("ageGate.parentEmailHint")}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-sm font-medium text-white">{t("ageGate.publicSocialTitle")}</p>
          <p className="mt-2 text-sm leading-6 text-white/72">
            {selectedAgeGroup === "adult"
              ? t("ageGate.publicSocialAdult")
              : t("ageGate.publicSocialMinor")}
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            disabled={!canContinue || loading}
            onClick={() => void handleContinue()}
            className="min-h-12 rounded-full bg-cyan-400 px-6 text-base font-semibold text-black transition-colors hover:bg-cyan-300 disabled:opacity-50"
          >
            {loading ? t("common.loading") : t("ageGate.continue")}
          </button>
        </div>
      </motion.section>
    </div>
  );
}
