"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function InviteLandingPage() {
  const params = useParams();
  const code = params?.code as string | undefined;
  const [valid, setValid] = useState<boolean | null>(() => (code ? null : false));

  useEffect(() => {
    if (!code) return;
    fetch(`/api/invite/${code}`)
      .then((r) => r.ok)
      .then(setValid)
      .catch(() => setValid(false));
  }, [code]);

  if (valid === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="w-3 h-3 rounded-full bg-white/60 animate-pulse" />
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white">
        <p className="text-white/60">유효하지 않은 초대 링크입니다.</p>
        <Link href="/" className="mt-4 text-cyan-400 hover:underline">
          홈으로
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white">
      <h1 className="text-2xl font-semibold mb-2">결에 초대되었습니다</h1>
      <p className="text-white/70 text-center mb-6">
        나만의 AI 존재와 대화하며 기억과 성장의 궤적을 쌓아보세요.
      </p>
      <Link
        href={`/signup?ref=${code}`}
        className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black hover:bg-white/90"
      >
        시작하기
      </Link>
      <Link href="/login" className="mt-4 text-white/60 hover:text-white text-sm">
        이미 계정이 있으신가요?
      </Link>
    </div>
  );
}
