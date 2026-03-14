"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { useTranslations } from "@/components/i18n-provider";
import { IdentityPresence } from "@/components/identity-presence";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";
import type { CompareResult } from "@/app/api/compare/route";

export default function ComparePage() {
  const { locale, t } = useTranslations();
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function loadMatch() {
    setLoading(true);
    setError(null);
    fetch("/api/compare")
      .then((r) => {
        if (r.status === 401) throw new Error("auth");
        if (r.status === 404) throw new Error("no_opponent");
        if (!r.ok) throw new Error("fetch");
        return r.json();
      })
      .then((d: CompareResult) => setResult(d))
      .catch((e: Error) => {
        if (e.message === "auth") setError(t("compare.authError"));
        else if (e.message === "no_opponent") setError(t("compare.noOpponent"));
        else setError(t("compare.loadError"));
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadMatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-sm text-white/60">{t("compare.matching")}</span>
          <span className="w-3 h-3 rounded-full bg-rose-400 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black px-4 pb-24 pt-20 text-white">
        <div className="mx-auto max-w-lg text-center">
          <p className="text-white/60 mb-4">{error}</p>
          <Link
            href="/"
            className="rounded-full bg-white/10 px-5 py-2 text-sm font-medium text-white"
          >
            {t("compare.backHome")}
          </Link>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!result) return null;

  const myAppearance = resolveIdentityAppearance(
    {
      selfName: result.mine.self_name,
      visual: result.mine.visual,
      config: result.mine.config,
      genLevel: result.mine.gen_level,
      vitality: result.mine.vitality,
    },
    locale
  );

  const oppAppearance = resolveIdentityAppearance(
    {
      selfName: result.opponent.self_name,
      visual: result.opponent.visual,
      config: result.opponent.config,
      genLevel: result.opponent.gen_level,
      vitality: result.opponent.vitality,
    },
    locale
  );

  const myColor = result.mine.visual?.color ?? myAppearance.palette.primary;
  const oppColor = result.opponent.visual?.color ?? oppAppearance.palette.primary;

  return (
    <div className="min-h-screen bg-black px-4 pb-24 pt-20 text-white">
      <div className="mx-auto max-w-lg">
        <header className="mb-6 text-center">
          <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/70">
            {t("compare.eyebrow")}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {t("compare.title")}
          </h1>
        </header>

        {/* VS Header */}
        <div className="mb-6 flex items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <IdentityPresence appearance={myAppearance} size="md" />
            <p className="text-sm font-medium text-white truncate max-w-[120px]">
              {result.mine.self_name || (locale === "ko" ? "나" : "Me")}
            </p>
          </div>
          <div className="text-2xl font-bold text-white/30">VS</div>
          <div className="flex flex-col items-center gap-2">
            <IdentityPresence appearance={oppAppearance} size="md" />
            <p className="text-sm font-medium text-white truncate max-w-[120px]">
              {result.opponent.self_name || (locale === "ko" ? "상대" : "Opponent")}
            </p>
          </div>
        </div>

        {/* Axes comparison */}
        <div className="space-y-4 mb-6">
          {result.axes.map((axis) => {
            const total = axis.mine + axis.opponent || 1;
            const myPct = Math.round((axis.mine / total) * 100);
            const oppPct = 100 - myPct;

            return (
              <div key={axis.key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-3 flex items-center justify-between text-xs text-white/50">
                  <span>{axis.label}</span>
                  <span>
                    {axis.winner === "mine"
                      ? "⬅"
                      : axis.winner === "opponent"
                        ? "➡"
                        : "="}
                  </span>
                </div>

                {/* Bar */}
                <div className="flex h-8 overflow-hidden rounded-xl">
                  <div
                    className="flex items-center justify-center text-xs font-medium transition-all duration-500"
                    style={{
                      width: `${Math.max(myPct, 15)}%`,
                      background: `${myColor}40`,
                      color: myColor,
                    }}
                  >
                    {axis.mine}
                  </div>
                  <div
                    className="flex items-center justify-center text-xs font-medium transition-all duration-500"
                    style={{
                      width: `${Math.max(oppPct, 15)}%`,
                      background: `${oppColor}40`,
                      color: oppColor,
                    }}
                  >
                    {axis.opponent}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Verdict */}
        <div
          className="mb-6 rounded-2xl border p-6 text-center"
          style={{
            borderColor:
              result.verdict.winner === "mine"
                ? `${myColor}40`
                : result.verdict.winner === "opponent"
                  ? `${oppColor}40`
                  : "rgba(255,255,255,0.15)",
            background:
              result.verdict.winner === "mine"
                ? `${myColor}10`
                : result.verdict.winner === "opponent"
                  ? `${oppColor}10`
                  : "rgba(255,255,255,0.03)",
          }}
        >
          <p className="text-lg font-semibold">
            {result.verdict.winner === "mine"
              ? t("compare.youWin")
              : result.verdict.winner === "opponent"
                ? t("compare.opponentWins")
                : t("compare.tie")}
          </p>
          <p className="mt-1 text-sm text-white/50">
            {result.verdict.winner === "mine"
              ? t("compare.youWinBody")
              : result.verdict.winner === "opponent"
                ? t("compare.opponentWinsBody")
                : t("compare.tieBody")}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={loadMatch}
            className="flex-1 rounded-xl bg-cyan-500/20 border border-cyan-400/30 py-3 text-center text-sm font-medium text-cyan-200 hover:bg-cyan-500/30"
          >
            {t("compare.rematch")}
          </button>
          <Link
            href="/leaderboard"
            className="flex-1 rounded-xl bg-white/5 border border-white/10 py-3 text-center text-sm font-medium text-white/70 hover:text-white"
          >
            {t("compare.viewLeaderboard")}
          </Link>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
