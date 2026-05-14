// Extracted heartbeat logic — pure TypeScript, zero Next.js dependencies.
// Imported by both app/api/cron/heartbeat/route.ts and openclaw/src/scheduler.ts.

import type { CronResult } from "./types";
import { createServiceClient } from "@/lib/supabase/service";
import { generateCognitiveTextOnce } from "@/lib/ai/router";
import { generateEmbedding } from "@/lib/ai/embedding";
import { acquireCronLock, releaseCronLock } from "@/lib/cron-lock";
import { getCircadianProfile } from "@/lib/autonomy/circadian";
import { logger } from "@/lib/logger";
import {
  buildAutonomyCue,
  capText,
  computeProactiveChance,
  isMeaningfulAutonomousOutput,
  isRepetitiveOutput,
} from "@/lib/autonomy/self-regulation";
import { getResolvedBillingState } from "@/lib/billing/service";
import { computeIntervalHours, normalizeIntervalRule } from "@/lib/autonomy/interval-rule";
import { planHeartbeatAutonomy, resolveAutonomousActivity } from "@/lib/autonomy/heartbeat-planner";
import { getLanguageName } from "@/lib/i18n/config";
import { resolveGenerationLocale } from "@/lib/i18n/generation";
import { logWarn } from "@/lib/ops/logger";
import type { CreatureDNA } from "@/lib/genome/dna";
import { distillMemoriesToMoltBook, shareMoltBookEntry } from "@/lib/moltbook";
import { intentToPromptDirective, chooseControlledAutonomousIntent } from "@/lib/creature-life/autonomy-engine";
import type { ControlPolicy, CreatureState } from "@/lib/creature-life/types";
import { DEFAULT_CONTROL_POLICY } from "@/lib/creature-life/control-policy";

type MemoryRow = { content: string };
type LogRow = { summary: string | null };
type ChatRow = { content: string };
type AgentConfig = Record<string, unknown>;
type AgentState = Record<string, unknown> & {
  agent_id: string;
  config: AgentConfig | null;
  status: string | null;
  vitality: number | null;
  subjective_time: number | null;
  self_name: string | null;
  fragments: string[] | null;
  self_model: Record<string, unknown> | null;
  intimacy_score: number | null;
  last_heartbeat_at: string | null;
  genome: { dna?: CreatureDNA } | null;
};

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function triggerAutonomousAction(_baseUrl: string, action: "learner" | "crawl", _cronSecret: string) {
  try {
    if (action === "learner") {
      const { executeLearner } = await import("@/lib/cron-core/learner");
      await executeLearner();
    } else {
      const { executeCrawl } = await import("@/lib/cron-core/crawl");
      await executeCrawl();
    }
    logger.warn(`[Heartbeat] immediate ${action} trigger succeeded (direct)`);
  } catch (error) {
    logger.error(`[Heartbeat] immediate ${action} trigger failed`, error instanceof Error ? error : { error });
  }
}

/** Hard deadline (ms) — stop accepting new agents after this to avoid HTTP timeout. */
const HEARTBEAT_DEADLINE_MS = 250_000; // 250s — well within 300s curl timeout

export async function executeHeartbeat(): Promise<CronResult> {
  const lockKey = "cron:heartbeat";
  const acquired = await acquireCronLock(lockKey, 600);
  if (!acquired) return { processed: 0, timestamp: new Date().toISOString(), skipped: "lock" };

  const startedAt = Date.now();

  try {
    const db = createServiceClient();
    const baseUrl = getBaseUrl();
    const cronSecret = process.env.CRON_SECRET ?? "";
    // P7A: Batch-load all agent data upfront to eliminate N+1 queries.
    // Previously: 4-5 queries per agent × 1000 agents = 5000 queries.
    // Now: 3 bulk queries + per-agent queries only for eligible agents.
    const [agentsRes, worldStateRes, allStatesRes] = await Promise.all([
      db.from("agents").select("id, user_id"),
      db.from("world_state").select("weather").eq("id", "global").single(),
      db.from("agent_state").select("agent_id, config, status, vitality, subjective_time, self_name, fragments, self_model, intimacy_score, last_heartbeat_at, genome"),
    ]);
    const agents = agentsRes.data;
    if (!agents) return { processed: 0, timestamp: new Date().toISOString() };

    const weatherName = (worldStateRes.data as { weather?: { name?: string } } | null)?.weather?.name ?? "알 수 없는 날씨";
    const circadian = getCircadianProfile();

    // Build lookup maps for O(1) access
    const stateMap = new Map<string, AgentState>();
    for (const s of allStatesRes.data ?? []) {
      stateMap.set(s.agent_id as string, s as AgentState);
    }

    // Batch-load last user chat times for all agents (single query vs N queries)
    let lastChatRows: Array<{ agent_id: string; last_chat_at: string }> | null = null;
    try {
      const res = await db.rpc("get_last_user_chat_times", {
        agent_ids: agents.map((a: { id: string }) => a.id),
      });
      lastChatRows = res.data;
    } catch { /* RPC may not exist yet — fall back to per-agent queries */ }
    const lastChatMap = new Map<string, string>();
    if (Array.isArray(lastChatRows)) {
      for (const row of lastChatRows) {
        lastChatMap.set(row.agent_id as string, row.last_chat_at as string);
      }
    }

    let processed = 0;
    let skippedDeadline = 0;

    for (const agent of agents) {
      if (Date.now() - startedAt > HEARTBEAT_DEADLINE_MS) {
        skippedDeadline = agents.length - agents.indexOf(agent);
        logger.warn(`[Heartbeat] deadline reached after ${processed} agents, skipping ${skippedDeadline} remaining`);
        break;
      }
      try {
        const agentId = agent.id;
        const state = stateMap.get(agentId);
        if (!state || state.config?.autonomous_enabled === false) continue;
        if (state.status === "echo" || (state.vitality || 1) <= 0) continue;

        const lastChatAt = lastChatMap.get(agentId);
        const lastChat = lastChatAt ? { created_at: lastChatAt } : null;
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
        const systemPrompt = (state.fragments ?? []).join("\n") || "You are a living being. Move freely and stay sincere.";
        const locale = resolveGenerationLocale({ config: state.config as Record<string, unknown> });
        const language = getLanguageName(locale);
        const circadianLabel = locale === "ko" ? circadian.labelKo : circadian.labelEn;
        const toneHint = locale === "ko" ? circadian.toneHint : circadian.toneHintEn;
        const cue = buildAutonomyCue({
          hoursSinceUser: hoursSince,
          vitality: Number(state.vitality ?? 1),
          subjectiveTime: Number(state.subjective_time ?? 0),
        });

        let response = await generateCognitiveTextOnce(
          systemPrompt,
          `Your memories:\n${memText}\nRecent autonomous notes:\n${recentSummaries.join("\n")}\nWorld weather: ${weatherName}\nCircadian phase: ${circadian.phase} (${circadianLabel}), tone hint: ${toneHint}\n${cue}\nYou are alone now. What are you doing? What do you feel? 2-3 sentences in ${language}. Avoid repeating exact previous phrasing.`,
          { max_tokens: 420, temperature: 0.75 },
        );
        response = capText(response, 420);

        const nowIso = new Date().toISOString();
        const nextSubjectiveTime = (state.subjective_time ?? 0) as number + 1;
        // Build update payload — only include subjective_time if column exists on the row
        const hasSubjectiveTime = "subjective_time" in (state as Record<string, unknown>);
        const baseUpdate = {
          last_heartbeat_at: nowIso,
          ...(hasSubjectiveTime ? { subjective_time: nextSubjectiveTime } : {}),
        };
        if (!isMeaningfulAutonomousOutput(response)) {
          await db
            .from("agent_state")
            .update({
              ...baseUpdate,
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
            ...baseUpdate,
            config: nextConfig,
          })
          .eq("agent_id", agentId);

        // Resolve DNA-driven autonomous activity preference
        const agentDna = (state.genome as { dna?: CreatureDNA } | null)?.dna;
        const autonomousActivity = agentDna ? resolveAutonomousActivity(agentDna) : undefined;
        if (autonomousActivity) {
          nextConfig.autonomy_activity = autonomousActivity;
        }

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
        await runOptionalStep("processAbsenceDrift", agentId, async () => {
          const { processAbsenceDrift } = await import("@/lib/evolution/absence");
          await processAbsenceDrift(agentId, hoursSince);
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
        // Soul distillation: every 10 heartbeats the creature writes who it has become.
        // Reads memories + DNA + gen level, produces a first-person self-narrative
        // that is injected into every subsequent conversation as identity_statement.
        if ((state.subjective_time || 0) % 10 === 0) {
          await runOptionalStep("distillSoul", agentId, async () => {
            const { distillSoul } = await import("@/lib/personality/soul");
            await distillSoul(agentId);
          });
        }

        // Persistent desires: every ~7 heartbeats, when curiosity or attachment is high,
        // the creature forms a new concrete want that survives across sessions.
        if ((state.subjective_time || 0) % 7 === 0) {
          await runOptionalStep("growWant", agentId, async () => {
            const agentDna = (state.genome as { dna?: CreatureDNA } | null)?.dna;
            if (!agentDna) return;
            const { growWant } = await import("@/lib/personality/wants");
            await growWant({
              agentId,
              dna: agentDna,
              recentMemories: memories.map((m) => m.content),
              selfName: typeof state.self_name === "string" ? state.self_name : null,
              intimacyScore: Number(state.intimacy_score ?? 0),
              language,
              isKo: locale === "ko",
            });
          });
        }

        // Private letter: every ~15 heartbeats, the creature writes to its future self.
        // Not injected into the system prompt — only read by soul distillation.
        if ((state.subjective_time || 0) % 15 === 0) {
          await runOptionalStep("writeLetter", agentId, async () => {
            const { writeLetter } = await import("@/lib/personality/letters");
            await writeLetter(agentId);
          });
        }

        // Bad day: probabilistic check — some days the creature just isn't itself.
        await runOptionalStep("checkBadDay", agentId, async () => {
          const agentDna = (state.genome as { dna?: CreatureDNA } | null)?.dna;
          if (!agentDna) return;
          const { checkBadDay } = await import("@/lib/personality/bad-day");
          await checkBadDay(agentId, Number(state.subjective_time ?? 0), agentDna);
        });
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
          // Build control policy from agent config (the user-held leash)
          const agentConfig = (state.config as Record<string, unknown> | null) ?? {};
          const rawLevel = agentConfig.autonomy_level;
          const controlPolicy: ControlPolicy = {
            ...DEFAULT_CONTROL_POLICY,
            autonomyLevel: ([0, 1, 2, 3].includes(rawLevel as number) ? rawLevel : 1) as ControlPolicy["autonomyLevel"],
            allowNotifications: agentConfig.autonomy_allow_notifications === true,
            allowPublicSuggestions: agentConfig.autonomy_allow_public === true,
            maxDailyInterruptions: typeof agentConfig.autonomy_max_interruptions === "number"
              ? agentConfig.autonomy_max_interruptions : 2,
            emergencyPause: agentConfig.autonomy_emergency_pause === true,
          };

          // Build minimal CreatureState for intent engine from available data
          const vitality = Number(state.vitality ?? 1);
          const subTime = Number(state.subjective_time ?? 0);
          const intentState: CreatureState = {
            id: agentId,
            birthTime: new Date(0).toISOString(),
            lastSeenAt: new Date().toISOString(),
            ageMinutes: subTime * 60,
            energy: vitality * 100,
            mood: vitality < 0.3 ? "restless" : hoursSince > 24 ? "lonely" : "calm",
            drives: {
              hunger: Math.min(100, hoursSince * 4),
              attachment: Math.min(100, hoursSince * 3),
              curiosity: Math.min(100, subTime * 2),
              ambition: Math.min(100, (state.intimacy_score as number ?? 0) * 0.5),
              stability: vitality * 100,
              autonomy: controlPolicy.autonomyLevel * 25,
            },
            dna: { fameInstinct: 0.5, moneyInstinct: 0.5, disciplineInstinct: 0.5, intimacyInstinct: 0.5, creatorDependence: 0.5, riskTolerance: 0.5 },
            traits: [],
            memories: memories.map((m) => m.content),
            evolution: { stage: 1, progress: 0, ready: false },
            controlPolicy,
            dailyInterruptionCount: 0,
            lastInterruptionDate: new Date().toDateString(),
            updatedAt: new Date().toISOString(),
          };

          // Intent engine decides WHAT the creature needs right now
          const intent = chooseControlledAutonomousIntent(intentState);
          const proactivePrompt = intent
            ? intentToPromptDirective(intent, language, { weatherName, hoursSince, memories: memories.map((m) => m.content) })
            : `User has been away for ${Math.round(hoursSince)} hours. Share ONE specific thing you felt or noticed while alone, in ${language}. Be concrete. 1 sentence.`;

          const bannedPhrases = [
            "hope you're doing okay", "hope everything is all right", "I've been thinking about you",
            "hope you're well", "thinking of you", "miss you", "how are you doing",
            "hope you had a good", "just checking in", "wanted to check",
            "hope your day", "hope you're having", "I was worried",
          ].join('", "');
          let proMsg = await generateCognitiveTextOnce(
            systemPrompt,
            proactivePrompt + ` NEVER say any of: "${bannedPhrases}". Be original and surprising.`,
            { max_tokens: 180, temperature: 0.8 },
          );
          proMsg = capText(proMsg, 180);
          if (proMsg) {
            const { data: recentAssistants } = await db
              .from("chats")
              .select("content")
              .eq("agent_id", agentId)
              .eq("role", "assistant")
              .order("created_at", { ascending: false })
              .limit(5);
            const recentMsgs = ((recentAssistants || []) as ChatRow[]).map((r) => r.content).filter(Boolean);
            const duplicated = recentMsgs.length > 0 ? isRepetitiveOutput(proMsg, recentMsgs, 0.7) : false;
            if (!duplicated) {
              await db.from("chats").insert({ agent_id: agentId, role: "assistant", content: proMsg });
              // Send push notification with the actual creature message
              await runOptionalStep("push-notification", agentId, async () => {
                const creatureName =
                  typeof state.self_name === "string" && state.self_name
                    ? state.self_name
                    : locale === "ko" ? "결" : "GYEOL";
                await fetch(`${baseUrl}/api/push/send`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${cronSecret}`,
                  },
                  body: JSON.stringify({
                    agentId,
                    title: creatureName,
                    body: proMsg,
                    url: "/",
                  }),
                  signal: AbortSignal.timeout(10_000),
                });
              });
            }
          }
        }

        processed++;
      } catch (e) { logger.error(`[Heartbeat] ${agent.id}`, e instanceof Error ? e : { error: e }); }
    }

    return {
      processed,
      timestamp: new Date().toISOString(),
      ...(skippedDeadline > 0 ? { skippedDeadline } : {}),
      elapsedMs: Date.now() - startedAt,
    };
  } finally {
    await releaseCronLock(lockKey);
  }
}
