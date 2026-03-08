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
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-white/10 rounded-lg px-4 py-2 text-white placeholder:text-white/50 border border-white/10"
          required
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-white/10 rounded-lg px-4 py-2 text-white placeholder:text-white/50 border border-white/10"
          required
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
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
