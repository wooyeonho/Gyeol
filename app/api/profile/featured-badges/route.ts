import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { getAchievement } from "@/lib/engagement/achievements";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "api/profile/featured-badges" });

const MAX_SLOTS = 3;

/**
 * Phase 2-3: Profile badge slot — let users pin up to 3 unlocked
 * achievements to their agent_state.featured_badges array so they
 * surface on the profile card.
 *
 * GET  — returns the current list (+ validation that every slot is unlocked)
 * PUT  — replaces the list with the provided achievement ids
 */

type Body = { badges?: unknown };

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { data: agent } = await service
      .from("agents")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!agent?.id) return NextResponse.json({ error: "No agent" }, { status: 404 });

    const { data: state } = await service
      .from("agent_state")
      .select("featured_badges")
      .eq("agent_id", agent.id)
      .maybeSingle();

    const ids = Array.isArray(state?.featured_badges)
      ? (state.featured_badges as string[])
      : [];

    return NextResponse.json({
      badges: ids.map((id) => {
        const def = getAchievement(id);
        return def
          ? { id: def.id, icon: def.icon, rarity: def.rarity, label: def.label }
          : { id, icon: "❔", rarity: "common", label: { ko: id, en: id, ja: id, zh: id, es: id } };
      }),
    });
  } catch (e) {
    log.error("GET error", e instanceof Error ? e : { detail: String(e) });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!verifyCsrfOrigin(req)) {
    return NextResponse.json({ error: "CSRF origin check failed" }, { status: 403 });
  }
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body || !Array.isArray(body.badges)) {
      return NextResponse.json({ error: "badges[] required" }, { status: 400 });
    }

    // Deduplicate + cap.
    const requested = Array.from(
      new Set(
        body.badges
          .filter((b): b is string => typeof b === "string" && b.length > 0 && b.length <= 64)
          .slice(0, MAX_SLOTS),
      ),
    );

    const service = createServiceClient();
    const { data: agent } = await service
      .from("agents")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!agent?.id) return NextResponse.json({ error: "No agent" }, { status: 404 });

    // Validate that each requested id corresponds to an *unlocked* achievement
    // for this agent. Otherwise users could pin achievements they don't own.
    const { data: unlocked } = await service
      .from("agent_achievements")
      .select("achievement_id")
      .eq("agent_id", agent.id)
      .in("achievement_id", requested);

    const unlockedIds = new Set((unlocked ?? []).map((u) => u.achievement_id as string));
    const valid = requested.filter((id) => unlockedIds.has(id));

    const { error: updateErr } = await service
      .from("agent_state")
      .update({ featured_badges: valid })
      .eq("agent_id", agent.id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ badges: valid });
  } catch (e) {
    log.error("PUT error", e instanceof Error ? e : { detail: String(e) });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
