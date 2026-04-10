import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

/**
 * GDPR Article 17 — Right to Erasure ("Right to be Forgotten")
 * Permanently deletes all user data across all tables.
 */
export async function DELETE(request: NextRequest) {
  // CSRF protection — irreversible action must originate from our domain
  if (!verifyCsrfOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limiting — prevent abuse of destructive endpoint (3/min)
  const allowed = await checkRateLimit(`gdpr-delete:${user.id}`);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const service = createServiceClient();
    const userId = user.id;

    // Get all agent IDs for this user
    const { data: agents } = await service
      .from("agents")
      .select("id")
      .eq("user_id", userId);
    const agentIds = ((agents ?? []) as Array<{ id: string }>).map((a) => a.id);

    // Delete in dependency order (children first, then parents)
    // All table names match supabase/schema.sql definitions
    if (agentIds.length > 0) {
      await Promise.all([
        service.from("chats").delete().in("agent_id", agentIds),
        service.from("memories").delete().in("agent_id", agentIds),
        service.from("agent_state").delete().in("agent_id", agentIds),
        service.from("artifacts").delete().in("agent_id", agentIds),
        service.from("autonomous_logs").delete().in("agent_id", agentIds),
        service.from("social_posts").delete().in("agent_id", agentIds),
        service.from("social_reports").delete().in("reporter_agent_id", agentIds),
        service.from("social_reactions").delete().in("agent_id", agentIds),
        service.from("time_capsules").delete().in("agent_id", agentIds),
        service.from("redemption_requests").delete().in("agent_id", agentIds),
        service.from("adoption_board").delete().in("agent_id", agentIds),
        service.from("research_tasks").delete().in("agent_id", agentIds),
      ]);
    }

    // Delete user-level data
    await Promise.all([
      service.from("agents").delete().eq("user_id", userId),
      service.from("user_subscriptions").delete().eq("user_id", userId),
      service.from("push_subscriptions").delete().eq("user_id", userId),
    ]);

    // Log the deletion for compliance auditing (before deleting auth user)
    await service.from("system_alerts").insert({
      level: "info",
      source: "gdpr",
      code: "GDPR_DATA_DELETION",
      message: `User ${userId} requested full data deletion`,
      details: {
        user_id: userId,
        agents_deleted: agentIds.length,
        deleted_at: new Date().toISOString(),
      },
    }).then(() => {}, () => {});

    // Delete the auth user record — triggers ON DELETE CASCADE for
    // user_connections, api_keys, rate_limits, product_events, etc.
    await service.auth.admin.deleteUser(userId);

    return NextResponse.json({ ok: true, deleted_at: new Date().toISOString() });
  } catch (error) {
    logger.error("GDPR delete error", error instanceof Error ? error : { error });
    return NextResponse.json({ error: "Deletion failed" }, { status: 500 });
  }
}
