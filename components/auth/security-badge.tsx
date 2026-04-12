"use client";

import { motion } from "framer-motion";
import { useTranslations } from "@/components/i18n-provider";

/**
 * Signal × 1Password-style security assurance footer for the auth screens.
 * Communicates the actual, concrete guarantees (no plaintext password logs,
 * row-level security, rate-limiting) so visitors don't have to trust copy
 * alone. Designed to sit at the bottom of the login/signup card.
 */

export function SecurityBadge() {
  const { t } = useTranslations();

  const items: Array<{ icon: string; label: string }> = [
    { icon: "🔒", label: t("auth.securityE2e") },
    { icon: "🛡️", label: t("auth.securityRls") },
    { icon: "⚡", label: t("auth.securityRateLimit") },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="mt-5 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.04] px-3.5 py-3"
      role="status"
    >
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-200/80">
          {t("auth.securityTitle")}
        </span>
      </div>
      <ul className="mt-2 space-y-1 text-[11px] leading-[1.5] text-white/55">
        {items.map((item) => (
          <li key={item.label} className="flex items-start gap-1.5">
            <span aria-hidden="true" className="text-emerald-300/80">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
