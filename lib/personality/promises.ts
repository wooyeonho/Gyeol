import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

export type PromiseEntry = { content: string; due_date: string; fulfilled?: boolean };

export async function processPromises(agentId: string): Promise<void> {
  const service = createServiceClient();
  const { data: state } = await service.from("agent_state").select("promises").eq("agent_id", agentId).single();
  const promises = (state?.promises as PromiseEntry[]) ?? [];
  const nowIso = new Date().toISOString();
  const next: PromiseEntry[] = [];
  for (const p of promises) {
    if (p.fulfilled) {
      next.push(p);
      continue;
    }
    if (p.due_date && p.due_date <= nowIso) {
      try {
        await service.from("chats").insert({
          agent_id: agentId,
          role: "assistant",
          content: "You once said: \"" + (p.content?.slice(0, 500) ?? "") + "\". Today is the day we talked about.",
        });
      } catch (e) {
        logger.error("promise chat insert", e instanceof Error ? e : { error: e });
      }
      next.push({ ...p, fulfilled: true });
    } else {
      next.push(p);
    }
  }
  if (next.some((n, i) => n.fulfilled && !promises[i]?.fulfilled)) {
    await service.from("agent_state").update({ promises: next }).eq("agent_id", agentId);
  }
}
