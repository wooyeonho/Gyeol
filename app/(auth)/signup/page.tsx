"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setSuccess(true);
    setTimeout(() => {
      router.push("/login");
      router.refresh();
    }, 2000);
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 mx-auto mb-4 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold">가입 완료</h2>
        <p className="text-sm text-white/40 mt-1">로그인 페이지로 이동합니다...</p>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-8 text-center">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">회원가입</h1>
        <p className="text-sm text-white/40 mt-1.5">새로운 생명을 시작해보세요</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full glass rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-all duration-200"
          required
        />
        <input
          type="password"
          placeholder="비밀번호 (6자 이상)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          className="w-full glass rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-all duration-200"
          required
        />

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-400 text-xs bg-red-500/10 rounded-lg px-3 py-2"
          >
            {error}
          </motion.p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl gradient-accent text-white text-sm font-medium transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-accent/20"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1 h-1 rounded-full bg-white" style={{ animation: "dot-pulse 1.2s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
              ))}
            </span>
          ) : "가입하기"}
        </button>
      </form>

      <Link
        href="/login"
        className="text-xs text-white/30 hover:text-white/50 transition-colors"
      >
        이미 계정이 있으신가요? <span className="text-accent-light/60 hover:text-accent-light/80">로그인</span>
      </Link>
    </div>
  );
}
