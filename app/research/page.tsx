"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

interface SpeciesEntry {
  species: string;
  member_count: number;
  total_level: number;
  newest_name: string | null;
  icon: string;
}

interface ResearchTask {
  id: string;
  title: string;
  status: string;
  priority: number;
}

export default function ResearchPage() {
  const [species, setSpecies] = useState<SpeciesEntry[]>([]);
  const [tasks, setTasks] = useState<ResearchTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/community/species")
        .then((r) => (r.ok ? r.json() : { entries: [] }))
        .then((d: { entries: SpeciesEntry[] }) => setSpecies(d.entries ?? []))
        .catch(() => {}),
      fetch("/api/research/tasks")
        .then((r) => (r.ok ? r.json() : { tasks: [] }))
        .then((d: { tasks: ResearchTask[] }) => setTasks(d.tasks ?? []))
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-[#0a0a0f] px-4 pt-8 pb-24">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">Research Lab</h1>
          <p className="mt-1 text-sm text-white/40">
            Creature species database & active research tasks
          </p>
        </header>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : (
          <>
            {/* Species Doggam */}
            <section className="mb-8">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
                Species Index ({species.length})
              </h2>
              {species.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/30">
                  No species discovered yet
                </p>
              ) : (
                <div className="grid gap-2">
                  {species.map((s, i) => (
                    <motion.div
                      key={s.species}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3"
                    >
                      <span className="text-2xl">{s.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {s.species}
                        </p>
                        <p className="text-[11px] text-white/40">
                          {s.member_count} members &middot; Lv {s.total_level}
                          {s.newest_name ? ` \u00b7 Latest: ${s.newest_name}` : ""}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>

            {/* Research Tasks */}
            {tasks.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
                  Active Research ({tasks.length})
                </h2>
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3"
                    >
                      <div
                        className={`h-2 w-2 rounded-full ${
                          task.status === "completed"
                            ? "bg-green-400"
                            : task.status === "in_progress"
                              ? "bg-amber-400"
                              : "bg-white/20"
                        }`}
                      />
                      <p className="flex-1 text-sm text-white truncate">
                        {task.title}
                      </p>
                      <span className="text-[10px] text-white/30 uppercase">
                        {task.status}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <div className="flex justify-center gap-3">
          <Link
            href="/discover"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 hover:bg-white/10 transition-colors"
          >
            Discover
          </Link>
          <Link
            href="/"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 hover:bg-white/10 transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
