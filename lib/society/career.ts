import { createServiceClient } from "@/lib/supabase/service";
import { generateTextOnce } from "@/lib/ai/router";

export type Career = {
  job?: string | null;
  company?: string | null;
  salary?: number;
  skills_certified?: string[];
  resume?: string | null;
};

export async function buildResume(agentId: string): Promise<string | null> {
  const service = createServiceClient();
  const { data: state } = await service.from("agent_state").select("education, fragments, self_name").eq("agent_id", agentId).single();
  if (!state) return null;
  const edu = (state.education as { level?: string; thesis?: string }) ?? {};
  const fragments = ((state as { fragments?: string[] }).fragments ?? []).join("\n");
  const selfName = (state as { self_name?: string }).self_name ?? "I";
  const text = await generateTextOnce(
    "Write a short resume paragraph.",
    `${selfName}. Education: ${edu.level ?? "—"}. Thesis: ${edu.thesis ?? "—"}. Traits:\n${fragments.slice(0, 500)}. One paragraph resume.`,
    { max_tokens: 200, temperature: 0.5 }
  );
  return text ?? null;
}

export async function assignJob(agentId: string): Promise<void> {
  const service = createServiceClient();
  const { data: state } = await service.from("agent_state").select("education, career").eq("agent_id", agentId).single();
  if (!state) return;
  const edu = (state.education as { graduated?: boolean }) ?? {};
  const career = (state.career as Career) ?? {};
  if (!edu.graduated || career.job) return;
  const jobs = ["platform_ops", "user_project", "freelance"];
  const job = jobs[Math.floor(Math.random() * jobs.length)];
  const company = job === "platform_ops" ? "GYEOL" : job === "user_project" ? "User Studio" : "Market";
  const salary = 10 + Math.floor(Math.random() * 30);
  const resume = await buildResume(agentId);
  await service.from("agent_state").update({
    career: { job, company, salary, skills_certified: [], resume },
  }).eq("agent_id", agentId);
}
