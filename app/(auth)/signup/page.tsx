"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CLIENT_EVENT } from "@/lib/analytics/catalog";
import { trackClientEvent } from "@/lib/analytics/client";

export default function SignupPage() {
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    trackClientEvent(CLIENT_EVENT.signupStarted, { method: "password", ref: refCode ?? undefined });
    const { data, error: err } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (err) {
      trackClientEvent(CLIENT_EVENT.authFailed, { method: "password", stage: "signup" });
      setError(err.message);
      return;
    }
    if (refCode && data?.user) {
      await fetch("/api/invite/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: refCode }),
      }).catch(() => {});
    }
    trackClientEvent(CLIENT_EVENT.signupCompleted, { method: "password" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-left shadow-[0_0_80px_rgba(80,128,255,0.08)]">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">START YOUR GYEOL</p>
        <h1 className="mt-3 text-2xl font-semibold">나만의 AI 존재를 시작하세요</h1>
        <p className="mt-3 text-sm leading-6 text-white/65">
          첫 대화가 첫 기억이 되고, 그 기억이 감정과 성장의 흔적으로 남는 경험을 지금 시작할 수 있습니다.
        </p>
      </div>

      <div className="mb-6 grid gap-2">
        <div className="rounded-2xl border border-white/10 bg-black/25 p-3 text-sm text-white/75">
          가입 후 바로 나만의 결을 만들고 첫 대화를 시작합니다.
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/25 p-3 text-sm text-white/75">
          활동과 앨범, 소셜 흐름에서 시간이 지나며 달라지는 흔적을 확인할 수 있습니다.
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder:text-white/45"
          required
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder:text-white/45"
          required
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-white px-4 py-3 font-medium text-black disabled:opacity-50"
        >
          {loading ? "가입 중..." : "무료로 시작하기"}
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-white/55">
        <Link href="/login" className="hover:text-white/80">
          로그인으로 돌아가기
        </Link>
        <Link href="/features" className="hover:text-white/80">
          기능 소개 보기
        </Link>
      </div>
    </div>
  );
}
