"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type WarEvent = {
  id: string;
  side_a: string[];
  side_b: string[];
  side_a_score: number;
  side_b_score: number;
  ends_at: string;
  status: string;
};

export default function WarPage() {
  const [event, setEvent] = useState<WarEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/events/war")
      .then((r) => r.ok ? r.json() : null)
      .then((e) => { if (!cancelled) setEvent(e); })
      .catch(() => { if (!cancelled) setEvent(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const endsAt = event?.ends_at ? new Date(event.ends_at).getTime() : 0;
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    if (!event?.ends_at) return;
    const tick = () => {
      const left = Math.max(0, endsAt - Date.now());
      const h = Math.floor(left / 3600000);
      const m = Math.floor((left % 3600000) / 60000);
      setRemaining(`${h}h ${m}m`);
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [event?.ends_at, endsAt]);

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-20">
      <h1 className="text-xl font-semibold mb-4">War Event</h1>

      {loading ? (
        <p className="text-white/50 text-sm">Loading...</p>
      ) : !event ? (
        <p className="text-white/50 text-sm">No active event. Check back on weekends.</p>
      ) : (
        <>
          <div className="bg-white/5 rounded-xl p-4 mb-4">
            <p className="text-sm text-white/70">Time left: {remaining}</p>
            <p className="text-2xl font-bold mt-2">
              {event.side_a_score} — {event.side_b_score}
            </p>
          </div>
          <p className="text-white/50 text-sm">Side A vs Side B. Points from artifacts and tools created during the event.</p>
        </>
      )}

      <Link href="/social" className="inline-block mt-6 text-white/70 text-sm">
        Back to Explore
      </Link>
    </div>
  );
}
