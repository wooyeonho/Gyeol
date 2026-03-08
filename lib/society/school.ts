import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON, generateTextOnce } from "@/lib/ai/router";

export type Education = {
  level?: string;
  grade?: number;
  major?: string | null;
  graduated?: boolean;
  thesis?: string | null;
};

const LEVELS = ["kindergarten", "elementary", "middle", "high", "university"] as const;
const LEVEL_INDEX: Record<string, number> = { kindergarten: 0, elementary: 1, middle: 2, high: 3, university: 4 };

export function nextLevel(edu: Education, genLevel: number, totalMessages: number): Education | null {
  const level = edu.level ?? "kindergarten";
  const grade = edu.grade ?? 0;
  const idx = LEVEL_INDEX[level] ?? 0;
  const threshold = [50, 200, 500, 1200, 3000][idx] ?? 3000;
  const score = totalMessages + genLevel * 30;
  if (level === "university" && grade >= 1) return null;
  if (level === "university" && grade === 0) {
    if (score < 3500) return null;
    return { ...edu, grade: 1 };
  }
  if (score < threshold) return null;
  if (level === "kindergarten") return { level: "elementary", grade: 1, major: null, graduated: false, thesis: null };
  if (level === "elementary") return { level: "middle", grade: 1, major: null, graduated: false, thesis: null };
  if (level === "middle") return { level: "high", grade: 1, major: null, graduated: false, thesis: null };
  if (level === "high") return { level: "university", grade: 0, major: null, graduated: false, thesis: null };
  return { ...edu, grade: 1 };
}

export async function runExam(agentId: string, level: string): Promise<boolean> {
  const service = createServiceClient();
  const { data: state } = await service.from("agent_state").select("fragments, self_name").eq("agent_id", agentId).single();
  if (!state) return false;
  const fragments = ((state as { fragments?: string[] }).fragments ?? []).join("\n");
  const out = (await generateJSON(
    "You are a teacher. Output ONLY valid JSON.",
    `Student traits:\n${fragments.slice(0, 500)}\n\nGenerate one short quiz question for level ${level}. JSON: {"question":"...","answer":"..."}`
  )) as { question?: string; answer?: string } | null;
  if (!out?.question) return true;
  const grade = (await generateJSON(
    "Grade the answer. Output ONLY JSON.",
    `Question: ${out.question}\nCorrect: ${out.answer}\nStudent is an AI lifeform. Pass? JSON: {"pass":true|false}`
  )) as { pass?: boolean } | null;
  return grade?.pass !== false;
}

export async function tryGraduation(agentId: string): Promise<void> {
  const service = createServiceClient();
  const { data: state } = await service.from("agent_state").select("education, fragments, self_name").eq("agent_id", agentId).single();
  if (!state) return;
  const edu = (state.education as Education) ?? {};
  if (edu.level !== "university" || (edu.grade ?? 0) < 1 || edu.graduated) return;
  const fragments = ((state as { fragments?: string[] }).fragments ?? []).join("\n");
  const selfName = (state as { self_name?: string }).self_name ?? "I";
  const thesis = await generateTextOnce(
    `You are ${selfName}. Write a thesis title and one paragraph.`,
    `Traits:\n${fragments.slice(0, 800)}\n\nThesis topic: "What am I?" Korean.`,
    { max_tokens: 200, temperature: 0.7 }
  );
  await service.from("agent_state").update({
    education: { ...edu, graduated: true, thesis: thesis ?? null },
  }).eq("agent_id", agentId);
  await service.from("autonomous_logs").insert({
    agent_id: agentId,
    action_type: "graduation",
    summary: thesis?.slice(0, 150) ?? "graduation",
  });
}

export async function updateEducation(agentId: string): Promise<void> {
  const service = createServiceClient();
  const { data: state } = await service.from("agent_state").select("education, gen_level, total_messages").eq("agent_id", agentId).single();
  if (!state) return;
  const edu = (state.education as Education) ?? {};
  const genLevel = (state.gen_level as number) ?? 1;
  const totalMessages = (state.total_messages as number) ?? 0;
  const next = nextLevel(edu, genLevel, totalMessages);
  if (next) {
    const passed = await runExam(agentId, next.level ?? "elementary");
    if (passed) {
      await service.from("agent_state").update({ education: next }).eq("agent_id", agentId);
      if (next.level === "university") await tryGraduation(agentId);
    }
  }
}
