"use client";

import { useEffect, useState } from "react";
import BreedingCard, { type PartnerProfile } from "@/components/breeding-card";
import { useAgentStore } from "@/store/agent-store";

type SocialLog = {
  id: string;
  agent_a_id: string;
  agent_b_id: string;
  topic?: string;
  outcome?: string;
  created_at?: string;
};

type BreedingRecord = {
  id: string;
  parent_a: string;
  parent_b: string;
  child_id?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
};

type OtherAgent = {
  id: string;
  self_name: string | null;
  gen_level: number;
  memory_count: number;
  visual?: unknown;
};

type GiftEntry = { id: string; summary?: string; created_at?: string };
type Data = {
  socialLogs: SocialLog[];
  breedingRecords: BreedingRecord[];
  otherAgents: OtherAgent[];
  giftExchanges?: GiftEntry[];
};

export default function SocialPage() {
  const { agentId, agentState } = useAgentStore();
  const [tab, setTab] = useState<"meet" | "breeding" | "all">("meet");
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/social");
        if (!res.ok) return;
        const j = await res.json();
        if (!cancelled) setData({ socialLogs: j.socialLogs ?? [], breedingRecords: j.breedingRecords ?? [], otherAgents: j.otherAgents ?? [], giftExchanges: j.giftExchanges ?? [] });
      } catch (e) {
        console.error("social fetch", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const myAgentId = agentId ?? "";
  const myVisual = (agentState?.visual as { color?: string; size?: number; glow?: number } | undefined) ?? undefined;
  const pendingBreeding = (data?.breedingRecords ?? []).filter((r) => r.status === "pending");
  const myParentIsB = pendingBreeding.filter((r) => r.parent_b === myAgentId);
  const otherAgentNames: Record<string, string> = {};
  (data?.otherAgents ?? []).forEach((a) => {
    otherAgentNames[a.id] = a.self_name ?? "...";
  });

  const handleRequest = async (partnerAgentId: string) => {
    const res = await fetch("/api/breeding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partner_agent_id: partnerAgentId }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error ?? "Request failed");
    }
    const j = await res.json();
    setData((d) => (d ? { ...d, breedingRecords: [{ id: j.id, parent_a: j.parent_a, parent_b: j.parent_b, status: "pending", created_at: new Date().toISOString() }, ...d.breedingRecords] } : d));
  };

  const handleAccept = async (recordId: string) => {
    const res = await fetch("/api/breeding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ record_id: recordId, accept: true }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error ?? "Accept failed");
    }
    setData((d) => {
      if (!d) return d;
      const list = d.breedingRecords.map((r) => (r.id === recordId ? { ...r, status: "accepted" } : r));
      return { ...d, breedingRecords: list };
    });
  };

  const handleReject = async (recordId: string) => {
    await fetch("/api/breeding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ record_id: recordId, accept: false }),
    });
    setData((d) => {
      if (!d) return d;
      return { ...d, breedingRecords: d.breedingRecords.map((r) => (r.id === recordId ? { ...r, status: "rejected" } : r)) };
    });
  };

  const timelineItems = [
    ...(data?.socialLogs ?? []).map((s) => ({ kind: "social" as const, id: s.id, created_at: s.created_at ?? "", topic: s.topic, outcome: s.outcome, agent_a_id: s.agent_a_id, agent_b_id: s.agent_b_id })),
    ...(data?.breedingRecords ?? []).map((r) => ({ kind: "breeding" as const, id: r.id, created_at: r.created_at ?? "", status: r.status, parent_a: r.parent_a, parent_b: r.parent_b })),
  ].sort((a, b) => (b.created_at > a.created_at ? 1 : -1));

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-20">
      <h1 className="text-xl font-semibold mb-4">Social</h1>

      <div className="flex gap-2 mb-4 border-b border-white/10 pb-2">
        {(["meet", "breeding", "all"] as const).map((t) => (
          <button
            key={t}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize ${tab === t ? "bg-white/20 text-white" : "bg-white/5 text-white/60"}`}
            onClick={() => setTab(t)}
          >
            {t === "meet" ? "Meet" : t === "breeding" ? "Breeding" : "All"}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-white/50 text-sm">Loading...</p>
      ) : (
        <>
          {tab === "meet" && (
            <div className="space-y-4">
              {myParentIsB.length > 0 && (
                <section>
                  <h2 className="text-sm font-medium text-white/70 mb-2">Breeding requests</h2>
                  {myParentIsB.map((r) => (
                    <BreedingCard
                      key={r.id}
                      mode="incoming"
                      record={r}
                      partnerName={otherAgentNames[r.parent_a]}
                      onAccept={handleAccept}
                      onReject={handleReject}
                    />
                  ))}
                </section>
              )}
              <h2 className="text-sm font-medium text-white/70 mb-2">Encounters</h2>
              {(data?.socialLogs ?? []).length === 0 ? (
                <p className="text-white/50 text-sm">No encounters yet.</p>
              ) : (
                (data?.socialLogs ?? []).map((s) => (
                  <div key={s.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <p className="text-xs text-white/50 mb-1">{s.created_at ? new Date(s.created_at).toLocaleString() : ""}</p>
                    <p className="text-sm text-white/80">{s.topic ?? "Chat"}</p>
                    <p className="text-white/60 text-sm mt-1">{s.outcome ?? ""}</p>
                  </div>
                ))
              )}
              <h2 className="text-sm font-medium text-white/70 mt-4 mb-2">Gift history</h2>
              {(data?.giftExchanges ?? []).length === 0 ? (
                <p className="text-white/50 text-sm">No gifts yet.</p>
              ) : (
                (data?.giftExchanges ?? []).map((g) => (
                  <div key={g.id} className="bg-white/5 rounded-xl p-3 text-sm text-white/70">
                    <p className="text-xs text-white/50">{g.created_at ? new Date(g.created_at).toLocaleString() : ""}</p>
                    <p>{g.summary ?? "Gift"}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "breeding" && (
            <div className="space-y-4">
              {myParentIsB.length > 0 && (
                <section>
                  <h2 className="text-sm font-medium text-white/70 mb-2">Incoming requests</h2>
                  {myParentIsB.map((r) => (
                    <BreedingCard
                      key={r.id}
                      mode="incoming"
                      record={r}
                      partnerName={otherAgentNames[r.parent_a]}
                      onAccept={handleAccept}
                      onReject={handleReject}
                    />
                  ))}
                </section>
              )}
              <h2 className="text-sm font-medium text-white/70 mb-2">Breed with another Gyeol</h2>
              {(data?.otherAgents ?? []).length === 0 ? (
                <p className="text-white/50 text-sm">No other agents to show.</p>
              ) : (
                <div className="grid gap-3">
                  {(data?.otherAgents ?? []).map((partner) => (
                    <BreedingCard
                      key={partner.id}
                      mode="partner"
                      partner={partner as PartnerProfile}
                      myAgentId={myAgentId}
                      myVisual={myVisual}
                      onRequest={handleRequest}
                    />
                  ))}
                </div>
              )}
              <h2 className="text-sm font-medium text-white/70 mt-4 mb-2">Breeding history</h2>
              {(data?.breedingRecords ?? []).filter((r) => r.status !== "pending").length === 0 ? (
                <p className="text-white/50 text-sm">None yet.</p>
              ) : (
                (data?.breedingRecords ?? []).filter((r) => r.status !== "pending").map((r) => (
                  <div key={r.id} className="bg-white/5 rounded-xl p-3 text-sm text-white/70">
                    {r.status === "accepted" ? "Accepted" : "Rejected"} · {r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "all" && (
            <div className="space-y-3">
              {timelineItems.length === 0 ? (
                <p className="text-white/50 text-sm">No activity yet.</p>
              ) : (
                timelineItems.map((item) => (
                  <div key={item.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <p className="text-xs text-white/50 mb-1">{item.created_at ? new Date(item.created_at).toLocaleString() : ""}</p>
                    {item.kind === "social" && (
                      <>
                        <span className="text-white/50 text-xs">Meet</span>
                        <p className="text-sm text-white/80">{(item as { topic?: string }).topic ?? "Chat"}</p>
                        <p className="text-white/60 text-xs">{(item as { outcome?: string }).outcome ?? ""}</p>
                      </>
                    )}
                    {item.kind === "breeding" && (
                      <>
                        <span className="text-white/50 text-xs">Breeding</span>
                        <p className="text-sm text-white/80">{(item as { status: string }).status}</p>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

    </div>
  );
}
