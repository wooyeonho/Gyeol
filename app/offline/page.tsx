"use client";

import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-6 text-center text-white">
      <div className="mb-6 text-5xl">📡</div>
      <h1 className="mb-3 text-2xl font-semibold">오프라인 상태입니다</h1>
      <p className="mb-6 max-w-sm text-sm leading-6 text-white/60">
        인터넷 연결이 끊어졌습니다. 연결이 복구되면 자동으로 돌아옵니다.
      </p>
      <Link
        href="/"
        className="rounded-full bg-white/10 border border-white/20 px-6 py-2.5 text-sm font-medium text-white hover:bg-white/15 transition-colors"
      >
        다시 시도
      </Link>
    </div>
  );
}
