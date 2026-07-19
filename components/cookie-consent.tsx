"use client";



import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "@/components/i18n-provider";

const COOKIE_CONSENT_KEY = "gyeol_cookie_consent_v1";

/**
 * GDPR cookie consent banner.
 * Shows once; stores preference in localStorage.
 * Required for EU compliance with analytics cookies.
 * Supports Korean and English text.
 */
export function CookieConsent() {
  const { t, locale } = useTranslations();
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

  // `t()` returns the raw key when a string is missing, so `||` never hits
  // the fallback. Check for the key itself to keep fallbacks usable even if
  // i18n files drift.
  const isKo = locale === "ko";
  const tr = (key: string, fallback: string) => {
    const v = t(key);
    return v && v !== key ? v : fallback;
  };
  const message = tr(
    "cookie.message",
    isKo
      ? "GYEOL은 사용자 경험 개선과 분석을 위해 쿠키를 사용합니다. 비필수 쿠키를 수락하거나 거부할 수 있습니다."
      : "We use cookies to improve your experience and analyze usage. You can accept or decline non-essential cookies.",
  );
  const acceptLabel = tr("cookie.accept", isKo ? "수락" : "Accept");
  const declineLabel = tr("cookie.decline", isKo ? "거부" : "Decline");
  const learnMoreLabel = tr("cookie.learnMore", isKo ? "자세히 알아보기" : "Learn more");
  const titleLabel = tr("cookie.title", isKo ? "쿠키 동의" : "Cookie consent");

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
          aria-label={titleLabel}
        >
          <p className="text-sm text-white/80 leading-relaxed mb-3">
            {message}
          </p>
          <div className="flex items-center gap-3 justify-between">
            <a
              href="https://gyeol.app/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-white/50 hover:text-white/80 underline underline-offset-2 transition-colors"
            >
              {learnMoreLabel}
            </a>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={decline}
                className="rounded-full px-4 py-2 text-xs font-medium text-white/60 hover:text-white/90 transition-colors"
              >
                {declineLabel}
              </button>
              <button
                type="button"
                onClick={accept}
                className="rounded-full bg-white/15 px-5 py-2 text-xs font-semibold text-white hover:bg-white/25 transition-colors"
              >
                {acceptLabel}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
