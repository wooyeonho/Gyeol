"use client";

import { useState } from "react";
import TimeTravelChat from "@/components/time-travel-chat";
import Link from "next/link";
import { useTranslations } from "@/components/i18n-provider";
import { BottomNav } from "@/components/bottom-nav";

export default function TimeTravelPage() {
  const { t } = useTranslations();
  const [targetDate, setTargetDate] = useState("");
  const [started, setStarted] = useState(false);

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
