"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const VoidCanvasInner = dynamic(() => import("./void-canvas-inner"), { ssr: false });

type WidgetMiniProps = {
  color?: string;
  size?: number;
  quote?: string;
};

export default function WidgetMini({ color = "#a0a0ff", size = 16, quote }: WidgetMiniProps) {
  const [line, setLine] = useState(quote ?? "Say something...");

  useEffect(() => {
    if (quote) setLine(quote);
    else {
      fetch("/api/agent/state")
        .then((r) => (r.ok ? r.json() : {}))
        .then((d: { state?: { self_name?: string } }) => {
          const name = d?.state?.self_name ?? "Gyeol";
          setLine(`${name} is here.`);
        })
        .catch(() => setLine("Gyeol"));
    }
  }, [quote]);

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-black/90 border border-white/10 min-w-[200px]">
      <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
        <VoidCanvasInner
          shape="sphere"
          color={color}
          size={size}
          glow={50}
          animation="float"
          particles={0}
          background="#000"
          opacity={1}
          vitality={1}
          isListening={false}
        />
      </div>
      <p className="text-white/90 text-sm truncate flex-1">{line}</p>
    </div>
  );
}
