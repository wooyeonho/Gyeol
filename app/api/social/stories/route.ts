import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { logger } from "@/lib/logger";
import { z } from "zod";

const log = logger.child({ route: "api/social/stories" });

const MOOD_VALUES = [
  "happy",
  "sad",
  "excited",
  "calm",
  "anxious",
  "playful",
  "curious",
  "tired",
  "neutral",
] as const;

const storyBodySchema = z.object({
  creature_name: z.string().min(1).max(50),
  content: z.string().min(1).max(500),
  mood: z.enum(MOOD_VALUES),
});

const DEMO_STORIES = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    creature_name: "Lumi",
    content: "Exploring the crystal caves today!",
    mood: "curious",
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    creature_name: "Fern",
    content: "Found a warm sunbeam to nap in.",
    mood: "calm",
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ---------------------------------------------------------------------------
// GET  – list active (non-expired) creature stories
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const service = createServiceClient();

    const { data, error } = await service.rpc("get_active_stories", {
      p_limit: 20,
    });

    if (error) {
      log.error("get_active_stories RPC failed", { error: error.message });
      // Graceful fallback when the RPC / table doesn't exist yet
      return NextResponse.json({ stories: DEMO_STORIES });
    }

    const stories = (data ?? []).map(
      (row: {
        id: string;
        creature_name: string;
        content: string;
        mood: string;
        created_at: string;
        expires_at: string;
      }) => ({
        id: row.id,
        creature_name: row.creature_name,
        content: row.content,
        mood: row.mood,
        created_at: row.created_at,
        expires_at: row.expires_at,
      }),
    );

    return NextResponse.json({ stories });
  } catch (err) {
    log.error("GET /api/social/stories error", err instanceof Error ? err : { error: err });
    // Return demo data so the UI always has something to show
    return NextResponse.json({ stories: DEMO_STORIES });
  }
}

// ---------------------------------------------------------------------------
// POST – create a new creature story (authenticated, rate-limited)
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  if (!verifyCsrfOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Resolve the caller's agent id
  const service = createServiceClient();
  const { data: agent } = await service
    .from("agents")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!agent?.id) {
    return NextResponse.json({ error: "No agent found" }, { status: 404 });
  }
  const agentId: string = agent.id;

  // Rate limit: 5 stories per hour per agent
  const allowed = await checkRateLimit(`social_story:${agentId}`);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many stories. Please try again later." },
      { status: 429 },
    );
  }

  try {
    const body: unknown = await req.json();
    const parsed = storyBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 },
      );
    }

    const { creature_name, content, mood } = parsed.data;

    const { data: created, error: insertError } = await service
      .from("creature_stories")
      .insert({
        agent_id: agentId,
        creature_name,
        content,
        mood,
      })
      .select("id, creature_name, content, mood, created_at, expires_at")
      .single();

    if (insertError) {
      log.error("creature_stories insert failed", { error: insertError.message });
      return NextResponse.json({ error: "Failed to create story" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, story: created }, { status: 201 });
  } catch (err) {
    log.error("POST /api/social/stories error", err instanceof Error ? err : { error: err });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
