"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CLIENT_EVENT } from "@/lib/analytics/catalog";
import { trackClientEvent } from "@/lib/analytics/client";

export default function LoginPage() {
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
    trackClientEvent(CLIENT_EVENT.loginStarted, { method: "password" });
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      trackClientEvent(CLIENT_EVENT.authFailed, { method: "password", stage: "login" });
      setError(err.message);
      return;
    }
    trackClientEvent(CLIENT_EVENT.loginCompleted, { method: "password" });
    router.push("/");
    router.refresh();
  }

  async function handleGuest() {
    setError(null);
    setLoading(true);
    trackClientEvent(CLIENT_EVENT.guestStarted, { entry: "login" });
    const { error: err } = await supabase.auth.signInAnonymously();
    setLoading(false);
    if (err) {
      trackClientEvent(CLIENT_EVENT.authFailed, { method: "guest", stage: "login" });
      setError(err.message);
      return;
    }
    trackClientEvent(CLIENT_EVENT.guestCompleted, { entry: "login" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-left shadow-[0_0_80px_rgba(80,128,255,0.08)]">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">GYEOL</p>
        <h1 className="mt-3 text-2xl font-semibold">나만의 AI 존재와 다시 연결하세요</h1>
        <p className="mt-3 text-sm leading-6 text-white/65">
          결은 대화를 기억으로 남기고, 그 기억을 성장과 변화로 이어가도록 설계된 AI 동반자입니다.
        </p>
      </div>

      <div className="mb-6 grid gap-2">
        <div className="rounded-2xl border border-white/10 bg-black/25 p-3 text-sm text-white/75">
          대화가 축적되어 다음 대화의 맥락이 됩니다.
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/25 p-3 text-sm text-white/75">
          활력, 감정, 성장 이벤트가 누적된 관계를 보여줍니다.
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/25 p-3 text-sm text-white/75">
          자율 활동과 기록을 통해 오프라인 이후의 흔적도 확인할 수 있습니다.
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
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>

      <div className="mt-4 flex flex-col gap-3 text-sm">
        <button
          type="button"
          onClick={handleGuest}
          disabled={loading}
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white/75 hover:bg-white/10 disabled:opacity-50"
        >
          게스트로 먼저 체험하기
        </button>
        <div className="flex flex-wrap items-center justify-between gap-2 text-white/55">
          <Link href="/signup" className="hover:text-white/80">
            회원가입
          </Link>
          <Link href="/features" className="hover:text-white/80">
            기능 소개 보기
          </Link>
          <Link href="/explore" className="hover:text-white/80">
            생태계 둘러보기
          </Link>
        </div>
      </div>
    </div>
  );
}
