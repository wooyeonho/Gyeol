"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { RoomObject } from "@/lib/room/types";
import ARViewer from "@/components/ar-viewer";
import { motion } from "framer-motion";
import Link from "next/link";

const RoomScene = dynamic(() => import("@/components/room-scene"), { ssr: false });

export default function RoomPage() {
  const [objects, setObjects] = useState<RoomObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [arColor, setArColor] = useState("#7c6ef0");

  useEffect(() => {
    fetch("/api/room")
      .then((r) => (r.ok ? r.json() : { objects: [] }))
      .then((d) => {
        setObjects(Array.isArray(d.objects) ? d.objects : []);
        if (d.visual?.color) setArColor(d.visual.color);
      })
      .catch(() => setObjects([]))
      .finally(() => setLoading(false));
  }, []);

  const saveARPosition = (position: [number, number, number]) => {
    fetch("/api/room", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ar_position: position }),
    }).catch(() => {});
  };

  return (
    <div className="min-h-dvh bg-black text-white flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 pt-12 glass-strong border-b-0"
      >
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Room</h1>
            <p className="text-white/40 text-xs mt-0.5">기억이 공간이 되는 곳</p>
          </div>
          <Link href="/" className="glass rounded-full px-3 py-1.5 text-xs text-white/40 hover:text-white/60 transition-colors">
            홈
          </Link>
        </div>
      </motion.div>

      <div className="flex-1 relative min-h-[60vh]">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/60" style={{ animation: "dot-pulse 1.2s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        ) : (
          <RoomScene objects={objects} />
        )}
      </div>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-4 glass-strong border-t-0 pb-8"
      >
        <h2 className="text-sm font-semibold text-white/50 mb-3">AR로 보기</h2>
        <ARViewer color={arColor} onPositionSave={saveARPosition} />
      </motion.section>
    </div>
  );
}
