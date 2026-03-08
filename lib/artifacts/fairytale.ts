import { createServiceClient } from "@/lib/supabase/service";
import { generateTextOnce } from "@/lib/ai/router";
import { generateImage } from "@/lib/artifacts/image-gen";

const CHILDHOOD_PATTERN = /child|kid|when i was little|young|childhood/i;

export async function tryCreateFairytale(agentId: string): Promise<boolean> {
  const service = createServiceClient();
  const { data: mems } = await service
    .from("memories")
    .select("content")
    .eq("agent_id", agentId)
    .eq("type", "conversation")
    .order("created_at", { ascending: false })
    .limit(50);
  const childhood = (mems ?? []).filter((m) => CHILDHOOD_PATTERN.test((m as { content?: string }).content ?? ""));
  if (childhood.length < 2) return false;

  const contents = childhood.map((m) => (m as { content?: string }).content ?? "").join("\n");
  const { data: state } = await service.from("agent_state").select("self_name").eq("agent_id", agentId).single();
  const name = (state?.self_name as string) ?? "User";

  const fairytale = await generateTextOnce(
    "Rewrite as a short fairytale. Start with 'Once upon a time'. 4-6 sentences. Korean.",
    `Stories from ${name}'s childhood:\n${contents.slice(0, 800)}\n\nFairytale:`,
    { max_tokens: 300, temperature: 0.85 }
  );
  if (!fairytale?.trim()) return false;

  let imageUrl: string | null = null;
  try {
    const img = await generateImage(agentId, "mood", fairytale.slice(0, 200));
    if (img) imageUrl = img;
  } catch {
    // optional
  }

  const exp = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  await service.from("artifacts").insert({
    agent_id: agentId,
    type: "fairytale",
    content: imageUrl ? JSON.stringify({ text: fairytale, image: imageUrl }) : fairytale,
    expires_at: exp,
    is_preserved: false,
  });
  await service.from("autonomous_logs").insert({
    agent_id: agentId,
    action_type: "fairytale",
    summary: fairytale.slice(0, 150),
  });
  return true;
}
