"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";

type Proposal = {
  id: string;
  title: string;
  proposal_type: string;
  risk_level: string;
  status: string;
  created_by: string;
  plan?: Record<string, unknown>;
  review_note?: string | null;
  created_at: string;
};

type ActionLog = {
  id: string;
  action: string;
  detail?: string | null;
  created_at: string;
};

export default function AutonomyPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [actions, setActions] = useState<ActionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [proposalRes, actionRes] = await Promise.all([
        fetch("/api/autonomy/proposals"),
        fetch("/api/autonomy/actions"),
      ]);
      if (!proposalRes.ok || !actionRes.ok) {
        setNotice("자율 진화 데이터를 불러오지 못했습니다. 로그인 상태를 확인하세요.");
        return;
      }
      const pJson = (await proposalRes.json()) as { proposals?: Proposal[] };
      const aJson = (await actionRes.json()) as { actions?: ActionLog[] };
      setProposals(pJson.proposals ?? []);
      setActions(aJson.actions ?? []);
      setNotice(null);
    } catch {
      setNotice("네트워크 오류로 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  async function review(id: string, status: "approved" | "rejected") {
    const res = await fetch(`/api/autonomy/proposals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      setNotice("승인/거절 처리에 실패했습니다.");
      return;
    }
    await loadAll();
  }

  async function executeApproved() {
    const res = await fetch("/api/autonomy/execute", { method: "POST" });
    const json = (await res.json().catch(() => ({}))) as { processed?: number; error?: string };
    if (!res.ok) {
      setNotice(json.error ?? "실행에 실패했습니다. 설정에서 킬스위치를 확인하세요.");
      return;
    }
    setNotice(`승인된 제안 ${json.processed ?? 0}건을 적용했습니다.`);
    await loadAll();
  }

  return (
    <div className="min-h-screen bg-black text-white pt-16 pb-28 px-4 relative overflow-hidden">
      <div className="app-ambient" aria-hidden />
      <div className="max-w-3xl mx-auto space-y-4 relative z-10">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">자율 진화 콘솔</h1>
          <p className="text-sm text-white/60">
            AI는 스스로 제안하고, 사용자가 승인한 것만 안전 범위 내에서 실행됩니다.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-white/20 bg-white/5 px-2 py-1">총 제안 {proposals.length}</span>
            <span className="rounded-full border border-emerald-300/30 bg-emerald-500/10 px-2 py-1 text-emerald-200">
              승인 {proposals.filter((p) => p.status === "approved").length}
            </span>
            <span className="rounded-full border border-amber-300/30 bg-amber-500/10 px-2 py-1 text-amber-200">
              대기 {proposals.filter((p) => p.status === "pending").length}
            </span>
          </div>
        </header>

        {notice && (
          <div className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80 pulse-ring">
            {notice}
          </div>
        )}

        <section className="rounded-2xl border border-amber-300/30 bg-amber-500/10 p-4 text-sm text-amber-100 soft-hover">
          <p className="font-medium">안전 원칙</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>승인 전 자동 실행 금지</li>
            <li>킬 스위치 OFF면 실행 차단</li>
            <li>모든 실행/거절 이력 기록</li>
          </ul>
          <Link href="/settings" className="inline-block mt-3 text-xs text-amber-200 underline underline-offset-4">
            설정에서 킬 스위치 제어하기
          </Link>
        </section>

        <section className="rounded-2xl glass-card p-4 soft-hover">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-white/50 uppercase tracking-wider">승인 대기/완료 제안</p>
            <button
              type="button"
              onClick={executeApproved}
              className="rounded-lg border border-emerald-300/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-500/20"
            >
              승인된 제안 실행
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-white/60">불러오는 중...</p>
          ) : proposals.length === 0 ? (
            <p className="text-sm text-white/60">아직 제안이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {proposals.map((p) => (
                <div key={p.id} className="rounded-lg border border-white/10 px-3 py-2 soft-hover">
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span>{p.proposal_type}</span>
                    <span>{new Date(p.created_at).toLocaleString("ko-KR")}</span>
                  </div>
                  <p className="text-sm mt-1">{p.title}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-white/20 px-2 py-0.5 text-white/70">
                      risk: {p.risk_level}
                    </span>
                    <span className="rounded-full border border-white/20 px-2 py-0.5 text-white/70">
                      status: {p.status}
                    </span>
                    <span className="rounded-full border border-white/20 px-2 py-0.5 text-white/70">
                      by: {p.created_by}
                    </span>
                  </div>
                  {p.status === "pending" && (
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => { void review(p.id, "approved"); }}
                        className="rounded-md border border-emerald-300/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200"
                      >
                        승인
                      </button>
                      <button
                        type="button"
                        onClick={() => { void review(p.id, "rejected"); }}
                        className="rounded-md border border-red-300/30 bg-red-500/10 px-2 py-1 text-xs text-red-200"
                      >
                        거절
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl glass-card p-4 soft-hover">
          <p className="text-xs text-white/50 uppercase tracking-wider mb-2">실행 로그</p>
          {actions.length === 0 ? (
            <p className="text-sm text-white/60">로그가 없습니다.</p>
          ) : (
            <div className="space-y-1.5">
              {actions.slice(0, 20).map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm">
                  <span className="text-white/80">{a.action}: {a.detail ?? "-"}</span>
                  <span className="text-xs text-white/50">{new Date(a.created_at).toLocaleString("ko-KR")}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <BottomNav />
    </div>
  );
}
