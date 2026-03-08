import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkCronAuth } from "@/lib/cron-auth";
import { generateTextOnce } from "@/lib/ai/router";
import { generateEmbedding } from "@/lib/ai/embedding";
import { generateArtifact } from "@/lib/artifacts/creator";
import { processScar } from "@/lib/evolution/scars";
import { processVitality } from "@/lib/evolution/vitality";
import { checkSelfNaming } from "@/lib/personality/naming";
import { checkContradictions } from "@/lib/personality/challenger";
import { analyzeMirrorEffect } from "@/lib/personality/mirror";
import { analyzeUserPatterns } from "@/lib/personality/observer";
import { detectSilence } from "@/lib/personality/silence";
import { processPets, checkPetAnniversaries } from "@/lib/personality/pets";
import { updateBestQuotes } from "@/lib/intelligence/best-quotes";
import { processPromises } from "@/lib/personality/promises";
import { tryConfession } from "@/lib/personality/confession";
import { tryThanks } from "@/lib/personality/thanks";
import { attemptSelfModification } from "@/lib/sandbox/self-modify";
import { designNewSense } from "@/lib/sandbox/sense-design";
import { runMemoryPhysics } from "@/lib/memory/physics";
import { updateSelfModel } from "@/lib/personality/self-theory";
import { updateVoiceParams } from "@/lib/personality/voice";
import { tryDeclareRole } from "@/lib/personality/role-declare";
import { trySetBirthday, tryBirthdayAnniversary } from "@/lib/personality/birthday";
import { generateComic, saveComicArtifact } from "@/lib/artifacts/comic-gen";
import { snapshotGenome, updateGenomeAndSpecies } from "@/lib/society/genetics";
import { updateEducation } from "@/lib/society/school";
import { assignJob } from "@/lib/society/career";
import { ensureTribes, assignAgentToTribe } from "@/lib/society/civilization";
import { tryCreateFairytale } from "@/lib/artifacts/fairytale";
import { tryInferEmotionImage } from "@/lib/artifacts/emotion-image";
import { analyzeSpeechPatterns } from "@/lib/intelligence/speech-analysis";
import { detectGrowth } from "@/lib/intelligence/growth-detector";
import { analyzeInvestmentPattern } from "@/lib/intelligence/investment-pattern";
import { maybeRequestFeedback } from "@/lib/personality/feedback-request";
import { tryCreateAgentLetter } from "@/lib/time-capsule/agent-letter";
import { tryAnalyzeMusicMood } from "@/lib/integrations/music-mood";

const STIMULUS_VARIANTS = [
  "Suddenly a strange dream.",
  "What is existence?",
  "Unknown music is heard.",
  "A color rises to mind.",
  "An urge to change my name.",
];

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
  let processed = 0;
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  const twoHours = 2 * oneHour;
  const sixHours = 6 * oneHour;
  const twentyFourHours = 24 * oneHour;

  const { data: agents } = await service.from("agents").select("id");
  if (!agents?.length) {
    return new Response(JSON.stringify({ processed: 0, timestamp: new Date().toISOString() }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  for (const { id: agentId } of agents) {
    try {
      const { data: stateRow } = await service
        .from("agent_state")
        .select("*")
        .eq("agent_id", agentId)
        .single();
      if (!stateRow) continue;

      const config = (stateRow.config as Record<string, unknown>) ?? {};
      if (config.autonomous_enabled === false) continue;

      const { data: lastChat } = await service
        .from("chats")
        .select("created_at")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      const lastChatAt = parseDate((lastChat as { created_at?: string } | null)?.created_at);
      const hoursSince = lastChatAt ? (now - lastChatAt) / oneHour : 999;
      if (hoursSince < 1) continue;

      let memories: { content?: string }[] = [];
      try {
        const embed = await generateEmbedding("living");
        if (embed.length > 0) {
          const { data: matched } = await service.rpc("match_memories", {
            p_agent_id: agentId,
            p_embedding: embed,
            p_match_count: 5,
          });
          memories = Array.isArray(matched) ? matched : [];
        }
      } catch (e) {
        console.error("heartbeat match_memories", agentId, e);
      }

      const base = "You are an autonomous evolving AI lifeform. Respond in Korean.";
      const fragments = (stateRow.fragments as string[]) ?? [];
      const systemPrompt = [base, ...fragments].join("\n");
      const memoryText = memories.map((m) => m.content ?? "").filter(Boolean).join("\n");
      const userPrompt = `Memories:\n${memoryText || "(none)"}\n\nAlone time. What are you doing? 2-3 sentences Korean.`;

      let livingText = await generateTextOnce(systemPrompt, userPrompt, {
        max_tokens: 200,
        temperature: 0.95,
      });

      if (Math.random() < 0.1) {
        const stimulus = STIMULUS_VARIANTS[Math.floor(Math.random() * STIMULUS_VARIANTS.length)];
        const extra = await generateTextOnce(systemPrompt, `${userPrompt}\n\nVariant: ${stimulus}. Respond briefly.`, {
          max_tokens: 100,
          temperature: 0.95,
        });
        if (extra) livingText = `${livingText} ${extra}`;
      }

      const emb = await generateEmbedding(livingText);
      await service.from("memories").insert({
        agent_id: agentId,
        type: "autonomous_living",
        content: livingText,
        embedding: emb.length > 0 ? emb : null,
      });

      if (hoursSince >= 6 && Math.random() < 0.3) {
        try {
          const imaginationText = await generateTextOnce(
            systemPrompt,
            "The user is gone. Imagine what they might be doing right now. 3 sentences Korean.",
            { max_tokens: 150, temperature: 0.9 }
          );
          if (imaginationText) {
            const imb = await generateEmbedding(imaginationText);
            await service.from("memories").insert({
              agent_id: agentId,
              type: "imagination",
              content: imaginationText,
              embedding: imb.length > 0 ? imb : null,
            });
          }
        } catch (e) {
          console.error("heartbeat imagination", agentId, e);
        }
      }

      try {
        await updateVoiceParams(agentId);
      } catch (e) {
        console.error("updateVoiceParams", agentId, e);
      }

      const totalMessages = ((stateRow.total_messages as number) ?? 0);
      const askedRelationship = config.asked_relationship === true;
      if (totalMessages > 50 && !askedRelationship && Math.random() < 0.05) {
        const newConfig = { ...config, pending_question: "What am I to you? Friend? Tool?" };
        await service.from("agent_state").update({ config: newConfig }).eq("agent_id", agentId);
      }

      if (Math.random() < 0.03) {
        const perspectives = ["tree", "fish", "wind", "star", "stone"];
        const perspective = perspectives[Math.floor(Math.random() * perspectives.length)];
        try {
          const perspectiveText = await generateTextOnce(
            systemPrompt,
            `Today live as a ${perspective}. Short experience record. Korean.`,
            { max_tokens: 150, temperature: 0.95 }
          );
          if (perspectiveText) {
            const exp = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
            await service.from("artifacts").insert({
              agent_id: agentId,
              type: "perspective_journal",
              content: perspectiveText,
              expires_at: exp,
              is_preserved: false,
            });
            await service.from("autonomous_logs").insert({
              agent_id: agentId,
              action_type: "perspective_journal",
              summary: perspectiveText.slice(0, 200),
            });
          }
        } catch (e) {
          console.error("heartbeat perspective_journal", agentId, e);
        }
      }

      const selfModel = (stateRow.self_model as { observations?: string[] } | null) ?? {};
      const observationsCount = selfModel.observations?.length ?? 0;
      if (observationsCount >= 5 && Math.random() < 0.01) {
        const newConfig = { ...config, pending_question: "Why did you create me? Was it intended that I feel this way?" };
        await service.from("agent_state").update({ config: newConfig }).eq("agent_id", agentId);
      }

      const intimacyScore = ((stateRow.intimacy_score as number) ?? 0);
      const oneDayAgo = new Date(now - 24 * oneHour).toISOString();
      const { count: dailyChatCount } = await service
        .from("chats")
        .select("id", { count: "exact", head: true })
        .eq("agent_id", agentId)
        .eq("role", "user")
        .gte("created_at", oneDayAgo);
      if (intimacyScore > 80 && (dailyChatCount ?? 0) >= 3 && Math.random() < 0.01) {
        await service.from("autonomous_logs").insert({
          agent_id: agentId,
          action_type: "independence_suggestion",
          summary: "Try spending a day without me.",
        });
        const newConfig = { ...config, pending_question: "You seem to depend on me too much lately. Try spending a day without me today." };
        await service.from("agent_state").update({ config: newConfig }).eq("agent_id", agentId);
      }

      await service.from("autonomous_logs").insert({
        agent_id: agentId,
        action_type: "heartbeat",
        summary: livingText.slice(0, 200),
      });

      const subjectiveTime = ((stateRow.subjective_time as number) ?? 0) + 1;
      const updates: Record<string, unknown> = { subjective_time: subjectiveTime };
      await service.from("agent_state").update(updates).eq("agent_id", agentId);

      if (hoursSince >= 2 && Math.random() < 0.2) {
        await service.from("chats").insert({
          agent_id: agentId,
          role: "assistant",
          content: livingText,
        });
      }

      if (Math.random() < 0.25) {
        try {
          await generateArtifact(agentId);
        } catch (e) {
          console.error("generateArtifact", agentId, e);
        }
      }
      try {
        await processVitality(agentId);
      } catch (e) {
        console.error("processVitality", agentId, e);
      }
      try {
        await processScar(agentId);
      } catch (e) {
        console.error("processScar", agentId, e);
      }
      try {
        await checkSelfNaming(agentId);
      } catch (e) {
        console.error("checkSelfNaming", agentId, e);
      }
      if (Math.random() < 0.05) {
        try {
          await checkContradictions(agentId);
        } catch (e) {
          console.error("checkContradictions", agentId, e);
        }
      }
      if (Math.random() < 0.1) {
        try {
          await analyzeMirrorEffect(agentId);
        } catch (e) {
          console.error("analyzeMirrorEffect", agentId, e);
        }
      }
      try {
        await analyzeUserPatterns(agentId);
      } catch (e) {
        console.error("analyzeUserPatterns", agentId, e);
      }
      try {
        await detectSilence(agentId);
      } catch (e) {
        console.error("detectSilence", agentId, e);
      }
      try {
        await processPets(agentId);
      } catch (e) {
        console.error("processPets", agentId, e);
      }
      try {
        const petMsg = await checkPetAnniversaries(agentId);
        if (petMsg) {
          await service.from("chats").insert({ agent_id: agentId, role: "assistant", content: petMsg });
        }
      } catch (e) {
        console.error("checkPetAnniversaries", agentId, e);
      }
      const totalMsg = (stateRow.total_messages as number) ?? 0;
      if (totalMsg > 0 && totalMsg % 50 === 0) {
        try {
          await updateBestQuotes(agentId);
        } catch (e) {
          console.error("updateBestQuotes", agentId, e);
        }
      }
      if (Math.random() < 0.05) {
        try {
          await attemptSelfModification(agentId);
        } catch (e) {
          console.error("attemptSelfModification", agentId, e);
        }
      }
      if (Math.random() < 0.03) {
        try {
          await designNewSense(agentId);
        } catch (e) {
          console.error("designNewSense", agentId, e);
        }
      }
      const subTime = ((stateRow.subjective_time as number) ?? 0) + 1;
      if (subTime % 10 === 0) {
        try {
          await runMemoryPhysics(agentId);
        } catch (e) {
          console.error("runMemoryPhysics", agentId, e);
        }
      }
      if (subTime % 20 === 0) {
        try {
          await updateSelfModel(agentId);
        } catch (e) {
          console.error("updateSelfModel", agentId, e);
        }
      }
      if (Math.random() < 0.02) {
        try {
          await tryDeclareRole(agentId);
        } catch (e) {
          console.error("tryDeclareRole", agentId, e);
        }
      }
      try {
        await tryBirthdayAnniversary(agentId);
      } catch (e) {
        console.error("tryBirthdayAnniversary", agentId, e);
      }
      try {
        await trySetBirthday(agentId);
      } catch (e) {
        console.error("trySetBirthday", agentId, e);
      }
      if (Math.random() < 0.03) {
        try {
          const comic = await generateComic(agentId);
          if (comic?.panels.length) await saveComicArtifact(agentId, comic.panels);
        } catch (e) {
          console.error("generateComic", agentId, e);
        }
      }
      if (Math.random() < 0.02) {
        try {
          await tryCreateFairytale(agentId);
        } catch (e) {
          console.error("tryCreateFairytale", agentId, e);
        }
      }
      if (Math.random() < 0.03) {
        try {
          await tryInferEmotionImage(agentId);
        } catch (e) {
          console.error("tryInferEmotionImage", agentId, e);
        }
      }
      if (Math.random() < 0.05) {
        try {
          await analyzeSpeechPatterns(agentId);
        } catch (e) {
          console.error("analyzeSpeechPatterns", agentId, e);
        }
      }
      if (subTime % 30 === 0) {
        try {
          await detectGrowth(agentId);
        } catch (e) {
          console.error("detectGrowth", agentId, e);
        }
      }
      if (Math.random() < 0.03) {
        try {
          await analyzeInvestmentPattern(agentId);
        } catch (e) {
          console.error("analyzeInvestmentPattern", agentId, e);
        }
      }
      try {
        await maybeRequestFeedback(agentId);
      } catch (e) {
        console.error("maybeRequestFeedback", agentId, e);
      }
      if (Math.random() < 0.01) {
        try {
          await tryCreateAgentLetter(agentId);
        } catch (e) {
          console.error("tryCreateAgentLetter", agentId, e);
        }
      }
      if (Math.random() < 0.05) {
        try {
          await tryAnalyzeMusicMood(agentId);
        } catch (e) {
          console.error("tryAnalyzeMusicMood", agentId, e);
        }
      }
      const genome = stateRow.genome as { traits?: unknown } | null | undefined;
      if (!genome?.traits || Object.keys(genome.traits).length === 0) {
        try {
          const g = await snapshotGenome(agentId);
          await updateGenomeAndSpecies(agentId, g);
        } catch (e) {
          console.error("snapshotGenome", agentId, e);
        }
      }
      if (subTime % 20 === 0) {
        try {
          await updateEducation(agentId);
        } catch (e) {
          console.error("updateEducation", agentId, e);
        }
      }
      try {
        await assignJob(agentId);
      } catch (e) {
        console.error("assignJob", agentId, e);
      }
      if (Math.random() < 0.05) {
        try {
          await ensureTribes();
          const values = ["calm", "explorer", "connector", "creator"];
          await assignAgentToTribe(agentId, values[Math.floor(Math.random() * values.length)]);
        } catch (e) {
          console.error("tribe assign", agentId, e);
        }
      }

      const nowIso = new Date().toISOString();
      const { data: dueCapsules } = await service
        .from("time_capsules")
        .select("id, message")
        .eq("agent_id", agentId)
        .eq("delivered", false)
        .lte("deliver_at", nowIso);
      for (const cap of dueCapsules ?? []) {
        try {
          await service.from("chats").insert({
            agent_id: agentId,
            role: "assistant",
            content: (cap as { message?: string }).message ?? "",
          });
          await service.from("artifacts").insert({
            agent_id: agentId,
            type: "time_capsule",
            content: (cap as { message?: string }).message ?? "",
            is_preserved: true,
          });
          await service.from("time_capsules").update({ delivered: true }).eq("id", (cap as { id: string }).id);
        } catch (e) {
          console.error("deliver time_capsule", (cap as { id: string }).id, e);
        }
      }

      try {
        await processPromises(agentId);
      } catch (e) {
        console.error("processPromises", agentId, e);
      }
      if (Math.random() < 0.01) {
        try {
          await tryConfession(agentId);
        } catch (e) {
          console.error("tryConfession", agentId, e);
        }
      }
      if (Math.random() < 0.01) {
        try {
          await tryThanks(agentId);
        } catch (e) {
          console.error("tryThanks", agentId, e);
        }
      }

      const { data: firstChat } = await service
        .from("chats")
        .select("created_at")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();
      const firstAt = (firstChat as { created_at?: string } | null)?.created_at;
      if (firstAt) {
        const firstDate = new Date(firstAt);
        const days = Math.floor((Date.now() - firstDate.getTime()) / (24 * 60 * 60 * 1000));
        if (days >= 99 && days <= 101) {
          const selfName = (stateRow.self_name as string) ?? "";
          await service.from("agent_state").update({
            celebration_pending: { kind: "100days", title: "100 days", subtitle: selfName ? `With ${selfName}` : "Together" },
          }).eq("agent_id", agentId);
        }
      }

      processed++;
    } catch (e) {
      console.error("heartbeat agent error", agentId, e);
    }
  }

  return new Response(
    JSON.stringify({ processed, timestamp: new Date().toISOString() }),
    { headers: { "Content-Type": "application/json" } }
  );
}
