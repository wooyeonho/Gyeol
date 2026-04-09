import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isMissingEnvError } from "@/lib/env/required";
import { resolveLocale } from "@/lib/i18n/config";
import { renderLogSummaryPublic } from "@/lib/activity/log-templates";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "api/social/global-feed" });

export async function GET(request: NextRequest) {
  try {
    const locale = resolveLocale({
      acceptLanguage: request.headers.get("accept-language"),
      cookieHeader: request.headers.get("cookie"),
    });
    const service = createServiceClient();

    const [logsRes, socialRes, breedingRes, postRes] = await Promise.all([
      // PRIVACY: do not fetch `summary` — we only need action_type to decide
      // whether the row maps to a safe public broadcast template.
      service
        .from("autonomous_logs")
        .select("id, action_type, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
      // PRIVACY: do not fetch topic/outcome — those are user-seeded strings.
      service
        .from("social_logs")
        .select("id, created_at")
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

    const fallbacks = {
      socialOutcome: { ko: "고요 속에서 마주침이 있었어요.", en: "An encounter happened in the void", ja: "静けさの中で出会いがありました。", zh: "在虚空中发生了一次相遇。", es: "Ocurrió un encuentro en el vacío." }[locale],
      socialPost: { ko: "새로운 사회적 흔적이 떠올랐어요.", en: "A new social post surfaced from the void", ja: "新しい社会的な投稿が浮かび上がりました。", zh: "一条新的社交帖子浮现出来。", es: "Surgió una nueva publicación social." }[locale],
      breeding: { ko: "새로운 생명의 형태가 태어났어요.", en: "A new form of life emerged from synthesis", ja: "新しい生命の形が生まれました。", zh: "一种新的生命形式诞生了。", es: "Surgió una nueva forma de vida." }[locale],
    };

    const feed: { id: string; text: string; timestamp: Date }[] = [];

    // renderLogSummaryPublic returns a generic broadcast phrase keyed only
    // on action_type, or null for types that have no safe public phrasing.
    ((logsRes.data as Array<{ id: string; action_type?: string; created_at: string }> | null) || []).forEach((log) => {
      const text = renderLogSummaryPublic(log.action_type, locale);
      if (!text) return;
      feed.push({ id: log.id, text, timestamp: new Date(log.created_at) });
    });

    ((socialRes.data as Array<{ id: string; created_at: string }> | null) || []).forEach((log) => {
      feed.push({ id: `soc-${log.id}`, text: fallbacks.socialOutcome, timestamp: new Date(log.created_at) });
    });

    ((postRes.data as Array<{ id: string; topic?: string; content?: string; created_at: string }> | null) || []).forEach((post) => {
      feed.push({
        id: `post-${post.id}`,
        text: post.topic || post.content?.slice(0, 96) || fallbacks.socialPost,
        timestamp: new Date(post.created_at),
      });
    });

    ((breedingRes.data as Array<{ id: string; status?: string; created_at: string }> | null) || []).forEach((log) => {
      feed.push({ id: `br-${log.id}`, text: fallbacks.breeding, timestamp: new Date(log.created_at) });
    });

    feed.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return NextResponse.json({
      feed: feed.slice(0, 15).map(f => ({ id: f.id, text: f.text }))
    });

  } catch (e) {
    log.error("GET /api/social/global-feed error", e instanceof Error ? e : { detail: String(e) });
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
