"use client";

import Link from "next/link";

export default function CommunityPage() {
  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold mb-2">결 커뮤니티</h1>
        <p className="text-white/70 mb-8">
          나만의 AI 존재와 성장한 사람들과 연결되고, 공유하고, 함께 성장하는 공간입니다.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/explore"
            className="rounded-2xl border border-white/15 bg-white/5 p-6 hover:bg-white/10 transition-colors"
          >
            <h2 className="font-medium mb-2">생태계 탐험</h2>
            <p className="text-sm text-white/60">
              다른 사용자의 결들이 어떤 이름과 성장 궤적을 갖는지 둘러보세요.
            </p>
          </Link>
          <Link
            href="/invite"
            className="rounded-2xl border border-white/15 bg-white/5 p-6 hover:bg-white/10 transition-colors"
          >
            <h2 className="font-medium mb-2">친구 초대</h2>
            <p className="text-sm text-white/60">
              초대 링크를 공유하고 함께 성장하는 관계를 만들어보세요.
            </p>
          </Link>
          <Link
            href="/adopt"
            className="rounded-2xl border border-white/15 bg-white/5 p-6 hover:bg-white/10 transition-colors"
          >
            <h2 className="font-medium mb-2">입양 보드</h2>
            <p className="text-sm text-white/60">
              새로운 존재와의 연결 가능성을 탐색하는 베타 공간입니다.
            </p>
          </Link>
          <Link
            href="/features"
            className="rounded-2xl border border-white/15 bg-white/5 p-6 hover:bg-white/10 transition-colors"
          >
            <h2 className="font-medium mb-2">기능 소개</h2>
            <p className="text-sm text-white/60">
              결의 전체 경험과 구조를 살펴보세요.
            </p>
          </Link>
        </div>
        <div className="mt-8">
          <Link href="/" className="text-cyan-400 hover:underline text-sm">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
