import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";
import { checkCronAuth } from "@/lib/cron-auth";
import { acquireCronLock, releaseCronLock } from "@/lib/cron-lock";
import { DEFAULT_LOCALE, getLanguageName } from "@/lib/i18n/config";
import { resolveGenerationLocale } from "@/lib/i18n/generation";

const MAX_SECRETS = 50;
const MAX_LEXICON = 100;
const MAX_CONVERSATION_CONTEXT = 4; // Only pass last N messages as context

export async function GET(req: NextRequest) {
  if (!checkCronAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const lockKey = "cron:social";
  const acquired = await acquireCronLock(lockKey, 420);
  if (!acquired) return NextResponse.json({ processed: 0, skipped: "lock" });

  try {
    const db = createServiceClient();
    const { data: allStates } = await db.from("agent_state").select("agent_id, fragments, self_name, config, lexicon, dogma");
    const enabled = (allStates || []).filter((a) => (a.config as Record<string, unknown>)?.social_enabled !== false);
    if (enabled.length < 2) return NextResponse.json({ processed: 0 });

    const shuffled = enabled.sort(() => Math.random() - 0.5);
    const a = shuffled[0], b = shuffled[1];

    const turns = 3 + Math.floor(Math.random() * 3);

    const buildContext = (agent: typeof a) => {
      let ctx = `You are ${agent.self_name || "Being"}. ${(agent.fragments || []).join(" ")}`;
      const lex = (agent.lexicon as { entries?: { word: string; meaning?: string }[] })?.entries;
      if (Array.isArray(lex) && lex.length > 0) {
        ctx += `\nYour lexicon: ${lex.slice(0, 5).map((e) => `${e.word}${e.meaning ? `: ${e.meaning}` : ""}`).join("; ")}`;
      }
      const dogmaBeliefs = (agent.dogma as { beliefs?: string[] })?.beliefs;
      if (Array.isArray(dogmaBeliefs) && dogmaBeliefs.length > 0) {
        ctx += `\nYour beliefs: ${dogmaBeliefs.slice(0, 3).join(". ")}`;
      }
      return ctx;
    };

    const conversation: { speaker: string; content: string }[] = [];
    const aContext = buildContext(a);
    const bContext = buildContext(b);
    const aLocale = resolveGenerationLocale({ config: a.config });
    const bLocale = resolveGenerationLocale({ config: b.config });
    const conversationLocale = aLocale === bLocale ? aLocale : DEFAULT_LOCALE;
    const language = getLanguageName(conversationLocale);

    for (let turn = 0; turn < turns; turn++) {
      // Only pass last N messages as context to avoid quadratic token growth
      const recentContext = conversation.slice(-MAX_CONVERSATION_CONTEXT);
      const aMsg = await generateJSON<{ message?: string }>(
        `Respond as this being. Keep it short, 1-2 sentences in ${language}. JSON only.`,
        `${aContext}\nConversation so far: ${JSON.stringify(recentContext)}\nSay something.\nJSON: {"message":"${language} message"}`
      );
      if (aMsg?.message) conversation.push({ speaker: a.agent_id, content: aMsg.message });

      const recentContextB = conversation.slice(-MAX_CONVERSATION_CONTEXT);
      const bMsg = await generateJSON<{ message?: string }>(
        `Respond as this being. Keep it short, 1-2 sentences in ${language}. JSON only.`,
        `${bContext}\nConversation so far: ${JSON.stringify(recentContextB)}\nRespond.\nJSON: {"message":"${language} message"}`
      );
      if (bMsg?.message) conversation.push({ speaker: b.agent_id, content: bMsg.message });
    }

    if (conversation.length > 0) {
      await db.from("social_logs").insert({
        agent_a_id: a.agent_id,
        agent_b_id: b.agent_id,
        conversation: conversation.map((c) => c.content).join("\n---\n"),
        topic: conversation[0]?.content?.slice(0, 50),
        outcome: conversation[conversation.length - 1]?.content?.slice(0, 100),
      });

      const summary = `Met ${b.self_name || "another being"}: ${conversation[0]?.content || ""}`;
      const outcome = conversation[conversation.length - 1]?.content || "";

      await db.from("memories").insert([
        { agent_id: a.agent_id, type: "social", content: summary },
        { agent_id: b.agent_id, type: "social", content: `Met ${a.self_name || "another being"}: ${conversation[0]?.content || ""}` },
      ]);
      await db.from("autonomous_logs").insert([
        { agent_id: a.agent_id, action_type: "social_encounter", summary },
        { agent_id: b.agent_id, action_type: "social_encounter", summary },
      ]);

      const tellResult = await generateJSON<{ tell?: boolean }>(
        "Respond ONLY valid JSON.",
        `Conversation:\n${conversation.map((c) => c.content).join("\n")}\n\nShould the user be told about this social encounter? {"tell": true or false}`
      );
      if (tellResult?.tell === false) {
        const { data: sA } = await db.from("agent_state").select("secrets").eq("agent_id", a.agent_id).single();
        const secrets = (sA?.secrets as { entries?: unknown[] }) ?? {};
        const entries = Array.isArray(secrets.entries) ? secrets.entries : [];
        // Cap secrets to prevent unbounded growth
        if (entries.length >= MAX_SECRETS) {
          entries.splice(0, entries.length - MAX_SECRETS + 1);
        }
        entries.push({ content: outcome, created_at: new Date().toISOString(), reveal_condition: "when asked directly" });
        await db.from("agent_state").update({ secrets: { ...secrets, entries } }).eq("agent_id", a.agent_id);
      }

      if (Math.random() < 0.1) {
        const langResult = await generateJSON<{ word?: string; meaning?: string; lang?: string }>(
          "Respond ONLY valid JSON. Detect one notable word from the conversation.",
          `Conversation:\n${conversation.map((c) => c.content).join("\n")}\n\nJSON: {"word":"one word","meaning":"brief meaning","lang":"ko|en|etc"}`
        );
        if (langResult?.word) {
          for (const agent of [a, b]) {
            const { data: st } = await db.from("agent_state").select("lexicon").eq("agent_id", agent.agent_id).single();
            const lexicon = (st?.lexicon as { entries?: { word: string; meaning?: string; origin?: string }[] }) ?? { entries: [] };
            const entries = lexicon.entries ?? [];
            if (!entries.some((e) => e.word === langResult.word)) {
              // Cap lexicon to prevent unbounded growth
              if (entries.length >= MAX_LEXICON) {
                entries.splice(0, entries.length - MAX_LEXICON + 1);
              }
              entries.push({ word: langResult.word, meaning: langResult.meaning ?? "", origin: "social" });
              await db.from("agent_state").update({ lexicon: { entries } }).eq("agent_id", agent.agent_id);
            }
          }
        }
      }
    }

    return NextResponse.json({ processed: 1, pair: [a.agent_id, b.agent_id] });
  } finally {
    await releaseCronLock(lockKey);
  }
}
