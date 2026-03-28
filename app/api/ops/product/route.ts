import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isOpsAdminUserAsync, logOpsAudit } from "@/lib/security/ops-access";

type ProductEventRow = {
  created_at?: string | null;
  event_name?: string | null;
  path?: string | null;
  properties?: Record<string, unknown> | null;
};

function countByEvent(rows: ProductEventRow[], eventName: string) {
  return rows.filter((row) => row.event_name === eventName).length;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isOpsAdminUserAsync(user))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  logOpsAudit({ userId: user.id, action: "ops:product:view" });

  try {
    const service = createServiceClient();
    const since7d = new Date(Date.now() - 7 * 24 * 3600000).toISOString();
    const since24h = new Date(Date.now() - 24 * 3600000).toISOString();

    const [eventsRes, recentRes] = await Promise.all([
      service
        .from("product_events")
        .select("event_name, path, created_at, properties")
        .gte("created_at", since7d)
        .order("created_at", { ascending: false })
        .limit(2000),
      service
        .from("product_events")
        .select("event_name, path, created_at, properties")
        .order("created_at", { ascending: false })
        .limit(15),
    ]);

    const rows = (eventsRes.data ?? []) as ProductEventRow[];
    const recentRows = (recentRes.data ?? []) as ProductEventRow[];
    const last24hRows = rows.filter((row) => {
      if (!row.created_at) return false;
      return new Date(row.created_at).getTime() >= new Date(since24h).getTime();
    });

    const entryCompletions =
      countByEvent(rows, "signup_completed") + countByEvent(rows, "guest_completed");
    const firstMessages = countByEvent(rows, "first_message_sent");
    const plansOpened = countByEvent(rows, "plans_opened");
    const upgradeClicks = countByEvent(rows, "upgrade_cta_clicked");

    const pathCounts = rows
      .filter((row) => row.event_name === "page_view" && row.path)
      .reduce((acc, row) => {
        const path = String(row.path);
        acc[path] = (acc[path] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const topPaths = Object.entries(pathCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([path, count]) => ({ path, count }));

    const experimentAssignments = rows.filter((row) => row.event_name === "experiment_assigned");
    const firstMessageByVariant = rows.filter((row) => row.event_name === "first_message_sent");
    const onboardingVariants = ["identity", "productivity"].map((variant) => {
      const assigned = experimentAssignments.filter(
        (row) => row.properties?.experiment_key === "first_message_onboarding" && row.properties?.variant === variant
      ).length;
      const firstMessagesForVariant = firstMessageByVariant.filter(
        (row) =>
          row.properties?.experiment_key === "first_message_onboarding" &&
          row.properties?.experiment_variant === variant
      ).length;
      return {
        variant,
        assigned,
        first_messages: firstMessagesForVariant,
        conversion_rate: assigned > 0 ? Number((firstMessagesForVariant / assigned).toFixed(2)) : 0,
      };
    });

    return NextResponse.json({
      checked_at: new Date().toISOString(),
      activation_7d: {
        entry_completions: entryCompletions,
        first_messages: firstMessages,
        rate: entryCompletions > 0 ? Number((firstMessages / entryCompletions).toFixed(2)) : 0,
      },
      auth_funnel_7d: {
        signup_started: countByEvent(rows, "signup_started"),
        signup_completed: countByEvent(rows, "signup_completed"),
        login_started: countByEvent(rows, "login_started"),
        login_completed: countByEvent(rows, "login_completed"),
        guest_started: countByEvent(rows, "guest_started"),
        guest_completed: countByEvent(rows, "guest_completed"),
        auth_failed: countByEvent(rows, "auth_failed"),
      },
      engagement_7d: {
        activity_opened: countByEvent(rows, "activity_opened"),
        album_opened: countByEvent(rows, "album_opened"),
        explore_opened: countByEvent(rows, "explore_opened"),
        mission_created: countByEvent(rows, "mission_created"),
      },
      value_loop_24h: {
        page_views: countByEvent(last24hRows, "page_view"),
        messages: countByEvent(last24hRows, "message_sent"),
        first_messages: countByEvent(last24hRows, "first_message_sent"),
        plans_opened: countByEvent(last24hRows, "plans_opened"),
        upgrade_clicks: countByEvent(last24hRows, "upgrade_cta_clicked"),
      },
      top_paths_7d: topPaths,
      onboarding_experiment_7d: onboardingVariants,
      recent_events: recentRows.map((row) => ({
        created_at: row.created_at ?? new Date().toISOString(),
        event_name: row.event_name ?? "unknown",
        path: row.path ?? null,
      })),
      upgrade_interest_7d: {
        plans_opened: plansOpened,
        upgrade_clicks: upgradeClicks,
        click_rate: plansOpened > 0 ? Number((upgradeClicks / plansOpened).toFixed(2)) : 0,
      },
    });
  } catch (error) {
    console.error("GET /api/ops/product error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
