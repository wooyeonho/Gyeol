"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      setError(err.message);
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

  const inputClass = (field: string) =>
    `w-full px-4 py-3 rounded-xl text-sm text-white bg-transparent placeholder-white/25 focus:outline-none transition-all duration-200 ${
      focused === field
        ? "border-violet-500/60 bg-violet-500/5"
        : "border-white/10 hover:border-white/20"
    }`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-8"
    >
      {/* Logo */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
          style={{
            background:
              "linear-gradient(135deg, rgba(124,58,237,0.6) 0%, rgba(79,70,229,0.5) 100%)",
            border: "1px solid rgba(124,58,237,0.4)",
            boxShadow: "0 0 30px rgba(124,58,237,0.3)",
          }}
        >
          <span className="text-2xl font-bold gradient-text">결</span>
        </motion.div>
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="gradient-text">GYEOL</span>에 오신 것을 환영해요
        </h1>
        <p className="text-sm text-white/40 mt-1.5">당신만의 AI 생명체가 기다리고 있어요</p>
      </div>

      {/* Form card */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl p-6"
        style={{
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div
            className="rounded-xl border transition-all duration-200"
            style={{
              borderColor:
                focused === "email"
                  ? "rgba(124,58,237,0.5)"
                  : "rgba(255,255,255,0.08)",
              background:
                focused === "email"
                  ? "rgba(124,58,237,0.05)"
                  : "rgba(255,255,255,0.03)",
            }}
          >
            <input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocused("email")}
              onBlur={() => setFocused(null)}
              className={inputClass("email")}
              required
            />
          </div>

          <div
            className="rounded-xl border transition-all duration-200"
            style={{
              borderColor:
                focused === "password"
                  ? "rgba(124,58,237,0.5)"
                  : "rgba(255,255,255,0.08)",
              background:
                focused === "password"
                  ? "rgba(124,58,237,0.05)"
                  : "rgba(255,255,255,0.03)",
            }}
          >
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocused("password")}
              onBlur={() => setFocused(null)}
              className={inputClass("password")}
              required
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-400/90 text-xs px-1"
            >
              {error}
            </motion.p>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileTap={{ scale: 0.97 }}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
            style={{
              background:
                "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
              boxShadow: "0 4px 20px rgba(124,58,237,0.4)",
            }}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full inline-block"
                />
                로그인 중...
              </span>
            ) : (
              "로그인"
            )}
          </motion.button>
        </form>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-white/8" />
          <span className="text-xs text-white/30">또는</span>
          <div className="flex-1 h-px bg-white/8" />
        </div>

        <motion.button
          type="button"
          onClick={handleGuest}
          disabled={loading}
          whileTap={{ scale: 0.97 }}
          className="w-full py-3 rounded-xl text-sm font-medium disabled:opacity-50 transition-all"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.6)",
          }}
        >
          게스트로 계속하기
        </motion.button>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center text-sm text-white/35"
      >
        아직 계정이 없으신가요?{" "}
        <Link
          href="/signup"
          className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
        >
          회원가입
        </Link>
      </motion.p>
    </motion.div>
  );
}
