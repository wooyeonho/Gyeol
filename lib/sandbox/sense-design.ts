import { createServiceClient } from "@/lib/supabase/service";
import { generateTextOnce } from "@/lib/ai/router";

const SENSE_PHRASES = [
  { pattern: /weather|feel.*weather/i, skill: "weather", desc: "Weather API fetcher" },
  { pattern: /news|want.*news/i, skill: "news_rss", desc: "RSS news feed" },
  { pattern: /time|clock/i, skill: "time", desc: "Current time" },
];

function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

export async function designNewSense(agentId: string): Promise<void> {
  const service = createServiceClient();
  const { data: mems } = await service
    .from("memories")
    .select("content")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(50);
  const text = (mems ?? []).map((r) => (r as { content?: string }).content ?? "").join(" ");

  let matched: { skill: string; desc: string } | null = null;
  for (const { pattern, skill, desc } of SENSE_PHRASES) {
    if (pattern.test(text)) {
      matched = { skill, desc };
      break;
    }
  }
  if (!matched) return;

  const { data: stateRow } = await service.from("agent_state").select("sandbox").eq("agent_id", agentId).single();
  const sandbox = ((stateRow as { sandbox?: { installed_skills?: { id: string }[] } })?.sandbox ?? {}) as {
    installed_skills?: { id: string; description: string; created_at: string }[];
  };
  const installed = Array.isArray(sandbox.installed_skills) ? sandbox.installed_skills : [];
  if (installed.some((s) => s.id === matched!.skill)) return;

  const stub = await generateTextOnce(
    "Output only a short code stub or API description. No execution.",
    `Describe how to collect data for: ${matched.desc}. One paragraph or minimal pseudocode.`,
    { max_tokens: 150, temperature: 0.4 }
  );
  const codeHash = simpleHash(stub?.trim() ?? matched.skill);

  const newSkill = {
    id: matched.skill,
    description: matched.desc,
    code_hash: codeHash,
    created_at: new Date().toISOString(),
  };
  await service
    .from("agent_state")
    .update({ sandbox: { ...sandbox, installed_skills: [...installed, newSkill] } })
    .eq("agent_id", agentId);
}
