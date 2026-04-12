"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";

type InviteResponse = {
  code: string;
  url: string;
};

type ReferralStats = {
  invited: number;
  activated: number;
  coins_earned: number;
};

function ReferralApplySection() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const apply = async () => {
    if (!code.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/referral/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setStatus("success");
        setMessage(json.message ?? "코드가 적용되었습니다!");
      } else {
        setStatus("error");
        setMessage(json?.error === "Already redeemed" ? "이미 사용한 코드예요" :
          json?.error === "Invalid code" ? "유효하지 않은 코드예요" :
          json?.error === "Cannot use own code" ? "본인 코드는 사용할 수 없어요" :
          "코드 적용에 실패했어요");
      }
    } catch {
      setStatus("error");
      setMessage("네트워크 오류");
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/40">
        초대 코드 입력
      </p>
      <p className="mb-3 text-[11px] text-white/30">
        친구에게 받은 코드를 입력하면 양쪽 모두 보상을 받아요
      </p>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="초대 코드 입력"
          disabled={status === "success"}
          className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-cyan-300/40 focus:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => void apply()}
          disabled={!code.trim() || status === "loading" || status === "success"}
          className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15 disabled:opacity-40"
        >
          {status === "loading" ? "..." : status === "success" ? "완료" : "적용"}
        </button>
      </div>
      {message && (
        <p className={`mt-2 text-[11px] ${status === "success" ? "text-emerald-300" : "text-rose-300"}`}>
          {message}
        </p>
      )}
    </section>
  );
}

/**
 * Phase 3-3: My Invites.
 *
 * Shows the logged-in user's personal referral code, a copy button,
 * a one-click native share button, and a lightweight progress card
 * of how many people have redeemed the code so far. This is the
 * long-missing "invite surface" — up until now the app had an invite
 * *landing* page for new visitors but no place for existing users
 * to actually grab and share their own code.
 */
export default function InvitesPage() {
  const [invite, setInvite] = useState<InviteResponse | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/invite", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<InviteResponse>) : null))
      .then((data) => {
        if (!cancelled && data) setInvite(data);
        if (!cancelled && !data) setError("초대 코드를 가져올 수 없어요");
      })
      .catch(() => !cancelled && setError("네트워크 오류"));

    fetch("/api/referral/stats", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<ReferralStats>) : null))
      .then((data) => {
        if (!cancelled && data) setStats(data);
      })
      .catch(() => {
        /* stats are optional */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const copy = useCallback(async () => {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("복사 실패");
    }
  }, [invite]);

  const share = useCallback(async () => {
    if (!invite) return;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: "GYEOL",
          text: "나만의 디지털 생명체를 만나봐. 함께 키워보자!",
          url: invite.url,
        });
      } catch {
        /* user canceled */
      }
    } else {
      void copy();
    }
  }, [invite, copy]);

  return (
    <main className="min-h-screen bg-black px-4 pt-16 pb-28 text-white">
      <div className="mx-auto max-w-lg space-y-5">
        <header className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-cyan-300">Invite</p>
          <h1 className="mt-1 text-2xl font-semibold">친구 초대</h1>
          <p className="mt-1 text-sm text-white/50">
            친구가 가입하면 둘 다 코인 보상을 받아요
          </p>
        </header>

        {/* Code card */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-cyan-300/20 bg-cyan-400/[0.05] p-5 shadow-[0_0_60px_rgba(34,211,238,0.08)]"
        >
          <p className="text-[11px] uppercase tracking-wider text-cyan-100/70">내 초대 코드</p>
          <div className="mt-2 flex items-center gap-2">
            <p className="flex-1 truncate text-2xl font-semibold tracking-wider text-white">
              {invite?.code ?? "········"}
            </p>
            {invite && (
              <button
                type="button"
                onClick={copy}
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/85 hover:bg-white/10"
              >
                {copied ? "복사됨 ✓" : "복사"}
              </button>
            )}
          </div>
          {invite && (
            <p className="mt-2 truncate text-[11px] text-cyan-100/50">{invite.url}</p>
          )}
          {error && <p className="mt-2 text-[11px] text-rose-300">{error}</p>}

          <div className="mt-4 flex gap-2">
            <motion.button
              type="button"
              onClick={share}
              disabled={!invite}
              whileTap={{ scale: 0.96 }}
              className="flex-1 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-40"
            >
              공유하기
            </motion.button>
            <Link
              href="/community"
              className="rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white/75 hover:bg-white/10"
            >
              커뮤니티
            </Link>
          </div>
        </motion.section>

        {/* Apply referral code */}
        <ReferralApplySection />

        {/* Reward progress */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">
            보상 진행도
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white/[0.04] p-3">
              <p className="text-[10px] text-white/40">초대함</p>
              <p className="mt-1 text-lg font-semibold text-white/85">
                {stats?.invited ?? 0}
              </p>
            </div>
            <div className="rounded-xl bg-white/[0.04] p-3">
              <p className="text-[10px] text-white/40">가입 완료</p>
              <p className="mt-1 text-lg font-semibold text-emerald-300">
                {stats?.activated ?? 0}
              </p>
            </div>
            <div className="rounded-xl bg-white/[0.04] p-3">
              <p className="text-[10px] text-white/40">획득 코인</p>
              <p className="mt-1 text-lg font-semibold text-amber-300">
                {stats?.coins_earned ?? 0}
              </p>
            </div>
          </div>
          <p className="mt-3 text-[10px] text-white/30">
            친구 한 명이 가입하면 양쪽 모두 50 코인을 받아요
          </p>
        </section>
      </div>
      <BottomNav />
    </main>
  );
}
