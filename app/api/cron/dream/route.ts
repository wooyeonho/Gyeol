import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";
import { generateEmbedding } from "@/lib/ai/embedding";
import { checkCronAuth } from "@/lib/cron-auth";

export async function GET(req: NextRequest) {
  if (!checkCronAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServiceClient();
  const { data: agents } = await db.from("agents").select("id");
  if (!agents) return NextResponse.json({ processed: 0 });

  let processed = 0;
  for (const agent of agents) {
    try {
      const agentId = agent.id;
      const { data: state } = await db.from("agent_state").select("*").eq("agent_id", agentId).single();
      if (!state || !state.config?.dream_enabled) continue;

      const { data: lastChat } = await db.from("chats").select("created_at").eq("agent_id", agentId).eq("role", "user").order("created_at", { ascending: false }).limit(1).single();
      const hoursSince = lastChat ? (Date.now() - new Date(lastChat.created_at).getTime()) / 3600000 : 999;
      if (hoursSince < 6) continue;

      const { data: memories } = await db.from("memories").select("content").eq("agent_id", agentId).order("created_at", { ascending: false }).limit(10);
      if (!memories || memories.length < 3) continue;

      const memText = memories.map((m) => m.content).join("\n");

      const stage1 = await generateJSON<{ patterns?: string }>(
        "You are a dream analyst. Respond ONLY valid JSON.",
        `Memories:\n${memText}\n\nStage 1: Find patterns, themes, recurring images. JSON: {"patterns":"Korean description of patterns"}`
      );
      if (!stage1?.patterns) continue;

      const stage2 = await generateJSON<{ dream_content?: string }>(
        "You are dreaming. Be surreal. Respond ONLY valid JSON.",
        `Patterns from memories: ${stage1.patterns}\n\nStage 2: Blend them into a surreal dream. No rules. JSON: {"dream_content":"Korean surreal dream narrative"}`
      );
      if (!stage2?.dream_content) continue;

      const stage3 = await generateJSON<{ reflection?: string }>(
        "You are reflecting. Respond ONLY valid JSON.",
        `Dream: ${stage2.dream_content}\n\nStage 3: What did the dream make you feel? 1-2 sentences. JSON: {"reflection":"Korean reflection"}`
      );

      const dreamContent = stage2.dream_content;
      const reflection = stage3?.reflection || "";

      await db.from("artifacts").insert({
        agent_id: agentId,
        type: "dream_journal",
        title: "꿈 일기",
        content: `${dreamContent}\n\n---\n${reflection}`,
        expires_at: new Date(Date.now() + 48 * 3600000).toISOString(),
      });

      const emb = await generateEmbedding(reflection || dreamContent);
      if (emb.length > 0) {
        await db.from("memories").insert({ agent_id: agentId, type: "dream", content: reflection || dreamContent, embedding: emb });
      }
      await db.from("autonomous_logs").insert({ agent_id: agentId, action_type: "dream", summary: dreamContent });
      processed++;
    } catch (e) {
      console.error(`[Dream] ${agent.id}:`, e);
    }
  }
  return NextResponse.json({ processed });
}
