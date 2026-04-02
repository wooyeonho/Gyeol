import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isMissingEnvError } from "@/lib/env/required";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const allowed = await checkRateLimit(`global-feed:${ip}`);
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  try {
    const service = createServiceClient();
    
    const [logsRes, socialRes, breedingRes, postRes] = await Promise.all([
      service
        .from("autonomous_logs")
        .select("id, summary, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
      service
        .from("social_logs")
        .select("id, topic, outcome, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
      service
        .from("breeding_records")
        .select("id, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
      service
        .from("social_posts")
        .select("id, topic, content, created_at")
        .eq("visibility", "public")
        .eq("moderation_status", "approved")
        .is("parent_post_id", null)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const feed: { id: string; text: string; timestamp: Date }[] = [];

    ((logsRes.data as Array<{ id: string; summary?: string; created_at: string }> | null) || []).forEach((log) => {
      feed.push({ id: log.id, text: log.summary || "A mysterious autonomous action occurred", timestamp: new Date(log.created_at) });
    });
    
    ((socialRes.data as Array<{ id: string; outcome?: string; created_at: string }> | null) || []).forEach((log) => {
      feed.push({ id: `soc-${log.id}`, text: log.outcome || "An encounter happened in the void", timestamp: new Date(log.created_at) });
    });

    ((postRes.data as Array<{ id: string; topic?: string; content?: string; created_at: string }> | null) || []).forEach((post) => {
      feed.push({
        id: `post-${post.id}`,
        text: post.topic || post.content?.slice(0, 96) || "A new social post surfaced from the void",
        timestamp: new Date(post.created_at),
      });
    });
    
    ((breedingRes.data as Array<{ id: string; status?: string; created_at: string }> | null) || []).forEach((log) => {
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
