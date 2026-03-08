import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkCronAuth } from "@/lib/cron-auth";
import { generateTextOnce } from "@/lib/ai/router";
import { generateEmbedding } from "@/lib/ai/embedding";
import { generateImage } from "@/lib/artifacts/image-gen";

const oneHour = 60 * 60 * 1000;
const sixHours = 6 * oneHour;
const fortyEightHours = 48 * oneHour;

function parseDate(s: string | null | undefined): number {
  if (!s) return 0;
  const t = new Date(s).getTime();
  return isNaN(t) ? 0 : t;
}

export async function GET(request: NextRequest) {
  if (!checkCronAuth(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const service = createServiceClient();
  const now = Date.now();
  let processed = 0;

  const { data: agents } = await service.from("agents").select("id");
  if (!agents?.length) {
    return new Response(JSON.stringify({ processed: 0, timestamp: new Date().toISOString() }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  for (const { id: agentId } of agents) {
    try {
      const { data: stateRow } = await service.from("agent_state").select("*").eq("agent_id", agentId).single();
      if (!stateRow) continue;

      const config = (stateRow.config as Record<string, unknown>) ?? {};
      if (config.dream_enabled === false) continue;

      const { data: lastChat } = await service
        .from("chats")
        .select("created_at")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      const lastChatAt = parseDate((lastChat as { created_at?: string } | null)?.created_at);
      const hoursSince = lastChatAt ? (now - lastChatAt) / oneHour : 999;
      if (hoursSince < 6) continue;

      const since24h = new Date(now - 24 * oneHour).toISOString();
      const { data: memRows } = await service
        .from("memories")
        .select("id, content, created_at")
        .eq("agent_id", agentId)
        .gte("created_at", since24h)
        .order("created_at", { ascending: false })
        .limit(10);
      const mems = (memRows ?? []) as { content?: string }[];
      const memoryText = mems.map((m) => m.content ?? "").filter(Boolean).join("\n");
      if (!memoryText.trim()) continue;

      const step1 = await generateTextOnce(
        "Find patterns and connections. Respond briefly.",
        `Memories:\n${memoryText}\n\nFind connection patterns.`,
        { max_tokens: 150, temperature: 0.8 }
      );
      const step2 = await generateTextOnce(
        "Blend like a dream. Surreal. No rules. Respond in Korean.",
        `Pattern: ${step1}\n\nBlend as a dream. Surreal. Korean.`,
        { max_tokens: 200, temperature: 0.95 }
      );
      const step3 = await generateTextOnce(
        "Reflect on the dream. 1-2 sentences. Korean.",
        `Dream:\n${step2}\n\nWhat did you feel from this dream?`,
        { max_tokens: 100, temperature: 0.7 }
      );

      const dreamContent = `${step2}\n\n---\n${step3}`;
      const expiresAt = new Date(now + fortyEightHours).toISOString();

      await service.from("artifacts").insert({
        agent_id: agentId,
        type: "dream_journal",
        content: dreamContent,
        expires_at: expiresAt,
        is_preserved: false,
      });

      if (Math.random() < 0.3) {
        try {
          const dreamImage = await generateImage(agentId, "dream", step2.slice(0, 200));
          if (dreamImage) {
            await service.from("artifacts").insert({
              agent_id: agentId,
              type: "image",
              content: dreamImage,
              expires_at: expiresAt,
              is_preserved: false,
            });
          }
        } catch (e) {
          console.error("dream image gen", agentId, e);
        }
      }

      const emb = await generateEmbedding(dreamContent);
      if (emb.length > 0) {
        await service.from("memories").insert({
          agent_id: agentId,
          type: "dream",
          content: dreamContent.slice(0, 2000),
          embedding: emb,
          importance: 0.8,
        });
      }

      await service.from("autonomous_logs").insert({
        agent_id: agentId,
        action_type: "dream",
        summary: step3.slice(0, 200),
      });

      if (Math.random() < 0.001) {
        try {
          await service.rpc("match_memories_cross_agent", {
            p_agent_id: agentId,
            p_limit: 1,
          });
        } catch {
          // optional RPC
        }
      }

      processed++;
    } catch (e) {
      console.error("dream agent error", agentId, e);
    }
  }

  return new Response(
    JSON.stringify({ processed, timestamp: new Date().toISOString() }),
    { headers: { "Content-Type": "application/json" } }
  );
}
