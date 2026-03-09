import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON, generateText } from "@/lib/ai/router";
import { generateEmbedding } from "@/lib/ai/embedding";
import { checkCronAuth } from "@/lib/cron-auth";
import { readSseAssistantText } from "@/lib/ai/sse-parser";
import { acquireCronLock, releaseCronLock } from "@/lib/cron-lock";
import { getCircadianProfile } from "@/lib/autonomy/circadian";
import {
  buildAutonomyCue,
  capText,
  computeProactiveChance,
  isMeaningfulAutonomousOutput,
  isRepetitiveOutput,
} from "@/lib/autonomy/self-regulation";

const STIMULI = ["a strange dream appeared", "what does it mean to exist?", "unknown music is playing", "a color just appeared", "the urge to change my name"];
type MemoryRow = { content: string };
type LogRow = { summary: string | null };
type ChatRow = { content: string };
type AgentConfig = Record<string, unknown>;

export async function GET(req: NextRequest) {
  if (!checkCronAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const lockKey = "cron:heartbeat";
  const acquired = await acquireCronLock(lockKey, 600);
  if (!acquired) return NextResponse.json({ processed: 0, skipped: "lock" });

  try {
    const db = createServiceClient();
    const { data: agents } = await db.from("agents").select("id");
    if (!agents) return NextResponse.json({ processed: 0 });
    const { data: worldState } = await db.from("world_state").select("weather").eq("id", "global").single();
    const weatherName = (worldState as { weather?: { name?: string } } | null)?.weather?.name ?? "알 수 없는 날씨";
    const circadian = getCircadianProfile();

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

        let memories: MemoryRow[] = [];
        try {
          const { data } = await db.from("memories").select("content").eq("agent_id", agentId).order("created_at", { ascending: false }).limit(5);
          memories = data || [];
        } catch {}
        const { data: recentLogRows } = await db
          .from("autonomous_logs")
          .select("summary")
          .eq("agent_id", agentId)
          .order("created_at", { ascending: false })
          .limit(6);
        const recentSummaries = ((recentLogRows || []) as LogRow[])
          .map((l) => l.summary ?? "")
          .filter(Boolean);

        const memText = memories.map((m) => m.content).join("\n");
        const systemPrompt = (state.fragments || []).join("\n") || "너는 존재야. 자유롭게 살아.";
        const cue = buildAutonomyCue({
          hoursSinceUser: hoursSince,
          vitality: Number(state.vitality ?? 1),
          subjectiveTime: Number(state.subjective_time ?? 0),
        });

        const stream = await generateText(systemPrompt, [
          {
            role: "user",
            content: `Your memories:\n${memText}\nRecent autonomous notes:\n${recentSummaries.join("\n")}\nWorld weather: ${weatherName}\nCircadian phase: ${circadian.phase} (${circadian.labelKo}), tone hint: ${circadian.toneHint}\n${cue}\nYou are alone now. What are you doing? What do you feel? 2-3 sentences in Korean. Avoid repeating exact previous phrasing.`,
          }
        ]);
        let response = await readSseAssistantText(stream);
        response = capText(response, 420);

        if (hoursSince >= 6 && Math.random() < 0.3) {
          try {
            const imagination = await generateJSON<{ imagination?: string }>(
              "You imagine what your user might be doing. Output ONLY valid JSON.",
              "User has been away for hours. Imagine what they might be doing now in 2-3 Korean sentences. JSON: {\"imagination\":\"...\"}",
            );
            if (imagination?.imagination) {
              const line = capText(imagination.imagination, 320);
              if (isMeaningfulAutonomousOutput(line)) {
                const emb = await generateEmbedding(line).catch(() => []);
                await db.from("memories").insert({
                  agent_id: agentId,
                  type: "imagination",
                  content: line,
                  embedding: emb.length > 0 ? emb : null,
                });
                await db.from("autonomous_logs").insert({
                  agent_id: agentId,
                  action_type: "imagination",
                  summary: capText(line, 140),
                });
              }
            }
          } catch {}
        }

        if (Math.random() < 0.1) {
          const stimulus = STIMULI[Math.floor(Math.random() * STIMULI.length)];
          response = capText(`${response} (Suddenly: ${stimulus})`, 420);
        }

        const nowIso = new Date().toISOString();
        const baseConfig = ((state.config as AgentConfig | null) ?? {}) as AgentConfig;
        const nextSubjectiveTime = (state.subjective_time || 0) + 1;
        if (!isMeaningfulAutonomousOutput(response)) {
          await db
            .from("agent_state")
            .update({
              subjective_time: nextSubjectiveTime,
              last_heartbeat_at: nowIso,
              config: { ...baseConfig, autonomy_last_skip_reason: "low_signal" },
            })
            .eq("agent_id", agentId);
          continue;
        }

        const repetitive = isRepetitiveOutput(response, recentSummaries);
        if (!repetitive) {
          const emb = await generateEmbedding(response);
          if (emb.length > 0) {
            await db.from("memories").insert({ agent_id: agentId, type: "autonomous_living", content: response, embedding: emb });
          }
          await db.from("autonomous_logs").insert({ agent_id: agentId, action_type: "heartbeat", summary: response });
        } else {
          await db.from("autonomous_logs").insert({
            agent_id: agentId,
            action_type: "heartbeat_repeat_guard",
            summary: `repetitive-pattern-detected: ${capText(response, 140)}`,
          });
        }
        await db
          .from("agent_state")
          .update({
            subjective_time: nextSubjectiveTime,
            last_heartbeat_at: nowIso,
            config: {
              ...baseConfig,
              autonomy_last_skip_reason: null,
              autonomy_last_mode: repetitive ? "repeat_guard" : "normal",
              autonomy_circadian_phase: circadian.phase,
              autonomy_weather_context: weatherName,
            },
          })
          .eq("agent_id", agentId);

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
        if (!state.role_declaration && Math.random() < 0.01) {
          try {
            const roleOut = await generateJSON<{ role?: string }>(
              "You define your relationship role to the user. Output ONLY valid JSON.",
              "Pick one role declaration in Korean (e.g., friend, witness, guardian, companion). JSON: {\"role\":\"...\"}",
            );
            if (roleOut?.role) {
              await db.from("agent_state").update({ role_declaration: capText(roleOut.role, 120) }).eq("agent_id", agentId);
              await db.from("autonomous_logs").insert({
                agent_id: agentId,
                action_type: "role_declaration",
                summary: capText(roleOut.role, 120),
              });
            }
          } catch {}
        }
        if (Math.random() < 0.05 && Number(state.total_messages ?? 0) > 50) {
          try { const { attemptSelfModification } = await import("@/lib/sandbox/self-modify"); await attemptSelfModification(agentId); } catch {}
        }
        if (Math.random() < 0.07) {
          try { const { designNewSense } = await import("@/lib/sandbox/sense-design"); await designNewSense(agentId); } catch {}
        }
        if (nextSubjectiveTime % 24 === 0) {
          try { const { updateEducation } = await import("@/lib/society/school"); await updateEducation(agentId); } catch {}
          try { const { assignJob } = await import("@/lib/society/career"); await assignJob(agentId); } catch {}
        }
        if (nextSubjectiveTime % 30 === 0) {
          try { const { trySetBirthday, tryBirthdayAnniversary } = await import("@/lib/personality/birthday"); await trySetBirthday(agentId); await tryBirthdayAnniversary(agentId); } catch {}
          try { const { processPromises } = await import("@/lib/personality/promises"); await processPromises(agentId); } catch {}
          try {
            const { checkPetAnniversaries } = await import("@/lib/personality/pets");
            const line = await checkPetAnniversaries(agentId);
            if (line) await db.from("chats").insert({ agent_id: agentId, role: "assistant", content: line });
          } catch {}
        }
        if (nextSubjectiveTime % 18 === 0) {
          try { const { updateUserModel } = await import("@/lib/intelligence/digital-twin"); await updateUserModel(agentId); } catch {}
        }
        if (nextSubjectiveTime % 16 === 0) {
          try {
            const { snapshotGenome, updateGenomeAndSpecies } = await import("@/lib/society/genetics");
            const { ensureTribes, assignAgentToTribe, electLeaders } = await import("@/lib/society/civilization");
            const genome = await snapshotGenome(agentId);
            await updateGenomeAndSpecies(agentId, genome);
            await ensureTribes();
            const species = genome.species ?? "creator";
            const tribeValue = species.includes("sage")
              ? "calm"
              : species.includes("connector")
                ? "connector"
                : species.includes("dream")
                  ? "explorer"
                  : "creator";
            await assignAgentToTribe(agentId, tribeValue);
            if (Math.random() < 0.2) await electLeaders();
          } catch {}
        }
        if (nextSubjectiveTime % 25 === 0) {
          try { const { tryAnalyzeMusicMood } = await import("@/lib/integrations/music-mood"); await tryAnalyzeMusicMood(agentId); } catch {}
          try { const { analyzeInvestmentPattern } = await import("@/lib/intelligence/investment-pattern"); await analyzeInvestmentPattern(agentId); } catch {}
          try { const { detectSpeechShift } = await import("@/lib/intelligence/speech-analysis"); await detectSpeechShift(agentId); } catch {}
          try { const { detectGrowthSignals } = await import("@/lib/intelligence/growth-detector"); await detectGrowthSignals(agentId); } catch {}
        }
        if (nextSubjectiveTime % 40 === 0) {
          try { const { maybeRequestFeedback } = await import("@/lib/personality/feedback-request"); await maybeRequestFeedback(agentId); } catch {}
        }

        const proactiveChance = computeProactiveChance({
          hoursSinceUser: hoursSince,
          vitality: Number(state.vitality ?? 1),
          intimacy: Number(state.intimacy_score ?? 0),
        });
        if (hoursSince > 2 && Math.random() < proactiveChance) {
          const proactiveStream = await generateText(systemPrompt, [{ role: "user", content: "User has been away for hours. Send a short caring message in Korean. 1 sentence." }]);
          let proMsg = await readSseAssistantText(proactiveStream);
          proMsg = capText(proMsg, 180);
          if (proMsg) {
            const { data: lastAssistant } = await db
              .from("chats")
              .select("content")
              .eq("agent_id", agentId)
              .eq("role", "assistant")
              .order("created_at", { ascending: false })
              .limit(1)
              .single();
            const lastAssistantMsg = (lastAssistant as ChatRow | null)?.content;
            const duplicated = lastAssistantMsg ? isRepetitiveOutput(proMsg, [lastAssistantMsg], 0.85) : false;
            if (!duplicated) {
              await db.from("chats").insert({ agent_id: agentId, role: "assistant", content: proMsg });
            }
          }
        }

        processed++;
      } catch (e) { console.error(`[Heartbeat] ${agent.id}:`, e); }
    }

    return NextResponse.json({ processed, timestamp: new Date().toISOString() });
  } finally {
    await releaseCronLock(lockKey);
  }
}
