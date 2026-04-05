"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";

interface Props {
  onGenerated: (url: string) => void;
  label: string;
}

/**
 * Small floating CTA that appears when a user has no AI portrait yet.
 * Triggers a single SDXL generation via /api/creature/portrait and
 * passes the resulting data-URL back to the parent.
 */
export function PortraitGenerateButton({ onGenerated, label }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/creature/portrait", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: "portrait" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 503) {
          setError("초상화 생성이 설정되지 않았어요");
        } else if (res.status === 429) {
          setError("잠시 후 다시 시도해 주세요");
        } else {
          setError(body?.error || "생성 실패");
        }
        return;
      }
      const data = await res.json();
      if (data?.url) onGenerated(data.url);
    } catch {
      setError("네트워크 오류");
    } finally {
      setLoading(false);
    }
  }, [loading, onGenerated]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.2, duration: 0.5 }}
      className="absolute bottom-24 inset-x-0 z-[3] flex flex-col items-center pointer-events-none"
    >
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="pointer-events-auto rounded-full border border-white/20 bg-black/60 backdrop-blur-md px-4 py-2 text-xs font-medium text-white/90 shadow-lg shadow-black/40 transition hover:bg-black/80 hover:border-white/30 disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-white/80 animate-ping" />
            생성 중...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <span>✨</span>
            <span>{label}</span>
          </span>
        )}
      </button>
      {error && (
        <p className="pointer-events-auto mt-2 text-[10px] text-red-300/80 bg-black/60 backdrop-blur px-2 py-1 rounded">
          {error}
        </p>
      )}
    </motion.div>
  );
}
