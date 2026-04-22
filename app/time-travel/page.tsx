"use client";

import { useState, useCallback } from "react";
import TimeTravelChat from "@/components/time-travel-chat";
import Link from "next/link";
import { useTranslations } from "@/components/i18n-provider";
import { BottomNav } from "@/components/bottom-nav";

export default function TimeTravelPage() {
  const { t } = useTranslations();
  const [targetDate, setTargetDate] = useState("");
  const [started, setStarted] = useState(false);
  const [capsuleMsg, setCapsuleMsg] = useState("");
  const [capsuleSaving, setCapsuleSaving] = useState(false);
  const [capsuleSaved, setCapsuleSaved] = useState(false);

  const handleCreateCapsule = useCallback(async () => {
    if (!capsuleMsg.trim()) return;
    setCapsuleSaving(true);
    try {
      const deliverAt = new Date();
      deliverAt.setMonth(deliverAt.getMonth() + 6);
      const res = await fetch("/api/time-capsule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: capsuleMsg, deliver_at: deliverAt.toISOString() }),
      });
      if (res.ok) { setCapsuleSaved(true); setCapsuleMsg(""); }
    } catch { /* non-critical */ }
    setCapsuleSaving(false);
  }, [capsuleMsg]);

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const defaultDate = threeMonthsAgo.toISOString().slice(0, 10);

  return (
    <div className="theme-page min-h-screen p-4 pb-24">
      <div className="max-w-lg mx-auto">
        <h1 className="text-xl font-semibold mb-2">{t("timeTravel.title")}</h1>
        <p className="text-white/50 text-sm mb-6">{t("timeTravel.subtitle")}</p>
        {!started ? (
          <div className="space-y-4">
            <label className="block text-sm text-white/70">{t("timeTravel.targetDate")}</label>
            <input
              type="date"
              value={targetDate || defaultDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white"
            />
            <button
              type="button"
              onClick={() => setStarted(true)}
              className="w-full rounded-xl bg-white/10 py-3 font-medium text-white"
            >
              {t("timeTravel.start")}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <TimeTravelChat
              targetDate={targetDate || defaultDate}
              onClose={() => setStarted(false)}
            />
            <button
              type="button"
              onClick={() => setStarted(false)}
              className="w-full rounded-xl bg-white/5 py-2 text-sm text-white/70"
            >
              {t("timeTravel.pickAnother")}
            </button>
          </div>
        )}
        {/* Time Capsule: leave a message for your future self */}
        <div className="mt-8 glass-card rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-medium text-white/80">{t("timeTravel.capsuleTitle") || "타임 캡슐"}</h2>
          <p className="text-xs text-white/50">{t("timeTravel.capsuleDesc") || "미래의 나에게 메시지를 보내세요"}</p>
          <textarea
            value={capsuleMsg}
            onChange={(e) => setCapsuleMsg(e.target.value)}
            placeholder={t("timeTravel.capsulePlaceholder") || "6개월 뒤에 열릴 메시지..."}
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/30 min-h-[80px] resize-none"
            maxLength={500}
          />
          {capsuleSaved ? (
            <p className="text-xs text-emerald-300">{t("timeTravel.capsuleSaved") || "캡슐이 저장되었습니다!"}</p>
          ) : (
            <button
              type="button"
              onClick={handleCreateCapsule}
              disabled={capsuleSaving || !capsuleMsg.trim()}
              className="w-full rounded-xl bg-white/10 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {capsuleSaving ? "..." : (t("timeTravel.capsuleSend") || "캡슐 보내기")}
            </button>
          )}
        </div>
        <div className="mt-6">
          <Link href="/" className="text-white/50 text-sm hover:text-white/80">
            {t("timeTravel.backHome")}
          </Link>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
