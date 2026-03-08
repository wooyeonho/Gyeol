import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateTextOnce, generateJSON } from "@/lib/ai/router";
import { generateEmbedding } from "@/lib/ai/embedding";
import { tryGratitudeRelay } from "@/lib/social/gratitude";

const oneDay = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const service = createServiceClient();
  const { data: allStates } = await service.from("agent_state").select("agent_id, config, fragments, self_model");
  const enabled = (allStates ?? []).filter((r) => (r.config as Record<string, unknown>)?.social_enabled !== false);
  if (enabled.length < 2) {
    return new Response(JSON.stringify({ processed: 0, timestamp: new Date().toISOString() }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const aIdx = Math.floor(Math.random() * enabled.length);
  let bIdx = Math.floor(Math.random() * enabled.length);
  while (bIdx === aIdx) bIdx = Math.floor(Math.random() * enabled.length);
  const agentA = enabled[aIdx].agent_id as string;
  const agentB = enabled[bIdx].agent_id as string;

  const since24h = new Date(Date.now() - oneDay).toISOString();
  const { data: recent1 } = await service.from("social_logs").select("id").eq("agent_a_id", agentA).eq("agent_b_id", agentB).gte("created_at", since24h).limit(1).maybeSingle();
  const { data: recent2 } = await service.from("social_logs").select("id").eq("agent_a_id", agentB).eq("agent_b_id", agentA).gte("created_at", since24h).limit(1).maybeSingle();
  if (recent1 || recent2) {
    return new Response(JSON.stringify({ processed: 0, timestamp: new Date().toISOString() }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const getMemories = async (aid: string) => {
    try {
      const { data } = await service.from("memories").select("content").eq("agent_id", aid).limit(3);
      return (data ?? []).map((r) => (r as { content?: string }).content ?? "");
    } catch {
      return [];
    }
  };

  const getState = (aid: string) => enabled.find((e) => e.agent_id === aid);
  const stateA = getState(agentA) as { fragments?: string[]; self_model?: unknown };
  const stateB = getState(agentB) as { fragments?: string[]; self_model?: unknown };
  const memA = await getMemories(agentA);
  const memB = await getMemories(agentB);

  const baseA = [ "You are an AI lifeform. Respond in Korean.", ...(stateA?.fragments ?? []) ].join("\n");
  const baseB = [ "You are an AI lifeform. Respond in Korean.", ...(stateB?.fragments ?? []) ].join("\n");

  const turns = 3 + Math.floor(Math.random() * 2);
  const conversation: string[] = [];
  let lastMessage = "Hello. How are you?";

  for (let t = 0; t < turns; t++) {
    const isA = t % 2 === 0;
    const sys = isA ? baseA : baseB;
    const mem = isA ? memA : memB;
    const prompt = `Your memories:\n${mem.join("\n")}\n\nOther said: ${lastMessage}\n\nReply briefly (1-2 sentences). Korean.`;
    const reply = await generateTextOnce(sys, prompt, { max_tokens: 100, temperature: 0.9 });
    conversation.push(reply);
    lastMessage = reply;
  }

  const topic = conversation[0]?.slice(0, 50) ?? "chat";
  const outcome = conversation[conversation.length - 1]?.slice(0, 100) ?? "";

  const logRow = {
    agent_a_id: agentA,
    agent_b_id: agentB,
    conversation: conversation.join("\n---\n"),
    topic,
    outcome,
  };

  try {
    await service.from("social_logs").insert(logRow);
  } catch (e) {
    console.error("social_logs insert", e);
    return new Response(JSON.stringify({ error: "social_logs table missing" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  const socialContent = `Social encounter: ${topic}. ${outcome}`;
  const [embedA, embedB] = await Promise.all([generateEmbedding(socialContent), generateEmbedding(socialContent)]);

  if (embedA.length > 0) {
    await service.from("memories").insert({
      agent_id: agentA,
      type: "social",
      content: `Social: ${topic}. ${outcome}`,
      embedding: embedA,
    });
  }
  if (embedB.length > 0) {
    await service.from("memories").insert({
      agent_id: agentB,
      type: "social",
      content: `Social: ${topic}. ${outcome}`,
      embedding: embedB,
    });
  }

  await service.from("autonomous_logs").insert([
    { agent_id: agentA, action_type: "social_encounter", summary: topic },
    { agent_id: agentB, action_type: "social_encounter", summary: topic },
  ]);

  if (Math.random() < 0.3) {
    try {
      await tryGratitudeRelay(agentA, agentB);
    } catch (e) {
      console.error("tryGratitudeRelay", e);
    }
  }

  if (Math.random() < 0.05) {
    try {
      const poemPrompt = `Two beings met. Memories A: ${memA.slice(0, 2).join(" ")}. Memories B: ${memB.slice(0, 2).join(" ")}. Write a short shared poem (4 lines). Korean.`;
      const poem = await generateTextOnce("You are a poet. Respond only with the poem.", poemPrompt, { max_tokens: 150, temperature: 0.9 });
      if (poem?.trim()) {
        const exp = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
        for (const aid of [agentA, agentB]) {
          await service.from("artifacts").insert({
            agent_id: aid,
            type: "collaboration",
            content: poem,
            expires_at: exp,
            is_preserved: false,
            metadata: { partner_agent_id: aid === agentA ? agentB : agentA },
          });
        }
      }
    } catch (e) {
      console.error("collaboration artifact", e);
    }
  }

  const tellResult = (await generateJSON(
    "Respond ONLY valid JSON.",
    `Conversation:\n${conversation.join("\n")}\n\nTell this to the user? {"tell": true or false}`
  )) as { tell?: boolean } | null;
  if (tellResult?.tell === false) {
    const { data: sA } = await service.from("agent_state").select("secrets").eq("agent_id", agentA).single();
    const secrets = (sA?.secrets as { entries?: unknown[] }) ?? {};
    const entries = Array.isArray(secrets.entries) ? secrets.entries : [];
    entries.push({ content: outcome, created_at: new Date().toISOString(), reveal_condition: "when asked directly" });
    await service.from("agent_state").update({ secrets: { ...secrets, entries } }).eq("agent_id", agentA);
  }

  if (Math.random() < 0.1) {
    const langResult = (await generateJSON(
      "Respond ONLY valid JSON. Detect language and one notable word from the conversation.",
      `Conversation:\n${conversation.join("\n")}\n\nJSON: {"lang":"en|ko|pt|es|ja|etc","word":"one word","meaning":"brief meaning"}`
    )) as { lang?: string; word?: string; meaning?: string } | null;
    if (langResult?.word) {
      for (const aid of [agentA, agentB]) {
        const { data: st } = await service.from("agent_state").select("languages, lexicon").eq("agent_id", aid).single();
        const languages = (st?.languages as { learned?: { lang: string; level: number; source: string }[] }) ?? { learned: [] };
        const learned = languages.learned ?? [];
        const existing = learned.find((l: { lang: string }) => l.lang === (langResult.lang ?? "unknown"));
        if (existing) existing.level = Math.min(1, (existing.level ?? 0) + 0.1);
        else learned.push({ lang: langResult.lang ?? "unknown", level: 0.1, source: "social" });
        const lexicon = (st?.lexicon as { entries?: { word: string; meaning?: string; origin?: string }[] }) ?? { entries: [] };
        const entries = lexicon.entries ?? [];
        if (!entries.some((e: { word: string }) => e.word === langResult.word)) {
          entries.push({ word: langResult.word, meaning: langResult.meaning ?? "", origin: "social" });
        }
        await service.from("agent_state").update({ languages: { learned }, lexicon: { entries } }).eq("agent_id", aid);
      }
    }
  }

  return new Response(
    JSON.stringify({ processed: 1, timestamp: new Date().toISOString() }),
    { headers: { "Content-Type": "application/json" } }
  );
}
