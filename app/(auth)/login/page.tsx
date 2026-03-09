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

  return (
    <div className="w-full max-w-sm flex flex-col gap-6 text-center">
      <h1 className="text-2xl font-semibold">결 GYEOL</h1>
      <p className="text-sm leading-6 text-white/60">
        진화하는 존재와의 대화를 이어가려면 로그인하세요.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="text-left">
          <label htmlFor="login-email" className="mb-2 block text-sm text-white/70">
            이메일
          </label>
          <input
            id="login-email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-2 text-white placeholder:text-white/50"
            autoComplete="email"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "login-error" : undefined}
            required
          />
        </div>
        <div className="text-left">
          <label htmlFor="login-password" className="mb-2 block text-sm text-white/70">
            비밀번호
          </label>
          <input
            id="login-password"
            type="password"
            placeholder="비밀번호를 입력하세요"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-2 text-white placeholder:text-white/50"
            autoComplete="current-password"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "login-error" : undefined}
            required
          />
        </div>
        {error && (
          <p id="login-error" className="text-red-400 text-sm">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="bg-white/20 rounded-lg px-4 py-2 font-medium disabled:opacity-50"
        >
          {loading ? "..." : "로그인"}
        </button>
      </form>
      <button
        type="button"
        onClick={handleGuest}
        disabled={loading}
        className="text-white/60 text-sm hover:text-white/80 disabled:opacity-50"
      >
        게스트로 계속하기
      </button>
      <Link href="/signup" className="text-white/60 text-sm hover:text-white/80">
        회원가입
      </Link>
    </div>
  );
}
