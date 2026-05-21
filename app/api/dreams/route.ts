import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "api/dreams" });

export type DreamRow = {
  id: string;
  title: string | null;
  content: string;
  created_at: string;
  is_preserved: boolean;
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limit = Math.min(
      Math.max(Number(request.nextUrl.searchParams.get("limit") ?? 50), 1),
      100,
    );

    const service = createServiceClient();
    const { agentId } = await ensurePrimaryAgent(service, user.id);
    if (!agentId) {
      return NextResponse.json({ dreams: [] });
    }

    const { data, error } = await service
      .from("artifacts")
      .select("id, title, content, created_at, is_preserved")
      .eq("agent_id", agentId)
      .eq("type", "dream_journal")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      log.error("dreams select failed", { error });
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }

    const dreams: DreamRow[] = (data ?? []).map((r) => {
      const rec = r as {
        id: string;
        title?: string | null;
        content?: string | null;
        created_at?: string | null;
        is_preserved?: boolean | null;
      };
      return {
        id: rec.id,
        title: rec.title ?? null,
        content: rec.content ?? "",
        created_at: rec.created_at ?? new Date().toISOString(),
        is_preserved: rec.is_preserved ?? false,
      };
    });

    return NextResponse.json({ dreams });
  } catch (e) {
    log.error("GET /api/dreams error", e instanceof Error ? e : { error: e });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
