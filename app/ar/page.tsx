"use client";

import dynamic from "next/dynamic";

// Lazy-load AR viewer (requires browser APIs)
const ARViewer = dynamic(() => import("@/components/ar-viewer"), { ssr: false });

export default function ARPage() {
  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center">
      <div className="w-full h-screen">
        <ARViewer color="#818cf8" size={0.35} />
      </div>
    </main>
  );
}
