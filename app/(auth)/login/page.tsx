"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

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
    if (err) { setError(err.message); return; }
    router.push("/");
    router.refresh();
  }

  async function handleGuest() {
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.signInAnonymously();
    setLoading(false);
    if (err) { setError(err.message); return; }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-8 text-center">
      <div>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/30 to-purple-500/20 mx-auto mb-5 flex items-center justify-center animate-glow-pulse"
        >
          <span className="text-2xl font-bold gradient-text">결</span>
        </motion.div>
        <h1 className="text-2xl font-bold tracking-tight">GYEOL</h1>
        <p className="text-sm text-white/40 mt-1.5">자율 진화 AI 생명체</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="relative">
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full glass rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-all duration-200"
            required
          />
        </div>
        <div className="relative">
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full glass rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-all duration-200"
            required
          />
        </div>

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
          ) : "로그인"}
        </button>
      </form>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/5" />
          <span className="text-[10px] text-white/20 uppercase tracking-wider">또는</span>
          <div className="flex-1 h-px bg-white/5" />
        </div>

        <button
          type="button"
          onClick={handleGuest}
          disabled={loading}
          className="w-full py-3 rounded-xl glass text-white/60 text-sm font-medium transition-all duration-200 hover:bg-white/10 active:scale-[0.98] disabled:opacity-50"
        >
          게스트로 시작하기
        </button>
      </div>

      <Link
        href="/signup"
        className="text-xs text-white/30 hover:text-white/50 transition-colors"
      >
        처음이신가요? <span className="text-accent-light/60 hover:text-accent-light/80">회원가입</span>
      </Link>
    </div>
  );
}
