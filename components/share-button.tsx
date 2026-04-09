"use client";

import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Share2 } from "lucide-react";

interface ShareButtonProps {
  url: string;
  title?: string;
  text?: string;
}

/**
 * Share button with Web Share API support and clipboard fallback.
 * On mobile devices with native share, opens the system share sheet.
 * On desktop, copies the URL to the clipboard and shows a brief toast.
 */
export function ShareButton({ url, title, text }: ShareButtonProps) {
  const [toastVisible, setToastVisible] = useState(false);

  const handleShare = useCallback(async () => {
    // Try native share (available on most mobile browsers)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url,
        });
        return;
      } catch (err) {
        // User cancelled or share failed — fall through to clipboard
        if ((err as DOMException)?.name === "AbortError") return;
      }
    }

    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Last-resort fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
  }, [url, title, text]);

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        aria-label="공유하기"
        className="inline-flex items-center justify-center rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white active:scale-95"
      >
        <Share2 className="h-5 w-5" />
      </button>

      {/* Toast */}
      <AnimatePresence>
        {toastVisible && (
          <motion.div
            role="status"
            aria-live="polite"
            className="fixed bottom-20 left-1/2 z-[100] -translate-x-1/2 rounded-full bg-white/15 px-4 py-2 text-sm text-white/90 backdrop-blur-lg"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
          >
            링크가 복사되었습니다
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
