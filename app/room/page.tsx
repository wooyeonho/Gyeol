"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { RoomObject } from "@/lib/room/types";
import ARViewer from "@/components/ar-viewer";

const RoomScene = dynamic(() => import("@/components/room-scene"), { ssr: false });

export default function RoomPage() {
  const [objects, setObjects] = useState<RoomObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [arColor, setArColor] = useState("#a0a0ff");

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
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="p-4 border-b border-white/10">
        <h1 className="text-xl font-semibold">Room</h1>
        <p className="text-white/50 text-sm mt-1">Each memory becomes an object in the space.</p>
      </div>
      <div className="flex-1 relative min-h-[60vh]">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-white/60 animate-pulse" />
          </div>
        ) : (
          <RoomScene objects={objects} />
        )}
      </div>
      <section className="p-4 border-t border-white/10 pb-24">
        <h2 className="text-sm font-medium text-white/70 mb-2">View in AR</h2>
        <ARViewer color={arColor} onPositionSave={saveARPosition} />
      </section>
    </div>
  );
}
