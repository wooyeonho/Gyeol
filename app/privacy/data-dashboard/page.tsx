"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface DataSummary {
  totalMessages: number;
  totalMemories: number;
  accountCreatedAt: string | null;
}

export default function DataDashboardPage() {
  const [data, setData] = useState<DataSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    // Fetch basic stats
    Promise.all([
      fetch("/api/wrapped").then((r) => r.json()),
    ]).then(([wrapped]) => {
      setData({
        totalMessages: wrapped.totalMessages ?? 0,
        totalMemories: wrapped.totalMemories ?? 0,
        accountCreatedAt: null,
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleDeleteRequest = async () => {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    setDeleting(true);
    try {
      const res = await fetch("/api/gdpr/delete", { method: "POST" });
      if (res.ok) {
        setDeleted(true);
        setTimeout(() => { window.location.href = "/"; }, 3000);
      }
    } finally {
      setDeleting(false);
    }
  };

  const THIRD_PARTY_SERVICES = [
    { name: "Groq", purpose: "AI 대화 생성", icon: "🤖", dataType: "대화 내용 (처리 후 미저장)" },
    { name: "Gemini", purpose: "감정 분석 / 번역", icon: "💡", dataType: "텍스트 분석 (처리 후 미저장)" },
    { name: "Cloudflare Workers AI", purpose: "이미지 생성", icon: "☁️", dataType: "이미지 프롬프트 (처리 후 미저장)" },
    { name: "Supabase", purpose: "데이터 저장", icon: "🗄️", dataType: "계정, 대화, 메모리 (암호화 저장)" },
  ];

  return (
    <main className="min-h-screen bg-[#0a0a0f] px-4 pt-8 pb-24">
      <div className="mx-auto max-w-lg space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">내 데이터 현황</h1>
          <p className="mt-1 text-sm text-white/40">저장된 데이터와 개인정보 제어</p>
        </div>

        {/* Data summary */}
        <div className="glass-card rounded-2xl border border-white/10 p-5">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">
            저장된 데이터
          </p>
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "총 대화 수", value: data?.totalMessages ?? 0, icon: "💬" },
                { label: "저장된 기억", value: data?.totalMemories ?? 0, icon: "🧠" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
                  <p className="text-xl mb-1">{item.icon}</p>
                  <p className="text-lg font-bold text-white">{item.value.toLocaleString()}</p>
                  <p className="text-[10px] text-white/40">{item.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Third-party services */}
        <div className="glass-card rounded-2xl border border-white/10 p-5">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-1">
            제3자 AI 서비스
          </p>
          <p className="text-[10px] text-white/30 mb-4">
            GYEOL은 아래 서비스에 데이터를 전송합니다. 각 서비스의 개인정보처리방침이 적용됩니다.
          </p>
          <div className="space-y-2">
            {THIRD_PARTY_SERVICES.map((svc) => (
              <div key={svc.name} className="flex items-start gap-3 rounded-xl bg-white/[0.02] border border-white/[0.05] p-3">
                <span className="text-lg">{svc.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-white">{svc.name}</span>
                    <span className="text-[10px] text-white/30">· {svc.purpose}</span>
                  </div>
                  <p className="text-[10px] text-white/25 mt-0.5">{svc.dataType}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Export data */}
        <div className="glass-card rounded-2xl border border-white/10 p-5">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
            데이터 내보내기 (GDPR)
          </p>
          <a
            href="/api/gdpr/export"
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/60 hover:bg-white/[0.08] transition-colors"
          >
            <span className="text-base">📦</span>
            <span>내 모든 데이터 다운로드</span>
          </a>
        </div>

        {/* Delete account */}
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.04] p-5">
          <p className="text-xs font-semibold text-rose-400/70 uppercase tracking-widest mb-2">
            데이터 삭제 (GDPR Right to Erasure)
          </p>
          <p className="text-xs text-white/40 mb-4">
            모든 대화, 기억, 계정 정보가 영구 삭제됩니다. 되돌릴 수 없어요.
          </p>

          {deleted ? (
            <motion.div
              className="text-center py-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="text-rose-400 text-sm">삭제 요청이 처리됐어요. 잠시 후 이동합니다...</p>
            </motion.div>
          ) : (
            <button
              onClick={handleDeleteRequest}
              disabled={deleting}
              className={`w-full rounded-xl py-3 text-sm font-medium transition-colors disabled:opacity-50 ${
                deleteConfirm
                  ? "bg-rose-500/30 border border-rose-400/50 text-rose-300"
                  : "bg-white/[0.04] border border-white/10 text-white/50 hover:text-white/70"
              }`}
            >
              {deleting
                ? "삭제 중..."
                : deleteConfirm
                ? "⚠️ 확인: 모든 데이터를 삭제합니다"
                : "계정 및 데이터 삭제 요청"}
            </button>
          )}
          {deleteConfirm && !deleted && (
            <p className="text-[10px] text-rose-400/60 mt-2 text-center">
              버튼을 한 번 더 눌러 최종 확인하세요
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
