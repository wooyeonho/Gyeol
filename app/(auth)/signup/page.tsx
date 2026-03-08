"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError("비밀번호가 일치하지 않습니다."); return; }
    if (password.length < 6) { setError("비밀번호는 6자 이상이어야 합니다."); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (err) {
      setError(
        err.message === "User already registered"
          ? "이미 가입된 이메일입니다."
          : err.message
      );
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/"), 2000);
  }

  if (done) {
    return (
      <div className="relative text-center space-y-5">
        <div
          className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-2xl font-light"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          ✦
        </div>
        <div>
          <h2 className="text-white/80 text-lg font-light">존재가 깨어나고 있습니다</h2>
          <p className="text-white/30 text-sm mt-2">잠시 후 홈으로 이동합니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-sm">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-light tracking-[0.4em] text-white mb-2">결</h1>
        <p className="text-white/30 text-xs tracking-wider">새로운 생명을 시작하다</p>
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
          placeholder="비밀번호 (6자 이상)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm placeholder-white/25 focus:outline-none focus:border-white/25 focus:bg-white/[0.07] transition-all"
        />
        <input
          type="password"
          placeholder="비밀번호 확인"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm placeholder-white/25 focus:outline-none focus:border-white/25 focus:bg-white/[0.07] transition-all"
        />

        {error && (
          <p className="text-red-400/80 text-xs text-center px-2 py-1">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !email || !password || !confirm}
          className="w-full py-4 rounded-2xl text-sm font-light tracking-wider transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          {loading ? (
            <span className="inline-block w-4 h-4 border border-white/30 border-t-white/80 rounded-full animate-spin" />
          ) : (
            "가입하기"
          )}
        </button>
      </form>

      <p className="text-center text-white/30 text-xs mt-6">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="text-white/60 hover:text-white/80 underline underline-offset-4 transition-colors">
          로그인
        </Link>
      </p>
    </div>
  );
}
