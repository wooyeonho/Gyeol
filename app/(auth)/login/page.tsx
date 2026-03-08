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
      <h1 className="text-2xl font-semibold">GYEOL</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-white/10 rounded-lg px-4 py-2 text-white placeholder:text-white/50 border border-white/10"
          required
        />
        <input
          type="password"
          placeholder="Password"
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
          {loading ? "..." : "Log in"}
        </button>
      </form>
      <button
        type="button"
        onClick={handleGuest}
        disabled={loading}
        className="text-white/60 text-sm hover:text-white/80 disabled:opacity-50"
      >
        Continue as guest
      </button>
      <Link href="/signup" className="text-white/60 text-sm hover:text-white/80">
        Sign up
      </Link>
    </div>
  );
}
