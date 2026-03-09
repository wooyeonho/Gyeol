"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";

const ConstellationScene = dynamic(() => import("@/components/constellation-scene"), { ssr: false });

type Star = { id: string; content: string; type: string; created_at?: string; x: number; y: number; z: number };
type Constellation = { name: string; starIds: string[] };

export default function ConstellationPage() {
  const [stars, setStars] = useState<Star[]>([]);
  const [constellations, setConstellations] = useState<Constellation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/constellation")
      .then((r) => (r.ok ? r.json() : { stars: [], constellations: [] }))
      .then((d) => {
        setStars(d.stars ?? []);
        setConstellations(d.constellations ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-dvh bg-black text-white flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 pt-12 glass-strong border-b-0"
      >
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div>
            <h1 className="text-xl font-bold tracking-tight">별자리</h1>
            <p className="text-white/40 text-xs mt-0.5">기억이 별이 되고, 별이 모여 별자리가 돼요</p>
          </div>
          <Link href="/" className="glass rounded-full px-3 py-1.5 text-xs text-white/40 hover:text-white/60 transition-colors">
            홈
          </Link>
        </div>
      </motion.div>

      <div className="flex-1 min-h-[55vh] relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/60" style={{ animation: "dot-pulse 1.2s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        ) : (
          <ConstellationScene stars={stars} />
        )}
      </div>

      {constellations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 glass-strong border-t-0"
        >
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">별자리 목록</h2>
            <div className="flex flex-wrap gap-2">
              {constellations.map((c) => (
                <div key={c.name} className="glass rounded-full px-3 py-1 text-xs">
                  <span className="font-medium text-white/80">{c.name}</span>
                  <span className="text-white/30 ml-1.5">{c.starIds.length}개</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      <div className="p-4 pb-8">
        <Link href="/" className="text-xs text-white/30 hover:text-white/50 transition-colors">
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
