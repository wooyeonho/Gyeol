"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      setError(
        err.message === "Invalid login credentials"
          ? "이메일 또는 비밀번호가 올바르지 않습니다."
          : err.message
      );
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function handleGuest() {
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.signInAnonymously();
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative w-full max-w-sm">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-light tracking-[0.4em] text-white mb-2">결</h1>
        <p className="text-white/30 text-xs tracking-[0.3em] uppercase">GYEOL</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm placeholder-white/25 focus:outline-none focus:border-white/25 focus:bg-white/[0.07] transition-all"
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm placeholder-white/25 focus:outline-none focus:border-white/25 focus:bg-white/[0.07] transition-all"
        />

        {error && (
          <p className="text-red-400/80 text-xs text-center px-2 py-1">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !email || !password}
          className="w-full py-4 rounded-2xl text-sm font-light tracking-wider transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          {loading ? (
            <span className="inline-block w-4 h-4 border border-white/30 border-t-white/80 rounded-full animate-spin" />
          ) : (
            "로그인"
          )}
        </button>
      </form>

      <div className="mt-4 space-y-3">
        <button
          type="button"
          onClick={handleGuest}
          disabled={loading}
          className="w-full py-3.5 rounded-2xl text-xs text-white/40 hover:text-white/60 transition-colors disabled:opacity-40"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          게스트로 시작하기
        </button>

        <p className="text-center text-white/30 text-xs">
          아직 계정이 없으신가요?{" "}
          <Link href="/signup" className="text-white/60 hover:text-white/80 underline underline-offset-4 transition-colors">
            가입하기
          </Link>
        </p>
      </div>
    </div>
  );
}
