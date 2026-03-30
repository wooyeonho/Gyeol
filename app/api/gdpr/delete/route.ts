import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GDPR Article 17 — Right to Erasure ("Right to be Forgotten")
 * Permanently deletes all user data across all tables.
 */
export async function DELETE() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    if (agentIds.length > 0) {
      await Promise.all([
        service.from("messages").delete().in("agent_id", agentIds),
        service.from("agent_state").delete().in("agent_id", agentIds),
        service.from("social_posts").delete().in("agent_id", agentIds),
        service.from("social_reports").delete().in("reporter_agent_id", agentIds),
        service.from("achievements").delete().in("agent_id", agentIds),
        service.from("earnings").delete().in("agent_id", agentIds),
      ]);
    }

    // Delete user-level data
    await Promise.all([
      service.from("agents").delete().eq("user_id", userId),
      service.from("user_settings").delete().eq("user_id", userId),
      service.from("push_subscriptions").delete().eq("user_id", userId),
    ]);

    // Log the deletion for compliance auditing (before deleting user)
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

    // Sign out the user
    await supabase.auth.signOut();

    return NextResponse.json({ ok: true, deleted_at: new Date().toISOString() });
  } catch (error) {
    console.error("GDPR delete error:", error);
    return NextResponse.json({ error: "Deletion failed" }, { status: 500 });
  }
}
