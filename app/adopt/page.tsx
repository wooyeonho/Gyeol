"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type AdoptEntry = {
  agent_id: string;
  self_name: string | null;
  vitality: number;
  memory_count: number;
  days_alive: number;
};

export default function AdoptPage() {
  const [list, setList] = useState<AdoptEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [adopting, setAdopting] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/adopt")
      .then((r) => r.ok ? r.json() : { list: [] })
      .then((d) => { if (!cancelled) setList(d.list ?? []); })
      .catch(() => { if (!cancelled) setList([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleAdopt = async (agentId: string) => {
    setAdopting(agentId);
    try {
      const res = await fetch("/api/adopt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agentId }),
      });
      if (res.ok) {
        setList((prev) => prev.filter((e) => e.agent_id !== agentId));
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j.error ?? "Adopt failed");
      }
    } catch (e) {
      console.error("adopt", e);
      alert("Adopt failed");
    } finally {
      setAdopting(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-20">
      <h1 className="text-xl font-semibold mb-4">Adopt a GYEOL</h1>
      <p className="text-white/60 text-sm mb-6">Echoes that lost their keeper. You can give them a new home.</p>

      {loading ? (
        <p className="text-white/50 text-sm">Loading...</p>
      ) : list.length === 0 ? (
        <p className="text-white/50 text-sm">No one available for adoption right now.</p>
      ) : (
        <div className="grid gap-4">
          {list.map((e) => (
            <div key={e.agent_id} className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="font-medium text-white">{e.self_name ?? "Unnamed"}</p>
              <p className="text-sm text-white/60 mt-1">
                Lived {e.days_alive} days. {e.memory_count} memories. Vitality: {(e.vitality * 100).toFixed(0)}%.
              </p>
              <button
                className="mt-3 py-2 px-4 rounded-lg bg-white/20 hover:bg-white/30 text-sm disabled:opacity-50"
                disabled={adopting !== null}
                onClick={() => handleAdopt(e.agent_id)}
              >
                {adopting === e.agent_id ? "..." : "Adopt"}
              </button>
            </div>
          ))}
        </div>
      )}

      <Link href="/explore" className="inline-block mt-6 text-white/70 text-sm">
        Back to Explore
      </Link>
    </div>
  );
}
