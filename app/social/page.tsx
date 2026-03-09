"use client";

import { useEffect, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import BreedingCard, { type PartnerProfile, type Visual } from "@/components/breeding-card";

type SocialLog = {
  id: string;
  agent_a_id?: string;
  agent_b_id?: string;
  topic?: string;
  content?: string;
  conversation?: string;
  message?: string;
  outcome?: string;
  created_at: string;
};

type BreedingRecord = {
  id: string;
  parent_a: string;
  parent_b: string;
  child_id?: string;
  status: string;
  created_at?: string;
};

type SocialResponse = {
  myAgentId: string | null;
  myAgentProfile?: { self_name?: string | null; gen_level?: number; visual?: Visual } | null;
  socialLogs: SocialLog[];
  breedingRecords: BreedingRecord[];
  otherAgents: PartnerProfile[];
  giftExchanges?: Array<{ id: string; summary?: string; created_at?: string }>;
};

export default function SocialPage() {
  const [logs, setLogs] = useState<SocialLog[]>([]);
  const [breeding, setBreeding] = useState<BreedingRecord[]>([]);
  const [otherAgents, setOtherAgents] = useState<PartnerProfile[]>([]);
  const [myAgentId, setMyAgentId] = useState<string | null>(null);
  const [myVisual, setMyVisual] = useState<Visual>(null);
  const [tab, setTab] = useState<"encounter" | "breeding" | "all">("encounter");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/social");
      if (!res.ok) {
        setError("소셜 데이터를 불러오지 못했습니다.");
        setLogs([]);
        setBreeding([]);
        setOtherAgents([]);
        return;
      }
      const json = (await res.json().catch(() => ({}))) as SocialResponse;
      setMyAgentId(json.myAgentId ?? null);
      setMyVisual((json.myAgentProfile?.visual as Visual | undefined) ?? null);
      setLogs(Array.isArray(json.socialLogs) ? json.socialLogs : []);
      setBreeding(Array.isArray(json.breedingRecords) ? json.breedingRecords : []);
      setOtherAgents(Array.isArray(json.otherAgents) ? json.otherAgents : []);
    } catch {
      setError("소셜 데이터를 불러오지 못했습니다.");
      setLogs([]);
      setBreeding([]);
      setOtherAgents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function requestBreeding(partnerAgentId: string) {
    const res = await fetch("/api/breeding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "request", partner_agent_id: partnerAgentId }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? "요청 실패");
    setNotice("교배 요청을 보냈습니다.");
    await load();
  }

  async function decideBreeding(recordId: string, action: "accept" | "reject") {
    const res = await fetch("/api/breeding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, record_id: recordId }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? "처리 실패");
    setNotice(action === "accept" ? "요청을 수락했습니다." : "요청을 거절했습니다.");
    await load();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pt-20 pb-24 px-4 relative overflow-hidden">
      <div className="app-ambient" aria-hidden />
      <div className="relative z-10">
      <h1 className="text-xl font-semibold mb-2">소셜</h1>
      <p className="text-sm text-white/60 mb-4">다른 결과의 만남, 교배 요청, 관계 변화를 확인합니다.</p>
      {error && <div className="mb-3 rounded-lg bg-red-500/10 border border-red-400/30 px-3 py-2 text-sm text-red-200">{error}</div>}
      {notice && <div className="mb-3 rounded-lg bg-emerald-500/10 border border-emerald-400/30 px-3 py-2 text-sm text-emerald-200">{notice}</div>}
      <div className="mb-3 flex rounded-xl glass-card overflow-hidden text-sm">
        {[
          { key: "encounter", label: "만남" },
          { key: "breeding", label: "교배" },
          { key: "all", label: "전체" },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key as "encounter" | "breeding" | "all")}
            className={`flex-1 py-2 ${tab === t.key ? "bg-white/15 text-white" : "bg-transparent text-white/60"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {(tab === "encounter" || tab === "all") &&
          logs.map((log) => (
            <div key={log.id} className="glass-card rounded-xl p-4 soft-hover">
              <div className="text-xs text-white/50">{new Date(log.created_at).toLocaleString("ko-KR")}</div>
              <div className="text-sm mt-1">{log.topic || "대화"}</div>
              <div className="text-white/70 text-sm mt-2 whitespace-pre-wrap">
                {log.content || log.conversation || log.message || log.outcome || "대화 내용이 없습니다."}
              </div>
            </div>
          ))}

        {(tab === "breeding" || tab === "all") && myAgentId && (
          <>
            {breeding
              .filter((r) => r.status === "pending" && r.parent_b === myAgentId)
              .map((record) => {
                const partner = otherAgents.find((a) => a.id === record.parent_a);
                return (
                  <BreedingCard
                    key={record.id}
                    mode="incoming"
                    record={record}
                    partnerName={partner?.self_name ?? "다른 결"}
                    partnerVisual={partner?.visual as Visual}
                    onAccept={async (id) => decideBreeding(id, "accept")}
                    onReject={async (id) => decideBreeding(id, "reject")}
                  />
                );
              })}

            {tab === "breeding" && (
              <div className="grid gap-3 sm:grid-cols-2">
                {otherAgents.slice(0, 12).map((partner) => (
                  <BreedingCard
                    key={partner.id}
                    mode="partner"
                    partner={partner}
                    myVisual={myVisual}
                    myAgentId={myAgentId}
                    onRequest={requestBreeding}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {tab === "breeding" && breeding.filter((r) => r.status !== "pending").length > 0 && (
          <div className="glass-card rounded-xl p-4 soft-hover">
            <div className="text-sm text-white/60 mb-2">처리된 요청</div>
            <div className="space-y-1.5 text-sm">
              {breeding.filter((r) => r.status !== "pending").slice(0, 8).map((r) => (
                <div key={r.id} className="flex items-center justify-between">
                  <span>{r.status} · child: {r.child_id ? "생성됨" : "없음"}</span>
                  <span className="text-xs text-white/50">
                    {r.created_at ? new Date(r.created_at).toLocaleDateString("ko-KR") : "-"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <BottomNav />
      </div>
    </div>
  );
}
