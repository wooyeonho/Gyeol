"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "@/components/i18n-provider";

const COOKIE_CONSENT_KEY = "gyeol-cookie-consent";

/**
 * GDPR cookie consent banner.
 * Shows once; stores preference in localStorage.
 * Required for EU compliance with analytics cookies.
 */
export function CookieConsent() {
  const { t } = useTranslations();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(COOKIE_CONSENT_KEY)) {
        setVisible(true);
      }
    } catch {
      // Private browsing — show banner
      setVisible(true);
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    } catch {}
    setVisible(false);
  }

  function decline() {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, "declined");
    } catch {}
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed bottom-20 left-4 right-4 z-[90] mx-auto max-w-lg rounded-2xl border border-white/10 bg-black/90 px-5 py-4 backdrop-blur-xl shadow-2xl"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          role="dialog"
          aria-label={t("cookie.title") || "Cookie consent"}
        >
          <p className="text-sm text-white/80 leading-relaxed mb-3">
            {t("cookie.message") || "We use cookies to improve your experience and analyze usage. You can accept or decline non-essential cookies."}
          </p>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={decline}
              className="rounded-full px-4 py-2 text-xs font-medium text-white/60 hover:text-white/90 transition-colors"
            >
              {t("cookie.decline") || "Decline"}
            </button>
            <button
              type="button"
              onClick={accept}
              className="rounded-full bg-white/15 px-5 py-2 text-xs font-semibold text-white hover:bg-white/25 transition-colors"
            >
              {t("cookie.accept") || "Accept"}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
