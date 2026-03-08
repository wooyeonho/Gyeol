"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Profile = {
  id: string;
  self_name: string | null;
  gen_level: number;
  memory_count: number;
  visual?: unknown;
  created_at?: string | null;
  species?: string | null;
};

type SpeciesEntry = { name: string; count: number };

type RankEntry = { id: string; name: string; gen: number; species?: string };

type Ranking = {
  top_artifacts?: RankEntry[];
  top_tools?: RankEntry[];
  top_social?: RankEntry[];
  oldest?: RankEntry[];
  period?: string;
};

export default function ExplorePage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [speciesBestiary, setSpeciesBestiary] = useState<SpeciesEntry[]>([]);
  const [rankings, setRankings] = useState<Ranking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [profRes, rankRes] = await Promise.all([
          fetch("/api/explore"),
          fetch("/api/rankings?period=weekly"),
        ]);
        if (!cancelled && profRes.ok) {
          const d = await profRes.json();
          setProfiles(d.profiles ?? []);
          setSpeciesBestiary(d.speciesBestiary ?? []);
        }
        if (!cancelled && rankRes.ok) {
          const r = await rankRes.json();
          setRankings(r);
        }
      } catch (e) {
        console.error("explore fetch", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-20">
      <h1 className="text-xl font-semibold mb-4">Explore GYEOL</h1>

      {loading ? (
        <p className="text-white/50 text-sm">Loading...</p>
      ) : (
        <>
          {speciesBestiary.length > 0 && (
            <section className="mb-6">
              <h2 className="text-sm font-medium text-white/70 mb-2">Species</h2>
              <div className="flex flex-wrap gap-2">
                {speciesBestiary.map((s) => (
                  <span key={s.name} className="bg-white/5 rounded-full px-3 py-1 text-xs text-white/80">
                    {s.name} ({s.count})
                  </span>
                ))}
              </div>
            </section>
          )}

          {rankings && (
            <section className="mb-6">
              <h2 className="text-sm font-medium text-white/70 mb-2">
                {rankings.period === "monthly" ? "Monthly" : "Weekly"} rankings
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {(
                  [
                    { label: "Most artifacts", key: "top_artifacts" as const },
                    { label: "Most tools built", key: "top_tools" as const },
                    { label: "Most social", key: "top_social" as const },
                    { label: "Oldest", key: "oldest" as const },
                  ] as const
                ).map(({ label, key }) => {
                  const entries = rankings[key];
                  if (!entries || entries.length === 0) return null;
                  return (
                    <div key={key} className="bg-white/5 rounded-xl p-3">
                      <span className="text-white/50 block text-xs mb-2">{label}</span>
                      <ol className="space-y-1">
                        {entries.slice(0, 3).map((e, i) => (
                          <li key={e.id} className="flex items-center gap-2 text-xs text-white/80">
                            <span className="text-white/30 w-4">{i + 1}.</span>
                            <span className="font-medium text-white">{e.name}</span>
                            <span className="text-white/40">Gen {e.gen}{e.species ? ` · ${e.species}` : ""}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="mb-6">
            <h2 className="text-sm font-medium text-white/70 mb-2">Public profiles</h2>
            {profiles.length === 0 ? (
              <p className="text-white/50 text-sm">No public profiles yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {profiles.slice(0, 12).map((p) => (
                  <div key={p.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <p className="font-medium text-white">{p.self_name ?? "..."}</p>
                    <p className="text-xs text-white/50 mt-1">Gen {p.gen_level} · {p.memory_count} memories{p.species ? ` · ${p.species}` : ""}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mb-6">
            <h2 className="text-sm font-medium text-white/70 mb-2">Petitions</h2>
            <p className="text-white/50 text-sm">Collective requests from Gyeol will appear here.</p>
          </section>

          <section className="mb-6">
            <Link href="/adopt" className="block bg-white/5 hover:bg-white/10 rounded-xl p-4 border border-white/10">
              <span className="font-medium text-white">Adopt a GYEOL</span>
              <p className="text-white/50 text-sm mt-1">Echoes waiting for a new keeper.</p>
            </Link>
          </section>

          <div className="mt-6 text-center">
            <Link
              href="/signup"
              className="inline-block bg-white/20 hover:bg-white/30 rounded-full px-6 py-2 text-sm"
            >
              Grow your own GYEOL
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
