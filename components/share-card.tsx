"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ShareCardProps {
  agentId: string;
  creatureName: string;
  locale?: string;
}

/**
 * Share button that shows a share modal with OG card preview + copy/native share.
 */
export function ShareCard({ agentId, creatureName, locale = "ko" }: ShareCardProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const isKo = locale === "ko";

  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/profile/${agentId}`;
  const ogCardUrl = `/api/share/og-card?agentId=${agentId}&locale=${locale}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: isKo ? `${creatureName}를 만나보세요!` : `Meet ${creatureName}!`,
          text: isKo ? `GYEOL에서 나만의 크리처를 만들어보세요` : `Create your own creature on GYEOL`,
          url: shareUrl,
        });
      } catch {
        setOpen(true);
      }
    } else {
      setOpen(true);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <motion.button
        className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-white/60 hover:bg-white/10 hover:text-white/80 transition-colors"
        onClick={handleShare}
        whileTap={{ scale: 0.96 }}
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        {isKo ? "공유" : "Share"}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f0f14] p-4"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="mb-3 text-sm font-semibold text-white">
                {isKo ? "공유하기" : "Share"}
              </h3>

              {/* OG card preview */}
              <div className="mb-3 overflow-hidden rounded-xl border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ogCardUrl}
                  alt={isKo ? "공유 카드 미리보기" : "Share card preview"}
                  className="w-full"
                  loading="lazy"
                />
              </div>

              {/* URL copy */}
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-2 pl-3">
                <span className="flex-1 truncate text-xs text-white/40">{shareUrl}</span>
                <button
                  className="shrink-0 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition-colors"
                  onClick={handleCopy}
                >
                  {copied ? (isKo ? "복사됨!" : "Copied!") : (isKo ? "복사" : "Copy")}
                </button>
              </div>

              {/* Social share buttons */}
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(isKo ? `GYEOL에서 나만의 크리처를 만났어요! ${creatureName} 🌟` : `I made a creature on GYEOL! ${creatureName} 🌟`)}&url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-black py-2.5 text-xs font-medium text-white border border-white/10 hover:bg-white/5 transition-colors"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.7l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  X (Twitter)
                </a>
                <button
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-xs font-medium text-white hover:bg-white/10 transition-colors"
                  onClick={() => setOpen(false)}
                >
                  {isKo ? "닫기" : "Close"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
