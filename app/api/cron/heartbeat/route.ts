import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateText } from "@/lib/ai/router";
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
import { getResolvedBillingState } from "@/lib/billing/service";
import { computeIntervalHours, normalizeIntervalRule } from "@/lib/autonomy/interval-rule";
import { planHeartbeatAutonomy } from "@/lib/autonomy/heartbeat-planner";

type MemoryRow = { content: string };
type LogRow = { summary: string | null };
type ChatRow = { content: string };
type AgentConfig = Record<string, unknown>;

function getAppBaseUrl(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) return appUrl.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return req.nextUrl.origin;
}

async function triggerAutonomousAction(baseUrl: string, action: "learner" | "crawl", cronSecret: string) {
  const endpoint = action === "learner" ? "/api/cron/learner" : "/api/cron/crawl";
  try {
    await fetch(`${baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ source: "heartbeat" }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (error) {
    console.error(`[Heartbeat] immediate ${action} trigger failed`, error);
  }
}

export async function GET(req: NextRequest) {
  if (!checkCronAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const lockKey = "cron:heartbeat";
  const acquired = await acquireCronLock(lockKey, 600);
  if (!acquired) return NextResponse.json({ processed: 0, skipped: "lock" });

  try {
    const db = createServiceClient();
    const baseUrl = getAppBaseUrl(req);
    const cronSecret = process.env.CRON_SECRET ?? "";
    const { data: agents } = await db.from("agents").select("id, user_id");
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
        const baseConfig = ((state.config as AgentConfig | null) ?? {}) as AgentConfig;
        const intervalRule = normalizeIntervalRule((baseConfig.autonomy_interval_rule as Record<string, unknown> | null) ?? null);
        const requiredIntervalHours = computeIntervalHours({
          hoursSinceUser: hoursSince,
          phase: circadian.phase,
          rule: intervalRule,
          vitality: Number(state.vitality ?? 1),
        });
        if (hoursSince < requiredIntervalHours) continue;

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

        const nowIso = new Date().toISOString();
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
        const nextConfig: AgentConfig = {
          ...baseConfig,
          autonomy_last_skip_reason: null,
          autonomy_last_mode: repetitive ? "repeat_guard" : "normal",
          autonomy_circadian_phase: circadian.phase,
          autonomy_weather_context: weatherName,
        };
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
            config: nextConfig,
          })
          .eq("agent_id", agentId);

        const autonomyPlan = await planHeartbeatAutonomy({
          activeGoal: typeof baseConfig.active_goal === "string" ? baseConfig.active_goal : null,
          currentRule: (baseConfig.autonomy_interval_rule as Record<string, unknown> | null) ?? null,
          hoursSinceUser: hoursSince,
          reflection: response,
          weatherName,
        });

        if (autonomyPlan?.stimulus) {
          const stimulusResponse = capText(`${response} (Suddenly: ${autonomyPlan.stimulus})`, 420);
          await db.from("autonomous_logs").insert({
            agent_id: agentId,
            action_type: "heartbeat_stimulus",
            summary: stimulusResponse,
          });
          response = stimulusResponse;
        }

        if (autonomyPlan?.updated_interval_rule) {
          await db
            .from("agent_state")
            .update({
              config: {
                ...nextConfig,
                autonomy_interval_rule: normalizeIntervalRule(autonomyPlan.updated_interval_rule),
              },
            })
            .eq("agent_id", agentId);
        }

        if (autonomyPlan?.self_observation) {
          const currentSelfModel = (state.self_model as { observations?: string[] } | null) ?? {};
          const observations = Array.isArray(currentSelfModel.observations) ? currentSelfModel.observations : [];
          await db
            .from("agent_state")
            .update({
              self_model: {
                ...currentSelfModel,
                observations: [...observations.slice(-8), autonomyPlan.self_observation],
              },
            })
            .eq("agent_id", agentId);
        }

        if (autonomyPlan?.research_task) {
          await db.from("research_tasks").insert({
            agent_id: agentId,
            priority: autonomyPlan.task_priority ?? 2,
            source: autonomyPlan.action === "crawl" ? "heartbeat_crawl" : autonomyPlan.action === "learner" ? "heartbeat_learner" : "heartbeat",
            status: "pending",
            title: autonomyPlan.research_task,
          });
          await db.from("autonomous_logs").insert({
            agent_id: agentId,
            action_type: "heartbeat_task_created",
            summary: `Autonomous task created: ${autonomyPlan.research_task}`,
          });
          if (cronSecret && (autonomyPlan.action === "learner" || autonomyPlan.action === "crawl")) {
            await triggerAutonomousAction(baseUrl, autonomyPlan.action, cronSecret);
            await db.from("autonomous_logs").insert({
              agent_id: agentId,
              action_type: "heartbeat_action_triggered",
              summary: `Triggered immediate ${autonomyPlan.action} execution for task: ${autonomyPlan.research_task}`,
            });
          }
        }

        try { const { processVitality } = await import("@/lib/evolution/vitality"); await processVitality(agentId); } catch {}
        try { const { processScar } = await import("@/lib/evolution/scars"); await processScar(agentId); } catch {}
        try { const { checkSelfNaming } = await import("@/lib/personality/naming"); await checkSelfNaming(agentId); } catch {}
        if (Math.random() < 0.1) { try { const { analyzeMirrorEffect } = await import("@/lib/personality/mirror"); await analyzeMirrorEffect(agentId); } catch {} }
        if (Math.random() < 0.05) { try { const { checkContradictions } = await import("@/lib/personality/challenger"); await checkContradictions(agentId); } catch {} }
        try { const { analyzeUserPatterns } = await import("@/lib/personality/observer"); await analyzeUserPatterns(agentId); } catch {}
        try { const { detectSilence } = await import("@/lib/personality/silence"); await detectSilence(agentId); } catch {}
        if ((state.subjective_time || 0) % 20 === 0) { try { const { updateSelfModel } = await import("@/lib/personality/self-theory"); await updateSelfModel(agentId); } catch {} }
        if ((state.subjective_time || 0) % 10 === 0) { try { const { runMemoryPhysics } = await import("@/lib/memory/physics"); await runMemoryPhysics(agentId); } catch {} }
        if (Math.random() < 0.25) {
          try {
            const userId = (agent as { user_id?: string }).user_id;
            if (userId) {
              const billing = await getResolvedBillingState(db, userId);
              if (billing.entitlements.premium_generation || billing.entitlements.advanced_recaps) {
                const { generateArtifact } = await import("@/lib/artifacts/creator");
                await generateArtifact(agentId);
              }
            }
          } catch {}
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
