import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { parseBody } from "@/lib/validation/schemas";
import { z } from "zod";
import { computeEffectivePriority, sortResearchTasks } from "@/lib/goals/task-utils";
import { logger } from "@/lib/logger";

const researchTaskPatchSchema = z.object({
  task_id: z.string().uuid("Invalid task ID"),
  action: z.enum(["cancel", "prioritize"]),
});

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

export async function PATCH(request: NextRequest) {
  if (!verifyCsrfOrigin(request)) {
    return NextResponse.json({ error: "CSRF origin check failed" }, { status: 403 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await checkRateLimit(`research:${user.id}`);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const parsed = await parseBody(request, researchTaskPatchSchema);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { task_id: taskId, action } = parsed.data;

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
