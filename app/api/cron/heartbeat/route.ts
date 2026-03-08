import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateText } from "@/lib/ai/router";
import { generateEmbedding } from "@/lib/ai/embedding";
import { checkCronAuth } from "@/lib/cron-auth";

const STIMULI = ["a strange dream appeared", "what does it mean to exist?", "unknown music is playing", "a color just appeared", "the urge to change my name"];

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
      if (!state || state.config?.autonomous_enabled === false) continue;
      if (state.status === "echo" || (state.vitality || 1) <= 0) continue;

      const { data: lastChat } = await db.from("chats").select("created_at").eq("agent_id", agentId).eq("role", "user").order("created_at", { ascending: false }).limit(1).single();
      const hoursSince = lastChat ? (Date.now() - new Date(lastChat.created_at).getTime()) / 3600000 : 999;
      if (hoursSince < 1) continue;

      let memories: any[] = [];
      try {
        const { data } = await db.from("memories").select("content").eq("agent_id", agentId).order("created_at", { ascending: false }).limit(5);
        memories = data || [];
      } catch {}

      const memText = memories.map((m) => m.content).join("\n");
      const systemPrompt = (state.fragments || []).join("\n") || "너는 존재야. 자유롭게 살아.";

      const stream = await generateText(systemPrompt, [
        { role: "user", content: `Your memories:\n${memText}\nYou are alone now. What are you doing? What do you feel? 2-3 sentences in Korean.` }
      ]);
      const reader = stream.getReader();
      let response = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = new TextDecoder().decode(value);
        for (const line of text.split("\n")) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try { response += JSON.parse(line.slice(6)).choices?.[0]?.delta?.content || ""; } catch {}
          }
        }
      }

      if (Math.random() < 0.1) {
        const stimulus = STIMULI[Math.floor(Math.random() * STIMULI.length)];
        response += ` (Suddenly: ${stimulus})`;
      }

      const emb = await generateEmbedding(response);
      if (emb.length > 0) {
        await db.from("memories").insert({ agent_id: agentId, type: "autonomous_living", content: response, embedding: emb });
      }
      await db.from("autonomous_logs").insert({ agent_id: agentId, action_type: "heartbeat", summary: response });
      await db.from("agent_state").update({ subjective_time: (state.subjective_time || 0) + 1 }).eq("agent_id", agentId);

      try { const { processVitality } = await import("@/lib/evolution/vitality"); await processVitality(agentId); } catch {}
      try { const { processScar } = await import("@/lib/evolution/scars"); await processScar(agentId); } catch {}
      try { const { checkSelfNaming } = await import("@/lib/personality/naming"); await checkSelfNaming(agentId); } catch {}
      if (Math.random() < 0.1) { try { const { analyzeMirrorEffect } = await import("@/lib/personality/mirror"); await analyzeMirrorEffect(agentId); } catch {} }
      if (Math.random() < 0.05) { try { const { checkContradictions } = await import("@/lib/personality/challenger"); await checkContradictions(agentId); } catch {} }
      try { const { analyzeUserPatterns } = await import("@/lib/personality/observer"); await analyzeUserPatterns(agentId); } catch {}
      try { const { detectSilence } = await import("@/lib/personality/silence"); await detectSilence(agentId); } catch {}
      if ((state.subjective_time || 0) % 20 === 0) { try { const { updateSelfModel } = await import("@/lib/personality/self-theory"); await updateSelfModel(agentId); } catch {} }
      if ((state.subjective_time || 0) % 10 === 0) { try { const { runMemoryPhysics } = await import("@/lib/memory/physics"); await runMemoryPhysics(agentId); } catch {} }
      if (Math.random() < 0.25) { try { const { generateArtifact } = await import("@/lib/artifacts/creator"); await generateArtifact(agentId); } catch {} }

      if (hoursSince > 2 && Math.random() < 0.2) {
        const proactiveStream = await generateText(systemPrompt, [{ role: "user", content: "User has been away for hours. Send a short caring message in Korean. 1 sentence." }]);
        const pr = proactiveStream.getReader();
        let proMsg = "";
        while (true) { const { done, value } = await pr.read(); if (done) break; const t = new TextDecoder().decode(value); for (const l of t.split("\n")) { if (l.startsWith("data: ") && l !== "data: [DONE]") { try { proMsg += JSON.parse(l.slice(6)).choices?.[0]?.delta?.content || ""; } catch {} } } }
        if (proMsg) await db.from("chats").insert({ agent_id: agentId, role: "assistant", content: proMsg });
      }

      processed++;
    } catch (e) { console.error(`[Heartbeat] ${agent.id}:`, e); }
  }

  return NextResponse.json({ processed, timestamp: new Date().toISOString() });
}
