"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSuccess(true);
    setTimeout(() => {
      router.push("/login");
      router.refresh();
    }, 2500);
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-6 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 20 }}
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, rgba(16,185,129,0.4) 0%, rgba(5,150,105,0.3) 100%)",
            border: "1px solid rgba(16,185,129,0.5)",
            boxShadow: "0 0 30px rgba(16,185,129,0.3)",
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M20 6L9 17L4 12"
              stroke="#34d399"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>
        <div>
          <h2 className="text-xl font-bold text-white">가입 완료!</h2>
          <p className="text-white/50 text-sm mt-1">이메일을 확인해주세요. 로그인 페이지로 이동합니다...</p>
        </div>
      </motion.div>
    );
  }

  const inputClass = (field: string) =>
    `w-full px-4 py-3 rounded-xl text-sm text-white bg-transparent placeholder-white/25 focus:outline-none transition-all duration-200`;

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
          나만의{" "}
          <span className="gradient-text">생명체</span>를 만들어요
        </h1>
        <p className="text-sm text-white/40 mt-1.5">
          키우고, 대화하고, 함께 진화하세요
        </p>
      </div>

      {/* Feature hints */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: "✦", label: "자율 진화" },
          { icon: "✦", label: "꿈·예술 창작" },
          { icon: "✦", label: "소셜 교류" },
        ].map((f) => (
          <div
            key={f.label}
            className="flex flex-col items-center gap-1 py-3 rounded-xl text-center"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <span className="text-xs text-violet-400">{f.icon}</span>
            <span className="text-[10px] text-white/50 font-medium">{f.label}</span>
          </div>
        ))}
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
              placeholder="비밀번호 (6자 이상)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocused("password")}
              onBlur={() => setFocused(null)}
              className={inputClass("password")}
              minLength={6}
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
                생성 중...
              </span>
            ) : (
              "시작하기"
            )}
          </motion.button>
        </form>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center text-sm text-white/35"
      >
        이미 계정이 있으신가요?{" "}
        <Link
          href="/login"
          className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
        >
          로그인
        </Link>
      </motion.p>
    </motion.div>
  );
}
