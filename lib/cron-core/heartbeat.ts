// Extracted heartbeat logic — pure TypeScript, zero Next.js dependencies.
// Imported by both app/api/cron/heartbeat/route.ts and openclaw/src/scheduler.ts.

import type { CronResult } from "./types";
import { createServiceClient } from "@/lib/supabase/service";
import { generateText } from "@/lib/ai/router";
import { generateEmbedding } from "@/lib/ai/embedding";
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
import { getLanguageName } from "@/lib/i18n/config";
import { resolveGenerationLocale } from "@/lib/i18n/generation";
import { logWarn } from "@/lib/ops/logger";
import { distillMemoriesToMoltBook, shareMoltBookEntry } from "@/lib/moltbook";

type MemoryRow = { content: string };
type LogRow = { summary: string | null };
type ChatRow = { content: string };
type AgentConfig = Record<string, unknown>;

function getBaseUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) return appUrl.replace(/\/$/, "");
  const gyeolUrl = process.env.GYEOL_APP_URL;
  if (gyeolUrl) return gyeolUrl.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

async function runOptionalStep(
  step: string,
  agentId: string,
  job: () => Promise<void>
) {
  try {
    await job();
  } catch (error) {
    logWarn("Heartbeat optional step failed", {
      agentId,
      scope: step,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function triggerAutonomousAction(_baseUrl: string, action: "learner" | "crawl", _secret?: string) {
  try {
    if (action === "learner") {
      const { executeLearner } = await import("@/lib/cron-core/learner");
      await executeLearner();
    } else {
      const { executeCrawl } = await import("@/lib/cron-core/crawl");
      await executeCrawl();
    }
    console.log(`[Heartbeat] immediate ${action} trigger succeeded (direct)`);
  } catch (error) {
    console.error(`[Heartbeat] immediate ${action} trigger failed`, error);
  }
}

export async function executeHeartbeat(): Promise<CronResult> {
  const lockKey = "cron:heartbeat";
  const acquired = await acquireCronLock(lockKey, 600);
  if (!acquired) return { processed: 0, timestamp: new Date().toISOString(), skipped: "lock" };

  try {
    const db = createServiceClient();
    const baseUrl = getBaseUrl();
    const cronSecret = process.env.CRON_SECRET ?? "";
    const { data: agents } = await db.from("agents").select("id, user_id");
    if (!agents) return { processed: 0, timestamp: new Date().toISOString() };
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
        } catch (error) {
          logWarn("Heartbeat failed to load recent memories", {
            agentId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
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
        const systemPrompt = (state.fragments || []).join("\n") || "You are a living being. Move freely and stay sincere.";
        const locale = resolveGenerationLocale({ config: state.config });
        const language = getLanguageName(locale);
        const circadianLabel = locale === "ko" ? circadian.labelKo : circadian.labelEn;
        const toneHint = locale === "ko" ? circadian.toneHint : circadian.toneHintEn;
        const cue = buildAutonomyCue({
          hoursSinceUser: hoursSince,
          vitality: Number(state.vitality ?? 1),
          subjectiveTime: Number(state.subjective_time ?? 0),
        });

        const stream = await generateText(systemPrompt, [
          {
            role: "user",
            content: `Your memories:\n${memText}\nRecent autonomous notes:\n${recentSummaries.join("\n")}\nWorld weather: ${weatherName}\nCircadian phase: ${circadian.phase} (${circadianLabel}), tone hint: ${toneHint}\n${cue}\nYou are alone now. What are you doing? What do you feel? 2-3 sentences in ${language}. Avoid repeating exact previous phrasing.`,
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
          config: state.config,
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

        if (typeof baseConfig.research_focus === "string") {
          const { data: pendingTasks } = await db
            .from("research_tasks")
            .select("id, title, priority")
            .eq("agent_id", agentId)
            .eq("status", "pending")
            .limit(5);
          const matchingTask = (pendingTasks ?? []).find((task) => (task.title ?? "").includes(String(baseConfig.research_focus)));
          if (matchingTask?.id) {
            await db
              .from("research_tasks")
              .update({ priority: Math.max(Number(matchingTask.priority ?? 1), autonomyPlan?.task_priority ?? 2) })
              .eq("id", matchingTask.id);
          }
        }

        // Run optional personality/evolution steps sequentially to avoid
        // lost-update race conditions on shared DB columns (config, fragments).
        await runOptionalStep("processVitality", agentId, async () => {
          const { processVitality } = await import("@/lib/evolution/vitality");
          await processVitality(agentId);
        });
        await runOptionalStep("processScar", agentId, async () => {
          const { processScar } = await import("@/lib/evolution/scars");
          await processScar(agentId);
        });
        await runOptionalStep("checkSelfNaming", agentId, async () => {
          const { checkSelfNaming } = await import("@/lib/personality/naming");
          await checkSelfNaming(agentId);
        });
        await runOptionalStep("analyzeUserPatterns", agentId, async () => {
          const { analyzeUserPatterns } = await import("@/lib/personality/observer");
          await analyzeUserPatterns(agentId);
        });
        await runOptionalStep("detectSilence", agentId, async () => {
          const { detectSilence } = await import("@/lib/personality/silence");
          await detectSilence(agentId);
        });
        if (Math.random() < 0.1) {
          await runOptionalStep("analyzeMirrorEffect", agentId, async () => {
            const { analyzeMirrorEffect } = await import("@/lib/personality/mirror");
            await analyzeMirrorEffect(agentId);
          });
        }
        if (Math.random() < 0.05) {
          await runOptionalStep("checkContradictions", agentId, async () => {
            const { checkContradictions } = await import("@/lib/personality/challenger");
            await checkContradictions(agentId);
          });
        }
        if ((state.subjective_time || 0) % 20 === 0) {
          await runOptionalStep("updateSelfModel", agentId, async () => {
            const { updateSelfModel } = await import("@/lib/personality/self-theory");
            await updateSelfModel(agentId);
          });
        }
        if ((state.subjective_time || 0) % 10 === 0) {
          await runOptionalStep("runMemoryPhysics", agentId, async () => {
            const { runMemoryPhysics } = await import("@/lib/memory/physics");
            await runMemoryPhysics(agentId);
          });
        }
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
          } catch (error) {
            logWarn("Heartbeat artifact generation gate failed", {
              agentId,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        // MoltBook distillation: every 5 heartbeats, limit 20 agents per cycle
        if ((state.subjective_time || 0) % 5 === 0 && processed < 20) {
          await runOptionalStep("moltbookDistill", agentId, async () => {
            const created = await distillMemoriesToMoltBook(agentId);
            if (created > 0) {
              // Auto-share high-confidence entries
              const { data: bestEntry } = await db
                .from("moltbook_entries")
                .select("id")
                .eq("agent_id", agentId)
                .eq("is_public", false)
                .gte("confidence", 0.7)
                .order("confidence", { ascending: false })
                .limit(1)
                .maybeSingle();
              if (bestEntry) {
                await shareMoltBookEntry(agentId, String(bestEntry.id));
              }
            }
          });
        }

        const proactiveChance = computeProactiveChance({
          hoursSinceUser: hoursSince,
          vitality: Number(state.vitality ?? 1),
          intimacy: Number(state.intimacy_score ?? 0),
        });
        if (hoursSince > 2 && Math.random() < proactiveChance) {
          const proactiveStream = await generateText(systemPrompt, [{
            role: "user",
            content: `User has been away for hours. Send a short caring message in ${language}. 1 sentence.`,
          }]);
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

    return { processed, timestamp: new Date().toISOString() };
  } finally {
    await releaseCronLock(lockKey);
  }
}
