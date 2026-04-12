"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { spring, layer } from "@/lib/design/tokens";
import { haptic } from "@/lib/micro-interactions";
import { useTranslations } from "@/components/i18n-provider";

interface GiftModalProps {
  targetAgentId: string;
  targetName?: string;
  open: boolean;
  onClose: () => void;
  onSuccess?: (coins: number) => void;
}

const PRESETS = [5, 10, 25, 50, 100] as const;

export function GiftModal({ targetAgentId, targetName, open, onClose, onSuccess }: GiftModalProps) {
  const { locale } = useTranslations();
  const [amount, setAmount] = useState(10);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    if (busy || amount < 1) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/social/gift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_agent_id: targetAgentId,
          coins: amount,
          message: message.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError((json?.error as string) || "Failed to send gift");
        return;
      }
      haptic("success");
      onSuccess?.(amount);
      setAmount(10);
      setMessage("");
      onClose();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-end sm:items-center justify-center p-4"
          style={{ zIndex: layer.modal }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            initial={{ y: 80, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.97 }}
            transition={spring.apple}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#1a1a2e] p-5 shadow-2xl"
          >
            <h3 className="text-lg font-semibold text-white/90 mb-1">
              {locale === "ko" ? "선물 보내기" : "Send Gift"}
            </h3>
            <p className="text-xs text-white/50 mb-4">
              {targetName
                ? locale === "ko"
                  ? `${targetName}에게 코인을 선물합니다`
                  : `Send coins to ${targetName}`
                : locale === "ko"
                  ? "코인을 선물합니다"
                  : "Send coins as a gift"}
            </p>

            {/* Preset amounts */}
            <div className="flex gap-2 mb-3">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => { setAmount(p); haptic("tap"); }}
                  className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${
                    amount === p
                      ? "bg-indigo-500 text-white"
                      : "bg-white/[0.06] text-white/60 hover:bg-white/[0.12]"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Custom amount */}
            <input
              type="number"
              min={1}
              max={10000}
              value={amount}
              onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/90 mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              placeholder={locale === "ko" ? "수량" : "Amount"}
            />

            {/* Message */}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={200}
              rows={2}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/90 mb-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              placeholder={locale === "ko" ? "메시지 (선택)" : "Message (optional)"}
            />

            {error && (
              <p className="text-xs text-rose-400 mb-2">{error}</p>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-sm text-white/60 hover:bg-white/[0.08]"
              >
                {locale === "ko" ? "취소" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={busy || amount < 1}
                className="flex-1 rounded-xl bg-indigo-500 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy
                  ? locale === "ko" ? "보내는 중..." : "Sending..."
                  : locale === "ko" ? `${amount} 코인 보내기` : `Send ${amount} coins`}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
