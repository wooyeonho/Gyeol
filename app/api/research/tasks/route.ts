import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { computeEffectivePriority, sortResearchTasks } from "@/lib/goals/task-utils";
import { logger } from "@/lib/logger";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const service = createServiceClient();
    const { agentId } = await ensurePrimaryAgent(service, user.id);
    if (!agentId) return NextResponse.json({ tasks: [] });

    const { data } = await service
      .from("research_tasks")
      .select("id, title, status, priority, attempt_count, last_attempted_at, result_summary, created_at, completed_at")
      .eq("agent_id", agentId)
      .limit(20);

    const tasks = sortResearchTasks((data ?? []) as Array<Record<string, unknown>>).map((task) => ({
      ...task,
      effective_priority: computeEffectivePriority(task),
    }));

    return NextResponse.json({ tasks });
  } catch (error) {
    logger.error("GET /api/research/tasks error", error instanceof Error ? error : { error });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const taskId = typeof body?.task_id === "string" ? body.task_id : "";
    const action = typeof body?.action === "string" ? body.action : "";
    if (!taskId || !["cancel", "prioritize"].includes(action)) {
      return NextResponse.json({ error: "task_id and valid action required" }, { status: 400 });
    }

    const service = createServiceClient();
    const { agentId } = await ensurePrimaryAgent(service, user.id);
    if (!agentId) return NextResponse.json({ error: "No agent" }, { status: 400 });

    const { data: task } = await service
      .from("research_tasks")
      .select("id, priority")
      .eq("agent_id", agentId)
      .eq("id", taskId)
      .maybeSingle();
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    if (action === "cancel") {
      await service
        .from("research_tasks")
        .update({
          status: "cancelled",
          cancellation_reason: "user_cancelled",
          completed_at: new Date().toISOString(),
        })
        .eq("id", taskId);
    } else {
      const currentPriority = Number((task as { priority?: number }).priority ?? 1);
      await service
        .from("research_tasks")
        .update({ priority: Math.min(3, currentPriority + 1) })
        .eq("id", taskId);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("PATCH /api/research/tasks error", error instanceof Error ? error : { error });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
