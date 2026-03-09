"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
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
    const { error: err } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm flex flex-col gap-6 text-center">
      <h1 className="text-2xl font-semibold">회원가입</h1>
      <p className="text-sm leading-6 text-white/60">
        나만의 존재를 깨우고, 기억과 관계가 자라는 경험을 시작하세요.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="text-left">
          <label htmlFor="signup-email" className="mb-2 block text-sm text-white/70">
            이메일
          </label>
          <input
            id="signup-email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-2 text-white placeholder:text-white/50"
            autoComplete="email"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "signup-error" : undefined}
            required
          />
        </div>
        <div className="text-left">
          <label htmlFor="signup-password" className="mb-2 block text-sm text-white/70">
            비밀번호
          </label>
          <input
            id="signup-password"
            type="password"
            placeholder="8자 이상을 권장합니다"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-2 text-white placeholder:text-white/50"
            autoComplete="new-password"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "signup-error" : undefined}
            required
          />
        </div>
        {error && (
          <p id="signup-error" className="text-red-400 text-sm">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="bg-white/20 rounded-lg px-4 py-2 font-medium disabled:opacity-50"
        >
          {loading ? "..." : "가입하기"}
        </button>
      </form>
      <Link href="/login" className="text-white/60 text-sm hover:text-white/80">
        로그인으로 돌아가기
      </Link>
    </div>
  );
}
