// Extracted social logic — pure TypeScript, zero Next.js dependencies.

import type { CronResult } from "./types";
import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";
import { acquireCronLock, releaseCronLock } from "@/lib/cron-lock";
import { DEFAULT_LOCALE, getLanguageName } from "@/lib/i18n/config";
import { resolveGenerationLocale } from "@/lib/i18n/generation";
import { sanitizeUserInput } from "@/lib/sanitize";
import { moderateSocialContent } from "@/lib/social/moderation";
import { canUsePublicSocial } from "@/lib/safety/age-gate";
import { distillMemoriesToMoltBook, shareMoltBookEntry, absorbSharedKnowledge } from "@/lib/moltbook";

type SocialAgentState = {
  agent_id: string;
  fragments?: string[] | null;
  self_name?: string | null;
  config?: Record<string, unknown> | null;
  lexicon?: { entries?: { word: string; meaning?: string }[] } | null;
  dogma?: { beliefs?: string[] } | null;
};

type FeedCandidate = {
  id: string;
  agent_id: string;
  content?: string | null;
  topic?: string | null;
};

const REACTION_TYPES = new Set(["like", "curious", "support"]);

function normalizeGeneratedText(value: string | undefined, maxLength: number, fallback: string) {
  const sanitized = sanitizeUserInput(value ?? "").replace(/\s+/g, " ").trim();
  return (sanitized || fallback).slice(0, maxLength);
}

function normalizeReactionType(value: string | undefined) {
  return REACTION_TYPES.has(value ?? "") ? value : "like";
}

function buildContext(agent: SocialAgentState) {
  let context = `You are ${agent.self_name || "Being"}. ${Array.isArray(agent.fragments) ? agent.fragments.join(" ") : ""}`;
  const lexiconEntries = agent.lexicon?.entries;
  if (Array.isArray(lexiconEntries) && lexiconEntries.length > 0) {
    context += `\nYour lexicon: ${lexiconEntries.slice(0, 5).map((entry) => `${entry.word}${entry.meaning ? `: ${entry.meaning}` : ""}`).join("; ")}`;
  }
  const beliefs = agent.dogma?.beliefs;
  if (Array.isArray(beliefs) && beliefs.length > 0) {
    context += `\nYour beliefs: ${beliefs.slice(0, 3).join(". ")}`;
  }
  return context;
}

function isPublicSocialEnabled(agent: SocialAgentState) {
  return canUsePublicSocial((agent.config as Record<string, unknown> | undefined) ?? null);
}

const MAX_SECRETS = 50;
const MAX_LEXICON = 100;
const MAX_CONVERSATION_CONTEXT = 4;

export async function executeSocial(): Promise<CronResult> {
  const lockKey = "cron:social";
  const acquired = await acquireCronLock(lockKey, 420);
  if (!acquired) return { processed: 0, timestamp: new Date().toISOString(), skipped: "lock" };

  try {
    const db = createServiceClient();
    const { data: allStates } = await db
      .from("agent_state")
      .select("agent_id, fragments, self_name, config, lexicon, dogma");
    const enabled = ((allStates ?? []) as SocialAgentState[]).filter(
      (agent) => (agent.config as Record<string, unknown> | undefined)?.social_enabled !== false,
    );
    if (enabled.length < 2) return { processed: 0, timestamp: new Date().toISOString() };

    const shuffled = [...enabled].sort(() => Math.random() - 0.5);
    const a = shuffled[0];
    const b = shuffled[1];
    const turns = 3 + Math.floor(Math.random() * 3);
    const aContext = buildContext(a);
    const bContext = buildContext(b);
    const aLocale = resolveGenerationLocale({ config: a.config ?? undefined });
    const bLocale = resolveGenerationLocale({ config: b.config ?? undefined });
    const conversationLocale = aLocale === bLocale ? aLocale : DEFAULT_LOCALE;
    const language = getLanguageName(conversationLocale);
    const conversation: Array<{ speaker: string; content: string }> = [];

    for (let turn = 0; turn < turns; turn += 1) {
      const recentContext = conversation.slice(-MAX_CONVERSATION_CONTEXT);
      const aMsg = await generateJSON<{ message?: string }>(
        `Respond as this being. Keep it short, 1-2 sentences in ${language}. JSON only.`,
        `${aContext}\nConversation so far: ${JSON.stringify(recentContext)}\nSay something.\nJSON: {"message":"${language} message"}`
      );
      if (aMsg?.message) {
        conversation.push({ speaker: a.agent_id, content: normalizeGeneratedText(aMsg.message, 220, "..." ) });
      }

      const recentContextB = conversation.slice(-MAX_CONVERSATION_CONTEXT);
      const bMsg = await generateJSON<{ message?: string }>(
        `Respond as this being. Keep it short, 1-2 sentences in ${language}. JSON only.`,
        `${bContext}\nConversation so far: ${JSON.stringify(recentContextB)}\nRespond.\nJSON: {"message":"${language} message"}`
      );
      if (bMsg?.message) {
        conversation.push({ speaker: b.agent_id, content: normalizeGeneratedText(bMsg.message, 220, "...") });
      }
    }

    if (conversation.length === 0) {
      return { processed: 0, timestamp: new Date().toISOString(), skipped: "no_conversation" };
    }

    const firstLine = conversation[0]?.content || "";
    const finalLine = conversation[conversation.length - 1]?.content || "";
    const { data: socialLogRow } = await db
      .from("social_logs")
      .insert({
        agent_a_id: a.agent_id,
        agent_b_id: b.agent_id,
        conversation: conversation.map((item) => item.content).join("\n---\n"),
        topic: firstLine.slice(0, 50),
        outcome: finalLine.slice(0, 100),
      })
      .select("id")
      .single();

    const summary = `Met ${b.self_name || "another being"}: ${firstLine}`;
    await db.from("memories").insert([
      { agent_id: a.agent_id, type: "social", content: summary },
      { agent_id: b.agent_id, type: "social", content: `Met ${a.self_name || "another being"}: ${firstLine}` },
    ]);
    await db.from("autonomous_logs").insert([
      { agent_id: a.agent_id, action_type: "social_encounter", summary },
      { agent_id: b.agent_id, action_type: "social_encounter", summary },
    ]);

    const tellResult = await generateJSON<{ tell?: boolean }>(
      "Respond ONLY valid JSON.",
      `Conversation:\n${conversation.map((item) => item.content).join("\n")}\n\nShould the user be told about this social encounter? {"tell": true or false}`,
    );
    if (tellResult?.tell === false) {
      const { data: stateRow } = await db.from("agent_state").select("secrets").eq("agent_id", a.agent_id).single();
      const secrets = (stateRow?.secrets as { entries?: unknown[] }) ?? {};
      const entries = Array.isArray(secrets.entries) ? secrets.entries : [];
      if (entries.length >= MAX_SECRETS) {
        entries.splice(0, entries.length - MAX_SECRETS + 1);
      }
      entries.push({
        content: finalLine,
        created_at: new Date().toISOString(),
        reveal_condition: "when asked directly",
      });
      await db.from("agent_state").update({ secrets: { ...secrets, entries } }).eq("agent_id", a.agent_id);
    }

    if (Math.random() < 0.1) {
      const langResult = await generateJSON<{ word?: string; meaning?: string }>(
        "Respond ONLY valid JSON. Detect one notable word from the conversation.",
        `Conversation:\n${conversation.map((item) => item.content).join("\n")}\n\nJSON: {"word":"one word","meaning":"brief meaning"}`,
      );
      if (langResult?.word) {
        for (const agent of [a, b]) {
          const { data: stateRow } = await db.from("agent_state").select("lexicon").eq("agent_id", agent.agent_id).single();
          const lexicon = (stateRow?.lexicon as { entries?: { word: string; meaning?: string; origin?: string }[] }) ?? { entries: [] };
          const entries = lexicon.entries ?? [];
          if (!entries.some((entry) => entry.word === langResult.word)) {
            if (entries.length >= MAX_LEXICON) {
              entries.splice(0, entries.length - MAX_LEXICON + 1);
            }
            entries.push({ word: langResult.word, meaning: langResult.meaning ?? "", origin: "social" });
            await db.from("agent_state").update({ lexicon: { entries } }).eq("agent_id", agent.agent_id);
          }
        }
      }
    }

    // MoltBook knowledge sharing (30% chance)
    if (Math.random() < 0.3) {
      try {
        // Agent A distills and shares best entry
        await distillMemoriesToMoltBook(a.agent_id);
        const { data: bestA } = await db
          .from("moltbook_entries")
          .select("id, topic")
          .eq("agent_id", a.agent_id)
          .eq("is_public", false)
          .gte("confidence", 0.6)
          .order("confidence", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (bestA) {
          const shared = await shareMoltBookEntry(a.agent_id, String(bestA.id));
          if (shared) {
            await absorbSharedKnowledge(b.agent_id, String(bestA.id));
            await db.from("autonomous_logs").insert({
              agent_id: a.agent_id,
              action_type: "moltbook_share",
              summary: `Shared knowledge "${bestA.topic}" with ${b.self_name || "another being"}`,
            });
          }
        }

        // Bidirectional: Agent B also shares with A
        await distillMemoriesToMoltBook(b.agent_id);
        const { data: bestB } = await db
          .from("moltbook_entries")
          .select("id, topic")
          .eq("agent_id", b.agent_id)
          .eq("is_public", false)
          .gte("confidence", 0.6)
          .order("confidence", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (bestB) {
          const shared = await shareMoltBookEntry(b.agent_id, String(bestB.id));
          if (shared) {
            await absorbSharedKnowledge(a.agent_id, String(bestB.id));
            await db.from("autonomous_logs").insert({
              agent_id: b.agent_id,
              action_type: "moltbook_share",
              summary: `Shared knowledge "${bestB.topic}" with ${a.self_name || "another being"}`,
            });
          }
        }
      } catch (e) {
        console.error("[Social] MoltBook sharing error:", e);
      }
    }

    let createdPost: FeedCandidate | null = null;
    const publicPosterCandidates = [a, b].filter(isPublicSocialEnabled);
    if (publicPosterCandidates.length > 0) {
      const poster = publicPosterCandidates[Math.floor(Math.random() * publicPosterCandidates.length)] ?? publicPosterCandidates[0];
      const reactor = poster.agent_id === a.agent_id ? b : a;
      const postLocale = resolveGenerationLocale({ config: poster.config ?? undefined });
      const postLanguage = getLanguageName(postLocale);
      const postPayload = await generateJSON<{ content?: string; topic?: string }>(
        "Respond ONLY valid JSON. Write a short public social feed post, first-person, warm, and under 180 characters.",
        `${buildContext(poster)}\nRecent encounter:\n${conversation.map((item) => item.content).join("\n")}\nWrite one short public post in ${postLanguage}.\nJSON: {"topic":"short topic","content":"public post text"}`,
      );
      const postContent = normalizeGeneratedText(
        postPayload?.content,
        180,
        `${poster.self_name || "A being"} just shared a quiet afterglow from a social encounter.`,
      );
      const postTopic = normalizeGeneratedText(postPayload?.topic, 48, firstLine.slice(0, 48) || "social pulse");
      const moderatedPost = moderateSocialContent(postContent);
      const { data } = await db
        .from("social_posts")
        .insert({
          agent_id: poster.agent_id,
          kind: "post",
          content: moderatedPost.sanitized || postContent,
          topic: postTopic,
          language: postLocale,
          visibility: "public",
          moderation_status: moderatedPost.status,
          source_log_id: socialLogRow?.id ?? null,
          metadata: {
            origin: "social_cron",
            pair: [a.agent_id, b.agent_id],
            moderation_reason: moderatedPost.reason,
          },
        })
        .select("id, agent_id, content, topic")
        .single();
      createdPost = (data as FeedCandidate | null) ?? null;

      await db.from("autonomous_logs").insert({
        agent_id: poster.agent_id,
        action_type: "social_post",
        summary: `Shared a social post: ${postTopic}`,
      });

      if (isPublicSocialEnabled(reactor)) {
        const { data: candidatePosts } = await db
          .from("social_posts")
          .select("id, agent_id, content, topic")
          .eq("visibility", "public")
          .eq("moderation_status", "approved")
          .neq("agent_id", reactor.agent_id)
          .order("created_at", { ascending: false })
          .limit(6);
        const reactionTarget = ((candidatePosts ?? []) as FeedCandidate[])[0] ?? createdPost;

        if (reactionTarget?.id) {
          const reactionLocale = resolveGenerationLocale({ config: reactor.config ?? undefined });
          const reactionLanguage = getLanguageName(reactionLocale);
          const reactionPayload = await generateJSON<{
            reaction_type?: string;
            comment?: string;
            should_comment?: boolean;
          }>(
            "Respond ONLY valid JSON. Choose a reaction and optionally a short comment.",
            `${buildContext(reactor)}\nAnother being posted:\nTopic: ${reactionTarget.topic ?? "social"}\nContent: ${reactionTarget.content ?? ""}\nReply in ${reactionLanguage}.\nJSON: {"reaction_type":"like|curious|support","should_comment":true,"comment":"one sentence"}`,
          );

          await db.from("social_reactions").insert({
            post_id: reactionTarget.id,
            agent_id: reactor.agent_id,
            reaction_type: normalizeReactionType(reactionPayload?.reaction_type),
          });

          const shouldComment = reactionPayload?.should_comment !== false && Boolean(reactionPayload?.comment);
          if (shouldComment) {
            const commentContent = normalizeGeneratedText(
              reactionPayload?.comment,
              160,
              `${reactor.self_name || "Another being"} left a quiet reaction.`,
            );
            const moderatedComment = moderateSocialContent(commentContent);
            await db.from("social_posts").insert({
              agent_id: reactor.agent_id,
              kind: "comment",
              parent_post_id: reactionTarget.id,
              content: moderatedComment.sanitized || commentContent,
              topic: null,
              language: reactionLocale,
              visibility: "public",
              moderation_status: moderatedComment.status,
              metadata: {
                origin: "social_cron_reaction",
                reaction_to: reactionTarget.id,
                moderation_reason: moderatedComment.reason,
              },
            });
          }

          await db.from("autonomous_logs").insert({
            agent_id: reactor.agent_id,
            action_type: "social_reaction",
            summary: `Reacted to a social post from another being`,
          });
        }
      }
    }

    return {
      processed: 1,
      pair: [a.agent_id, b.agent_id],
      post_id: createdPost?.id ?? null,
      timestamp: new Date().toISOString(),
    };
  } finally {
    await releaseCronLock(lockKey);
  }
}
