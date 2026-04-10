"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ExportModalProps {
  locale?: string;
}

export function ExportModal({ locale = "ko" }: ExportModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<"markdown" | "json" | null>(null);
  const isKo = locale === "ko";

  const handleExport = async (format: "markdown" | "json") => {
    setLoading(format);
    try {
      const res = await fetch(`/api/export/conversations?format=${format}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = format === "json"
        ? `gyeol-conversations-${Date.now()}.json`
        : `gyeol-conversations-${Date.now()}.md`;
      a.click();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch {
      // ignore
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/50 hover:bg-white/[0.08] hover:text-white/70 transition-colors"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {isKo ? "내보내기" : "Export"}
      </button>

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
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f0f14] p-5"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-semibold text-white mb-1">
                {isKo ? "대화 내보내기" : "Export Conversations"}
              </h3>
              <p className="text-xs text-white/40 mb-4">
                {isKo
                  ? "크리처와 나눈 대화를 파일로 저장해요"
                  : "Save your conversations with the creature as a file"}
              </p>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleExport("markdown")}
                  disabled={loading !== null}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left hover:bg-white/[0.08] transition-colors disabled:opacity-50"
                >
                  <span className="text-xl">📝</span>
                  <div>
                    <p className="text-sm font-medium text-white">Markdown (.md)</p>
                    <p className="text-xs text-white/40">
                      {isKo ? "읽기 편한 문서 형식" : "Human-readable document format"}
                    </p>
                  </div>
                  {loading === "markdown" && (
                    <div className="ml-auto w-4 h-4 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
                  )}
                </button>

                <button
                  onClick={() => handleExport("json")}
                  disabled={loading !== null}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left hover:bg-white/[0.08] transition-colors disabled:opacity-50"
                >
                  <span className="text-xl">📊</span>
                  <div>
                    <p className="text-sm font-medium text-white">JSON (.json)</p>
                    <p className="text-xs text-white/40">
                      {isKo ? "구조화된 데이터 형식" : "Structured data format"}
                    </p>
                  </div>
                  {loading === "json" && (
                    <div className="ml-auto w-4 h-4 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
                  )}
                </button>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="mt-3 w-full rounded-xl border border-white/8 py-2 text-xs text-white/30 hover:text-white/50 transition-colors"
              >
                {isKo ? "닫기" : "Close"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
