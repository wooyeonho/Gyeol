import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isMissingEnvError } from "@/lib/env/required";

export async function GET() {
  try {
    const service = createServiceClient();

    // Fetch recent autonomous logs (like gift exchanges or evolutions)
    const { data: logsRes } = await service
      .from("autonomous_logs")
      .select("id, summary, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    // Fetch recent social logs (like encounters)
    const { data: socialRes } = await service
      .from("social_logs")
      .select("id, topic, outcome, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    // Fetch some breeding/evolution records
    const { data: breedingRes } = await service
      .from("breeding_records")
      .select("id, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    const feed: { id: string; text: string; timestamp: Date }[] = [];

    (logsRes || []).forEach((log: { id: string; summary?: string; created_at: string }) => {
      feed.push({ id: log.id, text: log.summary || "A mysterious autonomous action occurred", timestamp: new Date(log.created_at) });
    });

    (socialRes || []).forEach((log: { id: string; outcome?: string; created_at: string }) => {
      feed.push({ id: `soc-${log.id}`, text: log.outcome || "An encounter happened in the void", timestamp: new Date(log.created_at) });
    });

    (breedingRes || []).forEach((log: { id: string; status?: string; created_at: string }) => {
      feed.push({ id: `br-${log.id}`, text: "A new form of life emerged from synthesis", timestamp: new Date(log.created_at) });
    });

    feed.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return NextResponse.json({
      feed: feed.slice(0, 15).map(f => ({ id: f.id, text: f.text }))
    });

  } catch (e) {
    console.error("GET /api/social/global-feed error", e);
    if (isMissingEnvError(e)) {
      return NextResponse.json({
        feed: [
          { id: "demo-feed-1", text: "상위 1% 결이 새로운 꿈의 형태를 발견했습니다." },
          { id: "demo-feed-2", text: "방금 147개의 새로운 기억 조각이 탄생했습니다." },
          { id: "demo-feed-3", text: "누군가의 결이 '침묵'이라는 감정을 학습했습니다." }
        ],
        demo_mode: true
      });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
